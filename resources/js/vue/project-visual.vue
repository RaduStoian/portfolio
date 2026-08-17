<template>
  <div class="visual" aria-hidden="true">

    <!-- ForgeKit: a local-dev control panel, services up and running. Only
         shown as a fallback now that the real screenshot is wired in. -->
    <div v-if="variant === 'forgekit'" class="panel">
      <div v-for="(service, i) in services" :key="service" class="row" :style="{ '--i': i }">
        <span class="sq"></span>
        <span class="nm">{{ service }}</span>
        <span class="dot"></span>
      </div>
    </div>

    <!-- Mindstare: a slow breathing orb. Fallback for the Vimeo loop. -->
    <div v-else-if="variant === 'mindstare'" class="breathe">
      <span class="ring" style="--r: 0s"></span>
      <span class="ring" style="--r: 1.6s"></span>
      <span class="ring" style="--r: 3.2s"></span>
      <span class="orb"></span>
    </div>

    <!-- Vhoice: anonymous figures with star ratings. Deliberately faceless —
         the real site shows real politicians, and inventing recognisable
         faces (or borrowing real ones) isn't something a portfolio tile
         should do. -->
    <div v-else-if="variant === 'vhoice'" class="reviews">
      <div v-for="(entry, i) in entries" :key="i" class="entry" :style="{ '--i': i }">
        <span class="figure"></span>
        <span class="bars">
          <span class="bar bar-a"></span>
          <span class="bar bar-b"></span>
        </span>
        <span class="score">
          <i v-for="n in 5" :key="n" class="star" :class="{ on: n <= entry }"></i>
        </span>
      </div>
    </div>

    <!-- MovieSwiper: a phone, with one card swiped back and forth inside it and
         a verdict stamped on each throw. The poster is pure CSS: sprocket edges
         plus a play triangle reads as "film" without needing artwork. -->
    <div v-else-if="variant === 'movieswiper'" class="phone">
      <span class="speaker"></span>
      <span class="side-btn"></span>

      <div class="screen">

        <div class="deck">
          <div class="swipe-card">
            <span class="stamp nope">Nope</span>
            <span class="stamp yes">Yes</span>

            <div class="poster">
              <span class="sprockets left"></span>
              <span class="sprockets right"></span>
              <span class="play"></span>
            </div>

            <div class="meta">
              <span class="pills">
                <b class="rating">7.3</b>
                <b>2025</b>
              </span>
              <span class="title-bar"></span>
              <span class="line line-a"></span>
              <span class="line line-b"></span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Physics Museum: a wireframe exhibit turning in 3D. -->
    <div v-else-if="variant === 'physics'" class="stage">
      <div class="cube">
        <span v-for="n in 6" :key="n" :class="`f${n}`"></span>
      </div>
      <span class="orbit"><i></i></span>
    </div>

    <!-- Anything without its own visual yet. -->
    <div v-else class="fallback">
      <span></span><span></span><span></span>
    </div>

  </div>
</template>

<script>
export default {
  name: 'ProjectVisual',
  props: { variant: { type: String, default: 'default' } },
  data() {
    return {
      services: ['Apache', 'MySQL', 'PHP 8.4', 'Node'],
      entries: [4, 2, 5],
    };
  },
};
</script>

<style scoped>
.visual {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* ---------- ForgeKit ---------- */
.panel {
  width: min(84%, 300px);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  animation: settle 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(var(--i) * 0.09s);
}

.row .sq {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  background: linear-gradient(140deg, var(--tint), color-mix(in srgb, var(--tint) 45%, transparent));
}

.row .nm {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  margin-right: auto;
}

.row .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #30d158;
  animation: ping 2.6s ease-out infinite;
  animation-delay: calc(var(--i) * 0.3s);
}

@keyframes settle {
  from { opacity: 0; transform: translateY(10px); }
}

@keyframes ping {
  0%, 70%, 100% { box-shadow: 0 0 0 0 rgba(48, 209, 88, 0); }
  35% { box-shadow: 0 0 0 5px rgba(48, 209, 88, 0.22); }
}

/* ---------- Mindstare ---------- */
.breathe {
  position: relative;
  width: 190px;
  height: 190px;
  display: grid;
  place-items: center;
}

