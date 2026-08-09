// A 3x5 pixel font, drawn as sprites rather than with canvas `fillText`.
//
// fillText antialiases and hints, which puts grey half-pixels on the grid and
// instantly breaks the illusion at a 3-6x upscale. Each glyph here is 3 columns
// of 5 bits, low bit at the top, so a letter is literally 15 decisions.

export const GLYPHS = {
    A: [0b11111, 0b00101, 0b11111], B: [0b11111, 0b10101, 0b01010],
    C: [0b01110, 0b10001, 0b10001], D: [0b11111, 0b10001, 0b01110],
    E: [0b11111, 0b10101, 0b10101], F: [0b11111, 0b00101, 0b00101],
    G: [0b01110, 0b10001, 0b11101], H: [0b11111, 0b00100, 0b11111],
    I: [0b10001, 0b11111, 0b10001], J: [0b11000, 0b10000, 0b11111],
    K: [0b11111, 0b00100, 0b11011], L: [0b11111, 0b10000, 0b10000],
    M: [0b11111, 0b00010, 0b11111], N: [0b11111, 0b00110, 0b11111],
    O: [0b01110, 0b10001, 0b01110], P: [0b11111, 0b00101, 0b00010],
    Q: [0b01110, 0b11001, 0b11110], R: [0b11111, 0b00101, 0b11010],
    S: [0b10010, 0b10101, 0b01001], T: [0b00001, 0b11111, 0b00001],
    U: [0b01111, 0b10000, 0b01111], V: [0b00111, 0b11000, 0b00111],
    W: [0b11111, 0b01000, 0b11111], X: [0b11011, 0b00100, 0b11011],
    Y: [0b00011, 0b11100, 0b00011], Z: [0b11001, 0b10101, 0b10011],
    '0': [0b11111, 0b10001, 0b11111], '1': [0b10010, 0b11111, 0b10000],
    '2': [0b11101, 0b10101, 0b10111], '3': [0b10101, 0b10101, 0b11111],
    '4': [0b00111, 0b00100, 0b11111], '5': [0b10111, 0b10101, 0b11101],
    '6': [0b11111, 0b10101, 0b11101], '7': [0b00001, 0b11101, 0b00011],
    '8': [0b11111, 0b10101, 0b11111], '9': [0b10111, 0b10101, 0b11111],
    '!': [0b00000, 0b10111, 0b00000], '.': [0b00000, 0b10000, 0b00000],
    '-': [0b00100, 0b00100, 0b00100], "'": [0b00000, 0b00011, 0b00000],
    ',': [0b00000, 0b11000, 0b00000],
    ' ': [0, 0, 0],
};

/** Advance is 4px per glyph (3 wide + 1 gap); the trailing gap isn't counted. */
export function textWidth(text) {
    return text.length * 4 - 1;
}

export function drawText(ctx, text, x, y, color) {
    ctx.fillStyle = color;
    let cursor = x;
    for (const char of text.toUpperCase()) {
        const glyph = GLYPHS[char] ?? GLYPHS[' '];
        glyph.forEach((column, cx) => {
            for (let row = 0; row < 5; row++) {
                if (column & (1 << row)) ctx.fillRect((cursor + cx) | 0, (y + row) | 0, 1, 1);
            }
        });
        cursor += 4;
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
 * fading — the same reasoning as the twinkling stars elsewhere in this game,
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
        glyph.forEach((column, gx) => {
            for (let row = 0; row < 5; row++) {
                if (column & (1 << row)) ctx.fillRect((cursor + gx) | 0, (y + row + bob) | 0, 1, 1);
            }
        });
        cursor += 4;
    }
}
