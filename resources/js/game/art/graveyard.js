import { P } from '../palette.js';
import { makeCanvas, rect, px, bands, dither, speckle, hash2, poly, outlineSprite } from '../pixel.js';
import { bakeBush, bakeLamp, bakeGlow, bakeFlowers } from './props.js';

export const GRAVEYARD_W = 320;
export const GRAVEYARD_H = 180;
export const GROUND_Y = 148;

/** Night sky, hills, bare trees and the far fence — everything non-physical. */
export function bakeBackdrop() {
    const s = makeCanvas(GRAVEYARD_W, GRAVEYARD_H);
    const { ctx } = s;

    // Night, using the palette's night keys — same world as the overworld,
    // hours later. Stars are drawn per frame by the scene so they can twinkle,
    // so nothing star-shaped is baked in here.
    bands(ctx, 0, 0, GRAVEYARD_W, GROUND_Y, [P.nightTop, P.nightTop, P.nightMid, P.nightLow, P.nightHorizon]);
    dither(ctx, 0, 40, GRAVEYARD_W, 12, P.nightTop, P.nightMid, 0.5);
    dither(ctx, 0, 82, GRAVEYARD_W, 12, P.nightMid, P.nightLow, 0.5);
    dither(ctx, 0, 108, GRAVEYARD_W, 10, P.nightLow, P.nightHorizon, 0.5);

    // Moon low on the horizon, with a soft dithered halo.
    //
    // The halo is walked as a circle, not a dithered rect: filling a square
    // with a half-transparent checker left a very visible glowing box around
    // the moon.
    const mx = 62;
    const my = 44;
    for (let y = -18; y <= 18; y++) {
        for (let x = -18; x <= 18; x++) {
            const d = Math.sqrt(x * x + y * y);
            if (d > 18 || d < 11) continue;
            // Density falls off steeply with distance. A shallower falloff over
            // a wider radius just looked like noise sprayed around the moon.
            const density = Math.pow(1 - (d - 11) / 7, 2);
            if (hash2(x + 40, y + 40, 77) < density * 0.55) {
                px(ctx, mx + x, my + y, 'rgba(232, 226, 198, 0.10)');
            }
        }
    }
    for (let y = -11; y <= 11; y++) {
        for (let x = -11; x <= 11; x++) {
            if (x * x + y * y <= 121) px(ctx, mx + x, my + y, '#f4efd8');
        }
    }
    for (let y = -11; y <= 11; y++) {
        for (let x = -11; x <= 11; x++) {
            if (x * x + y * y <= 121 && hash2(x, y, 5) > 0.93) px(ctx, mx + x, my + y, '#ded8c0');
        }
    }

    // Rolling hills behind the yard, each a flatter silhouette than the last.
    for (let x = 0; x < GRAVEYARD_W; x++) {
        const h = 18 + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.061) * 4;
        rect(ctx, x, GROUND_Y - h, 1, h, P.grassDark);
    }
    for (let x = 0; x < GRAVEYARD_W; x++) {
        const h = 10 + Math.sin(x * 0.035 + 2) * 5;
        rect(ctx, x, GROUND_Y - h, 1, h, '#25401f');
    }

    // Iron fence along the back.
    for (let x = 0; x < GRAVEYARD_W; x += 6) {
        rect(ctx, x, GROUND_Y - 16, 1, 16, P.inkSoft);
        px(ctx, x, GROUND_Y - 17, P.inkSoft);
    }
    rect(ctx, 0, GROUND_Y - 13, GRAVEYARD_W, 1, P.inkSoft);
    rect(ctx, 0, GROUND_Y - 6, GRAVEYARD_W, 1, P.inkSoft);

    // Ground — the overworld's greens, dropped a step for moonlight.
    rect(ctx, 0, GROUND_Y, GRAVEYARD_W, GRAVEYARD_H - GROUND_Y, P.grassDark);
    dither(ctx, 0, GROUND_Y, GRAVEYARD_W, 6, P.grassDeep, P.grassDark, 0.5);
    speckle(ctx, 0, GROUND_Y, GRAVEYARD_W, GRAVEYARD_H - GROUND_Y, P.grass, 0.07, 17);
    speckle(ctx, 0, GROUND_Y + 8, GRAVEYARD_W, GRAVEYARD_H - GROUND_Y - 8, P.grassDeep, 0.05, 23);

    // Grass blades along the ground line, taller nearer the camera.
    for (let x = 0; x < GRAVEYARD_W; x++) {
        if (hash2(x, 0, 41) > 0.84) {
            const h = 2 + Math.round(hash2(x, 1, 41) * 3);
            rect(ctx, x, GROUND_Y - h, 1, h, P.grass);
        }
        if (hash2(x, 2, 43) > 0.9) rect(ctx, x, GRAVEYARD_H - 14, 1, 3, P.grass);
    }

    // A worn dirt trail between the graves. Its edges are eaten into by grass
    // rather than being a clean silhouette — a solid brown wedge read as a
    // shape sitting on the lawn instead of a path worn into it.
    for (let y = GROUND_Y + 6; y < GRAVEYARD_H; y++) {
        const t = (y - GROUND_Y - 6) / (GRAVEYARD_H - GROUND_Y - 6);
        const half = 5 + t * 18;
        const cx = 150 + Math.sin(t * 1.4) * 10;
        rect(ctx, cx - half, y, half * 2, 1, P.dirtDark);

        for (let k = 0; k < 5; k++) {
            if (hash2(y, k, 8) > 0.35 + k * 0.15) px(ctx, cx - half + k, y, P.grassDark);
            if (hash2(y, k, 9) > 0.35 + k * 0.15) px(ctx, cx + half - k, y, P.grassDark);
        }
        if (hash2(y, 0, 12) > 0.55) px(ctx, cx + Math.round((hash2(y, 1, 3) - 0.5) * half), y, P.dirt);
        if (hash2(y, 2, 15) > 0.85) px(ctx, cx + Math.round((hash2(y, 3, 5) - 0.5) * half), y, P.grassDeep);
    }

    return s;
}

