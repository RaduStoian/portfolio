import { P } from '../palette.js';
import { makeCanvas, rect, px, bands, dither, speckle, hash2, poly, isoDiamond, outlineSprite } from '../pixel.js';
import { alphaMask, makeHighlight, isoBox, isoRoof, windowPane } from './shared.js';
import { bakeTree, bakeBush, bakeLamp, bakeBarrel, bakeCrate, bakeFlowers, bakeSignpost, bakeGlow } from './props.js';

export const OVERWORLD_W = 320;
export const OVERWORLD_H = 180;

const HORIZON = 96;

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

/**
 * Golden-hour sky. Stars are NOT baked in here — they're drawn per frame so
 * they can twinkle, and baking them would freeze them into the backdrop.
 */
function bakeSky() {
    const s = makeCanvas(OVERWORLD_W, OVERWORLD_H);
    const { ctx } = s;

    bands(ctx, 0, 0, OVERWORLD_W, HORIZON, [P.skyTop, P.skyMid, P.skyLow, P.skyWarm, P.skyGlow]);
    dither(ctx, 0, 16, OVERWORLD_W, 8, P.skyTop, P.skyMid, 0.5);
    dither(ctx, 0, 35, OVERWORLD_W, 8, P.skyMid, P.skyLow, 0.5);
    dither(ctx, 0, 54, OVERWORLD_W, 8, P.skyLow, P.skyWarm, 0.5);
    dither(ctx, 0, 73, OVERWORLD_W, 8, P.skyWarm, P.skyGlow, 0.5);
    // Warmest light pooling right at the horizon, behind the buildings.
    dither(ctx, 0, HORIZON - 10, OVERWORLD_W, 10, P.skyGlow, P.skyGold, 0.55);

    // Long flat clouds catching the low sun on their undersides.
    const cloud = (cx, cy, len, thickness) => {
        for (let i = 0; i < len; i++) {
            const t = i / len;
            const h = Math.max(1, Math.round(Math.sin(t * Math.PI) * thickness));
            for (let k = 0; k < h; k++) {
                px(ctx, cx + i, cy - k, k === 0 ? P.skyGold : '#8f7ba8');
            }
        }
    };
    cloud(18, 30, 54, 3);
    cloud(120, 20, 70, 4);
    cloud(210, 42, 48, 3);
    cloud(64, 56, 40, 2);
    cloud(240, 64, 62, 3);

    // Sun sitting on the horizon.
    for (let y = -10; y <= 10; y++) {
        for (let x = -10; x <= 10; x++) {
            if (x * x + y * y <= 100 && HORIZON - 6 + y < HORIZON) {
                px(ctx, 176 + x, HORIZON - 6 + y, x * x + y * y < 64 ? '#fff2c8' : P.skyGold);
            }
        }
    }

    return s;
}

/** Distant hills, so the horizon isn't a ruler-straight line. */
function bakeHills(ctx) {
    for (let x = 0; x < OVERWORLD_W; x++) {
        const h = 10 + Math.sin(x * 0.017) * 6 + Math.sin(x * 0.05 + 1) * 3;
        rect(ctx, x, HORIZON - h, 1, h + 2, P.grassDeep);
        px(ctx, x, HORIZON - h, P.grassDark);
    }
}

/**
 * The plaza: a diamond of isometric tiles, plus a dirt path running off the
 * bottom of the frame. Deliberately *painted* — there's no grid data behind it
 * and nothing walks on it. Adding a player character means redoing this.
 */
