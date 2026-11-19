/*
 * server.js · processo principal: serve o front (Vue), emite tokens do Ably e cria uma worker thread por sala.
 * O estado das salas fica no room-registry, alimentado pelas mensagens das workers.
 */
const { Worker } = require('worker_threads');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const Ably = require('ably');
const { createRoomRegistry, applyWorkerMessage } = require('./lib/room-registry');
const { createHub } = require('./lib/tempo-real-local');
require('dotenv').config();

const ABLY_API_KEY = process.env.ABLY_API_KEY;
const PORT = Number(process.env.PORT) || 8082;
const GLOBAL_CHANNEL = 'main-quiz-thread';
const DIST = path.join(__dirname, 'realtime-quiz/dist');
const ROOM_CODE = /^[A-Za-z0-9-]{3,40}$/;
const META_MODO_LOCAL = '<meta name="quiz-tempo-real" content="local" />';

/*
 * Permissões mínimas do token do navegador (o worker usa a chave e não passa por aqui).
 * O curinga `*` vale um segmento inteiro do nome do canal, separado por `:`.
 * - canal global: o host só entra na presença para pedir uma sala;
 * - `<sala>:primary`: todos assinam e entram na presença; só o servidor publica;
 * - `<sala>:host`: o host publica os comandos (iniciar, próxima, encerrar);
 * - `<sala>:player-ch-<clientId>`: cada jogador publica só no próprio canal de respostas.
 */
function capabilityDoCliente(clientId) {
  return {
    [GLOBAL_CHANNEL]: ['presence'],
    '*:primary': ['subscribe', 'presence'],
    '*:host': ['publish'],
    [`*:player-ch-${clientId}`]: ['publish'],
  };
}

/*
 * Rotas do modo local: eventos por SSE e ações por POST, ligados à central em memória.
 * Só existem com QUIZ_TEMPO_REAL=local (testes e estudo, sem conta no Ably).
 */
function ligarModoLocal(app, hub) {
  app.get('/local/eventos', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const enviar = (evento) => res.write(`data: ${JSON.stringify(evento)}\n\n`);
    const { conexaoId, clientId } = hub.conectar({ clientId: `id-${crypto.randomUUID()}`, entregar: enviar });
    enviar({ tipo: 'conectado', conexaoId, clientId });
    req.on('close', () => hub.desconectar(conexaoId));
  });

  app.post('/local/acao', express.json({ limit: '50kb' }), (req, res) => {
    const { conexao, acao } = req.body || {};
    if (typeof conexao !== 'string' || !hub.existe(conexao)) {
      return res.status(404).json({ error: 'Conexão local desconhecida.' });
    }
    try {
      return res.json({ resultado: hub.executar(conexao, acao) });
    } catch (erro) {
      return res.status(400).json({ error: erro.message });
    }
  });
}

/* No modo local, a página ganha uma meta que o front lê para usar o cliente local em vez do Ably. */
function paginaDoFront(modoLocal) {
  return (req, res) => {
    const arquivo = path.join(DIST, 'index.html');
    if (!modoLocal) return res.sendFile(arquivo);
    return fs.readFile(arquivo, 'utf8', (erro, html) => {
      if (erro) return res.status(500).send('Front não encontrado: rode npm run build:front.');
      return res.type('html').send(html.replace('</head>', () => `${META_MODO_LOCAL}</head>`));
    });
  };
}

/* Monta o app HTTP; o cliente Ably (ou a central local) é injetado para permitir testes. */
function createApp({ realtime, registry, hub = null }) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (req, res) =>
    res.json({
      status: 'ok',
      realtime: Boolean(realtime || hub),
      modo: hub ? 'local' : realtime ? 'ably' : 'desligado',
      ...registry.stats(),
    })
  );

  if (hub) ligarModoLocal(app, hub);

  app.get('/auth', (req, res) => {
    if (!realtime) {
      return res.status(503).json({ error: 'Tempo real desligado: o servidor está sem ABLY_API_KEY.' });
    }
    const clientId = `id-${crypto.randomUUID()}`;
    const tokenParams = { clientId, ttl: 60 * 60 * 1000, capability: JSON.stringify(capabilityDoCliente(clientId)) };
    realtime.auth.createTokenRequest(tokenParams, (err, tokenRequest) => {
      if (err) {
        console.error('Falha ao gerar token do Ably:', err.message);
        return res.status(502).json({ error: 'Não foi possível conectar ao serviço de tempo real.' });
      }
      return res.json(tokenRequest);
    });
  });

  app.get('/checkRoomStatus', (req, res) => {
    const code = String(req.query.quizCode || '');
    res.json({ isRoomClosed: !ROOM_CODE.test(code) || registry.isClosed(code) });
  });

  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get(['/', '/play'], paginaDoFront(Boolean(hub)));
  return app;
}

