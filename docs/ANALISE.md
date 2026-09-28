# Análise — cm-quiz-app (quiz em tempo real para gincana)

## 1. Especificação inferida

Quiz ao vivo para gincana escolar entre equipes. Um **host** cria a sala (perguntas padrão ou planilha Google), compartilha o link e controla o ritmo; os **jogadores** entram pelo celular, respondem e veem o placar em tempo real.

| Ator | Objetivo |
|---|---|
| Host | Criar sala, iniciar, avançar perguntas, encerrar |
| Jogador (equipe) | Entrar com apelido, responder, acompanhar o placar |
| Servidor | Autenticar na Ably, criar uma *worker thread* por sala, calcular pontuação |

### Requisitos funcionais

| ID | Requisito | Estado antes |
|---|---|---|
| RF1 | Criar sala com perguntas padrão | ⚠️ gabarito errado (ver D1) |
| RF2 | Criar sala com perguntas da planilha | ⚠️ índice sem validação derrubava a *worker* |
| RF3 | Entrar na sala pelo link | ⚠️ `/play` com código inexistente derrubava o servidor |
| RF4 | Responder e pontuar | ❌ resposta repetida somava pontos |
| RF5 | Somente o host controla o fluxo | ❌ qualquer cliente publicava comandos de host |
| RF6 | Placar final | ✅ |

### Requisitos não funcionais

| ID | Requisito | Referência |
|---|---|---|
| RNF1 | Chave Ably só no servidor; clientes usam *token auth* | OWASP A02/A07, 12-Factor III |
| RNF2 | Servidor não cai por entrada malformada | ISO 25010 — confiabilidade |
| RNF3 | Regras do jogo testáveis sem rede | Injeção de dependência |
| RNF4 | Hospedagem gratuita | Render (web service) + plano Free da Ably |

## 2. Defeitos encontrados

| # | Defeito | Severidade |
|---|---|---|
| D1 | `quiz-default-questions.js` com gabarito 1-based: toda resposta certa era contada como errada | Crítica |
| D2 | Mesma pessoa podia responder várias vezes e acumular pontos | Crítica (trapaça) |
| D3 | Qualquer cliente podia publicar `start`/`next`/`end` do host | Alta (OWASP A01) |
| D4 | `/play?quizCode=X` com sala inexistente lançava exceção | Alta |
| D5 | Mensagens parciais da *worker* sobrescreviam campos: sala iniciada voltava a parecer aberta | Média |
| D6 | `totalPlayersThroughout` duplicava a cada atualização | Média |
| D7 | Índice de resposta fora do intervalo derrubava a *worker* | Média |
| D8 | Jogador entrava depois do início e desbalanceava o placar | Baixa |
| D9 | Arquivo duplicado `quiz-default-questions copy.js` | Baixa |
| D10 | Vue 2 / Vue CLI 4 sem suporte (EOL em 31/12/2023) | Risco (ADR) |
| D11 | Nenhum teste automatizado | Média |

## 3. Rubrica (grupo Fullstack)

| Critério | Peso | Antes | Depois | Justificativa |
|---|---|---|---|---|
| C1 Funcionalidade essencial | 18 | 3 | 8 | Gabarito correto, pontuação justa |
| C2 Usabilidade | 10 | 5 | 6 | Front não alterado neste ciclo |
| C3 Acessibilidade | 8 | 3 | 3 | Front Vue 2 fora do escopo |
| C4 Segurança | 16 | 3 | 8 | Comandos de host validados, token auth com TTL, fail-fast sem chave |
| C5 Dados/Backend | 12 | 3 | 8 | Registro de salas com *merge*, validação de perguntas |
| C6 Código | 10 | 3 | 8 | `lib/` pura, `createApp` injetável |
| C7 Testes | 8 | 0 | 7 | 5 suítes `node:test` + supertest |
| C8 Performance | 6 | 6 | 7 | *Workers* por sala, canais desanexados ao sair |
| C9 Documentação | 6 | 4 | 8 | docs/ + README em pt-BR |
| C10 Deploy | 6 | 4 | 7 | `engines`, `.env.example`, `build:front` |

**Média ponderada:** antes **3,08** (reprova: C1 e C4 < 5) → depois **7,50** (aprova).
