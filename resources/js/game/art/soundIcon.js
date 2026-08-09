import { P } from '../palette.js';
import { makeCanvas, rect, px, outlineSprite } from '../pixel.js';

// The volume control sits outside any scene's canvas (it's DOM chrome, fixed
// to the viewport, since it needs a real range input), but it still has to
// look like it belongs in this world. Everything else in the game is baked
// true-size and blitted scaled with smoothing off — this is the same trick,
// just rendered into a plain `<canvas>` element instead of a scene.

/**
 * A speaker cone in the game's own iron-and-gold palette, one frame per
 * volume state. Waves are drawn as short stepped dashes, not the smooth
 * concentric arcs a system icon would use — the same "twinkle in discrete
 * steps, not a fade" reasoning the stars and lamps use elsewhere: a half-lit
 * pixel reads as blur, not as a clean wave.
 */
export function bakeSoundIcon(state) {
    const s = makeCanvas(15, 13);
    const { ctx } = s;

    // Box and cone, side-on.
    rect(ctx, 1, 4, 3, 5, P.ironLit);
    rect(ctx, 1, 4, 3, 1, P.bone);
    rect(ctx, 4, 3, 1, 7, P.ironLit);
    rect(ctx, 5, 2, 1, 9, P.ironLit);
    rect(ctx, 6, 1, 1, 11, P.bone);

    if (state === 'muted') {
        px(ctx, 9, 4, P.cloth);
        px(ctx, 10, 5, P.cloth);
        px(ctx, 11, 6, P.cloth);
        px(ctx, 12, 7, P.cloth);
        px(ctx, 9, 7, P.cloth);
        px(ctx, 10, 6, P.cloth);
        px(ctx, 12, 4, P.cloth);
        px(ctx, 11, 5, P.cloth);
    } else {
        // A near dash, always present once there's any volume at all.
        px(ctx, 9, 5, P.goldLit);
        px(ctx, 9, 6, P.goldLit);
        px(ctx, 9, 7, P.goldLit);
        if (state === 'high') {
            // A second, farther dash only once the volume is loud enough to
            // actually carry that far.
            px(ctx, 12, 3, P.goldLit);
            px(ctx, 12, 9, P.goldLit);
            px(ctx, 13, 4, P.goldLit);
            px(ctx, 13, 8, P.goldLit);
        }
    }

    return outlineSprite(s, P.outline);
}

export function buildSoundIcons() {
    return {
        muted: bakeSoundIcon('muted'),
        low: bakeSoundIcon('low'),
        high: bakeSoundIcon('high'),
    };
}
