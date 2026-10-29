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
import { SPECIES, type Species } from '../meta/creatures.ts';
import { found, type Journal } from '../meta/journal.ts';
import { drawCreature, hasNewArt, whenArtReady, type DrawOpts } from '../render/creatures.ts';
import { fmt } from '../render/theme.ts';
import type { ReefListModel } from './reefList.ts';
import type * as Sheets from './sheets.ts';
import type * as Results from './results.ts';
import type { GameOverOpts, PuzzleResultOpts } from './results.ts';
import { icon, type IconName } from './icons.ts';
import { pageFace } from './pageFace.ts';
import { retryable } from '../platform/lazy.ts';
import { showRetry } from './retry.ts';
import { titleShowing } from './title.ts';

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
  /** Endless / Daily: the one hint per game (the bulb beside the journal). */
  onGameHint(): void;
  onToggle(key: 'sound' | 'music' | 'haptics' | 'reducedMotion' | 'largeText'): void;
  onTheme(t: ThemePref): void;
  onSkin(): void;
  /** The results' "Try it" on a new style: switch to it now. */
  onTrySkin?(id: string): void;
  onSettings(): void;
  onJournal(): void;
  /** The About page (ADR 0016), from Settings, the home menu or the title screen. */
  onAbout(from?: 'settings' | 'menu'): void;
  /** Settings › "Open straight into the game" (skip the title screen, ADR 0015). */
  onTitleOff(): void;
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
/** The end-of-game cards chunk (results, reef cleared); same retry rule. */
const loadResults = retryable(() => import('./results.ts'));

/** The Ui surface the lazy sheets module uses. */
export interface SheetKit {
  h: UiHandlers;
  button(id: string, cls: string, html: string, label: string, fn: () => void): HTMLButtonElement;
  show(card: HTMLElement, dismiss: boolean | (() => void), kind?: string): void;
  sheet(
    title: string,
    o: { back?: () => void; backLabel?: string; full?: boolean; kind: string; close?: boolean },
  ): { card: HTMLElement; head: HTMLElement; body: HTMLElement; title: HTMLElement };
  seenFor(j: Journal): Set<string>;
  markUnseen(j: Journal): void;
  announce(text: string): void;
  /** The mode being played (the journal's Reef nudge). */
  mode(): Mode;
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

/** A second press this soon after a mode card starts asking "this one ends here" is a double tap: ignored. */
export const CONFIRM_GUARD_MS = 450;

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
  /** Endless / Daily: one hint per game, beside the journal. */
  readonly hintBtn: HTMLButtonElement;
  private mode: Mode = 'classic';
  private sr: HTMLElement;
  /** null until first used: an existing journal starts "seen" (no wall of dots after an update). */
  private seen: Set<string> | null = loadSeen();
  private seenUnsaved = false;
  private journalCount = 0;

