/**
 * Beach Journal requirements (docs/research/JOURNAL_REQUIREMENTS.md): every habitat shows its
 * requirement (generated from the rules), found/total and a tick when complete; the rarity and golden
 * summary; the gate nudges; undiscovered tiles never leak a name; Larger text still fits.
 */
import { expect, test, type Page } from '@playwright/test';
import { HABITATS, SPECIES } from '../../src/meta/creatures.ts';
import { habitatLine, hintFor } from '../../src/meta/reqText.ts';
import { boot } from './helpers.ts';

async function openJournal(page: Page, ids: readonly string[] = []) {
  await page.evaluate((list) => {
    const a = (window as any).__atoll;
    a.profile().firstRunDone = true;
    if (list.length) a.stageJournal(list);
  }, ids);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('button', { name: /Beach Journal/ })
    .first()
    .click();
  await expect(page.locator('.sheet.journal, .journal').first()).toBeVisible();
  await page.waitForTimeout(500);
}

// the journal draws 47 living thumbnails: give the longer flows room on a busy machine
test.describe.configure({ timeout: 180_000 });

const sec = (page: Page, h: string) => page.locator(`.j-sec[data-habitat="${h}"]`);
const REEF = SPECIES.filter((s) => s.habitat === 'reef').map((s) => s.id);
const SOME = ['minnow', 'hermit', 'sandeel', 'octopus', 'moonjelly', ...REEF];

test('every habitat shows its requirement line and its progress, as a heading', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await openJournal(page, SOME);
  for (const h of HABITATS) {
    const list = SPECIES.filter((s) => s.habitat === h.id);
    const got = list.filter((s) => SOME.includes(s.id)).length;
    const s = sec(page, h.id);
    await expect(s.locator('.j-req')).toHaveText(habitatLine(h.id));
    await expect(s.locator('.j-req')).toBeVisible();
    await expect(s.locator('.j-count')).toHaveText(new RegExp(`^${got}/${list.length}`));
    // screen readers hear "Shallows, 2 of 10 found" (", complete" when it is)
    const done = got === list.length;
    await expect(
      // (the hidden status is its own box, so the computed name has a space before the comma)
      page.getByRole('heading', {
        name: new RegExp(`^${h.name}\\s*, ${got} of ${list.length} found${done ? ', complete' : ''}$`),
      }),
    ).toBeVisible();
  }
  // the requirement lines are the shipped copy, not hand-typed in the test
  await expect(sec(page, 'night').locator('.j-req')).toHaveText('Only in the Night theme');
  await expect(sec(page, 'reef').locator('.j-req')).toHaveText('Only in Reef puzzles');
});

test('a complete habitat gets a tick and its golden count; incomplete ones do not', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await openJournal(page, SOME);
  // stageJournal makes every 9th staged species golden: the first one (minnow) is not in Reef
  await expect(sec(page, 'reef')).toHaveClass(/done/);
  await expect(sec(page, 'reef').locator('.j-tick')).toBeVisible();
  await expect(sec(page, 'reef').locator('.j-hgold')).toHaveText(/Golden \d\/4/);
  // complete: no nudge, even though Reefs aren't being played
  await expect(sec(page, 'reef').getByRole('button', { name: 'Play Reef puzzles' })).toHaveCount(0);
  for (const h of ['shallows', 'lagoon', 'deep', 'night', 'legend']) {
    await expect(sec(page, h).locator('.j-tick')).toHaveCount(0);
    await expect(sec(page, h).locator('.j-hgold')).toHaveCount(0);
  }
  // a full journal: every habitat ticks
  await page.keyboard.press('Escape');
  await openJournal(
    page,
    SPECIES.map((s) => s.id),
  );
  await expect(page.locator('.j-sec .j-tick')).toHaveCount(HABITATS.length);
  await expect(page.locator('.j-tiers li.done')).toHaveCount(5);
});

test('rarity and golden summary: counts per tier and the golden odds from the game', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await openJournal(page, SOME);
  const tiers = page.locator('.j-tiers li');
  await expect(tiers).toHaveCount(5);
  const want: Record<string, [number, number]> = {};
  for (const r of ['common', 'uncommon', 'rare', 'epic', 'legendary'])
    want[r] = [
      SPECIES.filter((s) => s.rarity === r && SOME.includes(s.id)).length,
      SPECIES.filter((s) => s.rarity === r).length,
    ];
  for (const [r, [got, total]] of Object.entries(want))
    await expect(page.locator(`.j-tiers li.r-${r} .num`)).toHaveText(`${got}/${total}`);
  await expect(page.locator('.j-tiers li.r-common .sr-only')).toHaveText(
    `Common: ${want.common![0]} of ${want.common![1]} found`,
  );
  // one golden staged (every 9th: the first staged id)
  await expect(page.locator('.j-gold')).toContainText(`Golden 1/${SPECIES.length}`);
  await expect(page.locator('.j-gold')).toContainText('1 in 64 catches of a creature you’ve already found');
});

