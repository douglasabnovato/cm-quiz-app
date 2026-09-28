/*
 * server.js · processo principal: serve o front (Vue), emite tokens do Ably e cria uma worker thread por sala.
 * O estado das salas fica no room-registry, alimentado pelas mensagens das workers.
 */
const { Worker } = require('worker_threads');
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const Ably = require('ably');
const { createRoomRegistry, applyWorkerMessage } = require('./lib/room-registry');
require('dotenv').config();

const ABLY_API_KEY = process.env.ABLY_API_KEY;
const PORT = Number(process.env.PORT) || 8082;
const GLOBAL_CHANNEL = 'main-quiz-thread';
const DIST = path.join(__dirname, 'realtime-quiz/dist');
const ROOM_CODE = /^[A-Za-z0-9-]{3,40}$/;

/* Monta o app HTTP; o cliente Ably é injetado para permitir testes. */
function createApp({ realtime, registry }) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (req, res) => res.json({ status: 'ok', ...registry.stats() }));

  app.get('/auth', (req, res) => {
    const tokenParams = { clientId: `id-${crypto.randomUUID()}`, ttl: 60 * 60 * 1000 };
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
  app.get(['/', '/play'], (req, res) => res.sendFile(path.join(DIST, 'index.html')));
  return app;
}

/* Cria a worker da sala e liga as mensagens dela ao registro. */
function generateNewQuizRoom(registry, hostNickname, hostRoomCode, hostClientId) {
  if (!ROOM_CODE.test(String(hostRoomCode || ''))) {
    console.warn('Código de sala inválido ignorado');
    return;
  }
  const worker = new Worker(path.join(__dirname, 'quiz-room-server.js'), {
    workerData: { hostNickname, hostRoomCode, hostClientId },
  });
  registry.upsert(hostRoomCode, { totalPlayers: 0, didQuizStart: false });
  worker.on('message', (message) => applyWorkerMessage(registry, message));
  worker.on('error', (error) => console.error(`Sala ${hostRoomCode} encerrada por erro:`, error.message));
  worker.on('exit', () => registry.remove(hostRoomCode));
}

/* Inicia o servidor e escuta os hosts que entram no canal global. */
function main() {
  if (!ABLY_API_KEY) {
    console.error('Defina ABLY_API_KEY no arquivo .env (veja .env.example).');
    process.exit(1);
  }
  const registry = createRoomRegistry();
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

module.exports = { createApp };
/* fim de server.js */
