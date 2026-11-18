/*
 * cliente-local.js · cliente do modo local (QUIZ_TEMPO_REAL=local), com a parte da API do Ably que o jogo usa:
 * connection (on, once, off, connect, close), auth.clientId e channels.get com subscribe, publish, detach e presence.
 * Serve ao navegador (transporteDoNavegador) e à worker da sala (transporte próprio em quiz-room-server.js).
 * As ações saem em fila, na ordem em que foram pedidas: assinar antes de entrar na presença importa.
 */

/* Chama o callback no estilo do Ably 1 (erro, resultado) e devolve a promessa, como o `ably/promises`. */
function comCallback(promessa, callback) {
  if (typeof callback === 'function') {
    promessa.then((resultado) => callback(null, resultado), (erro) => callback(erro));
    return promessa.catch(() => undefined);
  }
  return promessa;
}

/* Separa `(evento, ouvinte)` de `(ouvinte)`. */
function argumentos(a, b) {
  return typeof a === 'function' ? [null, a] : [a, b];
}

/*
 * transporte: { conectar(aoEvento, aoMudarEstado), executar(acao) → Promise, fechar() }.
 * O primeiro evento do transporte é { tipo: 'conectado', clientId }.
 */
export function criarClienteLocal(transporte, { autoConnect = true } = {}) {
  let estado = 'initialized';
  let ouvintesDaConexao = [];
  const canais = new Map();
  let liberar;
  let conectado = new Promise((resolve) => (liberar = resolve));
  let fila = Promise.resolve();

  function mudar(novo, reason = null) {
    if (novo === estado) return;
    const previous = estado;
    estado = novo;
    const mudanca = { current: novo, previous, reason };
    ouvintesDaConexao.slice().forEach((ouvinte) => {
      if (ouvinte.evento && ouvinte.evento !== novo) return;
      if (ouvinte.uma) ouvintesDaConexao = ouvintesDaConexao.filter((o) => o !== ouvinte);
      ouvinte.funcao(mudanca);
    });
  }

  function executar(acao) {
    const promessa = fila.then(() => conectado).then(() => transporte.executar(acao));
    fila = promessa.catch(() => undefined);
    return promessa;
  }

  function aoEvento(evento) {
    if (evento.tipo === 'conectado') {
      cliente.auth.clientId = evento.clientId;
      liberar();
      mudar('connected');
      return;
    }
    const canal = canais.get(evento.canal);
    if (canal) canal.receber(evento);
  }

  function aoMudarEstado(novo, motivo) {
    if (novo !== 'connected') {
      conectado = new Promise((resolve) => (liberar = resolve));
    }
    mudar(novo, motivo || null);
  }

  function criarCanal(nome) {
    let mensagens = [];
    let presencas = [];
    let anexado = false;
    const anexar = () => {
      if (anexado) return;
      anexado = true;
      executar({ op: 'anexar', canal: nome }).catch(() => (anexado = false));
    };
    return {
      name: nome,
      subscribe(a, b) {
        const [evento, funcao] = argumentos(a, b);
        mensagens.push({ evento, funcao });
        anexar();
      },
      unsubscribe() {
        mensagens = [];
      },
      publish(nomeDaMensagem, dados, callback) {
        anexar();
        return comCallback(executar({ op: 'publicar', canal: nome, nome: nomeDaMensagem, dados }), callback);
      },
      detach(callback) {
        mensagens = [];
        presencas = [];
        anexado = false;
        return comCallback(executar({ op: 'desanexar', canal: nome }), callback);
      },
      presence: {
        enter(dados, callback) {
          anexar();
          return comCallback(executar({ op: 'entrar', canal: nome, dados }), callback);
        },
        leave(dados, callback) {
          return comCallback(executar({ op: 'sair', canal: nome }), typeof dados === 'function' ? dados : callback);
        },
        get(a, b) {
          const callback = typeof a === 'function' ? a : b;
          anexar();
          return comCallback(executar({ op: 'membros', canal: nome }), callback);
        },
        subscribe(a, b) {
          const [acao, funcao] = argumentos(a, b);
          presencas.push({ acao, funcao });
          anexar();
        },
      },
      /* Evento vindo do servidor: mensagem ou mudança de presença. */
      receber(evento) {
        if (evento.tipo === 'mensagem') {
          const mensagem = { name: evento.nome, data: evento.dados, clientId: evento.clientId };
          mensagens.slice().forEach((o) => (!o.evento || o.evento === mensagem.name) && o.funcao(mensagem));
        } else if (evento.tipo === 'presenca') {
          const membro = { action: evento.acao, clientId: evento.clientId, data: evento.dados };
          presencas.slice().forEach((o) => (!o.acao || o.acao === membro.action) && o.funcao(membro));
        }
      },
    };
  }

  const cliente = {
    auth: { clientId: null },
    connection: {
      get state() {
        return estado;
      },
      on(a, b) {
        const [evento, funcao] = argumentos(a, b);
        ouvintesDaConexao.push({ evento, funcao, uma: false });
      },
      once(a, b) {
        const [evento, funcao] = argumentos(a, b);
        ouvintesDaConexao.push({ evento, funcao, uma: true });
      },
      off() {
        ouvintesDaConexao = [];
      },
      connect() {
        if (estado === 'connecting' || estado === 'connected') return;
        mudar('connecting');
        transporte.conectar(aoEvento, aoMudarEstado);
      },
      close() {
        if (transporte.fechar) transporte.fechar();
        mudar('closed');
      },
    },
    channels: {
      get(nome) {
        if (!canais.has(nome)) canais.set(nome, criarCanal(nome));
        return canais.get(nome);
      },
    },
    close() {
      cliente.connection.close();
    },
    /* Resolve quando todas as ações pedidas até aqui foram atendidas. */
    esvaziar() {
      return fila;
    },
  };

  if (autoConnect) cliente.connection.connect();
  return cliente;
}

/* Transporte do navegador: eventos por SSE (/local/eventos) e ações por POST (/local/acao). */
export function transporteDoNavegador(base = '') {
  let fonte = null;
  let conexaoId = null;
  return {
    conectar(aoEvento, aoMudarEstado) {
      fonte = new EventSource(`${base}/local/eventos`);
      fonte.onmessage = (mensagem) => {
        const evento = JSON.parse(mensagem.data);
        if (evento.tipo === 'conectado') conexaoId = evento.conexaoId;
        aoEvento(evento);
      };
      fonte.onerror = () => {
        /* O EventSource tenta de novo sozinho; a conexão nova recebe outro clientId. */
        aoMudarEstado('disconnected', { message: 'Conexão local perdida.' });
      };
    },
    executar(acao) {
      return fetch(`${base}/local/acao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conexao: conexaoId, acao }),
      }).then((resposta) =>
        resposta.json().then((corpo) => {
          if (!resposta.ok) throw new Error(corpo.error || 'Falha no modo local.');
          return corpo.resultado;
        })
      );
    },
    fechar() {
      if (fonte) fonte.close();
    },
  };
}
/* fim de cliente-local.js */
