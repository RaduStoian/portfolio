<template>
  <div class="scene">
    <canvas
      ref="canvasRef"
      class="scene-canvas"
      :class="{ 'is-grabbing': dragging }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onUp"
      @wheel="onWheel"
    ></canvas>

    <div class="hud">
      <button type="button" class="btn" @click="reset">Rebuild stones</button>
      <span class="tally">{{ broken }} / {{ total }} smashed</span>
    </div>
  </div>
</template>

<script>
import { ref, onBeforeUnmount } from 'vue';
import Matter from 'matter-js';
import { useScene } from '../useScene.js';
import { useBack } from '../useBack.js';
import { drawBackOverlay, isBackButtonEvent } from '../backButton.js';
import { createCameraInput } from '../cameraInput.js';
import { grabAt } from '../grab.js';
import { P } from '../palette.js';
import { rect, px, drawSway } from '../pixel.js';
import { wrapText } from '../text.js';
import {
  GRAVEYARD_W,
  GRAVEYARD_H,
  GROUND_Y,
  bakeBackdrop,
  bakeGraveyardProps,
  bakeGravestone,
  bakeHammer,
  bakeGraveKeeper,
  bakeGraveBubble,
  bakeCrypt,
  bakeTorchFrames,
  bakeTorchGlow,
} from '../art/graveyard.js';
import { bakeDust, shatterCells } from '../art/shared.js';

const { Engine, Composite, Bodies, Body, Constraint, Events, Vector, Vertices } = Matter;

// Relative speed (px per physics step) a hammer strike must exceed to break a
// stone. Tuned so a deliberate swing shatters and a nudge or a topple doesn't.
const BREAK_SPEED = 5.5;

const HEAD_W = 16;
const HEAD_H = 10;
const HANDLE_LEN = 30;

const STONE_LAYOUT = [
  {
    id: 'poop-fight', x: 72, variant: 0, epitaph: [12, 8],
    words: 'POOP FIGHT. DOUBLE JUMP, THEN LAND ON THE OTHER GUY FIRST.',
  },
  {
    id: 'quick-draw', x: 113, variant: 2, epitaph: [9, 13],
    words: 'QUICK DRAW. PULL YOUR PIXEL SIX SHOOTER BEFORE THE COWBOY DOES.',
  },
  {
    id: 'girlfriend-games', x: 154, variant: 1, epitaph: [14, 9, 12],
    words: 'A BIG GUIDE MADE TO HELP COUPLES FIND GAMES THEY BOTH ENJOY.',
  },
  {
    id: 'long-distance', x: 195, variant: 3, epitaph: [10, 14, 8],
    words: 'VIDEO, VOICE AND GAMES IN ONE PLACE. PLAY CHESS FACE TO FACE FROM FAR AWAY.',
  },
];

const SPEECH_WIDTH = 104;

