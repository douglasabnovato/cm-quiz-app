/*
 * Telas no navegador sem a chave do Ably: host e jogador, avisos, falhas, teclado e axe.
 * O jogo ao vivo (sala criada, respostas e placar) exige a chave e não roda aqui (#14).
 * O app não tem tema escuro próprio (nenhum prefers-color-scheme no CSS); por isso o axe roda só no tema claro.
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/* axe sem violações nas regras WCAG 2.1 A e AA e nas boas práticas (inclui ter um h1). */
async function semViolacoes(page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

/* Sem rolagem lateral na largura da página. */
async function semRolagemLateral(page) {
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra).toBeLessThanOrEqual(0);
}

/* Aperta Tab até o elemento ganhar o foco (no máximo 10 vezes). */
async function tabAte(page, alvo) {
  for (let i = 0; i < 10; i += 1) {
    if (await alvo.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(alvo).toBeFocused();
}

/* O foco precisa aparecer: contorno ou sombra (o Bootstrap usa box-shadow nos botões). */
async function semFocoInvisivel(alvo) {
  const estilo = await alvo.evaluate((el) => {
    const c = getComputedStyle(el);
    return { contorno: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0, sombra: c.boxShadow !== 'none' };
  });
  expect(estilo.contorno || estilo.sombra).toBe(true);
}

const AVISO_SEM_CHAVE = /O jogo ao vivo está desligado/;

test.describe('host', () => {
  test('a tela inicial avisa que o jogo ao vivo está desligado e passa no axe', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(AVISO_SEM_CHAVE);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Desafio Global do Conhecimento');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await semViolacoes(page);
  });

  test('Tab chega a "Tentar de novo" com foco visível e Enter consulta o servidor de novo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(AVISO_SEM_CHAVE);
    await page.keyboard.press('Tab');
    const botao = page.getByRole('button', { name: 'Tentar de novo' });
    await expect(botao).toBeFocused();
    const contorno = await botao.evaluate((el) => {
      const c = getComputedStyle(el);
      return `${c.outlineWidth} ${c.outlineStyle}`;
    });
    expect(contorno).toBe('3px solid');
    const consulta = page.waitForRequest((req) => req.url().endsWith('/health'));
    await page.keyboard.press('Enter');
    await consulta;
    await expect(page.getByRole('alert')).toContainText(AVISO_SEM_CHAVE);
  });

  test('sem tempo real, o formulário explica e não deixa criar a sala', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(AVISO_SEM_CHAVE);
    await page.getByRole('button', { name: 'Configurar o Quiz Mundo CM' }).click();
    const nome = page.getByLabel('Nome do host');
    await expect(nome).toBeVisible();
    await nome.fill('Equipe Teste');
    await nome.press('Enter');
    const criar = page.getByRole('button', { name: /Criar meu Quiz/ });
    await expect(criar).toBeDisabled();
    await expect(page.getByText('Para criar a sala, o jogo ao vivo precisa estar ligado.')).toBeVisible();
    await semViolacoes(page);
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.getByRole('button', { name: 'Configurar o Quiz Mundo CM' })).toBeVisible();
  });

  test('com tempo real, criar sem nome pede o nome e devolve o foco ao campo', async ({ page }) => {
    /* /health diz que o tempo real está ligado; o /auth real responde 503 e o Ably fica tentando. */
    await page.route('**/health', (route) =>
      route.fulfill({ json: { status: 'ok', realtime: true, rooms: 0, players: 0 } })
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Configurar o Quiz Mundo CM' }).click();
    const criar = page.getByRole('button', { name: 'Criar meu Quiz' });
    await expect(criar).toBeEnabled();
    await criar.click();
    await expect(page.getByText('Escreva o nome do host para criar a sala.')).toBeVisible();
    await expect(criar).toBeEnabled();
    await expect(page.getByLabel('Nome do host')).toBeFocused();
    await semViolacoes(page);
  });

  test('só com teclado: abrir o formulário, escrever o nome e criar, com foco visível', async ({ page }) => {
    await page.route('**/health', (route) =>
      route.fulfill({ json: { status: 'ok', realtime: true, rooms: 0, players: 0 } })
    );
    await page.goto('/');
    const configurar = page.getByRole('button', { name: 'Configurar o Quiz Mundo CM' });
    await expect(configurar).toBeVisible();
    await tabAte(page, configurar);
    await semFocoInvisivel(configurar);
    await page.keyboard.press('Enter');
    const nome = page.getByLabel('Nome do host');
    await tabAte(page, nome);
    await page.keyboard.type('Equipe Teste');
    const criar = page.getByRole('button', { name: 'Criar meu Quiz' });
    await expect(criar).toBeEnabled();
    await tabAte(page, criar);
    await semFocoInvisivel(criar);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Criando a sala…' })).toBeDisabled();
  });

  test('com tempo real, a sala que não fica pronta em 20 s avisa e libera o botão', async ({ page }) => {
    /* Relógio controlado: o prazo de 20 s passa sem esperar de verdade. */
    await page.clock.install();
    await page.route('**/health', (route) =>
      route.fulfill({ json: { status: 'ok', realtime: true, rooms: 0, players: 0 } })
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Configurar o Quiz Mundo CM' }).click();
    await page.getByLabel('Nome do host').fill('Equipe Teste');
    await page.getByRole('button', { name: 'Criar meu Quiz' }).click();
    await expect(page.getByRole('button', { name: 'Criando a sala…' })).toBeDisabled();
    await page.clock.runFor(20_000);
    await expect(page.getByRole('alert').filter({ hasText: 'A sala não ficou pronta em 20 segundos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar meu Quiz' })).toBeEnabled();
    await expect(page.getByLabel('Nome do host')).toBeEnabled();
    await semViolacoes(page);
  });
});

