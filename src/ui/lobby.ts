// Multiplayer screens: the menu (host or join with a code) and the lobby where the host picks the
// settings and puts players in their part of the office.

import type { RoomInfo, RoomSettings } from '../net/mp';
import { LEVELS, LEVEL_NAMES } from '../sim/data/levels';
import { ZONE_COLORS, ZONE_LABELS, ZONE_MODES, ZONE_NAMES, zoneCount, type ZoneMode } from '../sim/zones';
import { h, icon } from './dom';
import { UI_TEXT as T } from './text';

export interface MpMenuActions {
  host(name: string): void;
  join(name: string, code: string): void;
  back(): void;
}

export function mpMenu(name: string, code: string, act: MpMenuActions): { el: HTMLElement; status(msg: string, bad?: boolean): void } {
  const nameInput = h('input', { type: 'text', attrs: { maxlength: '20', id: 'mp-name', autocomplete: 'nickname', placeholder: 'Sam' } });
  nameInput.value = name;
  const codeInput = h('input', { type: 'text', attrs: { maxlength: '5', id: 'mp-code', autocomplete: 'off', placeholder: 'ABCDE', spellcheck: 'false' } });
  codeInput.value = code;
  codeInput.classList.add('code-input');
  codeInput.addEventListener('input', () => (codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '')));
  const status = h('div', { class: 'status', attrs: { role: 'status', 'aria-live': 'polite' } });
  const hostBtn = h('button', { class: 'btn primary', on: { click: () => act.host(nameInput.value.trim()) } }, icon('door-open'), h('span', { text: T.mpHost }));
  const joinBtn = h('button', { class: 'btn', on: { click: () => act.join(nameInput.value.trim(), codeInput.value.trim()) } }, icon('right-to-bracket'), h('span', { text: T.mpJoinGo }));
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-card panel' },
      h('h2', { attrs: { style: 'margin:0' }, text: T.mpTitle }),
      h('div', { class: 'field' }, h('label', { text: T.mpYourName, attrs: { for: 'mp-name' } }), nameInput),
      h('div', { class: 'label', text: T.mpHost }),
      h('div', { class: 'row-buttons' }, hostBtn),
      h('div', { class: 'label', text: T.mpJoin }),
      h('div', { class: 'join-row' }, h('div', { class: 'field' }, h('label', { text: T.mpCode, attrs: { for: 'mp-code' } }), codeInput), joinBtn),
      status,
      h('div', {}, h('button', { class: 'btn', on: { click: act.back } }, icon('arrow-left'), h('span', { text: T.back }))),
    ),
  );
  if (code) requestAnimationFrame(() => (name ? joinBtn.focus() : nameInput.focus()));
  return {
    el,
    status: (msg, bad = true) => {
      status.textContent = msg;
      status.className = `status ${bad ? 'bad' : 'ok'}`;
    },
  };
}

export interface LobbyActions {
  settings(patch: Partial<RoomSettings>): void;
  start(): void;
  leave(): void;
}

