<template>
  <div ref="rootRef" class="home">

    <!-- The work is the hero. The name is just a caption on it. -->
    <section class="work">
      <header class="intro">
        <h1 class="name">Radu Stoian <span>(Mike)</span></h1>
        <p class="role">Senior Full-Stack Developer</p>
      </header>

      <h2 class="section-label">Personal live projects</h2>

      <div class="stack">
        <!-- One project leads, the rest fill a 2x2 beneath it. With five
             projects an even grid would leave the last one orphaned beside an
             empty half, and this gives the page a clear entry point besides. -->
        <ProjectTile v-if="featured" :project="featured" featured :index="0" />

        <div class="grid">
          <ProjectTile
            v-for="(project, i) in supporting"
            :key="project.id"
            :project="project"
            :index="i + 1"
          />
        </div>
      </div>
    </section>

    <!-- Experience, kept to the numbers that matter -->
    <section class="stats">
      <h2 class="section-label narrow center reveal">Professional career</h2>

      <div class="stats-inner">
        <div class="stat reveal">
          <strong class="display">{{ yearsExperience }}</strong>
          <span>years building for the web</span>
        </div>
        <div class="stat reveal" style="--d: 0.08s">
          <strong class="display">4</strong>
          <span>companies, from startup to enterprise</span>
        </div>
        <div class="stat reveal" style="--d: 0.16s">
          <strong class="display">Full stack</strong>
          <span>front end to infrastructure</span>
        </div>
      </div>

      <ul class="tags reveal" style="--d: 0.2s">
        <li v-for="skill in skills" :key="skill">{{ skill }}</li>
      </ul>

      <div class="contrib reveal" style="--d: 0.1s">
        <ContributionGraph />
      </div>
    </section>

    <!-- Close -->
    <section class="cta">
      <h2 class="display reveal">Want to work together?</h2>
      <p class="reveal" style="--d: 0.06s">
        I don't keep a resume up to date, so just tell me what you need and
        I'll send it over.
      </p>
      <div class="cta-actions reveal" style="--d: 0.12s">
        <RouterLink to="/contact" class="btn primary">Get in touch</RouterLink>
        <a href="mailto:radu.stoian0@gmail.com" class="btn plain">radu.stoian0@gmail.com &rarr;</a>
      </div>
    </section>

  </div>
</template>

<script>
import { ref } from 'vue';
import ProjectTile from '../project-tile.vue';
import ContributionGraph from '../contribution-graph.vue';
import { useReveal } from '../useReveal.js';
import { PROJECTS } from '../../data/projects';

// Which project leads the page. Matched case-insensitively on title so a
// reorder in the database can't silently change the layout.
const FEATURED_TITLE = 'forgekit';

const SKILLS = [
  'PHP', 'Laravel', 'Vue.js', 'Go', 'Python',
  'MySQL & Postgres', 'Linux servers', 'AWS', 'CI/CD',
];

// First official dev job: September 2019. Kept as a start date rather than a
// hard-coded total so the figure on the page can never quietly go stale.
const CAREER_START = { year: 2019, month: 8 }; // month is 0-indexed, so 8 = September

export default {
  name: 'HomePage',
  components: { ProjectTile, ContributionGraph },
  setup() {
    const rootRef = ref(null);
    // Only the static sections below the fold use scroll-reveal; the project
    // tiles animate themselves in CSS so they never depend on this running.
    useReveal(rootRef);
    return { rootRef };
  },
  data() {
    return { skills: SKILLS, projects: PROJECTS };
  },
  computed: {
    featured() {
      return this.projects.find((p) => p.title?.toLowerCase() === FEATURED_TITLE) ?? this.projects[0];
    },
    supporting() {
      return this.projects.filter((p) => p !== this.featured);
    },
    /** Completed years since the career start, so the number never overstates. */
    yearsExperience() {
      const now = new Date();
      const years = now.getFullYear() - CAREER_START.year;
      // The current year doesn't count until the anniversary month arrives.
      return now.getMonth() < CAREER_START.month ? years - 1 : years;
    },
  },
};
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
}

/* ---------- Work (the hero) ---------- */
.work {
  padding: 56px 22px 40px;
}

/* Name as context, not as a statement: small, left-aligned, sharing the
   grid's left edge so it reads as a label on the work below it. */
.intro {
  max-width: 1120px;
  margin: 0 auto 44px;
  animation: introIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

/* Section divider. A tracked-out label over a hairline rule, sized well below
   the project titles so it organises the page without competing with the work
   on it. Shares the container width of whatever it sits above. */
.section-label {
  max-width: 1120px;
  margin: 0 auto 22px;
  padding-bottom: 11px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Matches the narrower container the stats and contribution graph sit in. */
.section-label.narrow {
  max-width: 980px;
}

.section-label.center {
  text-align: center;
}

/* The stat figures are large, so the label needs more air beneath it here than
   it does above the project grid. */
.stats .section-label {
  margin-bottom: 58px;
}

.name {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.name span {
  color: var(--text-muted);
  font-weight: 500;
}

.role {
  margin: 4px 0 0;
  font-size: 15px;
  color: var(--text-muted);
}

@keyframes introIn {
  from { opacity: 0; transform: translateY(12px); }
}

.stack {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.contrib {
  margin-top: 72px;
}

.state {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 0;
}

/* ---------- Stats ---------- */
.stats {
  margin-top: 60px;
  padding: 92px 24px 110px;
  background: var(--bg-alt);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.stats-inner {
  max-width: 980px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
  text-align: center;
}

.stat strong {
  display: block;
  font-size: clamp(40px, 5.5vw, 68px);
  color: var(--text);
}

.stat span {
  display: block;
  margin-top: 12px;
  font-size: 15.5px;
  line-height: 1.5;
  color: var(--text-muted);
}

.tags {
  list-style: none;
  max-width: 780px;
  margin: 72px auto 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.tags li {
  padding: 8px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  font-size: 13.5px;
  color: var(--text-muted);
}

/* ---------- CTA ---------- */
.cta {
  padding: 140px 24px 150px;
  text-align: center;
}

.cta h2 {
  font-size: clamp(34px, 5.5vw, 64px);
}

.cta p {
  max-width: 46ch;
  margin: 22px auto 40px;
  font-size: 17px;
  line-height: 1.6;
  color: var(--text-muted);
}

.cta-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 14px 28px;
}

.btn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 16px;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.btn.primary {
  padding: 13px 28px;
  background: var(--accent);
  color: #fff;
  font-weight: 500;
}

.btn.primary:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.btn.plain {
  color: var(--accent);
}

.btn.plain:hover {
  text-decoration: underline;
}

@media (max-width: 860px) {
  .stats-inner { grid-template-columns: 1fr; gap: 44px; }
}

/* Drop to one column well before the tiles get narrow enough to squash their
   visuals. Two columns below this width left the squares too short for the
   copy and the visual to share. */
@media (max-width: 860px) {
  .grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .intro { animation: none; }
}
</style>
