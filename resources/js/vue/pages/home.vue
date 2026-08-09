<template>
  <section>
    <h1>Hey, I'm building things.</h1>
    <p class="lead">
      Laravel on the back, Vue on the front, served locally by ForgeKit.
    </p>

    <p>
      <RouterLink to="/projects">See the projects →</RouterLink>
    </p>
  </section>
</template>

<script>
export default { name: 'HomePage' };
</script>

<style scoped>
h1 {
  font-size: 40px;
  margin: 0 0 12px;
}

.lead {
  color: var(--text-muted);
  font-size: 18px;
}
</style>
