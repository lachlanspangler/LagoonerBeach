/**
 * DOM overlays: menu button, daily button, menu sheet, game-over card. DOM (not canvas) so they're
 * accessible (focus, screen readers) and crisp. Kept tiny: the board is the interface.
 */
import type { Profile, ThemePref } from '../platform/storage.ts';

export interface UiHandlers {
  onOpenMenu(): void;
  onResume(): void;
  onNewGame(): void;
  onDaily(): void;
  onClassic(): void;
  onToggle(key: 'sound' | 'haptics' | 'reducedMotion'): void;
  onTheme(t: ThemePref): void;
  onShare(): void;
  onClick(): void;
}

const ICON_MENU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>`;
const ICON_DAILY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8.5 13.5c1.2 1.3 5.8 1.3 7 0M9 10h.01M15 10h.01"/></svg>`;

export class Ui {
  private root: HTMLElement;
  private veil: HTMLElement | null = null;
  readonly menuBtn: HTMLButtonElement;
  readonly dailyBtn: HTMLButtonElement;
  private modeTag: HTMLElement;
  private sr: HTMLElement;

  constructor(private readonly h: UiHandlers) {
    this.root = document.getElementById('ui')!;
    this.sr = document.getElementById('sr')!;
    this.menuBtn = this.button('menu-btn', 'icon-btn', ICON_MENU, 'Menu', () => h.onOpenMenu());
    this.dailyBtn = this.button(
      'daily-btn',
      'icon-btn',
      ICON_DAILY + '<span class="badge"></span>',
      'Daily challenge',
      () => h.onDaily(),
    );
    this.modeTag = document.createElement('div');
    this.modeTag.className = 'mode-tag';
    this.root.append(this.menuBtn, this.dailyBtn, this.modeTag);
  }

  private button(id: string, cls: string, html: string, label: string, fn: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    if (id) b.id = id;
    b.className = cls;
    b.innerHTML = html;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.h.onClick();
      fn();
    });
    return b;
  }

  announce(text: string): void {
    this.sr.textContent = text;
  }

  setMode(mode: 'classic' | 'daily', streak: number): void {
    this.modeTag.textContent = mode === 'daily' ? 'Daily' : '';
    (this.dailyBtn.querySelector('.badge') as HTMLElement).textContent = streak > 0 ? String(streak) : '';
    this.dailyBtn.setAttribute(
      'aria-label',
      mode === 'daily' ? 'Back to classic' : `Daily challenge${streak ? `, streak ${streak}` : ''}`,
    );
  }

  get open(): boolean {
    return this.veil !== null;
  }

  close(): void {
    const v = this.veil;
    if (!v) return;
    this.veil = null;
    v.classList.remove('show');
    setTimeout(() => v.remove(), 200);
  }

  private show(card: HTMLElement, dismissable: boolean): void {
    this.close();
    const v = document.createElement('div');
    v.className = 'veil';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.append(card);
    if (dismissable)
      v.addEventListener('click', (e) => {
        if (e.target === v) this.h.onResume();
      });
    this.root.append(v);
    this.veil = v;
    requestAnimationFrame(() => v.classList.add('show'));
    (card.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  showMenu(p: Profile, mode: 'classic' | 'daily', canResume: boolean): void {
    const card = document.createElement('div');
    card.className = 'card';
    const s = p.settings;
    const rm = s.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.innerHTML = `<h2>Atoll</h2>
      <div class="sub">Close a loop — everything inside pops.</div>
      <div class="stats">
        <div><b>${p.best}</b><span>Best</span></div>
        <div><b>${p.stats.bestPocket}</b><span>Biggest lagoon</span></div>
        <div><b>${p.daily.current}</b><span>Daily streak</span></div>
      </div>`;
    if (canResume) card.append(this.button('', 'btn primary', 'Resume', 'Resume', () => this.h.onResume()));
    card.append(this.button('', canResume ? 'btn' : 'btn primary', 'New game', 'New game', () => this.h.onNewGame()));
    card.append(
      mode === 'daily'
        ? this.button('', 'btn', 'Classic', 'Classic mode', () => this.h.onClassic())
        : this.button('', 'btn', 'Daily challenge', 'Daily challenge', () => this.h.onDaily()),
    );
    const rows = document.createElement('div');
    rows.style.marginTop = '10px';
    const toggle = (label: string, on: boolean, key: 'sound' | 'haptics' | 'reducedMotion') => {
      const r = document.createElement('div');
      r.className = 'row';
      r.innerHTML = `<span>${label}</span>`;
      const b = this.button('', 'toggle', on ? 'On' : 'Off', label, () => this.h.onToggle(key));
      b.setAttribute('aria-pressed', String(on));
      r.append(b);
      rows.append(r);
    };
    toggle('Sound', s.sound, 'sound');
    toggle('Haptics', s.haptics, 'haptics');
    toggle('Reduced motion', rm, 'reducedMotion');
    const tr = document.createElement('div');
    tr.className = 'row';
    tr.innerHTML = '<span>Theme</span>';
    const next: Record<ThemePref, ThemePref> = { auto: 'day', day: 'night', night: 'auto' };
    const label: Record<ThemePref, string> = { auto: 'Auto', day: 'Day', night: 'Night' };
    tr.append(this.button('', 'toggle', label[s.theme], 'Theme', () => this.h.onTheme(next[s.theme])));
    rows.append(tr);
    card.append(rows);
    const foot = document.createElement('div');
    foot.className = 'foot';
    foot.textContent = `${p.stats.games} games · ${p.stats.captures} lagoons captured`;
    card.append(foot);
    this.show(card, canResume);
  }

  showGameOver(o: {
    score: number;
    best: number;
    newBest: boolean;
    moves: number;
    lagoon: number;
    mode: 'classic' | 'daily';
    dailyStreak: number;
  }): void {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h2>${o.mode === 'daily' ? 'Daily complete' : 'No room left'}</h2>
      <div class="big" data-testid="final-score">${o.score}</div>
      <div class="sub">${o.newBest ? '<span class="best-flash">NEW BEST</span>' : `Best ${o.best}`}</div>
      <div class="stats">
        <div><b>${o.moves}</b><span>Moves</span></div>
        <div><b>${o.lagoon}</b><span>Biggest lagoon</span></div>
        <div><b>${o.dailyStreak}</b><span>Daily streak</span></div>
      </div>`;
    if (o.mode === 'daily') {
      card.append(this.button('', 'btn primary', 'Share', 'Share result', () => this.h.onShare()));
      card.append(this.button('', 'btn', 'Play classic', 'Play classic', () => this.h.onClassic()));
    } else {
      card.append(this.button('play-again', 'btn primary', 'Play again', 'Play again', () => this.h.onNewGame()));
      card.append(this.button('', 'btn', 'Daily challenge', 'Daily challenge', () => this.h.onDaily()));
    }
    this.show(card, false);
    this.announce(`Game over. Score ${o.score}.${o.newBest ? ' New best!' : ''}`);
  }
}
