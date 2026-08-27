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
      <button type="button" class="btn" @click="reset">Restock</button>
      <RouterLink to="/projects" class="btn">Read the details</RouterLink>
      <span class="tally">{{ broken }} broken</span>
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
import { rect, px, drawSprite } from '../pixel.js';
import { PROJECTS } from '../../data/projects.js';
import { drawSwirlyText, wrapText } from '../text.js';
import { shatterCells, cellCoverage, bakeDust } from '../art/shared.js';
import {
  SHOP_W, SHOP_H, FLOOR_Y, SHELVES, COUNTER, LID_SEAM,
  ANVIL_W, ANVIL_H, ANVIL_PARTS, HAMMER_HEAD_W, HAMMER_HEAD_H, HAMMER_HANDLE_LEN,
  FORGE_MOUTH,
  buildShop, bakeBubble,
} from '../art/shop.js';

// What the shopkeeper says about each project, read out when you click its
// nameplate or pick up the object itself. Wrapped to a fixed width once, at
// setup, rather than per-frame. The text never changes at runtime.
const DESCRIPTIONS = {
  mindstare: 'A free visual meditation site to manage your moods and calm your mind.',
  vhoice: 'Vhoice.net: rate and review your politicians, with comments from real people.',
  movieswiper: 'Swipe on movies and match with friends to find one you both want to watch.',
  museum: 'A museum of the physics techniques video games use, and how each one works.',
  forgekit: 'A native Windows PHP dev app with everything Windows devs have wished for.',
};
// Narrow on purpose: a tall, vertical bubble stays over the keeper's own
// alcove, where there's headroom, instead of sprawling sideways across the
// shelves and their merchandise.
const SPEECH_WIDTH = 108;

const { Engine, Composite, Bodies, Body, Constraint, Events, Vector, Vertices } = Matter;

// Small words that belong to a scrying orb. Short enough that all ten fit the
// same swirly banner over Mindstare.
const VISION_WORDS = ['GAZE', 'LEARN', 'STARE', 'GROW', 'SIT', 'SEE', 'KNOW', 'WISE', 'PEER', 'DREAM'];

/**
 * What a thing is made of. `threshold` is the impact speed (px per physics
 * step, relative) at which it gives up; for scale, dropping something from the
 * top shelf to the floor lands at roughly 7. So glass can't survive the floor
 * and gold survives everything short of a hard throw or the anvil. Crystal
 * shares glass's feel. Brittle friction, glassy bounce, but never actually
 * breaks: Mindstare is meant to be handled, not protected. Paper, iron and
 * wood never break either, and express themselves differently instead (the
 * bag spills, the anvil breaks *other* things, the chest erupts).
 */
const MATERIALS = {
  glass: {
    density: 0.0022, friction: 0.35, frictionStatic: 0.7, restitution: 0.22,
    threshold: 3.2, cols: 4, rows: 4, jitter: 0.34, dust: '#d8ecff', puffs: 16,
  },
  crystal: {
    density: 0.0022, friction: 0.35, frictionStatic: 0.7, restitution: 0.22, threshold: Infinity,
  },
  gold: {
    density: 0.024, friction: 0.7, frictionStatic: 1, restitution: 0.02,
    threshold: 11, cols: 2, rows: 3, jitter: 0.18, dust: P.goldLit, puffs: 8,
  },
  paper: { density: 0.0016, friction: 0.8, frictionStatic: 1, restitution: 0.04, threshold: Infinity },
  iron: { density: 0.05, friction: 0.75, frictionStatic: 1, restitution: 0.02, threshold: Infinity },
  wood: { density: 0.005, friction: 0.6, frictionStatic: 0.9, restitution: 0.14, threshold: Infinity },
};

// Matter has no continuous collision detection, and the shelf boards are only
// a few pixels thick. Clamping speed is far cheaper than substepping and the
// cap is high enough that nothing feels held back.
const MAX_SPEED = 15;

const BAG_KERNELS = 30;

