type SoundKey = 'dice-roll' | 'checker-place' | 'hit' | 'win' | 'lose';

const SOUND_FILES: Record<SoundKey, string> = {
  'dice-roll': '/sounds/dice-roll.mp3',
  'checker-place': '/sounds/checker-place.mp3',
  hit: '/sounds/hit.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
};

let audioCtx: AudioContext | null = null;
let enabled = true;
const buffers = new Map<SoundKey, AudioBuffer>();

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

async function loadBuffer(key: SoundKey): Promise<void> {
  try {
    const ctx = getAudioContext();
    const response = await fetch(SOUND_FILES[key]);
    if (!response.ok) {
      return;
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    buffers.set(key, audioBuffer);
  } catch {
    // Graceful fallback — missing sound files are silently ignored
  }
}

export const SoundService = {
  preload(): void {
    const keys = Object.keys(SOUND_FILES) as SoundKey[];
    for (const key of keys) {
      void loadBuffer(key);
    }
  },

  play(key: SoundKey): void {
    if (!enabled) {
      return;
    }
    const buffer = buffers.get(key);
    if (!buffer) {
      return;
    }
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Silently ignore playback errors (e.g. browser policy blocks)
    }
  },

  setEnabled(value: boolean): void {
    enabled = value;
  },
};
