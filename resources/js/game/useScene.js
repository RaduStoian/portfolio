import { onMounted, onBeforeUnmount, ref, shallowRef } from 'vue';

/**
 * Owns the boring half of every scene: sizing the canvas to the viewport at an
 * integer pixel scale, running a fixed-ish RAF loop, mapping pointer events into
 * virtual pixels, and tearing all of it down again on unmount.
 *
 * The contract that matters: `update` and `draw` only ever see VIRTUAL pixels
 * (0..width, 0..height). The canvas transform absorbs device-pixel-ratio and the
 * integer upscale, so no game code ever multiplies by a scale factor. Mixing the
 * two coordinate spaces is the bug this composable exists to prevent.
 */
export function useScene({ width, height, update, draw, background = '#000' }) {
    const canvasRef = ref(null);
    const scale = ref(1);
    const view = shallowRef({ scale: 1, offsetX: 0, offsetY: 0, dpr: 1 });

    let ctx = null;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let stopped = false;

    function resize() {
        const canvas = canvasRef.value;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;

        canvas.width = Math.max(1, Math.round(cssW * dpr));
        canvas.height = Math.max(1, Math.round(cssH * dpr));

        // Integer scale only. A fractional upscale makes some source pixels
        // 2 screen px wide and others 3, which is the classic shimmering
        // pixel-art artefact — better to letterbox than to allow it.
        const fit = Math.min(canvas.width / width, canvas.height / height);
        const s = Math.max(1, Math.floor(fit));

        view.value = {
            scale: s,
            offsetX: Math.floor((canvas.width - width * s) / 2),
            offsetY: Math.floor((canvas.height - height * s) / 2),
            dpr,
        };
        scale.value = s / dpr;
    }

    /** Convert a pointer/mouse event into virtual scene pixels. */
    function toVirtual(event) {
        const canvas = canvasRef.value;
        if (!canvas) return { x: 0, y: 0 };

        const bounds = canvas.getBoundingClientRect();
        const { scale: s, offsetX, offsetY, dpr } = view.value;

        // clientX -> CSS px inside canvas -> device px -> virtual px
        const deviceX = (event.clientX - bounds.left) * (canvas.width / bounds.width);
        const deviceY = (event.clientY - bounds.top) * (canvas.height / bounds.height);

        return {
            x: (deviceX - offsetX) / s,
            y: (deviceY - offsetY) / s,
            dpr,
        };
    }

    function frame(now) {
        if (stopped) return;
        raf = requestAnimationFrame(frame);

        // Clamped so a backgrounded tab doesn't resume with a huge dt and
        // tunnel every physics body through the floor.
        const dt = Math.min((now - last) / 1000 || 0, 1 / 20);
        last = now;
        elapsed += dt;

        update?.(dt, elapsed);

        const canvas = canvasRef.value;
        if (!canvas || !ctx) return;

        const { scale: s, offsetX, offsetY } = view.value;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.setTransform(s, 0, 0, s, offsetX, offsetY);
        ctx.imageSmoothingEnabled = false;
        // Clip so a scene drawing slightly out of bounds can't bleed into the
        // letterbox bars.
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.clip();
        draw(ctx, elapsed);
        ctx.restore();
    }

    onMounted(() => {
        const canvas = canvasRef.value;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        resize();
        window.addEventListener('resize', resize);

        last = performance.now();
        raf = requestAnimationFrame(frame);
    });

    onBeforeUnmount(() => {
        stopped = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
    });

    return { canvasRef, scale, view, toVirtual, resize };
}