export default {
  name: 'ShopScene',
  setup() {
    const goBack = useBack();
    const dragging = ref(false);
    const broken = ref(0);

    // --- baked art (once) --------------------------------------------------
    const art = buildShop();
    const dust = {
      glass: bakeDust('#d8ecff'),
      gold: bakeDust(P.goldLit),
      wood: bakeDust('#b08a5e'),
    };

    // One speech bubble per project, wrapped and baked once. The text never
    // changes, so there's no reason to wrap or draw it per frame.
    const speechBubbles = Object.fromEntries(
      Object.entries(DESCRIPTIONS).map(([id, text]) => [id, bakeBubble(wrapText(text, SPEECH_WIDTH))]),
    );
    // Longer descriptions stay up longer, capped so nobody's stuck waiting on
    // ForgeKit's paragraph.
    const speechDuration = (text) => Math.min(9, 3 + text.length * 0.045);

    // --- physics -----------------------------------------------------------
    const engine = Engine.create();
    engine.gravity.y = 1;
    const world = engine.world;

    let items = [];
    let chunks = [];
    let debris = [];
    let particles = [];
    let sparks = [];
    let dragConstraint = null;
    let pointer = { x: 0, y: 0 };

    // What the shopkeeper's currently saying, and for how much longer. Both
    // the short break/chest reactions and the longer project descriptions
    // flow through this one pair of variables.
    let keeperBubble = art.bubble;
    let keeperTimer = 0;

    /** Have the keeper read out a project's description. */
    function speak(id) {
      const text = DESCRIPTIONS[id];
      if (!text) return;
      keeperBubble = speechBubbles[id];
      keeperTimer = speechDuration(text);
    }

    // The scrying orb's word-in-a-vision-ball readout: which word, and how
    // long it stays lit. Refreshed continuously while the orb is held, so it
    // only starts counting down once you let go.
    let orbWord = '';
    let orbWordTimer = 0;
    const ORB_WORD_FADE = 0.5;

    // Room shell. The walls are deliberately thick so a fast body can't slip
    // through the seam at the corners.
    Composite.add(world, [
      Bodies.rectangle(SHOP_W / 2, FLOOR_Y + 30, SHOP_W + 120, 60, { isStatic: true, friction: 0.9 }),
      Bodies.rectangle(-14, SHOP_H / 2, 28, SHOP_H * 3, { isStatic: true, friction: 0.6 }),
      Bodies.rectangle(SHOP_W + 14, SHOP_H / 2, 28, SHOP_H * 3, { isStatic: true, friction: 0.6 }),
      Bodies.rectangle(SHOP_W / 2, 6, SHOP_W, 12, { isStatic: true }),
    ]);

    // Shelf boards. 5px of collision against 3px of board: the extra covers the
    // shadow row and buys a little margin against tunnelling.
    for (const shelf of SHELVES) {
      Composite.add(
        world,
        Bodies.rectangle((shelf.x0 + shelf.x1) / 2, shelf.y + 2.5, shelf.x1 - shelf.x0, 5, {
          isStatic: true,
          friction: 0.8,
        }),
      );
    }

    // Counter and the floor clutter, so thrown things have something to hit.
    Composite.add(
      world,
      Bodies.rectangle(COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.h / 2, COUNTER.w, COUNTER.h, {
        isStatic: true,
        friction: 0.7,
      }),
    );
    for (const prop of art.clutter) {
      Composite.add(
        world,
        Bodies.rectangle(prop.x + prop.sprite.w / 2, prop.y + prop.sprite.h / 2, prop.sprite.w - 2, prop.sprite.h - 2, {
          isStatic: true,
          friction: 0.7,
        }),
      );
    }

    // Plinths: static, and placed by the surface they stand on rather than by
    // a hard-coded y, so re-sizing a plinth can't sink it into the board.
    const plinths = art.displays.map((def) => {
      const sprite = def.plinth;
      const x = def.x;
      const y = (def.onFloor ? FLOOR_Y : SHELVES[def.shelf].y) - sprite.h;
      Composite.add(
        world,
        Bodies.rectangle(x, y + sprite.h / 2, sprite.w, sprite.h, { isStatic: true, friction: 0.9 }),
      );
      return { sprite, x: Math.round(x - sprite.w / 2), y, top: y };
    });

    function spawnItem(def, index) {
      const mat = MATERIALS[def.material];
      const sprite = def.sprite;
      const top = plinths[index].top;
      const options = {
        density: mat.density,
        friction: mat.friction,
        frictionStatic: mat.frictionStatic,
        restitution: mat.restitution,
        frictionAir: 0.008,
      };

      // Sit the sprite's bottom row on the plinth, one pixel clear. Bodies that
      // spawn overlapping get shoved out by the solver and end up in poses
      // nobody drew.
      const cy = top - sprite.h / 2 - 1;
      const body = def.circle
        ? Bodies.circle(def.x, cy, sprite.w / 2, options)
        : Bodies.rectangle(def.x, cy, sprite.w - 2, sprite.h - 2, options);

      body.plugin = { kind: 'item', index };
      Composite.add(world, body);

      const item = {
        def,
        body,
        sprite,
        index,
        alive: true,
        material: mat,
        offset: { x: -sprite.w / 2, y: -sprite.h / 2 },
      };

      if (def.kind === 'bag') {
        item.remaining = BAG_KERNELS;
        item.spillTimer = 0;
      }
      if (def.kind === 'chest') {
        item.state = 'closed';
        item.timer = 0;
        item.lid = 0;
        item.agitation = 0;
        item.lastVelocity = { x: 0, y: 0 };
      }
      if (def.kind === 'forge') {
        item.emberTimer = 1.5 + Math.random() * 3;
        item.flash = 0;
      }
      return item;
    }

    function addItems() {
      items = art.displays.map(spawnItem);
    }

    addItems();

    // `art.displays` order is fixed, so this index is stable across resets.
    const orbIndex = items.findIndex((item) => item.def.kind === 'orb');

    // --- the anvil -----------------------------------------------------------
    // Unlabelled, not one of the displays: ForgeKit's plinth belongs to the
    // forge now, and the anvil sits directly on the floorboards beside it,
    // lower than a plinth would put it, which is exactly what gives the
    // hammer room to swing. Still a real dynamic body, so it's draggable and
    // still smashes whatever it lands on hard enough.
    //
    // Its collider is a compound built from the exact same rectangles
    // `bakeAnvil` painted (ANVIL_PARTS in art/shop.js), so it hugs the horn
    // and waist instead of a bounding box that's mostly empty air, which is
    // exactly what let you "grab" a rotated hammer from outside its own
    // silhouette before `grab.js` existed.
    let anvilBody = null;
    let anvilOffset = { x: 0, y: 0 };
    const ANVIL_X = 108;

    function addAnvil() {
      const options = { density: 0.05, friction: 0.75, frictionStatic: 1, restitution: 0.02, frictionAir: 0.008 };
      const parts = ANVIL_PARTS.map((part) =>
        Bodies.rectangle(part.x + part.w / 2 - ANVIL_W / 2, part.y + part.h / 2 - ANVIL_H / 2, part.w, part.h, options),
      );
      const body = Body.create({ parts });
      body.plugin = { kind: 'anvil' };

      // Captured before the body is moved off (0,0). The sprite's top-left
      // in body-local space, so drawing is just translate+rotate however the
      // compound's true centre of mass (not necessarily the sprite's
      // midpoint) ends up landing.
      anvilOffset = { x: -art.anvil.w / 2 - body.position.x, y: -art.anvil.h / 2 - body.position.y };
      Body.setPosition(body, { x: ANVIL_X, y: FLOOR_Y - art.anvil.h / 2 - 1 });
      Composite.add(world, body);
      anvilBody = body;
    }

    addAnvil();

    // --- the smith's hammer -------------------------------------------------
    // A real physics object, not a scripted swing: you pick it up and hit the
    // anvil yourself. Built the same way the graveyard builds its
    // sledgehammer. A compound of head + handle, so `grab.js` can find the
    // exact point on it you clicked, handle included.
    let smithHammer = null;
    let smithHammerOffset = { x: 0, y: 0 };

    function addSmithHammer() {
      const head = Bodies.rectangle(0, 0, HAMMER_HEAD_W, HAMMER_HEAD_H, { density: 0.045, friction: 0.6 });
      const handle = Bodies.rectangle(-(HAMMER_HEAD_W / 2 + HAMMER_HANDLE_LEN / 2), 0, HAMMER_HANDLE_LEN, 3, {
        density: 0.0018,
        friction: 0.6,
      });
      const body = Body.create({ parts: [head, handle], restitution: 0.12, frictionAir: 0.012 });
      body.plugin = { kind: 'smithHammer', headId: head.id };

      // The sprite's head sits at sprite-x = HAMMER_HANDLE_LEN + HEAD_W/2 (see
      // bakeSmithHammer), which is body-local (0,0) here, so the sprite's
      // top-left in body-local space is *behind* the head by the full handle
      // length, not by half of it.
      smithHammerOffset = {
        x: -(HAMMER_HANDLE_LEN + HAMMER_HEAD_W / 2) - body.position.x,
        y: -HAMMER_HEAD_H / 2 - body.position.y,
      };
      smithHammer = body;
      restHammer();
      Composite.add(world, body);
    }

    /** Leaning on the anvil's face, head down, exactly where you'd rest one. */
    function restHammer() {
      Body.setPosition(smithHammer, {
        x: anvilBody.position.x + ANVIL_W / 2 - 4,
        y: anvilBody.position.y - ANVIL_H / 2 - HAMMER_HEAD_H,
      });
      Body.setAngle(smithHammer, -0.8);
      Body.setVelocity(smithHammer, { x: 0, y: 0 });
      Body.setAngularVelocity(smithHammer, 0);
    }

    addSmithHammer();

    // --- project links -------------------------------------------------------
    // A small glowing arrow set into each plinth right after its label, so
    // the physical toy isn't the only way to reach a project. Clicking it
    // opens the real writeup in a new tab. `urls` comes from the same list
    // the plain /projects page uses; a plinth with nothing to link to just
    // never lights its arrow up.
    const urls = {};
    for (const project of PROJECTS) {
      const match = art.displays.find((d) => d.label.toLowerCase() === String(project.title).toLowerCase());
      if (match && project.url) urls[match.id] = project.url;
    }

    // `bakePlinth`'s `withLink` option reserves this slot and reports where
    // it is; a plinth baked without it (none currently) has no anchor and no
    // arrow ever draws for it.
    const linkSpots = art.displays
      .map((def, i) => {
        const plinth = plinths[i];
        const anchor = plinth.sprite.linkAnchor;
        return anchor ? { id: def.id, x: plinth.x + anchor.x, y: plinth.y + anchor.y } : null;
      })
      .filter(Boolean);

    // --- loose junk --------------------------------------------------------
    // Everything the shop can spit out. Popcorn, the chest's payload, chunks
    // of broken merchandise. Lives in one list drawn the same way, so adding a
    // new kind of debris is one push.
    const MAX_DEBRIS = 240;

    function addDebris(sprite, x, y, velocity, options = {}) {
      const { circle = false, spin = 0.3, ...bodyOptions } = options;
      const body = circle
        ? Bodies.circle(x, y, sprite.w / 2 - 0.5, bodyOptions)
        : Bodies.rectangle(x, y, Math.max(1, sprite.w - 1), Math.max(1, sprite.h - 1), bodyOptions);

      Body.setVelocity(body, velocity);
      Body.setAngularVelocity(body, (Math.random() - 0.5) * spin);
      Composite.add(world, body);
      debris.push({ body, sprite, offset: { x: -sprite.w / 2, y: -sprite.h / 2 } });

      // Oldest out first, so a long play session can't grind to a halt.
      while (debris.length > MAX_DEBRIS) {
        Composite.remove(world, debris.shift().body);
      }
      return body;
    }

    function addPopcorn(x, y, velocity) {
      const sprite = art.popcorn[Math.floor(Math.random() * art.popcorn.length)];
      return addDebris(sprite, x, y, velocity, {
        circle: true,
        density: 0.0008,
        friction: 0.35,
        restitution: 0.38,
        frictionAir: 0.022,
        spin: 0.5,
      });
    }

    function puff(x, y, sprites, count, spread = 40) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * spread,
          vy: -Math.random() * spread - 8,
          life: 0.4 + Math.random() * 0.5,
          age: 0,
          gravity: 90,
          sprite: sprites[i % sprites.length],
        });
      }
    }

    // --- breaking ----------------------------------------------------------
    function breakItem(item, contact, impulse) {
      if (!item.alive) return;
      item.alive = false;
      broken.value += 1;
      keeperBubble = art.bubble;
      keeperTimer = 1.8;

      const { sprite, material } = item;
      const origin = { ...item.body.position };
      const angle = item.body.angle;
      const velocity = { ...item.body.velocity };
      Composite.remove(world, item.body);

      const cells = shatterCells(
        sprite.w, sprite.h, material.cols, material.rows,
        item.index * 17 + 3, material.jitter,
      );

      for (const cell of cells) {
        // A cell over a transparent corner would be an invisible chunk that
        // still collides. Round things need this or they bounce off nothing.
        if (cellCoverage(sprite, cell) < 0.3) continue;

        const centroid = Vertices.centre(cell.map((p) => ({ x: p.x, y: p.y })));
        const world0 = Vector.add(origin, Vector.rotate(centroid, angle));

        const body = Bodies.fromVertices(world0.x, world0.y, [cell], {
          density: material.density,
          friction: material.friction,
          restitution: material.restitution,
          angle,
        });
        if (!body) continue;

        // Kick each piece away from the impact point, so the break reads as
        // coming from the blow rather than as a uniform explosion.
        const away = Vector.sub(world0, contact);
        const dist = Math.max(4, Vector.magnitude(away));
        const kick = Vector.mult(Vector.normalise(away), (impulse * 1.6) / Math.sqrt(dist));

        Body.setVelocity(body, {
          x: velocity.x + kick.x + (Math.random() - 0.5) * 0.6,
          y: velocity.y + kick.y - Math.random() * 1.1,
        });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
        Composite.add(world, body);
        chunks.push({ body, sprite, verts: cell, centroid });
      }

      puff(contact.x, contact.y, dust[item.def.material] ?? dust.wood, material.puffs ?? 10);
    }

    function burstBag(item, count) {
      const n = Math.min(count, item.remaining);
      for (let i = 0; i < n; i++) {
        const mouth = Vector.add(
          item.body.position,
          Vector.rotate({ x: (Math.random() - 0.5) * 8, y: -item.sprite.h / 2 }, item.body.angle),
        );
        addPopcorn(mouth.x, mouth.y, {
          x: item.body.velocity.x * 0.6 + (Math.random() - 0.5) * 4,
          y: item.body.velocity.y * 0.5 - Math.random() * 2.5,
        });
      }
      item.remaining -= n;
    }

    /** The chest's payload: whatever it is, it should look chaotic. */
    function openChest(item) {
      const count = 10 + Math.floor(Math.random() * 8);

      for (let i = 0; i < count; i++) {
        // Spawned in a fan clear of the chest's own body. Stacking the whole
        // payload on one point inside the chest made the solver shove
        // everything apart at once and fire the chest across the room like a
        // mortar. Funny once, wrong every time after.
        const spread = ((i / Math.max(1, count - 1)) - 0.5) * 14;
        const from = Vector.add(
          item.body.position,
          Vector.rotate({ x: spread, y: -item.sprite.h / 2 - 4 - Math.random() * 6 }, item.body.angle),
        );
        const kick = { x: spread * 0.35 + (Math.random() - 0.5) * 4, y: -3.5 - Math.random() * 4 };
        const roll = Math.random();

        if (roll < 0.3) {
          const sprite = art.balls[Math.floor(Math.random() * art.balls.length)];
          addDebris(sprite, from.x, from.y, kick, {
            circle: true, density: 0.0015, friction: 0.25, restitution: 0.78, frictionAir: 0.006, spin: 0.6,
          });
        } else if (roll < 0.5) {
          addDebris(art.block, from.x, from.y, kick, {
            density: 0.004, friction: 0.6, restitution: 0.2, spin: 0.5,
          });
        } else if (roll < 0.68) {
          const sprite = art.gems[Math.floor(Math.random() * art.gems.length)];
          addDebris(sprite, from.x, from.y, kick, {
            density: 0.003, friction: 0.4, restitution: 0.45, spin: 0.7,
          });
        } else if (roll < 0.84) {
          addPopcorn(from.x, from.y, kick);
        } else {
          const sprite = art.confetti[Math.floor(Math.random() * art.confetti.length)];
          // High air friction is what makes paper flutter instead of falling
          // like a coin.
          addDebris(sprite, from.x, from.y, { x: kick.x * 1.4, y: kick.y * 1.2 }, {
            density: 0.0004, friction: 0.9, restitution: 0.1, frictionAir: 0.12, spin: 1.4,
          });
        }
      }

      // A confetti spray on top of the physical payload, purely for the pop.
      const mouth = Vector.add(item.body.position, Vector.rotate({ x: 0, y: -item.sprite.h / 2 }, item.body.angle));
      puff(mouth.x, mouth.y, art.confetti, 18, 70);
      keeperBubble = art.bubble;
      keeperTimer = 1.4;
    }

    // --- sparks --------------------------------------------------------------
    // Real bodies, not decoration: they bounce off the anvil, the floor, and
    // anything else in the room, and they can knock a fragile item hard enough
    // to break it. The same generic collision handler below does that for
    // free, since a spark is just another dynamic body as far as it's
    // concerned. `life` is deliberately short; a real spark is gone in a blink.
    const SPARK_LIFE = [0.2, 0.4];

    function spawnSparks(point, sourceVelocity) {
      const count = 10 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
        const speed = 3 + Math.random() * 7;
        const body = Bodies.circle(point.x, point.y, 0.6, {
          density: 0.0002,
          friction: 0.2,
          restitution: 0.55,
          frictionAir: 0.02,
        });
        Body.setVelocity(body, {
          x: Math.cos(angle) * speed + sourceVelocity.x * 0.2,
          y: Math.sin(angle) * speed + sourceVelocity.y * 0.2 - 1,
        });
        Composite.add(world, body);
        sparks.push({
          body,
          age: 0,
          life: SPARK_LIFE[0] + Math.random() * (SPARK_LIFE[1] - SPARK_LIFE[0]),
          sprite: art.sparks[i % art.sparks.length],
        });
      }
    }

    // --- impacts -----------------------------------------------------------
    const HAMMER_STRIKE_SPEED = 4;

    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const parentA = pair.bodyA.parent;
        const parentB = pair.bodyB.parent;

        // The smith's hammer against the anvil, head only. A resting hammer
        // or a glancing blow from the handle shouldn't throw sparks. Same
        // pattern as the graveyard's hammer-vs-gravestone check.
        const hammerIsA = parentA === smithHammer;
        const hammerIsB = parentB === smithHammer;
        if (hammerIsA || hammerIsB) {
          const other = hammerIsA ? parentB : parentA;
          if (other === anvilBody) {
            const hammerPart = hammerIsA ? pair.bodyA : pair.bodyB;
            if (hammerPart.id === smithHammer.plugin.headId) {
              const strikeSpeed = Vector.magnitude(Vector.sub(smithHammer.velocity, other.velocity));
              if (strikeSpeed >= HAMMER_STRIKE_SPEED) {
                const contact = pair.activeContacts?.[0]?.vertex ?? other.position;
                spawnSparks({ x: contact.x, y: contact.y }, smithHammer.velocity);
              }
            }
          }
        }

        const speed = Vector.magnitude(Vector.sub(parentA.velocity, parentB.velocity));
        if (speed < 1.6) continue;

        const contact = pair.activeContacts?.[0]?.vertex;
        const point = contact
          ? { x: contact.x, y: contact.y }
          : Vector.mult(Vector.add(parentA.position, parentB.position), 0.5);

        handleImpact(parentA, parentB, speed, point);
        handleImpact(parentB, parentA, speed, point);
      }
    });

    /**
     * How hard `other` hits `body`. A static shelf or the floor counts as
     * infinitely heavy; between two dynamic bodies the heavier one does the
     * damage, which is what lets the anvil act as a wrecking ball without any
     * special case for it.
     */
    function heft(body, other) {
      if (other.isStatic) return 1.2;
      return Math.min(1.9, Math.max(0.3, (other.mass / (other.mass + body.mass)) * 2.4));
    }

    function handleImpact(body, other, speed, point) {
      if (body.plugin?.kind !== 'item') return;
      const item = items[body.plugin.index];
      if (!item || !item.alive) return;

      const force = speed * heft(body, other);

      if (force > item.material.threshold) {
        breakItem(item, point, Math.min(speed, 18) * 0.14);
        return;
      }

      // A jolted bag throws a handful; tipping it out is handled per frame.
      if (item.def.kind === 'bag' && item.remaining > 0 && force > 3.2) {
        burstBag(item, 4 + Math.floor(Math.random() * 5));
      }

      // A hard knock counts as a shake, so slamming the chest into the floor
      // sets it off just like rattling it does.
      if (item.def.kind === 'chest') item.agitation += force * 1.6;
    }

    // --- input -------------------------------------------------------------
    // Matter's MouseConstraint reads coordinates off the DOM element, which
    // knows nothing about the virtual-pixel transform; a hand-driven Constraint
    // is shorter and can't desync. Same approach as the graveyard.
    function pickable() {
      return Composite.allBodies(world).filter((body) => !body.isStatic);
    }

    function onDown(event) {
      if (isBackButtonEvent(event)) {
        goBack();
        return;
      }
      if (cameraInput.pressOverlay(event)) return;
      const { x, y } = toVirtual(event);
      pointer = { x, y };

      // Glowing arrows first: they float over their plinth but aren't part of
      // the physics world, so they need their own hit test ahead of it.
      for (const spot of linkSpots) {
        const url = urls[spot.id];
        if (!url) continue;
        if (x >= spot.x - 1 && x <= spot.x + 9 && y >= spot.y - 1 && y <= spot.y + 9) {
          window.open(url, '_blank', 'noopener');
          return;
        }
      }

      // The nameplate itself: plinths are static, so they're never in
      // `pickable()` and never reachable through grabAt. Clicking one just
      // asks the keeper to talk. There's nothing to drag.
      for (let i = 0; i < art.displays.length; i++) {
        const plinth = plinths[i];
        if (x >= plinth.x && x <= plinth.x + plinth.sprite.w && y >= plinth.y && y <= plinth.y + plinth.sprite.h) {
          speak(art.displays[i].id);
          return;
        }
      }

      // `grabAt` tests real geometry, not bounding boxes. Matter's own
      // Query.point doesn't, so a click in the empty corner of a rotated
      // hammer's AABB used to "grab" it from a point outside its own shape and
      // it would hang and swing from thin air. This is also what lets you grab
      // the hammer by the exact end of its handle.
      const grab = grabAt(pickable(), pointer, 8);
      if (!grab) {
        cameraInput.startPan(event);
        return;
      }
      const { body } = grab;

      if (body === items[orbIndex]?.body) {
        orbWord = VISION_WORDS[Math.floor(Math.random() * VISION_WORDS.length)];
      }

      // Clicking the object itself is the other way to hear about it. Same
      // trigger as the nameplate, just via the physical body instead of the
      // static plinth underneath it.
      if (body.plugin?.kind === 'item') {
        const clicked = items[body.plugin.index];
        if (clicked && DESCRIPTIONS[clicked.def.id]) speak(clicked.def.id);
      }

      // Stiffness by mass: one constant either makes the anvil unliftable or
      // makes a kernel snap to the cursor like it's on a string.
      const stiffness = Math.min(0.28, 0.03 + 0.02 / Math.max(0.02, body.mass));

      dragConstraint = Constraint.create({
        pointA: { x: grab.point.x, y: grab.point.y },
        bodyB: body,
        // A plain world-space offset, NOT rotated back by -body.angle. Matter
        // captures the body's angle at Constraint.create as its own internal
        // `angleB` and re-rotates pointB by the *change* in angle each solve
        // step (see node_modules/matter-js/src/constraint/Constraint.js). It
        // already expects a world-oriented offset and updates it
        // incrementally from there. Pre-rotating here double-counted the
        // current angle: harmless near a body's centroid, but for a point far
        // out on a tilted body (the anvil, the smith hammer at rest) it put
        // the anchor somewhere else on the body entirely.
        pointB: Vector.sub(grab.point, body.position),
        stiffness,
        damping: 0.1,
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

    function heldBody() {
      return dragConstraint?.bodyB ?? null;
    }

    function reset() {
      for (const chunk of chunks) Composite.remove(world, chunk.body);
      for (const piece of debris) Composite.remove(world, piece.body);
      for (const spark of sparks) Composite.remove(world, spark.body);
      for (const item of items) if (item.alive) Composite.remove(world, item.body);
      Composite.remove(world, anvilBody);
      onUp();
      chunks = [];
      debris = [];
      particles = [];
      sparks = [];
      orbWord = '';
      orbWordTimer = 0;
      broken.value = 0;
      addItems();
      addAnvil();
      restHammer();
    }

    // --- loop --------------------------------------------------------------
    let accumulator = 0;
    const STEP = 1000 / 60;

    function normaliseAngle(angle) {
      return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    function updateBag(item, dt) {
      if (!item.alive || item.remaining <= 0) return;
      const tilt = Math.abs(normaliseAngle(item.body.angle));
      const speed = Vector.magnitude(item.body.velocity);

      item.spillTimer -= dt;
      // Tipped past horizontal, or swung about. Either way kernels leave.
      if ((tilt > 1.0 || speed > 2.2) && item.spillTimer <= 0) {
        burstBag(item, 1);
        item.spillTimer = 0.05 + Math.random() * 0.06;
      }
    }

    function updateChest(item, dt) {
      if (!item.alive) return;

      // Agitation is the *change* in velocity, not the speed: carrying the
      // chest smoothly across the room leaves it shut, and rattling it back and
      // forth on the spot sets it off.
      const jerk = Vector.magnitude(Vector.sub(item.body.velocity, item.lastVelocity));
      item.lastVelocity = { ...item.body.velocity };
      item.agitation = Math.max(0, item.agitation * 0.94 + jerk * 1.6 - dt * 2);

      if (item.state === 'closed' && item.agitation > 9) {
        item.state = 'arming';
        // Half a second of ominous nothing before the lid goes.
        item.timer = 0.5;
      } else if (item.state === 'arming') {
        item.timer -= dt;
        if (item.timer <= 0) {
          item.state = 'open';
          item.timer = 0.9;
          openChest(item);
        }
      } else if (item.state === 'open') {
        item.timer -= dt;
        if (item.timer <= 0) {
          item.state = 'closed';
          item.agitation = 0;
        }
      }

      const wantOpen = item.state === 'open' ? 1.55 : 0;
      item.lid += (wantOpen - item.lid) * Math.min(1, dt * (item.state === 'open' ? 26 : 7));
    }

    /**
     * A shower from the mouth at a random interval, with the ember glow
     * flaring bright for the same beat. The two read as one event (the fire
     * flaring up throws sparks) rather than two coincidental animations.
     */
    function updateForge(item, dt) {
      if (!item.alive) return;

      item.flash = Math.max(0, item.flash - dt * 2.4);

      item.emberTimer -= dt;
      if (item.emberTimer > 0) return;
      item.emberTimer = 2 + Math.random() * 4;
      item.flash = 1;

      const mouth = Vector.add(
        item.body.position,
        Vector.rotate({ x: FORGE_MOUTH.x - item.sprite.w / 2, y: FORGE_MOUTH.y - item.sprite.h / 2 }, item.body.angle),
      );
      const count = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: mouth.x + (Math.random() - 0.5) * 6,
          y: mouth.y,
          vx: (Math.random() - 0.5) * 55,
          vy: -Math.random() * 55 - 15,
          life: 0.5 + Math.random() * 0.6,
          age: 0,
          gravity: 70,
          additive: true,
          sprite: art.sparks[i % art.sparks.length],
        });
      }
    }

    function update(dt) {
      accumulator += dt * 1000;
      let steps = 0;
      // Grabbed once, read once per frame: a body can't be re-grabbed mid-frame,
      // so it's safe to resolve outside the substep loop and reuse below.
      const held = heldBody();
      while (accumulator >= STEP && steps < 3) {
        Engine.update(engine, STEP);

        // Cap and bleed off spin on whatever's held, every substep rather than
        // once per rendered frame. The constraint pins an exact point on the
        // body. Grab.js guarantees that, but a light, off-centre object like
        // the hammer has almost no rotational inertia against a spring
        // anchored near one end, so the torque from a single physics step can
        // spin it past 180° before it's even drawn once. By the time a
        // once-per-frame damping pass got a chance to act, the flip had
        // already happened and rendered. From the outside it looked like the
        // hammer swapped which end had the handle. Intervening inside the
        // substep loop stops the spin before Matter ever gets a second step to
        // build on it.
        if (held) {
          const capped = Math.max(-6, Math.min(6, held.angularVelocity));
          Body.setAngularVelocity(held, capped * 0.5);
        }

        accumulator -= STEP;
        steps++;
      }
      if (accumulator > STEP * 3) accumulator = 0;

      // Speed clamp, standing in for the continuous collision detection matter
      // doesn't have. Without it a hard fling puts things through the shelves.
      for (const body of Composite.allBodies(world)) {
        if (body.isStatic) continue;
        const speed = Vector.magnitude(body.velocity);
        if (speed > MAX_SPEED) {
          Body.setVelocity(body, Vector.mult(body.velocity, MAX_SPEED / speed));
        }
      }

      for (const item of items) {
        if (!item.alive) continue;
        if (item.def.kind === 'bag') updateBag(item, dt);
        else if (item.def.kind === 'chest') updateChest(item, dt);
        else if (item.def.kind === 'forge') updateForge(item, dt);
      }

      // The word stays lit for as long as the orb is held, and only starts
      // counting down once you let go. A continuous look, not a click-timer.
      const orb = items[orbIndex];
      if (orb?.alive && heldBody() === orb.body) orbWordTimer = ORB_WORD_FADE;
      else orbWordTimer = Math.max(0, orbWordTimer - dt);

      for (const particle of particles) {
        particle.age += dt;
        particle.vy += particle.gravity * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      }
      particles = particles.filter((particle) => particle.age < particle.life);

      for (const spark of sparks) spark.age += dt;
      for (const spark of sparks) {
        if (spark.age >= spark.life) Composite.remove(world, spark.body);
      }
      sparks = sparks.filter((spark) => spark.age < spark.life);

      if (keeperTimer > 0) keeperTimer -= dt;

      const cull = (list) =>
        list.filter((entry) => {
          if (entry.body.position.y > SHOP_H + 80 || Math.abs(entry.body.position.x - SHOP_W / 2) > SHOP_W) {
            Composite.remove(world, entry.body);
            return false;
          }
          return true;
        });
      chunks = cull(chunks);
      debris = cull(debris);
    }

    // --- draw --------------------------------------------------------------
    function drawBody(ctx, body, sprite, offset) {
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

      // Clip to the chunk's polygon and draw the whole sprite behind it, so
      // every piece carries the exact art it had before the break.
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

    function drawItem(ctx, item, t) {
      const { body, sprite } = item;

      if (item.def.kind === 'bag') {
        const fill = item.remaining / BAG_KERNELS;
        const swap = fill > 0.6 ? art.bagSprites[2] : fill > 0.15 ? art.bagSprites[1] : art.bagSprites[0];
        drawBody(ctx, body, swap, item.offset);
        return;
      }

      if (item.def.kind === 'chest') {
        // Box and lid are drawn as the two pieces the closed sprite was
        // composited from, so at lid = 0 this is pixel-identical to it. The
        // hinge is the box's back-top corner, which is exactly where the lid's
        // bottom row sits when shut.
        const { box, lid } = art.chest;
        const halfW = sprite.w / 2;
        const halfH = sprite.h / 2;

        // A small idle shiver: something's alive in there. Only while it's
        // actually resting: not held, not mid-flight. A chest still tumbling
        // through the air shivering too would just read as jittery physics.
        const resting = heldBody() !== body && Vector.magnitude(body.velocity) < 0.4;
        const idle = item.state === 'closed' && resting;
        const shiverX = idle ? Math.sin(t * 17 + item.index) * 0.5 : 0;
        const shiverRot = idle ? Math.sin(t * 13 + item.index * 2) * 0.045 : 0;

        ctx.save();
        ctx.translate(Math.round(body.position.x + shiverX), Math.round(body.position.y));
        ctx.rotate(body.angle + shiverRot);

        ctx.drawImage(box.canvas, -halfW, halfH - box.h);

        ctx.save();
        ctx.translate(-halfW + 1, -halfH + lid.h);
        ctx.rotate(-item.lid);
        ctx.drawImage(lid.canvas, -1, -lid.h);
        ctx.restore();

        // Something is clearly about to happen: light leaking from the seam,
        // and a shiver on top of it.
        if (item.state === 'arming') {
          const seamShiver = Math.round(Math.sin(t * 40) * 1.2);
          ctx.globalAlpha = 0.5 + Math.sin(t * 22) * 0.35;
          rect(ctx, -halfW + 2 + seamShiver, -halfH + lid.h - LID_SEAM, sprite.w - 4, 1, P.lamp);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        return;
      }

      drawBody(ctx, body, sprite, item.offset);
    }

    function draw(ctx, t) {
      ctx.drawImage(art.backdrop.canvas, 0, 0);

      for (const prop of art.clutter) drawSprite(ctx, prop.sprite, prop.x, prop.y);

      // Shopkeeper, behind the counter, with a slow breathing bob.
      const keeperX = 248;
      const bob = Math.round(Math.sin(t * 1.3) * 0.5 + 0.5) - 1;
      const keeperY = FLOOR_Y - art.keeper.sprite.h + bob;
      ctx.drawImage(art.keeper.sprite.canvas, keeperX, keeperY);
      // Blink by repainting the eyes in skin, rather than baking a second frame.
      if (t % 4.1 < 0.11) {
        for (const eye of art.keeper.eyes) rect(ctx, keeperX + eye.x, keeperY + eye.y, 1, 1, P.skin);
      }
      if (keeperTimer > 0) {
        const bubble = keeperBubble;
        // Centred over the keeper's own head, not dragged left toward his
        // hand. The alcove above him is open wall all the way to the
        // rafter, while the shelves are off to the left with their own
        // merchandise. A tall, narrow (SPEECH_WIDTH-wrapped) bubble fits that
        // space; a wide one used to reach clear across to the shelves.
        const keeperCenterX = keeperX + art.keeper.sprite.w / 2;
        const bx = Math.max(4, Math.min(keeperCenterX - bubble.w / 2, SHOP_W - bubble.w - 4));
        const by = Math.max(4, keeperY - bubble.h - 6);
        ctx.drawImage(bubble.canvas, bx, by);
      }

      for (const plinth of plinths) ctx.drawImage(plinth.sprite.canvas, plinth.x, plinth.y);

      // Glowing arrows, set into each plinth right after its label. Only for
      // projects that actually resolved to a URL. A small pulse to draw the
      // eye without shouting over the label next to it.
      for (const spot of linkSpots) {
        if (!urls[spot.id]) continue;
        const pulse = 0.55 + Math.sin(t * 3 + spot.x) * 0.25;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = pulse * 0.5;
        ctx.drawImage(art.glow.canvas, spot.x + 4 - art.glow.w / 2, spot.y + 4 - art.glow.h / 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(art.arrow.canvas, spot.x, spot.y);
      }

      for (const item of items) {
        if (!item.alive) continue;
        drawItem(ctx, item, t);

        // The forge's mouth: an ember glow that never goes out, flaring
        // brighter on the same beat it throws sparks so the two read as one
        // event, in the item's own rotated frame so it stays put on the
        // mouth even if the forge gets picked up and turned around.
        if (item.def.kind === 'forge') {
          const mouth = Vector.add(
            item.body.position,
            Vector.rotate({ x: FORGE_MOUTH.x - item.sprite.w / 2, y: FORGE_MOUTH.y - item.sprite.h / 2 }, item.body.angle),
          );
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.55 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 15.1) * 0.05 + item.flash * 0.7;
          ctx.drawImage(art.glow.canvas, Math.round(mouth.x - art.glow.w / 2), Math.round(mouth.y - art.glow.h / 2));
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // The anvil: unlabelled and drawn directly, not through the items loop.
      drawBody(ctx, anvilBody, art.anvil, anvilOffset);

      // The smith's hammer: a persistent warm glow so it reads as "pick me
      // up" at a glance, drawn before the sprite so the metal sits on top of
      // its own glow rather than the glow washing over the head.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + Math.sin(t * 4.4) * 0.15;
      ctx.drawImage(
        art.glow.canvas,
        Math.round(smithHammer.position.x - art.glow.w / 2),
        Math.round(smithHammer.position.y - art.glow.h / 2),
      );
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = 'source-over';
      drawBody(ctx, smithHammer, art.smithHammer, smithHammerOffset);

      for (const chunk of chunks) drawChunk(ctx, chunk);
      for (const piece of debris) drawBody(ctx, piece.body, piece.sprite, piece.offset);

      // Sparks: real bodies, drawn fading and additive so a shower of them
      // reads as light rather than as confetti.
      for (const spark of sparks) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 1 - spark.age / spark.life);
        ctx.drawImage(spark.sprite.canvas, Math.round(spark.body.position.x - 1), Math.round(spark.body.position.y - 1));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Counter last of the furniture, so the keeper stands behind it and
      // dropped things can roll in front of it.
      ctx.drawImage(art.counter.canvas, COUNTER.x, COUNTER.y);
      // Clustered at the near end of the counter, clear of the keeper's face.
      ctx.drawImage(art.counterTop.canvas, COUNTER.x + 4, COUNTER.y - art.counterTop.h);

      // Particles: dust, sparks, confetti.
      for (const particle of particles) {
        if (particle.additive) ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.life) * 0.85;
        ctx.drawImage(particle.sprite.canvas, Math.round(particle.x), Math.round(particle.y));
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Warm light: the candle on the counter, and the orb's own glow while it
      // still exists. Additive, so it brightens what's under it.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.62 + Math.sin(t * 5.1) * 0.06 + Math.sin(t * 11.3) * 0.03;
      ctx.drawImage(art.glow.canvas, COUNTER.x + 9 - art.glow.w / 2, COUNTER.y - 12 - art.glow.h / 2);

      const orb = items[orbIndex];
      if (orb?.alive) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 1.9) * 0.16;
        ctx.drawImage(
          art.orbGlow.canvas,
          Math.round(orb.body.position.x - art.orbGlow.w / 2),
          Math.round(orb.body.position.y - art.orbGlow.h / 2),
        );
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // A whirlpool: motes spiralling inward and vanishing at the centre,
        // looping forever. It's what makes the orb bait a second look instead
        // of just sitting there glowing. A fixed mote drifting in a circle
        // reads as decoration, something visibly being *drawn in* reads as a
        // thing worth staring into.
        const orbR = orb.sprite.w / 2 - 2;
        for (let i = 0; i < 5; i++) {
          const cycle = (t * 0.55 + i / 5) % 1;
          const angle = cycle * Math.PI * 5 + i * 1.7;
          const radius = (1 - cycle) * orbR;
          const mx = orb.body.position.x + Math.cos(angle) * radius;
          const my = orb.body.position.y + Math.sin(angle) * radius * 0.82;
          ctx.globalAlpha = 0.2 + (1 - cycle) * 0.6;
          px(ctx, Math.round(mx), Math.round(my), cycle < 0.5 ? '#fff6ff' : P.orbLit);
        }
        ctx.globalAlpha = 1;

        // The word: only while it's actually got something to show, faded
        // out over its last half-second rather than snapping off.
        if (orbWord && orbWordTimer > 0) {
          ctx.globalAlpha = Math.min(1, orbWordTimer / ORB_WORD_FADE);
          drawSwirlyText(
            ctx, orbWord,
            Math.round(orb.body.position.x), Math.round(orb.body.position.y - orb.sprite.h - 5),
            t, P.orbLit, '#fff6ff',
          );
          ctx.globalAlpha = 1;
        }
      }

      // Vignette, matching the other scenes.
      ctx.globalAlpha = 0.16;
      rect(ctx, 0, 0, SHOP_W, 8, P.ink);
      rect(ctx, 0, SHOP_H - 8, SHOP_W, 8, P.ink);
      ctx.globalAlpha = 1;

    }

    const scene = useScene({
      width: SHOP_W,
      height: SHOP_H,
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

    return { canvasRef, dragging, broken, reset, onDown, onMove, onUp, onWheel, goBack };
  },
};
</script>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  background: #120c10;
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
