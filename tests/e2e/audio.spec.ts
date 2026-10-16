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
  // music is a bed: present, but always well under the gameplay sounds
  for (const m of ['music', 'musicNight']) {
    expect(lv[m]!.rms, m).toBeGreaterThan(0.01);
    expect(lv[m]!.rms, m).toBeLessThan(0.045);
    expect(lv[m]!.peak, m).toBeLessThan(lv.capture!.peak * 0.6);
  }
});
