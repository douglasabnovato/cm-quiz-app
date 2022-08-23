<template>
  <div>
    <div v-if="!isTypeChosen" class="host-home card">
      <div class="img-header">
        <a href="http://www.depa.eb.mil.br/" target="_blank">
          <img src="./assets/cm-1.png" class="card-img-top" alt="5º Desafio Global do Conhecimento" />
        </a>
      </div>
      <div class="card-body home-text">
        <h5 class="card-title">Bem vindo ao 5º Desafio Global do Conhecimento!!</h5>
        <p class="card-text">
          Vamos criar nosso quiz do 5º Desafio Mundial do Conhecimento.
          Teremos um host para acompanhar as questões e estatísticas das equipes participantes.
          Jogo acontece ao vivo com as pontuações e respostas das equipes.
        </p>
        <p class="card-text">
          Poderemos compartilhar sua tela com os participantes enquanto respondem às perguntas por meio de seus
          navegadores móveis para uma melhor experiência.
        </p>
        <template v-if="!isSmallWidth">
          <!--<button
            class="btn"
            id="btn-1"
            type="submit"
            @click="setQuizType('CustomQuiz')"
          >
            Create your own quiz
          </button>-->
          <button class="btn" type="submit" @click="setQuizType('RandomQuiz')">
            Configurar o Quiz Mundo CM
          </button>
        </template>
        <template v-if="isSmallWidth">
          <small class="mobile-msg">
            Parece que você está em um navegador móvel, mude para um
            desktop para hospedar este quiz.<br />
            No entanto, seu público pode participar em navegadores móveis.
          </small>
        </template>
      </div>
      <div class="card-footer text-muted footer-black">
        <!--<a
          href="https://github.com/Srushtika/realtime-quiz-framework"
          target="_blank"
          class="link"
          >Learn how to build your own realtime quiz app with Ably &rarr;</a
        >-->
      </div>
    </div>
    <template v-if="isTypeChosen">
      <CreateQuizRoom :realtime="realtime" :ablyClientId="ablyClientId" :quizType="quizType" :showHome="showHome">
      </CreateQuizRoom>
    </template>
  </div>
</template>

<script>

import CreateQuizRoom from './CreateQuizRoom.vue';

export default {
  props: ['realtime', 'ablyClientId'],
  data() {
    return {
      isTypeChosen: false,
      headerImgLink: './assets/cm-1.png',
      quizType: '',
      windowWidth: window.innerWidth
    };
  },
  components: {
    CreateQuizRoom
  },
  methods: {
    setQuizType(type) {
      this.isTypeChosen = true;
      this.quizType = type;
    },
    showHome() {
      this.isTypeChosen = false;
    }
  },
  computed: {
    isSmallWidth() {
      if (this.windowWidth > 480) {
        console.log(this.windowWidth);
        return false;
      }
      console.log(this.windowWidth);
      return true;
    }
  }
};
</script>

<style scoped>
.host-home {
  margin: 0px auto;
  text-align: center;
  width: 60%;
}

button {
  margin: 5px;
  width: 60%;
  font-size: 20px;
  background: rgba(103, 169, 133);
  background: linear-gradient(90deg,
      rgba(103, 169, 133, 1) 75%,
      rgba(1, 67, 57, 1) 100%);
  border: 1px solid #ffffff;
  color: #ffffff;
}

button:hover {
  background: rgba(179, 210, 194);
  color: rgba(1, 67, 57);
  border: 1px solid rgba(1, 67, 57);
}

.img-header {
  width: 100%;
  background-color: rgba(179, 210, 194);
  border-bottom: 1px gray solid;
}

.card-img-top {
  width: 70%;
}

.footer-black {
  background-color: rgba(179, 210, 194);
}

.link {
  color: #ffffff;
}

.mobile-msg {
  color: red;
}

@media only screen and (max-device-width: 480px) {
  .host-home {
    margin: 0px auto;
    text-align: center;
    width: 90%;
  }

  .home-text {
    font-size: 0.8rem;
  }

  button {
    width: 90%;
    font-size: 1rem;
  }
}
</style>
