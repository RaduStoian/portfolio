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
    ></canvas>

    <div class="hud">
      <RouterLink to="/" class="btn">← Town square</RouterLink>
      <button type="button" class="btn" @click="reset">Rebuild stones</button>
      <span class="tally">{{ broken }} / {{ total }} smashed</span>
    </div>

    <p class="hint">Drag the sledgehammer. Swing hard — a gentle tap won't crack anything.</p>
  </div>
</template>

<script>
import { ref, onBeforeUnmount } from 'vue';
import Matter from 'matter-js';
import { useScene } from '../useScene.js';
import { P } from '../palette.js';
import { rect, px, drawSway, drawSprite } from '../pixel.js';
import {
  GRAVEYARD_W,
  GRAVEYARD_H,
  GROUND_Y,
  bakeBackdrop,
  bakeGraveyardProps,
  bakeGravestone,
  bakeHammer,
  bakeFlag,
  bakePole,
  bakeDust,
  shatterCells,
} from '../art/graveyard.js';

const { Engine, Composite, Bodies, Body, Constraint, Events, Query, Vector, Vertices } = Matter;

// Relative speed (px per physics step) a hammer strike must exceed to break a
// stone. Tuned so a deliberate swing shatters and a nudge or a topple doesn't.
const BREAK_SPEED = 5.5;

const HEAD_W = 16;
const HEAD_H = 10;
const HANDLE_LEN = 30;

const STONE_LAYOUT = [
  { x: 118, variant: 0, epitaph: [12, 9, 11] },
  { x: 176, variant: 2, epitaph: [10, 13] },
  { x: 236, variant: 1, epitaph: [14, 8, 12, 9] },
];

