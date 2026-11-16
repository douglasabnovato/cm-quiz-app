# MVP — cm-quiz-app

> Revisto em 16/11/2026 (ciclo de 16/11/2026). **Nível: Estudo (N1).** Meta: N1. Testado no Windows com Node 24 e no CI com Node 22. Não houve teste com pessoas nem em aparelho real.

**Resumo:** 8 de 10 aplicáveis atendidos
**Finalizado:** sim

Régua N1: os critérios 5 e 7 são "Não se aplica (N1)" e saem do denominador. Antes deste ciclo, o resumo dizia 9 de 10, mas o critério 8 estava "Atende" sem Playwright nem axe no CI, que a régua exige; a contagem honesta era **8 de 10**. Os parciais que restam dependem do responsável e têm issue com `depende-do-responsavel`: o 3 (#14) e o 9 (#32, alertas do Dependabot desligados; pela decisão da engenharia#33, sem a leitura dos alertas o critério não pode ser "Atende"). O ciclo ainda não está na `main`: o PR da sprint para a `main` espera a revisão do responsável.

Evidência do CI: run [43805272109](https://github.com/douglasabnovato/cm-quiz-app/actions/runs/43805272109) do PR #30 (commit 3f07456), em 16/11/2026, jobs `raiz`, `realtime-quiz` e `e2e` verdes.

| # | Critério | Como verificar | Situação (16/11/2026) |
|---|---|---|---|
| 1 | Problema e público claros | Dá para explicar em uma frase | Atende: quem organiza uma gincana cria uma sala e as equipes respondem ao vivo pelo celular (README, primeira frase). |
| 2 | Hipótese a validar | Aposta escrita, com meta | Atende: seção "Hipótese", com meta e "saberemos quando"; ainda sem validação com pessoas. |
| 3 | Fluxo principal completo | Teste de ponta a ponta no navegador (Playwright) no CI | Parcial (depende do responsável, #14): o job `e2e` (run 43805272109, 16/11, 10 de 10) percorre no navegador o que existe sem a chave do Ably: tela do host, formulário de criar sala, prazo da sala, telas da equipe. Criar a sala, entrar com equipes, responder e ver o placar exige uma conta e uma chave do Ably, que só o responsável cria; por isso o critério conta como dependente dele. A #31 (modo local sem Ably) é um caminho que um agente pode fazer, mas muda a arquitetura e ficou fora deste ciclo. |
| 4 | Escopo enxuto | Seção "Fora do MVP" | Atende: seção "Fora do MVP". |
| 5 | Medição de uso | Métrica coletada | Não se aplica (N1). |
| 6 | Falhas tratadas | Testes de falha de rede, vazio e espera | Atende: sem chave, aviso com "Tentar de novo" e botão "Criar" desligado com o motivo; sala que não fica pronta em 20 s avisa e libera o botão; falha de rede ao conferir a sala da equipe avisa e deixa tentar de novo; nome vazio pede o nome; conexão perdida e suspensa avisam; `/auth` responde 503 sem chave e 502 se o Ably falha. Comandos em 16/11: `npm test` (17 de 17, CI: `# tests 17`, `# fail 0`) e `npm run test:e2e` (10 de 10, local e no run 43805272109). |
| 7 | Desempenho aceitável | LCP até 2,5 s no celular | Não se aplica (N1). |
| 8 | Acessibilidade básica | axe e teclado no navegador | Atende nas telas que abrem sem a chave: `npm run test:e2e` em 16/11 (10 de 10, local e no run 43805272109) roda o axe (WCAG 2.1 A e AA e boas práticas) sem violações em `/`, no formulário do host, nos avisos de nome vazio e de prazo da sala, na sala inexistente, na sala aberta, no nome da equipe vazio e na falha de rede, em largura de desktop; Tab chega a "Tentar de novo" com contorno de 3 px e Enter consulta o servidor; o fluxo do host (abrir o formulário, escrever o nome, criar) é feito só com Tab e Enter, com foco visível nos botões; sem rolagem lateral em 375 px. O app não tem tema escuro próprio (nenhum `prefers-color-scheme` no CSS), então o axe roda só no tema claro. Não há diálogo, por isso não há teste de Esc. As telas do jogo ao vivo (pergunta e placar) só abrem com a chave (#14, #31). |
| 9 | Segurança e conformidade | `npm audit --omit=dev`, Dependabot, segredos, dados pessoais | Parcial (depende do responsável, #32): audit 0 (16/11/2026: `npm audit --omit=dev` com 0 alertas na raiz e em `realtime-quiz`, e `npm audit` com dev com 0 alertas em `realtime-quiz` depois do Vite 7, #26); alertas do Dependabot desligados ou sem leitura (engenharia#33): `gh api "repos/douglasabnovato/cm-quiz-app/dependabot/alerts?state=open&per_page=100"` em 16/11/2026 responde 403, "Dependabot alerts are disabled for this repository". Ligar os alertas é do responsável (#32). Chave só no servidor (`.env`, fora do Git); token de `/auth` com permissões por canal. Imagens abertas em 16/11: só logotipos e o cartaz do evento, sem dado pessoal. |
| 10 | Entrega confiável | CI nos PRs e principal protegida | Atende: `gh api repos/douglasabnovato/cm-quiz-app/rulesets` em 16/11: ruleset `principal-protegida` ativo, com `deletion`, `non_fast_forward`, `pull_request` e checks obrigatórios `raiz` e `realtime-quiz`. O job `e2e` ainda não é obrigatório (#32). |
| 11 | Testes dos fluxos críticos | Testes no CI, sem `skipped` | Atende: run 43805272109 (16/11): `npm test` com `# tests 17`, `# pass 17`, `# skipped 0`; `npm run test:e2e` com `10 passed`; lint da raiz e do front; build do front comparado com o `dist`. |
| 12 | Documentação honesta | README com comandos conferidos | Atende: README reescrito em 16/11, com comandos conferidos contra os dois `package.json` (`start`, `test`, `lint`, `test:e2e`, `build:front`, `build`); sem link publicado, porque o Render responde 404 (#16). |

## Hipótese

Acreditamos que um host consegue abrir uma sala e receber as equipes **em até 3 passos, sem ajuda** (abrir o formulário, escrever o nome e criar a sala) e mandar o link às equipes.

**Meta:** 3 de 3 pessoas que testarem criam a sala e recebem 2 equipes sem ajuda, em até 2 minutos.

**Saberemos quando:** com a chave do Ably (#14) ou o modo local (#31), um teste no navegador criar a sala, 2 equipes entrarem pelo link e o placar final aparecer, e 3 pessoas repetirem o percurso sem ajuda.

## Fora do MVP

Banco de perguntas por usuário, ranking histórico, contas de usuário e login do host.

## Neste ciclo (16/11/2026)

Teste no navegador com Playwright e axe no CI (#19), telas em português com rótulos e `h1` (#24), botão "Criar" e prazo da sala (#25), falha ao conferir a sala da equipe, Vite 7 (#26) e README novo. Detalhes em [PLANO-DE-ACAO.md](PLANO-DE-ACAO.md), seção "Ciclo de 16/11/2026".

## Histórico

### Estado em 09/11/2026 (ciclo de 07/11/2026)

> Revisto em 09/11/2026. Resumo registrado: 9 de 10. Revisto em 16/11: o critério 8 não tinha Playwright nem axe no CI; pela régua, era "Parcial" (8 de 10).

| # | Critério | Situação (09/11/2026) |
|---|---|---|
| 1 | Problema e público claros | Atende |
| 2 | Hipótese a validar | Atende, sem meta numérica |
| 3 | Fluxo principal completo | Parcial: telas percorridas à mão no navegador, sem chave (#14) |
| 4 | Escopo enxuto | Atende |
| 5 | Medição de uso | Não se aplica (N1) |
| 6 | Falhas tratadas | Atende: aviso sem chave e de conexão; 11 testes |
| 7 | Desempenho aceitável | Não se aplica (N1) |
| 8 | Acessibilidade básica | Registrado como Atende: axe-core à mão em `/play`, com `page-has-heading-one` |
| 9 | Segurança e conformidade | Atende: `npm audit --omit=dev` sem alertas; 2 alertas só de dev no Vite 5 |
| 10 | Entrega confiável | Atende desde 10/11, com a `main` protegida (#15) |
| 11 | Testes dos fluxos críticos | Atende: 11 testes no CI |
| 12 | Documentação honesta | Atende |

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
