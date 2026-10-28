/**
 * The title screen (ADR 0015, docs/research/INTRO_SCREEN.md §5). Its markup is static in index.html
 * and the decision to show it is made there before first paint (deep links, warm returns, the
 * "Open straight into the game" setting and automated runs skip it), so this module only wires it:
 * the Play/Continue label, About and Settings, and the hand-off to the board. One tap plays; nothing
 * on it ever waits. The living atoll scene behind the wordmark is a lazy chunk (titleScene.ts) that
 * fades in when it lands, so it costs the initial bundle nothing.
 */
import type { Palette } from '../render/theme.ts';
import type { SpriteCache } from '../render/sprites.ts';
import type { TitleScene } from './titleScene.ts';
import { icon } from './icons.ts';

const K_TITLE = 'atoll.v1.title';
/** A relaunch this soon after the app was last hidden goes straight back to the board. */
export const WARM_MS = 10 * 60 * 1000;

interface TitlePrefs {
  /** When the app was last hidden (ms epoch). */
  at?: number;
  /** "Open straight into the game". */
  off?: boolean;
}
function prefs(): TitlePrefs {
  try {
    const v: unknown = JSON.parse(globalThis.localStorage?.getItem(K_TITLE) ?? '{}');
    return v && typeof v === 'object' ? (v as TitlePrefs) : {};
  } catch {
    return {};
  }
}
function savePrefs(p: TitlePrefs): void {
  try {
    globalThis.localStorage?.setItem(K_TITLE, JSON.stringify(p));
  } catch {
    /* private mode: the title just shows next time */
  }
}
/** Remember that the app was just hidden (a quick relaunch skips the title). */
export const markHidden = (now = Date.now()): void => savePrefs({ ...prefs(), at: now });
export const titleOff = (): boolean => prefs().off === true;
export const setTitleOff = (off: boolean): void => savePrefs({ ...prefs(), off });
/** The same rule index.html runs before first paint (kept in sync by tests/unit/title.test.ts). */
export function shouldShowTitle(search: string, p: TitlePrefs, now: number, webdriver: boolean): boolean {
  const q = new URLSearchParams(search);
  if (q.has('title')) return true;
  if (q.has('mode') || q.has('seed') || q.has('notitle') || p.off === true) return false;
  if (webdriver && !q.has('titlerules')) return false;
  return !(typeof p.at === 'number' && now - p.at < WARM_MS && now >= p.at);
}

export const titleShowing = (): boolean => document.documentElement.dataset.title === '1';

export interface TitleHooks {
  onPlay(): void;
  onAbout(): void;
  onSettings(): void;
}

export class Title {
  private el = document.getElementById('title')!;
  private play = document.getElementById('t-play') as HTMLButtonElement;
  private scene: TitleScene | null = null;
  closed = false;
  private inerted: HTMLElement[] = [];
  private onKey = () => (document.documentElement.dataset.kb = '1');

  constructor(
    sprites: SpriteCache,
    palette: () => Palette,
    private reduced: () => boolean,
    h: TitleHooks,
  ) {
    this.el.querySelector('.t-play-ic')!.innerHTML = icon('play', { filled: true });
    const [about, settings] = this.el.querySelectorAll<HTMLElement>('.t-pill-ic');
    about!.innerHTML = icon('info');
    settings!.innerHTML = icon('settings');
    this.el.querySelector('.t-wave')!.innerHTML =
      '<svg viewBox="0 0 92 10"><path d="M2 6c5-4 10-4 15 0s10 4 15 0 10-4 15 0 10 4 15 0 10-4 15 0 10 4 13 1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
    // the board and its buttons sit behind the title: out of reach (screen readers, Tab) until Play
    this.inerted = [
      document.getElementById('game'),
      ...document.querySelectorAll<HTMLElement>('#ui > :not(#title)'),
    ].filter((e): e is HTMLElement => !!e && !e.inert);
    for (const el of this.inerted) el.inert = true;
    this.play.addEventListener('click', () => !this.closed && h.onPlay());
    document.getElementById('t-about')!.addEventListener('click', () => h.onAbout());
    document.getElementById('t-settings')!.addEventListener('click', () => h.onSettings());
    // Play has focus (Enter plays), but the ring only shows once a key is used
    this.play.focus({ preventScroll: true });
    addEventListener('keydown', this.onKey, { once: true, capture: true });
    void import('./titleScene.ts')
      .then((m) => {
        if (!this.closed) this.scene = new m.TitleScene(sprites, palette, reduced);
      })
      .catch(() => undefined); // no scene (offline, a failed chunk): the title still works as is
  }

  /** "Play", or "Continue" + what it continues ("Endless · 3,150"). */
  setPlay(cont: { sub: string; label: string } | null): void {
    this.play.querySelector('.t-play-l')!.textContent = cont ? 'Continue' : 'Play';
    this.play.querySelector('.t-play-s')!.textContent = cont?.sub ?? '';
    this.play.setAttribute('aria-label', cont ? `Continue ${cont.label}` : 'Play');
  }

  /** Theme or size changed. */
  refresh(): void {
    this.scene?.refresh();
  }

  /** Hand off to the board: the title fades and lets go of everything it holds. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.scene?.stop();
    this.scene = null;
    removeEventListener('keydown', this.onKey, { capture: true });
    const hadFocus = this.el.contains(document.activeElement);
    this.el.classList.add('leaving');
    // the board rises into place as the title lifts away (one shared move; reduced motion: a fade)
    document.getElementById('game')?.animate(
      this.reduced()
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: 'translateY(18px) scale(0.985)' },
            { opacity: 1, transform: 'none' },
          ],
      {
        duration: this.reduced() ? 150 : 420,
        delay: this.reduced() ? 0 : 60,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      },
    );
    for (const el of this.inerted) el.inert = false;
    // keyboard focus lands on the game's first control, not on <body> when Play goes away
    if (hadFocus) document.querySelector<HTMLElement>('#ui > button:not([inert])')?.focus({ preventScroll: true });
    let gone = false;
    const done = () => {
      if (gone) return;
      gone = true;
      delete document.documentElement.dataset.title;
      this.el.remove();
    };
    if (this.reduced()) setTimeout(done, 160);
    else this.el.addEventListener('transitionend', (e) => e.target === this.el && done());
    setTimeout(done, 700); // a missed transitionend (hidden tab) must not leave it covering the board
  }
}
