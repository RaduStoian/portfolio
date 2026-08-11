import { P } from '../palette.js';
import { makeCanvas, rect, px, bands, dither, speckle, hash2, poly, outlineSprite } from '../pixel.js';
import { drawText, textWidth } from '../text.js';
import { bakeBarrel, bakeCrate, bakeGlow } from './props.js';

// The projects scene: an RPG curio shop. Each project on the wall is a physical
// object made of a *material*, and the material is the whole point — the scene
// is only interesting if you can tell at a glance that the orb will smash, the
// statue will thud, and the anvil will never do either.

export const SHOP_W = 320;
export const SHOP_H = 180;
export const FLOOR_Y = 158;

/**
 * Top surface of each shelf board, and the span it covers.
 *
 * Two shelves, one per pair of projects. There was a third holding bottles and
 * books, and it earned nothing: a shelf of props in a shop where every other
 * object is a project taught the visitor that some things here are just set
 * dressing. Its space now belongs to the anvil.
 *
 * The numbers are not free. Each shelf has to clear the tallest thing standing
 * on it *plus* its plinth — 38px for the chest on its two-line plinth, 37 for
 * the gilded statue — and the top one has to stay under the rafter at y=20.
 */
export const SHELVES = [
    { y: 57, x0: 10, x1: 166 },
    { y: 101, x0: 10, x1: 166 },
];
export const SHELF_THICKNESS = 3;

export const COUNTER = { x: 224, y: 134, w: 90, h: SHOP_H - 134 };

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

/** Wall, floor, shelves, counter-side window — everything that never moves. */
export function bakeShopBackdrop() {
    const s = makeCanvas(SHOP_W, SHOP_H);
    const { ctx } = s;

    // Ceiling and its rafter. Dark, so the eye falls to the lit shelves.
    rect(ctx, 0, 0, SHOP_W, 20, P.woodDeep);
    rect(ctx, 0, 14, SHOP_W, 4, P.woodDark);
    rect(ctx, 0, 14, SHOP_W, 1, P.wood);
    for (let x = 6; x < SHOP_W; x += 34) rect(ctx, x, 0, 2, 14, P.woodDeep);

    // Wall: vertical planks. Vertical rather than horizontal so it doesn't
    // stripe in parallel with the three shelf boards, which made the back of
    // the room read as one big ladder.
    //
    // Deliberately a step darker than everything standing on it. At the first
    // pass the wall, the shelves, the plinths and the floor were all the same
    // mid-brown and the whole scene flattened into one wooden mass — a shop is
    // only legible if the merchandise out-values its backdrop.
    rect(ctx, 0, 20, SHOP_W, FLOOR_Y - 20, P.woodDark);
    dither(ctx, 0, 20, SHOP_W, 16, P.woodDeep, P.woodDark, 0.6);
    for (let x = 0; x < SHOP_W; x += 11) {
        rect(ctx, x, 20, 1, FLOOR_Y - 20, P.woodDeep);
        // Only every other plank catches the light, or the wall reads as a
        // barcode.
        if ((x / 11) % 2) rect(ctx, x + 1, 20, 1, FLOOR_Y - 20, P.wood);
    }
    speckle(ctx, 0, 20, SHOP_W, FLOOR_Y - 20, P.woodDeep, 0.05, 31);

    // Wainscot along the bottom of the wall, with a capping rail.
    rect(ctx, 0, 138, SHOP_W, FLOOR_Y - 138, P.woodDeep);
    for (let x = 0; x < SHOP_W; x += 7) rect(ctx, x, 140, 1, FLOOR_Y - 140, '#33200f');
    rect(ctx, 0, 137, SHOP_W, 2, P.wood);
    rect(ctx, 0, 139, SHOP_W, 1, P.woodDeep);

    // Floorboards, receding courses.
    rect(ctx, 0, FLOOR_Y, SHOP_W, SHOP_H - FLOOR_Y, P.woodDark);
    for (let y = FLOOR_Y; y < SHOP_H; y += 6) {
        rect(ctx, 0, y, SHOP_W, 1, P.woodDeep);
        rect(ctx, 0, y + 1, SHOP_W, 1, P.wood);
        // Staggered end joints, or the floor reads as one printed texture.
        for (let x = ((y / 6) % 2 ? 18 : 40); x < SHOP_W; x += 46) {
            rect(ctx, x, y + 1, 1, 5, P.woodDeep);
        }
    }
    speckle(ctx, 0, FLOOR_Y, SHOP_W, SHOP_H - FLOOR_Y, P.woodDeep, 0.05, 44);

    // Rug: something for dropped things to land on, and a warm mid-tone that
    // stops the floor from being a single brown band.
    const rugX = 62;
    const rugW = 150;
    rect(ctx, rugX, FLOOR_Y + 4, rugW, 14, P.clothDark);
    rect(ctx, rugX + 2, FLOOR_Y + 6, rugW - 4, 10, P.cloth);
    rect(ctx, rugX + 6, FLOOR_Y + 8, rugW - 12, 6, P.clothDark);
    for (let x = rugX + 10; x < rugX + rugW - 10; x += 8) {
        rect(ctx, x, FLOOR_Y + 9, 3, 4, P.gold);
        px(ctx, x + 1, FLOOR_Y + 10, P.goldLit);
    }
    for (let x = rugX; x < rugX + rugW; x += 3) {
        rect(ctx, x, FLOOR_Y + 2, 1, 2, P.clothDark);
        rect(ctx, x, FLOOR_Y + 18, 1, 2, P.clothDark);
    }

    // Window behind the counter, looking out on the overworld's golden hour —
    // same sky keys as the town square, so the shop is obviously *in* it.
    windowOnWall(ctx, 246, 26, 50, 34);

    // Shelf boards with bracket corbels.
    for (const shelf of SHELVES) {
        const w = shelf.x1 - shelf.x0;
        rect(ctx, shelf.x0, shelf.y, w, SHELF_THICKNESS, P.wood);
        rect(ctx, shelf.x0, shelf.y, w, 1, P.woodLit);
        rect(ctx, shelf.x0, shelf.y + SHELF_THICKNESS - 1, w, 1, P.woodDeep);
        // Contact shadow under the board sells it as sitting off the wall.
        ctx.globalAlpha = 0.28;
        rect(ctx, shelf.x0, shelf.y + SHELF_THICKNESS, w, 2, P.ink);
        ctx.globalAlpha = 1;

        for (const bx of [shelf.x0 + 12, shelf.x1 - 20]) {
            for (let k = 0; k < 8; k++) {
                rect(ctx, bx, shelf.y + SHELF_THICKNESS + k, 8 - k, 1, P.woodDark);
                px(ctx, bx, shelf.y + SHELF_THICKNESS + k, P.wood);
            }
        }
    }

    // Hanging shop sign, in the gap of wall between the shelves and the
    // counter — over the window it just read as a shutter.
    const signW = textWidth('CURIOS') + 8;
    const signX = 195 - Math.round(signW / 2);
    rect(ctx, signX + 3, 20, 1, 6, P.ironDark);
    rect(ctx, signX + signW - 4, 20, 1, 6, P.ironDark);
    rect(ctx, signX, 26, signW, 12, P.woodDark);
    rect(ctx, signX, 26, signW, 1, P.wood);
    rect(ctx, signX + 1, 27, signW - 2, 10, P.woodDeep);
    drawText(ctx, 'CURIOS', signX + 4, 29, P.goldLit);

    return s;
}

