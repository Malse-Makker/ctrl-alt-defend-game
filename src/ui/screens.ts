// Menu screens: main menu, career (level select), settings, what's new, how it works, pause.

import changelog from '../../CHANGELOG.md?raw';
import { LEVELS, LEVEL_NAMES } from '../sim/data/levels';
import type { SaveData } from '../meta/save';
import { BUILD_LABEL } from '../version';
import { h, icon } from './dom';
import { UI_TEXT as T } from './text';

const REPO_URL = 'https://github.com/Malse-Makker/ctrl-alt-defend-game';

function titleEl(): HTMLElement {
  // CTRL-ALT-DEFEND with the first three words drawn as keyboard keys.
  return h('h1', { class: 'title' }, h('span', { class: 'key', text: 'CTRL' }), '-', h('span', { class: 'key', text: 'ALT' }), '-DEFEND');
}

function footer(): HTMLElement {
  return h(
    'div',
    { class: 'footer' },
    h('span', { class: 'mono', text: BUILD_LABEL }),
    h('a', { text: T.footerProjects, attrs: { href: 'https://projecten.makkers.net', target: '_blank', rel: 'noopener' } }),
    h('a', { text: T.footerSource, attrs: { href: REPO_URL, target: '_blank', rel: 'noopener' } }),
  );
}

export function loadingScreen(): { el: HTMLElement; progress(p: number): void; fail(msg: string): void } {
  const fill = h('div');
  const msg = h('div', { class: 'muted', text: T.loading });
  const el = h('div', { class: 'screen' }, h('div', { class: 'screen-card panel' }, titleEl(), msg, h('div', { class: 'loading-bar' }, fill)));
  return {
    el,
    progress: (p) => (fill.style.width = `${Math.round(p * 100)}%`),
    fail: (m) => {
      msg.textContent = m;
      msg.className = 'status bad';
    },
  };
}

export interface MenuActions {
  play(): void;
  together(): void;
  whatsNew(): void;
  settings(): void;
  howTo(): void;
}

export function mainMenu(act: MenuActions, hasNews: boolean): HTMLElement {
  const news = h('button', { class: 'btn', on: { click: act.whatsNew } }, icon('newspaper'), h('span', { text: T.whatsNew }));
  if (hasNews) news.append(h('span', { class: 'badge', text: T.newBadge }));
  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-card panel' },
      titleEl(),
      h('p', { class: 'subtitle', text: `"${T.subtitle}"` }),
      h('p', { class: 'muted', attrs: { style: 'margin:0' }, text: T.tagline }),
      h(
        'div',
        { class: 'menu-buttons' },
        h('button', { class: 'btn primary', on: { click: act.play } }, icon('id-badge'), h('span', { text: T.play })),
        h('button', { class: 'btn', on: { click: act.together } }, icon('people-group'), h('span', { text: T.mpTitle })),
        h('button', { class: 'btn', on: { click: act.howTo } }, icon('circle-question'), h('span', { text: T.howTo })),
        news,
        h('button', { class: 'btn', on: { click: act.settings } }, icon('sliders'), h('span', { text: T.settings })),
      ),
      footer(),
    ),
  );
}

