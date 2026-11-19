<template>
  <div class="card text-white placar mb-3" :class="{'leaderboard-host': !isPlayer, 'leaderboard-player': isPlayer}">
    <div class="card-header"><h2 class="h3">{{ finalScreen == false ? 'As 5 maiores pontuações' : 'Placar final'}}</h2></div>
    <div class="card-body">
      <p class="card-text">
        <ol v-if="leaderboard" class="score-list">
            <li v-for="(item,index) in leaderboard.slice(0,leaderNum)" :key="index" class="score-item">
                <p>{{item.nickname}}</p>
                <p>{{item.score}}</p>

            </li>
        </ol>
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: "Leaderboard",
  props: ["leaderboard", "finalScreen", "isPlayer" ],
  data() {
    return {
      leaderNum: this.finalScreen ? this.leaderboard.length : 5,
    };
  },
  created(){
    console.log(this.isPlayer)
  }
};
</script>

<style scoped>
/* Verde escuro: texto branco com contraste acima de 4,5:1 (o bg-success do Bootstrap dava 3,1:1). */
.placar {
  background-color: #1b5e20;
}

.leaderboard-host {
  width: 90%;
  text-align: center;
  margin: 20px auto;
}

.leaderboard-player {
  width: 60%;
  text-align: center;
  margin: 20px auto;
}

.score-list {
  width: 50%;
  margin: 0px auto;
  padding: 10px;
}

.score-item {
  display: flex;
  justify-content: space-between;
}

@media only screen and (max-device-width: 480px) {
  .leaderboard-player {
  width: 90%;
  text-align: center;
  margin: 20px auto;
}
}
</style>
