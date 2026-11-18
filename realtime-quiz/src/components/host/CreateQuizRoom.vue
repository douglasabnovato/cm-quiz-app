<template>
  <div>
    <div v-if="!showQuestions" class="host-home card">
      <div class="img-header">
        <a href="http://www.depa.eb.mil.br/" target="_blank">
          <img src="./assets/cm-3.png" class="card-img-top" alt="5º Desafio Global do Conhecimento" />
        </a>
      </div>
      <div v-if="!isRoomReady" class="card-body">
        <h1 class="card-title h2">
          {{ quizType === 'CustomQuiz' ? 'Seu próprio quiz' : 'Preparem-se! O Quiz está quase começando.' }}
        </h1>
        <template v-if="quizType == 'CustomQuiz'"
          ><div>
            <p class="card-text">
              Você pode escrever as perguntas numa planilha do Google e
              conduzir o quiz ao vivo. Faça uma cópia do modelo e preencha.
            </p>
            <div class="sheets-template">
              <a
                class="orange-txt"
                :href="templateCopyURL"
                target="_blank"
              >
                Copiar o modelo de planilha</a
              >
              <p class="card-text template-instructions">
                Com as perguntas prontas, faça duas coisas: <br />
                1. Copie o endereço da planilha na barra do navegador e cole
                no campo abaixo
                <input
                  class="form-control input-box"
                  aria-label="Endereço da planilha"
                  placeholder="Endereço da planilha"
                  v-model="sheetURL"
                  :disabled="criando"
                />
                2. Publique a planilha em Arquivo > Compartilhar > Publicar na
                Web > Publicar. O endereço que aparece ali não é necessário.
              </p>
            </div>
          </div>
        </template>

        <label for="nome-do-host" class="rotulo-nome">Nome do host</label>
        <p id="ajuda-nome-do-host" class="card-text">
          Esse nome é para as equipes do seu Quiz identificarem você.
        </p>
        <input
          id="nome-do-host"
          ref="campoNome"
          class="form-control input-box"
          aria-describedby="ajuda-nome-do-host"
          :aria-invalid="erroNome ? 'true' : null"
          v-model="hostNickname"
          :disabled="criando"
          @keyup.enter="createQuizRoom()"
        />
        <p v-if="erroNome" class="erro-form" role="alert">{{ erroNome }}</p>

        <button
          type="button"
          class="btn"
          @click="createQuizRoom()"
          :disabled="estadoBotao.desabilitado"
          :aria-describedby="estadoBotao.explicacao ? 'explicacao-criar' : null"
        >
          {{ estadoBotao.texto }}
        </button>
        <p v-if="estadoBotao.explicacao" id="explicacao-criar" class="card-text explicacao-criar">
          {{ estadoBotao.explicacao }}
        </p>
        <div v-if="falhaAoCriar" class="alert alert-danger" role="alert">
          {{ falhaAoCriar }}
        </div>
        <div
          class="alert alert-danger sheet-error"
          role="alert"
          v-if="sheetURLErr"
        >
          Há um problema com o endereço da planilha. Confira as instruções
          acima e tente de novo.
        </div>
      </div>
      <div v-else class="card-body">
        <h1 class="card-title h2">Sua sala está pronta</h1>
        <p class="card-text">
          Convide as equipes compartilhando este link
        </p>
        <button type="button" class="btn" @click="copyPlayerInviteLink()">
          {{ copyBtnText }}
          <i v-if="!copyClicked" class="far fa-copy" aria-hidden="true"></i>
        </button>
        <hr />
        <OnlinePlayers
          :timer="timer"
          :onlinePlayersArr="onlinePlayersArr"
          :didHostStartGame="didHostStartGame"
        ></OnlinePlayers>
        <template v-if="onlinePlayersArr.length > 0">
          <div v-if="!didHostStartGame">
            <hr />
            <button type="button" class="btn" @click="startQuiz()">
              Começar o quiz
            </button>
          </div>
        </template>
      </div>
      <div class="card-footer text-muted div-black">
        <button type="button" class="btn btn-link back-btn" @click="showHome()">
          &larr; Voltar
        </button>
      </div>
    </div>
    <div v-if="showQuestions && !showFinalScreen" class="d-flex bd-highlight">
      <div class="question-flex bd-highlight">
        <Question
          :newQuestion="newQuestion"
          :newChoices="newChoices"
          :newQuestionNumber="newQuestionNumber"
          :isLastQuestion="isLastQuestion"
          :questionTimer="questionTimer"
          :correctAnswerIndex="correctAnswerIndex"
          :showImg="showImg"
          :questionImgLink="questionImgLink"
          :isAdminView="true"
          :correctAnswer="newChoices[correctAnswerIndex]"
          :showAnswer="showAnswer"
        ></Question>
      </div>
      <div class="stats-flex bd-highlight">
        <LiveStats
          :numAnswered="numAnswered"
          :numPlaying="numPlaying"
          v-if="!showAnswer"
        ></LiveStats>
        <div v-if="showAnswer">
          <Leaderboard
            :leaderboard="leaderboard"
            :isPlayer="false"
            :finalScreen="false"
          ></Leaderboard>
          <AdminPanel
            :hostAdminCh="hostAdminCh"
            :prevQuestionNumber="newQuestionNumber"
            @end-quiz-now="endQuizNow()"
          ></AdminPanel>
        </div>
      </div>
    </div>
    <div v-if="showFinalScreen" class="quizEnded">
      <div class="end-msg">
        <p class="h6">O quiz terminou</p>
        <h1 class="display-4">Parabéns às equipes vencedoras 🎉🎉🎉</h1>
      </div>
      <Leaderboard
        :leaderboard="leaderboard"
        :isPlayer="false"
        :finalScreen="true"
      ></Leaderboard>
    </div>
  </div>
