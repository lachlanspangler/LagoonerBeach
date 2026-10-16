/**
 * Species art registry. Every `species/<id>.ts` that does `export default defineArt({...})` is
 * picked up automatically (Vite glob, eager: all species ship in the one lazy art chunk), so fleet
 * artists add a file and never touch a shared list.
 */
import type { SpeciesArt } from '../kit.ts';

const mods = import.meta.glob<{ default: SpeciesArt }>(['./*.ts', '!./index.ts'], { eager: true });

export const ART: ReadonlyMap<string, SpeciesArt> = new Map(
  Object.entries(mods).map(([file, m]) => {
    const id = file.replace(/^\.\/|\.ts$/g, '');
    if (m.default.id !== id) throw new Error(`art: ${file} exports id "${m.default.id}"`);
    return [id, m.default] as const;
  }),
);
