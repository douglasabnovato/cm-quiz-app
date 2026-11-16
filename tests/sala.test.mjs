/* sala.test.mjs · regras da tela de criar sala */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoDoBotaoCriar,
  nomeValido,
  PRAZO_DA_SALA_MS,
  TEXTO_CONFERINDO,
  TEXTO_SALA_NAO_FICOU_PRONTA,
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

test('enquanto o /health não responde, o botão espera desligado', () => {
  assert.deepEqual(estadoDoBotaoCriar({ tempoRealDesligado: null }), {
    desabilitado: true,
    texto: 'Criar meu Quiz',
    explicacao: TEXTO_CONFERINDO,
  });
});

test('nome: vazio, só espaços ou ausente não vale', () => {
  assert.equal(nomeValido(''), false);
  assert.equal(nomeValido('   '), false);
  assert.equal(nomeValido(null), false);
  assert.equal(nomeValido(undefined), false);
  assert.equal(nomeValido('Equipe Azul'), true);
});

test('o aviso de prazo usa o mesmo número do prazo', () => {
  assert.ok(TEXTO_SALA_NAO_FICOU_PRONTA.includes(`${PRAZO_DA_SALA_MS / 1000} segundos`));
});
/* fim de sala.test.mjs */
