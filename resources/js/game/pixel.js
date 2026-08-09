// Offscreen-canvas helpers for baking pixel art.
//
// The rule this whole engine rests on: sprites are drawn at TRUE pixel size
// (a gravestone really is 26x36 px) onto a small offscreen canvas, then blitted
// scaled-up with smoothing off. Nothing is ever drawn at display resolution and
// scaled down, which is what makes pixel art look mushy.

/** Create an offscreen canvas of exactly w x h pixels, smoothing already off. */
export function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx, w, h };
}

/** Single pixel. */
export function px(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, 1, 1);
}

/** Axis-aligned filled rect, integer-snapped. */
export function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

/** 1px outline, drawn inside the given bounds. */
export function outline(ctx, x, y, w, h, color) {
    rect(ctx, x, y, w, 1, color);
    rect(ctx, x, y + h - 1, w, 1, color);
    rect(ctx, x, y, 1, h, color);
    rect(ctx, x + w - 1, y, 1, h, color);
}

/**
 * Vertical gradient as discrete bands rather than a smooth ramp — a real
 * gradient would introduce thousands of colours and stop reading as pixel art.
 */
export function bands(ctx, x, y, w, h, colors) {
    const step = h / colors.length;
    colors.forEach((color, i) => {
        rect(ctx, x, y + Math.round(i * step), w, Math.ceil(step), color);
    });
}

/**
 * Ordered-dither a rect between two colours. `amount` 0..1 is the share of
 * pixels taking `b`. Uses a 4x4 Bayer matrix, so the texture is stable and
 * tileable instead of noisy.
 */
const BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
];

export function dither(ctx, x, y, w, h, a, b, amount) {
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const threshold = (BAYER4[j & 3][i & 3] + 0.5) / 16;
            px(ctx, x + i, y + j, threshold < amount ? b : a);
        }
    }
}

/**
 * Deterministic value noise keyed on integer coords. Used for scattering grass
 * tufts, stone speckle and star positions — deterministic so a re-bake looks
 * identical rather than shimmering between reloads.
 */
export function hash2(x, y, seed = 0) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 1442695040888963407;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Speckle a rect with `color` at the given density, deterministically. */
export function speckle(ctx, x, y, w, h, color, density, seed = 0) {
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            if (hash2(x + i, y + j, seed) < density) px(ctx, x + i, y + j, color);
        }
    }
}

/**
 * Filled polygon, snapped to whole pixels via scanline fill. Canvas' own
 * path fill would antialias the edges and break the pixel grid.
 */
export function poly(ctx, points, color) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    ctx.fillStyle = color;

    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        const crossings = [];
        for (let i = 0; i < points.length; i++) {
            const [x1, y1] = points[i];
            const [x2, y2] = points[(i + 1) % points.length];
            if (y1 === y2) continue;
            const sampleY = y + 0.5;
            if (sampleY >= Math.min(y1, y2) && sampleY < Math.max(y1, y2)) {
                crossings.push(x1 + ((sampleY - y1) / (y2 - y1)) * (x2 - x1));
            }
        }
        crossings.sort((a, b) => a - b);
        for (let i = 0; i + 1 < crossings.length; i += 2) {
            const xs = Math.round(crossings[i]);
            const xe = Math.round(crossings[i + 1]);
            if (xe > xs) ctx.fillRect(xs, y, xe - xs, 1);
        }
    }
}

/**
 * Draw a sprite bending in the wind: each row is blitted with a horizontal
 * offset that grows towards the top, so the base stays planted and the crown
 * sways. This is how the trees, bushes and banners move — cheaper and more
 * controllable than simulating them, and it keeps every pixel on the grid
 * because the offset is rounded per row.
 */
export function drawSway(ctx, sprite, x, y, t, options = {}) {
    const { amp = 1.5, speed = 1.1, phase = 0, stiffness = 2 } = options;
    const h = sprite.h;

    for (let row = 0; row < h; row++) {
        // Height above the base, 0 at the bottom and 1 at the top. Raised to a
        // power so the bend concentrates in the crown instead of shearing the
        // whole sprite evenly.
        const k = Math.pow((h - row) / h, stiffness);
        const offset = Math.round(Math.sin(t * speed + phase) * amp * k);
        ctx.drawImage(sprite.canvas, 0, row, sprite.w, 1, x + offset, y + row, sprite.w, 1);
    }
}

/** Plain blit at integer coordinates. */
export function drawSprite(ctx, sprite, x, y) {
    ctx.drawImage(sprite.canvas, Math.round(x), Math.round(y));
}

/**
 * Bake a 1px outline around a sprite's silhouette, in place, returning a new
 * canvas one pixel larger on each side. Chunky dark outlines are most of what
 * separates "shapes on a background" from "game art".
 */
export function outlineSprite(sprite, color) {
    const out = makeCanvas(sprite.w + 2, sprite.h + 2);
    const src = sprite.ctx.getImageData(0, 0, sprite.w, sprite.h).data;
    const opaque = (x, y) =>
        x >= 0 && y >= 0 && x < sprite.w && y < sprite.h && src[(y * sprite.w + x) * 4 + 3] > 8;

    for (let y = -1; y <= sprite.h; y++) {
        for (let x = -1; x <= sprite.w; x++) {
            if (opaque(x, y)) continue;
            if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
                rect(out.ctx, x + 1, y + 1, 1, 1, color);
            }
        }
    }

    out.ctx.drawImage(sprite.canvas, 1, 1);
    return out;
}

/**
 * An isometric "tile" diamond, the primitive the overworld ground is made of.
 * Drawn as explicit 2:1 stepped rows so the edges land on the classic pixel-art
 * staircase instead of an antialiased diagonal.
 */
export function isoDiamond(ctx, cx, cy, halfW, color) {
    const halfH = halfW / 2;
    for (let j = -halfH; j < halfH; j++) {
        const t = 1 - Math.abs((j + 0.5) / halfH);
        const w = Math.round(halfW * t);
        if (w > 0) ctx.fillStyle = color, ctx.fillRect(cx - w, cy + j, w * 2, 1);
    }
}
