/**
 * Results hero (UI_DESIGN §6.6 / §7.3, ADR 0012): the score counts up (tabular Nunito, no jitter);
 * on a record, the moment it passes the old best it turns gold, a "NEW HIGH SCORE" ribbon with a
 * crown drops in (display type), confetti fires from both card edges (~2 s), and the caller plays the
 * fanfare + a heavy haptic. Reduced motion: final state at once, no confetti — same information.
 * Never delays the buttons: they're pressable from the first frame.
 *
 * A lazy chunk (with tiles.css + results.css): the game-over and reef-result cards are built here
 * (overlay.ts proxies them, main prefetches the chunk at idle), so the first frame of play skips them.
 */
import './tiles.css';
import './results.css';
import { SPECIES_BY_ID } from '../meta/creatures.ts';
import { fmt } from '../render/theme.ts';
import { icon } from './icons.ts';
import { creatureThumb, type SheetKit } from './overlay.ts';
import { HABITAT_UI, RARITY_RANK, pipsHtml } from './rarity.ts';

const CROWN = icon('crown', { filled: true });
const night = (): boolean => document.documentElement.dataset.theme === 'night';

export interface HeroOpts {
  score: number;
  best: number;
  /** Best before this game (0 = first game ever, no record moment). */
  prevBest: number;
  newBest: boolean;
  reducedMotion: boolean;
  /** Fires once when the record moment lands (fanfare + haptic live in the caller). */
  onRecord?: () => void;
  /** Fires once when the hero has settled (count-up and ribbon done). */
  onSettled?: () => void;
  /** "Best 1200" + bar, when it isn't a record. */
  nearMiss: string;
}

export const COUNT_MS = 800;

export function resultsHero(o: HeroOpts): { el: HTMLElement; start: () => void } {
  const el = document.createElement('div');
  el.className = 'res-hero';
  // the visible digits count up; the real value is always in the DOM (screen readers, tests)
  el.innerHTML = `<div class="big res-score"><span class="res-count" aria-hidden="true">${o.reducedMotion ? fmt(o.score) : 0}</span><span class="sr-only" data-testid="final-score">${o.score}</span></div>
    <div class="res-sub">${
      o.newBest
        ? `<div class="res-ribbon" data-testid="new-high-score">${CROWN}PERSONAL BEST</div>${o.prevBest > 0 ? `<div class="res-was">was <s class="num">${fmt(o.prevBest)}</s></div>` : ''}`
        : o.nearMiss
    }</div>`;
  const scoreEl = el.querySelector('.res-count') as HTMLElement;
  let landed = false;
  const land = () => {
    if (landed || !o.newBest) return;
    landed = true;
    el.classList.add('record');
    requestAnimationFrame(() => el.classList.add('landed'));
    if (!o.reducedMotion) confetti((el.closest('.card') as HTMLElement | null) ?? el);
    o.onRecord?.();
  };
  const start = () => {
    if (o.reducedMotion || o.score <= 0) {
      scoreEl.textContent = fmt(o.score);
      land();
      o.onSettled?.();
      return;
    }
    const t0 = performance.now();
    // a record crosses the old best around 70% of the count, so the gold lands on the climb
    const step = () => {
      // the card was dismissed (next game): stop, and never fire the record fanfare over it
      if (!el.isConnected) return;
      const k = Math.min(1, (performance.now() - t0) / COUNT_MS);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(o.score * e);
      scoreEl.textContent = fmt(v);
      if (o.newBest && v > o.prevBest) land();
      if (k < 1) requestAnimationFrame(step);
      else {
        scoreEl.textContent = fmt(o.score);
        land();
        setTimeout(() => el.isConnected && o.onSettled?.(), o.newBest ? 420 : 0);
      }
    };
    requestAnimationFrame(step);
  };
  return { el, start };
}

/**
 * Confetti from both edges of the card (~2 s): gold and coral flecks and foam rings fired up and
 * inward from the left and right sides, fluttering down past the score. A fixed overlay canvas
 * (the card scrolls and would clip it); ≤ 64 particles; gone when the card is.
 */
