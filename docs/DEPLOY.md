# Deploy · CM Quiz App

Plano de ação para publicar o quiz em tempo real em hospedagem gratuita.

## 1. Desafio

Publicar um quiz ao vivo (Node + worker threads + Ably + front Vue 2) sem custo, sem expor a chave do Ably e sem depender de um build de front que não roda mais nas versões atuais do Node.

## 2. Conteúdo

### Decisão de hospedagem

| Opção | Resultado |
|---|---|
| **Render, serviço web gratuito (escolhida)** | Roda o `server.js` (tokens do Ably + salas em worker threads) e entrega o front na mesma origem |
| Front em hospedagem estática + servidor em outro lugar | Separaria o `/auth` do front e exigiria CORS, sem ganho |

### Decisões técnicas

- **Front já buildado:** `realtime-quiz/dist` está versionado e é servido direto. O `vue-cli` 4 (webpack 4) falha no Node 17+ por causa do OpenSSL 3; recompilar exige a migração Vue 2 → Vue 3 + Vite, registrada para o próximo ciclo. As correções deste ciclo (gabarito, uma resposta por jogador, comandos só do host) estão no servidor, então o `dist` atual continua válido.
- **Chave do Ably:** fica só no servidor (`ABLY_API_KEY`); o navegador recebe um token de 1 hora pelo `/auth`, com `clientId` gerado no servidor.
- **Plano gratuito:** o serviço dorme após 15 min sem acesso (~1 min para acordar). Abra a página do host alguns minutos antes da gincana.

### O que foi ajustado para o deploy

| Mudança | Arquivo | Por quê |
|---|---|---|
| Blueprint do serviço web com `ABLY_API_KEY` pedida no painel | `render.yaml` | Infraestrutura como código sem segredo no repositório |
| Dependências atualizadas dentro das mesmas versões maiores | `package-lock.json` | `npm audit` apontava 16 pacotes (4 críticos, 5 altos, vindos de `express` e `ably` antigos); `npm audit fix` sem mudança de versão maior zerou tudo |
| Seção de deploy com link e decisões | `README.md` | Instrução correta de build (sem `build:front`) |

### Verificação feita antes da entrega

- `npm ci --omit=dev` limpo, 5 testes passando (`node --test`), `npm audit --omit=dev`: 0 vulnerabilidades.

## 3. Solução (passo a passo)

### Etapa 1 · Trocar a chave do Ably

1. No painel da Ably, **API Keys**: criar uma chave nova (capacidades: `publish`, `subscribe`, `presence`) e revogar a antiga, se ela já foi compartilhada.
2. Guardar a chave para a Etapa 3.

### Etapa 2 · Validar localmente e subir (Git Bash)

1. `cd /c/ambiente-projeto/ser-mvp/cm-quiz-app`
2. Criar `.env` a partir do `.env.example` com a chave nova.
3. `npm ci`
4. `npm test` (5 testes)
5. `npm start` e abrir http://localhost:8082
6. `git rm "quiz-default-questions copy.js"` (cópia em inglês sem uso)
7. `git status` (o `.env` não pode aparecer)
8. `git add -A`
9. `git commit -m "fix: gabarito 0-based, 1 resposta por jogador, comandos só do host, dependências sem vulnerabilidades e deploy no Render"`
10. `git push`

### Etapa 3 · Criar o serviço no Render

1. Entrar em **render.com** com o GitHub e autorizar o repositório `cm-quiz-app`.
2. **New → Blueprint** e escolher `douglasabnovato/cm-quiz-app`.
3. O Render pede o valor de `ABLY_API_KEY`: colar a chave nova.
4. **Apply** e acompanhar **Logs** até aparecer `Quiz em http://localhost:10000`.

### Etapa 4 · Conferir no ar

1. `/health` responde `{"status":"ok", ...}`.
2. Criar uma sala como host no computador.
3. No celular, entrar como jogador pelo código da sala.
4. Iniciar o quiz, responder e ver o placar; responder duas vezes a mesma pergunta não soma pontos.

### Etapa 5 · Fechar

1. Se a URL real for diferente de `https://cm-quiz-app.onrender.com`, corrigir no `README.md`, commit e push.
2. No GitHub, **About → Website**: colar a URL.
