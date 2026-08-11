import { P } from '../palette.js';
import { makeCanvas, rect, px, poly, bands, dither, speckle, hash2, outlineSprite } from '../pixel.js';
import { drawText, textWidth } from '../text.js';
import { bakeGlow } from './props.js';

export const HOUSE_W = 320;
export const HOUSE_H = 180;
export const FLOOR_Y = 145;
export const WINDOW = { x: 50, y: 48, w: 45, h: 47 };

/** Sloped-roof attic shell, deliberately cluttered and lived in. */
export function bakeHouseBackdrop() {
    const s = makeCanvas(HOUSE_W, HOUSE_H);
    const { ctx } = s;

    // The attic is a cutaway against a real night, not a room floating in a
    // flat void. Most of this is covered by the house below; it remains visible
    // around the roof slopes and through any cropped viewport edge.
    bands(ctx, 0, 0, HOUSE_W, HOUSE_H, [P.nightTop, P.nightTop, P.nightMid, P.nightLow]);
    dither(ctx, 0, 38, HOUSE_W, 18, P.nightTop, P.nightMid, 0.35);

    // Moon and a restrained halo in the clear patch above the left roof.
    const moonX = 34;
    const moonY = 23;
    for (let y = -15; y <= 15; y++) {
        for (let x = -15; x <= 15; x++) {
            const distance = Math.sqrt(x * x + y * y);
            if (distance > 15 || distance < 9) continue;
            if (hash2(x, y, 401) < (1 - (distance - 9) / 6) * 0.35) px(ctx, moonX + x, moonY + y, '#5b526f');
        }
    }
    for (let y = -9; y <= 9; y++) {
        for (let x = -9; x <= 9; x++) {
            if (x * x + y * y <= 81) px(ctx, moonX + x, moonY + y, hash2(x, y, 402) > 0.9 ? '#c9c5b7' : '#ece7cf');
        }
    }

    // Stars are baked first, then clouds naturally obscure whichever ones sit
    // behind them. That leaves sparse clear-sky pockets without hand-picking.
    for (let i = 0; i < 80; i++) {
        const x = Math.floor(hash2(i, 1, 403) * HOUSE_W);
        const y = Math.floor(hash2(i, 2, 404) * 92);
        if ((x - moonX) ** 2 + (y - moonY) ** 2 < 170) continue;
        if (hash2(i, 3, 405) > 0.38) px(ctx, x, y, i % 7 ? '#aaa6c6' : '#fff7d4');
    }

    // Long, quiet storm-cloud banks. Their staggered, stepped undersides keep
    // them cloudy rather than reading as rectangular UI panels.
    const cloud = (x, y, w, color, seed) => {
        for (let row = 0; row < 10; row++) {
            const inset = row < 3 ? 6 - row * 2 : row > 7 ? (row - 7) * 4 : 0;
            rect(ctx, x + inset, y + row, w - inset * 2, 1, color);
        }
        for (let k = 0; k < w; k += 5) if (hash2(k, y, seed) > 0.55) px(ctx, x + k, y + 10, P.nightTop);
    };
    cloud(4, 30, 59, '#343048', 410);
    cloud(82, 20, 92, '#292842', 411);
    cloud(151, 42, 112, '#39334f', 412);
    cloud(-18, 62, 91, '#302d48', 413);
    cloud(247, 68, 96, '#2b2944', 414);

    // Plastered end wall inside the roof triangle.
    const wall = [[0, 91], [84, 12], [236, 12], [320, 91], [320, FLOOR_Y], [0, FLOOR_Y]];
    poly(ctx, wall, '#675064');
    ctx.save();
    ctx.beginPath();
    wall.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.clip();
    dither(ctx, 0, 0, HOUSE_W, FLOOR_Y, '#675064', '#5b475b', 0.28);
    speckle(ctx, 0, 0, HOUSE_W, FLOOR_Y, '#775e70', 0.02, 301);
    ctx.restore();

    // Roof beams follow the slope and give the room a strong silhouette.
    poly(ctx, [[0, 88], [80, 5], [88, 5], [8, 94]], P.woodDeep);
    poly(ctx, [[320, 88], [240, 5], [232, 5], [312, 94]], P.woodDeep);
    rect(ctx, 0, 88, 8, FLOOR_Y - 88, P.woodDeep);
    rect(ctx, 312, 88, 8, FLOOR_Y - 88, P.woodDeep);
    rect(ctx, 5, 94, 2, FLOOR_Y - 94, P.woodLit);
    rect(ctx, 313, 94, 2, FLOOR_Y - 94, P.woodLit);
    rect(ctx, 80, 5, 160, 8, P.woodDeep);
    rect(ctx, 83, 7, 154, 2, P.woodLit);
    rect(ctx, 6, 89, 308, 7, P.woodDark);
    rect(ctx, 8, 90, 304, 2, P.woodLit);

    // Rain window. Animated drops and the open sash are added by the scene.
    rect(ctx, WINDOW.x - 4, WINDOW.y - 4, WINDOW.w + 8, WINDOW.h + 8, P.woodDeep);
    rect(ctx, WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, P.nightTop);
    dither(ctx, WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, P.nightTop, P.nightMid, 0.35);
    rect(ctx, WINDOW.x - 5, WINDOW.y + WINDOW.h + 1, WINDOW.w + 10, 4, P.wood);
    rect(ctx, WINDOW.x - 4, WINDOW.y + WINDOW.h + 1, WINDOW.w + 8, 1, P.woodLit);

    // Pegboard of tiny unfinished ideas.
    rect(ctx, 109, 31, 58, 43, P.woodDeep);
    rect(ctx, 112, 34, 52, 37, '#76543d');
    for (let y = 38; y < 69; y += 5) for (let x = 116; x < 162; x += 6) px(ctx, x, y, P.woodDark);
    const notes = [
        [116, 39, P.flowerYellow], [137, 37, P.flowerPink], [149, 49, P.glassLit],
        [121, 57, P.bone], [141, 60, P.flowerYellow],
    ];
    for (const [x, y, color] of notes) {
        rect(ctx, x, y, 10, 8, color);
        px(ctx, x + 2, y + 3, P.stoneDark);
        rect(ctx, x + 2, y + 5, 6, 1, P.stoneDark);
    }
    for (const [a, b] of [[[126, 43], [139, 41]], [[146, 45], [153, 51]], [[129, 61], [143, 64]]]) {
        ctx.strokeStyle = P.cloth;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
    }

    // Bookshelves and their uneven contents.
    rect(ctx, 178, 28, 48, 58, P.woodDeep);
    rect(ctx, 181, 31, 42, 52, P.woodDark);
    for (const y of [47, 65, 82]) rect(ctx, 178, y, 48, 4, P.wood);
    const bookColors = [P.roofRed, P.roofBlue, P.roofGreen, P.roofPurple, P.cloth, P.goldDark];
    let seed = 0;
    for (const y of [34, 51, 69]) {
        let x = 183;
        while (x < 219) {
            const bw = 3 + (seed % 3);
            const bh = 8 + ((seed * 7) % 8);
            rect(ctx, x, y + 13 - bh, bw, bh, bookColors[seed % bookColors.length]);
            px(ctx, x, y + 14 - bh, P.boneDark);
            x += bw + 1;
            seed++;
        }
    }

    // Wood floor and a soft rug in the work area.
    rect(ctx, 0, FLOOR_Y, HOUSE_W, HOUSE_H - FLOOR_Y, P.woodDark);
    for (let y = FLOOR_Y; y < HOUSE_H; y += 7) rect(ctx, 0, y, HOUSE_W, 1, P.woodDeep);
    for (let x = 12; x < HOUSE_W; x += 38) rect(ctx, x, FLOOR_Y, 1, HOUSE_H - FLOOR_Y, P.woodDeep);
    poly(ctx, [[90, 153], [241, 153], [258, 176], [73, 176]], P.roofPurpleDark);
    poly(ctx, [[97, 156], [235, 156], [246, 173], [84, 173]], '#89606f');
    for (let x = 94; x < 241; x += 10) px(ctx, x, 165, P.goldDark);

    // Deep little couch under the window, with mismatched cushions.
    rect(ctx, 15, 119, 94, 25, P.woodDeep);
    rect(ctx, 18, 111, 88, 27, P.roofBlueDark);
    rect(ctx, 21, 115, 82, 18, '#5e6f93');
    rect(ctx, 18, 127, 88, 12, P.roofBlue);
    rect(ctx, 22, 129, 38, 8, '#7185ac');
    rect(ctx, 63, 129, 39, 8, '#6579a1');
    rect(ctx, 11, 119, 12, 21, P.roofBlueDark);
    rect(ctx, 101, 119, 12, 21, P.roofBlueDark);
    rect(ctx, 27, 112, 19, 14, P.roofPurpleDark);
    rect(ctx, 29, 114, 15, 10, '#9a74bd');
    rect(ctx, 18, 138, 5, 9, P.woodDeep);
    rect(ctx, 101, 138, 5, 9, P.woodDeep);

    // A separate low stand keeps the record player out from under the desk.
    rect(ctx, 176, 121, 40, 6, P.wood);
    rect(ctx, 176, 125, 40, 3, P.woodDeep);
    rect(ctx, 180, 128, 5, 18, P.woodDark);
    rect(ctx, 207, 128, 5, 18, P.woodDark);

    return s;
}

