/* Teste no navegador: sobe o servidor sem ABLY_API_KEY (só as telas) e serve o front buildado em realtime-quiz/dist */
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT) || 8093;

module.exports = defineConfig({
  testDir: 'e2e',
  testMatch: /.*\.e2e\.js$/,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node server.js',
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    /* ABLY_API_KEY vazia vence o .env local (o dotenv não sobrescreve variável já definida). */
    env: { PORT: String(PORT), ABLY_API_KEY: '' },
  },
});
/* fim de playwright.config.js */
