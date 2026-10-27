/**
 * The reef list, by chapter: the shipped pack and the endless reefs after it. Only one chapter
 * (20 tiles) is in the DOM at a time; ‹ › walk the chapters. Nothing is locked: any shipped reef,
 * and any endless reef up to one chapter past the player's frontier, can be opened.
 */
import {
  CHAPTER_SIZE,
  SHIPPED_REEFS,
  chapterCleared,
  chapterName,
  chapterOf,
  deepestChapter,
  nextUnsolved,
  reefId,
} from '../core/endless.ts';
import { icon } from './icons.ts';

export interface ReefListModel {
  /** Tier per shipped reef (index = reef number − 1). */
  readonly shipped: readonly { id: string; tier?: string }[];
  readonly solved: readonly string[];
  readonly pure: readonly string[];
  /** 0-based index of the reef being played (or last played). */
  readonly current: number;
  readonly daily?: { index: number; done: boolean };
  /** Tier of a generated reef if it is already known (cached), for tile colour. */
  tierOf?(index: number): string | undefined;
}

export type ButtonFactory = (id: string, cls: string, html: string, label: string, fn: () => void) => HTMLButtonElement;

const TIER_NAME: Record<string, string> = { calm: 'Calm', tricky: 'Tricky', deep: 'Deep', abyss: 'Abyss' };

/** Depth in metres: one metre per reef, so each chapter of 20 sinks 20 m (UX S3: a depth meter). */
export const depthOf = (reef: number): number => Math.max(0, Math.floor(reef));
const span = (chapter: number) => `${depthOf((chapter - 1) * CHAPTER_SIZE + 1)}–${depthOf(chapter * CHAPTER_SIZE)} m`;
const FIRST_ENDLESS_CHAPTER = SHIPPED_REEFS / CHAPTER_SIZE + 1;

/** Highest chapter the list lets you open: one past the furthest of current, frontier and deepest. */
export function maxChapter(m: Pick<ReefListModel, 'solved' | 'current'>): number {
  const solved = new Set(m.solved);
  const reach = Math.max(
    FIRST_ENDLESS_CHAPTER,
    chapterOf(m.current + 1).chapter,
    chapterOf(nextUnsolved(solved)).chapter,
    deepestChapter(solved),
  );
  return reach + 1;
}