function bakeGround(ctx) {
    rect(ctx, 0, HORIZON, OVERWORLD_W, OVERWORLD_H - HORIZON, P.grass);

    // Grass gets darker towards the camera, which reads as depth.
    dither(ctx, 0, HORIZON, OVERWORLD_W, 8, P.grassDark, P.grass, 0.5);
    dither(ctx, 0, OVERWORLD_H - 26, OVERWORLD_W, 12, P.grass, P.grassDark, 0.45);
    speckle(ctx, 0, HORIZON, OVERWORLD_W, OVERWORLD_H - HORIZON, P.grassLit, 0.055, 3);
    speckle(ctx, 0, HORIZON, OVERWORLD_W, OVERWORLD_H - HORIZON, P.grassDark, 0.05, 11);

    // Grass blades: 2px verticals, denser near the camera.
    for (let y = HORIZON + 4; y < OVERWORLD_H; y += 3) {
        for (let x = 0; x < OVERWORLD_W; x++) {
            if (hash2(x, y, 61) > 0.93) {
                rect(ctx, x, y - 2, 1, 2, P.grassLit);
                px(ctx, x, y - 3, P.grassLit);
            }
        }
    }

    // Dirt path from the plaza towards the viewer, widening as it nears.
    for (let y = 140; y < OVERWORLD_H; y++) {
        const t = (y - 140) / (OVERWORLD_H - 140);
        const half = 10 + t * 26;
        const cx = 160 + Math.sin(t * 1.6) * 6;
        rect(ctx, cx - half, y, half * 2, 1, P.dirt);
        // Ragged, speckled edges rather than a clean border.
        for (let k = 0; k < 4; k++) {
            if (hash2(y, k, 8) > 0.45) px(ctx, cx - half + k, y, P.dirtDark);
            if (hash2(y, k, 9) > 0.45) px(ctx, cx + half - k, y, P.dirtDark);
        }
        if (hash2(y, 0, 12) > 0.7) px(ctx, cx + Math.round((hash2(y, 1, 3) - 0.5) * half), y, P.dirtLit);
    }

    // Cobbled plaza. Tile colours stay in the top half of the stone ramp: an
    // earlier version reached down to stoneDeep and the dark tiles read as
    // holes in the pavement rather than as cobbles.
    const originX = 160;
    const originY = 132;
    const tileW = 16;
    const radius = 5;

    for (let row = -radius; row <= radius; row++) {
        for (let col = -radius; col <= radius; col++) {
            if (Math.abs(row) + Math.abs(col) > radius + 1) continue;

            const cx = originX + (col - row) * (tileW / 2);
            const cy = originY + (col + row) * (tileW / 4);
            if (cy < HORIZON + 2) continue;

            const n = hash2(col, row, 21);
            const color = n > 0.7 ? P.stoneLit : n > 0.28 ? P.stone : P.stoneDark;
            isoDiamond(ctx, cx, cy, tileW / 2, color);
            if (n > 0.88) px(ctx, cx, cy - 1, P.stoneDark);
            // Moss creeping between the cobbles at the plaza's edge.
            if (Math.abs(row) + Math.abs(col) >= radius && n > 0.5) px(ctx, cx, cy + 1, P.grassDark);
        }
    }

    // Well, sitting in the middle of the square. The water surface is left flat
    // here; the scene animates a shimmer over it each frame.
    const wellX = originX;
    const wellY = originY + 8;
    rect(ctx, wellX - 9, wellY - 3, 18, 8, P.stoneDark);
    rect(ctx, wellX - 9, wellY - 4, 18, 2, P.stoneLit);
    rect(ctx, wellX - 7, wellY - 2, 14, 5, '#2c4a63');
    for (let x = -9; x <= 9; x++) if (hash2(x, 1, 4) > 0.6) px(ctx, wellX + x, wellY + 4, P.stoneDeep);
    // Posts and a little roof over it.
    rect(ctx, wellX - 8, wellY - 16, 2, 13, P.woodDark);
    rect(ctx, wellX + 6, wellY - 16, 2, 13, P.woodDark);
    poly(ctx, [[wellX - 12, wellY - 16], [wellX, wellY - 23], [wellX + 12, wellY - 16]], P.roofRed);
    rect(ctx, wellX - 12, wellY - 16, 25, 2, P.roofRedDark);

    return { wellX, wellY };
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

/** Projects — a timber workshop with a wide shutter door and a chimney. */
function bakeWorkshop() {
    const s = makeCanvas(74, 76);
    const { ctx } = s;
    const oy = 62;

    isoBox(ctx, 4, oy, 44, 18, 34, {
        wall: P.woodLit,
        wallDark: P.wood,
        wallSeam: P.woodDark,
        texture: 'planks',
    });
    isoRoof(ctx, 4, oy - 34, 44, 18, 12, P.roofBlue, P.roofBlueDark);

    // Brick chimney.
    rect(ctx, 34, oy - 56, 8, 14, P.roofRedDark);
    for (let y = oy - 54; y < oy - 44; y += 3) rect(ctx, 34, y, 8, 1, P.woodDeep);
    rect(ctx, 33, oy - 57, 10, 3, P.stoneDark);

    windowPane(ctx, 9, oy - 28, 8, 8, P.woodDeep, P.window, P.windowWarm);
    windowPane(ctx, 34, oy - 28, 8, 8, P.woodDeep, P.window, P.windowWarm);

    // Flower box under the left window.
    rect(ctx, 7, oy - 18, 12, 3, P.woodDark);
    px(ctx, 9, oy - 19, P.flowerPink);
    px(ctx, 12, oy - 19, P.flowerYellow);
    px(ctx, 16, oy - 19, P.flowerPink);

    // Wide shutter door with slats and hinges.
    rect(ctx, 17, oy - 17, 20, 17, P.woodDark);
    for (let y = oy - 15; y < oy; y += 3) rect(ctx, 18, y, 18, 1, P.woodDeep);
    rect(ctx, 16, oy - 18, 22, 2, P.woodDeep);
    rect(ctx, 26, oy - 10, 2, 2, P.stoneLit);

    // Sign board fixed above the door. It used to hang from a bracket past the
    // wall's right edge, where it floated over the receding face and read as a
    // detached blob.
    rect(ctx, 19, oy - 25, 16, 6, P.wood);
    rect(ctx, 19, oy - 25, 16, 1, P.woodLit);
    rect(ctx, 19, oy - 20, 16, 1, P.woodDeep);
    rect(ctx, 22, oy - 23, 4, 1, P.woodDeep);
    rect(ctx, 28, oy - 23, 5, 1, P.woodDeep);
    rect(ctx, 22, oy - 22, 8, 1, P.woodDeep);

    return alphaMask(outlineSprite(s, P.outline));
}

/** Graveyard — a stone chapel with a lit archway and iron railings. */
function bakeChapel() {
    const s = makeCanvas(80, 84);
    const { ctx } = s;
    const oy = 70;

    isoBox(ctx, 14, oy, 36, 16, 30, {
        wall: P.stone,
        wallDark: P.stoneDark,
        wallLit: P.stoneLit,
        wallSeam: P.stoneDeep,
        texture: 'stone',
    });
    isoRoof(ctx, 14, oy - 30, 36, 16, 10, P.roofPurple, P.roofPurpleDark);

    // Steeple with its own little roof and a bell.
    rect(ctx, 26, oy - 56, 12, 18, P.stone);
    for (let y = oy - 52; y < oy - 38; y += 5) rect(ctx, 26, y, 12, 1, P.stoneDark);
    poly(ctx, [[23, oy - 56], [32, oy - 72], [41, oy - 56]], P.roofPurple);
    poly(ctx, [[32, oy - 72], [41, oy - 56], [36, oy - 56]], P.roofPurpleDark);
    rect(ctx, 23, oy - 57, 18, 2, P.roofPurpleDark);
    // Belfry opening with a bell inside.
    rect(ctx, 29, oy - 52, 6, 8, P.inkSoft);
    rect(ctx, 30, oy - 50, 4, 4, P.windowDim);
    px(ctx, 32, oy - 46, P.woodDeep);

    // Rose window with tracery.
    for (let y = -5; y <= 5; y++) {
        for (let x = -5; x <= 5; x++) {
            const d = x * x + y * y;
            if (d <= 25) px(ctx, 32 + x, oy - 22 + y, d > 16 ? P.stoneDeep : P.window);
        }
    }
    rect(ctx, 32, oy - 27, 1, 11, P.stoneDeep);
    rect(ctx, 27, oy - 22, 11, 1, P.stoneDeep);

    // Arched doorway, lit warmly from inside. A flat black cut-out read as a
    // rendering bug at a glance, so light pools towards the threshold.
    for (let y = 0; y < 18; y++) {
        const t = y / 18;
        const halfW = Math.round(6 * Math.min(1, t * 2.4));
        if (!halfW) continue;
        rect(ctx, 32 - halfW, oy - 18 + y, halfW * 2, 1, P.inkSoft);
        if (y > 8) rect(ctx, 32 - halfW + 1, oy - 18 + y, halfW * 2 - 2, 1, y > 13 ? P.windowDim : '#5a4258');
    }
    rect(ctx, 24, oy - 19, 16, 1, P.stoneLit);
    rect(ctx, 25, oy - 20, 14, 1, P.stoneDark);

    // Iron railings either side, with a gate post each end.
    for (let x = 3; x < 14; x += 3) rect(ctx, x, oy - 11, 1, 11, P.inkSoft);
    for (let x = 52; x < 68; x += 3) rect(ctx, x, oy - 11, 1, 11, P.inkSoft);
    rect(ctx, 3, oy - 11, 11, 1, P.inkSoft);
    rect(ctx, 52, oy - 11, 16, 1, P.inkSoft);
    rect(ctx, 2, oy - 14, 2, 14, P.stoneDark);
    rect(ctx, 67, oy - 14, 2, 14, P.stoneDark);

    // Headstones out front, advertising what's inside.
    rect(ctx, 6, oy - 7, 5, 7, P.stoneLit);
    px(ctx, 8, oy - 5, P.stoneDeep);
    rect(ctx, 58, oy - 6, 4, 6, P.stoneLit);

    return alphaMask(outlineSprite(s, P.outline));
}

/** Career — a stone clock tower. */
function bakeTower() {
    const s = makeCanvas(58, 98);
    const { ctx } = s;
    const oy = 84;

    isoBox(ctx, 10, oy, 26, 14, 62, {
        wall: P.stoneLit,
        wallDark: P.stone,
        wallLit: '#c9c3b4',
        wallSeam: P.stoneDark,
        texture: 'stone',
    });
    isoRoof(ctx, 10, oy - 62, 26, 14, 13, P.roofGreen, P.roofGreenDark);

    // String courses every 15px read as floors.
    for (let y = oy - 50; y < oy; y += 15) {
        rect(ctx, 9, y, 28, 2, P.stoneDark);
        for (let k = 0; k < 14; k++) px(ctx, 36 + k, Math.round(y - k / 2), P.stoneDark);
    }

    windowPane(ctx, 14, oy - 44, 7, 9, P.stoneDeep, P.window, P.windowWarm);
    windowPane(ctx, 25, oy - 44, 7, 9, P.stoneDeep, P.window, P.windowWarm);
    windowPane(ctx, 14, oy - 28, 7, 9, P.stoneDeep, P.windowDim, P.windowDim);
    windowPane(ctx, 25, oy - 28, 7, 9, P.stoneDeep, P.window, P.windowWarm);

    // Clock face. Hands are baked at a fixed time — the scene doesn't animate
    // them, and a ticking clock would fight the frozen golden hour.
    for (let y = -7; y <= 7; y++) {
        for (let x = -7; x <= 7; x++) {
            const d = x * x + y * y;
            if (d <= 49) px(ctx, 23 + x, oy - 56 + y, d > 36 ? P.stoneDeep : P.bone);
        }
    }
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        px(ctx, Math.round(23 + Math.sin(a) * 5), Math.round(oy - 56 - Math.cos(a) * 5), P.stoneDark);
    }
    rect(ctx, 23, oy - 60, 1, 5, P.ink);
    rect(ctx, 23, oy - 56, 4, 1, P.ink);
    px(ctx, 23, oy - 56, P.ember);

    // Door with a step.
    rect(ctx, 14, oy - 13, 10, 13, P.woodDark);
    rect(ctx, 14, oy - 14, 10, 1, P.woodDeep);
    px(ctx, 22, oy - 7, P.lamp);
    rect(ctx, 13, oy - 1, 12, 1, P.stoneDark);

    // Ivy climbing the left corner.
    for (let y = oy - 40; y < oy; y++) {
        if (hash2(0, y, 7) > 0.45) px(ctx, 10 + Math.round(hash2(1, y, 2) * 2), y, P.leafDark);
        if (hash2(0, y, 17) > 0.75) px(ctx, 11 + Math.round(hash2(1, y, 5) * 2), y, P.leaf);
    }

    return alphaMask(outlineSprite(s, P.outline));
}

