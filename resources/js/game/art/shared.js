import { makeCanvas, rect, px, poly, hash2 } from '../pixel.js';

/**
 * Read a sprite's alpha channel once so hover hit-testing is pixel-accurate
 * (you can point at the gap under an archway and it correctly misses) without
 * re-reading image data every mouse move.
 */
export function alphaMask({ canvas, ctx, w, h }) {
    const { data } = ctx.getImageData(0, 0, w, h);
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 8 ? 1 : 0;
    return { canvas, w, h, mask };
}

export function hitTest(sprite, localX, localY) {
    const x = localX | 0;
    const y = localY | 0;
    if (x < 0 || y < 0 || x >= sprite.w || y >= sprite.h) return false;
    return sprite.mask[y * sprite.w + x] === 1;
}

/**
 * Build the hover version of a sprite: the art lightened slightly, plus a 1px
 * outline hugging its silhouette. Baked once at load rather than composited per
 * frame — the outline pass is a full O(w*h) neighbour scan.
 */
export function makeHighlight(sprite, outlineColor = '#ffe9a8', lighten = 0.22) {
    const pad = 1;
    const out = makeCanvas(sprite.w + pad * 2, sprite.h + pad * 2);

    // Silhouette outline: any transparent pixel touching an opaque one.
    for (let y = 0; y < out.h; y++) {
        for (let x = 0; x < out.w; x++) {
            const sx = x - pad;
            const sy = y - pad;
            if (hitTest(sprite, sx, sy)) continue;

            const touching =
                hitTest(sprite, sx - 1, sy) ||
                hitTest(sprite, sx + 1, sy) ||
                hitTest(sprite, sx, sy - 1) ||
                hitTest(sprite, sx, sy + 1);

            if (touching) rect(out.ctx, x, y, 1, 1, outlineColor);
        }
    }

    out.ctx.drawImage(sprite.canvas, pad, pad);

    // Lighten only where the sprite already is, so the outline stays pure.
    out.ctx.globalCompositeOperation = 'source-atop';
    out.ctx.fillStyle = `rgba(255, 240, 200, ${lighten})`;
    out.ctx.fillRect(pad, pad, sprite.w, sprite.h);
    out.ctx.globalCompositeOperation = 'source-over';

    return { canvas: out.canvas, w: out.w, h: out.h, pad };
}

// ---------------------------------------------------------------------------
// Breaking things
// ---------------------------------------------------------------------------

/**
 * Split a w x h sprite into convex chunks over a jittered grid.
 *
 * The grid's *vertices* are jittered rather than each cell independently, so
 * neighbouring chunks share exact corners — the pieces still fit together like
 * a broken stone instead of leaving gaps. Cells stay convex (matter needs that
 * without poly-decomp) because the jitter is well under half a cell.
 */
export function shatterCells(w, h, cols, rows, seed, jitterScale = 0.28) {
    const cellW = w / cols;
    const cellH = h / rows;
    const jitter = Math.min(cellW, cellH) * jitterScale;

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

/**
 * What fraction of a shatter cell actually has sprite in it.
 *
 * Chunks are drawn by clipping to their polygon and blitting the whole sprite
 * behind it, so a cell over a transparent corner produces an invisible chunk
 * that still collides — a round item like the orb ends up bouncing off thin
 * air. Cells under the threshold get dropped instead. Sampled on a coarse grid
 * because this runs at the moment of the break.
 */
export function cellCoverage(sprite, cell) {
    const { data } = sprite.ctx.getImageData(0, 0, sprite.w, sprite.h);
    let inside = 0;
    let opaque = 0;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of cell) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }

    // Cell coords are centred on the sprite; shift into image space.
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
            const ix = Math.floor(x + sprite.w / 2);
            const iy = Math.floor(y + sprite.h / 2);
            if (ix < 0 || iy < 0 || ix >= sprite.w || iy >= sprite.h) continue;
            inside++;
            if (data[(iy * sprite.w + ix) * 4 + 3] > 8) opaque++;
        }
    }

    return inside === 0 ? 0 : opaque / inside;
}

/** Dust puff sprite pool, thrown when something breaks. */
export function bakeDust(color = '#b9b3a4') {
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
            color,
        );
        return s;
    });
}

/**
 * A 3/4-view building box: front wall, receding right wall, and a hipped roof
 * drawn as stacked shrinking rows so its slopes land on the pixel staircase.
 *
 * `depth` is how far the box recedes up-and-right; the 2:1 ratio (dy = dx/2) is
 * what sells the fake isometry without any real projection maths.
 */
