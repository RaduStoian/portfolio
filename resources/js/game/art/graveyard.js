import { P } from '../palette.js';
import { makeCanvas, rect, px, poly, bands, dither, speckle, hash2, outlineSprite } from '../pixel.js';
import { drawText, textWidth } from '../text.js';
import { bakeBush, bakeGlow, bakeFlowers } from './props.js';

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
 * ones — same silhouette language, different mood.
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
            plantTree(deadTree(3, 0.7), 200, 3, { amp: 1.0, speed: 1.5, phase: 3.6 }),
        ],
        bushes: [
            { sprite: bakeBush(7, 0.9), x: 82, y: GROUND_Y - 8, amp: 0.9, speed: 1.5, phase: 1.2 },
            { sprite: bakeBush(8, 1), x: 300, y: GROUND_Y - 4, amp: 1.0, speed: 1.3, phase: 2.8 },
            { sprite: bakeFlowers(2), x: 140, y: GROUND_Y + 6, amp: 0.7, speed: 2.2, phase: 0.5 },
            { sprite: bakeFlowers(0), x: 254, y: GROUND_Y + 10, amp: 0.7, speed: 2.5, phase: 1.9 },
        ],
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
 * The near side wall of a crypt, cropped hard by the right edge of the scene.
 * Its roof rises out of frame to the right and falls toward the keeper on the
 * left; the actual entrance is deliberately beyond the canvas.
 */
export function bakeCrypt() {
    const w = 72;
    const h = 88;
    const s = makeCanvas(w, h);
    const { ctx } = s;

    // Side wall below the sloping eave.
    poly(ctx, [[8, 28], [w, 2], [w, h], [8, h]], P.stoneDark);
    poly(ctx, [[11, 31], [w, 7], [w, h], [11, h]], P.stone);

    // Chunky roof cap, descending toward the left.
    for (let i = 0; i < 5; i++) {
        poly(ctx, [[4 + i, 22 + i], [w, i - 4], [w, i], [4 + i, 27 + i]], i < 2 ? P.stoneLit : P.stoneDeep);
    }

    // Irregular masonry courses follow the wall rather than the roof.
    for (let y = 38; y < h; y += 10) {
        rect(ctx, 10, y, w - 10, 1, P.stoneDeep);
        const stagger = ((y / 10) & 1) ? 11 : 20;
        for (let x = stagger; x < w; x += 20) rect(ctx, x, y - 9, 1, 9, P.stoneDark);
    }
    speckle(ctx, 12, 34, w - 12, h - 34, P.stoneLit, 0.035, 114);

    // Broken left corner and a little ivy soften the join with the yard.
    rect(ctx, 8, 34, 4, h - 34, P.stoneDeep);
    rect(ctx, 9, 35, 2, h - 35, P.stoneLit);
    for (let y = 45; y < h - 5; y += 6) {
        px(ctx, 7 + (y % 3), y, P.leafDark);
        rect(ctx, 5 + (y % 4), y + 1, 4, 2, y % 12 ? P.leaf : P.leafDark);
    }

    // A cellar entrance falling away into the earth. Only its left edge is
    // visible; the doorway and the rest of the steps continue offscreen.
    poly(ctx, [[28, 67], [49, 57], [w, 67], [w, h], [28, h]], P.stoneDeep);
    poly(ctx, [[34, 70], [52, 62], [w, 70], [w, h], [34, h]], P.ink);
    for (let y = 75, x = 37; y < h; y += 5, x += 4) {
        rect(ctx, x, y, w - x, 2, P.stoneDark);
        rect(ctx, x + 2, y, w - x - 2, 1, P.stoneLit);
    }

    // Iron wall bracket. The animated flame is drawn by the scene.
    rect(ctx, 18, 49, 8, 2, P.ironDeep);
    rect(ctx, 23, 47, 2, 9, P.ironDark);
    rect(ctx, 21, 54, 6, 2, P.ironDeep);
    px(ctx, 19, 49, P.ironLit);

    return s;
}

