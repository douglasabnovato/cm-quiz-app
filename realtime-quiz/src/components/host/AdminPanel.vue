<template>
  <section class="alert alert-secondary admin-panel" aria-labelledby="painel-do-host">
    <h2 id="painel-do-host" class="alert-heading h4">Painel do host</h2>
    <hr />
    <button
      type="button"
      class="btn btn-dark btn-next"
      @click="showNextQuestion()"
    >
      Próxima pergunta
    </button>
    <br />
    <button type="button" class="btn btn-link end-btn" @click="endQuizNow()">
      Encerrar o quiz e mostrar o placar
    </button>
  </section>
</template>

<script>
export default {
  name: 'AdminPanel',
  props: ['hostAdminCh', 'prevQuestionNumber'],
  emits: ['end-quiz-now'],
  methods: {
    showNextQuestion() {
      this.hostAdminCh.publish('next-question', {
        prevQIndex: this.prevQuestionNumber - 1
      });
    },
    endQuizNow() {
      this.hostAdminCh.publish('end-quiz-now', {
        end: true
      });
      this.$emit('end-quiz-now');
    }
  }
};
</script>

<style scoped>
.admin-panel {
  width: 90%;
  margin: 20px auto;
  text-align: center;
}

.btn-next {
  margin-bottom: 20px;
}

/* Cor escura sobre o cinza do painel: o azul padrão do btn-link não chegava a 4,5:1. */
.end-btn {
  color: #014339;
  text-decoration: underline;
  font-size: 12px;
  margin: 0px;
}
</style>
