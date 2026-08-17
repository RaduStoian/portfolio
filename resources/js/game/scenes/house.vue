<template>
  <div class="scene">
    <canvas
      ref="canvasRef"
      class="scene-canvas"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onUp"
      @wheel="onWheel"
    ></canvas>
  </div>
</template>

<script>
import { onBeforeUnmount } from 'vue';
import { useScene } from '../useScene.js';
import { useBack } from '../useBack.js';
import { drawBackOverlay, isBackButtonEvent } from '../backButton.js';
import { createCameraInput } from '../cameraInput.js';
import { P } from '../palette.js';
import { rect, px, hash2 } from '../pixel.js';
import { HOUSE_W, HOUSE_H, FLOOR_Y, WINDOW, buildHouseArt, bakeHouseBubble } from '../art/house.js';
import { soundState, setRain, playPurr, toggleLofi } from '../sound.js';

const OBJECTS = [
  { id: 'computer', x: 238, y: 72, w: 38, h: 38, text: 'I BUILD THINGS.' },
  { id: 'lamp', x: 278, y: 72, w: 25, h: 38, text: 'ONE MORE HOUR.' },
  { id: 'record', x: 178, y: 100, w: 38, h: 27, text: 'CODE NEEDS RHYTHM.' },
  { id: 'mug', x: 225, y: 90, w: 17, h: 20, text: 'COFFEE KILLS BUGS.' },
  { id: 'cat', x: 104, y: 132, w: 66, h: 27, text: 'THE REAL MANAGER.' },
  { id: 'window', x: WINDOW.x, y: WINDOW.y, w: WINDOW.w, h: WINDOW.h, text: 'RAIN HELPS.' },
];

// One world-space rain field is revealed through both the exterior cutaway
// and the window. Per-drop speeds break up the synchronized wave pattern.
const RAIN_DROPS = Array.from({ length: 120 }, (_, i) => ({
  x: Math.floor(hash2(i, 1, 721) * HOUSE_W),
  y: Math.floor(hash2(i, 2, 722) * HOUSE_H),
  speed: 46 + hash2(i, 3, 723) * 34,
  length: hash2(i, 4, 724) > 0.22 ? 2 : 1,
  color: hash2(i, 5, 725) > 0.82 ? '#789ac4' : '#587ead',
}));