export function bakeDesk() {
    const s = makeCanvas(92, 50);
    const { ctx } = s;
    rect(ctx, 0, 11, 92, 8, P.wood);
    rect(ctx, 0, 11, 92, 2, P.woodLit);
    rect(ctx, 0, 18, 92, 3, P.woodDeep);
    rect(ctx, 5, 20, 7, 30, P.woodDark);
    rect(ctx, 79, 20, 7, 30, P.woodDark);
    // Drawers and brass pulls.
    rect(ctx, 61, 21, 18, 25, P.woodDeep);
    for (let y = 23; y < 45; y += 8) {
        rect(ctx, 63, y, 14, 6, P.woodDark);
        rect(ctx, 69, y + 2, 3, 1, P.gold);
    }
    return outlineSprite(s, P.outline);
}

export function bakeComputerFrames() {
    return [0, 1, 2].map((frame) => {
        const s = makeCanvas(33, 31);
        const { ctx } = s;
        rect(ctx, 2, 0, 29, 23, P.ironDeep);
        rect(ctx, 4, 2, 25, 18, frame ? '#142f3a' : P.ink);
        if (frame) {
            const color = frame === 1 ? P.glassLit : P.flowerYellow;
            rect(ctx, 6, 5, 10, 1, color);
            rect(ctx, 6, 8, 17, 1, P.roofGreen);
            rect(ctx, 6, 11, frame === 1 ? 13 : 20, 1, P.glass);
            rect(ctx, 6, 14, 7, 1, P.roofPurple);
            px(ctx, 15 + ((frame * 3) % 8), 14, P.lamp);
        }
        rect(ctx, 15, 23, 3, 5, P.ironDark);
        rect(ctx, 10, 28, 13, 3, P.ironDeep);
        return outlineSprite(s, P.outline);
    });
}

