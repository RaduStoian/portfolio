<template>
  <header class="nav">
    <div class="inner">
      <RouterLink to="/" class="brand">Radu Stoian</RouterLink>

      <nav class="links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/projects">Projects</RouterLink>
        <RouterLink to="/contact">Contact</RouterLink>
      </nav>

      <button
        class="theme"
        type="button"
        :aria-label="`Switch to ${$store.state.theme === 'dark' ? 'light' : 'dark'} theme`"
        @click="$store.dispatch('toggleTheme')"
      >
        {{ $store.state.theme === 'dark' ? '☀' : '☾' }}
      </button>
    </div>
  </header>
</template>

<script>
export default { name: 'SiteNav' };
</script>

<style scoped>
/* Thin, frosted, and pinned, so it reads as a system chrome bar rather than
   a section of the page. */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--nav-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--border);
}

.inner {
  max-width: 1120px;
  margin: 0 auto;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 24px;
}

.brand {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: var(--text);
}

.links {
  display: flex;
  gap: 26px;
  margin-left: auto;
}

.links a {
  font-size: 12.5px;
  text-decoration: none;
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.links a:hover,
.links a.router-link-active {
  color: var(--text);
}

.theme {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  padding: 6px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.theme:hover {
  color: var(--text);
}

@media (max-width: 520px) {
  .links { gap: 18px; }
}
</style>
