/**
 * DOM overlays: the top bar (menu · journal/hint), the home sheet, settings, the Beach Journal,
 * species pages, reef cards and the results card. DOM (not canvas) so they're accessible (focus,
 * screen readers) and crisp. Components and tokens: docs/research/UI_DESIGN.md §6, style.css.
 *
 * Two containers: bottom *sheets* for destinations (spring slide-up, grabber, drag or scrim to
 * dismiss) and centered *cards* for moments (results, reef cleared). One primary button per view.
 */
import type { Profile, ThemePref } from '../platform/storage.ts';
import { loadSeen, saveSeen } from '../platform/storage.ts';
import { SPECIES, SPECIES_BY_ID, type Species } from '../meta/creatures.ts';
import { found, type Journal } from '../meta/journal.ts';
import { drawCreature, hasNewArt, whenArtReady } from '../render/creatures.ts';
import { fmt } from '../render/theme.ts';
import type { ReefListModel } from './reefList.ts';
import type * as Sheets from './sheets.ts';
import { resultsHero } from './results.ts';
import { icon, type IconName } from './icons.ts';
import { retryable } from '../platform/lazy.ts';
import { showRetry } from './retry.ts';
import { HABITAT_UI, RARITY_RANK, pipsHtml } from './rarity.ts';

export interface UiHandlers {
  onOpenMenu(): void;
  onResume(): void;
  onNewGame(): void;
  /** Play today's Daily (from Classic: switch; from the Daily: replay it). */
  onDaily(): void;
  onClassic(): void;
  onPuzzles(): void;
  onPuzzleNext(): void;
  onPuzzleRetry(): void;
  onPuzzleList(): void;
  onPuzzlePick(index: number): void;
  /** Reef mode's top-bar button. */
  onHint(): void;
  onToggle(key: 'sound' | 'music' | 'haptics' | 'reducedMotion' | 'largeText'): void;
  onTheme(t: ThemePref): void;
  onSkin(): void;
  onSettings(): void;
  onJournal(): void;
  /** Absent = leaderboards switched off for this build (no menu entry). */
  onLeaderboards?(): void;
  onErase(): void;
  onShare(): void;
  onClick(): void;
  /** The results' NEW HIGH SCORE moment just landed (play the fanfare + heavy haptic). */
  onRecord?(): void;
  /**
   * The results hero has settled (count-up and record moment done). Hook point for the name-entry
   * step: game over → [name entry] → leaderboard. `card` is the results card element.
   */
  onResultsSettled?(
    info: { score: number; newBest: boolean; mode: 'classic' | 'daily' | 'puzzle' },
    card: HTMLElement,
  ): void;
}

type Mode = 'classic' | 'daily' | 'puzzle';

/** The sheets chunk; a failed fetch isn't cached (the next tap retries). */
const loadSheets = retryable(() => import('./sheets.ts'));

/** The Ui surface the lazy sheets module uses. */
export interface SheetKit {
  h: UiHandlers;
  button(id: string, cls: string, html: string, label: string, fn: () => void): HTMLButtonElement;
  show(card: HTMLElement, dismiss: boolean | (() => void), kind?: string): void;
  sheet(
    title: string,
    o: { back?: () => void; full?: boolean; kind: string; close?: boolean },
  ): { card: HTMLElement; head: HTMLElement; body: HTMLElement; title: HTMLElement };
  seenFor(j: Journal): Set<string>;
  markUnseen(j: Journal): void;
}

let lastInput: 'key' | 'pointer' = 'pointer';
addEventListener('keydown', () => (lastInput = 'key'), true);
addEventListener('pointerdown', () => (lastInput = 'pointer'), true);

