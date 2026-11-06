/* conexao.test.mjs · avisos de conexão mostrados pelo front */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisoDaConexao } from '../realtime-quiz/src/conexao.js';

test('conectado e conectando não mostram aviso', () => {
  assert.equal(avisoDaConexao('connected'), null);
  assert.equal(avisoDaConexao('connecting'), null);
});

test('desconectado e suspenso avisam sem pedir ação', () => {
  assert.equal(avisoDaConexao('disconnected').grave, false);
  assert.match(avisoDaConexao('suspended').texto, /30 segundos/);
});

test('sem chave, qualquer estado mostra o motivo e pede ação', () => {
  for (const estado of ['connecting', 'disconnected', 'failed']) {
    const aviso = avisoDaConexao(estado, null, true);
    assert.equal(aviso.grave, true);
    assert.match(aviso.texto, /chave do Ably/);
  }
});

test('falha com chave configurada mostra mensagem genérica', () => {
  assert.equal(avisoDaConexao('failed', { statusCode: 401 }).grave, true);
  assert.match(avisoDaConexao('failed').texto, /Não foi possível/);
});
