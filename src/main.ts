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
import { MpClient, type RoomInfo, type ServerMsg } from './net/mp';
import { Assets } from './render/assets';
import { View } from './render/view';
import { Session } from './session';
import { lobbyScreen, mpMenu } from './ui/lobby';
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
  private mp: MpClient | null = null;
  private mpOff: (() => void) | null = null;
  private lobbyMessage = '';

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
    requestAnimationFrame((t) => this.loop(t));
    // A link from a colleague: game.makkers.net/?join=ABCDE
    const code = new URLSearchParams(location.search).get('join');
    if (code && /^[A-Za-z0-9]{5}$/.test(code)) {
      history.replaceState(null, '', location.pathname);
      this.together(code.toUpperCase());
      return;
    }
    this.menu();
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

  private startSession(levelId: number, attract: boolean, room: RoomInfo | null = null): void {
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
        toLobby: () => this.lobby(),
        leaveMp: () => this.leaveMp(),
        applySettings: () => {
          store(this.save);
          this.applySettings();
        },
      },
      levelId,
      { attract, mp: room && this.mp ? { client: this.mp, room } : undefined },
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
          together: () => this.together(''),
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

  // ------------------------------------------------------------------ multiplayer

  /** The multiplayer menu: host a game, or join one with a code. */
  together(code: string): void {
    this.demo();
    const menu = mpMenu(this.save.mpName, code, {
      host: (name) => this.connectThen(name, menu.status, (c) => c.create(this.save.mpName, {})),
      join: (name, c) => {
        if (!/^[A-Z0-9]{5}$/.test(c)) return menu.status(T.mpCode + ': 5 letters or digits.');
        this.connectThen(name, menu.status, (cl) => cl.join(c, this.save.mpName));
      },
      back: () => this.menu(),
    });
    this.show(menu.el);
  }

  private async connectThen(name: string, status: (msg: string, bad?: boolean) => void, then: (c: MpClient) => void): Promise<void> {
    this.save.mpName = name.slice(0, 20);
    store(this.save);
    if (!this.mp) {
      const client = new MpClient();
      this.mp = client;
      this.mpOff = client.on((m) => this.onMp(m));
      client.onStatus = (s) => {
        if (s === 'lost') status(T.mpLost);
      };
      status(T.mpConnecting, false);
      try {
        await client.connect();
      } catch {
        status(T.mpNoServer);
        this.mpOff?.();
        this.mp = null;
        return;
      }
    }
    this.errorTarget = status;
    then(this.mp);
  }

  private errorTarget: ((msg: string, bad?: boolean) => void) | null = null;

  private onMp(m: ServerMsg): void {
    switch (m.t) {
      case 'joined':
        this.lobbyMessage = '';
        if (m.room.phase === 'game') this.startSession(m.room.settings.level, false, m.room);
        else this.lobby();
        break;
      case 'room': {
        const inGame = this.session !== null && !this.session.attract;
        if (m.room.phase === 'game' && !inGame) {
          this.show(null);
          this.startSession(m.room.settings.level, false, m.room);
        } else if (m.room.phase === 'lobby' && !inGame) {
          this.lobby();
        }
        break;
      }
      case 'error':
        this.errorTarget?.(m.reason);
        if (this.mp && !this.mp.room) {
          // Never got in: forget the socket so the next try starts clean.
          this.mpOff?.();
          this.mp.close();
          this.mp = null;
        }
        break;
      case 'refused':
        if (!this.session || this.session.attract) {
          this.lobbyMessage = m.reason;
          if (this.mp?.room?.phase === 'lobby') this.lobby();
        }
        break;
      default:
        break;
    }
  }

  lobby(): void {
    const client = this.mp;
    if (!client?.room) return this.menu();
    this.demo();
    this.show(
      lobbyScreen(client.room, client.you, {
        settings: (patch) => client.settings(patch),
        start: () => client.send({ t: 'start' }),
        leave: () => this.leaveMp(),
      }, this.lobbyMessage),
    );
    this.lobbyMessage = '';
  }

  private leaveMp(): void {
    this.mpOff?.();
    this.mpOff = null;
    this.mp?.close();
    this.mp = null;
    this.menu();
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