/** Me — a timber-framed cottage with a garden. */
function bakeCottage() {
    const s = makeCanvas(68, 64);
    const { ctx } = s;
    const oy = 52;

    isoBox(ctx, 6, oy, 34, 16, 22, {
        wall: P.bone,
        wallDark: P.boneDark,
        wallSeam: P.woodDark,
    });
    isoRoof(ctx, 6, oy - 22, 34, 16, 13, P.roofRed, P.roofRedDark);

    // Exposed timber framing — the detail that makes it read as a cottage.
    rect(ctx, 6, oy - 22, 34, 1, P.woodDark);
    rect(ctx, 6, oy - 12, 34, 1, P.woodDark);
    rect(ctx, 6, oy - 1, 34, 1, P.woodDark);
    rect(ctx, 13, oy - 22, 1, 22, P.woodDark);
    rect(ctx, 32, oy - 22, 1, 22, P.woodDark);
    // Corner braces only, in the upper panels. Full-height diagonals used to
    // meet over the door and the whole front read as an envelope.
    for (let i = 0; i < 6; i++) px(ctx, 7 + i, oy - 21 + i, P.woodDark);
    for (let i = 0; i < 6; i++) px(ctx, 39 - i, oy - 21 + i, P.woodDark);

    // Round-topped door.
    rect(ctx, 18, oy - 11, 9, 11, P.wood);
    rect(ctx, 19, oy - 13, 7, 2, P.wood);
    rect(ctx, 18, oy - 11, 1, 11, P.woodLit);
    rect(ctx, 26, oy - 11, 1, 11, P.woodDeep);
    px(ctx, 25, oy - 6, P.lamp);

    windowPane(ctx, 8, oy - 20, 6, 6, P.woodDark, P.window, P.windowWarm);
    windowPane(ctx, 34, oy - 20, 6, 6, P.woodDark, P.window, P.windowWarm);
    // Window box.
    rect(ctx, 7, oy - 12, 8, 2, P.woodDark);
    px(ctx, 8, oy - 13, P.flowerPink);
    px(ctx, 11, oy - 13, P.flowerBlue);
    px(ctx, 13, oy - 13, P.flowerYellow);

    // Chimney (the scene puffs smoke from its top).
    rect(ctx, 29, oy - 42, 6, 10, P.roofRedDark);
    rect(ctx, 28, oy - 43, 8, 2, P.stoneDark);

    return alphaMask(outlineSprite(s, P.outline));
}

