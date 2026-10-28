/** Visual definitions for cosmetic pebble skins (ids match src/meta/unlocks.ts). */
export type SkinStyle = 'reef' | 'pebble' | 'glyph' | 'glass' | 'coral' | 'lantern' | 'pearl';

export interface SkinLook {
  readonly id: string;
  readonly style: SkinStyle;
  /** index 1..6 (0 unused) */
  readonly colors: readonly string[];
}

export const LOOKS: Record<string, SkinLook> = {
  // the default: six real reef materials (ADR 0014); the id stays 'pebble' so saves resolve
  pebble: {
    id: 'pebble',
    style: 'reef',
    colors: ['#000', '#F2795B', '#F2B93B', '#53C08C', '#3D9BE9', '#8E5BD8', '#EC86AE'],
  },
  // the pre-1.1 default look, kept selectable: soft sea-worn stones, one highlight (ADR 0003)
  smooth: {
    id: 'smooth',
    style: 'pebble',
    colors: ['#000', '#F2795B', '#F2B93B', '#53C08C', '#3D9BE9', '#8E5BD8', '#EC86AE'],
  },
  // Okabe–Ito colorblind-safe set + a distinct glyph per color
  glyph: {
    id: 'glyph',
    style: 'glyph',
    colors: ['#000', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#CC79A7'],
  },
  seaglass: {
    id: 'seaglass',
    style: 'glass',
    colors: ['#000', '#5FC4B4', '#86AEEA', '#A6D97F', '#EDBF6A', '#B79BEB', '#EE93AE'],
  },
  coral: {
    id: 'coral',
    style: 'coral',
    colors: ['#000', '#FF6F61', '#FF9A76', '#FFB4A2', '#E5989B', '#F4845F', '#F7B267'],
  },
  lantern: {
    id: 'lantern',
    style: 'lantern',
    colors: ['#000', '#FFB547', '#FF6B6B', '#5EF2C3', '#6BC1FF', '#C792FF', '#FFE66B'],
  },
  moonstone: {
    id: 'moonstone',
    style: 'pearl',
    colors: ['#000', '#8FA8F0', '#B48EE6', '#7CCFB8', '#F0B07A', '#79B4E8', '#E890B4'],
  },
  atoll: {
    id: 'atoll',
    style: 'pebble',
    colors: ['#000', '#E9C46A', '#2A9D8F', '#F4A261', '#40C9C9', '#E76F51', '#8AB17D'],
  },
};

export const lookFor = (id: string): SkinLook => LOOKS[id] ?? LOOKS.pebble!;