/** A soft wave under the wordmark. */
const WAVE = `<svg class="wave" viewBox="0 0 92 10" aria-hidden="true"><path d="M2 6c5-4 10-4 15 0s10 4 15 0 10-4 15 0 10 4 15 0 10-4 15 0 10 4 13 1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

/**
 * What Tab should visit inside `root`, in order: enabled buttons, links and `tabindex="0"` elements
 * that aren't roving-tabindex inactive (`tabindex="-1"`), hidden, inert or aria-hidden.
 */
export function tabbable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.closest('[hidden], [inert], [aria-hidden="true"]') &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden',
  );
}

const night = (): boolean => document.documentElement.dataset.theme === 'night';
/** Journal fun unit: one board pebble ≈ 4 cm (CREATURE_ART R28). */
export const PEBBLE_CM = 4;

export class Ui {
  private root: HTMLElement;
  private veil: HTMLElement | null = null;
  private kind = '';
  readonly menuBtn: HTMLButtonElement;
  /** Right of the score: the Beach Journal (Classic, Daily) or the hint bulb (Reefs). */
  readonly sideBtn: HTMLButtonElement;
  private mode: Mode = 'classic';
  private sr: HTMLElement;
  /** null until first used: an existing journal starts "seen" (no wall of dots after an update). */
  private seen: Set<string> | null = loadSeen();
  private journalCount = 0;

  constructor(private readonly h: UiHandlers) {
    this.root = document.getElementById('ui')!;
    this.sr = document.getElementById('sr')!;
    this.menuBtn = this.button('menu-btn', 'icon-btn', icon('menu'), 'Menu', () => h.onOpenMenu());
    this.sideBtn = this.button('side-btn', 'icon-btn', '', 'Journal', () =>
      this.mode === 'puzzle' ? h.onHint() : h.onJournal(),
    );
    this.root.append(this.menuBtn, this.sideBtn);
    this.setMode('classic', 0);
  }

  private button(id: string, cls: string, html: string, label: string, fn: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    if (id) b.id = id;
    b.type = 'button';
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

  /** Announcements made in the same task, read out together (one would otherwise overwrite the other). */
  private srQueue: string[] = [];
  announce(text: string): void {
    if (!text || this.srQueue.includes(text)) return;
    this.srQueue.push(text);
    if (this.srQueue.length > 1) return;
    queueMicrotask(() => {
      const q = this.srQueue;
      this.srQueue = [];
      this.sr.textContent = q.length === 1 ? q[0]! : q.map((t) => (/[.!?…]$/.test(t) ? t : `${t}.`)).join(' ');
    });
  }

  /** Top bar for a mode; `unseen` = journal pages not looked at yet (a dot on the journal). */
  setMode(mode: Mode, _streak: number, journal?: Journal): void {
    this.mode = mode;
    if (journal) this.journalCount = found(journal);
    const puzzle = mode === 'puzzle';
    this.sideBtn.innerHTML = icon(puzzle ? 'hint' : 'journal') + '<span class="dot" aria-hidden="true"></span>';
    this.sideBtn.setAttribute('aria-label', puzzle ? 'Hint' : 'Journal');
    if (journal) this.markUnseen(journal);
  }

  /** The journal button wears a dot while a caught species hasn't been looked at. */
  markUnseen(j: Journal): void {
    const seen = this.seenFor(j);
    const any = this.mode !== 'puzzle' && Object.keys(j.entries).some((id) => !seen.has(id));
    this.sideBtn.classList.toggle('has-new', any);
  }

  /** Debug/screenshots: treat these species as already looked at. */
  markSeen(ids: readonly string[], j: Journal): void {
    const seen = this.seenFor(j);
    for (const id of ids) seen.add(id);
    saveSeen(seen);
    this.markUnseen(j);
  }

  private seenFor(j: Journal): Set<string> {
    if (!this.seen) {
      this.seen = new Set(Object.keys(j.entries));
      saveSeen(this.seen);
    }
    return this.seen;
  }

  /** The creatures' destination on screen (they swim into the journal). */
  journalButton(): HTMLButtonElement {
    return this.mode === 'puzzle' ? this.menuBtn : this.sideBtn;
  }

  get open(): boolean {
    return this.veil !== null;
  }

  close(immediate = false): void {
    const v = this.veil;
    if (!v) return;
    this.veil = null;
    this.kind = '';
    this.setTopBarInert(false);
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

  private setTopBarInert(on: boolean): void {
    for (const b of [this.menuBtn, this.sideBtn]) b.toggleAttribute('inert', on);
  }

  private returnFocus: HTMLElement | null = null;

  /** Show a card built elsewhere (leaderboard sheets). `dismiss`: true = Resume, or a custom action. */
  present(card: HTMLElement, dismiss: boolean | (() => void)): void {
    this.show(card, dismiss, card.dataset.kind ?? card.className);
  }

  private show(card: HTMLElement, dismiss: boolean | (() => void), kind = ''): void {
    const dismissable = dismiss !== false;
    const onDismiss = typeof dismiss === 'function' ? dismiss : () => this.h.onResume();
    const replacing = this.veil !== null;
    const same = replacing && kind !== '' && kind === this.kind;
    // re-rendering the same screen (a settings toggle) keeps its scroll and doesn't replay the entrance
    const keepScroll = same ? (this.veil!.querySelector('.sheet-body')?.scrollTop ?? 0) : 0;
    if (!replacing) this.returnFocus = document.activeElement as HTMLElement | null;
    this.close(true);
    const v = document.createElement('div');
    v.className = 'veil';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    const isSheet = card.classList.contains('sheet');
    if (isSheet && !card.querySelector(':scope > .grab')) {
      const grab = document.createElement('div');
      grab.className = 'grab';
      grab.setAttribute('aria-hidden', 'true');
      card.prepend(grab);
    }
    v.append(card);
    stagger(card, same);
    if (dismissable)
      v.addEventListener('click', (e) => {
        if (e.target === v) onDismiss();
      });
    if (isSheet && dismissable) dragToDismiss(card, onDismiss);
    v.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dismissable) {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'Tab') {
        // keep focus inside the dialog, on what Tab would really reach (not inactive tabs or hidden bits)
        const f = tabbable(v);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i === f.length - 1 ? 0 : i + 1;
        e.preventDefault();
        f[next]!.focus();
      }
    });
    this.root.append(v);
    this.veil = v;
    this.kind = kind;
    this.setTopBarInert(true);
    if (keepScroll) {
      const body = card.querySelector('.sheet-body');
      if (body) body.scrollTop = keepScroll;
    }
    if (replacing) v.classList.add('show');
    else requestAnimationFrame(() => this.veil === v && v.classList.add('show'));
    // keyboard users land on the main action; touch users get no focus ring (focus the dialog itself)
    if (lastInput === 'key') (card.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
    else {
      v.tabIndex = -1;
      v.focus({ preventScroll: true });
    }
  }

  /** A sheet with a title row (title, optional leading back button, close button) and a body. */
  private sheet(title: string, o: { back?: () => void; full?: boolean; kind: string; close?: boolean }) {
    const card = document.createElement('div');
    card.className = `sheet${o.full ? ' full' : ''}`;
    card.dataset.kind = o.kind;
    const head = document.createElement('div');
    head.className = 'sheet-head';
    if (o.back) head.append(this.button('', 'round', icon('back'), 'Back to journal', o.back));
    const t = document.createElement('h2');
    t.className = 'title-m';
    t.textContent = title;
    head.append(t);
    if (o.close !== false) head.append(this.button('', 'round', icon('close'), 'Close', () => this.h.onResume()));
    const body = document.createElement('div');
    body.className = 'sheet-body stagger';
    card.append(head, body);
    return { card, head, body, title: t };
  }

  // ─────────────────────────────────────────────────────────────────────────── home
  showMenu(p: Profile, mode: Mode, canResume: boolean, journalCount = 0, dailyDone = false): void {
    const card = document.createElement('div');
    card.className = 'sheet home stagger';
    card.dataset.kind = 'menu';
    const top = document.createElement('div');
    top.className = 'home-top';
    top.innerHTML = `<div><h2 class="wordmark">Lagooner Beach${WAVE}</h2><p class="callout tagline">Close a loop. Water fills it, the ring pops.</p></div>`;
    card.append(top);
    const chips: string[] = [];
    if (p.best > 0)
      chips.push(
        `<span class="chip gold">${icon('crown', { filled: true })}Best <b class="num">${fmt(p.best)}</b></span>`,
      );
    if (p.daily.current > 0)
      chips.push(`<span class="chip accent">${icon('streak')}${p.daily.current}-day streak</span>`);
    if (chips.length) {
      const c = document.createElement('div');
      c.className = 'home-chips';
      c.innerHTML = chips.join('');
      card.append(c);
    }
    if (canResume)
      card.append(
        this.button('', 'btn primary', `${icon('play', { filled: true })}Resume`, 'Resume', () => this.h.onResume()),
      );
    if (mode === 'puzzle')
      card.append(
        this.button('', 'btn', `${icon('restart')}Restart reef`, 'Restart reef', () => this.h.onPuzzleRetry()),
      );
    const modes = document.createElement('div');
    modes.className = 'modes';
    const card3 = (
      ic: IconName,
      title: string,
      line: string,
      status: string,
      label: string,
      current: boolean,
      go: () => void,
      statusCls = '',
    ) => {
      const b = this.button(
        '',
        `mode-card${current ? ' current' : ''}`,
        `<span class="mc-ic">${icon(ic)}</span><span><span class="mc-title">${title}</span><span class="mc-line">${line}</span></span><span class="mc-status ${statusCls}">${status}</span>`,
        label,
        go,
      );
      modes.append(b);
    };
    card3(
      'endless',
      'Endless',
      'Play on for a high score',
      mode === 'classic' ? 'New game' : 'Play',
      mode === 'classic' ? 'New game' : 'Endless mode',
      mode === 'classic',
      () => (mode === 'classic' ? this.h.onNewGame() : this.h.onClassic()),
      'go',
    );
    card3(
      'daily',
      'Daily',
      'One board for everyone today',
      dailyDone ? `${icon('check', { size: 16 })}` : p.daily.current > 0 ? `Day ${p.daily.current + 1}` : 'Today',
      mode === 'daily' ? 'Replay the daily challenge' : 'Daily challenge',
      mode === 'daily',
      () => this.h.onDaily(),
      dailyDone ? '' : 'go',
    );
    card3(
      'reef',
      'Reefs',
      'Clear every pebble',
      `${p.puzzle.solved.length} cleared`,
      mode === 'puzzle' ? 'All reefs' : 'Reef puzzles',
      mode === 'puzzle',
      () => (mode === 'puzzle' ? this.h.onPuzzleList() : this.h.onPuzzles()),
    );
    card.append(modes);
    const links = document.createElement('div');
    links.className = 'home-links';
    links.append(
      this.button(
        '',
        'link-tile',
        `${icon('journal')}<span>Journal</span><small class="num tile-badge">${journalCount}/${SPECIES.length}</small>`,
        `Beach Journal, ${journalCount} of ${SPECIES.length} found`,
        () => this.h.onJournal(),
      ),
    );
    if (this.h.onLeaderboards)
      links.append(
        this.button('menu-lb', 'link-tile', `${icon('leaderboard')}<span>Leaderboards</span>`, 'Leaderboards', () =>
          this.h.onLeaderboards?.(),
        ),
      );
    links.append(
      this.button('', 'link-tile', `${icon('settings')}<span>Settings</span>`, 'Settings', () => this.h.onSettings()),
    );
    card.append(links);
    this.show(card, canResume, 'menu');
  }

  // ─────────────────────────────────────────────────────────────────────────── reefs
  // ─────────────────────────────────────────────────────────────────────────── sheets (lazy)
  /** Settings, the Beach Journal, species pages and the reef list live in a lazy chunk (sheets.ts). */
  private sheets(): Promise<typeof Sheets> {
    return loadSheets();
  }
  /** Open a sheet from the chunk; if it can't load, offer a retry chip instead of a dead tap. */
  private withSheets(open: (m: typeof Sheets) => void): void {
    this.sheets().then(open, () => showRetry(() => this.withSheets(open)));
  }
  /** Fetch the sheets chunk ahead of the first tap (idle after boot). */
  prefetchSheets(): void {
    void this.sheets().catch(() => undefined);
  }
  showSettings(p: Profile): void {
    this.withSheets((m) => m.showSettings(this.kit(), p));
  }
  showJournal(j: Journal): void {
    this.withSheets((m) => m.showJournal(this.kit(), j));
  }
  /** Reefs by chapter, shipped and endless (src/ui/reefList.ts); tap one to play it. */
  showReefs(m: ReefListModel): void {
    this.withSheets((s) => s.showReefs(this.kit(), m));
  }

  /** What the sheets module needs from the Ui (kept narrow). */
  private kit(): SheetKit {
    return {
      h: this.h,
      button: (id, cls, html, label, fn) => this.button(id, cls, html, label, fn),
      show: (card, dismiss, kind) => this.show(card, dismiss, kind),
      sheet: (title, o) => this.sheet(title, o),
      seenFor: (j) => this.seenFor(j),
      markUnseen: (j) => this.markUnseen(j),
    };
  }

  /** A reef couldn't be charted (generator or pack load failed): retry, or go back to Endless. */
  showReefError(index: number, retry: () => void): void {
    const card = document.createElement('div');
    card.className = 'card stagger';
    card.setAttribute('data-testid', 'reef-error');
    card.innerHTML = `<div class="overline">Reef ${index + 1}</div><h2 class="res-word" style="font-size:30px">Uncharted</h2><p class="callout">This reef couldn't be charted just now.</p>`;
    card.append(this.button('retry-chart', 'btn primary', 'Try again', `Try charting reef ${index + 1} again`, retry));
    card.append(this.button('', 'btn ghost', 'Endless', 'Endless mode', () => this.h.onClassic()));
    this.show(card, true, 'reef-error');
    this.announce(`Reef ${index + 1} couldn't be charted. Try again.`);
  }

  showPuzzleResult(o: {
    solved: boolean;
    index: number;
    total: number;
    cleared: number;
    newIds?: string[];
    /** Replaces "N of M reefs cleared" (endless reefs: chapter progress). */
    progress?: string;
    /** Chapter segments (20; true = cleared). */
    segs?: readonly boolean[];
  }): void {
    const card = document.createElement('div');
    card.className = 'card stagger';
    const segs = o.segs
      ? `<div class="segs" aria-hidden="true">${o.segs.map((s) => `<i${s ? ' class="on"' : ''}></i>`).join('')}</div>`
      : '';
    card.innerHTML = o.solved
      ? `<div class="overline">Reef ${o.index + 1}</div><h2 class="res-word win" data-testid="puzzle-result">Cleared</h2><div class="chapter-progress"><div class="callout">${o.progress ?? `${o.cleared} of ${o.total} reefs cleared`}</div>${segs}</div>`
      : `<div class="overline">Reef ${o.index + 1}</div><h2 class="res-word" data-testid="puzzle-result">So close</h2><p class="callout">Every piece must be placed and every pebble popped.</p>`;
    if (o.newIds?.length) card.append(journalStrip(o.newIds, () => this.h.onJournal()));
    if (o.solved) {
      if (o.index + 1 < o.total)
        card.append(
          this.button('next-reef', 'btn primary', `Next reef${icon('chevronRight')}`, 'Next reef', () =>
            this.h.onPuzzleNext(),
          ),
        );
      card.append(this.button('', 'btn ghost', 'Endless', 'Endless mode', () => this.h.onClassic()));
    } else {
      card.append(
        this.button('retry-reef', 'btn primary', `${icon('restart')}Try again`, 'Try again', () =>
          this.h.onPuzzleRetry(),
        ),
      );
      card.append(this.button('', 'btn ghost', 'Skip', 'Skip to next reef', () => this.h.onPuzzleNext()));
    }
    this.show(card, false, 'reef-result');
    this.announce(o.solved ? `Reef ${o.index + 1} cleared` : 'Not cleared. Try again.');
  }

  // ─────────────────────────────────────────────────────────────────────────── results
  showGameOver(o: {
    score: number;
    best: number;
    newBest: boolean;
    moves: number;
    lagoon: number;
    mode: Mode;
    dailyStreak: number;
    unlocked: string[];
    shape?: { cells: readonly number[]; ring: readonly number[] } | null;
    caught?: { count: number; newIds: string[] };
    /** Leaderboard hook (Daily/Classic): a button that opens name entry → board; `mount` lets the
     *  leaderboard module update its label (e.g. "#37 this week") when a result arrives. */
    leaderboard?: { label: string; open(): void; mount?(b: HTMLButtonElement): void };
    /** Best before this game (for "was 1200" on a record). */
    prevBest?: number;
    reducedMotion?: boolean;
  }): HTMLElement {
    const card = document.createElement('div');
    card.className = 'card results stagger';
    const hero = resultsHero({
      score: o.score,
      best: o.best,
      prevBest: o.prevBest ?? 0,
      newBest: o.newBest,
      reducedMotion: o.reducedMotion ?? false,
      nearMiss: nearMiss(o.score, o.best),
      onRecord: () => this.h.onRecord?.(),
      onSettled: () => this.h.onResultsSettled?.({ score: o.score, newBest: o.newBest, mode: o.mode }, card),
    });
    const stats = [
      [o.moves, 'Moves'],
      [o.lagoon, 'Top lagoon'],
      [o.caught?.count ?? 0, 'Caught'],
      [o.dailyStreak, 'Streak'],
    ].filter(([v]) => (v as number) > 0);
    card.innerHTML = `<div class="overline">${o.mode === 'daily' ? 'Daily · complete' : 'Endless'}</div>
      <h2 class="res-head">${o.mode === 'daily' ? 'Daily done' : 'No room left'}</h2>
      <div class="hero-slot"></div>
      ${stats.length ? `<div class="inline-stats">${stats.map(([v, l]) => `<div><b class="num">${fmt(v as number)}</b><span>${l}</span></div>`).join('')}</div>` : ''}
      ${o.unlocked.length ? `<div class="chip gold unlock" data-testid="unlock">${icon('style')}New pebbles: ${o.unlocked.join(', ')}</div>` : ''}`;
    card.querySelector('.hero-slot')!.replaceWith(hero.el);
    if (o.caught?.newIds.length) card.append(journalStrip(o.caught.newIds, () => this.h.onJournal()));
    if (o.mode === 'daily') {
      card.append(this.button('', 'btn primary', `${icon('share')}Share`, 'Share result', () => this.h.onShare()));
    } else {
      card.append(this.button('play-again', 'btn primary', 'Play again', 'Play again', () => this.h.onNewGame()));
    }
    if (o.leaderboard) {
      const lb = o.leaderboard;
      const b = this.button('lb-open', 'btn small', lb.label, lb.label, () => lb.open());
      card.append(b);
      lb.mount?.(b);
    }
    card.append(
      o.mode === 'daily'
        ? this.button('', 'btn ghost', `${icon('endless')}Play endless`, 'Play endless', () => this.h.onClassic())
        : this.button('', 'btn ghost', `${icon('daily')}Daily challenge`, 'Daily challenge', () => this.h.onDaily()),
    );
    this.show(card, false, 'results');
    hero.start();
    this.announce(`Game over. Score ${o.score}.${o.newBest ? ' New high score!' : ''}`);
    return card;
  }
}

