/**
 * The Beach Journal: every creature you can catch. Pure data. Species are tied to lagoon *shapes*
 * and *conditions* so the collection teaches the core mechanic (ADR 0007).
 */
import { matches, type Req } from './req.ts';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Habitat = 'shallows' | 'lagoon' | 'deep' | 'night' | 'reef' | 'legend';
export type Body =
  | 'fish'
  | 'eel'
  | 'ray'
  | 'crab'
  | 'star'
  | 'horse'
  | 'jelly'
  | 'octo'
  | 'turtle'
  | 'snail'
  | 'shrimp'
  | 'puffer'
  | 'urchin'
  | 'clam'
  | 'angler'
  | 'shark'
  | 'flat'
  | 'squid'
  | 'dollar'
  | 'otter'
  | 'mola'
  | 'dragon'
  | 'hermit'
  | 'limpet';
export type Pattern = 'plain' | 'stripes' | 'spots' | 'bands';

/** Shape of a captured lagoon (see catch.ts:classify). */
export type Shape =
  'dot' | 'pair' | 'hline' | 'vline' | 'square2' | 'square3' | 'plus' | 'rect' | 'corner' | 'island' | 'blob';

export interface CatchContext {
  readonly area: number;
  readonly shape: Shape;
  readonly w: number;
  readonly h: number;
  /** Wave number (1 = first). */
  readonly wave: number;
  /** Pockets captured in this wave. */
  readonly pockets: number;
  readonly streak: number;
  readonly moves: number;
  readonly clean: boolean;
  readonly night: boolean;
  readonly mode: 'classic' | 'daily' | 'puzzle';
  /** Puzzle tier when mode = puzzle. */
  readonly tier?: string;
  /** This capture clears the reef (puzzle win). */
  readonly reefWin?: boolean;
}

export interface Species {
  readonly id: string;
  readonly name: string;
  readonly habitat: Habitat;
  readonly rarity: Rarity;
  readonly body: Body;
  readonly colors: readonly [string, string];
  readonly pattern: Pattern;
  /** Size range in cm (records are kept per species). */
  readonly size: readonly [number, number];
  readonly flavor: string;
  /** When it can be caught, as data (req.ts). The journal's hints are generated from it (reqText.ts). */
  readonly req: Req;
  /** `matches(req, c)`: can it be caught in this lagoon? */
  readonly when: (c: CatchContext) => boolean;
  /** How strongly it competes for the everyday pick when it can. */
  readonly weight: number;
}

/**
 * The catalogue. Each species' `req` (src/meta/req.ts) is the one source of truth for when it can be
 * caught; its `when()` and every word the journal says about it (src/meta/reqText.ts) come from it.
 */
