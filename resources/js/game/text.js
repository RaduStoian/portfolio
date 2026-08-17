// A 4x6 pixel font, drawn as sprites rather than with canvas `fillText`.
//
// fillText antialiases and hints, which puts grey half-pixels on the grid and
// instantly breaks the illusion at a 3-6x upscale. Each glyph is written here
// as its own 6-row grid so the shape is readable straight from the source,
// no bit-twiddling required to see or edit a letter. This engine never
// smooths a glyph edge, so "smaller but still detailed" can't come from
// rendering the same grid at a fractional pixel size (that's just blur by
// another name). It has to come from a tighter grid. 4x6 is one column and
// one row past the original 3x5: just enough for round letters (O/C/S/G) to
// get a flat-ish top/bottom instead of a single-pixel apex, without the
// footprint growing much past the original.

export const GLYPH_W = 4;
export const GLYPH_H = 6;

export const GLYPHS = {
    A: ['.XX.', 'X..X', 'X..X', 'XXXX', 'X..X', 'X..X'],
    B: ['XXX.', 'X..X', 'XXX.', 'X..X', 'X..X', 'XXX.'],
    C: ['.XXX', 'X...', 'X...', 'X...', 'X...', '.XXX'],
    D: ['XXX.', 'X..X', 'X..X', 'X..X', 'X..X', 'XXX.'],
    E: ['XXXX', 'X...', 'XXX.', 'X...', 'X...', 'XXXX'],
    F: ['XXXX', 'X...', 'XXX.', 'X...', 'X...', 'X...'],
    G: ['.XXX', 'X...', 'X.XX', 'X..X', 'X..X', '.XXX'],
    H: ['X..X', 'X..X', 'XXXX', 'X..X', 'X..X', 'X..X'],
    I: ['X...', 'X...', 'X...', 'X...', 'X...', 'X...'],
    J: ['..XX', '...X', '...X', '...X', 'X..X', '.XX.'],
    K: ['X..X', 'X.X.', 'XX..', 'X.X.', 'X.X.', 'X..X'],
    L: ['X...', 'X...', 'X...', 'X...', 'X...', 'XXXX'],
    M: ['X..X', 'XXXX', 'X..X', 'X..X', 'X..X', 'X..X'],
    N: ['X..X', 'XX.X', 'X.XX', 'X..X', 'X..X', 'X..X'],
    O: ['.XX.', 'X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
    P: ['XXX.', 'X..X', 'X..X', 'XXX.', 'X...', 'X...'],
    Q: ['.XX.', 'X..X', 'X..X', 'X..X', 'X.X.', '.XXX'],
    R: ['XXX.', 'X..X', 'X..X', 'XXX.', 'X.X.', 'X..X'],
    S: ['.XXX', 'X...', '.XX.', '...X', '...X', 'XXX.'],
    T: ['XXXX', '.X..', '.X..', '.X..', '.X..', '.X..'],
    U: ['X..X', 'X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
    V: ['X..X', 'X..X', 'X..X', 'X..X', '.XX.', '.X..'],
    W: ['X..X', 'X..X', 'X..X', 'X.XX', 'XX.X', 'X..X'],
    X: ['X..X', 'X..X', '.XX.', '.XX.', 'X..X', 'X..X'],
    Y: ['X..X', 'X..X', '.XX.', '.X..', '.X..', '.X..'],
    Z: ['XXXX', '...X', '..X.', '.X..', 'X...', 'XXXX'],
    '0': ['.XX.', 'X..X', 'X.XX', 'XX.X', 'X..X', '.XX.'],
    '1': ['.X..', 'XX..', '.X..', '.X..', '.X..', 'XXX.'],
    '2': ['.XX.', 'X..X', '...X', '..X.', '.X..', 'XXXX'],
    '3': ['.XX.', 'X..X', '..X.', '...X', 'X..X', '.XX.'],
    '4': ['..X.', '.XX.', 'X.X.', 'XXXX', '..X.', '..X.'],
    '5': ['XXXX', 'X...', 'XXX.', '...X', 'X..X', '.XX.'],
    '6': ['.XX.', 'X...', 'XXX.', 'X..X', 'X..X', '.XX.'],
    '7': ['XXXX', '...X', '..X.', '.X..', '.X..', '.X..'],
    '8': ['.XX.', 'X..X', '.XX.', 'X..X', 'X..X', '.XX.'],
    '9': ['.XX.', 'X..X', 'X..X', '.XXX', '...X', '.XX.'],
    '!': ['.X..', '.X..', '.X..', '.X..', '....', '.X..'],
    '.': ['....', '....', '....', '....', '....', '.XX.'],
    '-': ['....', '....', 'XXXX', '....', '....', '....'],
    "'": ['.X..', '.X..', '....', '....', '....', '....'],
    ',': ['....', '....', '....', '....', '.X..', 'X...'],
    ' ': ['....', '....', '....', '....', '....', '....'],
};

/**
 * Per-character advance override, for the rare glyph whose ink doesn't fill
 * the 4px box. I is a single 1px stroke, so advancing the full 5px like a
 * boxy letter left a visibly wider gap after it than after anything else.
 */
const ADVANCE_OVERRIDES = { I: 2 };

function advanceFor(char) {
    return ADVANCE_OVERRIDES[char] ?? GLYPH_W + 1;
}

/** Advance is 5px per glyph (4 wide + 1 gap) by default; the trailing gap isn't counted. */
export function textWidth(text) {
    let w = 0;
    for (const char of text.toUpperCase()) w += advanceFor(char);
    return w - 1;
}

export function drawText(ctx, text, x, y, color) {
    ctx.fillStyle = color;
    let cursor = x;
    for (const char of text.toUpperCase()) {
        const glyph = GLYPHS[char] ?? GLYPHS[' '];
        for (let row = 0; row < GLYPH_H; row++) {
            const line = glyph[row];
            for (let col = 0; col < GLYPH_W; col++) {
                if (line[col] === 'X') ctx.fillRect((cursor + col) | 0, (y + row) | 0, 1, 1);
            }
        }
        cursor += advanceFor(char);
    }
}

/**
 * Greedy word-wrap for the pixel font: packs whole words onto a line until
 * the next one would push it past `maxWidthPx`, measured with the font's own
 * `textWidth` rather than a character count, since counting would drift the
 * moment anyone edits a line to use narrower/wider punctuation.
 */
export function wrapText(text, maxWidthPx) {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && textWidth(candidate) > maxWidthPx) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);

    return lines;
}