export function buildReefList(
  m: ReefListModel,
  button: ButtonFactory,
  onPick: (index: number) => void,
  onClose: () => void,
): HTMLElement {
  const solved = new Set(m.solved);
  const pure = new Set(m.pure);
  const card = document.createElement('div');
  card.className = 'sheet reefs';
  card.dataset.kind = 'reefs';
  const deepest = deepestChapter(solved);
  const head = document.createElement('div');
  head.className = 'sheet-head';
  // how deep you've been: the deepest reef cleared, in metres
  let frontier = 0;
  for (const id of solved) frontier = Math.max(frontier, Number(id.replace(/\D/g, '')) || 0);
  // each fact stays whole: a narrow phone wraps between them, never inside one ("1 / without hints")
  const facts = [
    `${solved.size} cleared`,
    ...(frontier ? [`<b class="num">Depth ${depthOf(frontier)} m</b>`] : []),
    ...(deepest ? [`chapter ${deepest}`] : []),
    ...(pure.size ? [`${pure.size} without hints`] : []),
  ];
  head.innerHTML = `<div style="flex:1;min-width:0"><h2 class="title-m">Reefs</h2><div class="callout" data-testid="reef-depth">${facts
    .map((f, i, a) => `<span style="white-space:nowrap">${f}${i < a.length - 1 ? ' ·' : ''}</span>`)
    .join(' ')}</div></div>`;
  head.append(button('', 'round', icon('close'), 'Close', onClose));
  card.append(head);

  const next = nextUnsolved(solved); // 1-based
  // new players keep climbing the curve; past the pack, Continue is the way on into the endless reefs
  const climbing = solved.size < 20 || next > SHIPPED_REEFS;
  const cta = document.createElement('div');
  cta.className = 'reef-cta';
  if (climbing)
    cta.append(
      button(
        'reef-continue',
        'btn primary',
        `Continue · Reef ${next}${icon('chevronRight')}`,
        `Continue, reef ${next}`,
        () => onPick(next - 1),
      ),
    );
  if (m.daily) {
    const tierName = TIER_NAME[m.shipped[m.daily.index]?.tier ?? ''] ?? '';
    cta.append(
      button(
        'reef-of-day',
        'btn small reef-day', // secondary: Continue is the way on
        `${m.daily.done ? icon('check') : icon('daily')}Reef of the day · ${m.daily.index + 1} · ${tierName}`,
        `Reef of the day, reef ${m.daily.index + 1}${m.daily.done ? ', done' : ''}`,
        () => onPick(m.daily!.index),
      ),
    );
  }
  card.append(cta);

  const top = maxChapter(m);
  let chapter = Math.min(top, chapterOf(m.current + 1).chapter);
  const nav = document.createElement('div');
  nav.className = 'chapter-nav';
  const title = document.createElement('div');
  title.className = 'chapter-title';
  title.setAttribute('aria-live', 'polite');
  const prev = button('chapter-prev', 'round', icon('chevronLeft'), 'Previous chapter', () => go(chapter - 1));
  const fwd = button('chapter-next', 'round', icon('chevronRight'), 'Next chapter', () => go(chapter + 1));
  nav.append(prev, title, fwd);
  const scroller = document.createElement('div');
  scroller.className = 'sheet-body';
  const grid = document.createElement('div');
  grid.className = 'reef-grid';
  // the water behind the tiles darkens chapter by chapter (you're sinking), with a depth gauge
  const sea = document.createElement('div');
  sea.className = 'reef-sea';
  const gauge = document.createElement('div');
  gauge.className = 'depth-gauge';
  gauge.setAttribute('aria-hidden', 'true');
  sea.append(gauge, grid);
  const upcoming = document.createElement('div');
  upcoming.className = 'reef-upcoming';
  const key = document.createElement('div');
  key.className = 'tier-key caption';
  key.innerHTML = ['calm', 'tricky', 'deep', 'abyss']
    .map(
      (t) =>
        `<span class="reef t-${t}" style="all:unset;display:inline-flex;align-items:center;gap:5px"><i style="background:var(--tier-c)"></i>${TIER_NAME[t]}</span>`,
    )
    .join('');
  scroller.append(sea, upcoming, key);
  card.append(nav, scroller);

  const render = (): void => {
    const first = (chapter - 1) * CHAPTER_SIZE + 1;
    const done = chapterCleared(solved, chapter);
    const segs = Array.from({ length: CHAPTER_SIZE }, (_, k) =>
      solved.has(reefId(first + k)) ? '<i class="on"></i>' : '<i></i>',
    ).join('');
    title.innerHTML = `<b data-testid="chapter-title">Chapter ${chapter} · ${chapterName(chapter)}</b><span class="caption num">${done}/${CHAPTER_SIZE} cleared · ${span(chapter)}${
      chapter >= FIRST_ENDLESS_CHAPTER ? ' · endless' : ''
    }</span><span class="segs" aria-hidden="true">${segs}</span>`;
    // 0 at the surface → 1 by chapter 19 (the end of the pack) and beyond
    const sink = Math.min(1, (chapter - 1) / 18);
    sea.style.setProperty('--sink', sink.toFixed(3));
    gauge.innerHTML = `<i style="top:${(sink * 100).toFixed(1)}%"></i><span class="num">${depthOf(chapter * CHAPTER_SIZE)} m</span>`;
    // the next chapters, by name: somewhere to be headed
    const ahead = [chapter + 1, chapter + 2];
    upcoming.innerHTML = `<span class="caption">Deeper</span>${ahead
      .map((c) => `<span class="reef-next-ch" title="${span(c)}"><b>${c}</b> ${chapterName(c)}</span>`)
      .join('')}`;
    prev.disabled = chapter <= 1;
    fwd.disabled = chapter >= top;
    grid.replaceChildren();
    for (let n = first; n < first + CHAPTER_SIZE; n++) {
      const i = n - 1;
      const id = reefId(n);
      const tier = n <= SHIPPED_REEFS ? (m.shipped[i]?.tier ?? '') : (m.tierOf?.(i) ?? 'endless');
      const isSolved = solved.has(id);
      const cls = `reef t-${tier}${isSolved ? ' done' : ''}${n === next ? ' next' : ''}${i === m.current ? ' cur' : ''}`;
      grid.append(
        button(
          '',
          cls,
          `<span class="num">${n}</span>${
            // a sticker on every cleared reef: a shell, or a gold star when cleared without hints
            pure.has(id)
              ? icon('star', { filled: true, cls: 'stk star' })
              : isSolved
                ? icon('shell', { filled: true, cls: 'stk shell' })
                : ''
          }`,
          `Reef ${n}${isSolved ? ', cleared' : ''}${pure.has(id) ? ', no hints' : ''}`,
          () => onPick(i),
        ),
      );
    }
  };
  const go = (c: number): void => {
    chapter = Math.max(1, Math.min(top, c));
    render();
  };
  render();
  return card;
}
