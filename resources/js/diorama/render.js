// Paper-diorama rendering primitives. Deliberately independent of
// game/pixel.js. Nothing here snaps to a pixel grid or disables smoothing.
// A "diorama" is built from flat-shaded polygon facets whose tone is derived
// from a surface normal and a fixed light direction, the way a folded-paper
// model catches light differently on each plane. See palette.js for the
// light direction and base hues this all reads from.

import { LIGHT_DIR } from './palette.js';

/** Deterministic 0..1 value from integer coords. Same trick as the pixel engine's hash2, reimplemented here so this module has no import from it. */
export function hash2(x, y, seed = 0) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 1442695040888963407;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx, w, h };
}

function clamp01(v) {
    return Math.min(1, Math.max(0, v));
}

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
    const c = (v) => clamp01(v / 255) * 255 | 0;
    return `#${[c(r), c(g), c(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Shade a base color for a facet with the given normal (unit-ish vector,
 * z toward the viewer). Dot product against LIGHT_DIR maps to a tone
 * multiplier. This is the one formula that replaces every hand-picked
 * wallLit/wallDark pair in the pixel engine.
 */
export function foldShade(hex, normal, { min = 0.55, max = 1.25 } = {}) {
    const len = Math.hypot(normal.x, normal.y, normal.z) || 1;
    const dot =
        (normal.x / len) * LIGHT_DIR.x +
        (normal.y / len) * LIGHT_DIR.y +
        (normal.z / len) * LIGHT_DIR.z;
    const t = clamp01((dot + 1) / 2); // -1..1 -> 0..1
    const mult = min + t * (max - min);

    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * mult, g * mult, b * mult);
}

/** A flat-shaded polygon facet: the base unit everything else composes from. */
export function panel(ctx, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fill();
}

/** Soft seam between two facets meeting at a fold. A hint of shadow, not a hard line. */
export function crease(ctx, x1, y1, x2, y2, color = '#000000', opacity = 0.18, width = 2) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

/** Blurred contact shadow: what sells a diorama piece as sitting on a surface. */
export function ambientShadow(ctx, cx, cy, rx, ry, opacity = 0.22, blur = 10) {
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = `rgba(20, 16, 12, ${opacity})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** Soft radial glow, e.g. behind a lit window. */
export function glow(ctx, cx, cy, r, color, opacity = 0.9) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, `${color}00`);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/**
 * Run a draw callback with a native canvas drop shadow applied. The "cut
 * paper laid on top of the layer below" trick every panel in the diorama
 * uses. Reset immediately after so the shadow never leaks onto whatever
 * draws next.
 */
export function withShadow(ctx, fn, { dx = 0, dy = 5, blur = 9, color = 'rgba(18,14,20,0.38)' } = {}) {
    ctx.save();
    ctx.shadowOffsetX = dx;
    ctx.shadowOffsetY = dy;
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;
    fn();
    ctx.restore();
}

/** Rounded-rect path, filled with a color. The base cutout shape for every prop layer. */
export function roundedPanel(ctx, x, y, w, h, r, color) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
}

/** Plain blit at float coordinates. No rounding, unlike the pixel engine's drawSprite. */
export function drawLayer(ctx, sprite, x, y) {
    ctx.drawImage(sprite.canvas, x, y);
}
