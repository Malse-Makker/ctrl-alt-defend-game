// Tiny DOM helper. Text always goes in through textContent, never innerHTML, so nothing a player
// types (feedback, names) or anything from the changelog can inject markup.

type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string;
  text?: string;
  title?: string;
  type?: string;
  disabled?: boolean;
  attrs?: Record<string, string>;
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[K]) => void }>;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.title) el.title = props.title;
  if (props.type) el.setAttribute('type', props.type);
  if (props.disabled) (el as HTMLButtonElement).disabled = true;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.on) {
    for (const [k, fn] of Object.entries(props.on)) el.addEventListener(k, fn as EventListener);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
  return el;
}

export function icon(name: string, extra = ''): HTMLElement {
  return h('i', { class: `fa-solid fa-${name} ${extra}`.trim(), attrs: { 'aria-hidden': 'true' } });
}

export function img(src: string, alt: string): HTMLImageElement {
  const i = h('img', { attrs: { src, alt, draggable: 'false' } });
  i.decoding = 'async';
  return i;
}

/** Set text only when it changed: the HUD updates every frame and the DOM should not churn. */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function toggle(el: HTMLElement, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

export function fmt(n: number, digits = 0): string {
  return n.toFixed(digits);
}
