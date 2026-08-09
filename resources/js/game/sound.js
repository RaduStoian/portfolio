import { reactive } from 'vue';

const savedVolume = Number.parseFloat(localStorage.getItem('portfolio-volume'));
export const soundState = reactive({
    volume: Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.5,
    rain: false,
    lofi: false,
});

const rain = new Audio('/audio/rain.mp3');
rain.loop = true;
rain.preload = 'auto';

const purr = new Audio('/audio/cat-purr.mp3');
purr.loop = true;
purr.preload = 'auto';

let purrTimer = null;
let audioContext = null;
let lofiMaster = null;
let lofiTimer = null;
let chordIndex = 0;

function syncVolume() {
    rain.volume = soundState.volume * 0.72;
    purr.volume = soundState.volume * 0.8;
    if (lofiMaster && audioContext) {
        lofiMaster.gain.setTargetAtTime(soundState.volume * 0.42, audioContext.currentTime, 0.04);
    }
}

export function setVolume(value) {
    soundState.volume = Math.max(0, Math.min(1, Number(value)));
    localStorage.setItem('portfolio-volume', String(soundState.volume));
    syncVolume();
}

export function setRain(active) {
    soundState.rain = active;
    syncVolume();
    if (active) rain.play().catch(() => {});
    else rain.pause();
}

export function playPurr(duration = 4200) {
    clearTimeout(purrTimer);
    purr.currentTime = 0;
    syncVolume();
    purr.play().catch(() => {});
    purrTimer = setTimeout(() => {
        purr.pause();
        purr.currentTime = 0;
    }, duration);
}

function ensureLofi() {
    if (audioContext) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
    lofiMaster = audioContext.createGain();
    lofiMaster.gain.value = soundState.volume * 0.42;

    // Rolled-off highs are most of the lo-fi character, and keep a generated
    // loop gentle enough to live under the rest of the site.
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1700;
    filter.Q.value = 0.7;
    lofiMaster.connect(filter);
    filter.connect(audioContext.destination);
}

const CHORDS = [
    [130.81, 164.81, 196.00, 246.94], // Cmaj7
    [110.00, 130.81, 164.81, 196.00], // Am7
    [87.31, 110.00, 130.81, 164.81],  // Fmaj7
    [98.00, 123.47, 146.83, 196.00],  // G6
];

function playLofiBar() {
    if (!soundState.lofi || !audioContext) return;
    const now = audioContext.currentTime;
    const chord = CHORDS[chordIndex++ % CHORDS.length];

    chord.forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = i % 2 ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency * (i === 3 ? 2 : 1);
        oscillator.detune.value = (i - 1.5) * 3;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.075, now + 0.08 + i * 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.72);
        oscillator.connect(gain);
        gain.connect(lofiMaster);
        oscillator.start(now);
        oscillator.stop(now + 1.8);
    });

    // A soft kick on beats one and three.
    for (const delay of [0, 0.9]) {
        const kick = audioContext.createOscillator();
        const gain = audioContext.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(90, now + delay);
        kick.frequency.exponentialRampToValueAtTime(42, now + delay + 0.16);
        gain.gain.setValueAtTime(0.11, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
        kick.connect(gain);
        gain.connect(lofiMaster);
        kick.start(now + delay);
        kick.stop(now + delay + 0.22);
    }
}

export function toggleLofi() {
    ensureLofi();
    if (soundState.lofi) {
        soundState.lofi = false;
        clearInterval(lofiTimer);
        lofiTimer = null;
    } else {
        soundState.lofi = true;
        audioContext.resume().catch(() => {});
        playLofiBar();
        lofiTimer = setInterval(playLofiBar, 1800);
    }
    return soundState.lofi;
}

syncVolume();
