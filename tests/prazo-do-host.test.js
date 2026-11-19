/* prazo-do-host.test.js · a sala sem host encerra no prazo (#36) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { criarPrazoDoHost, prazoDoHostMs } = require('../lib/prazo-do-host');

test('host que não entra no prazo encerra a sala', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let encerrada = 0;
  criarPrazoDoHost({ ms: 60000, aoVencer: () => (encerrada += 1) });
  t.mock.timers.tick(59999);
  assert.equal(encerrada, 0);
  t.mock.timers.tick(1);
  assert.equal(encerrada, 1);
});

test('host que entra a tempo mantém a sala aberta', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let encerrada = 0;
  const prazo = criarPrazoDoHost({ ms: 60000, aoVencer: () => (encerrada += 1) });
  t.mock.timers.tick(30000);
  prazo.hostEntrou();
  prazo.hostEntrou();
  t.mock.timers.tick(60000);
  assert.equal(encerrada, 0);
});

test('prazo padrão de 60 s, ajustável só com inteiro positivo', () => {
  assert.equal(prazoDoHostMs({}), 60000);
  assert.equal(prazoDoHostMs({ QUIZ_PRAZO_DO_HOST_MS: '3000' }), 3000);
  assert.equal(prazoDoHostMs({ QUIZ_PRAZO_DO_HOST_MS: '-1' }), 60000);
  assert.equal(prazoDoHostMs({ QUIZ_PRAZO_DO_HOST_MS: 'abc' }), 60000);
});
/* fim de prazo-do-host.test.js */