function windowOnWall(ctx, x, y, w, h) {
    // Frame first, then the view punched inside it.
    rect(ctx, x - 2, y - 2, w + 4, h + 4, P.woodDeep);
    rect(ctx, x - 2, y - 2, w + 4, 1, P.woodDark);

    bands(ctx, x, y, w, h, [P.skyMid, P.skyLow, P.skyWarm, P.skyGlow, P.skyGold]);
    dither(ctx, x, y + 8, w, 6, P.skyMid, P.skyLow, 0.5);
    dither(ctx, x, y + 18, w, 6, P.skyWarm, P.skyGlow, 0.5);

    // Far hills and a couple of rooftops, so it reads as the town outside.
    for (let i = 0; i < w; i++) {
        const hh = 7 + Math.sin(i * 0.14) * 3 + Math.sin(i * 0.05) * 2;
        rect(ctx, x + i, y + h - hh, 1, hh, P.grassDeep);
    }
    poly(ctx, [[x + 8, y + h - 8], [x + 15, y + h - 15], [x + 22, y + h - 8]], P.roofRedDark);
    poly(ctx, [[x + 30, y + h - 6], [x + 36, y + h - 12], [x + 42, y + h - 6]], P.roofBlueDark);

    // Muntins and sill.
    rect(ctx, x + Math.floor(w / 2), y, 1, h, P.woodDeep);
    rect(ctx, x, y + Math.floor(h / 2), w, 1, P.woodDeep);
    rect(ctx, x - 4, y + h + 2, w + 8, 2, P.woodDark);
    rect(ctx, x - 4, y + h + 2, w + 8, 1, P.woodLit);
}

/**
 * The counter, drawn *in front of* the shopkeeper so they stand behind it. It's
 * also a static body, so you can bounce things off it.
 */
export function bakeCounter() {
    const { w, h } = COUNTER;
    const s = makeCanvas(w, h);
    const { ctx } = s;

    // Top slab with a lit front lip.
    rect(ctx, 0, 0, w, 4, P.woodLit);
    rect(ctx, 0, 3, w, 1, P.woodDark);
    rect(ctx, 0, 4, w, h - 4, P.wood);

    // Panelled front.
    for (let x = 4; x < w - 6; x += 22) {
        rect(ctx, x, 8, 18, h - 13, P.woodDark);
        rect(ctx, x + 1, 9, 16, h - 15, P.wood);
        rect(ctx, x + 1, 9, 16, 1, P.woodLit);
    }
    rect(ctx, 0, h - 4, w, 4, P.woodDeep);

    return s;
}

/**
 * Things standing on the counter top. Kept out of `bakeCounter` because they
 * poke above it and would otherwise be clipped by the counter's own canvas.
 */
