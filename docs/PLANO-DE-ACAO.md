# Plano de ação — cm-quiz-app

| Prioridade (MoSCoW) | Item | Ganho | Esforço | Status |
|---|---|---|---|---|
| Must | Corrigir gabarito padrão (D1) | Alto | Baixo | ✅ |
| Must | Uma resposta por jogador por pergunta (D2) | Alto | Baixo | ✅ |
| Must | Validar comandos do host por `clientId` (D3) | Alto | Baixo | ✅ |
| Must | `/play` e `/checkRoomStatus` sem crash (D4) | Alto | Baixo | ✅ |
| Must | Fail-fast sem `ABLY_API_KEY`, `.env.example` | Médio | Baixo | ✅ |
| Should | Registro de salas com *merge* (D5, D6) | Médio | Baixo | ✅ |
| Should | Validar perguntas da planilha (D7) | Médio | Baixo | ✅ |
| Should | Bloquear entrada após início (D8) | Baixo | Baixo | ✅ |
| Should | Testes automatizados (D11) | Médio | Médio | ✅ 5 |
| Should | README em pt-BR | Médio | Baixo | ✅ |
| Could | Capability Ably restrita à sala | Médio | Médio | Próximo ciclo |
| Could | Acessibilidade do front | Médio | Médio | Próximo ciclo |
| Won't (agora) | Migrar Vue 2 → Vue 3 + Vite | Alto | Alto | ADR-004 |

## Ciclo de 03/11/2026

> Executado em 06/11/2026. Branch `feature/2026-11-06` → `developer/sprint-2026-11-12` → `main`. Nível: Estudo (N1), 10 critérios aplicáveis.

### Produto

**Problema e público.** Professores e organizadores de gincana escolar querem um quiz ao vivo entre equipes, com placar na tela e respostas pelo celular.

**Hipótese e meta.** O host cria uma sala em até 3 passos. Sem medição de uso (N1).

**O que a pesquisa trouxe.**

