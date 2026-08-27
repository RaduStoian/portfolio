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

**Audio is opt-in and globally mixed.** `game/sound.js` owns the persisted
site-wide volume plus long-lived audio; `SoundControl.vue` is the fixed
top-right iron-and-gold pixel speaker plaque on every route, matching the Back
button's bevel. It opens a seven-stop vertical pixel fader with no numeric
readout. New visitors start
at 50% volume; returning visitors keep their saved setting. The rain and cat
purr MP3s are reused from the sibling ForgeKit demo under `public/audio/`.
House rain is scene-local intent and stops on close/unmount; cat purr is a
short timed playback. The record player uses a generated Web Audio chord/kick
loop, so the lo-fi music is original and royalty-free and may continue between
scenes until the player is switched off. Browsers receive no autoplay request:
all playback begins with an object or sound-control gesture.

**Scenes are Vue components that own a canvas.** Routing between scenes is
vue-router; each scene mounts, builds its world, runs a RAF loop, and tears it
all down on unmount. Game routes set `meta.fullscreen` so the site chrome (nav
and footer) hides. Fullscreen routes mount directly with no site `<main>`
container around them. Every scene draws the same iron-and-gold Back plaque
inside its canvas as a device-space overlay fixed near the viewport top-left
(except the town square, which is the navigation root and has no Back action).
This keeps it visible above portrait letterboxing on mobile while retaining
crisp 2x pixels. Its generous viewport hit-area uses browser history and falls
back to the town square on a direct visit. Remaining HTML utility controls sit
top-right so they never cover the plaque.

## Structure

