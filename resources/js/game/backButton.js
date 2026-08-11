import { P } from './palette.js';
import { rect, px } from './pixel.js';
import { drawText } from './text.js';

export const BACK_BUTTON = { x: 4, y: 4, w: 34, h: 12 };

/** A tiny iron-and-gold plaque drawn on the same pixel grid as each scene. */
export function drawBackButton(ctx) {
    const { x, y, w, h } = BACK_BUTTON;
    rect(ctx, x, y, w, h, P.outline);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, P.ironDeep);
    rect(ctx, x + 2, y + 2, w - 4, 1, P.iron);
    rect(ctx, x + 2, y + h - 3, w - 4, 1, P.ironDark);

    // Left arrow, built pixel-by-pixel rather than relying on a font glyph.
    px(ctx, x + 4, y + 6, P.goldLit);
    px(ctx, x + 5, y + 5, P.goldLit);
    px(ctx, x + 5, y + 7, P.goldLit);
    rect(ctx, x + 6, y + 6, 4, 1, P.goldLit);
    drawText(ctx, 'BACK', x + 12, y + 4, P.bone);
}

function drawEdgeArrow(ctx, direction, viewportWidth, viewportHeight) {
    const vw = viewportWidth / 2;
    const vh = viewportHeight / 2;
    let x = 4;
    let y = vh / 2 - 8;
    if (direction === 'right') x = vw - 14;
    else if (direction === 'up') x = vw / 2 - 5, y = 4;
    else if (direction === 'down') x = vw / 2 - 5, y = vh - 14;

    const horizontal = direction === 'left' || direction === 'right';
    const w = horizontal ? 10 : 11;
    const h = horizontal ? 17 : 10;
    rect(ctx, x, y, w, h, P.outline);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, P.ironDeep);
    rect(ctx, x + 2, y + 2, w - 4, 1, P.iron);

    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    if (direction === 'left') {
        px(ctx, cx - 2, cy, P.goldLit);
        px(ctx, cx - 1, cy - 1, P.goldLit);
        px(ctx, cx - 1, cy + 1, P.goldLit);
        px(ctx, cx, cy - 2, P.goldLit);
        px(ctx, cx, cy + 2, P.goldLit);
    } else if (direction === 'right') {
        px(ctx, cx + 2, cy, P.goldLit);
        px(ctx, cx + 1, cy - 1, P.goldLit);
        px(ctx, cx + 1, cy + 1, P.goldLit);
        px(ctx, cx, cy - 2, P.goldLit);
        px(ctx, cx, cy + 2, P.goldLit);
    } else if (direction === 'up') {
        px(ctx, cx, cy - 2, P.goldLit);
        px(ctx, cx - 1, cy - 1, P.goldLit);
        px(ctx, cx + 1, cy - 1, P.goldLit);
        px(ctx, cx - 2, cy, P.goldLit);
        px(ctx, cx + 2, cy, P.goldLit);
    } else {
        px(ctx, cx, cy + 2, P.goldLit);
        px(ctx, cx - 1, cy + 1, P.goldLit);
        px(ctx, cx + 1, cy + 1, P.goldLit);
        px(ctx, cx - 2, cy, P.goldLit);
        px(ctx, cx + 2, cy, P.goldLit);
    }
}

function drawNavigationOverlay(ctx, { dpr, viewportWidth, viewportHeight, camera }, withBack) {
    ctx.save();
    ctx.setTransform(dpr * 2, 0, 0, dpr * 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (withBack) drawBackButton(ctx);
    if (camera.left) drawEdgeArrow(ctx, 'left', viewportWidth, viewportHeight);
    if (camera.right) drawEdgeArrow(ctx, 'right', viewportWidth, viewportHeight);
    if (camera.up) drawEdgeArrow(ctx, 'up', viewportWidth, viewportHeight);
    if (camera.down) drawEdgeArrow(ctx, 'down', viewportWidth, viewportHeight);
    ctx.restore();
}

/** Draw viewport-fixed camera arrows and the Back plaque at a crisp 2x. */
export function drawBackOverlay(ctx, options) {
    drawNavigationOverlay(ctx, options, true);
}

/** The town square is the navigation root: camera arrows, but no Back plaque. */
export function drawCameraOverlay(ctx, options) {
    drawNavigationOverlay(ctx, options, false);
}

/** Match the viewport-fixed overlay with a forgiving mobile tap target. */
export function isBackButtonEvent(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    return x >= 6 && x <= 82 && y >= 6 && y <= 44;
}