export default {
  name: 'GraveyardScene',
  setup() {
    const dragging = ref(false);
    const broken = ref(0);
    const total = STONE_LAYOUT.length;

    // --- baked art (once) ------------------------------------------------
    const backdrop = bakeBackdrop();
    const scenery = bakeGraveyardProps();
    const stoneSprites = STONE_LAYOUT.map((def) => bakeGravestone(def.variant, def.epitaph));
    const hammerSprite = bakeHammer(HEAD_W, HEAD_H, HANDLE_LEN);
    const flagSprite = bakeFlag(30, 15);
    const poleSprite = bakePole(62);
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
     * it balanced on its handle tip like a stood-up broom — stable, but it
     * reads as floating. Falling from a lean settles it lying down.
     */
    function restHammer() {
      Body.setPosition(hammer, { x: 278, y: GROUND_Y - 52 });
      Body.setAngle(hammer, 1.35);
      Body.setVelocity(hammer, { x: 0, y: 0 });
      Body.setAngularVelocity(hammer, 0);
    }

    addStones();
    addHammer();

    // --- cloth flag -------------------------------------------------------
    // A constraint grid, not a physics cheat: the nodes are real bodies, but
    // they collide with nothing (mask 0) so the cloth can never get wedged
    // inside a gravestone and explode.
    const POLE_X = 52;
    const POLE_TOP = GROUND_Y - 62;
    const CLOTH_COLS = 11;
    const CLOTH_ROWS = 6;
    // Node spacing x cols must match the flag texture's aspect, or the cloth
    // squashes the art. 10 gaps x 3px = 30px wide, 5 x 3px = 15px tall.
    const CLOTH_GAP = 3;
    const clothNodes = [];
    const clothConstraints = [];

    for (let r = 0; r < CLOTH_ROWS; r++) {
      const row = [];
      for (let c = 0; c < CLOTH_COLS; c++) {
        const node = Bodies.circle(POLE_X + 2 + c * CLOTH_GAP, POLE_TOP + 3 + r * CLOTH_GAP, 0.6, {
          isStatic: c === 0,
          frictionAir: 0.08,
          density: 0.001,
          collisionFilter: { mask: 0 },
        });
        row.push(node);
        Composite.add(world, node);
      }
      clothNodes.push(row);
    }

    const link = (a, b, stiffness) => {
      const constraint = Constraint.create({
        bodyA: a,
        bodyB: b,
        stiffness,
        damping: 0.06,
        length: Vector.magnitude(Vector.sub(b.position, a.position)),
        render: { visible: false },
      });
      clothConstraints.push(constraint);
      Composite.add(world, constraint);
    };

    for (let r = 0; r < CLOTH_ROWS; r++) {
      for (let c = 0; c < CLOTH_COLS; c++) {
        if (c + 1 < CLOTH_COLS) link(clothNodes[r][c], clothNodes[r][c + 1], 0.9);
        if (r + 1 < CLOTH_ROWS) link(clothNodes[r][c], clothNodes[r + 1][c], 0.7);
        // Shear links stop the grid folding flat into a line.
        if (c + 1 < CLOTH_COLS && r + 1 < CLOTH_ROWS) link(clothNodes[r][c], clothNodes[r + 1][c + 1], 0.25);
      }
    }

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
      const { x, y } = toVirtual(event);
      pointer = { x, y };

      const candidates = [hammer, ...chunks.map((c) => c.body), ...stones.filter((s) => s.alive).map((s) => s.body)];
      const found = Query.point(candidates, pointer);

      // Prefer the hammer when the click overlaps several things.
      let body = found.includes(hammer) ? hammer : found[0];

      // The handle is 3px wide — demanding an exact hit on it makes the
      // hammer feel slippery. Fall back to the nearest body within a small
      // radius, which is what the player meant anyway.
      if (!body) {
        let best = Infinity;
        for (const candidate of candidates) {
          for (const part of candidate.parts.length > 1 ? candidate.parts.slice(1) : candidate.parts) {
            const d = Vector.magnitude(Vector.sub(part.position, pointer));
            if (d < best && d < 7) {
              best = d;
              body = candidate;
            }
          }
        }
      }
      if (!body) return;

      dragConstraint = Constraint.create({
        pointA: { x, y },
        bodyB: body,
        pointB: Vector.rotate(Vector.sub(pointer, body.position), -body.angle),
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
      const { x, y } = toVirtual(event);
      pointer = { x, y };
      if (dragConstraint) dragConstraint.pointA = { x, y };
    }

    function onUp() {
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
      // Wind: a slow base gust with a faster ripple on top, applied to every
      // cloth node. Two frequencies is the cheapest thing that stops the flag
      // looking like it's on a metronome.
      const gust = 0.62 + 0.38 * Math.sin(t * 0.9) + 0.22 * Math.sin(t * 2.7 + 1.3);
      for (const row of clothNodes) {
        for (const node of row) {
          if (node.isStatic) continue;
          Body.applyForce(node, node.position, {
            // Wind has to out-pull gravity (0.001) or the flag just hangs
            // limp against the pole instead of streaming.
            x: node.mass * 0.00105 * gust,
            y: node.mass * 0.00008 * Math.sin(t * 3.4 + node.position.x * 0.4),
          });
        }
      }

      // Fixed timestep, capped substeps: a long frame slows the sim down
      // rather than letting bodies tunnel through the ground.
      accumulator += dt * 1000;
      let steps = 0;
      while (accumulator >= STEP && steps < 3) {
        Engine.update(engine, STEP);
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

    function drawFlag(ctx) {
      const fw = flagSprite.w;
      const fh = flagSprite.h;
      const topRow = clothNodes[0];
      const bottomRow = clothNodes[CLOTH_ROWS - 1];

      // Where each texture column lands on the simulated cloth.
      const sample = (x) => {
        const u = (x / fw) * (CLOTH_COLS - 1);
        const i = Math.min(CLOTH_COLS - 2, Math.floor(u));
        const f = u - i;
        const lerp = (a, b) => a + (b - a) * f;
        return {
          x: lerp(topRow[i].position.x, topRow[i + 1].position.x),
          top: lerp(topRow[i].position.y, topRow[i + 1].position.y),
          bottom: lerp(bottomRow[i].position.y, bottomRow[i + 1].position.y),
        };
      };

      for (let x = 0; x < fw; x++) {
        const here = sample(x);
        const next = sample(x + 1);

        // Width comes from the gap to the *next* column, so when the cloth
        // stretches wider than the texture the strips widen to fill instead of
        // leaving 1px gaps striping the flag.
        const left = Math.round(here.x);
        const width = Math.max(1, Math.round(next.x) - left);
        const height = Math.max(1, Math.round(here.bottom - here.top));

        // Upright strips rather than rotated quads: the wave still reads, and
        // every pixel stays on the grid.
        ctx.drawImage(flagSprite.canvas, x, 0, 1, fh, left, Math.round(here.top), width, height);
      }
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

      // Bare trees, swaying on the same wind that moves the flag.
      for (const tree of scenery.trees) drawSway(ctx, tree.sprite, tree.x, tree.y, t, tree);

      drawSprite(ctx, scenery.lamp.sprite, scenery.lamp.x, scenery.lamp.y);

      ctx.drawImage(poleSprite.canvas, POLE_X - 1, POLE_TOP - 4);
      drawFlag(ctx);

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

      // Foreground bushes, drawn over the physics so smashed chunks can roll
      // behind them.
      for (const bush of scenery.bushes) drawSway(ctx, bush.sprite, bush.x, bush.y, t, bush);

      // Lantern light, additive with a slow flicker.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8 + Math.sin(t * 5.7) * 0.07 + Math.sin(t * 12.1) * 0.04;
      ctx.drawImage(
        scenery.glow.canvas,
        scenery.lamp.glow.x - scenery.glow.w / 2,
        scenery.lamp.glow.y - scenery.glow.h / 2,
      );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = 0.16;
      rect(ctx, 0, 0, GRAVEYARD_W, 8, P.ink);
      rect(ctx, 0, GRAVEYARD_H - 8, GRAVEYARD_W, 8, P.ink);
      ctx.globalAlpha = 1;
    }

    const { canvasRef, toVirtual } = useScene({
      width: GRAVEYARD_W,
      height: GRAVEYARD_H,
      background: P.ink,
      update,
      draw,
    });

    onBeforeUnmount(() => {
      Events.off(engine);
      Composite.clear(world, false);
      Engine.clear(engine);
    });

    return { canvasRef, dragging, broken, total, reset, onDown, onMove, onUp };
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
  top: 12px;
  left: 12px;
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

.hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}
</style>
