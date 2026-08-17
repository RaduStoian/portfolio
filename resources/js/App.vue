<template>
  <!-- Game scenes only: the plain site has no audio, so the control would be
       a dead knob (and its pixel-art styling clashes with the site chrome). -->
  <SoundControl v-if="isFullscreen" />
  <RouterView v-if="isFullscreen" />

  <div v-else class="site">
    <Nav v-if="!isFullscreen" />

    <main class="site-main">
      <RouterView />
    </main>

    <Footer v-if="!isFullscreen" />
  </div>
</template>

<script>
import Nav from './vue/nav.vue';
import Footer from './vue/footer.vue';
import SoundControl from './game/SoundControl.vue';

export default {
  name: 'Portfolio',
  components: { Nav, Footer, SoundControl },
  computed: {
    isFullscreen() {
      return !!this.$route.meta.fullscreen;
    },
    theme() {
      return this.$store.state.theme;
    },
  },
  mounted() {
    // Arms the scroll-reveal styles only once JS is confirmed running. See
    // the .reveal-armed rules below for why this isn't done in CSS alone.
    document.documentElement.classList.add('reveal-armed');
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
   [data-theme] block is that whole theme in one place.

   The palette is deliberately near-neutral: pure white / pure black grounds,
   one warm-grey step for alternating bands, and a single blue reserved for
   links and actions. Colour in this design belongs to the project tiles,
   each of which carries its own accent, so the shell around them stays out
   of the way. */
html[data-theme="dark"] {
  --bg: #000000;
  --bg-alt: #0a0a0a;
  --panel: #151516;
  --panel-2: #1d1d1f;
  --border: rgba(255, 255, 255, 0.10);
  --text: #f5f5f7;
  --text-muted: #86868b;
  --accent: #2997ff;
  --nav-bg: rgba(10, 10, 10, 0.72);
  /* Surfaces that sit *on top of* a project tile. Kept as overlays rather
     than fixed hex so they read correctly over each tile's own tint. */
  --surface: rgba(255, 255, 255, 0.07);
  --hairline: rgba(255, 255, 255, 0.10);
  --hairline-strong: rgba(255, 255, 255, 0.20);
  --tint-wash: 22%;
  --c0: #1b1f24;
  --c1: #0e4429;
  --c2: #006d32;
  --c3: #26a641;
  --c4: #39d353;
}

html[data-theme="light"] {
  --bg: #ffffff;
  --bg-alt: #f7f7f8;
  --panel: #f4f4f6;
  --panel-2: #ebebed;
  --border: rgba(0, 0, 0, 0.08);
  --text: #1d1d1f;
  --text-muted: #6e6e73;
  --accent: #0071e3;
  --nav-bg: rgba(255, 255, 255, 0.72);
  --surface: rgba(255, 255, 255, 0.9);
  --hairline: rgba(0, 0, 0, 0.07);
  --hairline-strong: rgba(0, 0, 0, 0.14);
  /* Contribution-graph ramp, matching GitHub's own scale so the widget reads
     as the thing it's referencing. */
  --c0: #ebedf0;
  --c1: #9be9a8;
  --c2: #40c463;
  --c3: #30a14e;
  --c4: #216e39;
  /* How strongly a project tile's own colour washes over its background.
     Kept light so the tiles read as pale tinted paper rather than as
     saturated blocks. */
  --tint-wash: 13%;
}

body {
  margin: 0;
  /* On Apple hardware this resolves to SF Pro itself; elsewhere it lands on
     the platform's closest neutral grotesque. No webfont, so no flash. */
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s ease, color 0.3s ease;
}

a {
  color: var(--accent);
}

/* Display type: very large, tight tracking, semibold. The single strongest
   signal of this whole design language. */
.display {
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.05;
  text-wrap: balance;
  margin: 0;
}

/* Scroll-reveal for below-the-fold sections.

   The hidden state is deliberately gated behind `.reveal-armed`, which JS adds
   to <html> on mount. Hiding by default in plain CSS means any failure in the
   observer path (a JS error, an unsupported API, content that mounts after
   the observer ran) leaves the content permanently invisible. Armed this way,
   the worst case is simply that the animation doesn't play.

   Only used below the fold, so arming after first paint never flashes. */
.reveal-armed .reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--d, 0s);
}

.reveal-armed .reveal.in {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal-armed .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-main {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}
</style>
