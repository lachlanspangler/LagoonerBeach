/**
 * Rarity and habitat presentation shared by the journal (initial bundle), the reveal and the share
 * card (lazy chunk). CREATURE_ART R29: rarity is shown by frame width/shape and 1–5 shell pips,
 * never by hue alone; habitats tint frames and pools.
 */
import type { Habitat, Rarity } from '../meta/creatures.ts';
import { drawShell } from './icons.ts';

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#B8A88F',
  uncommon: '#53C08C',
  rare: '#3D9BE9',
  epic: '#8E5BD8',
  legendary: '#F2B93B',
};
export const RARITY_RANK: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

/** Habitat backdrop for big art (reveal, share card): top → bottom. */
export const HABITAT_TINT: Record<Habitat, readonly [string, string]> = {
  shallows: ['#F6EBD6', '#E2CFAE'],
  lagoon: ['#DDF4F8', '#9ED8E6'],
  deep: ['#D5DEEE', '#7E97BE'],
  night: ['#1F3A57', '#0B1622'],
  reef: ['#FBE3DA', '#EDB3A0'],
  legend: ['#FFF4D6', '#F0C978'],
};

/** Journal tile ring + pool tint per habitat: [day, night] (UI_DESIGN §6.7). */
export const HABITAT_UI: Record<Habitat, readonly [string, string]> = {
  shallows: ['#E9DCC6', '#3A3a30'],
  lagoon: ['#CDEBF2', '#1C4A5C'],
  deep: ['#C9D3E6', '#24395C'],
  night: ['#D8D5EF', '#2D2F5C'],
  reef: ['#F7D6CC', '#4C3036'],
  legend: ['#F6E3B4', '#4A3E1E'],
};

/** Little shell pips: `n` filled of 5, centered at (cx, cy); `r` ≈ half a shell's width. */
export function drawPips(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  n: number,
  on: string,
  off: string,
): void {
  const gap = r * 2.7;
  const x0 = cx - gap * 2;
  for (let i = 0; i < 5; i++) drawShell(g, x0 + i * gap, cy, r, i < n ? on : off, i < n);
}

/** DOM pips: five shells, `n` filled (masks in style.css). */
export function pipsHtml(n: number, cls = ''): string {
  return `<span class="pips${cls ? ` ${cls}` : ''}" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}</span>`;
}
