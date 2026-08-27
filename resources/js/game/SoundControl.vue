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
      <span class="volume-notches" aria-hidden="true">
        <i v-for="step in 7" :key="step"></i>
      </span>
      <input
        class="volume-slider"
        type="range"
        min="0"
        max="6"
        step="1"
        :value="volumeStep"
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
    const volumeStep = computed(() => Math.round(volume.value * 6));

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
    const changeVolume = (event) => setVolume(Number(event.target.value) / 6);

    watch(iconState, drawIcon);
    onMounted(() => {
      drawIcon();
      document.addEventListener('pointerdown', closeOutside);
    });
    onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside));

    return { root, iconCanvas, open, volumeStep, changeVolume };
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
 * on the top inner edge and P.ironDark shadow on the bottom.
 */
.sound-button {
  position: relative;
  width: 38px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2b2f3d;
  border: 2px solid #2e2333;
  box-shadow: inset 0 2px #6b7183, inset 0 -2px #454a5c;
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
  top: 32px;
  right: 0;
  width: 38px;
  height: 116px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 3px;
  box-sizing: border-box;
  background: #2b2f3d;
  border: 2px solid #2e2333;
  box-shadow: inset 0 2px #6b7183, inset 0 -2px #454a5c;
}

.volume-notches {
  position: absolute;
  inset: 10px 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.volume-notches i {
  display: block;
  width: 22px;
  height: 2px;
  background: #454a5c;
  box-shadow: inset 2px 0 #6b7183, inset -2px 0 #2e2333;
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
  height: 96px;
  margin: 0;
  writing-mode: vertical-lr;
  direction: rtl;
  cursor: pointer;
  background: transparent;
  position: relative;
  z-index: 1;
}

.volume-slider::-webkit-slider-runnable-track {
  width: 8px;
  height: 100%;
  background: #402615;
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
  background: #402615;
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
