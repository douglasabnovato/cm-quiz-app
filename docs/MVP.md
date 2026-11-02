# MVP — cm-quiz-app

> Criado em 02/11/2026. Meta: N1 (estudo). Testado no Windows, com Node 24, na cópia de `main`. Não houve teste com pessoas nem em aparelho real.

## 1. Critérios: 7 de 12 atendidos

| # | Critério | Como verificar | Situação |
|---|---|---|---|
| 1 | Problema e público claros | Dá para explicar em uma frase | Atende: Quem organiza um quiz cria uma sala e joga ao vivo com outras pessoas. |
| 2 | Hipótese a validar | Existe uma aposta escrita, com meta | Atende: Proposta na seção 2; ainda sem validação com pessoas. |
| 3 | Fluxo principal completo | Uma pessoa conclui sem ajuda | Parcial: Tela inicial no navegador, servindo `dist`; o jogo exige chave do Ably e não foi percorrido. |
| 4 | Escopo enxuto | O que não entra está registrado | Atende: Seção 3. |
| 5 | Medição de uso | A métrica principal é coletada | Não atende: Projeto de estudo sem coleta de uso. |
| 6 | Falhas tratadas | Erro, vazio e carregamento têm resposta clara | Não atende: Não exercitado: sem chave do Ably não há sessão ao vivo. |
| 7 | Desempenho aceitável | LCP de até 2,5 s no celular | Não medido: Sem publicação verificada neste ciclo. |
| 8 | Acessibilidade básica | axe e teclado | Atende: Depois da correção, axe sem violações; foco visível; sem rolagem em 375 px. |
| 9 | Segurança e conformidade | Riscos decididos | Parcial: o front saiu do Vue CLI 4 para Vite, sem alertas críticos ou altos; resta 1 alerta baixo do Vue 2. |
| 10 | Entrega confiável | CI verde antes de entrar na principal | Atende: CI verde no PR deste ciclo; a principal segue sem proteção. |
| 11 | Testes dos fluxos críticos | Testes automatizados no CI | Atende: Testes automatizados rodam no CI. |
| 12 | Documentação honesta | O README ensina a rodar | Atende: Comandos conferidos com o `package.json`; aviso de estudo no README. |

## 2. Hipótese (proposta)

Praticar Vue e tempo real: criar uma sala de quiz em até 3 passos.

## 3. Fora do MVP

Banco de perguntas por usuário e ranking histórico.

## 4. Neste ciclo

Adiciona título principal e `main`, reconstrói `dist` e atualiza dependências.
