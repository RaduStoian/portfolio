<template>
  <div class="scene">
    <canvas
      ref="canvasRef"
      class="scene-canvas"
      :class="{ 'is-pointing': !!hovered }"
      @pointermove="onMove"
      @pointerleave="hovered = null"
      @pointerdown="onDown"
    ></canvas>

    <p class="hint">Click a building to enter. The graveyard is the one with the hammer.</p>
  </div>
</template>

<script>
import { ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { useScene } from '../useScene.js';
import { bakeOverworld, OVERWORLD_W, OVERWORLD_H } from '../art/overworld.js';
import { hitTest } from '../art/shared.js';
import { P } from '../palette.js';
import { rect, px, drawSway, drawSprite } from '../pixel.js';

// 3x5 pixel font, enough for the building labels. Each glyph is 3 columns of
// 5 bits, low bit at the top — drawing text as sprites keeps it on the pixel
// grid, where canvas fillText would antialias and break the illusion.
const GLYPHS = {
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
  ' ': [0, 0, 0],
};

function textWidth(text) {
  return text.length * 4 - 1;
}

function drawText(ctx, text, x, y, color) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char] ?? GLYPHS[' '];
    glyph.forEach((column, cx) => {
      for (let row = 0; row < 5; row++) {
        if (column & (1 << row)) rect(ctx, cursor + cx, y + row, 1, 1, color);
      }
    });
    cursor += 4;
  }
}