export function bakeCounterTop() {
    const s = makeCanvas(46, 16);
    const { ctx } = s;

    // Candle in a dish.
    rect(ctx, 4, 6, 3, 8, P.bone);
    rect(ctx, 4, 6, 1, 8, '#fffaf0');
    rect(ctx, 2, 14, 7, 2, P.ironDark);
    px(ctx, 5, 4, P.ember);
    px(ctx, 5, 3, P.lamp);

    // Open ledger.
    rect(ctx, 14, 10, 16, 4, P.bone);
    rect(ctx, 14, 10, 16, 1, '#fffaf0');
    rect(ctx, 21, 10, 1, 4, P.boneDark);
    for (let y = 11; y < 14; y += 1) {
        if (y % 2) rect(ctx, 16, y, 4, 1, P.boneDark);
        else rect(ctx, 24, y, 4, 1, P.boneDark);
    }
    // Quill.
    for (let k = 0; k < 6; k++) px(ctx, 31 + k, 12 - k, P.bone);

    // Brass scales.
    rect(ctx, 38, 4, 1, 10, P.goldDark);
    rect(ctx, 34, 4, 9, 1, P.gold);
    rect(ctx, 34, 5, 3, 2, P.goldLit);
    rect(ctx, 40, 5, 3, 2, P.goldLit);
    rect(ctx, 36, 14, 5, 2, P.goldDark);

    return s;
}

/**
 * The shopkeeper: a hooded merchant, arms folded, watching you handle the
 * merchandise. Eyes are returned as coordinates rather than baked shut so the
 * scene can blink them by painting a lid pixel — one baked frame plus two
 * pixels is cheaper than a second sprite and reads exactly the same.
 */
export function bakeShopkeeper() {
    const w = 30;
    const h = 56;
    const s = makeCanvas(w, h);
    const { ctx } = s;
    const cx = 15;

    // Robe, widening to the floor.
    for (let y = 22; y < h; y++) {
        const half = 5 + Math.round(((y - 22) / (h - 22)) * 8);
        rect(ctx, cx - half, y, half * 2, 1, P.roofPurple);
        rect(ctx, cx - half, y, 2, 1, '#9a74bd');
        rect(ctx, cx + half - 2, y, 2, 1, P.roofPurpleDark);
    }
    // Robe seam and hem.
    rect(ctx, cx - 1, 26, 1, h - 26, P.roofPurpleDark);
    rect(ctx, cx - 12, h - 3, 24, 3, P.roofPurpleDark);

    // Folded arms resting across the belly, with sleeves.
    rect(ctx, cx - 8, 34, 16, 5, P.roofPurpleDark);
    rect(ctx, cx - 8, 34, 16, 1, P.roofPurple);
    rect(ctx, cx - 5, 36, 5, 3, P.skinDark);
    rect(ctx, cx, 36, 5, 3, P.skin);

    // Sash.
    rect(ctx, cx - 9, 40, 18, 2, P.cloth);
    rect(ctx, cx - 9, 41, 18, 1, P.clothDark);
    px(ctx, cx + 1, 40, P.goldLit);

    // Head.
    rect(ctx, cx - 5, 10, 10, 12, P.skin);
    rect(ctx, cx - 5, 10, 2, 12, P.skinDark);
    rect(ctx, cx - 5, 20, 10, 2, P.skinDark);

    // Beard, in two steps so it has some volume.
    rect(ctx, cx - 5, 17, 10, 6, P.bone);
    rect(ctx, cx - 4, 21, 8, 4, P.boneDark);
    rect(ctx, cx - 3, 24, 6, 3, P.bone);
    rect(ctx, cx - 2, 16, 4, 1, P.boneDark);

    // Wide-brimmed pointed hat.
    poly(ctx, [[cx, -1], [cx + 8, 9], [cx - 8, 9]], P.roofPurple);
    poly(ctx, [[cx, 0], [cx + 4, 6], [cx - 4, 6]], '#9a74bd');
    rect(ctx, cx - 11, 9, 22, 3, P.roofPurpleDark);
    rect(ctx, cx - 11, 9, 22, 1, P.roofPurple);
    rect(ctx, cx - 8, 7, 16, 2, P.clothDark);
    px(ctx, cx + 4, 7, P.goldLit);

    const eyes = [{ x: cx - 3, y: 15 }, { x: cx + 2, y: 15 }];
    for (const eye of eyes) px(ctx, eye.x, eye.y, P.ink);

    return { sprite: outlineSprite(s, P.outline), eyes: eyes.map((e) => ({ x: e.x + 1, y: e.y + 1 })), w, h };
}

/** Speech bubble the shopkeeper throws up when you break something. */
/**
 * `lines` can be a single line (the "MY WARES!" break reaction) or an array
 * (a wrapped project description) — the body grows to fit either. The tail's
 * position is derived from the body height rather than hard-coded, so a
 * three-line description gets the same tail shape as a one-liner, just
 * lower.
 */
export function bakeBubble(lines) {
    const label = Array.isArray(lines) ? lines : [lines];
    const lineH = 8; // 6px glyph + 2px gap between lines
    const w = Math.max(...label.map(textWidth)) + 8;
    const bodyH = 4 + label.length * lineH;
    const h = bodyH + 4;
    const s = makeCanvas(w, h);
    const { ctx } = s;

    rect(ctx, 0, 0, w, bodyH, P.ink);
    rect(ctx, 1, 1, w - 2, bodyH - 2, '#f4efe0');
    // Tail, pointing down-right towards the keeper.
    poly(ctx, [[w - 10, bodyH - 1], [w - 4, bodyH - 1], [w - 6, bodyH + 3]], P.ink);
    poly(ctx, [[w - 9, bodyH - 1], [w - 5, bodyH - 1], [w - 6, bodyH + 1]], '#f4efe0');
    label.forEach((line, i) => drawText(ctx, line, 4, 3 + i * lineH, P.ink));

    return s;
}

