import { createStore } from 'vuex';

const stored = localStorage.getItem('theme');

export default createStore({
    state: {
        theme: stored || 'dark',
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