export default {
  name: 'GraveyardScene',
  setup() {
    const goBack = useBack();
    const dragging = ref(false);
    const broken = ref(0);
    const total = STONE_LAYOUT.length;

    // --- baked art (once) ------------------------------------------------
    const backdrop = bakeBackdrop();
    const scenery = bakeGraveyardProps();
    const stoneSprites = STONE_LAYOUT.map((def) => bakeGravestone(def.variant, def.epitaph));
    const hammerSprite = bakeHammer(HEAD_W, HEAD_H, HANDLE_LEN);
    const keeper = bakeGraveKeeper();
    const crypt = bakeCrypt();
    const torchFrames = bakeTorchFrames();
    const torchGlow = bakeTorchGlow();
    const keeperBubbles = STONE_LAYOUT.map((stone) => bakeGraveBubble(wrapText(stone.words, SPEECH_WIDTH)));
    const dustSprites = bakeDust();

    // --- physics ----------------------------------------------------------
    const engine = Engine.create();
    engine.gravity.y = 1;
    const world = engine.world;

    let stones = [];
    let chunks = [];
    let particles = [];
    let hammer = null;
    let hammerOffset = { x: 0, y: 0 };
    let dragConstraint = null;
    let pointer = { x: 0, y: 0 };
    let keeperBubble = null;
    let keeperTimer = 0;
    let torchTimer = 1.2 + Math.random() * 2;
    let torchFlash = 0;
    let torchSparks = [];

    function speak(index) {
      keeperBubble = keeperBubbles[index];
      keeperTimer = Math.min(8, 3 + STONE_LAYOUT[index].words.length * 0.035);
    }

    const statics = [
      Bodies.rectangle(GRAVEYARD_W / 2, GROUND_Y + 20, GRAVEYARD_W + 80, 40, { isStatic: true, friction: 0.9 }),
      Bodies.rectangle(-12, GRAVEYARD_H / 2, 24, GRAVEYARD_H * 3, { isStatic: true }),
      Bodies.rectangle(GRAVEYARD_W + 12, GRAVEYARD_H / 2, 24, GRAVEYARD_H * 3, { isStatic: true }),
      Bodies.rectangle(GRAVEYARD_W / 2, -GRAVEYARD_H, GRAVEYARD_W, 24, { isStatic: true }),
    ];
    Composite.add(world, statics);

    function addStones() {
      stones = STONE_LAYOUT.map((def, i) => {
        const sprite = stoneSprites[i];
        // Slightly narrower than the art so the collision box hugs the slab
        // rather than the sprite's transparent corners.
        const bw = sprite.w - 6;
        const bh = sprite.h - 2;
        const body = Bodies.rectangle(def.x, GROUND_Y - sprite.h / 2, bw, bh, {
          density: 0.004,
          friction: 0.8,
          frictionStatic: 1,
          restitution: 0.02,
        });
        body.plugin = { kind: 'stone', index: i };
        Composite.add(world, body);
        return { body, sprite, index: i, alive: true };
      });
    }

    function addHammer() {
      const head = Bodies.rectangle(0, 0, HEAD_W, HEAD_H, { density: 0.05, friction: 0.6 });
      const handle = Bodies.rectangle(0, HEAD_H / 2 + HANDLE_LEN / 2, 3, HANDLE_LEN, {
        density: 0.002,
        friction: 0.6,
      });

      hammer = Body.create({
        parts: [head, handle],
        restitution: 0.1,
        frictionAir: 0.012,
      });
      hammer.plugin = { kind: 'hammer', headId: head.id };

      // The sprite's top-left in body-local space. Captured now, while the
      // body is still at angle 0, so rendering is just translate+rotate.
      hammerOffset = {
        x: -HEAD_W / 2 - hammer.position.x,
        y: -HEAD_H / 2 - hammer.position.y,
      };

      restHammer();
      Composite.add(world, hammer);
    }

    /**
     * Drop the hammer in already tilted and clear of the ground. Spawning it
     * upright and overlapping the floor made the solver shove it out and leave
     * it balanced on its handle tip like a stood-up broom. Stable, but it
     * reads as floating. Falling from a lean settles it lying down.
     */
    function restHammer() {
      Body.setPosition(hammer, { x: 28, y: GROUND_Y - 48 });
      Body.setAngle(hammer, 1.35);
      Body.setVelocity(hammer, { x: 0, y: 0 });
      Body.setAngularVelocity(hammer, 0);
    }

    addStones();
    addHammer();

    // --- shattering -------------------------------------------------------
    function shatter(stone, impactPoint, impulse) {
      if (!stone.alive) return;
      stone.alive = false;
      broken.value += 1;

      const { sprite } = stone;
      const origin = { ...stone.body.position };
      const angle = stone.body.angle;
      const velocity = { ...stone.body.velocity };

      Composite.remove(world, stone.body);

      const cells = shatterCells(sprite.w, sprite.h, 3, 4, stone.index * 17 + 1);

      for (const cell of cells) {
        const centroid = Vertices.centre(cell.map((p) => ({ x: p.x, y: p.y })));
        // Where this chunk sits in world space, accounting for however the
        // stone happened to be leaning when it was hit.
        const world0 = Vector.add(origin, Vector.rotate(centroid, angle));

        const body = Bodies.fromVertices(world0.x, world0.y, [cell], {
          density: 0.004,
          friction: 0.7,
          restitution: 0.15,
          angle,
        });
        if (!body) continue;

        // Kick each chunk away from the impact point, so the break reads as
        // coming *from* the hammer rather than as a uniform explosion.
        const away = Vector.sub(world0, impactPoint);
        const dist = Math.max(4, Vector.magnitude(away));
        const kick = Vector.mult(Vector.normalise(away), (impulse * 1.6) / Math.sqrt(dist));

        Body.setVelocity(body, {
          x: velocity.x + kick.x + (Math.random() - 0.5) * 0.6,
          y: velocity.y + kick.y - Math.random() * 1.2,
        });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.35);

        Composite.add(world, body);
        chunks.push({ body, sprite, verts: cell, centroid });
      }

      for (let i = 0; i < 14; i++) {
        particles.push({
          x: impactPoint.x + (Math.random() - 0.5) * 14,
          y: impactPoint.y + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 40,
          vy: -Math.random() * 40 - 10,
          life: 0.5 + Math.random() * 0.6,
          age: 0,
          sprite: dustSprites[i % dustSprites.length],
        });
      }
    }

    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const parentA = pair.bodyA.parent;
        const parentB = pair.bodyB.parent;

        const hammerIsA = parentA === hammer;
        const hammerIsB = parentB === hammer;
        if (!hammerIsA && !hammerIsB) continue;

        const other = hammerIsA ? parentB : parentA;
        if (other.plugin?.kind !== 'stone') continue;

        // The head does the damage; a stone bumped by the wooden handle should
        // just wobble.
        const hammerPart = hammerIsA ? pair.bodyA : pair.bodyB;
        if (hammerPart.id !== hammer.plugin.headId) continue;

        const speed = Vector.magnitude(Vector.sub(hammer.velocity, other.velocity));
        if (speed < BREAK_SPEED) continue;

        const contact = pair.activeContacts?.[0]?.vertex ?? other.position;
        const stone = stones[other.plugin.index];
        if (stone) shatter(stone, { x: contact.x, y: contact.y }, Math.min(speed, 18) * 0.14);
      }
    });

    function reset() {
      for (const chunk of chunks) Composite.remove(world, chunk.body);
      for (const stone of stones) if (stone.alive) Composite.remove(world, stone.body);
      chunks = [];
      particles = [];
      broken.value = 0;
      addStones();
      restHammer();
    }

    // --- input ------------------------------------------------------------
    // Matter's own MouseConstraint reads coordinates straight off the DOM
    // element, which knows nothing about our virtual-pixel transform. Driving
    // a plain Constraint by hand is both shorter and impossible to desync.
    function onDown(event) {
      if (isBackButtonEvent(event)) {
        goBack();
        return;
      }
      if (cameraInput.pressOverlay(event)) return;
      const { x, y } = toVirtual(event);
      pointer = { x, y };

      const candidates = [...chunks.map((c) => c.body), ...stones.filter((s) => s.alive).map((s) => s.body), hammer];
      // `grabAt` returns a point guaranteed to be on the body, so the hammer
      // hangs from wherever you took hold of it. Grab the end of the handle
      // and it swings from the end of the handle. The hammer is last in the
      // list so it wins ties, which is what you meant when you clicked.
      const grab = grabAt(candidates, pointer, 7);
      if (!grab) {
        cameraInput.startPan(event);
        return;
      }

      const { body } = grab;
      if (body.plugin?.kind === 'stone') speak(body.plugin.index);
      dragConstraint = Constraint.create({
        pointA: { x: grab.point.x, y: grab.point.y },
        bodyB: body,
        // A plain world-space offset, NOT rotated back by -body.angle. Matter
        // captures the body's angle at Constraint.create as its own internal
        // `angleB` and re-rotates pointB by the *change* in angle each solve
        // step (see Constraint.solve). It already expects a world-oriented
        // offset and updates it incrementally from there. Pre-rotating here
        // double-counted the current angle: harmless near the centroid, but
        // for a point far out on a tilted body (the sledgehammer rests at
        // ~77°) it put the anchor somewhere else on the body entirely, which
        // is what made grabbing the handle tip end up "holding" the head.
        pointB: Vector.sub(grab.point, body.position),
        stiffness: body === hammer ? 0.09 : 0.2,
        damping: 0.12,
        length: 0,
        render: { visible: false },
      });
      Composite.add(world, dragConstraint);
      dragging.value = true;
      event.target.setPointerCapture?.(event.pointerId);
    }

    function onMove(event) {
      if (cameraInput.move(event)) return;
      const { x, y } = toVirtual(event);
      pointer = { x, y };
      if (dragConstraint) dragConstraint.pointA = { x, y };
    }

    function onUp() {
      cameraInput.end();
      if (dragConstraint) {
        Composite.remove(world, dragConstraint);
        dragConstraint = null;
      }
      dragging.value = false;
    }

    // --- loop -------------------------------------------------------------
    let accumulator = 0;
    const STEP = 1000 / 60;

    function update(dt, t) {
      if (keeperTimer > 0) keeperTimer -= dt;
      torchFlash = Math.max(0, torchFlash - dt * 2.8);
      torchTimer -= dt;
      if (torchTimer <= 0) {
        torchTimer = 1.4 + Math.random() * 3.2;
        torchFlash = 1;
        const count = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
          torchSparks.push({
            x: 300 + (Math.random() - 0.5) * 5,
            y: 99 + Math.random() * 3,
            vx: -8 - Math.random() * 20,
            vy: -18 - Math.random() * 30,
            age: 0,
            life: 0.45 + Math.random() * 0.55,
          });
        }
      }
      for (const spark of torchSparks) {
        spark.age += dt;
        spark.vy += 18 * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
      }
      torchSparks = torchSparks.filter((spark) => spark.age < spark.life);

      // Fixed timestep, capped substeps: a long frame slows the sim down
      // rather than letting bodies tunnel through the ground.
      accumulator += dt * 1000;
      let steps = 0;
      while (accumulator >= STEP && steps < 3) {
        Engine.update(engine, STEP);

        // Cap and bleed off spin on whatever's held, every substep rather than
        // once per rendered frame. The constraint pins an exact point on the
        // body. Grab.js guarantees that, but a light, off-centre object
        // like the sledgehammer has almost no rotational inertia against a
        // spring anchored near the handle tip, so the torque from a single
        // physics step can spin it past 180° before it's even drawn once. By
        // the time a once-per-frame damping pass got a chance to act, the
        // flip had already happened and rendered. From the outside it looked
        // like the hammer swapped which end had the handle. Intervening
        // inside the substep loop stops the spin before Matter ever gets a
        // second step to build on it.
        if (dragConstraint) {
          const held = dragConstraint.bodyB;
          const capped = Math.max(-6, Math.min(6, held.angularVelocity));
          Body.setAngularVelocity(held, capped * 0.5);
        }

        accumulator -= STEP;
        steps++;
      }
      if (accumulator > STEP * 3) accumulator = 0;

      for (const particle of particles) {
        particle.age += dt;
        particle.vy += 90 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      }
      particles = particles.filter((particle) => particle.age < particle.life);

      // Chunks that came to rest far off-screen are gone for good.
      chunks = chunks.filter((chunk) => {
        if (chunk.body.position.y > GRAVEYARD_H + 60) {
          Composite.remove(world, chunk.body);
          return false;
        }
        return true;
      });
    }

    function drawSpriteBody(ctx, body, sprite, offset) {
      ctx.save();
      ctx.translate(Math.round(body.position.x), Math.round(body.position.y));
      ctx.rotate(body.angle);
      ctx.drawImage(sprite.canvas, Math.round(offset.x), Math.round(offset.y));
      ctx.restore();
    }

    function drawChunk(ctx, chunk) {
      const { body, sprite, verts, centroid } = chunk;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      // Clip to the chunk's own polygon and draw the *whole* stone sprite
      // behind it: each piece therefore carries the exact carving, moss and
      // speckle it had before the break.
      ctx.beginPath();
      verts.forEach((v, i) => {
        const x = v.x - centroid.x;
        const y = v.y - centroid.y;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(sprite.canvas, -sprite.w / 2 - centroid.x, -sprite.h / 2 - centroid.y);
      ctx.restore();
    }

    function draw(ctx, t) {
      ctx.drawImage(backdrop.canvas, 0, 0);

      // Stars: single pixels stepping between three brightnesses. Fading with
      // globalAlpha instead would put half-lit colours on screen and read as
      // blur rather than as twinkling.
      for (const star of scenery.stars) {
        const pulse = Math.sin(t * star.speed + star.phase);
        if (pulse < -0.5) continue;
        px(ctx, star.x, star.y, pulse > 0.7 ? '#fffbe8' : pulse > 0 ? '#ded8c0' : '#8f89a8');
      }

      // Bare trees moving gently in the night wind.
      for (const tree of scenery.trees) drawSway(ctx, tree.sprite, tree.x, tree.y, t, tree);

      // The crypt is scenery, not a collider: only its cropped side wall is
      // visible, while the entrance continues beyond the right edge.
      ctx.drawImage(crypt.canvas, 274, 60);

      // The wall torch belongs to the crypt layer: above the masonry, but
      // behind every physical stone, chunk and tool that can pass in front of
      // it. Sparks and glow share that depth so they cannot wash over the
      // sledgehammer or a tombstone.
      const flame = torchFrames[Math.floor(t * 11) % torchFrames.length];
      ctx.drawImage(flame.canvas, 296, 94);
      for (const spark of torchSparks) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 1 - spark.age / spark.life);
        px(ctx, Math.round(spark.x), Math.round(spark.y), spark.age < 0.18 ? P.lamp : P.ember);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.62 + Math.sin(t * 6.7) * 0.08 + Math.sin(t * 14.1) * 0.05 + torchFlash * 0.35;
      ctx.drawImage(
        torchGlow.canvas,
        300 - torchGlow.w / 2,
        101 - torchGlow.h / 2,
      );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      for (const stone of stones) {
        if (!stone.alive) continue;
        drawSpriteBody(ctx, stone.body, stone.sprite, {
          x: -stone.sprite.w / 2,
          y: -stone.sprite.h / 2,
        });
      }

      for (const chunk of chunks) drawChunk(ctx, chunk);

      for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.life) * 0.8;
        ctx.drawImage(particle.sprite.canvas, Math.round(particle.x), Math.round(particle.y));
      }
      ctx.globalAlpha = 1;

      drawSpriteBody(ctx, hammer, hammerSprite, hammerOffset);

      // The keeper sits at the quiet edge of the yard, watching the row. A
      // one-pixel breathing bob and occasional blink keep him alive without
      // making the solemn scene busy.
      const keeperX = 242;
      const keeperY = GROUND_Y - keeper.sprite.h + Math.round(Math.sin(t * 1.8) * 0.5);
      ctx.drawImage(keeper.sprite.canvas, keeperX, keeperY);
      if (Math.sin(t * 0.72 + 1.1) > 0.985) px(ctx, keeperX + keeper.eye.x, keeperY + keeper.eye.y, P.skinDark);

      // Foreground bushes, drawn over the physics so smashed chunks can roll
      // behind them.
      for (const bush of scenery.bushes) drawSway(ctx, bush.sprite, bush.x, bush.y, t, bush);

      if (keeperTimer > 0 && keeperBubble) {
        const bx = Math.min(GRAVEYARD_W - keeperBubble.w - 4, 208);
        const by = Math.max(5, keeperY - keeperBubble.h - 3);
        ctx.drawImage(keeperBubble.canvas, bx, by);
      }

      ctx.globalAlpha = 0.16;
      rect(ctx, 0, 0, GRAVEYARD_W, 8, P.ink);
      rect(ctx, 0, GRAVEYARD_H - 8, GRAVEYARD_W, 8, P.ink);
      ctx.globalAlpha = 1;

    }

    const scene = useScene({
      width: GRAVEYARD_W,
      height: GRAVEYARD_H,
      background: P.ink,
      update,
      draw,
      drawOverlay: drawBackOverlay,
    });
    const { canvasRef, toVirtual } = scene;
    const cameraInput = createCameraInput(scene);

    onBeforeUnmount(() => {
      Events.off(engine);
      Composite.clear(world, false);
      Engine.clear(engine);
    });

    const onWheel = (event) => cameraInput.wheel(event);

    return { canvasRef, dragging, broken, total, reset, onDown, onMove, onUp, onWheel, goBack };
  },
};
</script>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  background: #07070d;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  cursor: grab;
}

.scene-canvas.is-grabbing {
  cursor: grabbing;
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

.tally {
  color: rgba(255, 255, 255, 0.45);
}

</style>