// ---------------------------------------------------------------------------
// Plinths
// ---------------------------------------------------------------------------

/**
 * The little wooden stand each project sits on, with its name carved into the
 * front face. In a side-on view the item sits entirely *above* the plinth, so
 * the label is never occluded — which is why the label lives here and not on a
 * separate tag.
 *
 * `withLink` reserves room after the label for a glowing arrow icon, baked as
 * a fixed slot regardless of whether a URL ends up being available at
 * runtime — the label stays centred in its own region either way, so the
 * plinth never re-centres itself once the project API call resolves.
 * `linkAnchor` is where the scene should draw (and hit-test) that arrow, in
 * the plinth's own local coordinates.
 */
export function bakePlinth(lines, { withLink = false } = {}) {
    const label = Array.isArray(lines) ? lines : [lines];
    const labelRegionW = Math.max(...label.map(textWidth)) + 8;
    const linkW = withLink ? 13 : 0;
    const w = labelRegionW + linkW;
    const lineH = 8; // 6px glyph + 2px gap between lines
    const h = 5 + label.length * lineH;
    const s = makeCanvas(w, h);
    const { ctx } = s;

    rect(ctx, 0, 0, w, h, P.wood);
    rect(ctx, 0, 0, w, 2, P.woodLit);
    rect(ctx, 0, h - 2, w, 2, P.woodDeep);
    rect(ctx, 0, 0, 1, h, P.woodDark);
    rect(ctx, w - 1, 0, 1, h, P.woodDark);

    // Gilded letters with a dark drop shadow, not the gravestone's carved
    // two-tone: at 3px tall, dark-on-brown was a smudge from two feet away and
    // the whole point of a plinth is that you can read what's on it.
    label.forEach((line, i) => {
        const x = Math.round((labelRegionW - textWidth(line)) / 2);
        const y = 4 + i * lineH;
        drawText(ctx, line, x, y + 1, P.woodDeep);
        drawText(ctx, line, x, y, P.goldLit);
    });

    s.linkAnchor = withLink ? { x: labelRegionW + 2, y: Math.round((h - 9) / 2) } : null;
    return s;
}

// ---------------------------------------------------------------------------
// The projects
// ---------------------------------------------------------------------------

/** Mindstare — a seer's scrying orb. Glass: the most fragile thing in here. */
export function bakeOrb(r = 8) {
    const size = r * 2;
    const s = makeCanvas(size, size);
    const { ctx } = s;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - r + 0.5;
            const dy = y - r + 0.5;
            const d = Math.sqrt(dx * dx + dy * dy) / r;
            if (d > 1) continue;

            // Shade from the upper-left, matching the world's one light
            // direction, then a rim light on the lower-right so it reads as a
            // sphere rather than a disc.
            const lit = (-dx - dy) / (r * 1.4);
            let color = P.orb;
            if (lit > 0.55) color = P.orbLit;
            else if (lit > 0.1) color = P.orb;
            else if (lit > -0.5) color = P.orbDark;
            else color = P.orbDeep;
            if (d > 0.78 && lit < -0.2) color = P.orbDark;
            px(ctx, x, y, color);
        }
    }

    // Nebula swirl inside.
    for (let i = 0; i < 26; i++) {
        const a = i * 0.68;
        const rad = (i / 26) * r * 0.72;
        const x = Math.round(r + Math.cos(a) * rad - 0.5);
        const y = Math.round(r + Math.sin(a) * rad * 0.8 - 0.5);
        px(ctx, x, y, i % 3 ? P.orbDeep : P.orbLit);
    }

    // Specular highlight, hard-edged. A soft one would blur at 4x.
    rect(ctx, 3, 3, 2, 2, '#ffffff');
    px(ctx, 5, 3, P.glassLit);
    px(ctx, 3, 5, P.glassLit);

    return s;
}

/**
 * Vhoice — a gilded orator, arm up mid-speech. Gold: heavy, dull, hard to
 * break. Kept to 23px because the top shelf has to clear it, its plinth and
 * the rafter.
 */