export function careerScreen(save: SaveData, play: (id: number) => void, back: () => void): HTMLElement {
  const blocks = [
    { key: 'junior', from: 1 },
    { key: 'medior', from: 6 },
    { key: 'senior', from: 11 },
  ];
  const wrap = h('div', { class: 'career' });
  for (const b of blocks) {
    const grid = h('div', { class: 'career-block' });
    for (let id = b.from; id < b.from + 5; id++) {
      const level = LEVELS[id];
      const stars = save.stars[String(id)] ?? 0;
      // A level opens once the one before it is done (any stars), so towers arrive one by one.
      const open = level !== undefined && (id === 1 || (save.stars[String(id - 1)] ?? 0) > 0);
      const card = h(
        'button',
        { class: 'level-card', disabled: !open, on: { click: () => open && play(id) } },
        h('span', { class: 'num', text: `Level ${id}` }),
        h('span', { class: 'name', text: LEVEL_NAMES[id - 1] }),
      );
      if (level && open) {
        const st = h('span', { class: 'stars', attrs: { 'aria-label': `${stars} of 3 stars` } });
        for (let i = 1; i <= 3; i++) st.append(icon('star', i <= stars ? '' : 'faint'));
        card.append(st);
        card.title = level.gimmick;
      } else if (level) {
        card.append(h('span', { class: 'faint', attrs: { style: 'font-size:12px' } }, icon('lock'), ` ${T.levelLocked}`));
      } else {
        card.append(h('span', { class: 'faint', attrs: { style: 'font-size:12px' }, text: T.inTheWorks }));
      }
      grid.append(card);
    }
    wrap.append(h('div', { class: 'label', text: T.blocks[b.key] }), grid);
  }
  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-card wide panel' },
      h('div', { class: 'section-head' }, h('h2', { attrs: { style: 'margin:0' }, text: T.levelSelect }), h('span', { class: 'muted' }, icon('award'), ` ${T.recognition}: ${save.recognition}`)),
      wrap,
      h('div', {}, h('button', { class: 'btn', on: { click: back } }, icon('arrow-left'), h('span', { text: T.back }))),
    ),
  );
}

export interface SettingsActions {
  change(): void;
  /** Leave out to hide the reset button (in the middle of a game). */
  reset?(): void;
  back(): void;
}

export function settingsScreen(save: SaveData, act: SettingsActions): HTMLElement {
  return h('div', { class: 'screen' }, settingsCard(save, act, 'screen-card panel'));
}

/** The same settings as a card over the running game. Offline the game waits while it is open. */
export function settingsOverlay(save: SaveData, act: SettingsActions): HTMLElement {
  return h('div', { class: 'overlay' }, settingsCard(save, act, 'card panel settings-card'));
}

function settingsCard(save: SaveData, act: SettingsActions, cls: string): HTMLElement {
  const st = save.settings;
  const slider = (label: string, value: number, set: (v: number) => void) => {
    const input = h('input', { type: 'range', attrs: { min: '0', max: '1', step: '0.05', 'aria-label': label } });
    input.value = String(value);
    input.addEventListener('input', () => {
      set(Number(input.value));
      act.change();
    });
    return h('div', { class: 'setting-row' }, h('span', { text: label }), input);
  };
  const check = (label: string, value: boolean, set: (v: boolean) => void, help?: string) => {
    const input = h('input', { type: 'checkbox' });
    input.checked = value;
    input.addEventListener('change', () => {
      set(input.checked);
      act.change();
    });
    const row = h('label', { class: 'setting-row' }, h('span', { text: label }), input);
    return help ? h('div', {}, row, h('div', { class: 'faint', attrs: { style: 'font-size:12px' }, text: help })) : row;
  };
  const status = h('div', { class: 'status ok' });
  let reset: HTMLElement | null = null;
  if (act.reset) {
    const doReset = act.reset;
    reset = h('button', { class: 'btn danger small' }, icon('trash'), h('span', { text: ` ${T.settingsReset}` }));
    reset.addEventListener('click', () => {
      if (window.confirm(T.settingsResetConfirm)) {
        doReset();
        status.textContent = T.settingsResetDone;
      }
    });
  }
  return h(
    'div',
    { class: cls },
    h('h2', { attrs: { style: 'margin:0' }, text: T.settings }),
    slider(T.settingsVolume, st.volume, (v) => (st.volume = v)),
    slider(T.settingsSfx, st.sfx, (v) => (st.sfx = v)),
    check(T.settingsDamageNumbers, st.damageNumbers, (v) => (st.damageNumbers = v)),
    check(T.settingsShareStats, st.shareStats, (v) => (st.shareStats = v), T.settingsShareStatsHelp),
    reset ? h('div', { class: 'row-buttons' }, reset) : null,
    status,
    h('div', {}, h('button', { class: 'btn', on: { click: act.back } }, icon('arrow-left'), h('span', { text: T.back }))),
  );
}

