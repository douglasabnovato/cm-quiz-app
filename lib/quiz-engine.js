/*
 * quiz-engine.js · regras puras do quiz (sem Ably): validação de perguntas, pontuação e ranking.
 * Cada jogador pontua no máximo uma vez por pergunta e só enquanto a pergunta está aberta.
 */
const POINTS_PER_CORRECT = 5;

/* Converte uma linha da planilha do Google Sheets em pergunta, ou null se estiver incompleta. */
function normalizeCustomQuestion(row) {
  if (!row || typeof row !== 'object') return null;
  const choices = [row['option 1'], row['option 2'], row['option 3'], row['option 4']].map((c) => String(c ?? '').trim());
  const correct = Number.parseInt(row['correct answer option number'], 10) - 1;
  const question = String(row.question ?? '').trim();
  if (!question || choices.some((c) => !c) || !(correct >= 0 && correct <= 3)) return null;
  const pic = String(row['image link'] ?? '').trim();
  return {
    questionNumber: Number.parseInt(row['question number'], 10) || 0,
    question,
    choices,
    correct,
    showImg: /^https:\/\//i.test(pic),
    pic,
  };
}

/* Cria o placar da sala. */
function createScoreboard() {
  const players = new Map();
  let openIndex = null;
  let answered = new Set();

  return {
    /* Registra jogador (o host entra com isHost e não pontua). */
    addPlayer(id, { nickname, avatarColor, isHost = false }) {
      players.set(id, { id, nickname: String(nickname ?? '').slice(0, 30), avatarColor, isHost, score: 0 });
      return players.get(id);
    },

    /* Remove quem saiu da sala. */
    removePlayer(id) {
      players.delete(id);
      answered.delete(id);
    },

    /* Abre uma pergunta e zera quem já respondeu. */
    openQuestion(index) {
      openIndex = index;
      answered = new Set();
    },

    /* Fecha a pergunta (fim do tempo): respostas tardias são ignoradas. */
    closeQuestion() {
      openIndex = null;
    },

    /* Registra a resposta; devolve true se foi aceita. Pontua se estiver correta. */
    registerAnswer(playerId, questionIndex, answerIndex, correctIndex) {
      const player = players.get(playerId);
      if (!player || player.isHost) return false;
      if (openIndex === null || questionIndex !== openIndex) return false;
      if (answered.has(playerId)) return false;
      if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return false;
      answered.add(playerId);
      if (answerIndex === correctIndex) player.score += POINTS_PER_CORRECT;
      return true;
    },

    /* Quantos jogadores (sem o host) já responderam a pergunta aberta. */
    get answeredCount() {
      return answered.size;
    },

    /* Quantidade de jogadores, sem contar o host. */
    get playingCount() {
      return [...players.values()].filter((p) => !p.isHost).length;
    },

    /* Ranking decrescente por pontos; empate por ordem alfabética do apelido. O(n log n). */
    leaderboard() {
      return [...players.values()]
        .filter((p) => !p.isHost)
        .map(({ nickname, score }) => ({ nickname, score }))
        .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname, 'pt-BR'));
    },
  };
}

module.exports = { normalizeCustomQuestion, createScoreboard, POINTS_PER_CORRECT };
/* fim de quiz-engine.js */