/** Three discrete flame shapes: stepped pixels stay crisp while flickering. */
export function bakeTorchFrames() {
    return [0, 1, 2].map((frame) => {
        const s = makeCanvas(9, 14);
        const { ctx } = s;
        const lean = frame === 0 ? -1 : frame === 2 ? 1 : 0;
        rect(ctx, 3, 9, 3, 5, P.woodDark);
        rect(ctx, 3, 9, 1, 5, P.woodLit);
        poly(ctx, [[4, 10], [1 + lean, 6], [3 + lean, 1], [5 + lean, 5], [7, 7]], P.ember);
        poly(ctx, [[4, 9], [3 + lean, 6], [4 + lean, 3], [6, 7]], P.window);
        px(ctx, 4 + lean, 7, P.lamp);
        return outlineSprite(s, P.outline);
    });
}

export function bakeTorchGlow() {
    return bakeGlow(20);
}

/**
 * A gravestone at true size. Three silhouettes so the row doesn't look cloned.
 * The sprite is the *only* source of the stone's look — when it shatters, each
 * chunk clips its own region out of this same canvas, so the crack lines run
 * through the carving exactly as they should.
 */
export function bakeGravestone(variant, epitaph) {
    const w = 26;
    const h = variant === 2 ? 42 : variant === 3 ? 40 : 36;
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
    } else if (variant === 2) {
        // Cross.
        body(9, 2, 8, h - 2);
        body(2, 11, 22, 7);
        rect(ctx, 2, 11, 22, 1, P.stoneLit);
    } else {
        // Paired pillars joined by a lintel: two people connected across a
        // distance, without turning the memorial into a tiny literal screen.
        body(3, 7, 7, h - 7);
        body(16, 7, 7, h - 7);
        body(3, 4, 20, 7);
        rect(ctx, 11, 11, 4, 3, P.glassDark);
        px(ctx, 12, 12, P.glassLit);
    }

    // Tiny pictograms give each memorial an identity before it is touched.
    // They are carved, not painted, so they still belong to the same old row.
    if (variant === 0) {
        // A deliberately cheeky little coiled pile.
        rect(ctx, 10, 12, 7, 2, P.stoneDeep);
        rect(ctx, 11, 10, 5, 2, P.stoneDeep);
        rect(ctx, 12, 8, 3, 2, P.stoneDeep);
    } else if (variant === 1) {
        // Heart for the couples game guide.
        rect(ctx, 9, 10, 3, 3, P.stoneDeep);
        rect(ctx, 14, 10, 3, 3, P.stoneDeep);
        rect(ctx, 10, 12, 6, 3, P.stoneDeep);
        rect(ctx, 12, 15, 2, 2, P.stoneDeep);
    } else if (variant === 2) {
        // Sheriff-star glint in the centre of the crosspiece.
        rect(ctx, 11, 11, 4, 7, P.stoneDeep);
        rect(ctx, 9, 13, 8, 3, P.stoneDeep);
        px(ctx, 12, 14, P.goldDark);
    }

    // Carved epitaph: two-tone so the letters read as recessed.
    const lineY = variant === 2 ? 23 : variant === 3 ? 19 : 21;
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

/**
 * A retired groundskeeper sitting side-on in a plain wooden chair. He faces
 * left toward the graves; the returned eye coordinate lets the scene blink
 * without baking a second animation frame.
 */
