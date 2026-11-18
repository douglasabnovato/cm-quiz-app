/*
 * Teste no navegador, com o front buildado em realtime-quiz/dist. Dois servidores:
 * - projeto `chromium`: servidor sem ABLY_API_KEY (só as telas), em e2e/telas.e2e.js;
 * - projeto `jogo-local`: servidor no modo local (QUIZ_TEMPO_REAL=local, sem Ably), em e2e/jogo-local.e2e.js (#31).
 */
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT) || 8093;
const PORT_LOCAL = Number(process.env.E2E_PORT_LOCAL) || 8094;

module.exports = defineConfig({
  testDir: 'e2e',
  testMatch: /.*\.e2e\.js$/,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [
    {
      name: 'chromium',
      testMatch: /telas\.e2e\.js$/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORT}` },
    },
    {
      name: 'jogo-local',
      testMatch: /jogo-local\.e2e\.js$/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORT_LOCAL}` },
    },
  ],
  webServer: [
    {
      command: 'node server.js',
      url: `http://localhost:${PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      /* ABLY_API_KEY vazia vence o .env local (o dotenv não sobrescreve variável já definida). */
      env: { PORT: String(PORT), ABLY_API_KEY: '' },
    },
    {
      command: 'node server.js',
      url: `http://localhost:${PORT_LOCAL}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      /* Prazo do host curto para o teste da sala sem host (#36); o padrão é 60 s. */
      env: { PORT: String(PORT_LOCAL), ABLY_API_KEY: '', QUIZ_TEMPO_REAL: 'local', QUIZ_PRAZO_DO_HOST_MS: '3000' },
    },
  ],
});
/* fim de playwright.config.js */
