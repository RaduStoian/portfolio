import { P } from '../palette.js';
import { makeCanvas, rect, px, hash2, poly, outlineSprite } from '../pixel.js';

// Scenery shared by both scenes. Everything here is authored small and chunky:
// a tree is 30px tall, so each pixel is a real decision and the silhouette does
// the work.

/**
 * Leafy tree with a lumpy canopy. Built from overlapping blobs rather than one
 * circle, which is what stops it looking like a lollipop.
 */
export function bakeTree(seed = 0, size = 1) {
    const w = Math.round(30 * size);
    const h = Math.round(40 * size);
    const s = makeCanvas(w, h);
    const { ctx } = s;

    const cx = w / 2;
    const trunkW = Math.max(3, Math.round(4 * size));
    const trunkH = Math.round(h * 0.36);

    // Trunk, widening into roots at the base.
    rect(ctx, cx - trunkW / 2, h - trunkH, trunkW, trunkH, P.wood);
    rect(ctx, cx - trunkW / 2, h - trunkH, 1, trunkH, P.woodLit);
    rect(ctx, cx + trunkW / 2 - 1, h - trunkH, 1, trunkH, P.woodDark);
    rect(ctx, cx - trunkW / 2 - 1, h - 2, trunkW + 2, 2, P.woodDark);
    // Bark ticks.
    for (let y = h - trunkH + 2; y < h - 3; y += 4) px(ctx, cx - trunkW / 2 + 1, y, P.woodDark);

    // Canopy: five overlapping discs, jittered by the seed.
    const blobs = [
        [cx, h - trunkH - 9 * size, 11 * size],
        [cx - 8 * size, h - trunkH - 5 * size, 8 * size],
        [cx + 8 * size, h - trunkH - 5 * size, 8 * size],
        [cx - 4 * size, h - trunkH - 16 * size, 8 * size],
        [cx + 5 * size, h - trunkH - 15 * size, 7 * size],
    ];

    const disc = (bx, by, r, color) => {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                if (x * x + y * y <= r * r) px(ctx, Math.round(bx + x), Math.round(by + y), color);
            }
        }
    };

    for (const [bx, by, r] of blobs) {
        const jx = (hash2(bx, by, seed) - 0.5) * 2 * size;
        disc(bx + jx, by, r, P.leafDark);
    }
    for (const [bx, by, r] of blobs) {
        const jx = (hash2(bx, by, seed) - 0.5) * 2 * size;
        disc(bx + jx, by - 1, r - 1, P.leaf);
    }
    // Highlight pass only on the upper-left of each blob, giving one light
    // direction across the whole tree.
    for (const [bx, by, r] of blobs) {
        disc(bx - r * 0.32, by - r * 0.42, r * 0.55, P.leafLit);
    }

    // Leaf speckle for texture.
    for (let y = 0; y < h - trunkH + 4; y++) {
        for (let x = 0; x < w; x++) {
            if (hash2(x, y, seed + 13) > 0.94) {
                const data = ctx.getImageData(x, y, 1, 1).data;
                if (data[3] > 8) px(ctx, x, y, P.leafDark);
            }
        }
    }

    return outlineSprite(s, P.outline);
}

/** Round bush, same construction as the tree canopy at a smaller scale. */
export function bakeBush(seed = 0, size = 1) {
    const w = Math.round(18 * size);
    const h = Math.round(13 * size);
    const s = makeCanvas(w, h);
    const { ctx } = s;

    const disc = (bx, by, r, color) => {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                if (x * x + y * y <= r * r) px(ctx, Math.round(bx + x), Math.round(by + y), color);
            }
        }
    };

    disc(w * 0.32, h - 5, 5 * size, P.leafDark);
    disc(w * 0.68, h - 5, 5 * size, P.leafDark);
    disc(w * 0.5, h - 7, 6 * size, P.leafDark);
    disc(w * 0.32, h - 6, 4 * size, P.leaf);
    disc(w * 0.68, h - 6, 4 * size, P.leaf);
    disc(w * 0.5, h - 8, 5 * size, P.leaf);
    disc(w * 0.42, h - 9, 2.5 * size, P.leafLit);

    // Berries.
    for (let i = 0; i < 4; i++) {
        const bx = Math.round(2 + hash2(i, seed, 3) * (w - 4));
        const by = Math.round(h - 10 + hash2(i, seed, 9) * 6);
        const data = ctx.getImageData(bx, by, 1, 1).data;
        if (data[3] > 8) px(ctx, bx, by, i % 2 ? P.flowerPink : P.flowerYellow);
    }

    return outlineSprite(s, P.outline);
}

