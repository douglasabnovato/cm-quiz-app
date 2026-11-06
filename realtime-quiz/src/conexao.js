/* conexao.js · traduz o estado da conexão do Ably num aviso para a tela (null quando está tudo bem). */
export function avisoDaConexao(estado, motivo, semChave = false) {
  if (semChave) {
    return { grave: true, texto: 'O jogo ao vivo está desligado: o servidor está sem a chave do Ably. Veja o README para configurar.' };
  }
  if (estado === 'disconnected' || estado === 'connecting') {
    return estado === 'connecting' ? null : { grave: false, texto: 'Conexão perdida. Tentando reconectar…' };
  }
  if (estado === 'suspended') {
    return { grave: false, texto: 'Sem conexão há mais de 2 minutos. Tentando de novo a cada 30 segundos.' };
  }
  if (estado === 'failed') {
    return { grave: true, texto: 'Não foi possível conectar ao serviço de tempo real.' };
  }
  return null;
}
/* fim de conexao.js */