/** Assign the entrance stagger order to a container's blocks (35 ms apart, capped at 8). */
function stagger(card: HTMLElement, still: boolean): void {
  for (const box of [card, ...card.querySelectorAll<HTMLElement>(':scope > .stagger')]) {
    if (!box.classList.contains('stagger')) continue;
    box.classList.toggle('static', still);
    [...box.children].forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(Math.min(i, 8))));
  }
}

/** Drag a sheet down by its grabber/header to dismiss (> 30% of its height or a fast flick). */
function dragToDismiss(sheet: HTMLElement, dismiss: () => void): void {
  let y0 = 0;
  let t0 = 0;
  let id = -1;
  let dy = 0;
  const handle = (e: PointerEvent) => !!(e.target as HTMLElement).closest('.grab, .sheet-head, .home-top');
  sheet.addEventListener('pointerdown', (e) => {
    if (!handle(e) || (e.target as HTMLElement).closest('button, a')) return;
    id = e.pointerId;
    y0 = e.clientY;
    t0 = performance.now();
    dy = 0;
    sheet.setPointerCapture(id);
    sheet.classList.add('dragging');
  });
  sheet.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.setProperty('--drag', `${dy}px`);
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1;
    sheet.classList.remove('dragging');
    const v = (dy / Math.max(1, performance.now() - t0)) * 1000;
    if (dy > sheet.offsetHeight * 0.3 || (v > 600 && dy > 24)) {
      sheet.style.setProperty('--drag', `${sheet.offsetHeight}px`);
      dismiss();
    } else sheet.style.setProperty('--drag', '0px');
  };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
}