/**
 * Scenery for the graveyard. Bare, dead trees rather than the town's leafy
 * ones — same silhouette language, different mood — plus a lantern by the gate
 * so the scene has one warm point of light.
 */
export function bakeGraveyardProps() {
    /**
     * Leafless tree. Grown as a recursive limb walk rather than stubs poked out
     * of a trunk: the first version fanned short branches off a squat trunk and
     * every tree came out looking like a dead shrub. Limbs need to be long
     * relative to the trunk and to keep splitting.
     */
    const deadTree = (seed, scale) => {
        const w = Math.round(46 * scale);
        const h = Math.round(62 * scale);
        const s = makeCanvas(w, h);
        const { ctx } = s;
        const cx = w / 2;
        let rng = seed * 2654435761;
        const rand = () => {
            rng = (rng * 1103515245 + 12345) & 0x7fffffff;
            return rng / 0x7fffffff;
        };

        // Angles are measured from straight up; limbs stay within +-70deg so
        // the tree grows upward instead of sideways.
        const limb = (x, y, angle, len, thickness) => {
            let px0 = x;
            let py0 = y;
            for (let k = 0; k < len; k++) {
                px0 += Math.sin(angle);
                py0 -= Math.cos(angle);
                // Gentle drift, so limbs curve rather than running dead straight.
                angle += (rand() - 0.5) * 0.16;

                for (let tw = 0; tw < thickness; tw++) {
                    px(ctx, Math.round(px0) + tw, Math.round(py0), tw === 0 ? P.woodDark : P.woodDeep);
                }
            }

            if (len > 5 * scale && thickness >= 1) {
                const split = 0.4 + rand() * 0.4;
                limb(px0, py0, angle - split, len * (0.55 + rand() * 0.2), Math.max(1, thickness - 1));
                limb(px0, py0, angle + split, len * (0.5 + rand() * 0.2), Math.max(1, thickness - 1));
            }
        };

        const trunkH = h * 0.42;
        for (let k = 0; k < trunkH; k++) {
            rect(ctx, cx - 1, h - 1 - k, 3, 1, P.woodDeep);
            px(ctx, cx - 1, h - 1 - k, P.woodDark);
        }
        rect(ctx, cx - 3, h - 2, 7, 2, P.woodDeep);

        limb(cx, h - trunkH, -0.28, 11 * scale, 2);
        limb(cx, h - trunkH, 0.3, 11 * scale, 2);
        limb(cx, h - trunkH + 4 * scale, -0.75, 7 * scale, 1);
        limb(cx, h - trunkH + 6 * scale, 0.8, 7 * scale, 1);

        return outlineSprite(s, P.outline);
    };

    // Placed by their own sprite height so each trunk's base lands exactly on
    // the ground line. Hard-coding y sank them into the turf whenever a
    // sprite's size changed, and drawSway anchors at the sprite's bottom row.
    const plantTree = (sprite, x, sink, rest) => ({
        sprite,
        x,
        y: GROUND_Y - sprite.h + sink,
        ...rest,
    });

    return {
        trees: [
            plantTree(deadTree(1, 1), 4, 2, { amp: 1.4, speed: 1.0, phase: 0.3 }),
            plantTree(deadTree(2, 0.85), 272, 1, { amp: 1.2, speed: 1.25, phase: 2.1 }),
            plantTree(deadTree(3, 0.7), 200, 3, { amp: 1.0, speed: 1.5, phase: 3.6 }),
        ],
        bushes: [
            { sprite: bakeBush(7, 0.9), x: 82, y: GROUND_Y - 8, amp: 0.9, speed: 1.5, phase: 1.2 },
            { sprite: bakeBush(8, 1), x: 300, y: GROUND_Y - 4, amp: 1.0, speed: 1.3, phase: 2.8 },
            { sprite: bakeFlowers(2), x: 140, y: GROUND_Y + 6, amp: 0.7, speed: 2.2, phase: 0.5 },
            { sprite: bakeFlowers(0), x: 254, y: GROUND_Y + 10, amp: 0.7, speed: 2.5, phase: 1.9 },
        ],
        lamp: { sprite: bakeLamp(), x: 22, y: GROUND_Y - 33, glow: { x: 26, y: GROUND_Y - 30 } },
        glow: bakeGlow(16),
        // Stars live as data so the scene can twinkle them.
        stars: Array.from({ length: 110 }, (_, i) => ({
            x: Math.floor(hash2(i, 1, 51) * GRAVEYARD_W),
            y: Math.floor(hash2(i, 2, 52) * 100),
            phase: hash2(i, 3, 53) * Math.PI * 2,
            speed: 0.6 + hash2(i, 4, 54) * 2.4,
        })).filter((star) => hash2(star.x, star.y, 55) > star.y / 130),
    };
}

