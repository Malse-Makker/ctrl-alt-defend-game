// The projector mini-game (Meeting Room, and later Boardroom III). The game keeps running behind
// it; until you fix it you cannot build. Step 1: plug both cables into the right port (drag, or
// click a plug and then a port). Step 2: pick the right display mode. Closes by itself after a
// while, so nobody gets stuck.

import { h, icon } from './dom';
import { UI_TEXT as T } from './text';

export interface ProjectorGame {
  el: HTMLElement;
  setTimeLeft(seconds: number): void;
  close(): void;
}

const PLUGS = [
  { id: 'vga', label: 'VGA', color: '#3e7cc9' },
  { id: 'pwr', label: 'Power', color: '#9aa0a8' },
] as const;

export function projectorGame(onSolved: () => void, say: (msg: string) => void): ProjectorGame {
  const timer = h('div', { class: 'qte-timer' });
  const body = h('div', { class: 'qte-body' });
  const card = h(
    'div',
    { class: 'qte panel', attrs: { role: 'dialog', 'aria-label': 'Connect the projector' } },
    h('div', { class: 'qte-head' }, h('span', { class: 'qte-title', text: T.projTitle }), timer),
    body,
  );
  const el = h('div', { class: 'qte-layer' }, card);

  // ---------------------------------------------------------------- step 1: cables
  const plugged = new Set<string>();
  let picked: string | null = null;
  const stage = h('div', { class: 'qte-stage' });
  const wires = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wires.setAttribute('class', 'qte-wires');
  const projector = h('div', { class: 'qte-projector' }, h('div', { class: 'qte-lens' }));
  const ports = new Map<string, HTMLButtonElement>();
  const portRow = h('div', { class: 'qte-ports' });
  // The ports are in the "wrong" order on purpose: power left, VGA right.
  for (const id of ['pwr', 'vga']) {
    const p = PLUGS.find((x) => x.id === id)!;
    const port = h('button', { class: `qte-port port-${id}`, title: `${p.label} port`, on: { click: () => tryPlug(picked, id) } }, h('span', { text: p.label }));
    ports.set(id, port);
    portRow.append(port);
  }
  projector.append(portRow);
  const plugRow = h('div', { class: 'qte-plugs' });
  const plugs = new Map<string, HTMLButtonElement>();
  for (const p of PLUGS) {
    const b = h('button', { class: `qte-plug plug-${p.id}`, attrs: { style: `--plug:${p.color}` }, title: `${p.label} cable` }, icon('plug'), h('span', { text: ` ${p.label}` }));
    b.addEventListener('click', () => {
      if (plugged.has(p.id)) return;
      picked = picked === p.id ? null : p.id;
      plugs.forEach((x, k) => x.classList.toggle('picked', k === picked));
    });
    b.addEventListener('pointerdown', (e) => startDrag(e, p.id));
    plugs.set(p.id, b);
    plugRow.append(b);
  }
  stage.append(wires, projector, plugRow, h('div', { class: 'qte-help', text: T.projHelp }));
  body.append(stage);

  /** A point on the top or bottom edge of an element, in stage coordinates. */
  function edge(elm: HTMLElement, side: 'top' | 'bottom'): { x: number; y: number } {
    const r = elm.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    return { x: r.left + r.width / 2 - s.left, y: (side === 'top' ? r.top : r.bottom) - s.top };
  }

  function drawWires(drag?: { id: string; x: number; y: number }): void {
    wires.replaceChildren();
    for (const p of PLUGS) {
      const from = edge(plugs.get(p.id)!, 'top');
      let to: { x: number; y: number } | null = null;
      if (plugged.has(p.id)) to = edge(ports.get(p.id)!, 'bottom');
      else if (drag && drag.id === p.id) to = { x: drag.x, y: drag.y };
      if (!to) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', `M ${from.x} ${from.y} C ${from.x} ${from.y - 30}, ${to.x} ${to.y + 30}, ${to.x} ${to.y}`);
      line.setAttribute('stroke', p.color);
      line.setAttribute('stroke-width', '6');
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke-linecap', 'round');
      wires.append(line);
    }
  }

  function tryPlug(plug: string | null, port: string): void {
    if (!plug) {
      say(T.projNoCable);
      return;
    }
    if (plug !== port) {
      say(T.projWrongPort);
      return;
    }
    plugged.add(plug);
    picked = null;
    plugs.get(plug)!.classList.add('done');
    ports.get(port)!.classList.add('done');
    plugs.forEach((x) => x.classList.remove('picked'));
    drawWires();
    if (plugged.size === PLUGS.length) window.setTimeout(showSettings, 350);
  }

  function startDrag(e: PointerEvent, id: string): void {
    if (plugged.has(id) || e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    let moved = false;
    const s = stage.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      moved = true;
      drawWires({ id, x: ev.clientX - s.left, y: ev.clientY - s.top });
    };
    const up = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      if (!moved) return;
      const hit = [...ports.entries()].find(([, port]) => {
        const r = port.getBoundingClientRect();
        return ev.clientX >= r.left - 12 && ev.clientX <= r.right + 12 && ev.clientY >= r.top - 12 && ev.clientY <= r.bottom + 12;
      });
      if (hit) tryPlug(id, hit[0]);
      drawWires();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }

  // ---------------------------------------------------------------- step 2: display mode
  function showSettings(): void {
    // Online the answer takes a snapshot to come back; one click is enough.
    let sent = false;
    const opt = (text: string, ok: boolean, wrong: string) =>
      h('button', {
        class: 'xp-option',
        text,
        on: {
          click: () => {
            if (sent) return;
            if (!ok) return say(wrong);
            sent = true;
            onSolved();
          },
        },
      });
    const win = h(
      'div',
      { class: 'xp-window' },
      h('div', { class: 'xp-title' }, h('span', { text: T.projSettings }), h('button', { class: 'xp-close', text: 'x', title: 'Close', on: { click: () => say(T.projClose) } })),
      h(
        'div',
        { class: 'xp-body' },
        h('div', { class: 'xp-q', text: T.projQuestion }),
        opt(T.projLaptop, false, T.projLaptopNo),
        opt(T.projExtend, false, T.projExtendNo),
        opt(T.projDuplicate, true, ''),
      ),
    );
    body.replaceChildren(win);
  }

  requestAnimationFrame(() => drawWires());
  return {
    el,
    setTimeLeft: (sec) => {
      const t = T.projTimer.replace('{s}', String(Math.max(0, Math.ceil(sec))));
      if (timer.textContent !== t) timer.textContent = t;
    },
    close: () => el.remove(),
  };
}