  constructor(private readonly h: UiHandlers) {
    this.root = document.getElementById('ui')!;
    this.sr = document.getElementById('sr')!;
    this.menuBtn = this.button('menu-btn', 'icon-btn', icon('menu'), 'Menu', () => h.onOpenMenu());
    this.sideBtn = this.button('side-btn', 'icon-btn', '', 'Journal', () =>
      this.mode === 'puzzle' ? h.onHint() : h.onJournal(),
    );
    this.hintBtn = this.button('hint-btn', 'icon-btn', icon('hint'), 'Hint, one per game', () => h.onGameHint());
    this.root.append(this.menuBtn, this.hintBtn, this.sideBtn);
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

  /**
   * An inline "this run ends here" confirm on a mode card. `go()` (call from the card's press) says
   * whether to go ahead: with no run at stake at once; otherwise the first press arms the card and a
   * later one confirms. A second press within CONFIRM_GUARD_MS of arming (a double tap) is ignored,
   * as is a held key's auto-repeat, and the card disarms when focus leaves it.
   */
  private confirmOnCard(b: HTMLButtonElement, needed: boolean, ask: string): { go(): boolean; arm(): void } {
    let armedAt = -1;
    const parts = ['.mc-title', '.mc-line', '.mc-status'].map((s) => b.querySelector<HTMLElement>(s));
    const was = parts.map((e) => e?.innerHTML ?? '');
    const label = b.getAttribute('aria-label') ?? '';
    const arm = () => {
      armedAt = performance.now();
      b.classList.add('confirm');
      parts[0]!.textContent = ask;
      parts[1]!.textContent = 'This one ends here.';
      parts[2]!.textContent = 'Start new';
      b.setAttribute('aria-label', `${ask} This one ends here. Press again to start new`);
      this.announce(`${ask} This one ends here. Press again to confirm.`);
    };
    const disarm = () => {
      if (armedAt < 0) return;
      armedAt = -1;
      b.classList.remove('confirm');
      parts.forEach((e, i) => e && (e.innerHTML = was[i]!));
      b.setAttribute('aria-label', label);
    };
    if (needed) {
      // Enter clicks on every auto-repeat keydown: a held key must not arm *and* confirm
      b.addEventListener('keydown', (e) => {
        if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
      });
      b.addEventListener('blur', disarm);
    }
    return {
      go: () => {
        if (!needed) return true;
        if (armedAt < 0) {
          arm();
          return false;
        }
        return performance.now() - armedAt >= CONFIRM_GUARD_MS;
      },
      arm: () => needed && arm(),
    };
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
    this.hintBtn.hidden = puzzle; // Reefs have their own hint (the side button)
    if (journal) this.markUnseen(journal);
  }

  /** The game-hint bulb: shown in Endless and Daily; dimmed once this game's hint is used. */
  setGameHint(shown: boolean, used: boolean): void {
    this.hintBtn.hidden = !shown;
    this.hintBtn.classList.toggle('used', used);
    this.hintBtn.setAttribute('aria-label', used ? 'Hint used for this game' : 'Hint, one per game');
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
    // never stored: everything already caught counts as seen (saves from before the dots). Written
    // once there's something to remember, so a fresh (or just erased) beach stores nothing.
    if (!this.seen) {
      this.seen = new Set(Object.keys(j.entries));
      this.seenUnsaved = true;
    }
    if (this.seenUnsaved && Object.keys(j.entries).length) {
      saveSeen(this.seen);
      this.seenUnsaved = false;
    }
    return this.seen;
  }

  /**
   * After the first-ever catch card: a gentle glow on the journal button and a small bobbing arrow
   * under it ("Your journal") for a few seconds, or until it's pressed. No creature flies there.
   */
  pointAtJournal(): void {
    if (this.mode === 'puzzle') return; // the side button is the hint in reefs
    const b = this.sideBtn;
    this.root.querySelector('.journal-guide')?.remove();
    b.classList.add('guide');
    const tip = document.createElement('div');
    tip.className = 'journal-guide';
    tip.setAttribute('aria-hidden', 'true');
    tip.innerHTML = '<i></i><span>Your journal</span>';
    const r = b.getBoundingClientRect();
    const root = this.root.getBoundingClientRect();
    tip.style.top = `${r.bottom - root.top + 8}px`;
    // right-aligned under the button (never off the screen edge), the arrow under its centre
    tip.style.right = `${root.right - r.right}px`;
    tip.style.setProperty('--arrow-x', `${r.width / 2 - 7}px`);
    this.root.append(tip);
    const done = (): void => {
      b.classList.remove('guide');
      tip.classList.add('leaving');
      setTimeout(() => tip.remove(), 260);
      b.removeEventListener('click', done);
    };
    b.addEventListener('click', done);
    setTimeout(done, 4800);
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
    // behind the title screen they stay out of reach even when a sheet opened from it closes
    for (const b of [this.menuBtn, this.sideBtn, this.hintBtn]) b.toggleAttribute('inert', on || titleShowing());
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
  private sheet(
    title: string,
    o: { back?: () => void; backLabel?: string; full?: boolean; kind: string; close?: boolean },
  ) {
    const card = document.createElement('div');
    card.className = `sheet${o.full ? ' full' : ''}`;
    card.dataset.kind = o.kind;
    const head = document.createElement('div');
    head.className = 'sheet-head';
    if (o.back) head.append(this.button('', 'round', icon('back'), o.backLabel ?? 'Back to journal', o.back));
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
  showMenu(
    p: Profile,
    mode: Mode,
    canResume: boolean,
    journalCount = 0,
    dailyDone = false,
    /** What Resume goes back to, e.g. "Endless · 3,150" or "Reef 28". */
    _resumeWhat = '',
    /**
     * An Endless (or Daily) run is in progress: starting that mode over asks once, inline, on its
     * card ("This one ends here").
     */
    confirmNew = false,
    /** Open with that card already asking (a Play elsewhere, e.g. on a leaderboard, mid-run). */
    armed = false,
  ): void {
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
    if (chips.length) {
      const c = document.createElement('div');
      c.className = 'home-chips';
      c.innerHTML = chips.join('');
      card.append(c);
    }
    if (canResume)
      card.append(
        this.button('menu-resume', 'btn primary', `${icon('play', { filled: true })}Resume`, 'Resume', () =>
          this.h.onResume(),
        ),
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
    ): HTMLButtonElement => {
      const b = this.button(
        '',
        `mode-card${current ? ' current' : ''}`,
        `<span class="mc-ic">${icon(ic)}</span><span><span class="mc-title">${title}</span><span class="mc-line">${line}</span></span><span class="mc-status ${statusCls}">${status}</span>`,
        label,
        go,
      );
      modes.append(b);
      return b;
    };
    const endless = card3(
      'endless',
      'Endless',
      'Play on for a high score',
      mode === 'classic' ? 'New game' : 'Play',
      mode === 'classic' ? 'New game' : 'Endless mode',
      mode === 'classic',
      () => {
        if (mode !== 'classic') return this.h.onClassic();
        if (endlessAsk.go()) this.h.onNewGame();
      },
      'go',
    );
    const daily = card3(
      'daily',
      'Daily',
      'One board for everyone today',
      dailyDone ? `${icon('check', { size: 16 })}` : p.daily.current > 0 ? `Day ${p.daily.current + 1}` : 'Today',
      mode === 'daily' ? 'Replay the daily challenge' : 'Daily challenge',
      mode === 'daily',
      () => {
        if (mode !== 'daily') return this.h.onDaily();
        if (dailyAsk.go()) this.h.onDaily();
      },
      dailyDone ? '' : 'go',
    );
    // a run in progress: the first press asks, right on the card; a second one starts over
    const endlessAsk = this.confirmOnCard(endless, mode === 'classic' && confirmNew, 'Start a new game?');
    const dailyAsk = this.confirmOnCard(daily, mode === 'daily' && confirmNew, "Replay today's board?");
    if (armed) (mode === 'daily' ? dailyAsk : endlessAsk).arm();
    card3(
      'reef',
      'Reefs',
      'Replay any reef you like',
      `${p.puzzle.solved.length} cleared`,
      mode === 'puzzle' ? 'All reefs' : 'Reef puzzles',
      mode === 'puzzle',
      // always the list of reefs: continue, or go back and replay any you've done
      () => this.h.onPuzzleList(),
    );
    card.append(modes);
    const links = document.createElement('div');
    links.className = 'home-links';
    links.append(
      this.button(
        '',
        'link-tile',
        `<span class="tile-ic">${icon('journal')}<small class="num tile-badge">${journalCount}/${SPECIES.length}</small></span><span>Journal</span>`,
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
      this.button('menu-about', 'link-tile', `${icon('info')}<span>About</span>`, 'About', () =>
        this.h.onAbout('menu'),
      ),
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
  /** Why the ocean (ADR 0016): the letter, the no-funding pledge and the charities. */
  showAbout(j: Journal, back?: { label: string; fn: () => void }): void {
    this.withSheets((m) => m.showAbout(this.kit(), j, back));
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
      announce: (t) => this.announce(t),
      mode: () => this.mode,
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

  // ─────────────────────────────────────────────────────────────────────────── results (lazy)
  /** Prefetch the end-of-game cards chunk (results.ts + its CSS) at idle. */
  prefetchResults(): void {
    void loadResults().catch(() => undefined);
  }
  /**
   * Build a card from the results chunk. Resolves null if `still()` turned false while it loaded
   * (the player moved on). A failed load offers the retry chip; tapping it tries again.
   */
  private withResults<T>(build: (m: typeof Results) => T, still: () => boolean): Promise<T | null> {
    return loadResults().then(
      (m) => (still() ? build(m) : null),
      () => new Promise<T | null>((done) => showRetry(() => void this.withResults(build, still).then(done))),
    );
  }
  showPuzzleResult(o: PuzzleResultOpts, still: () => boolean = () => true): void {
    void this.withResults((m) => m.showPuzzleResult(this.kit(), o), still);
  }
  /** The game-over card; resolves with it once shown. */
  showGameOver(o: GameOverOpts, still: () => boolean = () => true): Promise<HTMLElement | null> {
    return this.withResults((m) => m.showGameOver(this.kit(), o), still);
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

/**
 * A crisp canvas thumbnail of a creature (or its silhouette). Tiles are static and scaled by the
 * species' size class (ADR 0011, R27); the species page (`animate`) runs the idle loop at ≤ 30 fps
 * while it's on screen (blinks only under reduced motion). Redraws once the art chunk arrives.
 */
export type ThumbRedraw = (t?: number, sig?: number, expression?: NonNullable<DrawOpts['expression']>) => void;

export function creatureThumb(
  sp: Species,
  px: number,
  silhouette?: string,
  golden = false,
  o: {
    animate?: boolean;
    shy?: boolean;
    avatar?: boolean;
    /** Awake even if the species dozes on this theme (journal: the per-page dozing cap). */
    awake?: () => boolean;
    /** Species page, first view of a new catch: dozing face → blink → awake, and stays awake. */
    wake?: boolean;
  } = {},
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
  const shyFace = o.shy && !silhouette ? 'shy' : undefined;
  // a species page opens eyes-open (pageFace); the clock starts at its first animated draw
  let t0 = -1;
  const face = (t: number | undefined, still: boolean) => {
    const now = t === undefined ? 0 : t * 1000;
    if (t0 < 0 && t !== undefined) t0 = now;
    return pageFace(
      { animate: o.animate, wake: o.wake, shy: !!shyFace, awake: o.awake?.() ?? false, still },
      t0 < 0 ? null : now - t0,
    );
  };
  const draw = (t?: number) => {
    g.clearRect(0, 0, W, W);
    const still = document.documentElement.dataset.motion === 'reduced';
    drawCreature(g, sp, W / 2, W / 2, px, 0, { silhouette, golden, night: nite, fit, t, still, ...face(t, still) });
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
  // the journal's ambient life (sheets.ts JournalLife): a signature at progress `sig`, or a face
  (c as HTMLCanvasElement & { redraw?: ThumbRedraw }).redraw = (t, sig, expression) => {
    g.clearRect(0, 0, W, W);
    drawCreature(g, sp, W / 2, W / 2, px, 0, {
      golden,
      night: nite,
      fit,
      t,
      awake: o.awake?.() ?? false,
      ...(sig !== undefined ? { signatureAt: sig } : {}),
      ...(expression ? { expression } : {}),
    });
  };
  return c;
}
