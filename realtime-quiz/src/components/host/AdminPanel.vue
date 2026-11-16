<template>
  <div class="alert alert-secondary admin-panel" role="alert">
    <h4 class="alert-heading">Painel do host</h4>
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
  </div>
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

.end-btn {
  font-size: 12px;
  margin: 0px;
}
</style>