export function bakeGraveKeeper() {
    const s = makeCanvas(38, 47);
    const { ctx } = s;

    // Chair, behind the keeper. Both legs are deliberately uninterrupted,
    // plain brown posts so they cannot be mistaken for his boots.
    rect(ctx, 25, 8, 3, 34, P.woodDeep);
    rect(ctx, 27, 9, 2, 30, P.woodLit);
    rect(ctx, 12, 34, 18, 3, P.wood);
    rect(ctx, 14, 36, 3, 11, P.wood);
    rect(ctx, 27, 36, 3, 11, P.wood);

    // Seated coat and bent legs.
    poly(ctx, [[17, 21], [28, 23], [26, 35], [13, 35], [10, 29]], P.roofGreenDark);
    rect(ctx, 13, 23, 2, 11, P.roofGreen);
    // Thighs bend left from the seat, then two separate trouser legs and boots
    // land wholly to the left of the chair's left leg.
    rect(ctx, 8, 33, 12, 5, P.roofGreenDark);
    rect(ctx, 5, 36, 4, 9, P.ironDark);
    rect(ctx, 10, 37, 4, 8, P.ironDeep);
    rect(ctx, 2, 44, 7, 3, P.woodDeep);
    rect(ctx, 7, 44, 7, 3, P.woodDeep);
    rect(ctx, 8, 29, 13, 4, P.roofGreenDark);
    rect(ctx, 6, 30, 5, 3, P.skinDark);

    // Fresh left-facing profile: one continuous skin silhouette, with the
    // forehead, nose, mouth and chin all changing the outer edge.
    poly(ctx, [
        [14, 12], [24, 12], [24, 20], [22, 20], [22, 22],
        [18, 22], [18, 24], [14, 24], [14, 21], [11, 21],
        [11, 19], [9, 19], [9, 17], [12, 17], [12, 14], [14, 14],
    ], P.skin);
    rect(ctx, 22, 14, 2, 4, P.skinDark); // ear
    px(ctx, 13, 16, P.ink);              // eye
    px(ctx, 10, 19, P.skinDark);         // underside of nose
    px(ctx, 13, 21, P.skinDark);         // mouth gap

    // Dark silver facial hair, drawn as small jagged clusters. The moustache
    // is separated from the tapered beard by the visible mouth pixel above;
    // sparse pale pixels suggest grey hair without making another white slab.
    rect(ctx, 10, 20, 4, 1, P.stoneDeep);
    rect(ctx, 11, 21, 3, 1, P.stoneDark);
    rect(ctx, 14, 20, 5, 2, P.stoneDeep);
    poly(ctx, [
        [15, 20], [21, 19], [21, 22], [20, 22], [20, 25],
        [18, 25], [18, 28], [15, 29], [14, 27], [12, 27],
        [12, 24], [10, 24], [11, 22], [14, 22],
    ], P.stoneDark);
    px(ctx, 17, 21, P.boneDark);
    px(ctx, 13, 23, P.boneDark);
    px(ctx, 18, 24, P.boneDark);
    px(ctx, 15, 27, P.stoneLit);

    // Battered wide-brim hat.
    poly(ctx, [[20, 2], [27, 11], [13, 11]], P.woodDark);
    poly(ctx, [[20, 3], [23, 8], [16, 8]], P.wood);
    rect(ctx, 8, 10, 21, 3, P.woodDeep);
    rect(ctx, 9, 10, 19, 1, P.woodLit);

    return { sprite: outlineSprite(s, P.outline), eye: { x: 14, y: 17 } };
}

/** Compact speech bubble with its tail aimed down-right at the keeper. */
export function bakeGraveBubble(lines) {
    const label = Array.isArray(lines) ? lines : [lines];
    const w = Math.max(...label.map(textWidth)) + 8;
    const bodyH = 4 + label.length * 7;
    const s = makeCanvas(w, bodyH + 4);
    const { ctx } = s;
    rect(ctx, 0, 0, w, bodyH, P.ink);
    rect(ctx, 1, 1, w - 2, bodyH - 2, '#f4efe0');
    poly(ctx, [[w - 10, bodyH - 1], [w - 4, bodyH - 1], [w - 6, bodyH + 3]], P.ink);
    poly(ctx, [[w - 9, bodyH - 1], [w - 5, bodyH - 1], [w - 6, bodyH + 1]], '#f4efe0');
    label.forEach((line, i) => drawText(ctx, line, 4, 3 + i * 7, P.ink));
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