/**
 * A gravestone at true size. Three silhouettes so the row doesn't look cloned.
 * The sprite is the *only* source of the stone's look — when it shatters, each
 * chunk clips its own region out of this same canvas, so the crack lines run
 * through the carving exactly as they should.
 */
export function bakeGravestone(variant, epitaph) {
    const w = 26;
    const h = variant === 2 ? 42 : 36;
    const s = makeCanvas(w, h);
    const { ctx } = s;

    const body = (x, y, bw, bh) => {
        rect(ctx, x, y, bw, bh, P.stone);
        rect(ctx, x, y, 2, bh, P.stoneLit);
        rect(ctx, x + bw - 3, y, 3, bh, P.stoneDark);
        speckle(ctx, x, y, bw, bh, P.stoneDark, 0.06, variant + 2);
        speckle(ctx, x, y, bw, bh, P.stoneLit, 0.05, variant + 9);
    };

    if (variant === 0) {
        // Round-topped slab.
        body(3, 8, 20, h - 8);
        for (let y = 0; y < 10; y++) {
            const half = Math.round(Math.sqrt(Math.max(0, 100 - (10 - y) * (10 - y))));
            rect(ctx, 13 - half, y, half * 2, 1, P.stone);
            rect(ctx, 13 - half, y, 2, 1, P.stoneLit);
            rect(ctx, 13 + half - 2, y, 2, 1, P.stoneDark);
        }
    } else if (variant === 1) {
        // Flat slab with shoulders.
        body(2, 4, 22, h - 4);
        rect(ctx, 4, 2, 18, 2, P.stone);
        rect(ctx, 4, 2, 2, 2, P.stoneLit);
    } else {
        // Cross.
        body(9, 2, 8, h - 2);
        body(2, 11, 22, 7);
        rect(ctx, 2, 11, 22, 1, P.stoneLit);
    }

    // Carved epitaph: two-tone so the letters read as recessed.
    const lineY = variant === 2 ? 22 : 16;
    for (let i = 0; i < epitaph.length; i++) {
        const y = lineY + i * 5;
        if (y > h - 6) break;
        const width = epitaph[i];
        const x = 13 - Math.floor(width / 2);
        rect(ctx, x, y, width, 1, P.stoneDeep);
        rect(ctx, x, y + 1, width, 1, P.stoneLit);
    }

    // Weathering: moss creeping up from the base.
    for (let x = 0; x < w; x++) {
        for (let y = h - 8; y < h; y++) {
            if (hash2(x, y, variant * 13 + 3) < 0.22 * ((y - (h - 8)) / 8)) {
                px(ctx, x, y, '#3d5c33');
            }
        }
    }

    return s;
}

