/**
 * Bot regression bands: catch accidental balance changes (dealer, scoring, rules). If a change is
 * intentional, re-run `npm run tune`, update the bands, and log it in docs/DIARY.md.
 */
import { describe, expect, it } from 'vitest';
import { greedyBot, randomBot, firstFitBot, humanBot } from '../../src/sim/bots.ts';

import { median, playGame } from '../../src/sim/play.ts';

const run = (bot: typeof randomBot, n: number) =>
  Array.from({ length: n }, (_, i) => playGame(bot, 5000 + i, 1000).summary);

describe('balance bands', () => {
  it('random bot: new players survive a while and capture early', () => {
    const g = run(randomBot, 120);
    const med = median(g.map((x) => x.moves));
    expect(med).toBeGreaterThanOrEqual(14);
    expect(med).toBeLessThanOrEqual(34);
    expect(median(g.map((x) => x.captures))).toBeGreaterThanOrEqual(3);
  });

  it('greedy bot: games end, and last a few minutes', () => {
    const g = run(greedyBot, 24);
    const med = median(g.map((x) => x.moves));
    expect(med).toBeGreaterThanOrEqual(45);
    expect(med).toBeLessThanOrEqual(120);
    expect(g.every((x) => !x.capped)).toBe(true);
  });

  it('human-like bot: median session ≈ 3 minutes (35–75 moves)', () => {
    const g = run(humanBot, 24);
    const med = median(g.map((x) => x.moves));
    expect(med).toBeGreaterThanOrEqual(35);
    expect(med).toBeLessThanOrEqual(75);
  });

  it('no dominant trivial strategy: first-fit is far below greedy', () => {
    const ff = median(run(firstFitBot, 60).map((x) => x.score));
    const gr = median(run(greedyBot, 24).map((x) => x.score));
    expect(ff / gr).toBeLessThan(0.4);
  });
});
