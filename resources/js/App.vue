<template>
  <div class="site">
    <Nav v-if="!isFullscreen" />

    <main :class="isFullscreen ? 'site-scene' : 'site-main'">
      <RouterView />
    </main>

    <Footer v-if="!isFullscreen" />
  </div>
</template>

<script>
import Nav from './vue/nav.vue';
import Footer from './vue/footer.vue';

export default {
  name: 'Portfolio',
  components: { Nav, Footer },
  computed: {
    isFullscreen() {
      return !!this.$route.meta.fullscreen;
    },
    theme() {
      return this.$store.state.theme;
    },
  },
  watch: {
    theme: {
      immediate: true,
      handler(theme) {
        document.documentElement.setAttribute('data-theme', theme);
      },
    },
  },
};
</script>

<style>
/* ===== Site-wide theme tokens =====
   Every component reads colors from these instead of hardcoding hex, so each
   [data-theme] block is that whole theme in one place. */
html[data-theme="dark"] {
  --bg: #0b1020;
  --bg-alt: #121a30;
  --panel: #131c33;
  --border: rgba(255, 255, 255, 0.10);
  --text: #f2f4f8;
  --text-muted: rgba(242, 244, 248, 0.65);
  --accent: #7aa2ff;
}

html[data-theme="light"] {
  --bg: #f5f7fb;
  --bg-alt: #e9edf6;
  --panel: #ffffff;
  --border: rgba(15, 23, 42, 0.12);
  --text: #12172a;
  --text-muted: rgba(18, 23, 42, 0.65);
  --accent: #3457d5;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  transition: background 0.15s ease, color 0.15s ease;
}

a {
  color: var(--accent);
}

.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Game scenes position themselves fixed and own the viewport, so the wrapper
   must not add layout of its own. */
.site-scene {
  flex: 1;
}

.site-main {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 24px;
  box-sizing: border-box;
}
</style>
