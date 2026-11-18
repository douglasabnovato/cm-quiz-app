/*
 * Jogo completo no navegador, no modo local (QUIZ_TEMPO_REAL=local, sem Ably e sem segredo) (#31):
 * o host cria a sala, duas equipes entram pelo link, respondem às 4 perguntas e todos veem o placar final.
 * O axe roda nas telas do jogo ao vivo (sala com equipes, pergunta, resposta, placar e fim), em largura de desktop.
 * Também confere que a sala sem host encerra no prazo e sai do /health (#36).
 */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const perguntas = require('../quiz-default-questions');

/* GIF transparente de 1 px no lugar das imagens externas das perguntas: o teste não depende de rede de terceiros. */
const GIF_VAZIO = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

async function semViolacoes(page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

/* Aperta Tab até o elemento ganhar o foco (no máximo 15 vezes). */
async function tabAte(page, alvo) {
  for (let i = 0; i < 15; i += 1) {
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

async function novaPagina(browser, permissoes = []) {
  const contexto = await browser.newContext({ permissions: permissoes });
  await contexto.route('https://media.giphy.com/**', (route) => route.fulfill({ contentType: 'image/gif', body: GIF_VAZIO }));
  return contexto.newPage();
}

test('host cria a sala, duas equipes respondem e todos veem o placar final', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const host = await novaPagina(browser, ['clipboard-read', 'clipboard-write']);
  await host.goto(baseURL);
  await host.getByRole('button', { name: 'Configurar o Quiz Mundo CM' }).click();
  await host.getByLabel('Nome do host').fill('Professora');
  await host.getByRole('button', { name: 'Criar meu Quiz' }).click();
  await expect(host.getByRole('heading', { name: 'Sua sala está pronta' })).toBeVisible();

  await host.getByRole('button', { name: /Copiar o link de convite/ }).click();
  const link = await host.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/play\?quizCode=room-[a-z0-9]+$/);

  const equipes = [];
  for (const nome of ['Equipe Azul', 'Equipe Verde']) {
    const pagina = await novaPagina(browser);
    await pagina.goto(link);
    await pagina.getByLabel('Nome da equipe').fill(nome);
    await pagina.getByRole('button', { name: 'Entrar' }).click();
    await expect(pagina.getByText('Esperando o host')).toBeVisible();
    await expect(host.getByText(nome)).toBeVisible();
    equipes.push(pagina);
  }
  const [azul, verde] = equipes;
  await expect(azul.getByText('Professora')).toBeVisible();
  await semViolacoes(host);
  await semViolacoes(azul);

  await host.getByRole('button', { name: 'Começar o quiz' }).click();

  for (const [indice, pergunta] of perguntas.entries()) {
    const certa = pergunta.choices[pergunta.correct];
    const errada = pergunta.choices[(pergunta.correct + 1) % pergunta.choices.length];
    await expect(azul.getByRole('heading', { name: pergunta.question })).toBeVisible({ timeout: 15_000 });
    await expect(host.getByText(`Pergunta ${indice + 1}`)).toBeVisible();
    if (indice === 0) await semViolacoes(azul);

    const botaoCerto = azul.getByRole('button', { name: certa, exact: true });
    if (indice === 1) {
      /* Só teclado: Tab até a alternativa, com foco visível, e Enter responde. */
      await tabAte(azul, botaoCerto);
      await semFocoInvisivel(botaoCerto);
      await azul.keyboard.press('Enter');
    } else {
      await botaoCerto.click();
    }
    await expect(azul.getByText('Resposta enviada')).toBeVisible();
    await verde.getByRole('button', { name: errada, exact: true }).click();

    await expect(azul.getByText('Resposta certa')).toBeVisible();
    await expect(verde.getByText('Resposta errada')).toBeVisible();
    if (indice < perguntas.length - 1) {
      await expect(host.getByRole('button', { name: 'Próxima pergunta' })).toBeVisible();
      if (indice === 0) {
        await semViolacoes(host);
        await semViolacoes(azul);
        await semViolacoes(verde);
      }
      await host.getByRole('button', { name: 'Próxima pergunta' }).click();
    }
  }

  await expect(host.getByRole('heading', { name: /Parabéns às equipes vencedoras/ })).toBeVisible();
  for (const pagina of [host, azul, verde]) {
    const placar = pagina.locator('.placar', { has: pagina.getByRole('heading', { name: 'Placar final' }) });
    await expect(placar.locator('li').first()).toContainText('Equipe Azul');
    await expect(placar.locator('li').first()).toContainText(String(5 * perguntas.length));
    await expect(placar.locator('li').nth(1)).toContainText('Equipe Verde');
  }
  await expect(azul.getByText('O quiz terminou')).toBeVisible();
  await semViolacoes(host);
  await semViolacoes(azul);
  await semViolacoes(verde);
});

test('sala cujo host não entra no prazo encerra e sai do /health', async ({ request, baseURL }) => {
  /* Simula a tela do host que desistiu: entra na presença global pedindo a sala, mas nunca entra nela. */
  const salasAntes = (await (await request.get('/health')).json()).rooms;
  const resposta = await fetch(`${baseURL}/local/eventos`);
  const leitor = resposta.body.getReader();
  const { value } = await leitor.read();
  const { conexaoId } = JSON.parse(new TextDecoder().decode(value).replace(/^data: /, ''));
  const acao = (dados) => request.post('/local/acao', { data: { conexao: conexaoId, acao: dados } });
  await acao({ op: 'entrar', canal: 'main-quiz-thread', dados: { nickname: 'Host que desistiu', roomCode: 'room-sem-host' } });

  await expect.poll(async () => (await (await request.get('/checkRoomStatus?quizCode=room-sem-host')).json()).isRoomClosed).toBe(false);
  /* Prazo do host no teste: 3 s (QUIZ_PRAZO_DO_HOST_MS no playwright.config.js). */
  await expect
    .poll(async () => (await (await request.get('/checkRoomStatus?quizCode=room-sem-host')).json()).isRoomClosed, { timeout: 15_000 })
    .toBe(true);
  expect((await (await request.get('/health')).json()).rooms).toBe(salasAntes);
  await leitor.cancel();
});
/* fim de jogo-local.e2e.js */