const DEFS: readonly Omit<Species, 'when'>[] = [
  // ── Shallows: everyday catches from small pools ─────────────────────────────────────────────
  {
    id: 'minnow',
    name: 'Silver Minnow',
    habitat: 'shallows',
    rarity: 'common',
    body: 'fish',
    colors: ['#B8C4CF', '#7F8FA0'],
    pattern: 'plain',
    size: [3, 7],
    flavor: 'Always first to arrive, always first to leave.',
    req: { maxArea: 2 },
    weight: 100,
  },
  {
    id: 'periwinkle',
    name: 'Periwinkle',
    habitat: 'shallows',
    rarity: 'common',
    body: 'snail',
    colors: ['#8A6F5A', '#C9B49C'],
    pattern: 'bands',
    size: [1, 3],
    flavor: 'Carries its house and is in no hurry.',
    req: { maxArea: 1 },
    weight: 80,
  },
  {
    id: 'hermit',
    name: 'Hermit Crab',
    habitat: 'shallows',
    rarity: 'common',
    body: 'hermit',
    colors: ['#E0784E', '#F2C14E'],
    pattern: 'plain',
    size: [2, 6],
    flavor: 'Borrowed shell, owns the beach.',
    req: { minArea: 2, maxArea: 2 },
    weight: 90,
  },
  {
    id: 'limpet',
    name: 'Limpet',
    habitat: 'shallows',
    rarity: 'common',
    body: 'limpet',
    colors: ['#A99C8C', '#D9CFC1'],
    pattern: 'bands',
    size: [1, 4],
    flavor: 'Holds on tighter than anything its size.',
    req: { maxArea: 1 },
    weight: 60,
  },
  {
    id: 'sanddollar',
    name: 'Sand Dollar',
    habitat: 'shallows',
    rarity: 'common',
    body: 'dollar',
    colors: ['#E9DCC4', '#C8B596'],
    pattern: 'plain',
    size: [4, 9],
    flavor: 'Worth nothing. Priceless.',
    req: { maxArea: 2 },
    weight: 50,
  },
  {
    id: 'shrimp',
    name: 'Shore Shrimp',
    habitat: 'shallows',
    rarity: 'common',
    body: 'shrimp',
    colors: ['#F59A8B', '#FFD3C7'],
    pattern: 'bands',
    size: [2, 5],
    flavor: 'Flicks backwards when surprised. Always surprised.',
    req: { maxArea: 4 },
    weight: 60,
  },
  {
    id: 'blenny',
    name: 'Tide Blenny',
    habitat: 'shallows',
    rarity: 'common',
    body: 'fish',
    colors: ['#9DAA6B', '#5E6B3A'],
    pattern: 'spots',
    size: [4, 10],
    flavor: 'Peeks out of holes like it owns them.',
    req: { minArea: 3, maxArea: 5 },
    weight: 70,
  },
  {
    id: 'cockle',
    name: 'Cockle',
    habitat: 'shallows',
    rarity: 'common',
    body: 'clam',
    colors: ['#E7C8A0', '#B7845B'],
    pattern: 'stripes',
    size: [2, 6],
    flavor: 'Hums if you hold it to your ear. Probably.',
    req: { minArea: 3, maxArea: 5 },
    weight: 50,
  },
  // ── Lagoon: shape specialists (build the shape, meet the creature) ──────────────────────────
  {
    id: 'sandeel',
    name: 'Sand Eel',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'eel',
    colors: ['#D8C79A', '#A89462'],
    pattern: 'plain',
    size: [10, 25],
    flavor: 'Dives into sand faster than you can blink.',
    req: { minArea: 3, maxArea: 5 },
    weight: 260,
  },
  {
    id: 'moray',
    name: 'Moray Eel',
    habitat: 'lagoon',
    rarity: 'rare',
    body: 'eel',
    colors: ['#5E7D3C', '#D9D27A'],
    pattern: 'spots',
    size: [40, 120],
    flavor: 'Grins at everyone. Means it.',
    req: { minArea: 6, maxArea: 8, streak: 6 },
    weight: 400,
  },
  {
    id: 'gardeneel',
    name: 'Garden Eel',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'eel',
    colors: ['#EDE6D3', '#3B3229'],
    pattern: 'spots',
    size: [20, 40],
    flavor: 'Sways with the current, one of a crowd.',
    req: { minArea: 3, maxArea: 5, streak: 4 },
    weight: 240,
  },
  {
    id: 'seahorse',
    name: 'Seahorse',
    habitat: 'lagoon',
    rarity: 'rare',
    body: 'horse',
    colors: ['#F2B93B', '#E07A2E'],
    pattern: 'bands',
    size: [6, 18],
    flavor: 'The dads carry the babies. Respect.',
    req: { minArea: 3, maxArea: 5, streak: 20 },
    weight: 380,
  },
  {
    id: 'boxcrab',
    name: 'Box Crab',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'crab',
    colors: ['#C9503A', '#F2A27A'],
    pattern: 'spots',
    size: [6, 14],
    flavor: 'Folds itself into a tidy little box.',
    req: { minArea: 4, maxArea: 4 },
    weight: 320,
  },
  {
    id: 'boxfish',
    name: 'Yellow Boxfish',
    habitat: 'lagoon',
    rarity: 'rare',
    body: 'puffer',
    colors: ['#F2D43B', '#3B3229'],
    pattern: 'spots',
    size: [8, 30],
    flavor: 'Built like a brick. Swims like a bubble.',
    req: { minArea: 9, maxArea: 9 },
    weight: 600,
  },
  {
    id: 'starfish',
    name: 'Sea Star',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'star',
    colors: ['#F2795B', '#FFC1A6'],
    pattern: 'spots',
    size: [8, 25],
    flavor: 'Five arms, zero rush.',
    req: { minArea: 5, maxArea: 5 },
    weight: 500,
  },
  {
    id: 'cuttle',
    name: 'Cuttlefish',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'squid',
    colors: ['#B48A6E', '#F3E1C8'],
    pattern: 'stripes',
    size: [10, 35],
    flavor: 'Changes colour to match its mood.',
    req: { minArea: 3, maxArea: 5, streak: 8 },
    weight: 220,
  },
  {
    id: 'flounder',
    name: 'Flounder',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'flat',
    colors: ['#B49A72', '#7E6A4A'],
    pattern: 'spots',
    size: [15, 45],
    flavor: 'Both eyes on one side. Sees you anyway.',
    req: { minArea: 6, maxArea: 8 },
    weight: 200,
  },
  {
    id: 'stingray',
    name: 'Stingray',
    habitat: 'lagoon',
    rarity: 'rare',
    body: 'ray',
    colors: ['#8C9BA8', '#C7D0D8'],
    pattern: 'spots',
    size: [40, 120],
    flavor: 'Glides like a thought you almost had.',
    req: { minArea: 6, maxArea: 11, streak: 8 },
    weight: 240,
  },
  {
    id: 'clownfish',
    name: 'Clownfish',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'fish',
    colors: ['#F2792E', '#FFFFFF'],
    pattern: 'bands',
    size: [6, 11],
    flavor: 'Never alone. Never quiet.',
    req: { minArea: 3, maxArea: 8, streak: 6 },
    weight: 160,
  },
  {
    id: 'damsel',
    name: 'Blue Damsel',
    habitat: 'lagoon',
    rarity: 'rare',
    body: 'fish',
    colors: ['#3D6FE9', '#9BC2FF'],
    pattern: 'plain',
    size: [5, 9],
    flavor: 'Small, brave, very blue.',
    req: { minArea: 3, maxArea: 8, streak: 16 },
    weight: 500,
  },
  {
    id: 'puffer',
    name: 'Pufferfish',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'puffer',
    colors: ['#D9C27A', '#7A6A3A'],
    pattern: 'spots',
    size: [10, 30],
    flavor: 'Doubles in size when nervous. Relatable.',
    req: { minArea: 4, maxArea: 6 },
    weight: 60,
  },
  {
    id: 'parrot',
    name: 'Parrotfish',
    habitat: 'lagoon',
    rarity: 'uncommon',
    body: 'fish',
    colors: ['#3BC9A0', '#E86FB0'],
    pattern: 'stripes',
    size: [20, 60],
    flavor: 'Eats coral, makes sand. You are standing on its work.',
    req: { minArea: 6 },
    weight: 70,
  },
  {
    id: 'grouper',
    name: 'Grouper',
    habitat: 'lagoon',
    rarity: 'rare',
    body: 'fish',
    colors: ['#8A6A4E', '#C9A57A'],
    pattern: 'spots',
    size: [40, 150],
    flavor: 'Unbothered. Enormous. Unbothered.',
    req: { minArea: 9, maxArea: 11 },
    weight: 40,
  },
  // ── Deep: rewards for huge pools, long games and cascades ──────────────────────────────────
  {
    id: 'octopus',
    name: 'Octopus',
    habitat: 'deep',
    rarity: 'epic',
    body: 'octo',
    colors: ['#C2506B', '#F2A1B6'],
    pattern: 'spots',
    size: [30, 100],
    flavor: 'Three hearts, eight arms, one mischievous plan.',
    req: { minArea: 12 },
    weight: 120,
  },
  {
    id: 'manta',
    name: 'Manta Ray',
    habitat: 'deep',
    rarity: 'epic',
    body: 'ray',
    colors: ['#2E3B4E', '#E8EEF2'],
    pattern: 'plain',
    size: [300, 700],
    flavor: 'Flies underwater. Waves back.',
    req: { minArea: 12, streak: 3 },
    weight: 400,
  },
  {
    id: 'turtle',
    name: 'Sea Turtle',
    habitat: 'deep',
    rarity: 'epic',
    body: 'turtle',
    colors: ['#5E8A4E', '#C9B47A'],
    pattern: 'spots',
    size: [60, 120],
    flavor: 'Came back to the beach where it was born.',
    req: { minArea: 14 },
    weight: 500,
  },
  {
    id: 'barracuda',
    name: 'Barracuda',
    habitat: 'deep',
    rarity: 'rare',
    body: 'fish',
    colors: ['#9AA6B2', '#3B4652'],
    pattern: 'bands',
    size: [50, 150],
    flavor: 'All teeth, all speed, no small talk.',
    req: { minArea: 9, maxArea: 11, streak: 6 },
    weight: 160,
  },
  {
    id: 'hammerhead',
    name: 'Hammerhead',
    habitat: 'deep',
    rarity: 'epic',
    body: 'shark',
    colors: ['#7E8C99', '#C7D0D8'],
    pattern: 'plain',
    size: [200, 400],
    flavor: 'Sees in every direction. Even that one.',
    req: { minArea: 12, streak: 8 },
    weight: 400,
  },
  {
    id: 'nautilus',
    name: 'Nautilus',
    habitat: 'deep',
    rarity: 'rare',
    body: 'snail',
    colors: ['#E9DCC4', '#B5653A'],
    pattern: 'stripes',
    size: [12, 25],
    flavor: 'Older than the dinosaurs and still getting around.',
    req: { minArea: 6, maxArea: 11, streak: 12 },
    weight: 300,
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    habitat: 'deep',
    rarity: 'rare',
    body: 'shark',
    colors: ['#7FA8C9', '#E8EEF2'],
    pattern: 'plain',
    size: [150, 300],
    flavor: 'Likes you. Genuinely.',
    req: { minArea: 6, streak: 20 },
    weight: 120,
  },
  {
    id: 'urchin',
    name: 'Sea Urchin',
    habitat: 'shallows',
    rarity: 'uncommon',
    body: 'urchin',
    colors: ['#5B3A7A', '#9C7AC9'],
    pattern: 'plain',
    size: [4, 10],
    flavor: 'Do not hug.',
    req: { maxArea: 2, streak: 6 },
    weight: 120,
  },
  // ── Night: only when the beach is dark (Night theme) ───────────────────────────────────────
  {
    id: 'lanternfish',
    name: 'Lanternfish',
    habitat: 'night',
    rarity: 'uncommon',
    body: 'fish',
    colors: ['#2FB8D8', '#9BF0FF'],
    pattern: 'spots',
    size: [3, 8],
    flavor: 'Carries its own night light.',
    req: { maxArea: 4, theme: 'night' },
    weight: 120,
  },
  {
    id: 'moonjelly',
    name: 'Moon Jelly',
    habitat: 'night',
    rarity: 'uncommon',
    body: 'jelly',
    colors: ['#C9D6FF', '#7DF9E8'],
    pattern: 'plain',
    size: [10, 40],
    flavor: 'No brain, no heart, no worries.',
    req: { minArea: 3, theme: 'night' },
    weight: 140,
  },
  {
    id: 'combjelly',
    name: 'Comb Jelly',
    habitat: 'night',
    rarity: 'rare',
    body: 'jelly',
    colors: ['#E86FB0', '#7DF9E8'],
    pattern: 'stripes',
    size: [3, 15],
    flavor: 'Rainbows run along its ribs.',
    req: { minArea: 6, maxArea: 11, theme: 'night' },
    weight: 500,
  },
  {
    id: 'firefly',
    name: 'Firefly Squid',
    habitat: 'night',
    rarity: 'rare',
    body: 'squid',
    colors: ['#3D9BE9', '#9BF0FF'],
    pattern: 'spots',
    size: [5, 8],
    flavor: 'Blinks hello in blue.',
    req: { streak: 10, theme: 'night' },
    weight: 500,
  },
  {
    id: 'angler',
    name: 'Anglerfish',
    habitat: 'night',
    rarity: 'epic',
    body: 'angler',
    colors: ['#3B3240', '#F2E97A'],
    pattern: 'plain',
    size: [20, 100],
    flavor: 'Brings its own lamp to every party.',
    req: { minArea: 12, theme: 'night' },
    weight: 500,
  },
  {
    id: 'seasparkle',
    name: 'Sea Sparkle',
    habitat: 'night',
    rarity: 'rare',
    body: 'jelly',
    colors: ['#7DF9E8', '#E9FDFF'],
    pattern: 'spots',
    size: [1, 2],
    flavor: 'A million tiny stars that came down to swim.',
    req: { maxArea: 2, streak: 16, theme: 'night' },
    weight: 400,
  },
  // ── Reef: caught in Reef puzzles ───────────────────────────────────────────────────────────
  {
    id: 'butterfly',
    name: 'Butterflyfish',
    habitat: 'reef',
    rarity: 'common',
    body: 'fish',
    colors: ['#F2D43B', '#3B3229'],
    pattern: 'bands',
    size: [10, 20],
    flavor: 'Wears a fake eye on its tail to fool you.',
    req: { mode: ['puzzle'] },
    weight: 80,
  },
  {
    id: 'wrasse',
    name: 'Cleaner Wrasse',
    habitat: 'reef',
    rarity: 'uncommon',
    body: 'fish',
    colors: ['#3D9BE9', '#1A1A1A'],
    pattern: 'stripes',
    size: [6, 12],
    flavor: 'Runs the reef spa. Tips appreciated.',
    req: { streak: 2, mode: ['puzzle'] },
    weight: 600,
  },
  {
    id: 'lionfish',
    name: 'Lionfish',
    habitat: 'reef',
    rarity: 'rare',
    body: 'fish',
    colors: ['#C9503A', '#FFF1E6'],
    pattern: 'stripes',
    size: [20, 40],
    flavor: 'Fabulous. Do not touch the fabulous.',
    req: { minArea: 6, mode: ['puzzle'] },
    weight: 600,
  },
  {
    id: 'giantclam',
    name: 'Giant Clam',
    habitat: 'reef',
    rarity: 'epic',
    body: 'clam',
    colors: ['#3BC9A0', '#2E6FD8'],
    pattern: 'spots',
    size: [60, 120],
    flavor: 'Has been sitting here thinking for a century.',
    req: { minArea: 9, mode: ['puzzle'] },
    weight: 900,
  },
  // ── Daily visitors ─────────────────────────────────────────────────────────────────────────
  {
    id: 'sunfish',
    name: 'Ocean Sunfish',
    habitat: 'deep',
    rarity: 'rare',
    body: 'mola',
    colors: ['#B7C3CF', '#E8EEF2'],
    pattern: 'plain',
    size: [100, 300],
    flavor: 'Sunbathes on the surface. Every single day.',
    req: { minArea: 12, maxArea: 14 },
    weight: 260,
  },
  {
    id: 'otter',
    name: 'Sea Otter',
    habitat: 'shallows',
    rarity: 'rare',
    body: 'otter',
    colors: ['#7A5A3E', '#D9C2A6'],
    pattern: 'plain',
    size: [100, 150],
    flavor: 'Holds hands while sleeping so nobody drifts away.',
    req: { minArea: 3, maxArea: 5, streak: 16 },
    weight: 220,
  },
  // ── Legends: the moments you'll remember ───────────────────────────────────────────────────
  {
    id: 'whaleshark',
    name: 'Whale Shark',
    habitat: 'legend',
    rarity: 'legendary',
    body: 'shark',
    colors: ['#3E5A73', '#E8EEF2'],
    pattern: 'spots',
    size: [800, 1200],
    flavor: 'The biggest fish in the sea, and a gentle one.',
    req: { minArea: 16 },
    weight: 2000,
  },
  {
    id: 'seadragon',
    name: 'Leafy Sea Dragon',
    habitat: 'legend',
    rarity: 'legendary',
    body: 'dragon',
    colors: ['#C9A53B', '#8AB17D'],
    pattern: 'stripes',
    size: [20, 35],
    flavor: 'Looks like seaweed. Is royalty.',
    req: { streak: 30 },
    weight: 2000,
  },
  {
    id: 'goldturtle',
    name: 'Golden Turtle',
    habitat: 'legend',
    rarity: 'legendary',
    body: 'turtle',
    colors: ['#F2C14E', '#FFF1C2'],
    pattern: 'spots',
    size: [80, 140],
    flavor: 'Said to visit once a lifetime. Today was the day.',
    req: { minArea: 12, streak: 10 },
    weight: 1200,
  },
  {
    id: 'kraken',
    name: 'Baby Kraken',
    habitat: 'legend',
    rarity: 'legendary',
    body: 'octo',
    colors: ['#5B3A7A', '#E86FB0'],
    pattern: 'spots',
    size: [40, 60],
    flavor: 'Will be terrifying someday. Today it is adorable.',
    req: { minArea: 12, streak: 5, theme: 'night' },
    weight: 2000,
  },
];

export const SPECIES: readonly Species[] = DEFS.map((d) => ({ ...d, when: (c: CatchContext) => matches(d.req, c) }));

export const SPECIES_BY_ID: ReadonlyMap<string, Species> = new Map(SPECIES.map((s) => [s.id, s]));

export const HABITATS: readonly { id: Habitat; name: string }[] = [
  { id: 'shallows', name: 'Shallows' },
  { id: 'lagoon', name: 'Lagoon' },
  { id: 'deep', name: 'Deep water' },
  { id: 'night', name: 'Night' },
  { id: 'reef', name: 'Reef' },
  { id: 'legend', name: 'Legends' },
];
