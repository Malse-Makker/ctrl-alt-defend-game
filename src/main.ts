// Boot: load the models, show the main menu with a live demo floor behind it, and switch between
// screens. One requestAnimationFrame loop drives whatever is on screen.

import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './ui/style.css';

import { Sfx } from './audio/sfx';
import { defaults, load, store, type SaveData } from './meta/save';
import { Assets } from './render/assets';
import { View } from './render/view';
import { Session } from './session';
import { careerScreen, changelogView, howToBody, loadingScreen, mainMenu, settingsScreen, textScreen } from './ui/screens';
import { UI_TEXT as T } from './ui/text';
import { VERSION } from './version';

class App {
  private readonly view: View;
  private readonly assets = new Assets();
  private readonly sfx = new Sfx();
  private save: SaveData = load();
  private readonly ui = document.getElementById('ui')!;
  private readonly popupLayer = document.getElementById('popups')!;
  private session: Session | null = null;
  private screen: HTMLElement | null = null;
  private last = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.view = new View(canvas);
    this.applySettings();
    const resize = () => this.view.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', resize);
    resize();
  }

  async boot(): Promise<void> {
    const loading = loadingScreen();
    this.show(loading.el);
    await this.assets.load((d, t) => loading.progress(d / t));
    if (this.assets.failed.length > 0) console.warn('Missing models:', this.assets.failed);
    this.menu();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(t: number): void {
    const dt = Math.max(0, (t - this.last) / 1000);
    this.last = t;
    this.session?.frame(dt);
    this.view.render();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  private show(el: HTMLElement | null): void {
    this.screen?.remove();
    this.screen = el;
    if (el) this.ui.append(el);
  }

  private startSession(levelId: number, attract: boolean): void {
    this.session?.dispose();
    this.session = new Session(
      {
        view: this.view,
        assets: this.assets,
        sfx: this.sfx,
        save: this.save,
        ui: this.ui,
        popupLayer: this.popupLayer,
        toCareer: () => this.career(),
        retry: (id) => (attract ? this.startSession(id, true) : this.play(id)),
      },
      levelId,
      attract,
    );
    // Screens sit on top of the demo floor.
    if (this.screen) this.ui.append(this.screen);
  }

  private demo(): void {
    if (!this.session?.attract) this.startSession(1, true);
  }

  menu(): void {
    this.demo();
    this.show(
      mainMenu(
        {
          play: () => this.career(),
          whatsNew: () => {
            this.save.lastSeenVersion = VERSION;
            store(this.save);
            this.show(textScreen(T.whatsNew, changelogView(), () => this.menu()));
          },
          settings: () => this.settings(),
          howTo: () => this.show(textScreen(T.howTo, howToBody(), () => this.menu())),
        },
        this.save.lastSeenVersion !== VERSION,
      ),
    );
  }

  career(): void {
    this.demo();
    this.show(careerScreen(this.save, (id) => this.play(id), () => this.menu()));
  }

  settings(): void {
    this.show(
      settingsScreen(this.save, {
        change: () => {
          store(this.save);
          this.applySettings();
        },
        reset: () => {
          const fresh = defaults();
          fresh.settings = this.save.settings;
          fresh.playerId = this.save.playerId;
          Object.assign(this.save, fresh);
          store(this.save);
        },
        back: () => this.menu(),
      }),
    );
  }

  play(levelId: number): void {
    this.show(null);
    this.startSession(levelId, false);
  }

  private applySettings(): void {
    this.sfx.setVolume(this.save.settings.volume, this.save.settings.sfx);
  }
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const canvas = document.getElementById('view') as HTMLCanvasElement;
if (!webglAvailable()) {
  const ui = document.getElementById('ui')!;
  const box = document.createElement('div');
  box.className = 'screen';
  const card = document.createElement('div');
  card.className = 'screen-card panel';
  card.textContent = T.noWebgl;
  box.append(card);
  ui.append(box);
} else {
  const app = new App(canvas);
  app.boot().catch((err) => {
    console.error(err);
    const ui = document.getElementById('ui')!;
    const box = document.createElement('div');
    box.className = 'screen';
    const card = document.createElement('div');
    card.className = 'screen-card panel';
    card.textContent = T.loadFailed;
    box.append(card);
    ui.replaceChildren(box);
  });
  // Handy in the browser console while testing.
  (window as unknown as { cad: App }).cad = app;
}
