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
  'tacks',
  'mop',
  'lunch',
  'smash',
  'roll',
  'cash',
  'key1',
  'key2',
  'key3',
  'keyspace',
  'cry',
  'gate',
  'projector',
] as const;
export type SoundName = (typeof SOUNDS)[number];

/** Minimum seconds between two plays of the same sound, so a busy floor does not become noise. */
const THROTTLE: Partial<Record<SoundName, number>> = {
  gate: 0.12,
  shot: 0.06,
  hit: 0.05,
  kill: 0.05,
  coffee: 0.15,
  leak: 0.12,
  split: 0.1,
  pulse: 0.2,
  staple: 0.08,
  tacks: 0.12,
  mop: 0.4,
  smash: 0.15,
  roll: 0.3,
  cash: 0.12,
  cry: 1.0,
};

const GAIN: Partial<Record<SoundName, number>> = {
  gate: 0.22,
  shot: 0.28,
  hit: 0.3,
  kill: 0.45,
  coffee: 0.5,
  leak: 0.8,
  wave: 0.6,
  boss: 0.8,
  pulse: 0.35,
  staple: 0.5,
  tacks: 0.3,
  mop: 0.7,
  lunch: 0.7,
  smash: 0.8,
  roll: 0.5,
  cash: 0.6,
  place: 0.8,
  cry: 0.6,
};

/** Keys someone types on in the background; the space bar comes between words. */
const KEYS: readonly SoundName[] = ['key1', 'key2', 'key3'];

/** Keys per second for the typing in the background: 4 when calm, 14 with no Focus left. */
export function typingRate(stress: number): number {
  return 4 + Math.max(0, Math.min(1, stress)) * 10;
}

/** How loud one key is: barely there when calm, clearly there when it is going wrong. */
export function typingGain(stress: number): number {
  return 0.05 + Math.max(0, Math.min(1, stress)) * 0.2;
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private last = new Map<SoundName, number>();
  private volume = 0.8;
  private sfxVolume = 0.8;
  private ambienceVolume = 0.5;
  private loading: Promise<void> | null = null;
  // Somebody typing at the next desk: calm when all is well, frantic when your Focus runs low.
  private ambience: GainNode | null = null;
  private typingOn = false;
  private stress = 0;
  private nextKey = 0;
  private wordLeft = 0;
  private typingTimer: number | null = null;

  constructor() {
    const unlock = () => {
      this.ensure();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  setVolume(master: number, sfx: number, ambience = this.ambienceVolume): void {
    this.volume = master;
    this.sfxVolume = sfx;
    this.ambienceVolume = ambience;
    if (this.master) this.master.gain.value = master * sfx;
    if (this.ambience) this.ambience.gain.value = master * ambience;
  }

  /**
   * The typing in the background. stress 0 = full Focus (a few calm words, with pauses to think),
   * 1 = no Focus left (fast and loud, no pauses at all). Off in menus and while paused.
   */
  setTyping(on: boolean, stress: number): void {
    this.stress = Math.max(0, Math.min(1, stress));
    if (on === this.typingOn) return;
    this.typingOn = on;
    if (on && this.typingTimer === null) {
      this.typingTimer = window.setInterval(() => this.scheduleTyping(), 40);
    } else if (!on && this.typingTimer !== null) {
      window.clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
  }

  private scheduleTyping(): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambience || !this.typingOn || this.volume * this.ambienceVolume <= 0) return;
    const now = ctx.currentTime;
    if (this.nextKey < now) this.nextKey = now + 0.05;
    // Plan a little ahead so the timer's jitter does not show.
    while (this.nextKey < now + 0.2) {
      const s = this.stress;
      const space = this.wordLeft <= 0;
      this.playKey(space ? 'keyspace' : KEYS[Math.floor(Math.random() * KEYS.length)], this.nextKey, s);
      if (space) {
        this.wordLeft = 2 + Math.floor(Math.random() * 6);
        // Between words: a breath when calm, nothing when in a hurry. Now and then a proper pause to think.
        let pause = (0.12 + Math.random() * 0.35) * (1 - s);
        if (Math.random() < 0.12 * (1 - s)) pause += 1.5 + Math.random() * 2.5;
        this.nextKey += 0.06 + pause;
      } else {
        this.wordLeft--;
        this.nextKey += (1 / typingRate(s)) * (0.65 + Math.random() * 0.7);
      }
    }
  }

  private playKey(name: SoundName, at: number, s: number): void {
    const ctx = this.ctx!;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.9 + Math.random() * 0.25;
    const g = ctx.createGain();
    // Barely there when calm; clearly there when it is going wrong.
    g.gain.value = typingGain(s) * (0.7 + Math.random() * 0.6);
    src.connect(g).connect(this.ambience!);
    src.start(at);
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
      this.ambience = this.ctx.createGain();
      this.ambience.gain.value = this.volume * this.ambienceVolume;
      this.ambience.connect(this.ctx.destination);
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
