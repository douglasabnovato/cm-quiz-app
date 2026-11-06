<template>
  <main id="app">
    <div v-if="aviso" class="aviso-conexao" :role="aviso.grave ? 'alert' : 'status'">
      <p>{{ aviso.texto }}</p>
      <button v-if="aviso.grave" type="button" @click="reconectar">Tentar de novo</button>
    </div>
    <router-view :realtime="realtime"></router-view>
  </main>
</template>

<script>
import * as Ably from 'ably';
import { avisoDaConexao } from './conexao.js';

export default {
  name: 'App',
  components: {},
  data() {
    return {
      realtime: null,
      aviso: null,
      semChave: false
    };
  },
  created() {
    this.realtime = new Ably.Realtime({
      authUrl: '/auth'
    });
    /* Mostra o estado da conexão: desconectado e suspenso tentam sozinhos; falha pede ação. */
    this.realtime.connection.on((mudanca) => {
      this.aviso = avisoDaConexao(mudanca.current, mudanca.reason, this.semChave);
    });
    /* O servidor diz em /health se está sem chave; assim o aviso aparece logo, sem esperar as tentativas. */
    fetch('/health')
      .then((r) => r.json())
      .then((saude) => {
        if (saude.realtime === false) {
          this.semChave = true;
          this.aviso = avisoDaConexao('failed', null, true);
        }
      })
      .catch(() => {});
  },
  methods: {
    reconectar() {
      this.aviso = null;
      this.realtime.connection.connect();
    }
  },
  destroyed() {
    this.realtime.connection.off();
    this.realtime.connection.close();
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background-color:rgba(103, 169, 133, 1);
}
.aviso-conexao {
  background: #fff;
  color: #1a1a1a;
  border-left: 6px solid #b00020;
  padding: 12px 16px;
  margin: 0 auto 16px;
  max-width: 640px;
}
.aviso-conexao p {
  margin: 0 0 8px;
}
.aviso-conexao button {
  background: #014339;
  color: #fff;
  border: 0;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.aviso-conexao button:focus-visible {
  outline: 3px solid #075a9c;
  outline-offset: 2px;
}
</style>