/**
 * Contact shadow: a squashed, dithered ellipse. Without these the buildings
 * look pasted onto the plaza instead of standing on it — but they have to stay
 * subtle, an earlier version was so large and dark it read as a crater.
 */
function bakeShadow(w) {
    const h = Math.max(5, Math.round(w * 0.22));
    const s = makeCanvas(w + 2, h + 2);
    const cx = (w + 2) / 2;
    const cy = (h + 2) / 2;

    for (let y = 0; y < s.h; y++) {
        for (let x = 0; x < s.w; x++) {
            const nx = (x - cx) / (w / 2);
            const ny = (y - cy) / (h / 2);
            const d = nx * nx + ny * ny;
            if (d > 1) continue;
            if (d > 0.5 && (x + y) % 2) continue;
            px(s.ctx, x, y, 'rgba(30, 22, 40, 0.28)');
        }
    }
    return s;
}

/** Small pennant flown from the tower; the scene waves it per frame. */
function bakeBanner() {
    const s = makeCanvas(16, 10);
    const { ctx } = s;
    rect(ctx, 0, 0, 16, 10, P.cloth);
    rect(ctx, 0, 0, 16, 2, P.clothDark);
    rect(ctx, 0, 8, 16, 2, P.clothDark);
    rect(ctx, 5, 3, 6, 4, P.lamp);
    px(ctx, 7, 4, P.clothDark);
    return s;
}

