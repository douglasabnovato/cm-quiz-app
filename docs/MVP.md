# MVP — cm-quiz-app

> Criado em 02/11/2026. Revisto em 06/11/2026 (ciclo de 03/11). **Nível: Estudo (N1).** Meta: N1. Testado no Windows com Node 24 e no CI com Node 22. Não houve teste com pessoas nem em aparelho real.

## 1. Critérios: 7 de 10 aplicáveis atendidos

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

## 2. Hipótese (proposta)

Praticar Vue e tempo real: criar uma sala de quiz em até 3 passos.

## 3. Fora do MVP

Banco de perguntas por usuário e ranking histórico.

## 4. Neste ciclo (06/11/2026)

Modo sem chave do Ably, avisos de estado da conexão, CI nos PRs para `developer/**`, remoção da cópia `quiz-default-questions copy.js` e README honesto. Detalhes em [PLANO-DE-ACAO.md](PLANO-DE-ACAO.md).
