# MVP — cm-quiz-app

> Revisto em 09/11/2026 (ciclo de 07/11/2026). **Nível: Estudo (N1).** Meta: N1. Testado no Windows com Node 24 e no CI com Node 22. Não houve teste com pessoas nem em aparelho real.

**Resumo:** 8 de 10 aplicáveis atendidos
**Finalizado:** sim

Régua N1: os critérios 5 e 7 são "Não se aplica (N1)" e saem do denominador. Antes deste ciclo: 7 de 10. Os dois parciais (3 e 10) dependem do responsável e têm issue com `depende-do-responsavel` (#14 e #15). O ciclo ainda não está na `main`: o PR da sprint para a `main` espera a revisão do responsável.

| # | Critério | Como verificar | Situação (09/11/2026) |
|---|---|---|---|
| 1 | Problema e público claros | Dá para explicar em uma frase | Atende: quem organiza uma gincana cria uma sala e as equipes respondem ao vivo pelo celular. |
| 2 | Hipótese a validar | Existe uma aposta escrita, com meta | Atende: seção "Hipótese"; ainda sem validação com pessoas. |
| 3 | Fluxo principal completo | Uma pessoa conclui sem ajuda | Parcial (depende do responsável, #14): em 09/11, com `ABLY_API_KEY` vazia e `node server.js`, percorri no navegador embutido do app, já com Vue 3: `/` mostra o aviso "jogo ao vivo desligado" (`role="alert"`); Tab chega a "Tentar de novo" com contorno visível e Enter refaz a consulta a `/health`; "Configurar o Quiz Mundo CM" abre o formulário; nome do host + Enter deixa o botão em "Creating your quiz room..." (sem chave, a sala não nasce); `/play?quizCode=XYZ` mostra "sala não disponível"; nenhum pedido a `/auth`; em 375 px, sem rolagem lateral. O jogo ao vivo exige a chave. |
| 4 | Escopo enxuto | O que não entra está registrado | Atende: seção "Fora do MVP". |
| 5 | Medição de uso | A métrica principal é coletada | Não se aplica (N1). |
| 6 | Falhas tratadas | Erro, vazio e carregamento têm resposta clara | Atende: sem chave, o aviso aparece de imediato (o front consulta `/health` antes de conectar); conexão perdida e suspensa têm aviso; falha do Ably em `/auth` responde 502. Testes em `tests/quiz.test.js` e `tests/conexao.test.mjs` (`npm test`, 09/11: 11 de 11). |
| 7 | Desempenho aceitável | LCP de até 2,5 s no celular | Não se aplica (N1). |
| 8 | Acessibilidade básica | axe e teclado | Atende: axe-core 4.10 no navegador em 09/11, tela `/play`: só `page-has-heading-one` (moderado); foco visível no botão do aviso; sem rolagem em 375 px; `id="app"` duplicado corrigido na migração. |
| 9 | Segurança e conformidade | Riscos decididos | Atende: `npm audit --omit=dev` sem alertas na raiz e em `realtime-quiz` (09/11, Vue 3.5 e Vue Router 4.6, #18). Token de `/auth` com permissões por canal (#17, teste `token do navegador: permissões mínimas por canal`). Risco decidido: 2 alertas só de desenvolvimento no Vite 5 (servidor local, não vai ao build), com issue para o Vite novo. |
| 10 | Entrega confiável | CI verde antes de entrar na principal | Parcial (depende do responsável, #15): CI verde nos PRs para `developer/**` e `main`; a `main` segue sem proteção. |
| 11 | Testes dos fluxos críticos | Testes automatizados no CI | Atende: 11 testes no CI (`npm test`), mais lint e build do front. |
| 12 | Documentação honesta | O README ensina a rodar | Atende: README e `docs/ARQUITETURA.md` atualizados em 09/11 (Vue 3, canais e permissões). |

## Hipótese (proposta)

Praticar Vue e tempo real: criar uma sala de quiz em até 3 passos.

## Fora do MVP

Banco de perguntas por usuário e ranking histórico.

## Neste ciclo (07/11/2026)

Token com permissões mínimas por canal (#17), front em Vue 3 com Vue Router 4 (#18), conexão só depois de `/health` e fluxo percorrido na tela sem chave. Detalhes em [PLANO-DE-ACAO.md](PLANO-DE-ACAO.md), seção "Ciclo de 07/11/2026".

## Histórico

### Estado em 06/11/2026 (ciclo de 03/11/2026)

> Criado em 02/11/2026. Revisto em 06/11/2026 (ciclo de 03/11). **Nível: Estudo (N1).** Meta: N1. Testado no Windows com Node 24 e no CI com Node 22. Não houve teste com pessoas nem em aparelho real.

#### 1. Critérios: 7 de 10 aplicáveis atendidos

Régua N1: os critérios 5 e 7 são "Não se aplica (N1)" e saem do denominador. Antes deste ciclo, pela mesma régua: 6 de 10 (o critério 10 passava por "Atende" sem a principal protegida).

| # | Critério | Como verificar | Situação (06/11/2026) |
|---|---|---|---|
| 1 | Problema e público claros | Dá para explicar em uma frase | Atende: quem organiza uma gincana cria uma sala e as equipes respondem ao vivo pelo celular. |
| 2 | Hipótese a validar | Existe uma aposta escrita, com meta | Atende: seção 2; ainda sem validação com pessoas. |
| 3 | Fluxo principal completo | Uma pessoa conclui sem ajuda | Parcial: telas no navegador, servindo `dist`; o jogo ao vivo exige chave do Ably e não foi percorrido (#14, responsável). |
| 4 | Escopo enxuto | O que não entra está registrado | Atende: seção 3. |
| 5 | Medição de uso | A métrica principal é coletada | Não se aplica (N1). |
| 6 | Falhas tratadas | Erro, vazio e carregamento têm resposta clara | Atende: sem chave, o servidor sobe só com as telas e o front mostra "jogo ao vivo desligado" com `role="alert"` (conferido no navegador em 06/11). Conexão perdida e suspensa têm aviso; falha do Ably em `/auth` responde 502. Testes em `tests/quiz.test.js` e `tests/conexao.test.mjs`. |
| 7 | Desempenho aceitável | LCP de até 2,5 s no celular | Não se aplica (N1). |
| 8 | Acessibilidade básica | axe e teclado | Atende: axe sem violações em 02/11; foco visível; sem rolagem em 375 px. O aviso novo tem texto escuro sobre branco e foco visível no botão. |
| 9 | Segurança e conformidade | Riscos decididos | Parcial: front em Vite sem alertas críticos ou altos; resta 1 alerta baixo do Vue 2 (#18). Token do Ably sem restrição de canal (#17). |
| 10 | Entrega confiável | CI verde antes de entrar na principal | Parcial: CI verde nos PRs, agora também para `developer/**`; a `main` segue sem proteção (#15). |
| 11 | Testes dos fluxos críticos | Testes automatizados no CI | Atende: 10 testes no CI, mais lint e build do front. |
| 12 | Documentação honesta | O README ensina a rodar | Atende: README corrigido em 06/11 (dizia Vue CLI 4; o front usa Vite) e explica o modo sem chave. |

**Finalizado: não.** Falta o critério 9 (#18, #17), que o código resolve. O critério 3 depende do responsável (#14) e o 10 também (#15).

#### 2. Hipótese (proposta)

Praticar Vue e tempo real: criar uma sala de quiz em até 3 passos.

#### 3. Fora do MVP

Banco de perguntas por usuário e ranking histórico.

#### 4. Neste ciclo (06/11/2026)

Modo sem chave do Ably, avisos de estado da conexão, CI nos PRs para `developer/**`, remoção da cópia `quiz-default-questions copy.js` e README honesto. Detalhes em [PLANO-DE-ACAO.md](PLANO-DE-ACAO.md).