export function bakeStatue() {
    const w = 16;
    const h = 23;
    const s = makeCanvas(w, h);
    const { ctx } = s;
    const cx = 8;

    // Stepped base.
    rect(ctx, 1, 19, 14, 4, P.goldDark);
    rect(ctx, 1, 19, 14, 1, P.gold);
    rect(ctx, 3, 17, 10, 2, P.goldDeep);

    // Robe, flaring to the base.
    for (let y = 11; y < 17; y++) {
        const half = 3 + Math.round(((y - 11) / 6) * 2);
        rect(ctx, cx - half, y, half * 2, 1, P.gold);
        px(ctx, cx - half, y, P.goldLit);
        px(ctx, cx + half - 1, y, P.goldDark);
    }
    rect(ctx, cx - 2, 12, 1, 5, P.goldDark);
    rect(ctx, cx + 1, 13, 1, 4, P.goldDark);

    // Torso and head.
    rect(ctx, cx - 3, 7, 6, 4, P.gold);
    rect(ctx, cx - 3, 7, 1, 4, P.goldLit);
    rect(ctx, cx - 2, 3, 4, 4, P.gold);
    rect(ctx, cx - 2, 3, 1, 4, P.goldLit);
    px(ctx, cx - 1, 5, P.goldDeep);
    px(ctx, cx + 1, 5, P.goldDeep);
    // Laurel wreath, because of course.
    rect(ctx, cx - 3, 2, 6, 1, P.goldLit);
    px(ctx, cx - 3, 3, P.goldLit);
    px(ctx, cx + 2, 3, P.goldLit);

    // One arm thrown up, the other tucked in.
    for (let k = 0; k < 4; k++) px(ctx, cx + 3 + Math.round(k * 0.4), 8 - k, P.gold);
    rect(ctx, cx + 4, 3, 2, 2, P.goldLit);
    rect(ctx, cx - 5, 8, 2, 4, P.goldDark);

    // Cast sheen: one bright vertical streak is what makes metal read as metal
    // at this size.
    rect(ctx, cx - 4, 12, 1, 5, P.goldLit);

    return outlineSprite(s, P.goldDeep);
}

/**
 * MovieSwiper — a striped popcorn bag. Never breaks; it *spills*, which is a
 * better joke and a better toy. `filled` picks how high the mound sits.
 */
export function bakePopcornBag(filled = 1) {
    const w = 20;
    const h = 24;
    const s = makeCanvas(w, h);
    const { ctx } = s;
    const top = 6;

    // Bag: vertical stripes, tapering slightly to the base like a real carton.
    for (let y = top; y < h; y++) {
        const inset = Math.round(((y - top) / (h - top)) * 2);
        for (let x = 2 + inset; x < w - 2 - inset; x++) {
            const stripe = Math.floor((x - 2) / 3) % 2;
            px(ctx, x, y, stripe ? P.cloth : '#f0e6d8');
        }
        px(ctx, 2 + inset, y, P.clothDark);
        px(ctx, w - 3 - inset, y, P.clothDark);
    }
    // Rolled rim.
    rect(ctx, 1, top, w - 2, 2, P.clothDark);
    rect(ctx, 1, top, w - 2, 1, '#f0e6d8');
    rect(ctx, 2, h - 2, w - 4, 2, P.clothDark);

    // Mound of popcorn above the rim.
    if (filled > 0) {
        const rows = filled > 0.5 ? 6 : 3;
        for (let i = 0; i < 26; i++) {
            const x = 3 + Math.floor(hash2(i, 1, 7) * (w - 6));
            const y = top - Math.floor(hash2(i, 2, 7) * rows);
            if (y < 0) continue;
            const shade = hash2(i, 3, 7);
            rect(ctx, x, y, 2, 2, shade > 0.66 ? P.popLit : shade > 0.33 ? P.pop : P.popDark);
        }
    }

    return outlineSprite(s, P.outline);
}

/** A single kernel. Four lobes, because three reads as a clover and five as a blob. */
export function bakePopcorn(variant = 0) {
    const s = makeCanvas(5, 5);
    const { ctx } = s;
    const lobes = [
        [0, 0], [2, 0], [0, 2], [2, 2], [1, 1],
    ];
    lobes.forEach(([x, y], i) => {
        if (i < 4 && hash2(i, variant, 12) > 0.82) return;
        rect(ctx, x, y, 3, 3, P.pop);
    });
    rect(ctx, 1, 0, 2, 2, P.popLit);
    px(ctx, 3, 3, P.popDark);
    return s;
}

// ForgeKit — an anvil, the centrepiece of the floor now that its shelf is
// gone. `ANVIL_PARTS` is the *only* description of its silhouette: bakeAnvil
// paints these same rectangles and the scene builds a compound physics body
// from these same rectangles, so the collider can never drift out of step
// with what's drawn — which is exactly the bug the horn used to have as a
// single bounding box.
export const ANVIL_W = 40;
export const ANVIL_H = 24;
export const ANVIL_PARTS = [
    { name: 'horn', x: 1, y: 3, w: 9, h: 6 },
    { name: 'face', x: 8, y: 2, w: 30, h: 7 },
    { name: 'waist', x: 13, y: 9, w: 15, h: 6 },
    { name: 'base', x: 5, y: 15, w: 30, h: 8 },
];