// ---------------------------------------------------------------------------

/**
 * Bake everything the overworld needs, once. Returns plain data: the scene
 * component owns no art logic, and re-baking only ever happens on reload.
 */
export function bakeOverworld() {
    const background = bakeSky();
    bakeHills(background.ctx);
    const { wellX, wellY } = bakeGround(background.ctx);

    const defs = [
        { id: 'projects', label: 'Projects', route: '/projects', sprite: bakeWorkshop(), x: 22, y: 62 },
        { id: 'graveyard', label: 'Graveyard', route: '/graveyard', sprite: bakeChapel(), x: 108, y: 46 },
        { id: 'career', label: 'Career', route: '/career', sprite: bakeTower(), x: 198, y: 34 },
        { id: 'me', label: 'About Me', route: '/about', sprite: bakeCottage(), x: 248, y: 74 },
    ];

    const buildings = defs.map((def) => ({
        ...def,
        highlight: makeHighlight(def.sprite),
        shadow: bakeShadow(Math.round(def.sprite.w * 0.72)),
        // Sort key: things lower on screen are nearer the camera, so they draw
        // last and overlap what's behind them.
        baseY: def.y + def.sprite.h,
    }));

    buildings.sort((a, b) => a.baseY - b.baseY);

    // Scenery. `sway` gives each prop its own phase so the whole town doesn't
    // move as one block, which instantly reads as fake.
    const trees = [
        { sprite: bakeTree(1, 1), x: 2, y: 104, amp: 1.6, speed: 0.9, phase: 0.0 },
        { sprite: bakeTree(2, 0.8), x: 88, y: 108, amp: 1.3, speed: 1.15, phase: 1.7 },
        { sprite: bakeTree(3, 1.15), x: 286, y: 96, amp: 1.8, speed: 0.8, phase: 3.1 },
        { sprite: bakeTree(4, 0.7), x: 178, y: 112, amp: 1.1, speed: 1.3, phase: 2.2 },
    ];

    const bushes = [
        { sprite: bakeBush(1, 1), x: 60, y: 140, amp: 1, speed: 1.6, phase: 0.4 },
        { sprite: bakeBush(2, 0.9), x: 232, y: 150, amp: 1, speed: 1.4, phase: 2.5 },
        { sprite: bakeBush(3, 1.1), x: 296, y: 146, amp: 1.2, speed: 1.5, phase: 1.1 },
        { sprite: bakeBush(4, 0.8), x: 12, y: 152, amp: 0.9, speed: 1.8, phase: 3.4 },
        { sprite: bakeBush(5, 1), x: 122, y: 158, amp: 1, speed: 1.5, phase: 0.9 },
    ];

    const flowers = [
        { sprite: bakeFlowers(0), x: 44, y: 158, amp: 0.8, speed: 2.1, phase: 0.2 },
        { sprite: bakeFlowers(1), x: 76, y: 168, amp: 0.8, speed: 2.4, phase: 1.4 },
        { sprite: bakeFlowers(2), x: 246, y: 164, amp: 0.8, speed: 2.2, phase: 2.9 },
        { sprite: bakeFlowers(1), x: 210, y: 172, amp: 0.8, speed: 2.6, phase: 0.7 },
        { sprite: bakeFlowers(0), x: 274, y: 156, amp: 0.8, speed: 2.0, phase: 2.1 },
    ];

    const statics = [
        { sprite: bakeLamp(), x: 96, y: 124, glow: { x: 100, y: 128 } },
        { sprite: bakeLamp(), x: 220, y: 128, glow: { x: 224, y: 132 } },
        { sprite: bakeBarrel(), x: 70, y: 122 },
        { sprite: bakeCrate(), x: 82, y: 125 },
        { sprite: bakeSignpost(), x: 140, y: 150 },
    ];

    // Stars twinkle, so they live as data rather than baked pixels. Only the
    // upper sky, and skipped entirely near the bright horizon.
    const stars = [];
    for (let i = 0; i < 90; i++) {
        const x = Math.floor(hash2(i, 1, 91) * OVERWORLD_W);
        const y = Math.floor(hash2(i, 2, 92) * 62);
        if (hash2(i, 3, 93) < y / 70) continue;
        stars.push({ x, y, phase: hash2(i, 4, 94) * Math.PI * 2, speed: 0.7 + hash2(i, 5, 95) * 2.2 });
    }

    const fireflies = [];
    for (let i = 0; i < 12; i++) {
        fireflies.push({
            x: 20 + hash2(i, 6, 96) * (OVERWORLD_W - 40),
            y: HORIZON + 8 + hash2(i, 7, 97) * 60,
            phase: hash2(i, 8, 98) * Math.PI * 2,
            speed: 0.4 + hash2(i, 9, 99) * 0.5,
            range: 6 + hash2(i, 10, 100) * 12,
        });
    }

    return {
        background,
        buildings,
        trees,
        bushes,
        flowers,
        statics,
        stars,
        fireflies,
        banner: bakeBanner(),
        lampGlow: bakeGlow(14),
        windowGlow: bakeGlow(9),
        well: { x: wellX, y: wellY },
        // Chimney tips, in scene coordinates, for the smoke puffs.
        smoke: [
            { x: 60, y: 68 },
            { x: 280, y: 84 },
        ],
    };
}
