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
export function useScene({ width, height, update, draw, drawOverlay, background = '#000' }) {
    const canvasRef = ref(null);
    const scale = ref(1);
    const view = shallowRef({ scale: 1, offsetX: 0, offsetY: 0, dpr: 1 });

    let ctx = null;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let stopped = false;
    let camera = { x: width / 2, y: height / 2 };
    let cameraRestored = false;
    let heldDirection = null;
    let heldTime = 0;
    const cameraKey = `portfolio-camera:${window.location.pathname}`;

    function restoreCamera() {
        if (cameraRestored) return;
        cameraRestored = true;
        try {
            const saved = JSON.parse(sessionStorage.getItem(cameraKey));
            if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) camera = saved;
        } catch {
            // A blocked or malformed session store should never stop a scene.
        }
    }

    function cameraBounds(s = view.value.scale) {
        const canvas = canvasRef.value;
        if (!canvas) return { minX: width / 2, maxX: width / 2, minY: height / 2, maxY: height / 2 };
        const halfW = canvas.width / s / 2;
        const halfH = canvas.height / s / 2;
        return {
            minX: Math.min(width / 2, halfW),
            maxX: Math.max(width / 2, width - halfW),
            minY: Math.min(height / 2, halfH),
            maxY: Math.max(height / 2, height - halfH),
        };
    }

    function cameraEdges() {
        const bounds = cameraBounds();
        return {
            left: camera.x > bounds.minX + 0.05,
            right: camera.x < bounds.maxX - 0.05,
            up: camera.y > bounds.minY + 0.05,
            down: camera.y < bounds.maxY - 0.05,
        };
    }

    function commitCamera({ save = true } = {}) {
        const canvas = canvasRef.value;
        if (!canvas) return;
        const current = view.value;
        const bounds = cameraBounds(current.scale);
        camera.x = Math.max(bounds.minX, Math.min(bounds.maxX, camera.x));
        camera.y = Math.max(bounds.minY, Math.min(bounds.maxY, camera.y));
        view.value = {
            ...current,
            offsetX: Math.round(canvas.width / 2 - camera.x * current.scale),
            offsetY: Math.round(canvas.height / 2 - camera.y * current.scale),
        };
        if (save) {
            try {
                sessionStorage.setItem(cameraKey, JSON.stringify(camera));
            } catch {
                // Camera persistence is a convenience, not a requirement.
            }
        }
    }

    function resize() {
        const canvas = canvasRef.value;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;

        canvas.width = Math.max(1, Math.round(cssW * dpr));
        canvas.height = Math.max(1, Math.round(cssH * dpr));

        // COVER camera. On phones we keep an integer scale for large, uniform
        // source pixels. At laptop/desktop widths an integer ceil can be wildly
        // wasteful: a 1365px viewport jumps from the ideal 4.27x to 5x and
        // crops both axes. There we use the exact cover scale, which normally
        // makes the 16:9 world precisely viewport-wide and leaves only the
        // browser-shortened vertical dimension available to pan.
        const cover = Math.max(canvas.width / width, canvas.height / height);
        const desktopWidth = cssW >= 768;
        const s = Math.max(1, desktopWidth ? cover : Math.ceil(cover));

        restoreCamera();

        view.value = {
            scale: s,
            offsetX: 0,
            offsetY: 0,
            dpr,
        };
        commitCamera({ save: false });
        scale.value = s / dpr;
    }

    /** Move the world with the finger: dragging right reveals content left. */
    function panCameraBy(cssDx, cssDy) {
        const { scale: s, dpr } = view.value;
        camera.x -= (cssDx * dpr) / s;
        camera.y -= (cssDy * dpr) / s;
        commitCamera();
    }

    /**
     * Mouse wheels and two-finger trackpads both arrive as WheelEvents. Native
     * trackpad deltaX/deltaY is preserved; Shift remaps a one-axis wheel to
     * horizontal, matching desktop browser conventions.
     */
    function wheelCamera(event) {
        const modeScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? 16
            : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                ? Math.min(window.innerWidth, window.innerHeight) * 0.8
                : 1;
        let dx = event.deltaX * modeScale;
        let dy = event.deltaY * modeScale;

        if (event.shiftKey && Math.abs(dx) < Math.abs(dy)) {
            dx = dy;
            dy = 0;
        }

        // Avoid a single coarse wheel notch jumping across the whole world.
        dx = Math.max(-120, Math.min(120, dx));
        dy = Math.max(-120, Math.min(120, dy));
        const before = { ...camera };
        panCameraBy(-dx, -dy);
        return Math.abs(camera.x - before.x) > 0.001 || Math.abs(camera.y - before.y) > 0.001;
    }

    function nudgeCamera(direction, amount = 22) {
        if (direction === 'left') camera.x -= amount;
        else if (direction === 'right') camera.x += amount;
        else if (direction === 'up') camera.y -= amount;
        else if (direction === 'down') camera.y += amount;
        commitCamera();
    }

    function cameraArrowAtEvent(event) {
        const canvas = canvasRef.value;
        if (!canvas) return null;
        const bounds = canvas.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const edges = cameraEdges();
        if (edges.left && x <= 48 && Math.abs(y - bounds.height / 2) <= 48) return 'left';
        if (edges.right && x >= bounds.width - 48 && Math.abs(y - bounds.height / 2) <= 48) return 'right';
        if (edges.up && y <= 48 && Math.abs(x - bounds.width / 2) <= 48) return 'up';
        if (edges.down && y >= bounds.height - 48 && Math.abs(x - bounds.width / 2) <= 48) return 'down';
        return null;
    }

    function beginCameraArrow(direction) {
        nudgeCamera(direction, 16);
        heldDirection = direction;
        heldTime = 0;
    }

    function endCameraArrow() {
        heldDirection = null;
        heldTime = 0;
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

        if (heldDirection) {
            heldTime += dt;
            if (heldTime > 0.28) nudgeCamera(heldDirection, 52 * dt);
        }

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

        // Viewport-fixed canvas UI is drawn after the virtual scene transform
        // is removed. It remains in the canvas, but does not drift into the
        // letterbox area on tall mobile screens.
        drawOverlay?.(ctx, {
            dpr: view.value.dpr,
            viewportWidth: canvas.width / view.value.dpr,
            viewportHeight: canvas.height / view.value.dpr,
            camera: cameraEdges(),
        });
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

    return {
        canvasRef, scale, view, toVirtual, resize,
        panCameraBy, wheelCamera, cameraArrowAtEvent, beginCameraArrow, endCameraArrow,
    };
}
