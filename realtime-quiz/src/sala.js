/* sala.js · regras puras da tela de criar sala (testadas com node:test em tests/sala.test.mjs). */

/* Tempo máximo para o servidor avisar que a sala está pronta (evento thread-ready). */
export const PRAZO_DA_SALA_MS = 20000;

export const TEXTO_SEM_TEMPO_REAL = 'Para criar a sala, o jogo ao vivo precisa estar ligado.';
export const TEXTO_SEM_NOME = 'Escreva o nome do host para criar a sala.';
export const TEXTO_SALA_NAO_FICOU_PRONTA =
  'A sala não ficou pronta em 20 segundos. Confira a conexão e tente de novo.';

/* O nome do host não pode ser vazio nem só espaços. */
export function nomeDoHostValido(nome) {
  return typeof nome === 'string' && nome.trim().length > 0;
}

/* Estado do botão "Criar meu Quiz": desligado sem tempo real e enquanto a sala nasce. */
export function estadoDoBotaoCriar({ tempoRealDesligado = false, criando = false } = {}) {
  if (tempoRealDesligado) {
    return { desabilitado: true, texto: 'Criar meu Quiz', explicacao: TEXTO_SEM_TEMPO_REAL };
  }
  if (criando) {
    return { desabilitado: true, texto: 'Criando a sala…', explicacao: null };
  }
  return { desabilitado: false, texto: 'Criar meu Quiz', explicacao: null };
}
/* fim de sala.js */
