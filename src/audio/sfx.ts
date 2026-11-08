// Sound effects through WebAudio. The WAVs in public/sfx are made with the sfx MCP server
// (see art/SOUND.md). Browsers only allow audio after a click, so the context starts on the
// first pointer or key press.

export const SOUNDS = [
  'shot',
  'hit',
  'kill',
  'leak',
  'coffee',
  'place',
  'upgrade',
  'sell',
  'deny',
  'wave',
  'boss',
  'bossphase',
  'click',
  'win',
  'lose',
  'split',
  'pulse',
  'staple',
] as const;
export type SoundName = (typeof SOUNDS)[number];

/** Minimum seconds between two plays of the same sound, so a busy floor does not become noise. */
const THROTTLE: Partial<Record<SoundName, number>> = {
  shot: 0.06,
  hit: 0.05,
  kill: 0.05,
  coffee: 0.15,
  leak: 0.12,
  split: 0.1,
  pulse: 0.2,
  staple: 0.08,
};

const GAIN: Partial<Record<SoundName, number>> = {
  shot: 0.28,
  hit: 0.3,
  kill: 0.45,
  coffee: 0.5,
  leak: 0.8,
  wave: 0.6,
  boss: 0.8,
  pulse: 0.35,
  staple: 0.5,
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private last = new Map<SoundName, number>();
  private volume = 0.8;
  private sfxVolume = 0.8;
  private loading: Promise<void> | null = null;

  constructor() {
    const unlock = () => {
      this.ensure();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  setVolume(master: number, sfx: number): void {
    this.volume = master;
    this.sfxVolume = sfx;
    if (this.master) this.master.gain.value = master * sfx;
  }

  private ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * this.sfxVolume;
      this.master.connect(this.ctx.destination);
      this.loading = this.loadAll();
    } catch {
      this.ctx = null;
    }
  }

  private async loadAll(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all(
      SOUNDS.map(async (name) => {
        try {
          const res = await fetch(`sfx/${name}.wav`);
          if (!res.ok) return;
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(name, buf);
        } catch {
          // A missing sound is not worth breaking the game over.
        }
      }),
    );
  }

  play(name: SoundName, opts: { pitch?: number; gain?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.volume * this.sfxVolume <= 0) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const now = ctx.currentTime;
    const gap = THROTTLE[name] ?? 0.03;
    if (now - (this.last.get(name) ?? -1) < gap) return;
    this.last.set(name, now);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.pitch ?? 1) * (0.94 + Math.random() * 0.12);
    const g = ctx.createGain();
    g.gain.value = (GAIN[name] ?? 0.6) * (opts.gain ?? 1);
    src.connect(g).connect(this.master);
    src.start();
  }

  get ready(): Promise<void> {
    return this.loading ?? Promise.resolve();
  }
}