/** ForgeKit — an anvil. Iron: unbreakable, and it breaks everything else. */
export function bakeAnvil() {
    const s = makeCanvas(ANVIL_W, ANVIL_H);
    const { ctx } = s;
    const [horn, face, waist, base] = ANVIL_PARTS;

    rect(ctx, face.x, face.y, face.w, face.h, P.iron);
    rect(ctx, face.x, face.y, face.w, 1, P.ironLit);
    rect(ctx, face.x + face.w - 3, face.y, 3, face.h, P.ironDark);

    // Horn: tapered by shaving a pixel off each row toward the tip, which is
    // what makes a rectangle read as a cone instead of a stub.
    for (let row = 0; row < horn.h; row++) {
        const shave = Math.min(row, horn.h - 1 - row, 2);
        rect(ctx, horn.x + shave, horn.y + row, horn.w - shave, 1, row < 2 ? P.ironLit : P.iron);
    }
    rect(ctx, horn.x, horn.y + horn.h - 2, 3, 2, P.ironDark);

    rect(ctx, waist.x, waist.y, waist.w, waist.h, P.ironDark);
    rect(ctx, waist.x, waist.y, 1, waist.h, P.iron);
    rect(ctx, waist.x + waist.w - 1, waist.y, 1, waist.h, P.ironDeep);

    rect(ctx, base.x, base.y, base.w, base.h, P.iron);
    rect(ctx, base.x, base.y, base.w, 1, P.ironLit);
    rect(ctx, base.x, base.y + base.h - 2, base.w, 2, P.ironDeep);
    rect(ctx, base.x, base.y, 2, base.h, P.ironLit);
    rect(ctx, base.x + base.w - 2, base.y, 2, base.h, P.ironDeep);

    speckle(ctx, 0, 0, ANVIL_W, ANVIL_H, P.ironDeep, 0.05, 91);
    speckle(ctx, 0, 0, ANVIL_W, ANVIL_H, P.ironLit, 0.02, 92);

    return outlineSprite(s, P.outline);
}

// The smith's hammer: a real physics object now, not a scripted animation —
// you pick it up and swing it yourself. Exported so the scene builds its
// compound body (head + handle) from these exact numbers instead of a second
// guess at them.
export const HAMMER_HEAD_W = 10;
export const HAMMER_HEAD_H = 8;
export const HAMMER_HANDLE_LEN = 22;

/** Drawn lying flat, grip at the left — the end the handle part is built from. */
export function bakeSmithHammer() {
    const w = HAMMER_HANDLE_LEN + HAMMER_HEAD_W;
    const s = makeCanvas(w, HAMMER_HEAD_H);
    const { ctx } = s;
    const hx = HAMMER_HANDLE_LEN;

    rect(ctx, 0, HAMMER_HEAD_H / 2 - 1, hx + 1, 2, P.wood);
    rect(ctx, 0, HAMMER_HEAD_H / 2 - 1, hx + 1, 1, P.woodLit);
    rect(ctx, 0, HAMMER_HEAD_H / 2 - 1, 3, 2, P.woodDeep);

    rect(ctx, hx, 0, HAMMER_HEAD_W, HAMMER_HEAD_H, P.iron);
    rect(ctx, hx, 0, HAMMER_HEAD_W, 1, P.ironLit);
    rect(ctx, hx, HAMMER_HEAD_H - 1, HAMMER_HEAD_W, 1, P.ironDeep);
    rect(ctx, hx + HAMMER_HEAD_W - 3, 0, 3, HAMMER_HEAD_H, P.ironDark);
    speckle(ctx, hx, 0, HAMMER_HEAD_W, HAMMER_HEAD_H, P.ironDeep, 0.08, 61);

    return outlineSprite(s, P.outline);
}

/**
 * The little glowing marker set into a plinth after its label, saying "click
 * me" — a diagonal arrow into a corner bracket, pointing toward wherever a
 * fuller writeup of the project lives. Sized to fit inside even a one-line
 * plinth (11px tall before outline padding). Baked once; the scene animates
 * its glow rather than baking multiple frames.
 */
export function bakeArrow() {
    const s = makeCanvas(7, 7);
    const { ctx } = s;
    const color = P.goldLit;

    for (let k = 0; k < 4; k++) px(ctx, 1 + k, 5 - k, color);
    rect(ctx, 3, 0, 4, 2, color);
    rect(ctx, 5, 0, 2, 4, color);

    return outlineSprite(s, P.outline);
}

// ForgeKit's display item: a stone-and-iron forge, its mouth always glowing
// with embers. The anvil (below) is deliberately *not* this project's display
// object anymore — it sits unlabelled on the floor to the forge's right,
// where there's headroom for the hammer to swing.
export const FORGE_W = 32;
export const FORGE_H = 38;
// Centre of the ember mouth, in sprite-local coordinates (post-outline),
// for the scene's additive glow to track. Derived the same way bakeForge
// itself places the mouth (mh=16 tall, sitting 8+2px above the iron band),
// so a resize of either can't quietly desync them.
const FORGE_MOUTH_H = 16;
export const FORGE_MOUTH = { x: FORGE_W / 2 + 1, y: FORGE_H - 8 - FORGE_MOUTH_H / 2 + 1 };