test('undiscovered tiles keep the secret: silhouettes, ???, and a hint that never names them', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await openJournal(page, ['minnow']);
  const locked = page.locator('.j-tile.locked');
  await expect(locked).toHaveCount(SPECIES.length - 1);
  const tiles = await locked.evaluateAll((els) =>
    els.map((e) => ({ text: e.textContent ?? '', label: e.getAttribute('aria-label') ?? '' })),
  );
  const names = SPECIES.filter((s) => s.id !== 'minnow').map((s) => s.name);
  for (const t of tiles) {
    expect(t.text).toContain('???');
    expect(t.label).toMatch(/^Unknown (common|uncommon|rare|epic|legendary) creature.*\. How to find it: /);
    for (const n of names) {
      expect(t.text).not.toContain(n);
      expect(t.label).not.toContain(n);
    }
  }
  // the label carries the generated hint (and any condition badge)
  const otter = SPECIES.find((s) => s.id === 'otter')!;
  await expect(
    page.getByRole('button', { name: `Unknown rare creature, Daily only. How to find it: ${hintFor(otter)}` }),
  ).toHaveCount(1);
  // the species page says how to find it, still without the name
  await page
    .getByRole('button', { name: `Unknown rare creature, Daily only. How to find it: ${hintFor(otter)}` })
    .click();
  await expect(page.locator('.sp-name')).toHaveText('???');
  await expect(page.locator('.sp-how')).toContainText('How to find it');
  await expect(page.locator('.sp-how p')).toHaveText(hintFor(otter));
  await expect(page.locator('.sp-how')).toContainText('Daily only');
  await expect(page.locator('.sheet').last()).not.toContainText(otter.name);
});

test('found species: badge in the label, and "How to find it" on its page', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await openJournal(page, ['minnow']);
  const tile = page.getByRole('button', { name: /^Silver Minnow, common, caught \d+, Day theme only/ });
  await expect(tile.locator('.j-badge.b-day')).toHaveCount(1);
  await tile.click();
  await expect(page.locator('.sp-how p')).toHaveText(hintFor(SPECIES.find((s) => s.id === 'minnow')!));
  await expect(page.locator('.sp-how')).toContainText('Day theme only');
});

test('gate nudges: "Switch to Night" in Day, "Play Reefs" outside Reefs; neither once the gate is open', async ({
  page,
}) => {
  await boot(page, 'seed=3&fast=1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
  await openJournal(page, ['minnow']);
  const toNight = sec(page, 'night').getByRole('button', { name: 'Switch to the Night theme' });
  await expect(toNight).toBeVisible();
  await expect(sec(page, 'reef').getByRole('button', { name: 'Play Reef puzzles' })).toBeVisible();
  // the mixed habitats have no gate, so no nudge
  for (const h of ['shallows', 'lagoon', 'deep', 'legend']) await expect(sec(page, h).locator('.j-go')).toHaveCount(0);
  const box = await toNight.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  // it switches for real and shows the Theme setting, so it's one tap back
  await toNight.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.getByRole('radio', { name: 'Theme Night' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Done' }).click();
  await openJournal(page);
  await expect(sec(page, 'night').locator('.j-go')).toHaveCount(0);
  // Reefs: the nudge starts Reef mode; in Reef mode the journal has no nudge at all
  await sec(page, 'reef').getByRole('button', { name: 'Play Reef puzzles' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await openJournal(page);
  await expect(page.locator('.j-go')).toHaveCount(0);
});

test('Night theme: the journal reads the same, with the Night section open', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await boot(page, 'seed=3&fast=1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await openJournal(page, SOME);
  await expect(sec(page, 'night').locator('.j-go')).toHaveCount(0);
  await expect(sec(page, 'night').locator('.j-req')).toBeVisible();
  // ink-2 on the sheet, as everywhere else (AA pairs live in tests/unit/contrast.test.ts)
  const [fg, bg] = await sec(page, 'night')
    .locator('.j-req')
    .evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e.closest('.sheet')!).backgroundColor]);
  expect(fg).not.toBe(bg);
});

test('Larger text at 375×667: requirement rows wrap inside the sheet, nothing is clipped', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await boot(page, 'seed=3&fast=1');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Larger text' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-large', '1');
  await page.getByRole('button', { name: 'Done' }).click();
  await openJournal(page, SOME);
  const bad = await page.evaluate(() => {
    const sheet = document.querySelector('.veil.show .sheet')!.getBoundingClientRect();
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      '.j-sum, .j-tiers li, .j-gold, .j-sec > h3, .j-count, .j-reqrow, .j-req, .j-go, .j-hgold',
    )) {
      const r = el.getBoundingClientRect();
      if (r.left < sheet.left - 0.5 || r.right > sheet.right + 0.5) out.push(`${el.className} outside the sheet`);
      // (the row lends its nudge 8 px of the gutter for a full hit area; its children are checked)
      if (!el.matches('.j-reqrow') && el.scrollWidth > el.clientWidth + 1)
        out.push(`${el.className} clipped (${el.scrollWidth} > ${el.clientWidth})`);
    }
    return out;
  });
  expect(bad).toEqual([]);
  // the tick and the count sit on the heading's row, not under it
  await page.keyboard.press('Escape');
  await openJournal(
    page,
    SPECIES.map((s) => s.id),
  );
  for (const h of HABITATS) {
    const t = await sec(page, h.id).locator('h3').boundingBox();
    const c = await sec(page, h.id).locator('.j-count').boundingBox();
    expect(Math.abs(t!.y + t!.height - (c!.y + c!.height)), h.id).toBeLessThan(t!.height);
  }
});
