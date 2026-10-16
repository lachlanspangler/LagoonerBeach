/**
 * Colorblind audit (I-090). Colors never carry rules in Atoll, but piece identity still benefits.
 * Glyph must stay distinguishable under every CVD; other skins are reported (logged) not gated,
 * except the default skin which must keep a usable floor.
 */
import { describe, expect, it } from 'vitest';
import { LOOKS } from '../../src/render/skins.ts';
import { minPairDelta } from '../../src/render/color.ts';

const KINDS = ['protan', 'deutan', 'tritan'] as const;

describe('colorblind audit', () => {
  it('reports every skin', () => {
    const rows = Object.values(LOOKS).map((l) => {
      const c = l.colors.slice(1);
      return (
        `${l.id.padEnd(10)} normal ${minPairDelta(c).toFixed(1).padStart(5)} ` +
        KINDS.map((k) => `${k} ${minPairDelta(c, k).toFixed(1).padStart(5)}`).join(' ')
      );
    });
    console.log('\n' + rows.join('\n'));
  });
  it('Glyph skin colors stay apart under every CVD (shapes carry identity too)', () => {
    for (const k of KINDS) expect(minPairDelta(LOOKS.glyph!.colors.slice(1), k)).toBeGreaterThan(10);
  });
  it('default Pebble skin keeps a floor under deutan/protan', () => {
    for (const k of ['protan', 'deutan'] as const)
      expect(minPairDelta(LOOKS.pebble!.colors.slice(1), k)).toBeGreaterThan(10);
  });
});