/** ForgeKit — a squat stone forge with an iron band and a glowing mouth. */
export function bakeForge() {
    const s = makeCanvas(FORGE_W, FORGE_H);
    const { ctx } = s;

    // Coursed stone body.
    rect(ctx, 0, 6, FORGE_W, FORGE_H - 6, P.stone);
    rect(ctx, 0, 6, FORGE_W, 2, P.stoneLit);
    rect(ctx, 0, 6, 2, FORGE_H - 6, P.stoneLit);
    rect(ctx, FORGE_W - 2, 6, 2, FORGE_H - 6, P.stoneDeep);
    for (let y = 10; y < FORGE_H; y += 5) {
        rect(ctx, 0, y, FORGE_W, 1, P.stoneDark);
        for (let x = (y / 5) % 2 ? 3 : 7; x < FORGE_W; x += 8) rect(ctx, x, y - 4, 1, 4, P.stoneDark);
    }
    speckle(ctx, 0, 6, FORGE_W, FORGE_H - 6, P.stoneDeep, 0.05, 71);

    // Iron banding low on the body — the same metal the anvil and the arrow
    // are made of, which is what visually ties the forge to "ForgeKit".
    rect(ctx, 0, FORGE_H - 8, FORGE_W, 3, P.ironDark);
    rect(ctx, 0, FORGE_H - 8, FORGE_W, 1, P.iron);

    // Squat flue on top.
    rect(ctx, FORGE_W / 2 - 4, 0, 8, 8, P.stoneDark);
    rect(ctx, FORGE_W / 2 - 4, 0, 8, 1, P.stoneLit);
    rect(ctx, FORGE_W / 2 - 3, 6, 6, 2, P.ironDark);

    // Arched mouth: a stepped-in dark recess, embers banked at the bottom.
    // Drawn last, on top of the stone coursing, so it reads as a hole rather
    // than a painted rectangle.
    const mw = 16;
    const mh = FORGE_MOUTH_H;
    const mx = (FORGE_W - mw) / 2;
    const my = FORGE_H - 8 - mh - 2;
    for (let row = 0; row < 4; row++) {
        const inset = 4 - row;
        rect(ctx, mx + inset, my + row, mw - inset * 2, 1, P.ink);
    }
    rect(ctx, mx, my + 4, mw, mh - 4, P.ink);
    rect(ctx, mx + 3, my + mh - 6, mw - 6, 4, P.ember);
    rect(ctx, mx + 5, my + mh - 5, mw - 10, 2, P.window);
    speckle(ctx, mx, my + 6, mw, mh - 6, P.ember, 0.07, 81);

    return outlineSprite(s, P.outline);
}

/** How far the lid sprite overlaps the box sprite when shut. */
export const LID_SEAM = 2;

/**
 * Physics Museum — a Pandora's chest. Body and lid are separate sprites so the
 * lid can hinge open; the physics body covers both, closed.
 */
export function bakeChest() {
    const w = 24;
    const bodyH = 12;
    const lidH = 7;

    const box = makeCanvas(w, bodyH);
    {
        const { ctx } = box;
        rect(ctx, 0, 0, w, bodyH, P.wood);
        rect(ctx, 0, 0, w, 1, P.woodLit);
        rect(ctx, 0, bodyH - 2, w, 2, P.woodDeep);
        for (let y = 2; y < bodyH - 2; y += 4) rect(ctx, 0, y, w, 1, P.woodDark);
        // Iron straps and corner braces.
        for (const x of [3, w - 6]) {
            rect(ctx, x, 0, 3, bodyH, P.ironDark);
            rect(ctx, x, 0, 1, bodyH, P.iron);
        }
        rect(ctx, 0, 0, 1, bodyH, P.ironDeep);
        rect(ctx, w - 1, 0, 1, bodyH, P.ironDeep);
        // Lock plate.
        rect(ctx, w / 2 - 2, 0, 4, 5, P.gold);
        rect(ctx, w / 2 - 2, 0, 4, 1, P.goldLit);
        px(ctx, w / 2, 2, P.goldDeep);
    }

    const lid = makeCanvas(w, lidH);
    {
        const { ctx } = lid;
        // Domed lid: rows narrowing towards the top.
        for (let y = 0; y < lidH; y++) {
            const inset = y < 2 ? 2 - y : 0;
            rect(ctx, inset, y, w - inset * 2, 1, y < 2 ? P.woodLit : P.wood);
        }
        rect(ctx, 0, lidH - 1, w, 1, P.woodDeep);
        for (const x of [3, w - 6]) rect(ctx, x, 0, 3, lidH, P.ironDark);
        rect(ctx, w / 2 - 2, lidH - 3, 4, 3, P.gold);
    }

    const boxSprite = outlineSprite(box, P.outline);
    const lidSprite = outlineSprite(lid, P.outline);

    // The closed chest is composited from the same two outlined sprites the
    // scene draws at runtime, overlapping by the 2px where their outlines meet.
    // Built this way rather than drawn a third time, the physics body derived
    // from `closed` lines up with the hinged pieces by construction.
    const closed = makeCanvas(boxSprite.w, boxSprite.h + lidSprite.h - LID_SEAM);
    closed.ctx.drawImage(lidSprite.canvas, 0, 0);
    closed.ctx.drawImage(boxSprite.canvas, 0, lidSprite.h - LID_SEAM);

    return { box: boxSprite, lid: lidSprite, closed };
}

// ---------------------------------------------------------------------------
// Debris the chest coughs up
// ---------------------------------------------------------------------------

export function bakeBall(color, shade, r = 4) {
    const size = r * 2;
    const s = makeCanvas(size, size);
    const { ctx } = s;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - r + 0.5;
            const dy = y - r + 0.5;
            if (dx * dx + dy * dy > r * r) continue;
            px(ctx, x, y, -dx - dy > r * 0.5 ? '#ffffff' : -dx - dy > -r * 0.4 ? color : shade);
        }
    }
    return outlineSprite(s, P.outline);
}

