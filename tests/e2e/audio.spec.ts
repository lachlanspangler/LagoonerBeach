/** Audio QA: every synthesized sound renders, never clips, and sits in a sane loudness band. */
import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { boot } from './helpers.ts';

test('sound effects: no clipping, audible, balanced', async ({ page }) => {
  await boot(page);
  const lv: Record<string, { peak: number; rms: number }> = await page.evaluate(() =>
    (window as any).__atoll.audioLevels(),
  );
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/audio-levels.json', JSON.stringify(lv, null, 2));
  for (const [k, v] of Object.entries(lv)) {
    expect(v.peak, `${k} clips`).toBeLessThan(0.98);
    expect(v.peak, `${k} silent`).toBeGreaterThan(0.01);
  }
  // the reward should be louder than the routine; UI ticks quieter than gameplay
  expect(lv.captureBig!.rms).toBeGreaterThan(lv.place!.rms);
  expect(lv.click!.peak).toBeLessThan(lv.capture!.peak);
  expect(lv.captureBig!.rms).toBeGreaterThan(lv.capture!.rms * 1.3);
  // ADR 0012: the stings climb with the moment; "Nice!" stays a whisper, the top words are big
  expect(lv.stingNice!.rms).toBeLessThan(lv.capture!.rms);
  expect(lv.stingLagoon!.rms).toBeGreaterThan(lv.stingNice!.rms);
  expect(lv.stingAtoll!.rms).toBeGreaterThan(lv.stingLagoon!.rms);
  expect(lv.stingAmazing!.rms).toBeGreaterThan(lv.stingLagoon!.rms * 1.3);
  expect(lv.stingSpotless!.rms).toBeGreaterThan(lv.stingLagoon!.rms);
  // combo layers add shimmer, not loudness; a break is a sigh, never louder than a pinch
  expect(lv.captureCombo20!.rms).toBeLessThan(lv.captureBig!.rms * 1.25);
  expect(lv.comboBreak!.peak).toBeLessThan(lv.capture!.peak);
  expect(lv.comboLevel!.peak).toBeLessThan(lv.captureBig!.peak);
  // the whoosh is air under the moment, not a blast
  expect(lv.whoosh!.peak).toBeLessThan(lv.captureBig!.peak);
  // the biggest stacked moment and the fanfare still don't clip (checked above) and lead the mix
  expect(lv.amazingMoment!.rms).toBeGreaterThan(lv.captureBig!.rms);
  expect(lv.fanfare!.rms).toBeGreaterThan(lv.newBest!.rms);
  expect(lv.revealLegendary!.rms).toBeGreaterThan(lv.revealUncommon!.rms);
  expect(lv.revealUncommon!.rms).toBeGreaterThan(lv.discovery!.rms * 0.9);
  // music is a bed: present, but always well under the gameplay sounds
  for (const m of ['music', 'musicNight']) {
    expect(lv[m]!.rms, m).toBeGreaterThan(0.01);
    expect(lv[m]!.rms, m).toBeLessThan(0.045);
    expect(lv[m]!.peak, m).toBeLessThan(lv.capture!.peak * 0.6);
  }
});

test('automated runs make no sound: live output muted unless ?sound=1', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => (window as any).__atoll);
  expect(await page.evaluate(() => (window as any).__atoll.audioMuted())).toBe(true);
  await page.goto('/?debug=1&sound=1');
  await page.waitForFunction(() => (window as any).__atoll);
  expect(await page.evaluate(() => (window as any).__atoll.audioMuted())).toBe(false);
});
