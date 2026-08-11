import { createRouter, createWebHistory } from 'vue-router';
import Overworld from '../game/scenes/overworld.vue';
import Graveyard from '../game/scenes/graveyard.vue';
import Shop from '../game/scenes/shop.vue';
import Career from '../game/scenes/career.vue';
import House from '../game/scenes/house.vue';
import HouseDiorama from '../diorama/scenes/house.vue';
import Projects from '../vue/pages/projects.vue';
import Contact from '../vue/pages/contact.vue';
import NotFound from '../vue/pages/not-found.vue';

// `meta.fullscreen` hides the site chrome (nav + footer) — game scenes own the
// whole viewport. Non-game pages keep the normal layout.
export default createRouter({
    history: createWebHistory(),
    scrollBehavior: () => ({ top: 0 }),
    routes: [
        { path: '/', component: Overworld, meta: { fullscreen: true } },
        { path: '/graveyard', component: Graveyard, meta: { fullscreen: true } },
        // /projects is the shop scene; the plain database-backed list lives one
        // level down, linked from the shop's HUD, so the game is the front door
        // but the readable version is still one click away.
        { path: '/projects', component: Shop, meta: { fullscreen: true } },
        { path: '/projects/list', component: Projects },
        { path: '/career', component: Career, meta: { fullscreen: true } },
        { path: '/about', component: House, meta: { fullscreen: true } },
        // Style-comparison spike: the same room drawn with the diorama
        // engine (resources/js/diorama/) instead of the pixel one. Not
        // linked from the site nav — visit directly to compare.
        { path: '/about-diorama', component: HouseDiorama, meta: { fullscreen: true } },
        { path: '/contact', component: Contact },
        // Catch-all — must stay last. Client-side only (web.php serves the
        // SPA shell with a 200 for every path), so it fixes the UX but not
        // the HTTP status code crawlers see.
        { path: '/:pathMatch(.*)*', component: NotFound },
    ],
});
