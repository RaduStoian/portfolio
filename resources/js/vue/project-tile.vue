<template>
  <component
    :is="project.url ? 'a' : 'div'"
    :href="project.url || null"
    :target="project.url ? '_blank' : null"
    :rel="project.url ? 'noopener' : null"
    class="tile"
    :class="{ 'is-link': !!project.url, 'is-featured': featured }"
    :style="{ '--tint': meta.tint, '--i': index }"
  >
    <div class="copy">
      <p v-if="featured" class="eyebrow">Latest{{ host ? ` · ${host}` : '' }}</p>
      <h3 class="display">{{ project.title }}</h3>
      <p class="blurb">{{ blurb }}</p>

      <div v-if="meta.stack" class="chips">
        <span v-for="tech in meta.stack" :key="tech">{{ tech }}</span>
      </div>

      <span v-if="project.url" class="cue">{{ host }}<i>&rarr;</i></span>
      <span v-else class="cue dim">In development</span>
    </div>

    <div class="media">
      <!-- Real media when there is some, the hand-built CSS visual when there
           isn't. The two unfinished projects have nothing to screenshot, so
           the fallback isn't a stopgap here, it's the permanent look. -->
      <img v-if="meta.image" :src="meta.image" :alt="`${project.title} interface`" loading="lazy" />

      <!-- Vimeo, muted and chromeless via background=1. pointer-events are
           disabled so the iframe can't swallow clicks meant for the tile. -->
      <iframe
        v-else-if="meta.video"
        :src="meta.video"
        title=""
        aria-hidden="true"
        tabindex="-1"
        frameborder="0"
        allow="autoplay; picture-in-picture"
      ></iframe>

      <ProjectVisual v-else :variant="meta.variant" />
    </div>
  </component>
</template>

<script>
import ProjectVisual from './project-visual.vue';

// Keyed by lowercased title, the same join key the pixel shop scene uses, so a
// project only ever needs naming once. Anything unlisted falls through to a
// neutral visual rather than breaking the grid.
//
// `blurb` overrides the database description on the tiles only: the grid is
// skimmed, so it wants one short line, while /projects and the API keep the
// fuller sentence.
const LOOKUP = {
  forgekit: {
    variant: 'forgekit',
    tint: '#e8890b',
    image: '/images/projects/UI-recent-with-background.png',
    blurb: 'A local PHP dev environment for Windows, done properly.',
    stack: ['PHP', 'Apache\Nginx', 'MySQL', 'Go', 'Tauri'],
  },
  mindstare: {
    variant: 'mindstare',
    tint: '#7d5ce0',
    // background=1 gives a muted, chromeless, looping player. The h= hash is
    // the unlisted-video token and has to stay.
    video: 'https://player.vimeo.com/video/828098789?h=221d445b01&background=1&autoplay=1&loop=1&autopause=0&muted=1',
    blurb: 'Visual meditation, built around moods.',
    stack: ['Laravel', 'Vue.js', 'AWS'],
  },
  vhoice: {
    variant: 'vhoice',
    tint: '#00a79f',
    blurb: 'Rate and review politicians, publicly.',
    stack: ['Laravel', 'MySQL', 'Vue.js'],
  },
  movieswiper: {
    variant: 'movieswiper',
    tint: '#e5194a',
    blurb: 'Swipe with friends, match on a film.',
    stack: ['Vue.js', 'Laravel', 'TMDB API'],
  },
  'physics museum': {
    variant: 'physics',
    tint: '#2196c9',
    blurb: 'Game physics, explained interactively.',
    stack: ['WebGL', 'JavaScript', 'Havok', 'DMM'],
  },
};

const DEFAULT_META = { variant: 'default', tint: '#8e8e93' };

export default {
  name: 'ProjectTile',
  components: { ProjectVisual },
  props: {
    project: { type: Object, required: true },
    featured: { type: Boolean, default: false },
    index: { type: Number, default: 0 },
  },
  computed: {
    meta() {
      return LOOKUP[this.project.title?.toLowerCase()] ?? DEFAULT_META;
    },
    blurb() {
      return this.meta.blurb ?? this.project.description;
    },
    host() {
      try {
        return new URL(this.project.url).host.replace(/^www\./, '');
      } catch {
        return '';
      }
    },
  },
};
</script>

