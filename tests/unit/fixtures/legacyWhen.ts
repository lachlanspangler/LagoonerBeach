/**
 * The 47 catch conditions exactly as they were written before they moved to data
 * (src/meta/req.ts), frozen here so tests/unit/req.test.ts can prove the data says the same thing
 * over the enumerated context space (tests/unit/ctxSpace.ts). A deliberate rule change edits the
 * species' `req`, this pin and the catch tuning together (`npx tsx scripts/catch-rates.ts --write`).
 */
import type { CatchContext } from '../../../src/meta/creatures.ts';

const small = (c: CatchContext) => c.area <= 2;
const mid = (c: CatchContext) => c.area >= 3 && c.area <= 5;
const big = (c: CatchContext) => c.area >= 6 && c.area <= 11;
const huge = (c: CatchContext) => c.area >= 12;
const day = (c: CatchContext) => !c.night;

export const LEGACY_WHEN: Readonly<Record<string, (c: CatchContext) => boolean>> = {
  minnow: (c) => small(c) && day(c),
  periwinkle: (c) => c.shape === 'dot' && day(c),
  hermit: (c) => c.shape === 'pair',
  limpet: (c) => c.shape === 'dot',
  sanddollar: (c) => small(c) && day(c),
  shrimp: (c) => c.area <= 4,
  blenny: (c) => mid(c),
  cockle: (c) => mid(c),
  sandeel: (c) => c.shape === 'hline',
  moray: (c) => c.shape === 'hline' && c.w >= 5,
  gardeneel: (c) => c.shape === 'vline',
  seahorse: (c) => c.shape === 'vline' && c.h >= 4,
  boxcrab: (c) => c.shape === 'square2',
  boxfish: (c) => c.shape === 'square3',
  starfish: (c) => c.shape === 'plus',
  cuttle: (c) => c.shape === 'corner',
  flounder: (c) => c.shape === 'rect' && c.w > c.h,
  stingray: (c) => c.shape === 'rect' && c.area >= 6,
  clownfish: (c) => c.pockets >= 2,
  damsel: (c) => c.pockets >= 3,
  puffer: (c) => mid(c) && c.shape === 'blob',
  parrot: (c) => c.area >= 6 && day(c),
  grouper: (c) => big(c),
  octopus: (c) => huge(c),
  manta: (c) => c.shape === 'rect' && huge(c),
  turtle: (c) => c.shape === 'island',
  barracuda: (c) => c.area >= 6 && c.moves >= 60,
  hammerhead: (c) => huge(c) && c.moves >= 90,
  nautilus: (c) => c.wave >= 2,
  dolphin: (c) => c.streak >= 12 && c.area >= 6,
  urchin: (c) => c.shape === 'dot' && c.streak >= 6,
  lanternfish: (c) => c.night && c.area <= 4,
  moonjelly: (c) => c.night && c.area >= 3,
  combjelly: (c) => c.night && (c.shape === 'hline' || c.shape === 'vline'),
  firefly: (c) => c.night && c.pockets >= 2,
  angler: (c) => c.night && huge(c),
  seasparkle: (c) => c.night && c.shape === 'dot' && c.streak >= 6,
  butterfly: (c) => c.mode === 'puzzle',
  wrasse: (c) => c.mode === 'puzzle' && c.wave >= 2,
  lionfish: (c) => c.mode === 'puzzle' && !!c.reefWin && (c.tier === 'deep' || c.tier === 'abyss'),
  giantclam: (c) => c.mode === 'puzzle' && !!c.reefWin && c.tier === 'abyss',
  sunfish: (c) => c.mode === 'daily' && c.area >= 6,
  otter: (c) => c.mode === 'daily' && c.streak >= 8 && c.area >= 3,
  whaleshark: (c) => c.wave >= 3,
  seadragon: (c) => c.clean && c.mode !== 'puzzle',
  goldturtle: (c) => c.shape === 'island' && huge(c),
  kraken: (c) => c.night && huge(c) && c.streak >= 5,
};