/** Street lamp — a post with a warm lantern on top. */
export function bakeLamp() {
    const s = makeCanvas(9, 34);
    const { ctx } = s;

    rect(ctx, 4, 6, 2, 26, P.woodDark);
    rect(ctx, 4, 6, 1, 26, P.wood);
    rect(ctx, 2, 31, 6, 2, P.stoneDark);

    // Lantern housing.
    rect(ctx, 2, 2, 6, 7, P.inkSoft);
    rect(ctx, 3, 3, 4, 5, P.lamp);
    rect(ctx, 3, 5, 4, 3, P.window);
    rect(ctx, 1, 1, 8, 1, P.inkSoft);
    poly(ctx, [[4, 0], [5, 0], [7, 2], [2, 2]], P.inkSoft);

    return outlineSprite(s, P.outline);
}

/** Barrel. */
export function bakeBarrel() {
    const s = makeCanvas(12, 15);
    const { ctx } = s;

    rect(ctx, 1, 1, 10, 13, P.wood);
    rect(ctx, 1, 1, 2, 13, P.woodLit);
    rect(ctx, 9, 1, 2, 13, P.woodDark);
    for (let x = 3; x < 9; x += 3) rect(ctx, x, 1, 1, 13, P.woodDark);
    rect(ctx, 0, 3, 12, 2, P.stoneDark);
    rect(ctx, 0, 10, 12, 2, P.stoneDark);
    rect(ctx, 1, 0, 10, 2, P.woodLit);

    return outlineSprite(s, P.outline);
}

/** Crate. */
export function bakeCrate() {
    const s = makeCanvas(13, 12);
    const { ctx } = s;

    rect(ctx, 0, 0, 13, 12, P.wood);
    rect(ctx, 0, 0, 13, 2, P.woodLit);
    rect(ctx, 0, 10, 13, 2, P.woodDark);
    rect(ctx, 0, 0, 2, 12, P.woodLit);
    rect(ctx, 11, 0, 2, 12, P.woodDark);
    // Diagonal brace.
    for (let i = 0; i < 10; i++) px(ctx, 2 + i, 10 - i, P.woodDark);

    return outlineSprite(s, P.outline);
}

/** Flower tuft, for scattering along the grass. */
export function bakeFlowers(seed = 0) {
    const s = makeCanvas(9, 7);
    const { ctx } = s;
    const colors = [P.flowerPink, P.flowerYellow, P.flowerBlue];

    for (let i = 0; i < 3; i++) {
        const x = 1 + i * 3 + Math.round(hash2(i, seed, 2));
        const stem = 3 + Math.round(hash2(i, seed, 4) * 2);
        rect(ctx, x, 7 - stem, 1, stem, P.leafDark);
        px(ctx, x, 6 - stem, colors[(i + seed) % 3]);
        px(ctx, x - 1, 7 - stem, P.leaf);
    }

    return s;
}

/** Wooden signpost with a blank board, for labelling paths. */
export function bakeSignpost() {
    const s = makeCanvas(16, 22);
    const { ctx } = s;

    rect(ctx, 7, 6, 2, 16, P.woodDark);
    rect(ctx, 1, 2, 14, 8, P.wood);
    rect(ctx, 1, 2, 14, 1, P.woodLit);
    rect(ctx, 1, 9, 14, 1, P.woodDeep);
    // Faint carved marks — deliberately illegible, it's 14px wide.
    rect(ctx, 3, 5, 6, 1, P.woodDeep);
    rect(ctx, 3, 7, 9, 1, P.woodDeep);

    return outlineSprite(s, P.outline);
}

/**
 * Soft warm glow disc for lamps and windows, baked once and drawn with varying
 * alpha. Dithered at the rim so it fades without introducing a smooth gradient.
 */
export function bakeGlow(radius, color = '250, 205, 130') {
    const size = radius * 2 + 1;
    const s = makeCanvas(size, size);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - radius;
            const dy = y - radius;
            const d = Math.sqrt(dx * dx + dy * dy) / radius;
            if (d > 1) continue;
            const alpha = Math.pow(1 - d, 2) * 0.5;
            const checker = d < 0.45 || (x + y) % 2 === 0;
            if (checker && alpha > 0.02) px(s.ctx, x, y, `rgba(${color}, ${alpha.toFixed(3)})`);
        }
    }
    return s;
}
