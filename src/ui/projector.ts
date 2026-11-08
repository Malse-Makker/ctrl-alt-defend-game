// The projector mini-game (Meeting Room, and later Boardroom III). The game keeps running behind
// it; until you fix it you cannot build. Step 1: plug both cables into the right port of a real
// (rendered) projector, by dragging or by clicking a plug and then a port. Step 2: pick the right
// display mode. Closes by itself after a while, so nobody gets stuck.
//
// The pictures come from art/blender/projector_ui.py, which also writes where the ports are.

import { h } from './dom';
import { PROJECTOR_PORTS, PROJECTOR_SIZE } from './projectorLayout';
import { UI_TEXT as T } from './text';

export interface ProjectorGame {
  el: HTMLElement;
  setTimeLeft(seconds: number): void;
  close(): void;
}

type PlugId = 'vga' | 'pwr';
type PortId = PlugId | 'hdmi';

const PLUGS: readonly { id: PlugId; label: string; color: string }[] = [
  // Power first: the cables cross on the way to their ports, like real ones do.
  { id: 'pwr', label: 'Power', color: '#2a2d33' },
  { id: 'vga', label: 'VGA', color: '#3e7cc9' },
];

const PORTS: readonly { id: PortId; label: string }[] = [
  { id: 'vga', label: 'VGA' },
  { id: 'hdmi', label: 'HDMI' },
  { id: 'pwr', label: 'Power' },
];

const picture = (vga: boolean, pwr: boolean) => `ui/projector_${vga && pwr ? 'both' : vga ? 'vga' : pwr ? 'pwr' : 'none'}.png`;

export function projectorGame(onSolved: () => void, say: (msg: string) => void): ProjectorGame {
  // Load every state up front, so plugging in does not flicker.
  for (const v of [false, true]) for (const p of [false, true]) new Image().src = picture(v, p);

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
  const plugged = new Set<PlugId>();
  let picked: PlugId | null = null;
  const stage = h('div', { class: 'qte-stage' });
  const shot = h('img', {
    class: 'qte-picture',
    attrs: { src: picture(false, false), alt: 'A projector with a VGA, an HDMI and a power port on its side', draggable: 'false' },
  });
  const scene = h('div', { class: 'qte-scene', attrs: { style: `aspect-ratio: ${PROJECTOR_SIZE.w} / ${PROJECTOR_SIZE.h}` } }, shot);
  const ports = new Map<PortId, HTMLButtonElement>();
  for (const p of PORTS) {
    const at = PROJECTOR_PORTS[p.id];
    // A little bigger than the port itself, so it is easy to hit.
    const w = at.w * 1.5;
    const ht = at.h * 1.5;
    const port = h(
      'button',
      {
        class: `qte-port port-${p.id}`,
        title: `${p.label} port`,
        attrs: {
          'aria-label': `${p.label} port`,
          style: `left:${(at.x - w / 2) * 100}%; top:${(at.y - ht / 2) * 100}%; width:${w * 100}%; height:${ht * 100}%`,
        },
        on: { click: () => tryPlug(picked, p.id) },
      },
    );
    ports.set(p.id, port);
    scene.append(port);
  }
  const wires = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wires.setAttribute('class', 'qte-wires');
  const plugRow = h('div', { class: 'qte-plugs' });
  const plugs = new Map<PlugId, HTMLButtonElement>();
  for (const p of PLUGS) {
    const b = h(
      'button',
      { class: `qte-plug plug-${p.id}`, attrs: { style: `--plug:${p.color}` }, title: `${p.label} cable` },
      h('img', { attrs: { src: `ui/plug_${p.id}.png`, alt: '', draggable: 'false' } }),
      h('span', { text: p.label }),
    );
    b.addEventListener('click', () => {
      if (plugged.has(p.id)) return;
      picked = picked === p.id ? null : p.id;
      plugs.forEach((x, k) => x.classList.toggle('picked', k === picked));
    });
    b.addEventListener('pointerdown', (e) => startDrag(e, p.id));
    plugs.set(p.id, b);
    plugRow.append(b);
  }
  stage.append(scene, plugRow, wires, h('div', { class: 'qte-help', text: T.projHelp }));
  body.append(stage);

  function topOf(elm: HTMLElement): { x: number; y: number } {
    const r = elm.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    return { x: r.left + r.width / 2 - s.left, y: r.top - s.top };
  }

  /** While dragging: a cable from the plug to the pointer. Plugged cables are in the picture. */
  function drawDrag(drag?: { id: PlugId; x: number; y: number }): void {
    wires.replaceChildren();
    if (!drag) return;
    const p = PLUGS.find((x) => x.id === drag.id)!;
    const from = topOf(plugs.get(drag.id)!);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', `M ${from.x} ${from.y} C ${from.x} ${from.y - 40}, ${drag.x} ${drag.y + 40}, ${drag.x} ${drag.y}`);
    line.setAttribute('stroke', p.color);
    line.setAttribute('stroke-width', '7');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke-linecap', 'round');
    wires.append(line);
  }

  function tryPlug(plug: PlugId | null, port: PortId): void {
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
    shot.src = picture(plugged.has('vga'), plugged.has('pwr'));
    drawDrag();
    if (plugged.size === PLUGS.length) window.setTimeout(showSettings, 450);
  }

  function startDrag(e: PointerEvent, id: PlugId): void {
    if (plugged.has(id) || e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    let moved = false;
    const s = stage.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      moved = true;
      drawDrag({ id, x: ev.clientX - s.left, y: ev.clientY - s.top });
    };
    const up = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      if (!moved) return;
      const hit = [...ports.entries()].find(([, port]) => {
        const r = port.getBoundingClientRect();
        return ev.clientX >= r.left - 8 && ev.clientX <= r.right + 8 && ev.clientY >= r.top - 8 && ev.clientY <= r.bottom + 8;
      });
      if (hit) tryPlug(id, hit[0]);
      drawDrag();
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

  return {
    el,
    setTimeLeft: (sec) => {
      const t = T.projTimer.replace('{s}', String(Math.max(0, Math.ceil(sec))));
      if (timer.textContent !== t) timer.textContent = t;
    },
    close: () => el.remove(),
  };
}