| Ideia | O que levamos para o projeto | Fonte |
|---|---|---|
| A conexão do Ably passa por estados: desconectado tenta sozinho, suspenso (mais de 2 min) tenta a cada 30 s, falha exige ação | Aviso na tela para cada estado; "Tentar de novo" só quando a conexão falhou | [Ably: connection state and recovery](https://ably.com/docs/connect/states) |
| Sem chave não há tempo real, mas as telas podem abrir | Mudamos a decisão anterior de "fail-fast": o servidor sobe sem chave, `/health` diz `realtime: false` e o front avisa o motivo | [Ably: connection state and recovery](https://ably.com/docs/connect/states) (estado `failed` por chave inválida) |
| Em quizzes ao vivo, mostrar a pergunta no aparelho do jogador ajuda quem usa tecnologia assistiva | O jogador já vê a pergunta e as opções no celular; fica registrado como requisito a manter na migração para Vue 3 (#18) | [PCC: dicas de acessibilidade no Kahoot](https://www.pcc.edu/instructional-support/tools/kahoot/accessibility-tips-from-aedr/), [Kahoot: acessibilidade](https://kahoot.com/accessibility/) |
| Vue 2 sem correções desde 31/12/2023 | Migração para Vue 3 virou issue de manutenção | [Vue 2 EOL](https://v2.vuejs.org/eol/) |

**Backlog priorizado (impacto × esforço).**

| Prioridade | Item | Impacto | Esforço | Destino |
|---|---|---|---|---|
| 1 | Servidor sem chave e aviso na tela | Alto | Baixo | Este ciclo |
| 2 | Avisos de estado da conexão | Médio | Baixo | Este ciclo |
| 3 | CI também nos PRs para `developer/**` | Alto | Baixo | Este ciclo |
| 4 | README honesto (Vite, modo sem chave) e remoção da cópia sem uso | Médio | Baixo | Este ciclo |
| 5 | Chave do Ably e percurso do jogo | Alto | Baixo | Responsável (#14) |
| 6 | Proteger a `main` | Alto | Baixo | Responsável (#15) |
| 7 | Publicação no Render | Baixo | Baixo | Responsável (#16) |
| 8 | Token restrito aos canais da sala | Médio | Médio | Issue #17 |
| 9 | Vue 3 | Médio | Alto | Issue #18 |
| 10 | Teste de interface sem tempo real | Médio | Médio | Issue #19 |

**Fora do escopo.** Contas, banco de perguntas por usuário, ranking histórico.

### Engenharia

**Arquitetura.** `server.js` (Express) serve o `dist` do front, emite tokens do Ably em `/auth` e cria uma worker thread por sala (`quiz-room-server.js`). As regras ficam em `lib/quiz-engine.js` e o estado das salas em `lib/room-registry.js`. O front Vue 2 com Vite fala com o Ably direto; `realtime-quiz/src/conexao.js` traduz o estado da conexão em aviso.

**Riscos.**
- Sem chave, o jogo ao vivo não é demonstrável (#14).
- Token sem restrição de canal (#17).
- Vue 2 sem suporte (#18).
- Sem proteção na `main` (#15).

**Qualidade.**
- Testes: 10 com `node:test` (regras, planilha, registro de salas, rotas, modo sem chave, avisos de conexão); lint e build do front no CI.
- Acessibilidade: aviso com `role="alert"` quando pede ação e `role="status"` quando só informa; foco visível no botão.
- Segurança: a chave fica só no `.env`; `/auth` sem chave responde 503 sem expor nada.

**Definição de pronto.** `npm ci` e `npm test` na raiz; `npm ci`, `npm run lint` e `npm run build` em `realtime-quiz`; CI verde; `docs/MVP.md` e README atualizados.

### Plano de ação

**Este ciclo executa.** Itens 1 a 4 do backlog e a revisão do `MVP.md` pela régua N1 e pela decisão do critério 10.

**Vira issue.** #17, #18, #19 (agente); #14, #15, #16 (responsável).

## Ciclo de 07/11/2026

> Executado em 09/11/2026. Nível N1. Sprint `developer/sprint-2026-11-12`, feature `feature/2026-11-07`.

### Produto

**Problema e público.** Quem organiza uma gincana escolar cria uma sala e as equipes respondem ao vivo pelo celular. Sem mudança.

**Meta do ciclo.** Fechar o critério 9 (Vue 2 sem suporte e token sem restrição) e registrar o fluxo principal percorrido na tela.

**O que a pesquisa trouxe.**
- O Ably dá ao token a interseção entre a `capability` pedida e a da chave; sem `capability`, o token herda tudo. O curinga `*` vale um segmento inteiro do nome do canal, separado por `:`; por isso `*:primary` serve e `room-*` não. Fonte: [Ably, capabilities](https://ably.com/docs/auth/capabilities).
- O Ably recomenda emitir token novo para mudar permissões, em vez de alterar as do token em uso. Fonte: [Ably FAQ, novas capacidades](https://faqs.ably.com/recommendations-for-incrementally-authorising-new-capabilities). Por isso o token já nasce com as permissões de host e jogador, sem troca no meio do jogo.
- A migração para Vue 3 troca `new Vue` por `createApp`, `beforeDestroy`/`destroyed` por `beforeUnmount`/`unmounted` e pede `emits` declarados; o Vue Router 4 troca `mode: 'history'` por `createWebHistory`. Fontes: [guia de migração do Vue 3](https://v3-migration.vuejs.org/breaking-changes/) e [migração do Vue Router](https://router.vuejs.org/guide/migration).
- Objetos de bibliotecas externas guardados em `data` viram proxy reativo no Vue 3; `markRaw` evita isso (mesma fonte do Vue).

**Backlog do ciclo (impacto × esforço).**

| # | Item | Impacto | Esforço | Situação |
|---|---|---|---|---|
| 1 | Token com permissões mínimas por canal (#17) | Alto | Baixo | Feito |
| 2 | Front em Vue 3 + Vue Router 4 (#18) | Alto | Médio | Feito, a revisar |
| 3 | Só conectar ao Ably depois de `/health` confirmar a chave | Médio | Baixo | Feito |
| 4 | Percorrer o fluxo na tela sem chave e registrar | Médio | Baixo | Feito |
| 5 | Teste de interface no CI (#19) | Médio | Médio | Próximo ciclo |

**Fora do escopo.** Contas de usuário, redesenho das telas, Vite 6 ou mais novo (vira issue).

### Engenharia

**Arquitetura.** Sem mudança de desenho: `server.js` emite o token em `/auth`, agora com `capability` (`capabilityDoCliente`); o worker usa a chave. O front passa a Vue 3 (`createApp`, `createRouter`) e cria o cliente do Ably com `autoConnect: false`, ligando só depois de `/health`.

**Riscos.**
- Troca de versão maior do Vue e do Vue Router: o jogo ao vivo não foi percorrido com chave real depois da troca (#14). Item de revisão no PR.
- `capability` restrita pode negar alguma operação que o jogo usa; conferir com chave real (#14).
- 2 alertas de desenvolvimento no Vite 5 (servidor local); o build não leva o Vite.

**Qualidade.** `npm test` (11), `npm run lint` e `npm run build` no CI; `npm audit --omit=dev` sem alertas; fluxo percorrido no navegador com axe.

**Definição de pronto.** CI verde no PR para a sprint; `docs/MVP.md` e README atualizados; PR da sprint para a `main` aberto com `revisao-responsavel`.

### Plano de ação

**Este ciclo executa.** Itens 1 a 4.

**Vira issue.** #19 (teste de interface), Vite novo, telas ainda em inglês, botão "Criar" sem chave; #14, #15, #16 seguem com o responsável.

## Ciclo de 16/11/2026

> Executado em 16/11/2026. Nível N1. Sprint `developer/sprint-2026-11-19` (criada da `main` depois do merge do PR #28), feature `feature/2026-11-16`.

### Produto

**Problema e público.** Quem organiza uma gincana escolar cria uma sala e as equipes respondem ao vivo pelo celular. Sem mudança.

**Hipótese e meta.** Acreditamos que um host consegue abrir uma sala e receber as equipes em até 3 passos, sem ajuda. Saberemos quando, com a chave do Ably configurada (#14), um teste no navegador criar a sala, 2 equipes entrarem e o placar final aparecer.

**Meta do ciclo.** Pôr no CI o teste no navegador com axe (#19), que faltava para o critério 8 ser "Atende" pela régua; tratar as falhas que o percurso de 09/11 mostrou (#25 e a consulta da sala do jogador); traduzir as telas (#24).

**O que a pesquisa trouxe.**
- O Playwright recomenda o `@axe-core/playwright` dentro do próprio teste, com `withTags` para escolher as regras WCAG, e avisa que o teste automático não pega todos os problemas; o teclado segue à parte. Fonte: [Playwright, testes de acessibilidade](https://playwright.dev/docs/accessibility-testing).
- O guia do Vue pede rótulo ligado a cada campo de formulário (`<label for>`), e diz que o `placeholder` sozinho não basta, porque some ao digitar e costuma ter pouco contraste. Também pede o idioma da página no `<html lang>`. Fonte: [Vue, acessibilidade](https://vuejs.org/guide/best-practices/accessibility).
- O Ably descreve os estados da conexão: `disconnected` tenta de novo sozinho, `suspended` entra depois de 2 minutos sem conexão e `failed` pede ação. Enquanto não conecta, as mensagens ficam na fila; a tela precisa dizer ao host que a sala não nasceu, em vez de esperar para sempre. Fonte: [Ably, estados da conexão](https://ably.com/docs/connect/states).
- O Vite 7 e o 8 pedem Node 20.19 ou 22.12 ou mais novo, e o `@vitejs/plugin-vue` 6 aceita do Vite 5 ao 8. Fonte: [Vite, guia de migração](https://vite.dev/guide/migration).

**Backlog do ciclo (impacto × esforço).**

| # | Item | Impacto | Esforço | Situação |
|---|---|---|---|---|
| 1 | Patch e minor das dependências de produção (`axios`, `vue-router`, `dotenv`) | Médio | Baixo | Este ciclo |
| 2 | Critério 8 honesto: sem Playwright e axe no CI, é "Parcial" | Alto | Baixo | Este ciclo |
| 3 | Teste no navegador com axe e teclado, job `e2e` no CI (#19) | Alto | Médio | Este ciclo |
| 4 | Botão "Criar" sem tempo real e sala que não fica pronta (#25) | Médio | Baixo | Este ciclo |
| 5 | Falha ao conferir a sala do jogador: aviso e nova tentativa | Médio | Baixo | Este ciclo |
| 6 | Telas em português, `lang="pt-BR"`, `h1` e rótulos (#24) | Médio | Baixo | Este ciclo |
| 7 | Vite novo, sem os alertas de desenvolvimento (#26) | Baixo | Médio | Este ciclo, se o build e o teste passarem |
| 8 | README de porta de entrada (o repositório tem 5 estrelas) | Médio | Baixo | Este ciclo |
| 9 | Modo local sem Ably para testar o jogo completo no CI | Alto | Alto | Vira issue |
| 10 | Token por papel e por sala (#23) | Médio | Médio | Segue na issue |

**Fora do escopo.** Contas de usuário, redesenho das telas, Ably 2 e Express 5 (troca de versão maior no servidor).

### Engenharia

**Arquitetura.** Sem mudança de desenho. O `App.vue` passa o estado "tempo real desligado" às telas. O `CreateQuizRoom.vue` usa uma regra pura (`realtime-quiz/src/sala.js`) para o estado do botão e um prazo de 20 s para a sala ficar pronta. O `PlayerHome.vue` trata a falha de `/checkRoomStatus`. O Playwright sobe o `server.js` sem chave e testa o `dist` versionado; o CI confere que o `dist` bate com o código.

**Riscos.**
- O `dist` é versionado e o Render não roda o build do front: esquecer de recompilar publica tela velha. Mitigação: passo no CI que compara o build com o `dist`.
- O jogo ao vivo segue sem teste com chave real (#14). As telas novas de erro da sala só são testadas sem chave.
- Troca de versão maior do Vite (dev): conferir build, lint e o teste no navegador.

**Qualidade.** `npm test` (regras e rotas), `npm run test:e2e` (navegador, axe WCAG 2.1 A/AA e boas práticas, teclado, 375 px), `npm run lint` e `npm run build` no CI. O app não tem tema escuro próprio (nenhum `prefers-color-scheme`): o axe roda só no tema claro.

**Definição de pronto.** CI verde no PR para a sprint, com o job `e2e`; revisão independente feita; `docs/MVP.md`, README e `docs/DEPLOY.md` atualizados; PR da sprint para a `main` aberto com `revisao-responsavel`.

### Plano de ação

**Este ciclo executa.** Itens 1 a 8.

**Vira issue.** Modo local sem Ably (item 9) e o teste do jogo completo com chave no CI. Seguem com o responsável: #14 (chave do Ably) e #16 (publicação no Render).

**Resultado (16/11/2026).** Itens 1 a 8 feitos no PR #30. A checagem do `dist` falhou no primeiro run (43803746597): o build no Windows, com CRLF, gerava hashes diferentes do Linux. O `.gitattributes` com LF no front resolveu (run 43803969419 verde). A revisão independente não achou erros; as sugestões viraram correção (botão Criar espera o `/health`, fluxo do host só com teclado, axe nos estados de erro; run 43805272109 verde) ou a #36 (sala sem host). Novas issues: #31 (modo local), #32 (Dependabot e `e2e` obrigatório, responsável), #33 (gerar o front no deploy), #34 (imagens), #35 (Express 5 e Ably 2).