export const CONFETTI_MS = 2100;
function confetti(card: HTMLElement): void {
  const r = card.getBoundingClientRect();
  const PAD = 28;
  const W = Math.round(r.width + PAD * 2);
  const H = Math.round(Math.min(innerHeight, r.height + 120));
  const c = document.createElement('canvas');
  c.className = 'res-confetti';
  const dpr = Math.min(3, devicePixelRatio || 1);
  c.width = W * dpr;
  c.height = H * dpr;
  Object.assign(c.style, {
    position: 'fixed',
    left: `${r.left - PAD}px`,
    top: `${Math.max(0, r.top - 60)}px`,
    width: `${W}px`,
    height: `${H}px`,
    pointerEvents: 'none',
    zIndex: '60',
  });
  document.body.append(c);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const y0 = Math.min(H * 0.5, r.top - Math.max(0, r.top - 60) + r.height * 0.42);
  const parts = Array.from({ length: 64 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1; // -1: from the left edge
    return {
      x: side < 0 ? PAD + 4 : W - PAD - 4,
      y: y0 + (rnd() - 0.5) * 80,
      vx: -side * (90 + rnd() * 260),
      vy: -(330 + rnd() * 380),
      delay: rnd() * 0.45,
      r: 2.5 + rnd() * 3.5,
      foam: i % 5 === 0,
      color: ['#F2C14E', '#FFE08A', '#F2795B', '#5CC8E0', '#F6A6B2'][i % 5]!,
      spin: (rnd() - 0.5) * 14,
      wob: 4 + rnd() * 6,
      ph: rnd() * 6.28,
    };
  });
  const t0 = performance.now();
  const life = CONFETTI_MS / 1000;
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    g.clearRect(0, 0, W, H);
    if (t > life || !card.isConnected) return c.remove();
    for (const p of parts) {
      const u = t - p.delay;
      if (u <= 0) continue;
      // light air drag so flecks hang, then flutter down
      const drag = 1 - Math.exp(-1.6 * u);
      const x = p.x + (p.vx / 1.6) * drag + Math.sin(u * p.wob + p.ph) * 7 * Math.min(1, u * 2);
      const y = p.y + (p.vy / 1.6) * drag + 0.5 * 420 * u * u * 0.55;
      g.globalAlpha = u > life - 0.6 - p.delay ? Math.max(0, (life - p.delay - u) / 0.6) : 1;
      if (p.foam) {
        g.strokeStyle = '#FFFFFF';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(x, y, p.r * 1.3, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.save();
        g.translate(x, y);
        g.rotate(p.spin * u);
        g.scale(1, Math.cos(u * p.wob * 1.3 + p.ph)); // tumbling
        g.fillStyle = p.color;
        g.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        g.restore();
      }
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

type Mode = 'classic' | 'daily' | 'puzzle';
/** What the end-of-game cards need from the Ui (a subset of the sheets' kit). */
type Kit = Pick<SheetKit, 'h' | 'button' | 'show' | 'announce'>;

export interface PuzzleResultOpts {
  solved: boolean;
  index: number;
  total: number;
  cleared: number;
  newIds?: string[];
  /** Replaces "N of M reefs cleared" (endless reefs: chapter progress). */
  progress?: string;
  /** Chapter segments (20; true = cleared). */
  segs?: readonly boolean[];
  /** This clear completed a chapter: "Chapter 2 complete · Ebbtide Bight". */
  chapterDone?: { chapter: number; name: string; next?: { chapter: number; name: string; from: number; to: number } };
  /** A small reward line: no hints (star) or with a hint (shell), a new depth record. */
  reward?: { first: boolean; pure: boolean; depth?: number };
}

export function showPuzzleResult(k: Kit, o: PuzzleResultOpts): void {
  const card = document.createElement('div');
  card.className = 'card stagger';
  const segs = o.segs
    ? `<div class="segs" aria-hidden="true">${o.segs.map((s) => `<i${s ? ' class="on"' : ''}></i>`).join('')}</div>`
    : '';
  const rw = o.reward;
  const bits: string[] = [];
  if (rw?.pure) bits.push(`${icon('star', { filled: true, cls: 'rw-star' })}No hints: gold star`);
  // a clear that leaned on a hint gets the shell, and says what the star asks for
  else if (rw?.first) bits.push(`${icon('shell', { filled: true, cls: 'rw-shell' })}Cleared with a hint`);
  if (rw?.depth) bits.push(`New depth <b class="num">${rw.depth} m</b>`);
  const reward = bits.length ? `<div class="reef-reward" data-testid="reef-reward">${bits.join('<i>·</i>')}</div>` : '';
  const nx = o.chapterDone?.next;
  // what's below: the next chapter and its depth band, the marker sinking toward it once
  const nextLine = nx
    ? `<div class="chapter-next" data-testid="chapter-next"><span class="sink" aria-hidden="true">${icon('chevronDown')}</span>Next: Chapter ${nx.chapter} · ${nx.name} · <span class="num">${nx.from}–${nx.to} m</span></div>`
    : '';
  const chapterLine = o.chapterDone
    ? `<div class="chapter-done" data-testid="chapter-done">Chapter ${o.chapterDone.chapter} complete · ${o.chapterDone.name}</div>${nextLine}`
    : '';
  card.innerHTML = o.solved
    ? `<div class="overline">Reef ${o.index + 1}</div><h2 class="res-word win" data-testid="puzzle-result">Cleared</h2>${reward}<div class="chapter-progress">${chapterLine || `<div class="callout">${o.progress ?? `${o.cleared} of ${o.total} reefs cleared`}</div>`}${segs}</div>`
    : `<div class="overline">Reef ${o.index + 1}</div><h2 class="res-word" data-testid="puzzle-result">So close</h2><p class="callout">Every piece must be placed and every pebble popped.</p>`;
  if (o.newIds?.length) card.append(journalStrip(o.newIds, () => k.h.onJournal()));
  if (o.solved) {
    if (o.index + 1 < o.total)
      card.append(
        k.button('next-reef', 'btn primary', `Next reef${icon('chevronRight')}`, 'Next reef', () => k.h.onPuzzleNext()),
      );
    card.append(k.button('', 'btn ghost', 'Endless', 'Endless mode', () => k.h.onClassic()));
  } else {
    card.append(
      k.button('retry-reef', 'btn primary', `${icon('restart')}Try again`, 'Try again', () => k.h.onPuzzleRetry()),
    );
    card.append(k.button('', 'btn ghost', 'Skip', 'Skip to next reef', () => k.h.onPuzzleNext()));
  }
  k.show(card, false, 'reef-result');
  k.announce(o.solved ? `Reef ${o.index + 1} cleared` : 'Not cleared. Try again.');
}

export interface GameOverOpts {
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
}

export function showGameOver(k: Kit, o: GameOverOpts): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card results stagger';
  // the very first game sets the first best: say so, not "No room left · 3,995 · Best 3,995"
  const firstBest = o.mode !== 'daily' && !o.newBest && (o.prevBest ?? 0) === 0 && o.score > 0 && o.score >= o.best;
  const hero = resultsHero({
    score: o.score,
    best: o.best,
    prevBest: o.prevBest ?? 0,
    newBest: o.newBest,
    reducedMotion: o.reducedMotion ?? false,
    nearMiss: firstBest ? '' : nearMiss(o.score, o.best),
    onRecord: () => k.h.onRecord?.(),
    onSettled: () => k.h.onResultsSettled?.({ score: o.score, newBest: o.newBest, mode: o.mode }, card),
  });
  const stats = [
    [o.moves, 'Moves'],
    [o.lagoon, 'Top lagoon'],
    [o.caught?.count ?? 0, 'Caught'],
    [o.dailyStreak, 'Streak'],
  ].filter(([v]) => (v as number) > 0);
  card.innerHTML = `<div class="overline">${o.mode === 'daily' ? 'Daily · complete' : 'Endless'}</div>
    <h2 class="res-head${o.newBest ? ' record' : ''}">${o.newBest ? 'New high score!' : firstBest ? 'Your first best!' : o.mode === 'daily' ? 'Daily done' : 'No room left'}</h2>
    <div class="hero-slot"></div>
    ${stats.length ? `<div class="inline-stats">${stats.map(([v, l]) => `<div><b class="num">${fmt(v as number)}</b><span>${l}</span></div>`).join('')}</div>` : ''}
    ${o.unlocked.length ? `<div class="chip gold unlock" data-testid="unlock">${icon('style')}New pebbles: ${o.unlocked.join(', ')}</div>` : ''}`;
  card.querySelector('.hero-slot')!.replaceWith(hero.el);
  if (o.caught?.newIds.length) card.append(journalStrip(o.caught.newIds, () => k.h.onJournal()));
  // on a record, posting it is the point: the leaderboard button leads as the one primary
  const lbFirst = !!o.leaderboard && o.newBest;
  const next =
    o.mode === 'daily'
      ? k.button('', `btn ${lbFirst ? 'small' : 'primary'}`, `${icon('share')}Share`, 'Share result', () =>
          k.h.onShare(),
        )
      : k.button('play-again', `btn ${lbFirst ? 'small' : 'primary'}`, 'Play again', 'Play again', () =>
          k.h.onNewGame(),
        );
  if (!lbFirst) card.append(next);
  if (o.leaderboard) {
    const lb = o.leaderboard;
    const b = k.button('lb-open', `btn ${lbFirst ? 'primary' : 'small'}`, lb.label, lb.label, () => lb.open());
    card.append(b);
    lb.mount?.(b);
  }
  if (lbFirst) card.append(next);
  card.append(
    o.mode === 'daily'
      ? k.button('', 'btn ghost', `${icon('endless')}Play endless`, 'Play endless', () => k.h.onClassic())
      : k.button('', 'btn ghost', `${icon('daily')}Daily challenge`, 'Daily challenge', () => k.h.onDaily()),
  );
  k.show(card, false, 'results');
  hero.start();
  k.announce(`Game over. Score ${o.score}.${o.newBest ? ' New high score!' : ''}`);
  return card;
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
