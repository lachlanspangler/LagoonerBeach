/** Art critique round 5: a species page opens eyes-open (a new catch on idle, no signature at first). */
import { describe, expect, it } from 'vitest';
import { OPEN_IDLE_MS, pageFace } from '../../src/ui/pageFace.ts';

describe('species page face', () => {
  it('a new catch is awake and idle from its first frame (no dozing face, no shy look, no signature)', () => {
    for (const dt of [null, 0, 100, 650, 700, OPEN_IDLE_MS - 1])
      expect(pageFace({ animate: true, wake: true, shy: true }, dt), String(dt)).toEqual({
        expression: 'idle',
        awake: true,
        noSignature: true,
      });
    // later the page lives normally (its shy look, signatures)
    expect(pageFace({ animate: true, wake: true, shy: true }, OPEN_IDLE_MS + 1)).toEqual({
      expression: 'shy',
      awake: true,
      noSignature: false,
    });
    // reduced motion: idle, eyes open
    expect(pageFace({ animate: true, wake: true, shy: true, still: true }, 99_999).expression).toBe('idle');
  });
  it('any animated page (a Night species at Night too) holds its signature for the opening moment', () => {
    expect(pageFace({ animate: true }, 200)).toEqual({ expression: undefined, awake: false, noSignature: true });
    expect(pageFace({ animate: true }, OPEN_IDLE_MS + 1).noSignature).toBe(false);
    expect(pageFace({}, 0).noSignature).toBe(false); // static tiles: n/a
  });
});
