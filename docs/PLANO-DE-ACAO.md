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
