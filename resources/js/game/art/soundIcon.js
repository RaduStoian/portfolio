import { P } from '../palette.js';
import { makeCanvas, rect, px, outlineSprite } from '../pixel.js';

// The volume control sits outside any scene's canvas (it's DOM chrome, fixed
// to the viewport, since it needs a real range input), but it still has to
// look like it belongs in this world. Everything else in the game is baked
// true-size and blitted scaled with smoothing off. This is the same trick,
// just rendered into a plain `<canvas>` element instead of a scene.

/**
 * A speaker cone in the game's own iron-and-gold palette, one frame per
 * volume state. Waves are drawn as short stepped dashes, not the smooth
 * concentric arcs a system icon would use. The same "twinkle in discrete
 * steps, not a fade" reasoning the stars and lamps use elsewhere: a half-lit
 * pixel reads as blur, not as a clean wave.
 */
export function bakeSoundIcon(state) {
    // 13x11 becomes exactly 15x13 after outlineSprite, matching the HUD
    // canvas without clipping a row or column.
    const s = makeCanvas(13, 11);
    const { ctx } = s;

    // Box and widening horn, side-on, using the Back plaque's bone and iron.
    rect(ctx, 0, 4, 3, 4, P.bone);
    rect(ctx, 0, 4, 3, 1, P.ironLit);
    rect(ctx, 3, 3, 1, 6, P.ironLit);
    rect(ctx, 4, 2, 1, 8, P.bone);
    rect(ctx, 5, 1, 1, 10, P.bone);

    const out = outlineSprite(s, P.outline);
    const wave = out.ctx;

    if (state === 'muted') {
        px(wave, 9, 4, P.cloth);
        px(wave, 10, 5, P.cloth);
        px(wave, 11, 6, P.cloth);
        px(wave, 10, 7, P.cloth);
        px(wave, 9, 8, P.cloth);
        px(wave, 9, 7, P.cloth);
        px(wave, 10, 6, P.cloth);
        px(wave, 11, 5, P.cloth);
        px(wave, 10, 4, P.cloth);
    } else {
        // Stepped parentheses read as sound waves without any smooth CSS arc.
        px(wave, 8, 4, P.goldLit);
        px(wave, 9, 5, P.goldLit);
        px(wave, 9, 7, P.goldLit);
        px(wave, 8, 8, P.goldLit);
        if (state === 'high') {
            px(wave, 10, 2, P.goldLit);
            px(wave, 11, 3, P.goldLit);
            px(wave, 12, 4, P.goldLit);
            px(wave, 12, 8, P.goldLit);
            px(wave, 11, 9, P.goldLit);
            px(wave, 10, 10, P.goldLit);
        }
    }

    return out;
}

export function buildSoundIcons() {
    return {
        muted: bakeSoundIcon('muted'),
        low: bakeSoundIcon('low'),
        high: bakeSoundIcon('high'),
    };
}