<style scoped>
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-decoration: none;
  color: var(--text);
  background:
    radial-gradient(120% 90% at 50% -20%, color-mix(in srgb, var(--tint) var(--tint-wash), transparent), transparent 62%),
    var(--panel);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  /* Entrance is a plain CSS animation rather than the scroll-reveal observer.
     These tiles are the first thing on the page, and `backwards` fill means
     they're never left invisible waiting on JS that may not come. */
  animation: tileIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(var(--i, 0) * 0.07s);
}

@keyframes tileIn {
  from { opacity: 0; transform: translateY(26px); }
}

.tile.is-link:hover {
  transform: translateY(-6px);
  box-shadow: 0 22px 50px -28px color-mix(in srgb, var(--tint) 55%, transparent);
}

/* ---------- square (supporting) tiles ----------
   `aspect-ratio` alone would force the height to follow the width, so at
   narrower widths the copy (which grows as the blurb rewraps) squeezed the
   media below its content height and `overflow: hidden` clipped the bottom off
   the visual. `min-height: fit-content` makes the square a preference rather
   than a rule: the tile stays square while there's room and grows taller
   instead of cropping when there isn't. */
.tile:not(.is-featured) {
  aspect-ratio: 1 / 1;
  min-height: fit-content;
  padding: 40px 34px 0;
}

.tile:not(.is-featured) .copy {
  text-align: center;
}

.tile:not(.is-featured) .blurb {
  max-width: 30ch;
  margin-inline: auto;
}

.tile:not(.is-featured) .chips {
  justify-content: center;
}

/* Media bleeds to the tile's side and bottom edges, cancelling the padding, so
   a screenshot reads as a screen rather than a framed picture. */
.tile:not(.is-featured) .media {
  margin: 22px -34px 0;
}

/* ---------- featured tile ----------
   No padding on the tile itself: the copy column carries its own, which leaves
   the media column free to run right into the top, right and bottom edges. The
   screenshot brings its own desktop background, so bleeding it off the card
   reads as a window sitting on a desk rather than a pasted-in picture. */
.tile.is-featured {
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  padding: 0;
  min-height: 360px;
}

.tile.is-featured .copy {
  flex: 1 1 40%;
  min-width: 250px;
  /* Vertically centred against a full-height media column. */
  align-self: center;
  padding: 52px 38px 52px 48px;
}

.tile.is-featured .media {
  flex: 1 1 60%;
  min-height: 240px;
}

.eyebrow {
  margin: 0 0 14px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--tint) 70%, var(--text));
}

h3 {
  font-size: clamp(24px, 3vw, 34px);
}

.tile.is-featured h3 {
  font-size: clamp(30px, 4vw, 44px);
}

.blurb {
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-muted);
}

.tile.is-featured .blurb {
  font-size: 17px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
}

.chips span {
  padding: 4px 9px;
  font-size: 11.5px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--hairline);
}

.cue {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  font-size: 14.5px;
  color: var(--accent);
}

.cue.dim {
  color: var(--text-muted);
}

.cue i {
  font-style: normal;
  transition: transform 0.3s ease;
}

.tile.is-link:hover .cue i {
  transform: translateX(4px);
}

/* ---------- media slot ---------- */
.media {
  position: relative;
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 170px;
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Horizontally centred so the app window keeps even margins of its own
     wallpaper, anchored to the top so the title bar and status row survive the
     vertical crop. */
  object-position: center top;
}

/* Cover-fit a 16:9 player into whatever shape the slot is: full height with a
   derived width handles tall slots, min-width handles wide ones. */
.media iframe {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: 100%;
  aspect-ratio: 16 / 9;
  min-width: 100%;
  border: 0;
  pointer-events: none;
}

@media (max-width: 900px) {
  /* Stacked: copy on top with its own padding, media below still running to
     the left, right and bottom edges. */
  .tile.is-featured {
    flex-direction: column;
    align-items: stretch;
    padding: 0;
  }

  .tile.is-featured .copy {
    align-self: auto;
    padding: 40px 30px 34px;
  }

  .tile.is-featured .media {
    width: 100%;
    flex: 0 0 auto;
    min-height: 260px;
  }
}

/* Matches the point where the grid drops to one column. A full-width tile held
   to a 1:1 ratio would be ~800px tall, so height becomes content-driven here
   instead. */
@media (max-width: 860px) {
  .tile:not(.is-featured) {
    aspect-ratio: auto;
    min-height: 430px;
  }
}

@media (max-width: 640px) {
  .tile:not(.is-featured) {
    min-height: 470px;
    padding: 34px 24px 0;
  }

  .tile:not(.is-featured) .media {
    margin: 22px -24px 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile { animation: none; }
}
</style>
