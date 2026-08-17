import { onMounted, onBeforeUnmount } from 'vue';

/**
 * Adds `.in` to every `.reveal` element inside the component once it scrolls
 * into view, which is what the global transition in App.vue keys off.
 *
 * Elements are unobserved after firing: these are one-shot entrances, and
 * leaving them observed would re-animate content on every scroll back up.
 *
 * Returns `refresh()` for content that mounts *after* the initial pass.
 * Anything rendered from a fetch response would otherwise never be observed,
 * and so would sit at opacity 0 permanently. Already-observed elements are
 * tracked in a WeakSet so repeat calls are harmless.
 */
export function useReveal(rootRef = null) {
    let observer = null;
    const seen = new WeakSet();

    function collect() {
        const root = rootRef?.value ?? document;
        const targets = root.querySelectorAll?.('.reveal') ?? [];

        // Without IntersectionObserver, show everything rather than leaving
        // the page permanently blank.
        if (!observer) {
            targets.forEach((el) => el.classList.add('in'));
            return;
        }

        targets.forEach((el) => {
            if (seen.has(el)) return;
            seen.add(el);
            observer.observe(el);
        });
    }

    onMounted(() => {
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (!entry.isIntersecting) continue;
                        entry.target.classList.add('in');
                        observer.unobserve(entry.target);
                    }
                },
                // Fire slightly before the element is fully on screen, so the
                // motion reads as "already arriving" rather than starting late.
                { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
            );
        }
        collect();
    });

    onBeforeUnmount(() => observer?.disconnect());

    return { refresh: collect };
}
