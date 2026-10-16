import { describe, expect, it } from 'vitest';
import { lagoonPicture, shareText } from '../../src/meta/share.ts';

describe('share', () => {
  it('draws a cropped lagoon with its ring', () => {
    // pocket at (2,2), ring = its 8 neighbors
    const ring = [9, 10, 11, 17, 19, 25, 26, 27];
    expect(lagoonPicture({ cells: [18], ring })).toBe('🟫🟫🟫\n🟫🟦🟫\n🟫🟫🟫');
  });
  it('omits the picture without a lagoon and formats numbers', () => {
    const t = shareText({ date: '2026-10-16', score: 12345, streak: 1, lagoon: null });
    expect(t).toBe('Atoll daily 2026-10-16\n12,345 pts · biggest lagoon 0');
  });
  it('mentions streaks of 2+', () => {
    expect(shareText({ date: '2026-10-16', score: 1, streak: 4, lagoon: null })).toContain('4-day streak');
  });
});
