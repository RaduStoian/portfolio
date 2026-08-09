# Portfolio — agent notes

Personal portfolio, built as a **pixel-art game** rather than a normal site.
Laravel 12 + Vue 3 SPA shell, served locally by ForgeKit at `portfolio.test`.

This file is the running record of *decisions and their reasons*. Update it when
a decision changes — a stale reason here is worse than no reason.

## Commands

Always use the ForgeKit shim so the site-scoped PHP/Node get used:

```
fkit php artisan ...
fkit composer ...
fkit npm run dev      # HMR at https://portfolio.test:5173
fkit npm run build
```

Node is pinned below Vite's preferred version (22.11.0 vs 22.12+), which is why
`vite` is held at `^7` and `laravel-vite-plugin` at `^2`. Vite 8's rolldown
native binding fails to load on this Node. Bump the site's Node in the ForgeKit
UI before trying Vite 8 again.

Database: MySQL on 127.0.0.1:3306, database `portfolio`, user/pass
`forgekit`/`forgekit`. **Never** run `migrate:fresh`, drop tables, or touch other
databases on this server without asking first — the same MySQL instance hosts
unrelated projects.

## Tech decisions

**Canvas 2D, not three.js, not PixiJS.**
Everything is 2D: the "isometric" overworld is a painted background, not a tile
engine, and the physics is 2D. three.js would add a 3D scene graph and camera
math we'd never use, and makes pixel-crispness *harder* (texture filtering,
half-pixel seams). Pixi is the normal choice for pixel-art 2D but earns its cost
at thousands of sprites; we have dozens. Revisit Pixi if we ever hit real
per-frame sprite counts — it consumes the same baked textures, so the port is
mechanical.

**matter-js for physics.** Rigid bodies, `MouseConstraint` dragging, and
cloth-as-a-constraint-grid all come free. No alternative was seriously
considered.

**Art is baked procedurally, not authored as PNGs.**
`resources/js/game/pixel.js` draws each sprite onto a small offscreen canvas at
*true* pixel resolution (a gravestone is literally 26x36 px), which is then
blitted scaled-up with `imageSmoothingEnabled = false`. This is real pixel art
whose source is code, so there's no art pipeline and no binary assets in git.
To swap in hand-drawn PNGs later, replace one `bake*` function per sprite with
an image load — the rest of the engine doesn't care.

**Art direction: cosy, warm, chunky — Stardew-adjacent.**
The overworld sits at golden hour and the graveyard at night, but they share
one palette: same greens, woods and stones, differing only in their sky and
light keys (`P.skyTop…` vs `P.nightTop…`). Concretely, what buys the "game art"
look rather than "shapes on a background":
- a 1px warm-dark outline (`P.outline`, never pure black) around every prop,
  baked by `outlineSprite`;
- surface texture on every large flat area — plank courses, stone blocks, roof
  shingles — because a flat rectangle of one colour always reads as unfinished;
- one consistent light direction: lit edge top-left, shadow bottom-right;
- warm light sources (lamps, windows) composited with `globalCompositeOperation
  = 'lighter'` so they brighten what's under them instead of fogging it.

**Animation is faked in the draw call, not simulated** — except in the
graveyard, where physics is the point. Trees, bushes and banners use
`drawSway`, which blits a sprite row by row with a horizontal offset that grows
towards the top. Every animated thing takes its own `phase`, or the whole town
moves as one block and instantly reads as fake. Anything that twinkles or
flickers (stars, fireflies, lamps) steps between discrete palette colours
rather than fading with `globalAlpha` — half-lit pixels read as blur, not as
twinkling. This is also why stars are stored as *data* and drawn per frame
instead of being baked into the sky.

**Scenes are Vue components that own a canvas.** Routing between scenes is
vue-router; each scene mounts, builds its world, runs a RAF loop, and tears it
all down on unmount. Game routes set `meta.fullscreen` so the site chrome (nav
and footer) hides — same pattern the ForgeKit site uses for its demo page.

## Structure

```
resources/js/game/
  palette.js     shared colour ramps — every sprite pulls from here
  pixel.js       offscreen-canvas helpers, outlines, the scaled blit, drawSway
  useScene.js    composable: canvas sizing, DPR, RAF loop, teardown
  art/shared.js  isoBox / isoRoof / windowPane / alpha masks + hover highlights
  art/props.js   scenery shared by scenes: trees, bushes, lamps, glows, crates
  art/*.js       per-scene bake functions
  scenes/        the Vue scene components
```

## Scene status

- **Overworld** (`/`) — hand-painted fake-isometric town square at golden hour.
  4 clickable buildings: Projects, Graveyard, Career, Me. Hover highlights via
  a pixel-accurate alpha mask; click fades out and routes. Animated: twinkling
  stars, swaying trees/bushes/flowers, chimney smoke, flickering lamps,
  fireflies, well-water shimmer, a waving pennant on the tower. Deliberately
  *not* a tile engine and there's no player character — adding walking means
  redoing this scene, it isn't an increment.
- **Graveyard** (`/graveyard`) — side-on, gravity, 3 gravestones, a draggable
  sledgehammer that shatters them into rigid-body chunks above an impact
  threshold, and a constraint-grid cloth flag in the wind. Also twinkling
  stars, swaying bare trees and a lantern. Currently the only built interior.
- Projects / Career / Me — not built. They currently fall through to the plain
  Vue pages.

## Conventions

- Scene coordinates are **virtual pixels**, not CSS pixels. Each scene declares
  a virtual resolution and `useScene` computes an integer `scale` to fit the
  viewport. All game logic and physics work in virtual px; only the final blit
  knows about the real canvas size. Never mix the two.
- Physics bodies and their sprites are paired via `body.render.sprite`-style
  custom fields we set ourselves — we do *not* use matter's built-in renderer.
- Anything animated but not physical (flag pole, water, music notes) is driven
  off a single `elapsed` seconds value passed to draw functions, so animation is
  frame-rate independent.
- Place props by their own sprite height (`y = GROUND_Y - sprite.h`), never a
  hard-coded y. `drawSway` anchors at the sprite's bottom row, so a hard-coded y
  buries the trunk the moment a sprite's size changes.
- Physics bodies must not spawn overlapping the ground. The solver shoves them
  out, and a hammer spawned overlapping ended up balanced upright on its handle
  tip — stable, but it reads as floating.

## Gotchas worth not rediscovering

- **Matter's `MouseConstraint` is unusable here.** It reads coordinates off the
  DOM element, which knows nothing about the virtual-pixel transform. The
  graveyard drives a plain `Constraint` from pointer events instead: shorter,
  and impossible to desync.
- **`Bodies.fromVertices` needs convex polygons** unless poly-decomp is
  installed. `shatterCells` jitters shared grid *vertices* by well under half a
  cell, which keeps every chunk convex and keeps neighbours sharing exact
  corners so the pieces still fit together.
- **Don't draw diagonals as stacks of 1px-tall quads.** A 1px quad spanning a
  diagonal only fills a couple of pixels per scanline, so it comes out hatched.
  This bit the roofs; they're two solid polygons now.
- To eyeball a scene without a browser session, headless Chrome will screenshot
  it: `chrome --headless --ignore-certificate-errors --virtual-time-budget=8000
  --screenshot=out.png https://portfolio.test/`.
