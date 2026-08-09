<template>
  <div class="scene">
    <canvas
      ref="canvasRef"
      class="scene-canvas"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onLeave"
      @wheel="onWheel"
    ></canvas>

    <div class="hud">
      <span class="tally">10 years · 4 companies · full stack</span>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useScene } from '../useScene.js';
import { useBack } from '../useBack.js';
import { drawBackOverlay, isBackButtonEvent } from '../backButton.js';
import { createCameraInput } from '../cameraInput.js';
import { P } from '../palette.js';
import { px } from '../pixel.js';
import { wrapText } from '../text.js';
import {
  CAREER_W, CAREER_H, FLOOR_Y,
  bakeCareerBackdrop, bakeContract, bakeArchivist, bakeDesk,
  bakeCareerBubble, bakeSkillStrip,
} from '../art/career.js';

const ROLES = [
  {
    years: '2016-18', company: 'NORTH CO', rank: ['WEB', 'DEV'], color: P.roofGreen,
    text: 'THE FIRST QUEST. SHIPPING WEBSITES, FIXING BUGS AND LEARNING THE WHOLE STACK.',
  },
  {
    years: '2018-21', company: 'EMBER CO', rank: ['FULL', 'STACK'], color: P.roofRed,
    text: 'BIGGER APPS, REAL USERS AND BACKENDS THAT HAD TO KEEP WORKING AFTER MIDNIGHT.',
  },
  {
    years: '2021-24', company: 'TIDAL CO', rank: ['SENIOR', 'DEV'], color: P.roofBlue,
    text: 'OWNED FEATURES END TO END, GUIDED OTHER DEVS AND TURNED MESSY IDEAS INTO PRODUCTS.',
  },
  {
    years: '2024-NOW', company: 'FORGE CO', rank: ['LEAD', 'BUILDER'], color: P.roofPurple,
    text: 'TEN YEARS IN. STILL BUILDING ACROSS FRONTEND, BACKEND, DATABASES AND DELIVERY.',
  },
];

const CONTRACT_X = [28, 81, 134, 187];
const CONTRACT_Y = 59;
const SPEECH_WIDTH = 112;

export default {
  name: 'CareerScene',
  setup() {
    const goBack = useBack();
    const backdrop = bakeCareerBackdrop();
    const contracts = ROLES.map((role) => bakeContract(role.years, role.company, role.rank, role.color));
    const bubbles = ROLES.map((role) => bakeCareerBubble(wrapText(role.text, SPEECH_WIDTH)));
    const archivist = bakeArchivist();
    const desk = bakeDesk();
    const skills = bakeSkillStrip();

    const motion = ROLES.map(() => ({ angle: 0, velocity: 0 }));
    let hover = -1;
    let selected = -1;
    let speechTimer = 0;

    function hitContract(x, y) {
      for (let i = contracts.length - 1; i >= 0; i--) {
        const sprite = contracts[i];
        const dx = x - (CONTRACT_X[i] + sprite.w / 2);
        const dy = y - CONTRACT_Y;
        const c = Math.cos(-motion[i].angle);
        const s = Math.sin(-motion[i].angle);
        const lx = dx * c - dy * s + sprite.w / 2;
        const ly = dx * s + dy * c;
        if (lx >= 0 && lx <= sprite.w && ly >= 0 && ly <= sprite.h) return i;
      }
      return -1;
    }

    function onDown(event) {
      if (isBackButtonEvent(event)) {
        goBack();
        return;
      }
      if (cameraInput.pressOverlay(event)) return;
      const { x, y } = toVirtual(event);
      const index = hitContract(x, y);
      if (index < 0) {
        cameraInput.startPan(event);
        return;
      }
      selected = index;
      speechTimer = Math.min(8, 3 + ROLES[index].text.length * 0.035);
      motion[index].velocity += x < CONTRACT_X[index] + contracts[index].w / 2 ? 1.4 : -1.4;
    }

    function onMove(event) {
      if (cameraInput.move(event)) {
        hover = -1;
        return;
      }
      const { x, y } = toVirtual(event);
      hover = hitContract(x, y);
    }

    function onLeave() {
      cameraInput.end();
      hover = -1;
    }

    function onUp() {
      cameraInput.end();
    }

    function update(dt) {
      if (speechTimer > 0) speechTimer -= dt;
      for (const state of motion) {
        // Small damped pendulum: tactile, but settles quickly enough that the
        // contract remains readable after being touched.
        state.velocity += -state.angle * 15 * dt;
        state.velocity *= Math.pow(0.055, dt);
        state.angle += state.velocity * dt;
        state.angle = Math.max(-0.18, Math.min(0.18, state.angle));
      }
    }

    function drawContract(ctx, sprite, i, t) {
      const x = CONTRACT_X[i];
      const y = CONTRACT_Y;
      const active = i === selected || i === hover;
      if (active) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.12 + Math.sin(t * 4 + i) * 0.04;
        ctx.fillStyle = ROLES[i].color;
        ctx.fillRect(x - 3, y + 5, sprite.w + 6, sprite.h - 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.save();
      ctx.translate(Math.round(x + sprite.w / 2), y);
      ctx.rotate(motion[i].angle);
      ctx.drawImage(sprite.canvas, -sprite.w / 2, 0);
      ctx.restore();
    }

    function draw(ctx, t) {
      ctx.drawImage(backdrop.canvas, 0, 0);

      for (let i = 0; i < contracts.length; i++) drawContract(ctx, contracts[i], i, t);

      // Stack badges are the résumé's always-visible skills summary.
      ctx.drawImage(skills.canvas, 65, 132);

      const archivistX = 269;
      const archivistY = FLOOR_Y - archivist.sprite.h + Math.round(Math.sin(t * 1.5) * 0.5);
      ctx.drawImage(archivist.sprite.canvas, archivistX, archivistY);
      if (t % 4.3 < 0.1) px(ctx, archivistX + archivist.eye.x, archivistY + archivist.eye.y, P.skinDark);
      ctx.drawImage(desk.canvas, 249, FLOOR_Y - desk.h + 5);

      if (selected >= 0 && speechTimer > 0) {
        const bubble = bubbles[selected];
        const bx = Math.min(CAREER_W - bubble.w - 4, 202);
        const by = Math.max(4, archivistY - bubble.h - 4);
        ctx.drawImage(bubble.canvas, bx, by);
      }

      // Clock hands over the gears, driven by scene time.
      const cx = 31;
      const cy = 121;
      ctx.strokeStyle = P.ironDeep;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.round(Math.sin(t * 0.35) * 8), cy - Math.round(Math.cos(t * 0.35) * 8));
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.round(Math.sin(t * 0.07) * 5), cy - Math.round(Math.cos(t * 0.07) * 5));
      ctx.stroke();

    }

    const scene = useScene({
      width: CAREER_W,
      height: CAREER_H,
      background: P.ink,
      update,
      draw,
      drawOverlay: drawBackOverlay,
    });
    const { canvasRef, toVirtual } = scene;
    const cameraInput = createCameraInput(scene);

    const onWheel = (event) => cameraInput.wheel(event);

    return { canvasRef, onDown, onMove, onUp, onLeave, onWheel, goBack };
  },
};
</script>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  background: #15101a;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  cursor: pointer;
}

.hud {
  position: absolute;
  top: 50px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.btn {
  background: rgba(12, 12, 22, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #e8e4d8;
  border-radius: 4px;
  padding: 5px 10px;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.btn:hover {
  background: rgba(30, 30, 48, 0.9);
}
</style>