/*
 * Cria a worker da sala e liga as mensagens dela ao registro.
 * Com a central local, a worker ganha uma conexão nela, e as ações e os eventos passam pelo parentPort.
 */
function generateNewQuizRoom(registry, hostNickname, hostRoomCode, hostClientId, hub = null) {
  if (!ROOM_CODE.test(String(hostRoomCode || ''))) {
    console.warn('Código de sala inválido ignorado');
    return;
  }
  const worker = new Worker(path.join(__dirname, 'quiz-room-server.js'), {
    workerData: { hostNickname, hostRoomCode, hostClientId, local: Boolean(hub) },
  });
  registry.upsert(hostRoomCode, { totalPlayers: 0, didQuizStart: false });
  let conexaoLocal = null;
  if (hub) {
    conexaoLocal = hub.conectar({
      clientId: `servidor-${hostRoomCode}`,
      entregar: (evento) => worker.postMessage({ localEvento: evento }),
    }).conexaoId;
  }
  worker.on('message', (message) => {
    if (message && message.localAcao) {
      const { id, acao } = message.localAcao;
      try {
        worker.postMessage({ localResposta: { id, resultado: hub.executar(conexaoLocal, acao) } });
      } catch (erro) {
        worker.postMessage({ localResposta: { id, erro: erro.message } });
      }
      return;
    }
    applyWorkerMessage(registry, message);
  });
  worker.on('error', (error) => console.error(`Sala ${hostRoomCode} encerrada por erro:`, error.message));
  worker.on('exit', () => {
    registry.remove(hostRoomCode);
    if (hub) hub.desconectar(conexaoLocal);
  });
}

/* Modo local: a central em memória faz o papel do Ably, e o servidor escuta o canal global nela. */
function mainLocal(registry) {
  const hub = createHub();
  const app = createApp({ realtime: null, registry, hub });
  app.listen(PORT, () => console.log(`Quiz em http://localhost:${PORT} (modo local, sem Ably: só para testes)`));
  const { conexaoId } = hub.conectar({
    clientId: 'servidor',
    entregar: (evento) => {
      if (evento.canal !== GLOBAL_CHANNEL || evento.tipo !== 'presenca' || evento.acao !== 'enter') return;
      const data = evento.dados || {};
      generateNewQuizRoom(registry, data.nickname, data.roomCode, evento.clientId, hub);
    },
  });
  hub.executar(conexaoId, { op: 'anexar', canal: GLOBAL_CHANNEL });
}

/* Inicia o servidor e escuta os hosts que entram no canal global. */
function main() {
  const registry = createRoomRegistry();
  if (process.env.QUIZ_TEMPO_REAL === 'local') {
    mainLocal(registry);
    return;
  }
  if (!ABLY_API_KEY) {
    /* Sem chave, serve só as telas: o front avisa que o tempo real está desligado. */
    console.warn('ABLY_API_KEY ausente: tempo real desligado (veja .env.example).');
    const app = createApp({ realtime: null, registry });
    app.listen(PORT, () => console.log(`Quiz em http://localhost:${PORT} (sem tempo real)`));
    return;
  }
  const realtime = new Ably.Realtime({ key: ABLY_API_KEY, echoMessages: false });
  const app = createApp({ realtime, registry });
  app.listen(PORT, () => console.log(`Quiz em http://localhost:${PORT}`));

  realtime.connection.once('connected', () => {
    const globalChannel = realtime.channels.get(GLOBAL_CHANNEL);
    globalChannel.presence.subscribe('enter', (player) => {
      const data = player.data || {};
      generateNewQuizRoom(registry, data.nickname, data.roomCode, player.clientId);
    });
  });
}

if (require.main === module) main();

module.exports = { createApp, capabilityDoCliente, META_MODO_LOCAL };
/* fim de server.js */
