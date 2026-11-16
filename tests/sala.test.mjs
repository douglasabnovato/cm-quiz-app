/* sala.test.mjs · regras da tela de criar sala */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoDoBotaoCriar,
  nomeDoHostValido,
  PRAZO_DA_SALA_MS,
  TEXTO_SEM_TEMPO_REAL,
} from '../realtime-quiz/src/sala.js';

test('sem tempo real, o botão fica desligado e explica o porquê', () => {
  const estado = estadoDoBotaoCriar({ tempoRealDesligado: true });
  assert.equal(estado.desabilitado, true);
  assert.equal(estado.explicacao, TEXTO_SEM_TEMPO_REAL);
  /* vale também enquanto criava: o motivo mais forte aparece */
  assert.equal(estadoDoBotaoCriar({ tempoRealDesligado: true, criando: true }).explicacao, TEXTO_SEM_TEMPO_REAL);
});

test('criando a sala, o botão fica desligado e mostra o andamento', () => {
  const estado = estadoDoBotaoCriar({ criando: true });
  assert.equal(estado.desabilitado, true);
  assert.match(estado.texto, /Criando a sala/);
  assert.equal(estado.explicacao, null);
});

test('com tempo real e parado, o botão fica ligado', () => {
  assert.deepEqual(estadoDoBotaoCriar(), { desabilitado: false, texto: 'Criar meu Quiz', explicacao: null });
});

test('nome do host: vazio, só espaços ou ausente não vale', () => {
  assert.equal(nomeDoHostValido(''), false);
  assert.equal(nomeDoHostValido('   '), false);
  assert.equal(nomeDoHostValido(null), false);
  assert.equal(nomeDoHostValido(undefined), false);
  assert.equal(nomeDoHostValido('Equipe Azul'), true);
});

test('o prazo da sala é de 20 segundos', () => {
  assert.equal(PRAZO_DA_SALA_MS, 20000);
});
/* fim de sala.test.mjs */
