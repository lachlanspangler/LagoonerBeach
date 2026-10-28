/**
 * Journal progress, computed from the journal and the catalogue (pure): found / total / complete /
 * golden per habitat, found per rarity tier, golden overall. The journal sheet only renders this.
 */
import { HABITATS, SPECIES, type Habitat, type Rarity, type Species } from './creatures.ts';
import type { Journal } from './journal.ts';

export interface Tally {
  /** Species found. */
  readonly got: number;
  readonly total: number;
  /** Species with at least one golden catch. */
  readonly golden: number;
  readonly complete: boolean;
}

export interface HabitatProgress extends Tally {
  readonly id: Habitat;
  readonly name: string;
  readonly species: readonly Species[];
}

export interface RarityProgress extends Tally {
  readonly rarity: Rarity;
}

export interface JournalProgress extends Tally {
  readonly habitats: readonly HabitatProgress[];
  /** Common → legendary. */
  readonly rarities: readonly RarityProgress[];
}

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function tally(j: Journal, list: readonly Species[]): Tally {
  let got = 0;
  let golden = 0;
  for (const sp of list) {
    const e = j.entries[sp.id];
    if (!e) continue;
    got++;
    if (e.golden > 0) golden++;
  }
  return { got, total: list.length, golden, complete: list.length > 0 && got === list.length };
}

export function journalProgress(j: Journal): JournalProgress {
  return {
    ...tally(j, SPECIES),
    habitats: HABITATS.map((h) => {
      const species = SPECIES.filter((s) => s.habitat === h.id);
      return { id: h.id, name: h.name, species, ...tally(j, species) };
    }),
    rarities: RARITIES.map((rarity) => ({
      rarity,
      ...tally(
        j,
        SPECIES.filter((s) => s.rarity === rarity),
      ),
    })),
  };
}
