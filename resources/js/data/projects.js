// The personal projects, shipped with the bundle rather than fetched. There
// is no editing UI and the list changes once or twice a year, so a database
// round-trip (and the loading and error states that came with it) bought
// nothing.
//
// The data itself lives in resources/data/projects.json because PHP reads the
// same file: the sitemap, /llms.txt and the home page's JSON-LD are all built
// from it server-side (see app/Support/Site.php). Edit the JSON, not this.
//
// Titles are the join key in two places: the pixel shop scene
// (resources/js/game/scenes/shop.vue) matches its displays by `title`
// case-insensitively against the labels in game/art/shop.js, and the home
// page picks each project's bespoke CSS visual the same way (see
// resources/js/vue/project-visual.vue). Renaming a project in the JSON means
// renaming it in both of those too.
//
// A null `url` means "not live yet". The UI renders that as a non-clickable
// tile with an "In development" note rather than a dead link, so leave it
// null instead of pointing at a placeholder.
//
// Order is the display order: newest first, then alphabetical within a year.
import data from '../../data/projects.json';

export const PROJECTS = data;

export default PROJECTS;