/** Render CHANGELOG.md (headings and bullets only) without innerHTML. */
export function changelogView(): HTMLElement {
  const root = h('div', { class: 'changelog' });
  let list: HTMLUListElement | null = null;
  for (const raw of changelog.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) {
      list = null;
      root.append(h('h2', { text: line.slice(3).replace(/[[\]]/g, '') }));
    } else if (line.startsWith('### ')) {
      list = null;
      root.append(h('h3', { text: line.slice(4) }));
    } else if (/^\s*- /.test(line)) {
      if (!list) {
        list = h('ul');
        root.append(list);
      }
      list.append(h('li', { text: line.replace(/^\s*- /, '').replace(/\*\*/g, '').replace(/`/g, '') }));
    }
  }
  return root;
}

export function textScreen(title: string, body: HTMLElement, back: () => void): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-card wide panel' },
      h('h2', { attrs: { style: 'margin:0' }, text: title }),
      body,
      h('div', {}, h('button', { class: 'btn', on: { click: back } }, icon('arrow-left'), h('span', { text: T.back }))),
    ),
  );
}

export function howToBody(): HTMLElement {
  return h('ul', { attrs: { style: 'margin:0; padding-left: 20px; display:flex; flex-direction:column; gap:8px' } }, ...T.howToLines.map((l) => h('li', { class: 'wrap', text: l })));
}

export interface PauseActions {
  resume(): void;
  settings(): void;
  howTo(): void;
  giveUp(): void;
  quit(): void;
}

export function pauseOverlay(act: PauseActions, mode: { online: boolean; host: boolean } = { online: false, host: true }): HTMLElement {
  return h(
    'div',
    { class: 'overlay' },
    h(
      'div',
      { class: 'card panel' },
      h('h2', { text: (mode.online ? T.menu : T.pause).toUpperCase() }),
      mode.online ? h('div', { class: 'muted', text: T.mpMenuNote }) : null,
      h(
        'div',
        { class: 'menu-buttons' },
        h('button', { class: 'btn primary', on: { click: act.resume } }, icon('play'), h('span', { text: mode.online ? T.back : T.resume })),
        h('button', { class: 'btn', on: { click: act.settings } }, icon('sliders'), h('span', { text: T.settings })),
        h('button', { class: 'btn', on: { click: act.howTo } }, icon('circle-question'), h('span', { text: T.howTo })),
        mode.host ? h('button', { class: 'btn danger', on: { click: act.giveUp } }, icon('flag'), h('span', { text: mode.online ? T.mpGiveUp : T.giveUp })) : null,
        h('button', { class: 'btn', on: { click: act.quit } }, icon('arrow-left'), h('span', { text: mode.online ? T.mpLeave : T.quitToCareer })),
      ),
    ),
  );
}

/** Multiplayer end screen: swap Retry and Career for Back to lobby (host) and Leave. */
export function mpEndActions(screen: HTMLElement, isHost: boolean, act: { lobby(): void; leave(): void }): void {
  const rows = screen.querySelectorAll('.row-buttons');
  const last = rows[rows.length - 1];
  if (!last) return;
  last.replaceChildren(
    isHost ? h('button', { class: 'btn primary', on: { click: act.lobby } }, icon('people-group'), h('span', { text: ` ${T.mpBackToLobby}` })) : h('span', { class: 'muted', text: T.mpWaitHost }),
    h('button', { class: 'btn', on: { click: act.leave } }, icon('arrow-left'), h('span', { text: ` ${T.mpLeave}` })),
  );
}

export function confirmOverlay(text: string, yes: string, no: string, onYes: () => void, onNo: () => void): HTMLElement {
  return h(
    'div',
    { class: 'overlay' },
    h(
      'div',
      { class: 'card panel' },
      h('div', { class: 'wrap', text }),
      h('div', { class: 'row-buttons' }, h('button', { class: 'btn danger', text: yes, on: { click: onYes } }), h('button', { class: 'btn', text: no, on: { click: onNo } })),
    ),
  );
}
