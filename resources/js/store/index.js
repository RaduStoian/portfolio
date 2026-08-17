import { createStore } from 'vuex';

const stored = localStorage.getItem('theme');

export default createStore({
    state: {
        // The plain portfolio is designed light-first; dark stays available
        // through the nav toggle for anyone who prefers it.
        theme: stored || 'light',
    },
    mutations: {
        setTheme(state, theme) {
            state.theme = theme;
            localStorage.setItem('theme', theme);
        },
    },
    actions: {
        toggleTheme({ state, commit }) {
            commit('setTheme', state.theme === 'dark' ? 'light' : 'dark');
        },
    },
});
