<template>
  <section>
    <h1>Projects</h1>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error">Couldn't load projects.</p>
    <p v-else-if="!projects.length">No projects yet — add some to the database.</p>

    <ul v-else class="list">
      <li v-for="project in projects" :key="project.id" class="card">
        <h2>
          <a v-if="project.url" :href="project.url" target="_blank" rel="noopener">{{ project.title }}</a>
          <span v-else>{{ project.title }}</span>
        </h2>
        <p class="year">{{ project.year }}</p>
        <p>{{ project.description }}</p>
      </li>
    </ul>
  </section>
</template>

<script>
export default {
  name: 'ProjectsPage',
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
.list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 16px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
}

.card h2 {
  margin: 0;
  font-size: 20px;
}

.year {
  margin: 4px 0 8px;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
