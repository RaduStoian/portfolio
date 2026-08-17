<template>
  <figure class="graph">
    <figcaption class="head">
      <span class="total">{{ total.toLocaleString() }} contributions in the last year</span>
      <a v-if="profileUrl" :href="profileUrl" target="_blank" rel="noopener" class="profile">View on GitHub &rarr;</a>
    </figcaption>

    <div class="frame">
      <div class="scroller">
        <div class="months" :style="{ '--cols': weeks.length }">
          <span v-for="label in monthLabels" :key="label.key" :style="{ gridColumn: `${label.column} / span ${label.span}` }">
            {{ label.name }}
          </span>
        </div>

        <div class="body">
          <div class="days">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>

          <div class="cells" :style="{ '--cols': weeks.length }">
            <div v-for="(week, w) in weeks" :key="w" class="week">
              <span
                v-for="day in week"
                :key="day.key"
                class="cell"
                :class="[`l${day.level}`, { future: day.future }]"
              ></span>
            </div>
          </div>
        </div>

        <div class="legend">
          <span class="less">Less</span>
          <span class="cell l0"></span>
          <span class="cell l1"></span>
          <span class="cell l2"></span>
          <span class="cell l3"></span>
          <span class="cell l4"></span>
          <span>More</span>
        </div>
      </div>
    </div>
  </figure>
</template>

<script>
// Your GitHub profile, so the graph links out to the real thing.
// Leave empty to render without the link.
const PROFILE_URL = '';

const WEEKS = 53;
const MS_PER_DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Deterministic 0..1 from an integer. Keyed on the day number so the pattern
 * is stable: a graph that reshuffled on every reload would immediately read as
 * decoration rather than a record.
 */
function noise(n, salt = 0) {
  let h = Math.imul((n ^ 0x9e3779b9) + salt, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/**
 * Commits for one day. Weekdays are busy and weekends mostly quiet, which is
 * what gives the graph its banded look. A slow sine over the year adds
 * stretches of heavier and lighter activity so it doesn't read as flat noise.
 *
 * The numbers here were tuned against a real year: roughly 680 contributions,
 * about 200 active days, and a spread across all five levels. The occasional
 * burst day matters most visually, since a smooth curve almost never produces
 * the few brightest cells that give a real graph its texture.
 */
function commitsFor(dayNumber, weekday) {
  const weekend = weekday === 0 || weekday === 6;
  const season = 0.86 + Math.sin(dayNumber / 47) * 0.14;
  const idle = noise(dayNumber, 11);

  if (weekend) {
    if (idle > 0.26) return 0;
    return 1 + Math.floor(noise(dayNumber, 23) * 3);
  }

  // Quiet weekdays: holidays, meetings, life.
  if (idle < 0.3) return 0;

  // A heavy day every couple of weeks.
  if (noise(dayNumber, 53) > 0.9) return 7 + Math.floor(noise(dayNumber, 71) * 10);

  return 1 + Math.floor(Math.pow(noise(dayNumber, 37), 1.6) * season * 6);
}

function levelFor(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export default {
  name: 'ContributionGraph',
  data() {
    return { profileUrl: PROFILE_URL, weeks: [], monthLabels: [], total: 0 };
  },
  created() {
    this.build();
  },
  methods: {
    build() {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      // GitHub's grid runs Sunday to Saturday, so end on the Saturday of the
      // current week and count back a whole number of weeks from there.
      const end = new Date(today);
      end.setDate(end.getDate() + (6 - end.getDay()));
      const start = new Date(end);
      start.setDate(start.getDate() - (WEEKS * 7 - 1));

      const weeks = [];
      const labels = [];
      let total = 0;
      let lastMonth = -1;

      for (let w = 0; w < WEEKS; w++) {
        const week = [];

        for (let d = 0; d < 7; d++) {
          const date = new Date(start);
          date.setDate(start.getDate() + w * 7 + d);

          const future = date > today;
          const dayNumber = Math.floor(date.getTime() / MS_PER_DAY);
          const count = future ? 0 : commitsFor(dayNumber, date.getDay());
          total += count;

          week.push({
            key: date.toISOString().slice(0, 10),
            level: future ? 0 : levelFor(count),
            future,
          });
        }

        // Label a column when a new month starts within it.
        const firstOfWeek = new Date(start);
        firstOfWeek.setDate(start.getDate() + w * 7);
        if (firstOfWeek.getMonth() !== lastMonth) {
          lastMonth = firstOfWeek.getMonth();
          labels.push({ key: `${lastMonth}-${w}`, name: MONTHS[lastMonth], column: w + 1, span: 1 });
        }

        weeks.push(week);
      }

      // Stretch each label to reach the next one so it sits over its own months
      // worth of columns instead of hugging the left edge.
      labels.forEach((label, i) => {
        const next = labels[i + 1];
        label.span = (next ? next.column : WEEKS + 1) - label.column;
      });

      // Drop a label with no room, or it collides with its neighbour.
      this.monthLabels = labels.filter((label) => label.span >= 2);
      this.weeks = weeks;
      this.total = total;
    },
  },
};
</script>

<style scoped>
/* Sized by its own content and centred, rather than stretched to fill.
   The cells are a fixed size, so the whole widget has one correct width
   (~805px) and simply centres itself in whatever space it's given. */
.graph {
  --cell: 11px;
  --gap: 3px;
  --labels: 24px;
  --label-gap: 6px;

  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 14px;
}

.total {
  font-size: 15.5px;
  color: var(--text);
}

.profile {
  font-size: 13.5px;
  color: var(--text-muted);
  text-decoration: none;
}

.profile:hover {
  color: var(--accent);
}

.frame {
  padding: 16px 18px;
  background: var(--bg);
  border: 1px solid var(--border);
}

/* Content is a fixed width, so on a phone it scrolls inside its own box rather
   than forcing the page sideways. */
.scroller {
  overflow-x: auto;
  padding-bottom: 2px;
}

/* Both grids share one column template. Previously the month row filled the
   available width while the cell grid sat at its intrinsic size, so the two
   drifted apart as the container grew and the labels no longer sat over their
   own columns. */
.months,
.cells {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  gap: var(--gap);
}

.months {
  /* Clears the weekday labels so column 1 lines up in both grids. */
  margin-left: calc(var(--labels) + var(--label-gap));
  margin-bottom: 5px;
  font-size: 10.5px;
  color: var(--text-muted);
}

.months span {
  white-space: nowrap;
}

.body {
  display: flex;
  gap: var(--label-gap);
}

.days {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: var(--labels);
  padding: 11px 0 3px;
  font-size: 10.5px;
  line-height: 1;
  color: var(--text-muted);
  flex-shrink: 0;
}

.week {
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  gap: var(--gap);
}

.cell {
  background: var(--c0);
}

.cell.l1 { background: var(--c1); }
.cell.l2 { background: var(--c2); }
.cell.l3 { background: var(--c3); }
.cell.l4 { background: var(--c4); }

/* Days that haven't happened yet leave a gap, exactly as GitHub does. */
.cell.future { background: transparent; }

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 10px;
  font-size: 10.5px;
  color: var(--text-muted);
}

.legend .cell {
  width: var(--cell);
  height: var(--cell);
}

.legend .less {
  margin-right: 2px;
}
</style>
