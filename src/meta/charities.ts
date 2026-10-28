/**
 * The About page's charities (ADR 0016). Each is a verified US 501(c)(3) with its official donate
 * page; the evidence (EIN, IRS record, the site's own statement) is in docs/research/CHARITIES.md,
 * and tests/unit/charities.test.ts keeps this list and that table in sync. We never handle money,
 * never add query strings, and the links open in the system browser with no referrer.
 */
export interface Charity {
  readonly id: string;
  readonly name: string;
  /** Where it works, shown small. */
  readonly where: string;
  /** One line: what a gift does, in plain words. */
  readonly does: string;
  /** The official donate page. */
  readonly url: string;
  readonly ein: string;
  /** A species from the game that lives where this charity works (shown beside it). */
  readonly species: string;
  /**
   * The charity's own logo, unaltered (fetched from its website, trimmed, `public/charities/`), and
   * the badge it sits on: some are drawn for a dark header (white artwork), some for a light one.
   */
  readonly logo: { readonly src: string; readonly on: 'light' | 'dark' };
}

export const CHARITIES: readonly Charity[] = [
  {
    id: 'pmmc',
    name: 'Pacific Marine Mammal Center',
    where: 'Laguna Beach',
    does: 'Rescues, treats and releases stranded marine mammals, mostly seals and sea lions.',
    url: 'https://apps.pacificmmc.org/donate',
    ein: '95-3680896',
    species: 'dolphin',
    logo: { src: './charities/pmmc.png', on: 'dark' },
  },
  {
    id: 'lof',
    name: 'Laguna Ocean Foundation',
    where: 'Laguna Beach',
    does: 'Teaches tide-pool care at eight Laguna Beach pools, every day.',
    url: 'https://lagunaoceanfoundation.org/donate/',
    ein: '71-0953427',
    species: 'hermit',
    logo: { src: './charities/lof.png', on: 'light' },
  },
  {
    id: 'surfrider',
    name: 'Surfrider Foundation',
    where: 'Coasts everywhere',
    does: 'Clean water and healthy beaches, one coastline at a time.',
    url: 'https://www.surfrider.org/donate',
    ein: '95-3941826',
    species: 'starfish',
    logo: { src: './charities/surfrider.png', on: 'light' },
  },
  {
    id: 'mba',
    name: 'Monterey Bay Aquarium',
    where: 'Central California',
    does: 'Raises orphaned sea otter pups with surrogate mothers, then returns them to the kelp.',
    url: 'https://www.montereybayaquarium.org/support-us/donate',
    ein: '94-2487469',
    species: 'otter',
    logo: { src: './charities/mba.png', on: 'dark' },
  },
  {
    id: 'oc',
    name: 'Ocean Conservancy',
    where: 'Oceans worldwide',
    does: 'Keeps trash out of the sea, home of the International Coastal Cleanup.',
    url: 'https://oceanconservancy.org/donate/',
    ein: '23-7245152',
    species: 'turtle',
    logo: { src: './charities/oc.png', on: 'light' },
  },
];

/** The host shown under each link, so players know where a tap goes. */
export const hostOf = (url: string): string => new URL(url).hostname.replace(/^(www|apps)\./, '');
