/*
 * quiz.test.js · regras do quiz (pontuação, respostas duplicadas, ranking), perguntas padrão,
 * planilha personalizada, registro de salas e rotas HTTP do servidor.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createScoreboard, normalizeCustomQuestion, POINTS_PER_CORRECT } = require('../lib/quiz-engine');
const { createRoomRegistry, applyWorkerMessage } = require('../lib/room-registry');
const defaultQuestions = require('../quiz-default-questions');
const { createApp } = require('../server');

test('perguntas padrão: índice correto aponta para a resposta histórica', () => {
  const [q1, q2] = defaultQuestions;
  assert.equal(q1.choices[q1.correct], '09 de março de 1889');
  assert.equal(q2.choices[q2.correct], 'Imperial Colégio Militar da Corte');
  defaultQuestions.forEach((q) => assert.ok(q.correct >= 0 && q.correct < q.choices.length));
});

test('pontua uma vez por pergunta, ignora host, resposta tardia e índice inválido', () => {
  const board = createScoreboard();
  board.addPlayer('host', { nickname: 'Prof', isHost: true });
  board.addPlayer('a', { nickname: 'Ana' });
  board.addPlayer('b', { nickname: 'Bia' });
  board.openQuestion(0);
  assert.equal(board.registerAnswer('a', 0, 2, 2), true);
  assert.equal(board.registerAnswer('a', 0, 2, 2), false);
  assert.equal(board.registerAnswer('host', 0, 2, 2), false);
  assert.equal(board.registerAnswer('b', 1, 2, 2), false);
  assert.equal(board.registerAnswer('b', 0, 9, 2), false);
  assert.equal(board.answeredCount, 1);
  board.closeQuestion();
  assert.equal(board.registerAnswer('b', 0, 2, 2), false);
  assert.deepEqual(board.leaderboard(), [{ nickname: 'Ana', score: POINTS_PER_CORRECT }, { nickname: 'Bia', score: 0 }]);
  assert.equal(board.playingCount, 2);
});

test('planilha: aceita linha completa e rejeita incompleta ou com resposta fora de 1–4', () => {
  const ok = normalizeCustomQuestion({
    'question number': '1', question: 'Capital do Brasil?', 'option 1': 'Rio', 'option 2': 'Brasília',
    'option 3': 'SP', 'option 4': 'BH', 'correct answer option number': '2', 'image link': 'https://x/y.png',
  });
  assert.equal(ok.correct, 1);
  assert.equal(ok.showImg, true);
  assert.equal(normalizeCustomQuestion({ question: 'Sem opções' }), null);
  assert.equal(normalizeCustomQuestion({ question: 'x', 'option 1': 'a', 'option 2': 'b', 'option 3': 'c', 'option 4': 'd', 'correct answer option number': '7' }), null);
});

test('registro de salas mescla mensagens parciais e fecha sala iniciada', () => {
  const registry = createRoomRegistry();
  applyWorkerMessage(registry, { roomCode: 'ABC', totalPlayers: 3, didQuizStart: false });
  applyWorkerMessage(registry, { roomCode: 'ABC', didQuizStart: true });
  applyWorkerMessage(registry, { roomCode: 'ABC', totalPlayers: 2 });
  assert.equal(registry.isClosed('ABC'), true);
  assert.deepEqual(registry.stats(), { rooms: 1, players: 2 });
  applyWorkerMessage(registry, { roomCode: 'ABC', killWorker: true });
  assert.equal(registry.isClosed('ABC'), true);
  assert.deepEqual(registry.stats(), { rooms: 0, players: 0 });
});

/* Faz um GET no app e devolve { status, body }. */
function get(app, path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      http.get({ port: server.address().port, path }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: data });
        });
      }).on('error', reject);
    });
  });
}

test('rotas: status da sala, token do Ably e erro do Ably tratado', async () => {
  const registry = createRoomRegistry();
  registry.upsert('SALA1', { totalPlayers: 1, didQuizStart: false });
  const realtime = { auth: { createTokenRequest: (params, cb) => cb(null, { clientId: params.clientId, ttl: params.ttl }) } };
  const app = createApp({ realtime, registry });

  assert.deepEqual(JSON.parse((await get(app, '/checkRoomStatus?quizCode=SALA1')).body), { isRoomClosed: false });
  assert.deepEqual(JSON.parse((await get(app, '/checkRoomStatus?quizCode=NAOEXISTE')).body), { isRoomClosed: true });
  assert.deepEqual(JSON.parse((await get(app, '/checkRoomStatus?quizCode=%3Cscript%3E')).body), { isRoomClosed: true });

  const token = JSON.parse((await get(app, '/auth')).body);
  assert.match(token.clientId, /^id-[0-9a-f-]{36}$/);
  assert.equal(token.ttl, 3600000);

  const failing = createApp({ realtime: { auth: { createTokenRequest: (p, cb) => cb(new Error('x')) } }, registry });
  assert.equal((await get(failing, '/auth')).status, 502);
  assert.equal(JSON.parse((await get(app, '/health')).body).rooms, 1);
});
/* fim de quiz.test.js */