test.describe('jogador', () => {
  test('sala inexistente: a tela explica em português e passa no axe', async ({ page }) => {
    await page.goto('/play?quizCode=XYZ');
    await expect(page.getByText('Esta sala não está mais disponível')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await semViolacoes(page);
  });

  test('sala aberta: o campo da equipe tem rótulo e passa no axe', async ({ page }) => {
    await page.route('**/checkRoomStatus*', (route) => route.fulfill({ json: { isRoomClosed: false } }));
    await page.goto('/play?quizCode=sala-teste');
    await expect(page.getByLabel('Nome da equipe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Escreva o nome da equipe para entrar.' })).toBeVisible();
    await expect(page.getByLabel('Nome da equipe')).toBeVisible();
    await semViolacoes(page);
  });

  test('falha ao conferir a sala: avisa e deixa tentar de novo', async ({ page }) => {
    let tentativas = 0;
    await page.route('**/checkRoomStatus*', (route) => {
      tentativas += 1;
      return tentativas === 1 ? route.abort('failed') : route.fulfill({ json: { isRoomClosed: false } });
    });
    await page.goto('/play?quizCode=sala-teste');
    const aviso = page.getByRole('alert').filter({ hasText: 'Não foi possível conferir a sala' });
    await expect(aviso).toBeVisible();
    await expect(page.getByLabel('Nome da equipe')).toHaveCount(0);
    await semViolacoes(page);
    await page.getByRole('button', { name: 'Conferir a sala de novo' }).click();
    await expect(page.getByLabel('Nome da equipe')).toBeVisible();
    expect(tentativas).toBe(2);
  });
});

test.describe('celular (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('host e jogador sem rolagem lateral', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(AVISO_SEM_CHAVE);
    await semRolagemLateral(page);
    await page.goto('/play?quizCode=XYZ');
    await expect(page.getByText('Esta sala não está mais disponível')).toBeVisible();
    await semRolagemLateral(page);
  });
});
/* fim de telas.e2e.js */
