<template>
  <div class="card text-white bg-dark mb-3 livestats-div">
    <div class="card-header">Ao vivo</div>
    <div class="card-body">
      <h5 class="card-title">
        {{ numAnswered }} de {{ numPlaying }} equipes já responderam
      </h5>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LiveStats',
  props: ['numAnswered', 'numPlaying']
};
</script>

<style scoped>
.livestats-div {
  width: 90%;
  margin: 20px auto;
  text-align: center;
}
</style>
