<template>
  <main class="app-quiz">
    <div v-if="aviso" class="aviso-conexao" :role="aviso.grave ? 'alert' : 'status'">
      <p>{{ aviso.texto }}</p>
      <button v-if="aviso.grave" type="button" @click="reconectar">Tentar de novo</button>
    </div>
    <router-view :realtime="realtime"></router-view>
  </main>
</template>

<script>
import * as Ably from 'ably';
import { markRaw } from 'vue';
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
    /* markRaw: o cliente do Ably não pode virar proxy reativo do Vue 3.
       autoConnect: false: só conecta depois de /health confirmar que o servidor tem a chave. */
    this.realtime = markRaw(new Ably.Realtime({
      authUrl: '/auth',
      autoConnect: false
    }));
    /* Mostra o estado da conexão: desconectado e suspenso tentam sozinhos; falha pede ação. */
    this.realtime.connection.on((mudanca) => {
      this.aviso = avisoDaConexao(mudanca.current, mudanca.reason, this.semChave);
    });
    this.verificarServidor();
  },
  methods: {
    /* Pergunta ao servidor se o tempo real está ligado; sem chave, avisa e não tenta conectar. */
    verificarServidor() {
      return fetch('/health')
        .then((r) => r.json())
        .then((saude) => {
          this.semChave = saude.realtime === false;
          if (this.semChave) {
            this.aviso = avisoDaConexao('failed', null, true);
          } else {
            this.realtime.connection.connect();
          }
        })
        .catch(() => {
          this.aviso = avisoDaConexao('failed', null);
        });
    },
    reconectar() {
      this.aviso = null;
      this.verificarServidor();
    }
  },
  unmounted() {
    this.realtime.connection.off();
    this.realtime.connection.close();
  }
};
</script>

<style>
.app-quiz {
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