.breathe .orb {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #c9a6ff, #7d5ce0 44%, #4a2f9e 100%);
  animation: breathe 7s ease-in-out infinite;
}

.breathe .ring {
  position: absolute;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--tint) 45%, transparent);
  animation: expand 4.8s ease-out infinite;
  animation-delay: var(--r);
}

@keyframes breathe {
  0%, 100% { transform: scale(0.9); }
  50% { transform: scale(1.06); }
}

@keyframes expand {
  from { transform: scale(0.9); opacity: 0.65; }
  to { transform: scale(1.9); opacity: 0; }
}

/* ---------- Vhoice ---------- */
.reviews {
  width: min(84%, 290px);
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  animation: settle 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(var(--i) * 0.1s);
}

/* Head-and-shoulders silhouette, drawn from two pseudo-elements and clipped
   by the parent so the shoulders sit flush with its bottom edge. */
.entry .figure {
  position: relative;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  overflow: hidden;
  --sil: color-mix(in srgb, var(--tint) 62%, var(--text));
}

.entry .figure::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 2px;
  width: 11px;
  height: 11px;
  margin-left: -5.5px;
  border-radius: 50%;
  background: var(--sil);
}

.entry .figure::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 23px;
  height: 13px;
  margin-left: -11.5px;
  border-radius: 12px 12px 0 0;
  background: var(--sil);
}

.entry .bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-right: auto;
}

.entry .bar {
  height: 5px;
  background: var(--hairline-strong);
  display: block;
}

.entry .bar-a { width: 66px; }
.entry .bar-b { width: 42px; opacity: 0.55; }

.entry .score {
  display: flex;
  gap: 3px;
}

/* clip-path rather than a ★ glyph, so the shape doesn't shift with whatever
   font happens to be resolving. */
.star {
  width: 10px;
  height: 10px;
  background: var(--hairline-strong);
  clip-path: polygon(
    50% 0%, 61% 35%, 98% 35%, 68% 57%,
    79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%
  );
}

.star.on {
  background: var(--tint);
}

/* ---------- MovieSwiper ----------
   A phone silhouette. border-radius is used freely in here: these are device
   and control shapes rather than panel corners, the same exemption the orb and
   the status lights get. */
.phone {
  position: relative;
  width: 118px;
  height: 218px;
  padding: 7px;
  border-radius: 19px;
  background: linear-gradient(160deg, #2c2735, #17141d);
  box-shadow:
    0 14px 32px -14px rgba(20, 14, 26, 0.55),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.phone .speaker {
  position: absolute;
  top: 3.5px;
  left: 50%;
  width: 26px;
  height: 3px;
  margin-left: -13px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
}

.phone .side-btn {
  position: absolute;
  top: 52px;
  right: -1.5px;
  width: 1.5px;
  height: 24px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.16);
}

.screen {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 13px;
  background: grey;
}

.app-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 7px 4px;
}

.app-dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--tint);
}

.app-name {
  width: 38px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.28);
}

/* Clips the card as it travels, so the throw reads as a real swipe. */
.deck {
  position: relative;
  flex: 1 1 auto;
  margin: 0 6px;
  overflow: hidden;
  margin:0;
}

.swipe-card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 7px;
  background: #efecf4;
  box-shadow: 0 6px 14px -8px rgba(0, 0, 0, 0.5);
  animation: swipe 5.6s ease-in-out infinite;
}

.actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 11px;
  padding: 7px 0 8px;
}

.act {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid;
}