export function bakeLampFrames() {
    return [false, true].map((on) => {
        const s = makeCanvas(20, 31);
        const { ctx } = s;
        rect(ctx, 9, 10, 3, 18, P.ironDark);
        rect(ctx, 5, 27, 12, 3, P.ironDeep);
        poly(ctx, [[3, 12], [17, 12], [14, 3], [7, 3]], on ? P.gold : P.iron);
        rect(ctx, 7, 11, 7, 2, on ? P.lamp : P.ironDark);
        return outlineSprite(s, P.outline);
    });
}

export function bakeRecordPlayer() {
    const s = makeCanvas(32, 17);
    const { ctx } = s;
    rect(ctx, 0, 5, 32, 12, P.woodDeep);
    rect(ctx, 2, 7, 28, 8, P.wood);
    rect(ctx, 5, 3, 17, 12, P.ink);
    rect(ctx, 8, 5, 11, 8, P.ironDeep);
    rect(ctx, 12, 8, 3, 3, P.gold);
    rect(ctx, 24, 7, 2, 7, P.ironDark);
    rect(ctx, 20, 7, 6, 1, P.ironLit);
    return outlineSprite(s, P.outline);
}

export function bakeMug() {
    const s = makeCanvas(12, 12);
    const { ctx } = s;
    rect(ctx, 1, 3, 8, 8, P.cloth);
    rect(ctx, 2, 4, 6, 2, P.woodDeep);
    px(ctx, 3, 4, P.woodLit);
    rect(ctx, 9, 5, 3, 4, P.clothDark);
    rect(ctx, 10, 6, 1, 2, P.ink);
    return outlineSprite(s, P.outline);
}

