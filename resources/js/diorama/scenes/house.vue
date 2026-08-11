<template>
  <div class="scene">
    <canvas ref="canvasRef" class="scene-canvas"></canvas>
    <button class="back" type="button" @click="goBack">&larr; Back</button>
    <span class="tag">diorama style — compare with /about</span>
  </div>
</template>

<script>
import { useScene } from '../../game/useScene.js';
import { useBack } from '../../game/useBack.js';
import { ROOM_W, ROOM_H, drawRoom } from '../rooms/house.js';

export default {
  name: 'HouseDioramaScene',
  setup() {
    const goBack = useBack();

    let tailAngle = 0;
    let tailTimer = 2 + Math.random() * 3;
    let wagAge = null;

    let steam = [];
    let steamTimer = 0;

    function update(dt) {
      tailTimer -= dt;
      if (tailTimer <= 0 && wagAge === null) {
        wagAge = 0;
        tailTimer = 2.5 + Math.random() * 4.5;
      }
      if (wagAge !== null) {
        wagAge += dt;
        const dur = 0.9;
        const progress = wagAge / dur;
        // Two quick decaying flicks, not a single swing.
        tailAngle = Math.sin(progress * Math.PI * 4) * 0.5 * (1 - progress);
        if (progress >= 1) {
          tailAngle = 0;
          wagAge = null;
        }
      }

      steamTimer -= dt;
      if (steamTimer <= 0) {
        steam.push({
          x: 326 + (Math.random() - 0.5) * 4,
          y: 178,
          age: 0,
          life: 1.6 + Math.random() * 0.6,
          vy: -9 - Math.random() * 4,
        });
        steamTimer = 0.35 + Math.random() * 0.25;
      }
      for (const puff of steam) {
        puff.age += dt;
        puff.y += puff.vy * dt;
        puff.x += Math.sin(puff.age * 3) * 0.15;
      }
      steam = steam.filter((puff) => puff.age < puff.life);
    }

    function draw(ctx, t) {
      drawRoom(ctx, t, { tailAngle, steam, musicOn: true });
    }

    const { canvasRef } = useScene({
      width: ROOM_W,
      height: ROOM_H,
      background: '#171129',
      update,
      draw,
    });

    return { canvasRef, goBack };
  },
};
</script>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  background: #171129;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.back {
  position: fixed;
  top: 16px;
  left: 16px;
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: rgba(20, 16, 30, 0.55);
  color: #f1e6d8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  backdrop-filter: blur(6px);
  cursor: pointer;
}

.back:hover {
  background: rgba(20, 16, 30, 0.75);
}

.tag {
  position: fixed;
  bottom: 14px;
  right: 18px;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgba(241, 230, 216, 0.55);
}
</style>