export function isoBox(ctx, ox, oy, bw, depth, bh, colors) {
    const dy = depth / 2;

    // Right (shaded) wall — drawn first so the front wall overlaps its seam.
    poly(
        ctx,
        [
            [ox + bw, oy - bh],
            [ox + bw + depth, oy - bh - dy],
            [ox + bw + depth, oy - dy],
            [ox + bw, oy],
        ],
        colors.wallDark,
    );

    // Front wall.
    rect(ctx, ox, oy - bh, bw, bh, colors.wall);

    // Surface texture. Plank walls get horizontal boards with staggered end
    // joints; stone walls get courses of individual blocks. Either way the
    // point is to break up a flat rectangle of single colour.
    if (colors.texture === 'planks') {
        for (let y = oy - bh + 3; y < oy; y += 4) {
            rect(ctx, ox, y, bw, 1, colors.wallDark);
            for (let x = ox + ((y / 4) % 2 ? 5 : 11); x < ox + bw; x += 13) {
                rect(ctx, x, y - 3, 1, 3, colors.wallDark);
            }
        }
    } else if (colors.texture === 'stone') {
        for (let y = oy - bh + 4; y < oy; y += 5) {
            rect(ctx, ox, y, bw, 1, colors.wallDark);
            for (let x = ox + ((y / 5) % 2 ? 4 : 9); x < ox + bw; x += 10) {
                rect(ctx, x, y - 4, 1, 4, colors.wallDark);
                // A lit top edge on some blocks makes the courses read as
                // chunky stone rather than as a drawn grid.
                if (hash2(x, y, 5) > 0.5) rect(ctx, x + 1, y - 4, 3, 1, colors.wallLit ?? colors.wall);
            }
        }
    }

    // Vertical corner seam gives the box its edge without an outline pass.
    rect(ctx, ox + bw - 1, oy - bh, 1, bh, colors.wallSeam ?? colors.wallDark);
}

/** Window with a frame, sill and warm interior light. */
export function windowPane(ctx, x, y, w, h, frame, glass, glow) {
    rect(ctx, x - 1, y - 1, w + 2, h + 2, frame);
    rect(ctx, x, y, w, h, glass);
    // Light pools at the bottom of the pane.
    rect(ctx, x, y + h - 1, w, 1, glow);
    // Muntins.
    rect(ctx, x + ((w / 2) | 0), y, 1, h, frame);
    rect(ctx, x, y + ((h / 2) | 0), w, 1, frame);
    // Sill.
    rect(ctx, x - 2, y + h + 1, w + 4, 1, frame);
}

/**
 * Hipped roof sitting on a box of the given footprint.
 *
 * Drawn as two solid slopes rather than a stack of 1px rows: a 1px-tall quad
 * spanning a diagonal only produces a couple of pixels per scanline, so the
 * stacked version left gaps and the roof came out looking hatched.
 */
export function isoRoof(ctx, ox, oy, bw, depth, rh, roof, roofDark) {
    const dy = depth / 2;
    const inset = Math.round(Math.min(bw, depth) * 0.34);

    // Front slope: eaves at the bottom, ridge inset at the top.
    poly(
        ctx,
        [
            [ox, oy],
            [ox + bw, oy],
            [ox + bw - inset, oy - rh],
            [ox + inset, oy - rh],
        ],
        roof,
    );

    // Receding slope, one shade down.
    poly(
        ctx,
        [
            [ox + bw, oy],
            [ox + bw + depth, oy - dy],
            [ox + bw + depth - inset, oy - dy - rh],
            [ox + bw - inset, oy - rh],
        ],
        roofDark,
    );

    // Shingle courses on the front slope. The slope's edges move inward
    // linearly from eaves to ridge, so each course's span is exact rather than
    // clipped — no stray pixels hanging off the roof.
    for (let step = 3; step < rh; step += 3) {
        const t = step / rh;
        const y = oy - step;
        const left = Math.round(ox + inset * t);
        const right = Math.round(ox + bw - inset * t);
        rect(ctx, left, y, right - left, 1, roofDark);

        // Stagger the tab gaps course to course so it doesn't grid up.
        for (let x = left + ((step / 3) % 2 ? 2 : 4); x < right; x += 5) {
            rect(ctx, x, y + 1, 1, 2, roofDark);
        }
    }

    // A couple of streaks down the receding slope, parallel to its top edge,
    // to keep it from reading as a flat block.
    for (let step = 3; step < rh; step += 4) {
        const t = step / rh;
        const x0 = Math.round(ox + bw - inset * t);
        const y0 = oy - step;
        for (let k = 0; k < depth; k++) {
            px(ctx, x0 + k, Math.round(y0 - k / 2), roofDark);
        }
    }

    // Ridge cap, catching the light.
    poly(
        ctx,
        [
            [ox + inset, oy - rh],
            [ox + bw - inset, oy - rh],
            [ox + bw + depth - inset, oy - dy - rh],
            [ox + inset + depth, oy - dy - rh],
        ],
        roof,
    );
    rect(ctx, ox + inset, oy - rh - 1, bw - inset * 2, 1, roofDark);

    // Eaves overhang: a 1px lip along the front, which is what makes a roof
    // read as sitting *on* a box rather than being part of it.
    rect(ctx, ox - 1, oy, bw + 2, 1, roofDark);
}
