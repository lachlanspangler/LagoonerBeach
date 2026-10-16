/**
 * Spoiler-free daily share text: score, streak, and an emoji picture of your biggest lagoon
 * (water inside, its ring of pebbles around it), cropped to its bounding box.
 */
import { N } from '../core/grid.ts';

export interface LagoonShape {
  readonly cells: readonly number[];
  readonly ring: readonly number[];
}

export function lagoonPicture(l: LagoonShape | null): string {
  if (!l || l.cells.length === 0) return '';
  const all = [...l.cells, ...l.ring];
  const xs = all.map((c) => c % N);
  const ys = all.map((c) => Math.floor(c / N));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const water = new Set(l.cells);
  const ring = new Set(l.ring);
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let r = '';
    for (let x = x0; x <= x1; x++) {
      const c = y * N + x;
      r += water.has(c) ? '🟦' : ring.has(c) ? '🟫' : '⬜';
    }
    rows.push(r);
  }
  return rows.join('\n');
}

export function shareText(o: {
  date: string;
  score: number;
  streak: number;
  lagoon: LagoonShape | null;
  bestPocket?: number;
}): string {
  // the shape may be unknown after a reload mid-game; the size is always known
  const size = Math.max(o.lagoon?.cells.length ?? 0, o.bestPocket ?? 0);

  const lines = [
    `Atoll daily ${o.date}`,
    `${o.score.toLocaleString('en-US')} pts · biggest lagoon ${size}${o.streak > 1 ? ` · ${o.streak}-day streak` : ''}`,
  ];
  const pic = lagoonPicture(o.lagoon);
  if (pic) lines.push('', pic);
  return lines.join('\n');
}
