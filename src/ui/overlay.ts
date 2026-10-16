/**
 * DOM overlays: menu button, daily button, menu sheet, game-over card. DOM (not canvas) so they're
 * accessible (focus, screen readers) and crisp. Kept tiny: the board is the interface.
 */
import type { Profile, ThemePref } from '../platform/storage.ts';
import { SKINS } from '../meta/unlocks.ts';
import { HABITATS, SPECIES, SPECIES_BY_ID, type Species } from '../meta/creatures.ts';
import { found, type Journal } from '../meta/journal.ts';
import { drawCreature, hasNewArt, whenArtReady } from '../render/creatures.ts';
import { buildReefList, type ReefListModel } from './reefList.ts';

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
}

const ICON_MENU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>`;
let lastInput: 'key' | 'pointer' = 'pointer';
addEventListener('keydown', () => (lastInput = 'key'), true);
addEventListener('pointerdown', () => (lastInput = 'pointer'), true);

const ICON_HINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>`;
// Daily: a sun coming up over a wave
const ICON_DAILY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a5 5 0 0 1 10 0"/><path d="M12 5v2M5.5 8.5l1.4 1.4M18.5 8.5l-1.4 1.4"/><path d="M3 18c1.5 0 1.5-1.2 3-1.2S7.5 18 9 18s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/></svg>`;

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
    // the reef HUD already says where you are; the tag only marks the Daily
    this.modeTag.textContent = mode === 'daily' ? 'Daily' : '';
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

  /** Show a card built elsewhere (leaderboard sheets). `dismiss`: true = Resume, or a custom action. */
  present(card: HTMLElement, dismiss: boolean | (() => void)): void {
    this.show(card, dismiss);
  }

  private show(card: HTMLElement, dismiss: boolean | (() => void)): void {
    const dismissable = dismiss !== false;
    const onDismiss = typeof dismiss === 'function' ? dismiss : () => this.h.onResume();
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
        if (e.target === v) onDismiss();
      });
    v.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dismissable) {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'Tab') {
        // keep focus inside the dialog
        const f = [...v.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]')];
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
    // keyboard users land on the main action; touch users get no focus ring (focus the dialog itself)
    if (lastInput === 'key') (card.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
    else {
      v.tabIndex = -1;
      v.focus({ preventScroll: true });
    }
  }

  showMenu(p: Profile, mode: 'classic' | 'daily' | 'puzzle', canResume: boolean, journalCount = 0): void {
    const card = document.createElement('div');
    card.className = 'card';
    const stats = [
      [p.best, 'Best'],
      [p.stats.bestPocket, 'Top lagoon'],
      [p.daily.current, 'Streak'],
      [p.puzzle.solved.length, 'Reefs'],
    ].filter(([v]) => (v as number) > 0);
    card.innerHTML = `<h2>Lagooner Beach</h2>
      <div class="sub">Close a loop. Water fills it, the ring pops.</div>
      ${stats.length ? `<div class="stats" style="grid-template-columns:repeat(${stats.length},1fr)">${stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>` : ''}`;
    if (canResume) card.append(this.button('', 'btn primary', 'Resume', 'Resume', () => this.h.onResume()));
    if (mode === 'puzzle') {
      card.append(
        this.button('', canResume ? 'btn' : 'btn primary', 'Restart reef', 'Restart reef', () =>
          this.h.onPuzzleRetry(),
        ),
      );
      card.append(this.button('', 'btn', 'All reefs', 'All reefs', () => this.h.onPuzzleList()));
      card.append(this.button('', 'btn', 'Classic', 'Classic mode', () => this.h.onClassic()));
    } else {
      card.append(this.button('', canResume ? 'btn' : 'btn primary', 'New game', 'New game', () => this.h.onNewGame()));
      card.append(
        mode === 'daily'
          ? this.button('', 'btn', 'Classic', 'Classic mode', () => this.h.onClassic())
          : this.button('', 'btn', 'Daily challenge', 'Daily challenge', () => this.h.onDaily()),
      );
      card.append(this.button('', 'btn', 'Reef puzzles', 'Reef puzzles', () => this.h.onPuzzles()));
    }
    card.append(
      this.button('', 'btn', `Beach Journal · ${journalCount}/${SPECIES.length}`, 'Beach Journal', () =>
        this.h.onJournal(),
      ),
    );
    if (this.h.onLeaderboards)
      card.append(this.button('menu-lb', 'btn', 'Leaderboards', 'Leaderboards', () => this.h.onLeaderboards?.()));
    card.append(this.button('', 'btn ghost', 'Settings', 'Settings', () => this.h.onSettings()));
    this.show(card, canResume);
  }

  showSettings(p: Profile): void {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h2>Settings</h2>';
    const s = p.settings;
    const rm = s.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rows = document.createElement('div');
    const sw = (label: string, on: boolean, key: 'sound' | 'music' | 'haptics' | 'reducedMotion' | 'largeText') => {
      const r = document.createElement('div');
      r.className = 'row';
      r.innerHTML = `<span>${label}</span>`;
      const b = this.button('', 'switch', '<i></i>', label, () => this.h.onToggle(key));
      b.setAttribute('role', 'switch');
      b.setAttribute('aria-checked', String(on));
      r.append(b);
      rows.append(r);
    };
    sw('Sound', s.sound, 'sound');
    sw('Music', s.music, 'music');
    sw('Haptics', s.haptics, 'haptics');
    sw('Reduced motion', rm, 'reducedMotion');
    sw('Larger text', !!s.largeText, 'largeText');
    const tr = document.createElement('div');
    tr.className = 'row';
    tr.innerHTML = '<span>Theme</span>';
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', 'Theme');
    for (const [t, l] of [
      ['auto', 'Auto'],
      ['day', 'Day'],
      ['night', 'Night'],
    ] as const) {
      const b = this.button('', 'seg-b', l, `Theme ${l}`, () => this.h.onTheme(t));
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(s.theme === t));
      seg.append(b);
    }
    tr.append(seg);
    rows.append(tr);
    const sk = document.createElement('div');
    sk.className = 'row';
    sk.innerHTML = '<span>Style</span>';
    const cur = SKINS.find((k) => k.id === p.settings.skin)?.name ?? 'Pebble';
    sk.append(
      this.button('', 'toggle', `${cur.replace(' (high contrast)', '')} ›`, `Style: ${cur}. Change`, () =>
        this.h.onSkin(),
      ),
    );
    rows.append(sk);
    card.append(rows);
    const next = SKINS.find((k) => !p.unlocked.includes(k.id) && k.hint);
    if (next) {
      const hint = document.createElement('div');
      hint.className = 'foot';
      const left = SKINS.filter((k) => !p.unlocked.includes(k.id)).length;
      hint.textContent = `${left} more style${left > 1 ? 's' : ''} to find · next: ${next.hint.toLowerCase()}`;
      card.append(hint);
    }
    if (p.stats.games) {
      const foot = document.createElement('div');
      foot.className = 'foot';
      foot.textContent = `${p.stats.games} games · ${p.stats.captures} lagoons captured`;
      card.append(foot);
    }
    const about = document.createElement('div');
    about.className = 'foot';
    about.innerHTML = `Lagooner Beach ${__APP_VERSION__} · no ads, no tracking · <a href="./privacy.html" target="_blank" rel="noopener" style="color:inherit">Privacy</a>`;
    card.append(about);
    let armed = 0;
    const erase = this.button('', 'btn ghost', 'Erase all progress', 'Erase all progress', () => {
      if (Date.now() - armed < 3000) return this.h.onErase();
      armed = Date.now();
      erase.textContent = 'Tap again to erase everything';
      setTimeout(() => (erase.textContent = 'Erase all progress'), 3000);
    });
    card.append(erase);
    card.append(this.button('', 'btn primary', 'Done', 'Done', () => this.h.onResume()));
    this.show(card, true);
  }

  /** The Beach Journal: every creature by habitat; found ones in colour, unknowns as silhouettes with a hint. */
  showJournal(j: Journal): void {
    const card = document.createElement('div');
    card.className = 'card reefs journal';
    const n = found(j);
    const golden = Object.values(j.entries).reduce((a, e) => a + (e.golden ? 1 : 0), 0);
    card.innerHTML = `<h2>Beach Journal</h2><div class="big" style="font-size:30px;margin:2px 0">${n} / ${SPECIES.length}</div><div class="foot" style="margin:0 0 6px">${[golden ? `${golden} golden` : '', j.total ? `${j.total} caught and released` : ''].filter(Boolean).join(' · ') || 'Close a loop to catch your first creature'}</div>`;
    const scroller = document.createElement('div');
    scroller.className = 'reef-scroll';
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--dim').trim() || '#8A7B69';
    for (const h of HABITATS) {
      const list = SPECIES.filter((sp) => sp.habitat === h.id);
      const got = list.filter((sp) => j.entries[sp.id]).length;
      const head = document.createElement('div');
      head.className = 'tier';
      head.textContent = `${h.name} · ${got}/${list.length}`;
      const grid = document.createElement('div');
      grid.className = 'j-grid';
      for (const sp of list) {
        const e = j.entries[sp.id];
        const b = this.button(
          '',
          `j-tile${e ? ' got' : ''}`,
          '',
          e ? `${sp.name}, caught ${e.count}` : `Unknown creature. Hint: ${sp.hint}`,
          () => this.showSpecies(sp, j),
        );
        b.append(creatureThumb(sp, 54, e ? undefined : ink, (e?.golden ?? 0) > 0));
        const label = document.createElement('span');
        label.textContent = e ? sp.name : '';
        b.append(label);
        grid.append(b);
      }
      scroller.append(head, grid);
    }
    card.append(scroller);
    card.append(this.button('', 'btn', 'Close', 'Close', () => this.h.onResume()));
    this.show(card, true);
  }

  private showSpecies(sp: Species, j: Journal): void {
    const e = j.entries[sp.id];
    const card = document.createElement('div');
    card.className = 'card';
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--dim').trim() || '#8A7B69';
    const rarity = sp.rarity[0]!.toUpperCase() + sp.rarity.slice(1);
    card.innerHTML = `<h2>${e ? rarity : 'Not found yet'}</h2>`;
    const art = creatureThumb(sp, 150, e ? undefined : ink, (e?.golden ?? 0) > 0, {
      animate: true,
      shy: e?.count === 1,
    });
    art.style.margin = '6px auto';
    art.style.display = 'block';
    card.append(art);
    const info = document.createElement('div');
    const size = (cm: number) => (cm >= 100 ? `${(cm / 100).toFixed(1)} m` : `${cm} cm`);
    info.innerHTML = e
      ? `<div class="big" style="font-size:28px">${sp.name}</div><div class="sub">${sp.flavor}</div>
         <div class="stats" style="grid-template-columns:repeat(3,1fr)"><div><b>${e.count}</b><span>Caught</span></div><div><b>${size(e.best)}</b><span>Biggest</span></div><div><b>${e.golden || '—'}</b><span>Golden</span></div></div>
         <div class="foot">First caught ${prettyDate(e.first)}</div>`
      : `<div class="big" style="font-size:28px">???</div><div class="sub">Hint: ${sp.hint}</div>`;
    card.append(info);
    card.append(this.button('', 'btn primary', 'Back', 'Back to journal', () => this.showJournal(j)));
    this.show(card, true);
  }

  /** Reefs by chapter, shipped and endless (src/ui/reefList.ts); tap one to play it. */
  showReefs(m: ReefListModel): void {
    const card = buildReefList(
      m,
      (id, cls, html, label, fn) => this.button(id, cls, html, label, fn),
      (i) => this.h.onPuzzlePick(i),
      () => this.h.onResume(),
    );
    this.show(card, true);
  }

  showPuzzleResult(o: {
    solved: boolean;
    index: number;
    total: number;
    cleared: number;
    newIds?: string[];
    /** Replaces "N of M reefs cleared" (endless reefs: chapter progress). */
    progress?: string;
  }): void {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = o.solved
      ? `<h2>Reef ${o.index + 1}</h2><div class="big" data-testid="puzzle-result">Cleared</div><div class="sub">${o.progress ?? `${o.cleared} of ${o.total} reefs cleared`}</div>`
      : `<h2>Reef ${o.index + 1}</h2><div class="big" data-testid="puzzle-result">So close</div><div class="sub">Every piece must be placed and every pebble popped.</div>`;
    if (o.newIds?.length) card.append(newSpeciesRow(o.newIds, () => this.h.onJournal()));
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
    caught?: { count: number; newIds: string[] };
    /** Leaderboard hook (Daily/Classic): a button that opens name entry → board; `mount` lets the
     *  leaderboard module update its label (e.g. "#37 this week") when a result arrives. */
    leaderboard?: { label: string; open(): void; mount?(b: HTMLButtonElement): void };
  }): HTMLElement {
    const card = document.createElement('div');
    card.className = 'card';
    const stats = [
      [o.moves, 'Moves'],
      [o.lagoon, 'Top lagoon'],
      [o.caught?.count ?? 0, 'Caught'],
      [o.dailyStreak, 'Streak'],
    ].filter(([v]) => (v as number) > 0);
    card.innerHTML = `<h2>${o.mode === 'daily' ? 'Daily complete' : 'No room left'}</h2>
      <div class="big" data-testid="final-score">${o.score}</div>
      <div class="sub">${o.newBest ? '<span class="best-flash">NEW BEST</span>' : nearMiss(o.score, o.best)}</div>
      <div class="stats" style="grid-template-columns:repeat(${stats.length},1fr)">${stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
      ${o.unlocked.length ? `<div class="sub best-flash" data-testid="unlock">New pebbles: ${o.unlocked.join(', ')}</div>` : ''}`;
    if (o.caught?.newIds.length) card.append(newSpeciesRow(o.caught.newIds, () => this.h.onJournal()));
    if (o.mode === 'daily') {
      card.append(this.button('', 'btn primary', 'Share', 'Share result', () => this.h.onShare()));
      card.append(this.button('', 'btn', 'Play classic', 'Play classic', () => this.h.onClassic()));
    } else {
      card.append(this.button('play-again', 'btn primary', 'Play again', 'Play again', () => this.h.onNewGame()));
      card.append(this.button('', 'btn', 'Daily challenge', 'Daily challenge', () => this.h.onDaily()));
    }
    if (o.leaderboard) {
      const lb = o.leaderboard;
      const b = this.button('lb-open', 'btn', lb.label, lb.label, () => lb.open());
      card.querySelector('.btn.primary')!.after(b);
      lb.mount?.(b);
    }
    this.show(card, false);
    this.announce(`Game over. Score ${o.score}.${o.newBest ? ' New best!' : ''}`);
    return card;
  }
}

/** "Best 1200" plus a progress bar toward it — the pull of almost. */
function nearMiss(score: number, best: number): string {
  if (best <= 0 || score >= best) return `Best ${Math.max(best, score)}`;
  const pct = Math.max(0, Math.min(100, Math.round((score / best) * 100)));
  const gap = best - score;
  return `<div>Best ${best}${gap > 0 && pct >= 70 ? ` · just ${gap} short` : ''}</div>
    <div class="bar-label">${pct}% of best</div><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
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
  c.width = Math.round(px * dpr);
  c.height = Math.round(px * dpr);
  c.style.width = `${px}px`;
  c.style.height = `${px}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const night = document.documentElement.dataset.theme === 'night';
  const fit = o.avatar ? 'avatar' : px >= 100 ? 'detail' : 'tile'; // avatars: identity, not size
  const expression = o.shy && !silhouette ? 'shy' : undefined;
  const draw = (t?: number) => {
    g.clearRect(0, 0, px, px);
    const still = document.documentElement.dataset.motion === 'reduced';
    drawCreature(g, sp, px / 2, px / 2, px, 0, { silhouette, golden, night, fit, t, still, expression });
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
  return c;
}

/** "New in your journal" strip for end-of-game cards. */
function newSpeciesRow(ids: readonly string[], open?: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'new-species';
  wrap.innerHTML = '<div class="tier">New in your journal</div>';
  const row = document.createElement('div');
  row.className = 'ns-row';
  for (const id of ids.slice(0, 6)) {
    const sp = SPECIES_BY_ID.get(id);
    if (!sp) continue;
    const cell = document.createElement('div');
    cell.className = 'ns';
    cell.append(creatureThumb(sp, 52));
    const n = document.createElement('span');
    n.textContent = sp.name;
    cell.append(n);
    row.append(cell);
  }
  wrap.append(row);
  if (open) {
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('aria-label', 'Open the Beach Journal');
    wrap.tabIndex = 0;
    wrap.style.cursor = 'pointer';
    wrap.addEventListener('click', open);
  }
  return wrap;
}

/** 2026-10-16 → "Oct 16" (current year) or "Oct 16, 2025". */
function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const s = `${months[Number(m[2]) - 1]} ${Number(m[3])}`;
  return Number(m[1]) === new Date().getFullYear() ? s : `${s}, ${m[1]}`;
}
