import { P } from '../palette.js';
import { makeCanvas, rect, px, poly, bands, dither, speckle, outlineSprite } from '../pixel.js';
import { drawText, textWidth } from '../text.js';

export const CAREER_W = 320;
export const CAREER_H = 180;
export const FLOOR_Y = 148;

/** Warm clocktower archive: stone shell, beams, window, shelves and gears. */
export function bakeCareerBackdrop() {
    const s = makeCanvas(CAREER_W, CAREER_H);
    const { ctx } = s;

    bands(ctx, 0, 0, CAREER_W, FLOOR_Y, ['#40354b', '#4b3d50', '#58444f']);
    dither(ctx, 0, 0, CAREER_W, FLOOR_Y, '#4b3d50', '#58444f', 0.22);

    // Coursed tower stone.
    for (let y = 8; y < FLOOR_Y; y += 12) {
        rect(ctx, 0, y, CAREER_W, 1, '#352d3e');
        const offset = ((y / 12) & 1) ? 13 : 29;
        for (let x = offset; x < CAREER_W; x += 42) rect(ctx, x, y - 11, 1, 11, '#463847');
    }
    speckle(ctx, 0, 0, CAREER_W, FLOOR_Y, '#66505a', 0.025, 203);

    // Heavy timber ceiling and uprights.
    rect(ctx, 0, 14, CAREER_W, 7, P.woodDeep);
    rect(ctx, 0, 14, CAREER_W, 2, P.woodLit);
    for (const x of [13, 252]) {
        rect(ctx, x, 14, 8, FLOOR_Y - 14, P.woodDeep);
        rect(ctx, x + 1, 15, 2, FLOOR_Y - 16, P.woodLit);
    }

    // Tall moonlit window behind the archivist.
    rect(ctx, 267, 31, 39, 70, P.stoneDeep);
    for (let y = 0; y < 12; y++) {
        const inset = Math.max(0, 11 - y);
        rect(ctx, 270 + inset, 34 + y, 33 - inset * 2, 1, P.glassDeep);
    }
    rect(ctx, 270, 46, 33, 52, P.glassDark);
    bands(ctx, 272, 47, 29, 49, [P.nightTop, P.nightMid, P.nightLow]);
    rect(ctx, 285, 35, 2, 62, P.stoneDeep);
    rect(ctx, 270, 69, 33, 2, P.stoneDeep);
    for (let i = 0; i < 16; i++) {
        const x = 273 + ((i * 17) % 27);
        const y = 40 + ((i * 29) % 51);
        px(ctx, x, y, i % 4 ? '#aaa6c6' : '#fff7d4');
    }

    // Timeline cord, pinned into the beams. Plaques hang from this in-scene.
    rect(ctx, 28, 59, 211, 2, P.ironDeep);
    for (let x = 29; x < 239; x += 4) px(ctx, x, 59, P.iron);
    rect(ctx, 26, 56, 5, 7, P.goldDark);
    rect(ctx, 237, 56, 5, 7, P.goldDark);

    // Floorboards and a worn runner.
    rect(ctx, 0, FLOOR_Y, CAREER_W, CAREER_H - FLOOR_Y, P.woodDark);
    for (let y = FLOOR_Y; y < CAREER_H; y += 7) rect(ctx, 0, y, CAREER_W, 1, P.woodDeep);
    for (let x = 7; x < CAREER_W; x += 31) rect(ctx, x, FLOOR_Y, 1, CAREER_H - FLOOR_Y, P.woodDeep);
    rect(ctx, 61, 158, 184, 17, P.clothDark);
    rect(ctx, 64, 160, 178, 13, '#70404f');
    for (let x = 68; x < 238; x += 9) px(ctx, x, 166, P.goldDark);

    // Decorative clockwork makes this unmistakably the clocktower interior.
    const gear = (cx, cy, r) => {
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            rect(ctx, cx + Math.round(Math.cos(a) * r) - 1, cy + Math.round(Math.sin(a) * r) - 1, 3, 3, P.goldDark);
        }
        for (let y = -r + 2; y <= r - 2; y++) {
            const half = Math.floor(Math.sqrt(Math.max(0, (r - 2) ** 2 - y * y)));
            rect(ctx, cx - half, cy + y, half * 2 + 1, 1, P.gold);
        }
        rect(ctx, cx - 2, cy - 2, 5, 5, P.ironDeep);
    };
    gear(31, 121, 13);
    gear(54, 132, 9);

    return s;
}