/** "Best 12,480 · 2,840 to go" + a track toward it — the pull of almost. */
function nearMiss(score: number, best: number): string {
  if (best <= 0 || score >= best)
    return `<div class="callout">Best <b class="num">${fmt(Math.max(best, score))}</b></div>`;
  const pct = Math.max(0, Math.min(100, Math.round((score / best) * 100)));
  const gap = best - score;
  return `<div class="callout">Best <b class="num">${fmt(best)}</b>${gap > 0 && pct >= 70 ? ` · just <b class="num">${fmt(gap)}</b> short` : ''}</div>
    <div class="track" role="progressbar" aria-label="${pct}% of best" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
}

/**
 * A crisp canvas thumbnail of a creature (or its silhouette). Tiles are static and scaled by the
 * species' size class (ADR 0011, R27); the species page (`animate`) runs the idle loop at ≤ 30 fps
 * while it's on screen (blinks only under reduced motion). Redraws once the art chunk arrives.
 */
export function creatureThumb(
  sp: Species,
  px: number,
  silhouette?: string,
  golden = false,
  o: { animate?: boolean; shy?: boolean; avatar?: boolean } = {},
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const fit = o.avatar ? 'avatar' : px >= 100 ? 'detail' : 'tile'; // avatars: identity, not size
  // tiles bleed 8 px past the art box (= kit TILE_BLEED) so XL fins can break the frame (R28);
  // negative margins keep the layout box at px × px
  const bleed = fit === 'tile' ? 8 : 0;
  const W = px + 2 * bleed;
  c.width = Math.round(W * dpr);
  c.height = Math.round(W * dpr);
  c.style.width = `${W}px`;
  c.style.height = `${W}px`;
  if (bleed) c.style.margin = `-${bleed}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const nite = night();
  const expression = o.shy && !silhouette ? 'shy' : undefined;
  const draw = (t?: number) => {
    g.clearRect(0, 0, W, W);
    const still = document.documentElement.dataset.motion === 'reduced';
    drawCreature(g, sp, W / 2, W / 2, px, 0, { silhouette, golden, night: nite, fit, t, still, expression });
  };
  draw();
  const animate = () => {
    if (!o.animate || silhouette || !hasNewArt(sp.id)) return;
    let seen = false;
    let last = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (c.isConnected) seen = true;
      else if (seen || now - t0 > 3000) return; // closed (or never shown): stop
      if (now - last >= 33) {
        last = now;
        draw(now / 1000);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (hasNewArt(sp.id)) animate();
  else
    whenArtReady(() => {
      if (!hasNewArt(sp.id)) return;
      draw();
      animate();
    });
  (c as HTMLCanvasElement & { redraw?: (t?: number, sig?: number) => void }).redraw = (t, sig) => {
    g.clearRect(0, 0, W, W);
    drawCreature(g, sp, W / 2, W / 2, px, 0, {
      golden,
      night: nite,
      fit,
      t,
      ...(sig !== undefined ? { signatureAt: sig } : {}),
    });
  };
  return c;
}

/** "New in your journal" strip for end-of-game cards: framed 56 px tiles, max 4 + "+N". */
function journalStrip(ids: readonly string[], open?: () => void): HTMLElement {
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className = 'jstrip';
  wrap.setAttribute(
    'aria-label',
    `New in your journal: ${ids.map((id) => SPECIES_BY_ID.get(id)?.name).join(', ')}. Open the Beach Journal`,
  );
  wrap.innerHTML = '<div class="overline">New in your journal</div>';
  const row = document.createElement('div');
  row.className = 'jstrip-row';
  const shown = ids.slice(0, ids.length > 4 ? 3 : 4);
  for (const id of shown) {
    const sp = SPECIES_BY_ID.get(id);
    if (!sp) continue;
    const t = document.createElement('span');
    t.className = `j-tile got r-${sp.rarity}`;
    t.style.cssText = `--hab:${HABITAT_UI[sp.habitat][night() ? 1 : 0]};--hab-ring:${HABITAT_UI[sp.habitat][night() ? 1 : 0]};min-height:0;width:64px;padding:4px 2px 5px;gap:2px`;
    t.append(creatureThumb(sp, 44));
    t.insertAdjacentHTML('beforeend', pipsHtml(RARITY_RANK[sp.rarity]));
    row.append(t);
  }
  if (ids.length > 4) row.insertAdjacentHTML('beforeend', `<span class="more num">+${ids.length - 3}</span>`);
  wrap.append(row);
  if (open)
    wrap.addEventListener('click', (e) => {
      e.stopPropagation();
      open();
    });
  return wrap;
}
