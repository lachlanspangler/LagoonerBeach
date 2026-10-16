/** The Beach Journal: what you've caught, how many, the biggest, golden finds. Pure updates. */
import { SPECIES, SPECIES_BY_ID } from './creatures.ts';
import type { Catch } from './catch.ts';

export interface Entry {
  count: number;
  best: number;
  golden: number;
  /** Local date first caught (YYYY-MM-DD). */
  first: string;
}

export interface Journal {
  entries: Record<string, Entry>;
  /** Captures since the last new species. */
  dry: number;
  total: number;
}

export const EMPTY_JOURNAL: Journal = { entries: {}, dry: 0, total: 0 };

export interface Recorded {
  readonly journal: Journal;
  readonly newSpecies: string[];
  readonly records: string[];
}

/** Record a lagoon's catches. Returns new species and size records set by this batch. */
export function record(j: Journal, catches: readonly Catch[], date: string): Recorded {
  const entries = { ...j.entries };
  const newSpecies: string[] = [];
  const records: string[] = [];
  for (const c of catches) {
    if (!SPECIES_BY_ID.has(c.id)) continue;
    const e = entries[c.id];
    if (!e) {
      entries[c.id] = { count: 1, best: c.size, golden: c.golden ? 1 : 0, first: date };
      newSpecies.push(c.id);
    } else {
      if (c.size > e.best) records.push(c.id);
      entries[c.id] = {
        count: e.count + 1,
        best: Math.max(e.best, c.size),
        golden: e.golden + (c.golden ? 1 : 0),
        first: e.first,
      };
    }
  }
  const dry = newSpecies.length ? 0 : j.dry + 1;
  return { journal: { entries, dry, total: j.total + catches.length }, newSpecies, records };
}

export const found = (j: Journal): number => SPECIES.filter((s) => j.entries[s.id]).length;

/** Validate a stored journal (unknown ids dropped, numbers sanitized). */
export function sanitizeJournal(raw: unknown): Journal {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_JOURNAL, entries: {} };
  const o = raw as Partial<Journal>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const entries: Record<string, Entry> = {};
  if (o.entries && typeof o.entries === 'object')
    for (const [id, e] of Object.entries(o.entries)) {
      if (!SPECIES_BY_ID.has(id) || !e || typeof e !== 'object') continue;
      const x = e as Partial<Entry>;
      entries[id] = {
        count: Math.max(1, Math.floor(num(x.count))),
        best: num(x.best),
        golden: Math.floor(num(x.golden)),
        first: typeof x.first === 'string' ? x.first : '',
      };
    }
  return { entries, dry: Math.floor(num(o.dry)), total: Math.floor(num(o.total)) };
}
