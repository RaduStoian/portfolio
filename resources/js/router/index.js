import { createRouter, createWebHistory } from 'vue-router';
import Overworld from '../game/scenes/overworld.vue';
import Graveyard from '../game/scenes/graveyard.vue';
import About from '../vue/pages/about.vue';
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
        { path: '/projects', component: Projects },
        { path: '/career', component: About },
        { path: '/about', component: About },
        { path: '/contact', component: Contact },
        // Catch-all — must stay last. Client-side only (web.php serves the
        // SPA shell with a 200 for every path), so it fixes the UX but not
        // the HTTP status code crawlers see.
        { path: '/:pathMatch(.*)*', component: NotFound },
    ],
});
