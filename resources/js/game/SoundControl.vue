<template>
  <div ref="root" class="sound-control">
    <button
      type="button"
      class="sound-button"
      :aria-label="open ? 'Close volume control' : 'Open volume control'"
      :aria-expanded="open"
      @click="open = !open"
    >
      <canvas ref="iconCanvas" class="sound-icon" width="15" height="13"></canvas>
    </button>

    <div v-if="open" class="volume-panel" @pointerdown.stop>
      <span class="volume-number">{{ Math.round(volume * 100) }}</span>
      <input
        class="volume-slider"
        type="range"
        min="0"
        max="100"
        step="1"
        :value="Math.round(volume * 100)"
        aria-label="Site volume"
        @input="changeVolume"
      />
    </div>
  </div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue';
import { soundState, setVolume } from './sound.js';
import { buildSoundIcons } from './art/soundIcon.js';

export default {
  name: 'SoundControl',
  setup() {
    const root = ref(null);
    const iconCanvas = ref(null);
    const open = ref(false);
    const volume = computed(() => soundState.volume);

    // Same three states the old CSS version keyed its waves off, just baked
    // as real pixel art instead of concentric border-radius arcs.
    const iconState = computed(() => (volume.value === 0 ? 'muted' : volume.value > 0.35 ? 'high' : 'low'));

    // Baked once: three tiny true-size frames, blitted scaled with
    // smoothing off, the same rule every sprite in the game follows.
    const icons = buildSoundIcons();

    function drawIcon() {
      const canvas = iconCanvas.value;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(icons[iconState.value].canvas, 0, 0);
    }

    const closeOutside = (event) => {
      if (open.value && !root.value?.contains(event.target)) open.value = false;
    };
    const changeVolume = (event) => setVolume(Number(event.target.value) / 100);

    watch(iconState, drawIcon);
    onMounted(() => {
      drawIcon();
      document.addEventListener('pointerdown', closeOutside);
    });
    onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside));

    return { root, iconCanvas, open, volume, changeVolume };
  },
};
</script>

<style scoped>
.sound-control {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 100;
}

/*
 * Same iron-and-gold plaque language as the in-canvas Back button
 * (backButton.js): a P.outline border, P.ironDeep fill, a P.iron highlight
 * on the top inner edge and P.ironDark shadow on the bottom, plus four gold
 * rivets, which is what turns "dark rounded rectangle" into "a fitted panel
 * bolted to something," matching the shop's lock plates and iron strapping.
 */
.sound-button {
  position: relative;
  width: 34px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2b2f3d;
  border: 3px solid #2e2333;
  outline: none;
  cursor: pointer;
}

.sound-button:focus,
.sound-button:focus-visible {
  outline: none;
}

.sound-icon {
  width: 30px;
  height: 26px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.volume-panel {
  position: absolute;
  top: 34px;
  right: 0;
  width: 34px;
  height: 142px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 6px 3px;
  box-sizing: border-box;
  background: #2b2f3d;
  border: 3px solid #2e2333;
  box-shadow: inset 0 2px #6b7183, inset 0 -2px #454a5c;
}

.volume-number {
  color: #ffe9a0;
  font: 9px/1 monospace;
}

/*
 * A chunky vertical fader instead of a default range input: a recessed
 * wood-toned groove with hard tick steps, and a small brass rivet for a
 * thumb. Square, beveled, no border-radius, so it reads as a physical slide
 * control rather than browser chrome.
 */
.volume-slider {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 108px;
  margin: 0;
  writing-mode: vertical-lr;
  direction: rtl;
  cursor: pointer;
  background: transparent;
}

.volume-slider::-webkit-slider-runnable-track {
  width: 8px;
  height: 100%;
  background:
    repeating-linear-gradient(0deg, #6d4512 0, #6d4512 1px, transparent 1px, transparent 13px),
    #402615;
  border: 2px solid #2e2333;
  box-shadow: inset 1px 0 #221b2b, inset -1px 0 #5e3a22;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 8px;
  margin-left: -4px;
  background: #e5ab3c;
  border: 2px solid #2e2333;
  box-shadow: inset 0 1px #ffe9a0, inset 0 -1px #a97220;
}

.volume-slider::-moz-range-track {
  width: 8px;
  height: 100%;
  background:
    repeating-linear-gradient(0deg, #6d4512 0, #6d4512 1px, transparent 1px, transparent 13px),
    #402615;
  border: 2px solid #2e2333;
  box-shadow: inset 1px 0 #221b2b, inset -1px 0 #5e3a22;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 8px;
  border-radius: 0;
  background: #e5ab3c;
  border: 2px solid #2e2333;
  box-shadow: inset 0 1px #ffe9a0, inset 0 -1px #a97220;
}
</style>
