# Arquitetura — cm-quiz-app

## 1. C4

### Contexto

```mermaid
flowchart LR
  H([Host]) --> APP[cm-quiz-app]
  J([Equipes]) --> APP
  APP -->|token auth + pub/sub| ABLY[(Ably Realtime)]
  APP -->|CSV público| GS[(Google Sheets)]
```

### Contêineres

| Contêiner | Tecnologia | Responsabilidade |
|---|---|---|
| Front | Vue 3 + Vue Router 4 (build em `realtime-quiz/dist`) | Telas de host e jogador |
| Servidor principal | Node 20 + Express (`server.js`) | Estático, `/auth`, `/checkRoomStatus`, `/health`, cria *workers* |
| Worker por sala | `worker_threads` (`quiz-room-server.js`) | Fluxo da sala e pontuação |
| Mensageria | Ably | Canais `main-quiz-thread`, `<sala>:primary`, `<sala>:host` e um por jogador |

### Componentes do servidor

```mermaid
flowchart TB
  server[server.js createApp] --> registry[lib/room-registry]
  worker[quiz-room-server.js] --> engine[lib/quiz-engine]
  worker -->|postMessage| server
  server -->|applyWorkerMessage| registry
```

## 2. Pastas

```
server.js                 createApp({realtime, registry}) + main()
quiz-room-server.js       worker de cada sala
quiz-default-questions.js perguntas padrão (gabarito 0-based)
lib/quiz-engine.js        normalizeCustomQuestion, createScoreboard (puro)
lib/room-registry.js      createRoomRegistry, applyWorkerMessage (puro)
tests/quiz.test.js        node:test + supertest
realtime-quiz/            front Vue 3
```

## 3. Modelo de dados (em memória)

| Entidade | Campos | Regra |
|---|---|---|
| Sala | `code`, `isClosed`, `totalPlayers`, `totalPlayersThroughout` | Atualização por *merge*; fecha ao iniciar |
| Pergunta | `question`, `choices[2..4]`, `correct` (0-based), `imgLink?` | Validada por `normalizeCustomQuestion` |
| Placar | `clientId → {nickname, score}` + respondidos por pergunta | 1 resposta por jogador por pergunta, só com pergunta aberta; 5 pontos por acerto |

## 4. Contratos HTTP

| Rota | Resposta |
|---|---|
| `GET /health` | `200 {status:"ok", rooms, ...}` |
| `GET /auth` | `200` token Ably (clientId `randomUUID`, TTL 1 h, permissões por canal) · `502` se a Ably falhar · `503` sem chave |
| `GET /checkRoomStatus?quizCode=` | `200 {isRoomClosed}` · `400` código fora do padrão |
| `GET /`, `GET /play` | `index.html` do build |

## 5. ADRs

- **ADR-001 — Comando de host validado por `clientId`.** O `clientId` vem do token emitido pelo servidor, então não pode ser forjado pelo cliente. Mitiga D3 sem mudar o front. Limite conhecido: o token ainda tem capability ampla em todos os canais; restringir por sala exige passar o código da sala no `/auth` (próximo ciclo).
- **ADR-002 — Regras puras em `lib/`.** Pontuação e registro sem Ably e sem thread, testáveis em milissegundos.
- **ADR-003 — `createApp` injetável e `main()` só quando executado direto.** Permite testar rotas com supertest usando uma Ably falsa.
- **ADR-004 — Migração Vue 2 → Vue 3/Vite adiada.** Vue 2 está EOL; migração é um projeto próprio (reescrita de 9 componentes). Registrado como risco.

## 6. Fora do escopo

Persistência de resultados; token do Ably por papel e por sala; autenticação de host com senha. (Vue 3 com Vite e permissões por canal saíram desta lista em 09/11/2026.)

## Canais e permissões do token (07/11/2026)

O navegador recebe um token criado em `/auth` com `capability` mínima (`capabilityDoCliente` em `server.js`). O worker de cada sala usa a chave e tem acesso total. O curinga `*` vale um segmento inteiro do nome, separado por `:` (documentação do Ably: https://ably.com/docs/auth/capabilities).

| Canal | Quem publica | Permissão do navegador |
|---|---|---|
| `main-quiz-thread` | ninguém; o host entra na presença para pedir a sala | `presence` |
| `<sala>:primary` | só o worker | `subscribe`, `presence` |
| `<sala>:host` | o host (iniciar, próxima pergunta, encerrar) | `publish` |
| `<sala>:player-ch-<clientId>` | o próprio jogador | `publish` só no canal do seu `clientId` |

Riscos que ficam, porque não há login e todo token tem as mesmas permissões:
- qualquer token pode publicar no `<sala>:host` de outra sala se souber o código. O worker ignora comandos cujo `clientId` não é o do host (`quiz-room-server.js`), e o Ably fixa o `clientId` no token; o efeito é ruído no canal;
- qualquer token pode entrar na presença global e criar salas (uma worker por sala no servidor) e entrar na presença de qualquer `<sala>:primary` como jogador, inflando a lista e o placar.
Fechar isso exige token por papel e sala (issue do ciclo de 07/11). O jogo com chave real não foi percorrido depois da mudança (#14).