</template>

<script>
import Question from '../common/Question.vue';
import OnlinePlayers from '../common/OnlinePlayers.vue';
import AdminPanel from './AdminPanel.vue';
import LiveStats from '../common/LiveStats.vue';
import Leaderboard from '../common/Leaderboard.vue';
import GSheetReader from 'g-sheets-api';
import { markRaw } from 'vue';
import {
  PRAZO_DA_SALA_MS,
  TEXTO_SALA_NAO_FICOU_PRONTA,
  TEXTO_SEM_NOME,
  estadoDoBotaoCriar,
  nomeValido
} from '../../sala.js';

export default {
  name: 'QuizType',
  props: ['realtime', 'quizType', 'showHome', 'tempoRealDesligado'],
  components: {
    Question,
    AdminPanel,
    LiveStats,
    Leaderboard,
    OnlinePlayers
  },
  data() {
    return {
      globalQuizChName: 'main-quiz-thread',
      globalQuizCh: null,
      myQuizRoomCode: this.getRandomRoomId(),
      myQuizRoomCh: null,
      hostAdminCh: 'a',
      hostNickname: null,
      criando: false,
      erroNome: null,
      falhaAoCriar: null,
      prazo: null,
      isRoomReady: false,
      playerLinkBase: window.location.href + 'play',
      playerLink: null,
      copyBtnText: 'Copiar o link de convite',
      copyClicked: false,
      onlinePlayersArr: [],
      didHostStartGame: false,
      timer: null,
      showQuestions: false,
      newQuestionNumber: null,
      newQuestion: null,
      newChoices: [],
      isLastQuestion: null,
      questionTimer: 30,
      correctAnswerIndex: null,
      showAnswer: false,
      numAnswered: 0,
      numPlaying: 0,
      leaderboard: null,
      templateCopyURL:
        'https://docs.google.com/spreadsheets/d/12_Cnv86fI4JOnJq5t9BQmxiPTNZgMsd0PP7Sbjm7WkQ/copy?usp=sharing',
      sheetURL: '',
      sheetURLErr: false,
      customQuizQuestions: null,
      showImg: false,
      questionImgLink: null,
      showFinalScreen: false
    };
  },
  computed: {
    estadoBotao() {
      return estadoDoBotaoCriar({ tempoRealDesligado: this.tempoRealDesligado, criando: this.criando });
    }
  },
  methods: {
    createQuizRoom() {
      if (this.estadoBotao.desabilitado) {
        return;
      }
      if (!nomeValido(this.hostNickname)) {
        this.erroNome = TEXTO_SEM_NOME;
        this.$nextTick(() => this.$refs.campoNome && this.$refs.campoNome.focus());
        return;
      }
      this.erroNome = null;
      this.falhaAoCriar = null;
      this.sheetURLErr = false;
      this.criando = true;
      if (this.quizType !== 'RandomQuiz') {
        const achado = new RegExp('/spreadsheets/d/([a-zA-Z0-9-_]+)').exec(this.sheetURL || '');
        if (!achado) {
          this.sheetURLErr = true;
          this.criando = false;
          return;
        }
        const options = {
          sheetId: achado[1],
          sheetNumber: 1,
          returnAllResults: true
        };
        GSheetReader(
          options,
          results => {
            this.customQuizQuestions = results;
          },
          error => {
            this.sheetURLErr = true;
            console.log(error);
          }
        );
      }
      this.waitForGameRoom();
      this.enterMainThread();
      this.iniciarPrazo();
    },
    /* Se o servidor não avisar que a sala está pronta no prazo, explica e libera o botão. */
    iniciarPrazo() {
      clearTimeout(this.prazo);
      this.prazo = setTimeout(() => this.salaNaoFicouPronta(), PRAZO_DA_SALA_MS);
    },
    salaNaoFicouPronta() {
      if (this.isRoomReady) {
        return;
      }
      this.criando = false;
      this.falhaAoCriar = TEXTO_SALA_NAO_FICOU_PRONTA;
      if (this.myQuizRoomCh) {
        this.myQuizRoomCh.unsubscribe();
      }
      if (this.globalQuizCh) {
        this.globalQuizCh.presence.leave();
      }
      /* A nova tentativa usa outro código, para não misturar com uma sala que nasça atrasada. */
      this.myQuizRoomCode = this.getRandomRoomId();
    },
    waitForGameRoom() {
      this.myQuizRoomCh = markRaw(this.realtime.channels.get(
        `${this.myQuizRoomCode}:primary`
      ));
      this.hostAdminCh = markRaw(this.realtime.channels.get(
        `${this.myQuizRoomCode}:host`
      ));
      this.myQuizRoomCh.subscribe('thread-ready', () => {
        this.handleQuizRoomReady();
      });
    },
    handleQuizRoomReady() {
      clearTimeout(this.prazo);
      this.criando = false;
      this.isRoomReady = true;
      this.globalQuizCh.detach();
      this.enterGameRoomAndSubscribeToEvents();
      this.playerLink = `${this.playerLinkBase}?quizCode=${this.myQuizRoomCode}`;
      if (this.quizType == 'CustomQuiz') {
        let questions = this.customQuizQuestions;
        this.hostAdminCh.publish('quiz-questions', {
          questions
        });
      }
    },
    enterGameRoomAndSubscribeToEvents() {
      this.myQuizRoomCh.presence.enter({
        nickname: this.hostNickname,
        avatarColor: this.myAvatarColor,
        isHost: true,
        quizType: this.quizType
      });
      this.subscribeToRoomChEvents();
    },
    enterMainThread() {
      this.globalQuizCh = markRaw(this.realtime.channels.get(this.globalQuizChName));
      this.globalQuizCh.presence.enter({
        nickname: this.hostNickname,
        roomCode: this.myQuizRoomCode
      });
    },
    getRandomRoomId() {
      return (
        'room-' +
        Math.random()
          .toString(36)
          .substr(2, 8)
      );
    },
    subscribeToRoomChEvents() {
      this.myQuizRoomCh.subscribe('new-player', msg => {
        this.handleNewPlayerEntered(msg);
      });
      this.myQuizRoomCh.subscribe('start-quiz-timer', msg => {
        this.didHostStartGame = true;
        this.timer = msg.data.countDownSec;
      });
      this.myQuizRoomCh.subscribe('new-question', msg => {
        this.handleNewQuestionReceived(msg);
      });
      this.myQuizRoomCh.subscribe('question-timer', msg => {
        this.questionTimer = msg.data.countDownSec;
        if (this.questionTimer < 0) {
          this.questionTimer = 30;
        }
      });
      this.myQuizRoomCh.subscribe('correct-answer', msg => {
        this.handleCorrectAnswerReceived(msg);
      });
      this.myQuizRoomCh.subscribe('live-stats-update', msg => {
        this.numAnswered = msg.data.numAnswered;
        this.numPlaying = msg.data.numPlaying;
      });
      this.myQuizRoomCh.subscribe('full-leaderboard', msg => {
        this.leaderboard = msg.data.leaderboard;
      });
    },
    handleNewPlayerEntered(msg) {
      let { clientId, nickname, avatarColor, isHost } = msg.data.newPlayerState;
      if (!isHost) {
        this.onlinePlayersArr.push({
          clientId,
          nickname,
          avatarColor,
          isHost
        });
      } else {
        return;
      }
    },
    handleNewQuestionReceived(msg) {
      this.showAnswer = false;
      this.showQuestions = true;
      this.newQuestionNumber = msg.data.questionNumber;
      this.newQuestion = msg.data.question;
      this.newChoices = msg.data.choices;
      this.isLastQuestion = msg.data.isLastQuestion;
      this.numAnswered = msg.data.numAnswered;
      this.numPlaying = msg.data.numPlaying;
      this.showImg = msg.data.showImg;
      this.questionImgLink = msg.data.imgLink;
    },
    handleCorrectAnswerReceived(msg) {
      this.showAnswer = true;
      if (this.newQuestionNumber == msg.data.questionNumber) {
        this.correctAnswerIndex = msg.data.correctAnswerIndex;
      }
      if (this.isLastQuestion) {
        this.showFinalScreen = true;
      }
    },
    copyPlayerInviteLink() {
      this.copyClicked = true;
      this.copyBtnText = 'Link copiado!';
      setTimeout(() => {
        this.copyClicked = false;
        this.copyBtnText = 'Copiar o link de convite';
      }, 2000);
      navigator.clipboard.writeText(this.playerLink);
    },
    startQuiz() {
      this.hostAdminCh.publish('start-quiz', {
        start: true
      });
    },
    endQuizNow() {
      this.showFinalScreen = true;
    }
  },
  beforeUnmount() {
    clearTimeout(this.prazo);
    if (this.myQuizRoomCh) {
      this.myQuizRoomCh.presence.leave();
    }
    this.questionTimer = 30;
  }
};
</script>