```
resources/js/game/
  palette.js     shared colour ramps — every sprite pulls from here
  pixel.js       offscreen-canvas helpers, outlines, the scaled blit, drawSway
  text.js        the 3x5 pixel font: GLYPHS, drawText, textWidth, drawSwirlyText
  grab.js        grabAt() — precise, geometry-based pointer picking for matter
                 bodies, shared by the graveyard and the shop
  useScene.js    composable: canvas sizing, DPR, RAF loop, teardown
  art/shared.js  isoBox / isoRoof / windowPane / alpha masks + hover highlights,
                 and the shatter helpers (shatterCells, cellCoverage, bakeDust)
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
- **Graveyard** (`/graveyard`) — side-on, gravity, 4 project gravestones, and a
  draggable sledgehammer that shatters them into rigid-body chunks above an
  impact threshold. The four distinct
  memorials represent Poop Fight, Quick Draw, the couples game guide, and the
  long-distance video/voice games site. A seated grave keeper at the right
  describes whichever stone is touched. A cropped crypt side-wall closes the
  right edge behind him, with an animated wall torch that throws random sparks.
  Its entrance descends into the ground and continues beyond the right edge,
  shown only as the dark mouth and first few stone steps.
  Also twinkling stars and swaying bare trees; the earlier cloth flag and gate
  lantern were removed so the crypt owns the scene's warm focal light.
- **Projects** (`/projects`) — an RPG curio shop, two shelves plus the floor.
  Each project is a physical object on a labelled plinth, and *the material is
  the content*: you learn what a project is by throwing it. Mindstare is a
  glass scrying orb with a whirlpool of motes always spiralling into it —
  smashes if you so much as drop it, and picking it up surfaces a swirly
  vision-word (`VISION_WORDS` in `scenes/shop.vue`). Vhoice is a gilded orator
  that survives everything short of a hard throw or the anvil. MovieSwiper is
  a popcorn bag that spills individually-simulated kernels when tipped or
  jolted. Physics Museum is a chest that idles with a faint alive-inside
  shiver and erupts half a second after you actually shake it. ForgeKit is a
  bigger anvil on the floor (moved off the shelf — its swing needs room a
  shelf gap can't give it) with a glowing smith's hammer resting on it: pick
  the hammer up yourself and strike the anvil to throw real spark *bodies*
  that bounce, fade fast, and can break other things on the way. Every plinth
  that has a matching row in the `projects` table (matched by title, see
  `DatabaseSeeder`) gets a glowing arrow that opens that project's real URL in
  a new tab. The plain database-backed list still exists at
  `/projects/list`, linked from the HUD.
- **Career** (`/career`) — the clocktower's guild archive: four hanging,
  clickable employment contracts form a ten-year timeline. Touching one makes
  it swing and prompts the seated archivist to summarize that role. A permanent
  row of stack badges, working clock gears, ledger desk, and moonlit tower
  window make the CV readable as a game scene. Company names, dates and copy
  are intentionally placeholder data until the real résumé is supplied.
- **Me / House** (`/about`) — a rainy, lived-in attic studio that describes its
  owner through belongings rather than another biography panel. The computer,
  desk lamp, record player, coffee mug, rain window and resident cat are hotspots:
  each changes the room and briefly surfaces a compact thought. Opening the
  symmetrical two-casement window starts rain audio, the cat purrs briefly,
  and the record player toggles generated lo-fi. Rain falls quickly in muted
  blue vertical 1–2px streaks with independently seeded speeds. One continuous
  world-space rain field is masked through both the exterior and the window, so
  opening a sash never changes the weather pattern. Coffee steams continuously,
  and the cat reclines side-on with shut eyes and a separately animated curled
  thin attached tail that curves down from its left haunch and rests along the
  rug, with a separate raised curve shown only briefly at random intervals.
  Touching it briefly
  raises its head and opens its eyes; repeated interaction extends the wake timer rather than
  toggling its face. There are no reaction particles. The couch,
  roof beams closed to the floor with timber end posts, matching open/closed
  window wood, middle rails, constrained monitor light, and surface-aligned desk props
  replaced the rough first layout. The cutaway exterior is a layered cloudy
  night with sparse clear stars, a partially veiled moon, and vertical rain
  clipped outside the full house silhouette. Empty scenery
  still pans through the shared camera. The personal copy is intentionally
  impressionistic until real biography text is supplied.

## Conventions

- Scene coordinates are **virtual pixels**, not CSS pixels. Each scene declares
  a virtual resolution and `useScene` computes a **cover** camera for the
  viewport. Below 768 CSS px it uses an integer scale for chunky mobile pixels;
  at laptop/desktop widths it uses the exact fractional cover scale. This avoids
  rounding an ordinary 4.2x desktop fit up to 5x and needlessly cropping both
  axes—the world normally matches the unobstructed viewport width exactly, with
  only browser-shortened vertical content left to pan. The scene always fills
  the screen; excess is cropped rather than letterboxed.
  All game logic and physics work in virtual px; only the final blit knows about
  the real canvas size. Never mix the two.
- Cropped scenes use a shared camera in `useScene`: dragging empty scenery pans,
  while anything interactive wins the pointer before the camera sees it. The
  camera is clamped to the world, remembered per route in `sessionStorage`, and
  exposes viewport-fixed pixel arrows only for directions with hidden content.
  Arrow taps nudge; holding one pans continuously. New scenes should wire their
  empty-hit branch through `createCameraInput` rather than native page scrolling,
  which conflicts with one-finger physics dragging. Wheel input pans vertically,
  Shift+wheel pans horizontally, and trackpad deltaX/deltaY pans both axes (the
  same WheelEvent path covers macOS and other laptop touchpads).
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
  tip — stable, but it reads as floating. The same rule applies to *each other*:
  the shop's chest spawned its whole payload on one point inside itself and the
  solver fired the chest across the room like a mortar. Spawn bursts in a fan,
  clear of the thing they come out of.
- **Materials are the shop's whole design.** An item's behaviour is one entry in
  the `MATERIALS` table in `scenes/shop.vue`, and the impact threshold is
  calibrated against one number: a fall from the top shelf to the floor lands at
  a relative speed of roughly 7. Glass is below that and gold well above, which
  is what makes "glass breaks when dropped, gold doesn't" true by construction
  rather than by tuning each item. A heavier attacker does more damage via
  `heft()`, so the anvil smashes things without a single special case.
- **Interior backdrops need a value gap.** The shop's first pass had the wall,
  the shelves, the plinths and the floor all in the same mid-brown, and the
  scene flattened into one wooden mass. The wall now sits a step darker than
  anything standing on it. Same reason plinth labels are gilded rather than
  carved: dark-on-brown at 3px tall is a smudge.
- Matter has no continuous collision detection and the shelf boards are a few
  pixels thick, so `shop.vue` clamps body speed each frame. That's much cheaper
  than substepping and the cap is high enough that nothing feels held back.
- **A collider should look like the thing it's the collider for.** The anvil
  used to be one bounding rectangle over an L-shaped silhouette (horn + face +
  waist + base), which is mostly empty air around the horn. `ANVIL_PARTS` in
  `art/shop.js` is now the single source of truth both `bakeAnvil` paints from
  and the scene builds a compound body from, so the two can't drift apart.

## Gotchas worth not rediscovering

- **Matter's `MouseConstraint` is unusable here.** It reads coordinates off the
  DOM element, which knows nothing about the virtual-pixel transform. Every
  scene drives a plain `Constraint` from pointer events instead: shorter, and
  impossible to desync.
- **Matter's `Query.point` tests bounding boxes, not shapes.** A rotated
  sledgehammer's AABB is much bigger than the hammer — click its empty corner
  and `Query.point` still "hits" it, so the drag constraint anchors on a point
  outside the actual geometry and the hammer swings from thin air instead of
  from where you grabbed it. `grab.js`'s `grabAt()` tests real polygon
  containment (falling back to nearest-point-on-edge within a small reach for
  thin things like a 3px handle) and always returns a point that's actually on
  the body. Every scene picks bodies through this now, not `Query.point`.
- **`Constraint.pointB` is a world-space offset, not a body-local one — Matter
  re-rotates it for you.** `Constraint.create` captures `bodyB.angle` at
  creation time as `constraint.angleB`; every `Constraint.solve` step after
  that does `Vector.rotate(pointB, bodyB.angle - constraint.angleB)` and
  updates `angleB` to match — i.e. it rotates `pointB` by the *change* in
  angle since creation, not by the current angle. Both scenes used to hand it
  `Vector.rotate(worldOffset, -body.angle)`, pre-rotating by the *current*
  angle on the mistaken assumption that Matter wanted a body-local point and
  would rotate it forward by the full current angle each step. It doesn't —
  it only applies the incremental change, which is ~0 at the instant of
  creation. The two rotations don't cancel; they compound wrong, and the
  resulting anchor error scales with both how far the grab point is from the
  body's centroid and how far the body's current angle is from zero. That's
  exactly why it was invisible grabbing near a body's centroid (small offset)
  or an upright body (small angle), and glaring on the sledgehammer specifically
  — grabbed far out on the handle, resting tilted ~77°. Fix: hand Matter the
  plain world-space offset, `Vector.sub(grabPoint, body.position)`, and let it
  do the incremental rotation itself. This bug predated `grabAt()` entirely;
  the old `Query.point`-based picking just never let anyone grab far enough
  from centroid on a rotated-enough body to notice.
- Both scenes also cap and damp angular velocity on whatever's currently held,
  applied *inside* the physics substep loop (once per `Engine.update` call, not
  once per rendered frame — a flip can complete within the up-to-3 substeps
  inside one frame, too fast for once-per-frame damping to catch). This is
  belt-and-braces on top of the `pointB` fix above, for the residual case of a
  very light, very off-centre object picking up real spin from a fast mouse
  motion — not itself a fix for the anchor bug, which was a pure coordinate
  error. Loosen it (or drop it) if held objects start to feel dead.
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