/** Sledgehammer, drawn head-up; the physics body is a matching compound. */
export function bakeHammer(headW, headH, handleLen) {
    const w = headW;
    const h = headH + handleLen;
    const s = makeCanvas(w, h);
    const { ctx } = s;

    // Head.
    rect(ctx, 0, 0, headW, headH, P.stone);
    rect(ctx, 0, 0, headW, 2, P.stoneLit);
    rect(ctx, 0, headH - 2, headW, 2, P.stoneDeep);
    rect(ctx, 0, 0, 3, headH, P.stoneDark);
    rect(ctx, headW - 3, 0, 3, headH, P.stoneDark);
    speckle(ctx, 0, 0, headW, headH, P.stoneDark, 0.08, 61);

    // Handle.
    const hx = Math.floor(w / 2) - 1;
    rect(ctx, hx, headH - 1, 3, handleLen + 1, P.wood);
    rect(ctx, hx, headH - 1, 1, handleLen + 1, P.woodLit);
    rect(ctx, hx + 2, headH - 1, 1, handleLen + 1, P.woodDark);

    // Grip wrap at the bottom.
    for (let y = h - 8; y < h; y += 2) rect(ctx, hx, y, 3, 1, P.woodDark);

    return s;
}

/** The flag's cloth texture; rendered column-by-column onto the simulated cloth. */
export function bakeFlag(w, h) {
    const s = makeCanvas(w, h);
    const { ctx } = s;

    rect(ctx, 0, 0, w, h, P.cloth);
    rect(ctx, 0, 0, w, 2, P.clothDark);
    rect(ctx, 0, h - 2, w, 2, P.clothDark);

    // A pale skull-ish sigil, so the waving is easy to read at a glance.
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    rect(ctx, cx - 3, cy - 4, 7, 6, P.bone);
    rect(ctx, cx - 2, cy + 2, 5, 2, P.bone);
    px(ctx, cx - 2, cy - 2, P.ink);
    px(ctx, cx + 2, cy - 2, P.ink);
    rect(ctx, cx - 1, cy + 2, 1, 2, P.ink);
    rect(ctx, cx + 1, cy + 2, 1, 2, P.ink);

    return s;
}

/** Wooden flagpole. */
export function bakePole(h) {
    const s = makeCanvas(4, h);
    const { ctx } = s;
    rect(ctx, 1, 0, 2, h, P.wood);
    rect(ctx, 1, 0, 1, h, P.woodLit);
    rect(ctx, 1, 0, 2, 2, P.boneDark);
    return s;
}

/**
 * Split a w x h sprite into convex chunks over a jittered grid.
 *
 * The grid's *vertices* are jittered rather than each cell independently, so
 * neighbouring chunks share exact corners — the pieces still fit together like
 * a broken stone instead of leaving gaps. Cells stay convex (matter needs that
 * without poly-decomp) because the jitter is well under half a cell.
 */
export function shatterCells(w, h, cols, rows, seed) {
    const cellW = w / cols;
    const cellH = h / rows;
    const jitter = Math.min(cellW, cellH) * 0.28;

    const points = [];
    for (let r = 0; r <= rows; r++) {
        const row = [];
        for (let c = 0; c <= cols; c++) {
            const edge = c === 0 || c === cols || r === 0 || r === rows;
            const jx = edge ? 0 : (hash2(c, r, seed) - 0.5) * 2 * jitter;
            const jy = edge ? 0 : (hash2(c, r, seed + 100) - 0.5) * 2 * jitter;
            row.push({ x: -w / 2 + c * cellW + jx, y: -h / 2 + r * cellH + jy });
        }
        points.push(row);
    }

    const cells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push([
                points[r][c],
                points[r][c + 1],
                points[r + 1][c + 1],
                points[r + 1][c],
            ]);
        }
    }
    return cells;
}

/** Dust puff sprite pool, used when a stone breaks. */
export function bakeDust() {
    return [3, 5, 7].map((size) => {
        const s = makeCanvas(size, size);
        poly(
            s.ctx,
            [
                [0, size / 2],
                [size / 2, 0],
                [size, size / 2],
                [size / 2, size],
            ],
            '#b9b3a4',
        );
        return s;
    });
}
