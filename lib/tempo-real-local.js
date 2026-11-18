/*
 * tempo-real-local.js · central de canais em memória para o modo local (QUIZ_TEMPO_REAL=local).
 * Faz o mínimo do Ably que o jogo usa: canais, publicação e presença. Só para testes e estudo:
 * não tem token nem permissões por canal, por isso só liga com a variável de ambiente.
 * Cada conexão (navegador ou worker) recebe os eventos pela função `entregar`.
 */
const crypto = require('crypto');

const NOME_DE_CANAL = /^[A-Za-z0-9:_-]{1,200}$/;

/* Cria a central. `gerarId` é injetável para os testes. */
function createHub({ gerarId = () => crypto.randomUUID() } = {}) {
  const conexoes = new Map();
  const canais = new Map();

  function canal(nome) {
    if (!canais.has(nome)) canais.set(nome, { assinantes: new Set(), membros: new Map() });
    return canais.get(nome);
  }

  /* Entrega o evento a todas as conexões anexadas ao canal. */
  function difundir(nome, evento) {
    const atual = canais.get(nome);
    if (!atual) return;
    [...atual.assinantes].forEach((id) => {
      const conexao = conexoes.get(id);
      if (conexao) conexao.entregar({ ...evento, canal: nome });
    });
  }

  function sair(conexao, nome) {
    const atual = canais.get(nome);
    if (!atual || !atual.membros.has(conexao.clientId)) return;
    const dados = atual.membros.get(conexao.clientId);
    atual.membros.delete(conexao.clientId);
    difundir(nome, { tipo: 'presenca', acao: 'leave', clientId: conexao.clientId, dados });
  }

  return {
    /* Registra uma conexão; o clientId identifica quem publica e quem está na presença. */
    conectar({ clientId, entregar }) {
      const conexaoId = gerarId();
      const conexao = { clientId: clientId || `id-${gerarId()}`, entregar, canais: new Set() };
      conexoes.set(conexaoId, conexao);
      return { conexaoId, clientId: conexao.clientId };
    },

    existe(conexaoId) {
      return conexoes.has(conexaoId);
    },

    /* Executa uma ação da conexão e devolve o resultado (só `membros` devolve dados). */
    executar(conexaoId, acao) {
      const conexao = conexoes.get(conexaoId);
      if (!conexao) throw new Error('Conexão desconhecida.');
      const nome = acao && acao.canal;
      if (typeof nome !== 'string' || !NOME_DE_CANAL.test(nome)) throw new Error('Canal inválido.');
      const atual = canal(nome);
      switch (acao.op) {
        case 'anexar':
          atual.assinantes.add(conexaoId);
          conexao.canais.add(nome);
          return null;
        case 'desanexar':
          sair(conexao, nome);
          atual.assinantes.delete(conexaoId);
          conexao.canais.delete(nome);
          return null;
        case 'publicar':
          difundir(nome, {
            tipo: 'mensagem',
            nome: String(acao.nome || ''),
            dados: acao.dados === undefined ? null : acao.dados,
            clientId: conexao.clientId,
          });
          return null;
        case 'entrar':
          atual.membros.set(conexao.clientId, acao.dados === undefined ? null : acao.dados);
          conexao.canais.add(nome);
          difundir(nome, { tipo: 'presenca', acao: 'enter', clientId: conexao.clientId, dados: acao.dados });
          return null;
        case 'sair':
          sair(conexao, nome);
          return null;
        case 'membros':
          return [...atual.membros].map(([clientId, data]) => ({ clientId, data }));
        default:
          throw new Error('Ação desconhecida.');
      }
    },

    /* Fecha a conexão: sai da presença de todos os canais, como o Ably faz ao cair a conexão. */
    desconectar(conexaoId) {
      const conexao = conexoes.get(conexaoId);
      if (!conexao) return;
      conexoes.delete(conexaoId);
      conexao.canais.forEach((nome) => {
        sair(conexao, nome);
        const atual = canais.get(nome);
        if (atual) atual.assinantes.delete(conexaoId);
      });
    },
  };
}

module.exports = { createHub };
/* fim de tempo-real-local.js */