export default {
  name: 'OverworldScene',
  setup() {
    const router = useRouter();
    const world = shallowRef(bakeOverworld());
    const hovered = ref(null);

    // Fade-to-black handoff between scenes. Kept here rather than as a CSS
    // transition so it runs on the same clock as the scene itself and can't
    // desync from the render loop.
    let leaving = null;
    let fade = 0;

    function pick(x, y) {
      const { buildings } = world.value;
      // Reverse draw order: whatever is drawn last (nearest the camera) wins.
      for (let i = buildings.length - 1; i >= 0; i--) {
        const b = buildings[i];
        if (hitTest(b.sprite, x - b.x, y - b.y)) return b;
      }
      return null;
    }

    function onMove(event) {
      if (leaving) return;
      const { x, y } = toVirtual(event);
      hovered.value = pick(x, y);
    }

    function onDown(event) {
      if (leaving) return;
      const { x, y } = toVirtual(event);
      const target = pick(x, y);
      if (target) {
        leaving = target;
        hovered.value = null;
      }
    }

    function update(dt) {
      if (!leaving) return;
      fade = Math.min(1, fade + dt * 2.6);
      if (fade >= 1) {
        const route = leaving.route;
        leaving = null;
        router.push(route);
      }
    }

    function draw(ctx, t) {
      const w = world.value;
      const { background, buildings } = w;

      ctx.drawImage(background.canvas, 0, 0);

      // --- stars ---------------------------------------------------------
      // Single pixels stepping between three brightnesses. Fading them with
      // globalAlpha instead would put half-lit colours on screen and read as
      // blur rather than as twinkling.
      for (const star of w.stars) {
        const pulse = Math.sin(t * star.speed + star.phase);
        if (pulse < -0.55) continue;
        px(ctx, star.x, star.y, pulse > 0.65 ? '#fffbe8' : pulse > 0 ? '#e6e0d0' : '#9d97b8');
      }

      // --- chimney smoke --------------------------------------------------
      for (const source of w.smoke) {
        for (let i = 0; i < 4; i++) {
          const phase = (t * 0.32 + i / 4) % 1;
          const sx = source.x + Math.sin(phase * 4.5 + i * 2) * 3;
          const sy = source.y - phase * 30;
          const size = 1 + Math.round(phase * 2.5);
          ctx.globalAlpha = 0.45 * (1 - phase);
          rect(ctx, sx, sy, size, size, '#d8cfdd');
          ctx.globalAlpha = 1;
        }
      }

      // --- scenery behind the buildings ------------------------------------
      for (const tree of w.trees) {
        drawSway(ctx, tree.sprite, tree.x, tree.y, t, tree);
      }

      // --- well water ------------------------------------------------------
      // Two shimmer lines drifting across the surface at different rates.
      for (let i = 0; i < 2; i++) {
        const drift = Math.sin(t * (1.1 + i * 0.6) + i * 2) * 3;
        rect(ctx, Math.round(w.well.x - 4 + drift), w.well.y - 1 + i * 2, 5, 1, '#5b8fb0');
      }

      for (const b of buildings) {
        ctx.drawImage(
          b.shadow.canvas,
          Math.round(b.x + b.sprite.w / 2 - b.shadow.w / 2),
          Math.round(b.baseY - b.shadow.h / 2),
        );

        if (hovered.value === b) {
          const { highlight } = b;
          ctx.drawImage(highlight.canvas, b.x - highlight.pad, b.y - highlight.pad);
        } else {
          ctx.drawImage(b.sprite.canvas, b.x, b.y);
        }
      }

      // --- tower banner ----------------------------------------------------
      // Waved by shifting each texture column vertically along a travelling
      // sine, the cheap cousin of the graveyard's simulated cloth. No physics
      // is needed for a 16px pennant nobody can interact with.
      const banner = w.banner;
      rect(ctx, 212, 22, 1, 26, P.woodDeep);
      for (let col = 0; col < banner.w; col++) {
        const wave = Math.sin(t * 3.1 - col * 0.55) * 1.3 * (col / banner.w);
        ctx.drawImage(banner.canvas, col, 0, 1, banner.h, 213 + col, Math.round(24 + wave), 1, banner.h);
      }

      // --- foreground scenery ----------------------------------------------
      for (const bush of w.bushes) drawSway(ctx, bush.sprite, bush.x, bush.y, t, bush);
      for (const flower of w.flowers) drawSway(ctx, flower.sprite, flower.x, flower.y, t, flower);
      for (const prop of w.statics) drawSprite(ctx, prop.sprite, prop.x, prop.y);

      // --- lamplight --------------------------------------------------------
      // Additive so the glow brightens what's under it instead of fogging it,
      // with a slow flicker per lamp.
      ctx.globalCompositeOperation = 'lighter';
      for (const prop of w.statics) {
        if (!prop.glow) continue;
        const flicker = 0.78 + Math.sin(t * 6.3 + prop.x) * 0.06 + Math.sin(t * 11.7 + prop.x) * 0.04;
        ctx.globalAlpha = flicker;
        ctx.drawImage(w.lampGlow.canvas, prop.glow.x - w.lampGlow.w / 2, prop.glow.y - w.lampGlow.h / 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // --- fireflies --------------------------------------------------------
      for (const fly of w.fireflies) {
        const fx = fly.x + Math.sin(t * fly.speed + fly.phase) * fly.range;
        const fy = fly.y + Math.sin(t * fly.speed * 1.7 + fly.phase * 2) * (fly.range * 0.4);
        const blink = Math.sin(t * 2.4 + fly.phase * 3);
        if (blink < -0.2) continue;
        px(ctx, Math.round(fx), Math.round(fy), blink > 0.6 ? P.lamp : P.windowDim);
      }

      // Label plate, drawn above whichever building is hovered.
      if (hovered.value) {
        const b = hovered.value;
        const label = b.label;
        const w = textWidth(label) + 6;
        const lx = Math.round(Math.min(Math.max(b.x + b.sprite.w / 2 - w / 2, 2), OVERWORLD_W - w - 2));
        const ly = Math.max(4, b.y - 12);

        rect(ctx, lx, ly, w, 11, P.ink);
        rect(ctx, lx + 1, ly + 1, w - 2, 9, P.inkSoft);
        drawText(ctx, label, lx + 3, ly + 3, P.lamp);
      }

      // Vignette: two translucent bands rather than a radial gradient, which
      // would smear the palette.
      ctx.globalAlpha = 0.18;
      rect(ctx, 0, 0, OVERWORLD_W, 10, P.ink);
      rect(ctx, 0, OVERWORLD_H - 10, OVERWORLD_W, 10, P.ink);
      ctx.globalAlpha = 1;

      if (fade > 0) {
        ctx.globalAlpha = fade;
        rect(ctx, 0, 0, OVERWORLD_W, OVERWORLD_H, '#000');
        ctx.globalAlpha = 1;
      }
    }

    const { canvasRef, toVirtual } = useScene({
      width: OVERWORLD_W,
      height: OVERWORLD_H,
      background: P.ink,
      update,
      draw,
    });

    return { canvasRef, hovered, onMove, onDown };
  },
};
</script>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  background: #0b0b14;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.scene-canvas.is-pointing {
  cursor: pointer;
}

.hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  margin: 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}
</style>