export default {
  name: 'HouseScene',
  setup() {
    const goBack = useBack();
    const art = buildHouseArt();
    const bubbles = Object.fromEntries(OBJECTS.map((item) => [item.id, bakeHouseBubble(item.text)]));

    let computerOn = true;
    let computerMode = 1;
    let lampOn = true;
    let musicOn = soundState.lofi;
    let windowOpen = false;
    let catAwake = false;
    let catWakeTimer = 0;
    let catTailFrame = 0;
    let catTailTimer = 1.8 + Math.random() * 3.8;
    let active = null;
    let bubbleTimer = 0;
    let mugSteam = [];
    let steamTimer = 0;

    function addCoffeeSteam(count = 1) {
      for (let i = 0; i < count; i++) {
        mugSteam.push({
          x: 233 + (Math.random() - 0.5) * 3,
          y: 94,
          vx: (Math.random() - 0.5) * 3,
          vy: -5 - Math.random() * 4,
          age: 0,
          life: 1.1 + Math.random() * 0.8,
        });
      }
    }

    function hitObject(x, y) {
      for (let i = OBJECTS.length - 1; i >= 0; i--) {
        const item = OBJECTS[i];
        if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) return item;
      }
      return null;
    }

    function activate(item) {
      active = item;
      bubbleTimer = 3.4;
      if (item.id === 'computer') {
        computerOn = true;
        computerMode = computerMode === 1 ? 2 : 1;
      } else if (item.id === 'lamp') lampOn = !lampOn;
      else if (item.id === 'record') musicOn = toggleLofi();
      else if (item.id === 'window') {
        windowOpen = !windowOpen;
        setRain(windowOpen);
      } else if (item.id === 'cat') {
        catAwake = true;
        catWakeTimer = 3.5;
        playPurr();
      }
      else if (item.id === 'mug') addCoffeeSteam(7);
    }

    function onDown(event) {
      if (isBackButtonEvent(event)) {
        goBack();
        return;
      }
      if (cameraInput.pressOverlay(event)) return;
      const { x, y } = toVirtual(event);
      const item = hitObject(x, y);
      if (item) activate(item);
      else cameraInput.startPan(event);
    }

    function onMove(event) {
      cameraInput.move(event);
    }

    function onUp() {
      cameraInput.end();
    }

    function update(dt) {
      if (bubbleTimer > 0) bubbleTimer -= dt;
      if (catAwake) {
        catWakeTimer -= dt;
        if (catWakeTimer <= 0) catAwake = false;
      }
      catTailTimer -= dt;
      if (catTailTimer <= 0) {
        if (catTailFrame) {
          catTailFrame = 0;
          catTailTimer = 1.8 + Math.random() * 3.8;
        } else {
          catTailFrame = 1;
          catTailTimer = 0.35 + Math.random() * 0.35;
        }
      }
      steamTimer -= dt;
      if (steamTimer <= 0) {
        addCoffeeSteam();
        steamTimer = 0.32 + Math.random() * 0.28;
      }
      for (const puff of mugSteam) {
        puff.age += dt;
        puff.x += puff.vx * dt;
        puff.y += puff.vy * dt;
      }
      mugSteam = mugSteam.filter((puff) => puff.age < puff.life);
    }

    function drawWindow(ctx) {
      // Closed: the familiar four-pane cross. Open: both full-height casements
      // hinge inward symmetrically, leaving the centre completely unobstructed.
      if (!windowOpen) {
        const midX = WINDOW.x + Math.floor(WINDOW.w / 2);
        const midY = WINDOW.y + Math.floor(WINDOW.h / 2);
        rect(ctx, midX - 1, WINDOW.y, 3, WINDOW.h, P.woodDark);
        rect(ctx, WINDOW.x, midY - 1, WINDOW.w, 3, P.woodDark);
      } else {
        const left = [[WINDOW.x + 1, WINDOW.y + 2], [WINDOW.x + 10, WINDOW.y + 7], [WINDOW.x + 10, WINDOW.y + WINDOW.h - 7], [WINDOW.x + 1, WINDOW.y + WINDOW.h - 2]];
        const right = [[WINDOW.x + WINDOW.w - 1, WINDOW.y + 2], [WINDOW.x + WINDOW.w - 11, WINDOW.y + 7], [WINDOW.x + WINDOW.w - 11, WINDOW.y + WINDOW.h - 7], [WINDOW.x + WINDOW.w - 1, WINDOW.y + WINDOW.h - 2]];
        for (const pane of [left, right]) {
          ctx.beginPath();
          pane.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
          ctx.closePath();
          ctx.strokeStyle = P.woodDark;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        const midY = WINDOW.y + Math.floor(WINDOW.h / 2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(WINDOW.x + 2, midY);
        ctx.lineTo(WINDOW.x + 10, midY);
        ctx.moveTo(WINDOW.x + WINDOW.w - 2, midY);
        ctx.lineTo(WINDOW.x + WINDOW.w - 11, midY);
        ctx.stroke();
      }
    }

    function drawRain(ctx, t) {
      ctx.save();
      // Even-odd clipping reveals one continuous field outside the complete
      // house silhouette and through the window, but nowhere over the room.
      ctx.beginPath();
      ctx.rect(0, 0, HOUSE_W, HOUSE_H);
      ctx.moveTo(0, 94);
      ctx.lineTo(80, 5);
      ctx.lineTo(240, 5);
      ctx.lineTo(HOUSE_W, 94);
      ctx.lineTo(HOUSE_W, HOUSE_H);
      ctx.lineTo(0, HOUSE_H);
      ctx.closePath();
      ctx.rect(WINDOW.x + 1, WINDOW.y + 1, WINDOW.w - 2, WINDOW.h - 2);
      ctx.clip('evenodd');

      for (const drop of RAIN_DROPS) {
        const y = Math.floor(drop.y + t * drop.speed) % HOUSE_H;
        px(ctx, drop.x, y, drop.color);
        if (drop.length === 2) px(ctx, drop.x, y + 1, P.glassDark);
      }
      ctx.restore();
    }

    function draw(ctx, t) {
      ctx.drawImage(art.backdrop.canvas, 0, 0);
      drawRain(ctx, t);
      drawWindow(ctx);

      // The record player and cat live behind the desk plane.
      ctx.drawImage(art.record.canvas, 179, 103);
      if (musicOn) {
        for (let i = 0; i < 4; i++) {
          const x = 191 + i * 7 + Math.round(Math.sin(t * 2 + i) * 2);
          const y = 100 - ((t * 10 + i * 8) % 27);
          px(ctx, x, y, i % 2 ? P.flowerPink : P.flowerYellow);
          rect(ctx, x + 1, y - 3, 1, 4, i % 2 ? P.flowerPink : P.flowerYellow);
        }
      }

      // The tail flicks between two resting positions at irregular intervals;
      // the body stays completely still until the cat is deliberately woken.
      ctx.drawImage(art.cats[catAwake ? 1 : 0].canvas, 126, 136, 39, 21);
      ctx.drawImage(art.catTails[catTailFrame].canvas, 108, 148);

      ctx.drawImage(art.desk.canvas, 215, FLOOR_Y - art.desk.h + 2);
      const computer = computerOn ? art.computers[computerMode] : art.computers[0];
      ctx.drawImage(computer.canvas, 240, 75);
      ctx.drawImage(art.lamps[lampOn ? 1 : 0].canvas, 279, 75);
      ctx.drawImage(art.mug.canvas, 228, 94);

      for (const puff of mugSteam) {
        ctx.globalAlpha = Math.max(0, 1 - puff.age / puff.life) * 0.65;
        px(ctx, Math.round(puff.x), Math.round(puff.y), P.bone);
      }
      ctx.globalAlpha = 1;

      // Screen light is confined to the display and a narrow reflection on
      // the desk top, no oversized glare rectangle below the monitor.
      ctx.globalCompositeOperation = 'lighter';
      if (computerOn) {
        ctx.globalAlpha = 0.12 + Math.sin(t * 7) * 0.02;
        rect(ctx, 245, 78, 25, 18, P.glassDark);
        ctx.globalAlpha = 0.08;
        rect(ctx, 231, 106, 54, 3, P.glassDark);
      }
      if (lampOn) {
        ctx.globalAlpha = 0.52 + Math.sin(t * 5.4) * 0.05;
        ctx.drawImage(art.lampGlow.canvas, 290 - art.lampGlow.w / 2, 88 - art.lampGlow.h / 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      if (active && bubbleTimer > 0) {
        const bubble = bubbles[active.id];
        // The cat's own bubble sits a little further down-right than the
        // shared default. Nudged off the sleeping face beneath it.
        const nudge = active.id === 'cat' ? 6 : 0;
        const bx = Math.max(4, Math.min(active.x + active.w / 2 - bubble.w / 2, HOUSE_W - bubble.w - 4)) + nudge;
        const by = Math.max(5, active.y - bubble.h - 5) + nudge;
        ctx.drawImage(bubble.canvas, Math.round(bx), Math.round(by));
      }

      ctx.globalAlpha = 0.12;
      rect(ctx, 0, 0, HOUSE_W, 7, P.ink);
      rect(ctx, 0, HOUSE_H - 7, HOUSE_W, 7, P.ink);
      ctx.globalAlpha = 1;
    }

    const scene = useScene({
      width: HOUSE_W,
      height: HOUSE_H,
      background: P.ink,
      update,
      draw,
      drawOverlay: drawBackOverlay,
    });
    const { canvasRef, toVirtual } = scene;
    const cameraInput = createCameraInput(scene);
    const onWheel = (event) => cameraInput.wheel(event);

    onBeforeUnmount(() => setRain(false));

    return { canvasRef, onDown, onMove, onUp, onWheel };
  },
};
</script>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  background: #201724;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  cursor: pointer;
}
</style>
