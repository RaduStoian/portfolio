<template>
  <section class="page">
    <header class="head">
      <h1 class="display">Projects</h1>
      <p>Some of what I've worked on.</p>
    </header>

    <p v-if="loading" class="state">Loading…</p>
    <p v-else-if="error" class="state">Couldn't load projects right now.</p>
    <p v-else-if="!projects.length" class="state">No projects yet.</p>

    <div v-else class="grid">
      <ProjectTile
        v-for="(project, i) in projects"
        :key="project.id"
        :project="project"
        :style="{ '--i': i }"
      />
    </div>
  </section>
</template>

<script>
import ProjectTile from '../project-tile.vue';

export default {
  name: 'ProjectsPage',
  components: { ProjectTile },
  data() {
    return { projects: [], loading: true, error: false };
  },
  async mounted() {
    try {
      const { data } = await window.axios.get('/api/projects');
      this.projects = data;
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  },
};
</script>

<style scoped>
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 100px 22px 120px;
}

.head {
  text-align: center;
  margin-bottom: 64px;
}

h1 {
  font-size: clamp(40px, 7vw, 76px);
}

.head p {
  margin: 20px 0 0;
  font-size: 18px;
  color: var(--text-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.state {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 0;
}

@media (max-width: 860px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
