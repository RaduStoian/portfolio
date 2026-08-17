import { createRouter, createWebHistory } from 'vue-router';
import Overworld from '../game/scenes/overworld.vue';
import Graveyard from '../game/scenes/graveyard.vue';
import Shop from '../game/scenes/shop.vue';
import Career from '../game/scenes/career.vue';
import House from '../game/scenes/house.vue';
import Home from '../vue/pages/home.vue';
import Projects from '../vue/pages/projects.vue';
import Contact from '../vue/pages/contact.vue';
import NotFound from '../vue/pages/not-found.vue';

// `meta.fullscreen` hides the site chrome (nav + footer) because game scenes
// own the whole viewport. Non-game pages keep the normal layout.
//
// The plain site (this file's default) is the front door. The pixel-art game
// is a separate, complete experience nested under /play, with the same scenes
// as before just moved off the root path. Nothing inside the game had to
// change except the paths that pointed at "/": see useBack.js's fallback and
// the "Projects" building's route in game/art/overworld.js.
export default createRouter({
    history: createWebHistory(),
    scrollBehavior: () => ({ top: 0 }),
    routes: [
        { path: '/', component: Home },
        { path: '/projects', component: Projects },
        { path: '/contact', component: Contact },

        { path: '/play', component: Overworld, meta: { fullscreen: true } },
        { path: '/play/graveyard', component: Graveyard, meta: { fullscreen: true } },
        { path: '/play/projects', component: Shop, meta: { fullscreen: true } },
        { path: '/play/career', component: Career, meta: { fullscreen: true } },
        { path: '/play/about', component: House, meta: { fullscreen: true } },

        // Catch-all, must stay last. Client-side only (web.php serves the
        // SPA shell with a 200 for every path), so it fixes the UX but not
        // the HTTP status code crawlers see.
        { path: '/:pathMatch(.*)*', component: NotFound },
    ],
});
