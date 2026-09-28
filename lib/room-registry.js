/*
 * room-registry.js · estado das salas no processo principal, atualizado pelas mensagens das worker threads.
 * As mensagens são parciais; por isso o estado é mesclado (antes, campos ausentes viravam undefined).
 */

/* Cria o registro de salas. */
function createRoomRegistry() {
  const rooms = new Map();
  return {
    /* Mescla os campos recebidos no estado da sala. */
    upsert(roomCode, patch) {
      const current = rooms.get(roomCode) || { roomCode, totalPlayers: 0, didQuizStart: false };
      const next = { ...current };
      if (typeof patch.totalPlayers === 'number') next.totalPlayers = patch.totalPlayers;
      if (typeof patch.didQuizStart === 'boolean') next.didQuizStart = patch.didQuizStart;
      rooms.set(roomCode, next);
      return next;
    },

    /* Remove a sala encerrada. */
    remove(roomCode) {
      rooms.delete(roomCode);
    },

    /* Sala fechada para novos jogadores: inexistente ou já iniciada. */
    isClosed(roomCode) {
      const room = rooms.get(roomCode);
      return !room || room.didQuizStart === true;
    },

    /* Estatística agregada para /health. */
    stats() {
      const all = [...rooms.values()];
      return { rooms: all.length, players: all.reduce((sum, room) => sum + room.totalPlayers, 0) };
    },
  };
}

/* Aplica uma mensagem da worker ao registro. */
function applyWorkerMessage(registry, message) {
  if (!message || !message.roomCode) return;
  if (message.killWorker) registry.remove(message.roomCode);
  else registry.upsert(message.roomCode, message);
}

module.exports = { createRoomRegistry, applyWorkerMessage };
/* fim de room-registry.js */
