/**
 * DOM overlays: menu button, daily button, menu sheet, game-over card. DOM (not canvas) so they're
 * accessible (focus, screen readers) and crisp. Kept tiny: the board is the interface.
 */
import type { Profile, ThemePref } from '../platform/storage.ts';
import { SKINS } from '../meta/unlocks.ts';

export interface UiHandlers {
  onOpenMenu(): void;
  onResume(): void;
  onNewGame(): void;
  onDaily(): void;
  onClassic(): void;
  onPuzzles(): void;
  onPuzzleNext(): void;
  onPuzzleRetry(): void;
  onPuzzleList(): void;
  onPuzzlePick(index: number): void;
  onToggle(key: 'sound' | 'haptics' | 'reducedMotion'): void;
  onTheme(t: ThemePref): void;
  onSkin(): void;
  onShare(): void;
  onClick(): void;
}

const ICON_MENU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>`;
const ICON_HINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>`;
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

  setMode(mode: 'classic' | 'daily' | 'puzzle', streak: number): void {
    this.dailyBtn.innerHTML = (mode === 'puzzle' ? ICON_HINT : ICON_DAILY) + '<span class="badge"></span>';
    this.modeTag.textContent = mode === 'daily' ? 'Daily' : mode === 'puzzle' ? 'Reef puzzles' : '';
    (this.dailyBtn.querySelector('.badge') as HTMLElement).textContent = streak > 0 ? String(streak) : '';
    if (mode === 'puzzle') {
      this.dailyBtn.setAttribute('aria-label', 'Hint');
      return;
    }
    this.dailyBtn.setAttribute(
      'aria-label',
      mode === 'daily' ? 'Back to classic' : `Daily challenge${streak ? `, streak ${streak}` : ''}`,
    );
  }

  get open(): boolean {
    return this.veil !== null;
  }

  close(immediate = false): void {
    const v = this.veil;
    if (!v) return;
    this.veil = null;
    if (!immediate) {
      this.returnFocus?.focus?.({ preventScroll: true });
      this.returnFocus = null;
    }
    if (immediate) return v.remove();
    v.classList.remove('show');
    v.setAttribute('aria-hidden', 'true');
    v.style.pointerEvents = 'none';
    setTimeout(() => v.remove(), 200);
  }

  private returnFocus: HTMLElement | null = null;

  private show(card: HTMLElement, dismissable: boolean): void {
    const replacing = this.veil !== null;
    if (!replacing) this.returnFocus = document.activeElement as HTMLElement | null;
    this.close(true);
    const v = document.createElement('div');
    v.className = 'veil';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.append(card);
    if (dismissable)
      v.addEventListener('click', (e) => {
        if (e.target === v) this.h.onResume();
      });
    v.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dismissable) {
        e.preventDefault();
        this.h.onResume();
      } else if (e.key === 'Tab') {
        // keep focus inside the dialog
        const f = [...v.querySelectorAll<HTMLElement>('button')];
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i === f.length - 1 ? 0 : i + 1;
        e.preventDefault();
        f[next]!.focus();
      }
    });
    this.root.append(v);
    this.veil = v;
    if (replacing) v.classList.add('show');
    else requestAnimationFrame(() => this.veil === v && v.classList.add('show'));
    (card.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  showMenu(p: Profile, mode: 'classic' | 'daily' | 'puzzle', canResume: boolean): void {
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
    if (mode === 'puzzle') {
      card.append(
        this.button('', canResume ? 'btn' : 'btn primary', 'Restart reef', 'Restart reef', () =>
          this.h.onPuzzleRetry(),
        ),
      );
      card.append(this.button('', 'btn', 'Skip to next reef', 'Skip to next reef', () => this.h.onPuzzleNext()));
      card.append(this.button('', 'btn', 'All reefs', 'All reefs', () => this.h.onPuzzleList()));
      card.append(this.button('', 'btn', 'Classic', 'Classic mode', () => this.h.onClassic()));
    } else {
      card.append(this.button('', canResume ? 'btn' : 'btn primary', 'New game', 'New game', () => this.h.onNewGame()));
      card.append(
        mode === 'daily'
          ? this.button('', 'btn', 'Classic', 'Classic mode', () => this.h.onClassic())
          : this.button('', 'btn', 'Daily challenge', 'Daily challenge', () => this.h.onDaily()),
      );
      card.append(
        this.button('', 'btn', `Reef puzzles · ${p.puzzle.solved.length} cleared`, 'Reef puzzles', () =>
          this.h.onPuzzles(),
        ),
      );
    }
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
    const sk = document.createElement('div');
    sk.className = 'row';
    const locked = SKINS.filter((k) => !p.unlocked.includes(k.id));
    sk.innerHTML = `<span>Pebbles</span>`;
    const cur = SKINS.find((k) => k.id === p.settings.skin)?.name ?? 'Pebble';
    sk.append(this.button('', 'toggle', cur.replace(' (high contrast)', ''), `Pebbles: ${cur}`, () => this.h.onSkin()));
    rows.append(sk);
    card.append(rows);
    if (locked.length) {
      const hint = document.createElement('div');
      hint.className = 'foot';
      hint.textContent = `${locked.length} to discover · next: ${locked[0]!.hint}`;
      card.append(hint);
    }
    const foot = document.createElement('div');
    foot.className = 'foot';
    foot.textContent = `${p.stats.games} games · ${p.stats.captures} lagoons captured`;
    card.append(foot);
    this.show(card, canResume);
  }

  /** Grid of every reef by tier; tap one to play it. Nothing is locked. */
  showReefs(
    list: readonly { id: string; tier?: string }[],
    solved: readonly string[],
    pure: readonly string[],
    current: number,
  ): void {
    const card = document.createElement('div');
    card.className = 'card reefs';
    card.innerHTML = `<h2>Reefs</h2><div class="sub">${solved.length} of ${list.length} cleared · ★ = no hints</div>`;
    const scroller = document.createElement('div');
    scroller.className = 'reef-scroll';
    const names: Record<string, string> = { calm: 'Calm', tricky: 'Tricky', deep: 'Deep', abyss: 'Abyss' };
    let lastTier = '';
    let grid: HTMLElement | null = null;
    list.forEach((p, i) => {
      const tier = p.tier ?? '';
      if (tier !== lastTier) {
        lastTier = tier;
        const h = document.createElement('div');
        h.className = 'tier';
        h.textContent = names[tier] ?? tier;
        grid = document.createElement('div');
        grid.className = 'reef-grid';
        scroller.append(h, grid);
      }
      const isPure = pure.includes(p.id);
      const isSolved = solved.includes(p.id);
      const b = this.button(
        '',
        `reef${isSolved ? ' done' : ''}${i === current ? ' cur' : ''}`,
        `${i + 1}${isPure ? '<sup>★</sup>' : ''}`,
        `Reef ${i + 1}${isSolved ? ', cleared' : ''}`,
        () => this.h.onPuzzlePick(i),
      );
      grid!.append(b);
    });
    card.append(scroller);
    card.append(this.button('', 'btn', 'Close', 'Close', () => this.h.onResume()));
    this.show(card, true);
    scroller.querySelector('.cur')?.scrollIntoView({ block: 'center' });
  }

  showPuzzleResult(o: { solved: boolean; index: number; total: number; cleared: number }): void {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = o.solved
      ? `<h2>Reef ${o.index + 1}</h2><div class="big" data-testid="puzzle-result">Cleared</div><div class="sub">${o.cleared} of ${o.total} reefs cleared</div>`
      : `<h2>Reef ${o.index + 1}</h2><div class="big" data-testid="puzzle-result">So close</div><div class="sub">Every piece must be placed and every pebble popped.</div>`;
    if (o.solved) {
      if (o.index + 1 < o.total)
        card.append(this.button('next-reef', 'btn primary', 'Next reef', 'Next reef', () => this.h.onPuzzleNext()));
      card.append(this.button('', 'btn', 'Classic', 'Classic mode', () => this.h.onClassic()));
    } else {
      card.append(this.button('retry-reef', 'btn primary', 'Try again', 'Try again', () => this.h.onPuzzleRetry()));
      card.append(this.button('', 'btn', 'Skip', 'Skip to next reef', () => this.h.onPuzzleNext()));
    }
    this.show(card, false);
    this.announce(o.solved ? `Reef ${o.index + 1} cleared` : 'Not cleared. Try again.');
  }

  showGameOver(o: {
    score: number;
    best: number;
    newBest: boolean;
    moves: number;
    lagoon: number;
    mode: 'classic' | 'daily' | 'puzzle';
    dailyStreak: number;
    unlocked: string[];
    shape?: { cells: readonly number[]; ring: readonly number[] } | null;
  }): void {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h2>${o.mode === 'daily' ? 'Daily complete' : 'No room left'}</h2>
      <div class="big" data-testid="final-score">${o.score}</div>
      <div class="sub">${o.newBest ? '<span class="best-flash">NEW BEST</span>' : nearMiss(o.score, o.best)}</div>

      <div class="stats">
        <div><b>${o.moves}</b><span>Moves</span></div>
        <div><b>${o.lagoon}</b><span>Biggest lagoon</span></div>
        <div><b>${o.dailyStreak}</b><span>Daily streak</span></div>
      </div>${o.shape ? lagoonGrid(o.shape) : ''}
${
  o.unlocked.length
    ? `<div class="sub best-flash" data-testid="unlock">New pebbles: ${o.unlocked.join(', ')}</div>`
    : ''
}`;
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

/** "Best 1200" plus a progress bar toward it — the pull of almost. */
function nearMiss(score: number, best: number): string {
  if (best <= 0) return '';
  const pct = Math.max(0, Math.min(100, Math.round((score / best) * 100)));
  const gap = best - score;
  return `<div>Best ${best}${gap > 0 && pct >= 70 ? ` · just ${gap} short` : ''}</div>
    <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
}

/** Mini picture of a lagoon (water + its ring) in the game's own style. */
function lagoonGrid(l: { cells: readonly number[]; ring: readonly number[] }): string {
  const all = [...l.cells, ...l.ring];
  const xs = all.map((c) => c % 8);
  const ys = all.map((c) => Math.floor(c / 8));
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0 + 1;
  const h = Math.max(...ys) - y0 + 1;
  const water = new Set(l.cells);
  const ring = new Set(l.ring);
  let cells = '';
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const c = y * 8 + x;
      cells += `<i class="${water.has(c) ? 'w' : ring.has(c) ? 'r' : ''}"></i>`;
    }
  return `<div class="pic" role="img" aria-label="Your biggest lagoon: ${l.cells.length} cells" style="grid-template-columns:repeat(${w},14px)">${cells}</div>`;
}