export function lobbyScreen(room: RoomInfo, you: number, act: LobbyActions, message = ''): HTMLElement {
  const isHost = room.host === you;
  const st = room.settings;
  const link = `${location.origin}${location.pathname}?join=${room.code}`;
  const copied = h('span', { class: 'status ok' });
  const copy = h('button', { class: 'btn small' }, icon('link'), h('span', { text: ` ${T.mpCopyLink}` }));
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      copied.textContent = T.mpCopied;
    } catch {
      copied.textContent = link;
    }
  });

  const zones = zoneCount(st.zoneMode, room.players.length);
  const names = ZONE_NAMES[st.zoneMode];
  const assignable = isHost && (st.zoneMode === 'topbottom' || st.zoneMode === 'leftright' || st.zoneMode === 'quarters');
  const players = h(
    'div',
    { class: 'lobby-players' },
    ...room.players.map((p) => {
      const name = h('span', { class: 'name wrap', text: p.name });
      if (p.index === room.host) name.prepend(icon('crown', 'host-crown'), ' ');
      if (p.index === you) name.append(h('span', { class: 'faint', text: ' (you)' }));
      const z = st.assign[p.index] ?? 0;
      let zoneEl: HTMLElement;
      if (st.zoneMode === 'anywhere') {
        zoneEl = h('span', { class: 'faint', text: ZONE_NAMES.anywhere[0] });
      } else if (assignable) {
        const sel = h('select', { attrs: { 'aria-label': `${T.mpZoneOf} (${p.name})` } });
        for (let i = 0; i < zones; i++) {
          const o = h('option', { text: names[i] });
          o.value = String(i);
          if (i === z) o.selected = true;
          sel.append(o);
        }
        sel.addEventListener('change', () => {
          const assign = [...st.assign];
          assign[p.index] = Number(sel.value);
          act.settings({ assign });
        });
        zoneEl = sel;
      } else {
        zoneEl = h('span', { class: 'zone-chip', attrs: { style: `border-color:${ZONE_COLORS[z % ZONE_COLORS.length]}` }, text: names[z] ?? '' });
      }
      return h('div', { class: `lobby-player${p.connected ? '' : ' offline'}` }, h('span', { class: 'dot', attrs: { style: `background:${p.color}` } }), name, zoneEl);
    }),
  );

  const select = <V extends string | number>(label: string, value: V, options: [V, string][], onChange: (v: V) => void) => {
    if (!isHost) return h('div', { class: 'setting-row' }, h('span', { text: label }), h('span', { class: 'muted', text: options.find((o) => o[0] === value)?.[1] ?? String(value) }));
    const sel = h('select', { attrs: { 'aria-label': label } });
    for (const [v, text] of options) {
      const o = h('option', { text });
      o.value = String(v);
      if (v === value) o.selected = true;
      sel.append(o);
    }
    sel.addEventListener('change', () => onChange((typeof value === 'number' ? Number(sel.value) : sel.value) as V));
    return h('div', { class: 'setting-row' }, h('span', { text: label }), sel);
  };

  const levels = Object.keys(LEVELS).map((id) => [Number(id), `${id}. ${LEVEL_NAMES[Number(id) - 1]}`] as [number, string]);
  const settings = h(
    'div',
    { class: 'lobby-settings' },
    select(T.mpLevel, st.level, levels, (v) => act.settings({ level: v })),
    select(
      T.mpMaxPlayers,
      st.maxPlayers,
      [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => n >= room.players.length).map((n) => [n, String(n)] as [number, string]),
      (v) => act.settings({ maxPlayers: v }),
    ),
    select(T.mpMoney, st.shared ? 'shared' : 'split', [
      ['shared', T.mpShared],
      ['split', T.mpSplit],
    ], (v) => act.settings({ shared: v === 'shared' })),
    select<ZoneMode>(T.mpZones, st.zoneMode, ZONE_MODES.map((m) => [m, ZONE_LABELS[m]] as [ZoneMode, string]), (v) => act.settings({ zoneMode: v })),
  );

  const start = h('button', { class: 'btn primary', disabled: !isHost, on: { click: act.start } }, icon('play'), h('span', { text: ` ${T.mpStart}` }));

  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'screen-card wide panel' },
      h('div', { class: 'section-head' }, h('h2', { attrs: { style: 'margin:0' }, text: T.mpLobby }), h('span', { class: 'muted', text: `${room.players.length}/${st.maxPlayers}` })),
      h('div', { class: 'code-box' }, h('span', { class: 'label', text: T.mpCode }), h('span', { class: 'big-code mono', text: room.code }), copy, copied),
      h('div', { class: 'faint', attrs: { style: 'font-size:12px' }, text: T.mpShareCode }),
      h('div', { class: 'lobby-grid' }, h('div', {}, h('div', { class: 'label', text: T.mpPlayers }), players), h('div', {}, h('div', { class: 'label', text: T.settings }), settings)),
      message ? h('div', { class: 'status bad', text: message }) : null,
      h('div', { class: 'faint', attrs: { style: 'font-size:12px' }, text: isHost ? T.mpStartNote : T.mpWaitingForHost }),
      h('div', { class: 'row-buttons' }, start, h('button', { class: 'btn', on: { click: act.leave } }, icon('arrow-left'), h('span', { text: ` ${T.mpLeave}` }))),
    ),
  );
}