<style scoped>
.host-home {
  margin: 0px auto;
  text-align: center;
  width: 60%;
}
.input-box {
  width: 40%;
  margin: 20px auto;
  text-align: center;
}
.sheets-template {
  text-align: center;
  background-color: #f1f5f6;
  margin: 15px auto;
  padding: 25px;
  width: 100%;
}
.template-instructions {
  margin: 20px auto;
}
.sheet-error {
  margin: 20px;
}
.rotulo-nome {
  display: block;
  margin: 16px auto 4px;
  font-weight: bold;
}
.erro-form {
  color: #b00020;
  font-weight: bold;
}
.explicacao-criar {
  margin-top: 8px;
}
.question-flex {
  width: 65%;
}
.stats-flex {
  width: 50%;
}
.quizEnded {
  width: 80%;
  margin: 20px auto;
  font-size: 20px;
}
/* Texto escuro sobre o verde do fundo: o branco dava menos de 3:1. */
.end-msg {
  color: #1a1a1a;
  text-align: center;
  margin: 10px auto;
}

button {
  margin: 5px;
  width: 60%;
  font-size: 20px;
  background: rgba(43, 107, 79);
  background: linear-gradient(90deg,
      rgba(43, 107, 79, 1) 75%,
      rgba(1, 67, 57, 1) 100%);
  border: 1px solid #ffffff;
  color: #ffffff;
}

button:hover {
  background: rgba(179, 210, 194);
  color: rgba(1, 67, 57);
  border: 1px solid rgba(1, 67, 57);
} 

.back-btn {
  background: none;
  border: none;
  color: #014339;
  padding: 0px;
  margin: 0px;
}

.div-black {
  background-color: rgba(179, 210, 194);
}

.card-img-top {
  width: 70%;
}

.img-header {
  width: 100%;
  background-color: rgba(179, 210, 194);
  border-bottom: 1px gray solid;
}

.back-btn:hover {
  border: none;
  background: none;
  color: #03020d;
}

.orange-txt {
  color: #ff5416;
}

@media only screen and (max-device-width: 480px) {
  .host-home {
    margin: 0px auto;
    text-align: center;
    width: 90%;
    font-size: 0.9rem;
  }
  .nickname-input {
    display: flex;
    justify-content: space-evenly;
    width: 70%;
    text-align: center;
    margin: 0 auto;
  }
  .alert-quiz-ended {
    width: 90%;
    margin: 20px auto;
    text-align: center;
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