export function bakeCatFrames() {
    return [false, true].map((awake) => {
        const s = makeCanvas(46, 25);
        const { ctx } = s;
        const headY = awake ? 1 : 3;

        // Reclining side-on silhouette: rounded haunches to the left, chest
        // and tucked forepaws to the right, in the loafing pose of the reference.
        poly(ctx, [[2, 17], [4, 11], [9, 7], [18, 5], [29, 7], [35, 12], [39, 18], [37, 22], [8, 22], [3, 20]], P.ironDark);
        poly(ctx, [[5, 15], [9, 10], [18, 8], [27, 9], [31, 14], [27, 19], [8, 20]], '#555b6d');
        poly(ctx, [[6, 18], [13, 17], [22, 18], [31, 17], [38, 19], [36, 22], [9, 22]], P.ironDeep);

        // A slightly lifted awake head uses the same face and palette; only
        // its posture and eyelids change after interaction.
        poly(ctx, [[27, headY + 8], [29, headY + 2], [34, headY + 4], [40, headY + 1], [43, headY + 8], [42, headY + 15], [36, headY + 18], [30, headY + 15]], P.ironDark);
        poly(ctx, [[29, headY + 5], [30, headY], [34, headY + 4]], P.ironDark);
        // The same triangle as the left ear (base-left, tip 1px right of it,
        // base-right 5px further on) just translated to this base — a
        // centred tip read as a soft, floppy shape next to the left ear's
        // sharply leaning one; matching the lean is what makes them read as
        // a pair.
        poly(ctx, [[38, headY + 6], [39, headY + 1], [43, headY + 1]], P.ironDark);
        rect(ctx, 31, headY + 7, 9, 7, '#626879');

        // Eyes: a small gold iris block with a white catchlight in its top
        // corner, not a single round dot — a bare dot at this scale reads as
        // a human pupil.
        if (awake) {
            rect(ctx, 32, headY + 7, 2, 2, P.goldLit);
            px(ctx, 33, headY + 7, '#ffffff');
            rect(ctx, 38, headY + 7, 2, 2, P.goldLit);
            px(ctx, 39, headY + 7, '#ffffff');
        } else {
            rect(ctx, 31, headY + 9, 3, 1, P.ironDeep);
            rect(ctx, 38, headY + 9, 3, 1, P.ironDeep);
        }

        // A small triangular nose sitting right above the mouth corners gives
        // the face an actual snout rather than a flat patch with dots on it.
        poly(ctx, [[35, headY + 10], [37, headY + 10], [36, headY + 11]], '#caa1a8');
        px(ctx, 36, headY + 12, P.ironDeep);
        px(ctx, 35, headY + 13, P.ironDeep);
        px(ctx, 37, headY + 13, P.ironDeep);

        // Whiskers: two flat black lines a side, a 1px gap between them,
        // level with the nose and mouth rather than up at the eyes.
        for (let i = 0; i < 2; i++) {
            const y = headY + 11 + i * 2;
            rect(ctx, 28, y, 5, 1, P.ironLit);
            rect(ctx, 40, y, 5, 1, P.ironLit);
        }

        // Quiet tabby bands give the long body enough volume at this scale.
        poly(ctx, [[10, 9], [13, 9], [11, 15], [8, 17]], P.ironDeep);
        poly(ctx, [[16, 7], [19, 7], [17, 14], [14, 17]], P.ironDeep);
        poly(ctx, [[22, 7], [25, 8], [23, 15], [20, 18]], P.ironDeep);
        rect(ctx, 31, 19, 5, 2, '#626879');
        rect(ctx, 38, 19, 5, 2, '#555b6d');
        px(ctx, 30, 20, P.ironDeep);
        px(ctx, 43, 20, P.ironDeep);
        return outlineSprite(s, P.outline);
    });
}

export function bakeCatTailFrames() {
    return [0, 1].map((lifted) => {
        const s = makeCanvas(26, 16);
        const { ctx } = s;
        const tailColor = '#555b6d';
        // A short curl that wraps back in against the haunch, not a long
        // tube dragged out across the floor — a loafing cat's tail tucks
        // close to the body. Root position (16, 0) is unchanged from before,
        // so this still lines up with the body sprite in house.vue without
        // any change to where it's drawn.
        rect(ctx, 16, 0, 4, 3, tailColor);
        rect(ctx, 14, 2, 3, 3, tailColor);
        rect(ctx, 14, 4, 3, 3, tailColor);
        rect(ctx,15, 7, 3, 3, tailColor);
        if (lifted) {
            rect(ctx, 17, 8, 6, 2, tailColor);
            rect(ctx, 22, 6, 6, 2, tailColor);
        } else {
            rect(ctx, 17, 9, 9, 2, tailColor);
            rect(ctx, 19, 9, 9, 2, tailColor);
        }
        return outlineSprite(s, P.outline);
    });
}

export function bakeHouseBubble(text) {
    const w = textWidth(text) + 8;
    const bodyH = 4 + 6 + 3; // top pad + glyph height + bottom pad
    const s = makeCanvas(w, bodyH + 4);
    const { ctx } = s;
    rect(ctx, 0, 0, w, bodyH, P.ink);
    rect(ctx, 1, 1, w - 2, bodyH - 2, '#f4efe0');
    poly(ctx, [[w / 2 - 2, bodyH - 1], [w / 2 + 3, bodyH - 1], [w / 2, bodyH + 3]], P.ink);
    drawText(ctx, text, 4, 4, P.ink);
    return s;
}

export function buildHouseArt() {
    return {
        backdrop: bakeHouseBackdrop(),
        desk: bakeDesk(),
        computers: bakeComputerFrames(),
        lamps: bakeLampFrames(),
        record: bakeRecordPlayer(),
        mug: bakeMug(),
        cats: bakeCatFrames(),
        catTails: bakeCatTailFrames(),
        lampGlow: bakeGlow(25),
    };
}
