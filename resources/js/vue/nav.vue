<template>
  <header class="nav">
    <RouterLink to="/" class="brand">Portfolio</RouterLink>

    <nav class="links">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/projects">Projects</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/contact">Contact</RouterLink>
    </nav>

    <button class="theme" type="button" @click="$store.dispatch('toggleTheme')">
      {{ $store.state.theme === 'dark' ? '☀' : '☾' }}
    </button>
  </header>
</template>

<script>
export default { name: 'SiteNav' };
</script>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-alt);
}

.brand {
  font-weight: 700;
  text-decoration: none;
  color: var(--text);
}

.links {
  display: flex;
  gap: 16px;
  margin-left: auto;
}

.links a {
  text-decoration: none;
  color: var(--text-muted);
}

.links a.router-link-active {
  color: var(--text);
}

.theme {
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  border-radius: 999px;
  width: 32px;
  height: 32px;
  cursor: pointer;
}
</style>
