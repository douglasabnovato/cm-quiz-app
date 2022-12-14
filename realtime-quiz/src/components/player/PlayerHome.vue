<template>
  <div>
    <div v-if="!showQuestions" class="player-home card">
      <div class="img-header">
        <a href="http://www.depa.eb.mil.br/" target="_blank">
          <img src="./assets/cm-1.png" class="card-img-top" alt="5º Desafio Global do Conhecimento" />
        </a>
      </div>
      <div v-if="!isRoomClosed" class="card-body">
        <h5 class="card-title">Vamooo {{ myNickname }}!</h5>
        <template v-if="!didPlayerEnterRoom">
          <p class="card-text">Insira o nome da sua equipe para identificarmos</p>
          <div class="nickname-input">
            <input
              class="form-control host-nickname"
              id="host-nickname"
              placeholder="Insira o nome da sua equipe"
              v-model="myNickname"
              @keyup.enter="enterRoomWithNickname()"
            />
            <button
              type="button create-random-btn"
              class="btn"
              @click="enterRoomWithNickname()"
            >
              Entrar
            </button>
          </div>
        </template>
        <template v-else>
          <OnlinePlayers
            :timer="timer"
            :onlinePlayersArr="onlinePlayersArr"
            :didHostStartGame="didHostStartGame"
          ></OnlinePlayers>
          <div v-if="!didHostStartGame">
            <hr />
            <small class="text-muted"
              >Waiting for your host, <strong>{{ hostNickname }}</strong
              >, to start the quiz</small
            >
          </div>
        </template>
      </div>
      <div v-if="isRoomClosed" class="card-body">
        Sorry this quiz room is no longer available to enter, either because the
        host is no longer online or the quiz has already started.
      </div>
      <div class="card-footer text-muted div-black">
        <!--<a
          href="https://github.com/Srushtika/realtime-quiz-framework"
          class="link"
          target="_blank"
          >Learn how to build your own realtime quiz app with Ably &rarr;</a
        >-->
      </div>
    </div>
    <Question
      v-if="showQuestions && !showAnswer"
      :newQuestion="newQuestion"
      :newChoices="newChoices"
      :newQuestionNumber="newQuestionNumber"
      :isLastQuestion="isLastQuestion"
      :questionTimer="questionTimer"
      :correctAnswerIndex="correctAnswerIndex"
      :showImg="showImg"
      :questionImgLink="questionImgLink"
      :isAdminView="false"
      :myInputCh="myInputCh"
      @player-answer="playerAnswer($event)"
    ></Question>
    <Answer
      v-if="showAnswer"
      :correctAnswer="newChoices[correctAnswerIndex]"
      :didAnswerCorrectly="didAnswerCorrectly"
      :isAdminView="false"
    ></Answer>
    <Leaderboard
      v-if="showAnswer && !showFinalScreen"
      :leaderboard="leaderboard"
      :finalScreen="false"
      :isPlayer="true"
    ></Leaderboard>
    <div class="live-stats" v-if="!showAnswer && showQuestions">
      <LiveStats
        :numAnswered="numAnswered"
        :numPlaying="numPlaying"
      ></LiveStats>
    </div>
    <template v-if="didHostForceQuizEnd">
      <div class="alert alert-danger alert-quiz-ended" role="alert">
        This quiz has ended <br />Either the host has ended it or they have
        simply left. Please request the host to share a new link.
      </div>
    </template>
    <template v-if="showFinalScreen">
      <div class="quiz-end-player">
        This quiz has ended
      </div>
      <div>
        <Leaderboard
          :isPlayer="true"
          :leaderboard="leaderboard"
          :finalScreen="true"
        ></Leaderboard>
      </div>
    </template>
  </div>
</template>

<script>
import Question from '../common/Question.vue';
import Answer from '../common/Answer.vue';
import OnlinePlayers from '../common/OnlinePlayers.vue';
import LiveStats from '../common/LiveStats.vue';
import Leaderboard from '../common/Leaderboard.vue';

