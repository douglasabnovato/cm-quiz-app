/*
 * quiz-room-server.js · worker thread de uma sala: recebe jogadores pelo presence do Ably, publica perguntas
 * e cronômetros, pontua pelo quiz-engine (uma resposta por jogador por pergunta) e publica o ranking.
 */
const { parentPort, workerData } = require('worker_threads');
const Ably = require('ably/promises');
const defaultQuestions = require('./quiz-default-questions');
const { createScoreboard, normalizeCustomQuestion } = require('./lib/quiz-engine');
require('dotenv').config();

const START_TIMER_SEC = 5;
const QUESTION_TIMER_SEC = 30;

const roomCode = workerData.hostRoomCode;
const hostClientId = workerData.hostClientId;
const scoreboard = createScoreboard();
const playerChannels = {};
let questions = defaultQuestions;
let customQuestions = [];
let didQuizStart = false;
let skipTimer = false;
let quizRoomChannel;
let hostAdminCh;

const realtime = new Ably.Realtime({ key: process.env.ABLY_API_KEY, echoMessages: false });

realtime.connection.once('connected', () => {
  hostAdminCh = realtime.channels.get(`${roomCode}:host`);
  quizRoomChannel = realtime.channels.get(`${roomCode}:primary`);
  subscribeToHostEvents();
  quizRoomChannel.presence.subscribe('enter', handleNewPlayerEntered);
  quizRoomChannel.presence.subscribe('leave', handleExistingPlayerLeft);
  quizRoomChannel.publish('thread-ready', { start: true });
});

/* Informa o processo principal sobre a sala. */
function reportRoom() {
  parentPort.postMessage({ roomCode, totalPlayers: scoreboard.playingCount, didQuizStart });
}

/* Novo jogador ou o host entrou na sala. */
function handleNewPlayerEntered(player) {
  const data = player.data || {};
  const isHost = player.clientId === hostClientId;
  if (!isHost && didQuizStart) return;
  const newPlayerState = scoreboard.addPlayer(player.clientId, { nickname: data.nickname, avatarColor: data.avatarColor, isHost });
  if (isHost) {
    questions = data.quizType === 'CustomQuiz' && customQuestions.length > 0 ? customQuestions : defaultQuestions;
  } else {
    playerChannels[player.clientId] = realtime.channels.get(`${roomCode}:player-ch-${player.clientId}`);
    subscribeToPlayerChannel(playerChannels[player.clientId], player.clientId);
  }
  reportRoom();
  quizRoomChannel.publish('new-player', { newPlayerState });
}

/* Jogador saiu; se foi o host, a sala termina. */
function handleExistingPlayerLeft(player) {
  scoreboard.removePlayer(player.clientId);
  if (playerChannels[player.clientId]) {
    playerChannels[player.clientId].detach();
    delete playerChannels[player.clientId];
  }
  reportRoom();
  if (player.clientId === hostClientId) {
    quizRoomChannel.publish('host-left', { endQuiz: true });
    forceQuizEnd();
  }
}

/* Publica a contagem regressiva segundo a segundo. */
async function publishTimer(event, countDownSec) {
  while (countDownSec > 0) {
    quizRoomChannel.publish(event, { countDownSec });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    countDownSec -= 1;
    if (event === 'question-timer' && skipTimer) break;
  }
}

/* Comandos que só o host envia. */
function subscribeToHostEvents() {
  hostAdminCh.subscribe('start-quiz', async (msg) => {
    if (msg.clientId && msg.clientId !== hostClientId) return;
    if (didQuizStart) return;
    didQuizStart = true;
    reportRoom();
    await publishTimer('start-quiz-timer', START_TIMER_SEC);
    publishQuestion(0, questions.length === 1);
  });

  hostAdminCh.subscribe('quiz-questions', (msg) => {
    if (msg.clientId && msg.clientId !== hostClientId) return;
    const rows = (msg.data && Array.isArray(msg.data.questions)) ? msg.data.questions : [];
    customQuestions = rows.map(normalizeCustomQuestion).filter(Boolean);
  });

  hostAdminCh.subscribe('next-question', (msg) => {
    if (msg.clientId && msg.clientId !== hostClientId) return;
    const newQIndex = Number(msg.data && msg.data.prevQIndex) + 1;
    const lastQIndex = questions.length - 1;
    if (Number.isInteger(newQIndex) && newQIndex >= 0 && newQIndex <= lastQIndex) {
      publishQuestion(newQIndex, newQIndex === lastQIndex);
    }
  });

  hostAdminCh.subscribe('end-quiz-now', (msg) => {
    if (msg.clientId && msg.clientId !== hostClientId) return;
    forceQuizEnd();
  });
}

/* Encerra a sala avisando os jogadores. */
function forceQuizEnd() {
  quizRoomChannel.publish('quiz-ending', { quizEnding: true });
  killWorkerThread();
}

/* Publica a pergunta, abre respostas, espera o tempo, revela a correta e o ranking. */
async function publishQuestion(qIndex, isLast) {
  const current = questions[qIndex];
  if (!current) return;
  scoreboard.openQuestion(qIndex);
  await quizRoomChannel.publish('new-question', {
    numAnswered: 0,
    numPlaying: scoreboard.playingCount,
    questionNumber: qIndex + 1,
    question: current.question,
    choices: current.choices,
    isLastQuestion: isLast,
    showImg: current.showImg,
    imgLink: current.pic,
  });
  skipTimer = false;
  await publishTimer('question-timer', QUESTION_TIMER_SEC);
  scoreboard.closeQuestion();
  await quizRoomChannel.publish('correct-answer', { questionNumber: qIndex + 1, correctAnswerIndex: current.correct });
  quizRoomChannel.publish('full-leaderboard', { leaderboard: scoreboard.leaderboard() });
  if (isLast) killWorkerThread();
}

/* Recebe as respostas do jogador pelo canal exclusivo dele. */
function subscribeToPlayerChannel(playerChannel, playerId) {
  playerChannel.subscribe('player-answer', (msg) => {
    const data = msg.data || {};
    const question = questions[data.questionIndex];
    if (!question) return;
    const accepted = scoreboard.registerAnswer(playerId, data.questionIndex, data.playerAnswerIndex, question.correct);
    if (accepted) updateLiveStatsForHost();
  });
  updateLiveStatsForHost();
}

/* Atualiza o contador de respostas e encerra o tempo quando todos responderam. */
function updateLiveStatsForHost() {
  const numAnswered = scoreboard.answeredCount;
  const numPlaying = scoreboard.playingCount;
  quizRoomChannel.publish('live-stats-update', { numAnswered, numPlaying });
  if (numPlaying > 0 && numAnswered >= numPlaying) skipTimer = true;
}

/* Solta os canais, avisa o processo principal e encerra a thread. */
function killWorkerThread() {
  Object.values(playerChannels).forEach((channel) => channel.detach());
  if (hostAdminCh) hostAdminCh.detach();
  if (quizRoomChannel) quizRoomChannel.detach();
  parentPort.postMessage({ killWorker: true, roomCode, totalPlayers: scoreboard.playingCount });
  realtime.close();
  process.exit(0);
}
/* fim de quiz-room-server.js */