/**
 * A word as it might appear in a scrying orb: centred on `cx`, each glyph
 * bobbing on its own phase and stepping between two colours rather than
 * fading. The same reasoning as the twinkling stars elsewhere in this game,
 * a half-lit pixel reads as blur, not as shimmer. The bob is what makes it
 * "swirly" rather than just floating text; it has to be uneven letter to
 * letter or the whole word just bounces as one rigid block.
 */
export function drawSwirlyText(ctx, text, cx, y, t, colorA, colorB) {
    const upper = text.toUpperCase();
    let cursor = cx - Math.round(textWidth(upper) / 2);

    for (let i = 0; i < upper.length; i++) {
        const glyph = GLYPHS[upper[i]] ?? GLYPHS[' '];
        const bob = Math.round(Math.sin(t * 3.1 + i * 0.9) * 1.4);
        const color = Math.sin(t * 5 + i * 1.7) > 0.15 ? colorA : colorB;
        ctx.fillStyle = color;
        for (let row = 0; row < GLYPH_H; row++) {
            const line = glyph[row];
            for (let col = 0; col < GLYPH_W; col++) {
                if (line[col] === 'X') ctx.fillRect((cursor + col) | 0, (y + row + bob) | 0, 1, 1);
            }
        }
        cursor += advanceFor(upper[i]);
    }
}