/** A framed employment contract hanging from a pair of iron loops. */
export function bakeContract(years, company, rank, accent) {
    const w = 45;
    const h = 62;
    const s = makeCanvas(w, h);
    const { ctx } = s;

    rect(ctx, 6, 0, 2, 11, P.ironDark);
    rect(ctx, w - 8, 0, 2, 11, P.ironDark);
    px(ctx, 6, 1, P.ironLit);
    px(ctx, w - 8, 1, P.ironLit);

    rect(ctx, 1, 9, w - 2, h - 10, P.woodDeep);
    rect(ctx, 3, 11, w - 6, h - 14, P.woodLit);
    rect(ctx, 5, 13, w - 10, h - 18, '#ded1ad');
    rect(ctx, 6, 14, w - 12, h - 20, '#eadfbd');
    rect(ctx, 6, 14, w - 12, 3, accent);

    const centre = (text, y, color) => drawText(ctx, text, Math.round((w - textWidth(text)) / 2), y, color);
    centre(years, 20, P.ink);
    centre(company, 29, P.woodDeep);
    const rankLines = Array.isArray(rank) ? rank : [rank];
    rankLines.forEach((line, i) => centre(line, 37 + i * 6, accent));
    rect(ctx, 10, 51, w - 22, 1, P.stoneDark);
    rect(ctx, w - 12, h - 9, 5, 5, accent);
    px(ctx, w - 10, h - 7, P.goldLit);

    return outlineSprite(s, P.outline);
}

/** Seated guild archivist, quill in hand, facing the career contracts. */
export function bakeArchivist() {
    const s = makeCanvas(28, 48);
    const { ctx } = s;
    // Robe and sleeves.
    poly(ctx, [[13, 21], [23, 23], [26, 47], [5, 47], [7, 26]], P.roofBlueDark);
    rect(ctx, 7, 25, 3, 20, P.roofBlue);
    rect(ctx, 4, 30, 14, 4, P.roofBlueDark);
    rect(ctx, 2, 31, 5, 3, P.skin);
    // Face in left profile and tied hair.
    rect(ctx, 10, 10, 11, 12, P.skin);
    rect(ctx, 8, 15, 4, 4, P.skin);
    rect(ctx, 18, 9, 5, 14, P.woodDark);
    rect(ctx, 21, 17, 5, 5, P.woodDeep);
    px(ctx, 11, 15, P.ink);
    // Scholar's cap.
    poly(ctx, [[15, 3], [25, 9], [6, 9]], P.roofBlueDark);
    rect(ctx, 5, 9, 21, 3, P.roofBlue);
    rect(ctx, 22, 10, 1, 9, P.goldDark);
    px(ctx, 22, 19, P.goldLit);
    // Quill points toward the records.
    poly(ctx, [[5, 29], [0, 19], [3, 27]], P.bone);
    px(ctx, 1, 21, P.boneDark);
    return { sprite: outlineSprite(s, P.outline), eye: { x: 12, y: 16 } };
}

export function bakeDesk() {
    const s = makeCanvas(67, 31);
    const { ctx } = s;
    rect(ctx, 0, 5, 67, 8, P.wood);
    rect(ctx, 0, 5, 67, 2, P.woodLit);
    rect(ctx, 0, 12, 67, 3, P.woodDeep);
    rect(ctx, 5, 14, 6, 17, P.woodDark);
    rect(ctx, 56, 14, 6, 17, P.woodDark);
    // Open ledger.
    poly(ctx, [[18, 5], [31, 1], [33, 6], [20, 9]], '#e8dcb9');
    poly(ctx, [[33, 6], [35, 1], [49, 5], [47, 9]], '#d8cba7');
    rect(ctx, 32, 3, 2, 5, P.woodDeep);
    return outlineSprite(s, P.outline);
}

export function bakeCareerBubble(lines) {
    const label = Array.isArray(lines) ? lines : [lines];
    const w = Math.max(...label.map(textWidth)) + 8;
    const bodyH = 4 + label.length * 7;
    const s = makeCanvas(w, bodyH + 4);
    const { ctx } = s;
    rect(ctx, 0, 0, w, bodyH, P.ink);
    rect(ctx, 1, 1, w - 2, bodyH - 2, '#f4efe0');
    poly(ctx, [[w - 9, bodyH - 1], [w - 3, bodyH - 1], [w - 4, bodyH + 3]], P.ink);
    poly(ctx, [[w - 8, bodyH - 1], [w - 4, bodyH - 1], [w - 4, bodyH + 1]], '#f4efe0');
    label.forEach((line, i) => drawText(ctx, line, 4, 3 + i * 7, P.ink));
    return s;
}

/** Small permanent stack badges along the bottom of the archive wall. */
export function bakeSkillStrip() {
    const labels = ['PHP', 'LARAVEL', 'VUE', 'JS', 'MYSQL'];
    const widths = labels.map((label) => textWidth(label) + 8);
    const w = widths.reduce((sum, width) => sum + width + 3, -3);
    const s = makeCanvas(w, 12);
    const { ctx } = s;
    let x = 0;
    labels.forEach((label, i) => {
        const width = widths[i];
        rect(ctx, x, 0, width, 12, P.ironDeep);
        rect(ctx, x + 1, 1, width - 2, 10, i % 2 ? P.roofBlueDark : P.roofPurpleDark);
        drawText(ctx, label, x + 4, 4, P.goldLit);
        x += width + 3;
    });
    return s;
}
