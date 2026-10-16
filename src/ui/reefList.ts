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
  card.className = 'card reefs';
  const deepest = deepestChapter(solved);
  const head = document.createElement('div');
  head.innerHTML = `<h2>Reefs</h2><div class="sub" data-testid="reef-depth">${solved.size} cleared${
    deepest ? ` · Depth: chapter ${deepest}` : ''
  }${pure.size ? ' · ★ = no hints' : ''}</div>`;
  card.append(head);

  const next = nextUnsolved(solved); // 1-based
  // new players keep climbing the curve; past the pack, Continue is the way on into the endless reefs
  const climbing = solved.size < 20 || next > SHIPPED_REEFS;
  if (climbing) {
    const c = button('reef-continue', 'btn primary', `Continue · Reef ${next}`, `Continue, reef ${next}`, () =>
      onPick(next - 1),
    );
    c.style.marginBottom = '6px';
    card.append(c);
  }
  if (m.daily) {
    const tierName = TIER_NAME[m.shipped[m.daily.index]?.tier ?? ''] ?? '';
    const b = button(
      'reef-of-day',
      `btn ${m.daily.done || climbing ? '' : 'primary'}`,
      `${m.daily.done ? '✓ ' : ''}Reef of the day · ${m.daily.index + 1} · ${tierName}`,
      `Reef of the day, reef ${m.daily.index + 1}${m.daily.done ? ', done' : ''}`,
      () => onPick(m.daily!.index),
    );
    b.style.marginBottom = '6px';
    card.append(b);
  }

  const top = maxChapter(m);
  let chapter = Math.min(top, chapterOf(m.current + 1).chapter);
  const nav = document.createElement('div');
  nav.className = 'chapter-nav';
  const title = document.createElement('div');
  title.className = 'chapter-title';
  title.setAttribute('aria-live', 'polite');
  const prev = button('chapter-prev', 'chapter-step', '‹', 'Previous chapter', () => go(chapter - 1));
  const fwd = button('chapter-next', 'chapter-step', '›', 'Next chapter', () => go(chapter + 1));
  nav.append(prev, title, fwd);
  const scroller = document.createElement('div');
  scroller.className = 'reef-scroll';
  const grid = document.createElement('div');
  grid.className = 'reef-grid';
  scroller.append(grid);
  card.append(nav, scroller);

  const render = (): void => {
    const first = (chapter - 1) * CHAPTER_SIZE + 1;
    const done = chapterCleared(solved, chapter);
    const segs = Array.from({ length: CHAPTER_SIZE }, (_, k) =>
      solved.has(reefId(first + k)) ? '<i class="on"></i>' : '<i></i>',
    ).join('');
    title.innerHTML = `<b data-testid="chapter-title">Chapter ${chapter} · ${chapterName(chapter)}</b><span>${done}/${CHAPTER_SIZE} cleared${
      chapter >= FIRST_ENDLESS_CHAPTER ? ' · endless' : ''
    }</span><span class="chapter-bar" aria-hidden="true">${segs}</span>`;
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
        button('', cls, `${n}${pure.has(id) ? '<sup>★</sup>' : ''}`, `Reef ${n}${isSolved ? ', cleared' : ''}`, () =>
          onPick(i),
        ),
      );
    }
  };
  const go = (c: number): void => {
    chapter = Math.max(1, Math.min(top, c));
    render();
  };
  render();
  card.append(button('', 'btn', 'Close', 'Close', onClose));
  return card;
}
