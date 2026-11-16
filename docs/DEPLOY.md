# Deploy · CM Quiz App

> Revisto em 16/11/2026. Estado: **fora do ar**. `curl -s -o /dev/null -w "%{http_code}" https://cm-quiz-app.onrender.com/health` respondeu `404` em 16/11/2026: não há serviço com esse nome. Criar o serviço é do responsável ([#16](https://github.com/douglasabnovato/cm-quiz-app/issues/16)).

## 1. Decisão

| Opção | Resultado |
|---|---|
| **Render, serviço web gratuito (escolhida)** | Roda o `server.js` (tokens do Ably e salas em *worker threads*) e entrega o front na mesma origem, sem CORS |
| Front em hospedagem estática e servidor em outro lugar | Separaria o `/auth` do front e exigiria CORS, sem ganho |

- **Infraestrutura como código:** `render.yaml` (Blueprint) na raiz. Serviço `cm-quiz-app`, plano `free`, branch `main`, Node 22, health check em `/health`.
- **Build:** `npm ci --omit=dev`. O front não é compilado no Render: o `realtime-quiz/dist` é versionado, e o CI falha se ele não bater com o código (#33 propõe gerar no deploy).
- **Chave do Ably:** só no painel do Render (`ABLY_API_KEY`, `sync: false`). O navegador recebe um token de 1 hora pelo `/auth`, com permissões só nos canais do jogo.
- **Sem chave:** o servidor sobe só com as telas e avisa "jogo ao vivo desligado". Dá para publicar antes de ter a chave.
- **Plano gratuito:** o serviço dorme depois de 15 minutos sem acesso e leva cerca de 1 minuto para acordar. Abra a página do host alguns minutos antes da gincana.
- **Custo:** zero. Ably e Render nos planos gratuitos; nada de domínio próprio.

## 2. Conferir localmente antes (Git Bash)

```sh
npm ci
npm test                         # 17 testes
npm run lint
npx playwright install chromium
npm run test:e2e                 # 10 testes no navegador, sem chave
cd realtime-quiz && npm ci && npm run lint && npm run build && cd ..
git status --short realtime-quiz/dist   # vazio: o dist versionado está em dia
npm start                        # http://localhost:8082
```

## 3. Passo a passo do responsável

### Etapa 1 · Chave do Ably (opcional para publicar, necessária para jogar)

1. Entrar em **ably.com** e criar a conta gratuita (ou entrar na existente).
2. **Create new app** → nome `cm-quiz-app` → **Create app**.
3. No app, aba **API Keys** → **Create a new API key** → nome `cm-quiz-app-render` → marcar **Publish**, **Subscribe** e **Presence** → **Create key**.
4. Copiar a chave só para o passo 6 da Etapa 2. Não colar em issue, PR, commit nem chat.
5. Se uma chave antiga já foi compartilhada, revogar em **API Keys → Revoke**.

### Etapa 2 · Serviço no Render

1. Entrar em **dashboard.render.com** com a conta do GitHub.
2. **New +** → **Blueprint**.
3. Em **Connect a repository**, escolher `douglasabnovato/cm-quiz-app` (se não aparecer: **Configure account** → dar acesso ao repositório → voltar).
4. **Branch:** `main`. **Blueprint Name:** `cm-quiz-app`.
5. O Render lê o `render.yaml` e mostra o serviço web `cm-quiz-app` no plano **Free**.
6. No campo **ABLY_API_KEY**, colar a chave da Etapa 1 (ou deixar vazio para publicar só as telas).
7. **Apply** (ou **Deploy Blueprint**).
8. Abrir o serviço → **Logs** e esperar `Quiz em http://localhost:10000` (sem chave: `... (sem tempo real)`).

### Etapa 3 · Conferir no ar

1. Copiar o endereço real no topo da página do serviço. O Render pode acrescentar um sufixo (por exemplo `cm-quiz-app-xxxx.onrender.com`).
2. `curl -s https://<endereço>/health` → `{"status":"ok","realtime":true,...}` (`false` se publicou sem chave).
3. Abrir `https://<endereço>/` no computador e criar uma sala com um nome de host.
4. No celular, abrir o link de convite, escrever o nome da equipe e entrar.
5. Começar o quiz, responder e ver o placar.

### Etapa 4 · Registrar

1. Comentar na #16 o endereço real e o resultado do passo 2 da Etapa 3 (sem a chave).
2. No GitHub, na página do repositório: engrenagem de **About** → **Website** → colar o endereço → **Save changes**.
3. Se o endereço for diferente de `https://cm-quiz-app.onrender.com`, o próximo ciclo corrige o README e este arquivo.

## 4. Histórico

- 30/10 e 06/11/2026: o link do Render respondeu 404.
- 06/11/2026: o servidor passou a subir sem a chave, só com as telas.
- 09/11/2026: front em Vue 3; o `dist` versionado continua servido direto.
- 16/11/2026: CI confere que o `dist` bate com o código; Vite 7 no front.
