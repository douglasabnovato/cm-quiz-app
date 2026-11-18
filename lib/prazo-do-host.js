/*
 * prazo-do-host.js · a sala espera o host entrar em `<sala>:primary`; se ele não entrar no prazo, a sala encerra (#36).
 * Isso acontece quando a tela do host desiste (prazo de 20 s) e tenta de novo com outro código.
 */

/* Prazo padrão: 60 s. QUIZ_PRAZO_DO_HOST_MS muda o valor (usado no teste no navegador). */
function prazoDoHostMs(env = process.env) {
  const valor = Number(env.QUIZ_PRAZO_DO_HOST_MS);
  return Number.isInteger(valor) && valor > 0 ? valor : 60000;
}

/* Agenda o encerramento; `hostEntrou` cancela. `agendar` e `cancelar` são injetáveis para os testes. */
function criarPrazoDoHost({ ms, aoVencer, agendar = setTimeout, cancelar = clearTimeout }) {
  let entrou = false;
  const id = agendar(() => {
    if (!entrou) aoVencer();
  }, ms);
  return {
    hostEntrou() {
      if (entrou) return;
      entrou = true;
      cancelar(id);
    },
  };
}

module.exports = { criarPrazoDoHost, prazoDoHostMs };
/* fim de prazo-do-host.js */