.act.no { border-color: #b3253f; }
.act.like { border-color: #1c7a43; }

.act.star {
  width: 19px;
  height: 19px;
  border-color: #d9a13c;
  box-shadow: 0 0 8px -1px rgba(217, 161, 60, 0.5);
}

.poster {
  position: relative;
  flex: 1 1 60%;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(155deg, color-mix(in srgb, var(--tint) 78%, #1b1220), #241528);
}

/* Film sprocket strips down both edges. */
.sprockets {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.82) 0 5px,
      transparent 5px 12px
    );
  background-size: 4px 12px;
  background-position: center top;
  background-repeat: repeat-y;
  opacity: 0.6;
}

.sprockets.left { left: 0; }
.sprockets.right { right: 0; }

.play {
  width: 0;
  height: 0;
  border-left: 17px solid rgba(255, 255, 255, 0.92);
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  margin-left: 4px;
}

/* Everything from here down sits on the phone's own light card, so the colours
   are literal rather than themed: the card stays a light screen whichever
   theme the surrounding site is in. */
.meta {
  flex: 0 0 auto;
  padding: 6px 7px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pills {
  display: flex;
  gap: 3px;
  margin-bottom: 1px;
}

.pills b {
  font-size: 7px;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 2px;
  color: #6b6478;
  background: rgba(20, 16, 26, 0.09);
  letter-spacing: 0.02em;
}

.pills b.rating {
  color: #7d5a19;
  background: rgba(224, 171, 60, 0.32);
}

.title-bar {
  height: 6px;
  width: 74%;
  border-radius: 1px;
  background: rgba(27, 23, 38, 0.7);
}

.line {
  height: 3px;
  border-radius: 1px;
  background: rgba(27, 23, 38, 0.18);
}

.line-a { width: 92%; }
.line-b { width: 62%; }

/* Verdict stamps, angled like a hand-thrown card. Each fades in only while
   the card is travelling in its own direction. */
.stamp {
  position: absolute;
  top: 8px;
  z-index: 2;
  padding: 2px 5px;
  border-radius: 2px;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0;
}

.stamp.yes {
  left: 7px;
  color: #1c7a43;
  border: 1.5px solid #1c7a43;
  transform: rotate(-14deg);
  animation: stampYes 5.6s ease-in-out infinite;
}

.stamp.nope {
  right: 7px;
  color: #b3253f;
  border: 1.5px solid #b3253f;
  transform: rotate(14deg);
  animation: stampNope 5.6s ease-in-out infinite;
}

@keyframes swipe {
  0%, 8%    { transform: translateX(0) rotate(0deg); }
  22%       { transform: translateX(34%) rotate(11deg); }
  36%, 46%  { transform: translateX(0) rotate(0deg); }
  60%       { transform: translateX(-34%) rotate(-11deg); }
  74%, 100% { transform: translateX(0) rotate(0deg); }
}

@keyframes stampYes {
  0%, 11%   { opacity: 0; }
  22%, 30%  { opacity: 1; }
  38%, 100% { opacity: 0; }
}

@keyframes stampNope {
  0%, 49%   { opacity: 0; }
  60%, 68%  { opacity: 1; }
  76%, 100% { opacity: 0; }
}

/* ---------- Physics Museum ---------- */
.stage {
  position: relative;
  width: 190px;
  height: 190px;
  display: grid;
  place-items: center;
  perspective: 620px;
}

.cube {
  position: relative;
  width: 90px;
  height: 90px;
  transform-style: preserve-3d;
  animation: tumble 16s linear infinite;
}

.cube span {
  position: absolute;
  inset: 0;
  border: 1.5px solid var(--tint);
  background: color-mix(in srgb, var(--tint) 9%, transparent);
}

.cube .f1 { transform: translateZ(45px); }
.cube .f2 { transform: rotateY(180deg) translateZ(45px); }
.cube .f3 { transform: rotateY(90deg) translateZ(45px); }
.cube .f4 { transform: rotateY(-90deg) translateZ(45px); }
.cube .f5 { transform: rotateX(90deg) translateZ(45px); }
.cube .f6 { transform: rotateX(-90deg) translateZ(45px); }

@keyframes tumble {
  from { transform: rotateX(-24deg) rotateY(0deg); }
  to { transform: rotateX(-24deg) rotateY(360deg); }
}

.orbit {
  position: absolute;
  width: 162px;
  height: 162px;
  animation: tumble 6s linear infinite;
}

.orbit i {
  position: absolute;
  top: 50%;
  left: 0;
  width: 9px;
  height: 9px;
  margin-top: -4.5px;
  border-radius: 50%;
  background: var(--tint);
  box-shadow: 0 0 14px var(--tint);
}

/* ---------- Fallback ---------- */
.fallback {
  display: flex;
  gap: 14px;
}

.fallback span {
  width: 42px;
  height: 42px;
  background: var(--tint);
  opacity: 0.3;
}

@media (prefers-reduced-motion: reduce) {
  .visual *,
  .visual *::before,
  .visual *::after {
    animation: none !important;
  }
}
</style>