import axios from 'axios';
export default {
  name: 'WaitingArea',
  props: ['realtime'],
  components: {
    Question,
    Answer,
    OnlinePlayers,
    LiveStats,
    Leaderboard
  },
  data() {
    return {
      isRoomClosed: null,
      quizRoomCode: null,
      myQuizRoomCh: null,
      headerImgLink:
        'https://user-images.githubusercontent.com/5900152/108396467-c713bc00-720e-11eb-95d8-a5f9e571b153.png',
      myNickname: '',
      myAvatarColor: null,
      didPlayerEnterRoom: false,
      onlinePlayersArr: [],
      hostNickname: null,
      didHostStartGame: false,
      timer: null,
      showQuestions: false,
      newQuestion: null,
      newChoices: null,
      newQuestionNumber: null,
      isLastQuestion: null,
      questionTimer: 30,
      correctAnswerIndex: null,
      showAnswer: false,
      myClientId: null,
      didAnswerCorrectly: null,
      clickedPlayerQuestionIndex: null,
      clickedPlayerAnswerIndex: null,
      showImg: false,
      questionImgLink: null,
      didHostForceQuizEnd: false,
      numAnswered: 0,
      numPlaying: 0,
      leaderboard: null,
      showFinalScreen: false
    };
  },
  methods: {
    subscribeToQuizRoomChEvents() {
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
      this.myQuizRoomCh.subscribe('quiz-ending', () => {
        this.handleQuizEnding();
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
      let { clientId, nickname, avatarColor } = msg.data.newPlayerState;
      this.onlinePlayersArr.push({
        clientId,
        nickname,
        avatarColor
      });
    },
    handleNewQuestionReceived(msg) {
      this.showQuestions = true;
      this.showAnswer = false;
      this.newQuestionNumber = msg.data.questionNumber;
      this.newQuestion = msg.data.question;
      this.newChoices = msg.data.choices;
      this.isLastQuestion = msg.data.isLastQuestion;
      this.showImg = msg.data.showImg;
      this.questionImgLink = msg.data.imgLink;
      this.numAnswered = msg.data.numAnswered;
      this.numPlaying = msg.data.numPlaying;
    },
    handleCorrectAnswerReceived(msg) {
      if (this.newQuestionNumber == msg.data.questionNumber) {
        this.correctAnswerIndex = msg.data.correctAnswerIndex;
        if (
          this.newQuestionNumber - 1 == this.clickedPlayerQuestionIndex &&
          this.clickedPlayerAnswerIndex == this.correctAnswerIndex
        ) {
          this.didAnswerCorrectly = true;
        } else {
          this.didAnswerCorrectly = false;
        }
        this.showAnswer = true;
      }
      if (this.isLastQuestion) {
        this.showFinalScreen = true;
      }
    },
    handleQuizEnding() {
      this.didHostForceQuizEnd = true;
    },
    setUpMyChannel() {
      this.myClientId = this.realtime.auth.clientId;
      this.myInputCh = this.realtime.channels.get(
        `${this.quizRoomCode}:player-ch-${this.myClientId}`
      );
    },
    enterRoomWithNickname() {
      this.myQuizRoomCh.presence.enter({
        nickname: this.myNickname,
        avatarColor: this.myAvatarColor,
        isHost: false
      });
      this.didPlayerEnterRoom = true;
      this.getExistingPresenceSet();
      this.subscribeToQuizRoomChEvents();
      this.setUpMyChannel();
    },
    getExistingPresenceSet() {
      this.myQuizRoomCh.presence.get((err, players) => {
        if (!err) {
          for (let i = 0; i < players.length; i++) {
            let { nickname, avatarColor, isHost } = players[i].data;
            if (!isHost) {
              this.onlinePlayersArr.push({
                clientId: players[i].clientId,
                nickname: nickname,
                avatarColor: avatarColor,
                isHost: isHost
              });
            } else {
              this.hostNickname = nickname;
            }
          }
        } else {
          console.log(err);
        }
      });
    },
    playerAnswer(obj) {
      this.clickedPlayerQuestionIndex = obj.questionIndex;
      this.clickedPlayerAnswerIndex = obj.playerAnswerIndex;
    }
  },
  async created() {
    this.quizRoomCode = this.$route.query.quizCode;
    await axios
      .get('/checkRoomStatus?quizCode=' + this.quizRoomCode)
      .then(roomStatusInfo => {
        this.isRoomClosed = roomStatusInfo.data.isRoomClosed;
      });
    this.myQuizRoomCh = this.realtime.channels.get(
      `${this.quizRoomCode}:primary`
    );
    this.myAvatarColor =
      '#' +
      Math.random()
        .toString(16)
        .slice(-6);
  },
  beforeDestroy() {
    if (this.myQuizRoomCh) {
      this.myQuizRoomCh.presence.leave();
    }
    this.questionTimer = 30;
  }
};
</script>

<style scoped>
.alert-quiz-ended {
  width: 60%;
  margin: 20px auto;
  text-align: center;
}
.player-home {
  margin: 0px auto;
  text-align: center;
  width: 60%;
}
.nickname-input {
  display: flex;
  justify-content: space-evenly;
  width: 50%;
  text-align: center;
  margin: 0 auto;
}

.player-leaderboard {
  width: 40%;
}

button {
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

button:active {
  background: #ffffff;
  color: #e40000;
  border: 1px solid #e40000;
}

.img-header {
  width: 100%;
  background-color: rgba(179, 210, 194);
  border-bottom: 1px gray solid;
}

.card-img-top {
  width: 70%;
}

.div-black {
  background-color: rgba(179, 210, 194)-;
}

.link {
  color: #ffffff;
}

.live-stats {
  width: 50%;
  margin: 0px auto;
  text-align: center;
}

.quiz-end-player {
  color: #ffffff;
  margin: auto;
  text-align: center;
  font-size: 2rem;
}

@media only screen and (max-device-width: 480px) {
  .player-home {
    margin: 0px auto;
    text-align: center;
    width: 90%;
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
  .live-stats {
    width: 100%;
    margin: 20px auto;
    text-align: center;
  }
}
</style>
