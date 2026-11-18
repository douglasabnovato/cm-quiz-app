/* tempo-real-local.test.mjs · central do modo local e cliente com a API do Ably que o jogo usa (#31) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { criarClienteLocal } from '../realtime-quiz/src/cliente-local.js';

const require = createRequire(import.meta.url);
const { createHub } = require('../lib/tempo-real-local.js');

/* Cliente ligado direto na central, sem rede (como a worker faz pelo parentPort). */
function clienteNaCentral(hub, clientId) {
  let conexaoId;
  return criarClienteLocal({
    conectar(aoEvento) {
      ({ conexaoId } = hub.conectar({ clientId, entregar: (evento) => setImmediate(() => aoEvento(evento)) }));
      aoEvento({ tipo: 'conectado', clientId });
    },
    executar: async (acao) => hub.executar(conexaoId, acao),
  });
}

const esperar = () => new Promise((resolve) => setImmediate(resolve));

test('publica com o clientId de quem enviou e filtra pelo nome do evento', async () => {
  const hub = createHub();
  const host = clienteNaCentral(hub, 'host');
  const jogador = clienteNaCentral(hub, 'jogador');
  const recebidas = [];
  jogador.channels.get('sala:primary').subscribe('new-question', (msg) => recebidas.push(msg));
  await jogador.esvaziar();
  await host.channels.get('sala:primary').publish('new-question', { n: 1 });
  await host.channels.get('sala:primary').publish('outro-evento', { n: 2 });
  await esperar();
  assert.deepEqual(recebidas, [{ name: 'new-question', data: { n: 1 }, clientId: 'host' }]);
  assert.equal(jogador.auth.clientId, 'jogador');
});

test('presença: entrar, listar com callback e sair ao desconectar', async () => {
  const hub = createHub();
  const servidor = clienteNaCentral(hub, 'servidor');
  const eventos = [];
  servidor.channels.get('sala:primary').presence.subscribe('enter', (m) => eventos.push(`enter ${m.clientId}`));
  servidor.channels.get('sala:primary').presence.subscribe('leave', (m) => eventos.push(`leave ${m.clientId}`));
  await servidor.esvaziar();

  let conexaoDoJogador;
  const jogador = criarClienteLocal({
    conectar(aoEvento) {
      ({ conexaoId: conexaoDoJogador } = hub.conectar({ clientId: 'equipe-a', entregar: aoEvento }));
      aoEvento({ tipo: 'conectado', clientId: 'equipe-a' });
    },
    executar: async (acao) => hub.executar(conexaoDoJogador, acao),
  });
  await jogador.channels.get('sala:primary').presence.enter({ nickname: 'Equipe A' });
  const membros = await new Promise((resolve, reject) =>
    jogador.channels.get('sala:primary').presence.get((erro, lista) => (erro ? reject(erro) : resolve(lista)))
  );
  assert.deepEqual(membros, [{ clientId: 'equipe-a', data: { nickname: 'Equipe A' } }]);

  hub.desconectar(conexaoDoJogador);
  await esperar();
  assert.deepEqual(eventos, ['enter equipe-a', 'leave equipe-a']);
  assert.deepEqual(hub.executar(hub.conectar({ entregar: () => {} }).conexaoId, { op: 'membros', canal: 'sala:primary' }), []);
});

test('as ações saem na ordem pedida, antes e depois de conectar', async () => {
  const hub = createHub();
  const ordem = [];
  let conexaoId;
  let conectar;
  const cliente = criarClienteLocal(
    {
      conectar(aoEvento) {
        conectar = () => {
          ({ conexaoId } = hub.conectar({ clientId: 'c', entregar: () => {} }));
          aoEvento({ tipo: 'conectado', clientId: 'c' });
        };
      },
      executar: async (acao) => {
        ordem.push(acao.op);
        return hub.executar(conexaoId, acao);
      },
    },
    { autoConnect: false }
  );
  const estados = [];
  cliente.connection.on((mudanca) => estados.push(mudanca.current));
  const canal = cliente.channels.get('main-quiz-thread');
  canal.subscribe('x', () => {});
  canal.presence.enter({ roomCode: 'room-1' });
  assert.deepEqual(ordem, []);
  cliente.connection.connect();
  conectar();
  await cliente.esvaziar();
  assert.deepEqual(ordem, ['anexar', 'entrar']);
  assert.deepEqual(estados, ['connecting', 'connected']);
});

test('a central recusa canal inválido, ação desconhecida e conexão que não existe', () => {
  const hub = createHub();
  const { conexaoId } = hub.conectar({ clientId: 'c', entregar: () => {} });
  assert.throws(() => hub.executar(conexaoId, { op: 'publicar', canal: '<script>' }), /Canal inválido/);
  assert.throws(() => hub.executar(conexaoId, { op: 'apagar-tudo', canal: 'sala:primary' }), /Ação desconhecida/);
  assert.throws(() => hub.executar('nao-existe', { op: 'anexar', canal: 'sala:primary' }), /Conexão desconhecida/);
});
/* fim de tempo-real-local.test.mjs */