export function bakeConfetti(color) {
    const s = makeCanvas(4, 2);
    rect(s.ctx, 0, 0, 4, 2, color);
    rect(s.ctx, 0, 0, 4, 1, '#ffffff');
    return s;
}

export function bakeBlock() {
    const s = makeCanvas(8, 8);
    const { ctx } = s;
    rect(ctx, 0, 0, 8, 8, P.wood);
    rect(ctx, 0, 0, 8, 1, P.woodLit);
    rect(ctx, 0, 7, 8, 1, P.woodDeep);
    for (let i = 0; i < 6; i++) px(ctx, 1 + i, 6 - i, P.woodDark);
    return outlineSprite(s, P.outline);
}

export function bakeGem(color) {
    const s = makeCanvas(7, 8);
    const { ctx } = s;
    poly(s.ctx, [[3, 0], [7, 3], [3, 8], [0, 3]], color);
    px(ctx, 3, 2, '#ffffff');
    px(ctx, 2, 3, '#ffffff');
    return outlineSprite(s, P.outline);
}

/** Spark motes for the anvil. Three sizes so a shower has some texture. */
export function bakeSparks() {
    return ['#fffbe8', P.lamp, P.ember].map((color) => {
        const s = makeCanvas(2, 2);
        rect(s.ctx, 0, 0, 2, 2, color);
        return s;
    });
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Everything the shop needs, baked once. Positions are given as the *centre x*
 * of each display and the shelf it stands on; the scene derives body positions
 * from the sprite sizes, so nothing here hard-codes a y.
 */
export function buildShop() {
    const chest = bakeChest();

    const displays = [
        // `shelf` places a display on a board; `onFloor` stands it on the
        // floorboards instead (still on its own small plinth). The anvil is
        // deliberately *not* in this list — see buildShop's return below.
        {
            id: 'mindstare',
            label: 'Mindstare',
            plinth: bakePlinth('MINDSTARE', { withLink: true }),
            sprite: bakeOrb(8),
            kind: 'orb',
            // Glass in every way it looks and feels — brittle friction,
            // glassy restitution — but an Infinity threshold means it never
            // actually shatters. The scrying orb is the one thing in the shop
            // that's meant to survive being handled roughly.
            material: 'crystal',
            shelf: 0,
            x: 52,
            circle: true,
        },
        {
            id: 'vhoice',
            label: 'Vhoice',
            plinth: bakePlinth('VHOICE', { withLink: true }),
            sprite: bakeStatue(),
            kind: 'statue',
            material: 'gold',
            shelf: 0,
            x: 140,
        },
        {
            id: 'movieswiper',
            label: 'MovieSwiper',
            plinth: bakePlinth('MOVIESWIPER', { withLink: true }),
            sprite: bakePopcornBag(1),
            kind: 'bag',
            material: 'paper',
            shelf: 1,
            x: 48,
        },
        {
            id: 'museum',
            label: 'Physics Museum',
            plinth: bakePlinth(['PHYSICS', 'MUSEUM'], { withLink: true }),
            sprite: chest.closed,
            kind: 'chest',
            material: 'wood',
            shelf: 1,
            x: 132,
        },
        {
            id: 'forgekit',
            label: 'ForgeKit',
            plinth: bakePlinth('FORGEKIT', { withLink: true }),
            sprite: bakeForge(),
            kind: 'forge',
            material: 'iron',
            onFloor: true,
            // Far left of the room — the anvil sits on the floor to its
            // right, with the run of open floor between it and the counter
            // that its hammer swing actually needs.
            x: 54,
        },
    ];

    return {
        backdrop: bakeShopBackdrop(),
        counter: bakeCounter(),
        counterTop: bakeCounterTop(),
        keeper: bakeShopkeeper(),
        bubble: bakeBubble('MY WARES!'),
        displays,
        chest,
        bagSprites: [bakePopcornBag(0), bakePopcornBag(0.4), bakePopcornBag(1)],
        popcorn: [0, 1, 2, 3].map(bakePopcorn),
        // The anvil: unlabelled, floor-level (not on a plinth) so there's
        // headroom above it for the hammer, and built as its own body in the
        // scene rather than through the displays/plinth pipeline.
        anvil: bakeAnvil(),
        smithHammer: bakeSmithHammer(),
        sparks: bakeSparks(),
        arrow: bakeArrow(),
        // Floor dressing, drawn in front of the wall but behind the physics.
        clutter: [
            { sprite: bakeBarrel(), x: 208, y: FLOOR_Y - 15 },
            { sprite: bakeCrate(), x: 6, y: FLOOR_Y - 12 },
            { sprite: bakeCrate(), x: 20, y: FLOOR_Y - 12 },
        ],
        glow: bakeGlow(14),
        orbGlow: bakeGlow(13, '168, 120, 235'),
        balls: [
            bakeBall(P.flowerPink, '#b4507a'),
            bakeBall(P.flowerBlue, '#4f6cad'),
            bakeBall(P.leafLit, P.leafDark),
            bakeBall(P.window, P.windowDim),
        ],
        confetti: [P.flowerPink, P.flowerYellow, P.flowerBlue, P.leafLit, P.cloth, P.orbLit].map(bakeConfetti),
        block: bakeBlock(),
        gems: [bakeGem(P.flowerBlue), bakeGem(P.flowerPink), bakeGem(P.leafLit)],
    };
}
