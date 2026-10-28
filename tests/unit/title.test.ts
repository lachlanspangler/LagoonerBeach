import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WARM_MS, shouldShowTitle } from '../../src/ui/title.ts';

// index.html decides before first paint whether the title shows (ADR 0015); src/ui/title.ts holds
// the same rule for code and tests. Run the inline script itself against a fake page and check the
// two agree on every case, so they can't drift.
const html = readFileSync('index.html', 'utf8');
const inline = html.slice(html.indexOf('(function () {'), html.indexOf('})();') + 5);

function runInline(search: string, title: object, webdriver: boolean, now: number, theme = 'auto', dark = false) {
  const dataset: Record<string, string> = {};
  const store: Record<string, string> = {
    'atoll.v1.title': JSON.stringify(title),
    'atoll.v1.profile': JSON.stringify({ settings: { theme } }),
  };
  const fake = {
    document: { documentElement: { dataset }, fonts: { load: () => undefined } },
    location: { search },
    localStorage: { getItem: (k: string) => store[k] ?? null },
    navigator: { webdriver },
    matchMedia: () => ({ matches: dark }),
    Date: { now: () => now },
    URLSearchParams,
  };
  new Function(...Object.keys(fake), inline)(...Object.values(fake));
  return dataset;
}

describe('title screen: when it shows', () => {
  const now = 1_800_000_000_000;
  const cases: [string, object, boolean][] = [];
  for (const q of [
    '',
    '?mode=daily',
    '?seed=7',
    '?notitle',
    '?title=1',
    '?titlerules',
    '?titlerules&mode=daily',
    '?mode=daily&title',
  ])
    for (const t of [
      {},
      { off: true },
      { at: now - 60_000 },
      { at: now - WARM_MS - 1 },
      { at: now + 60_000 },
      { at: 'x' },
    ])
      for (const wd of [false, true]) cases.push([q, t, wd]);

  it('index.html and shouldShowTitle agree on every case', () => {
    for (const [q, t, wd] of cases)
      expect(runInline(q, t, wd, now).title === '1', `${q} ${JSON.stringify(t)} webdriver=${wd}`).toBe(
        shouldShowTitle(q, t, now, wd),
      );
  });
  it('the rules a player sees', () => {
    expect(shouldShowTitle('', {}, now, false)).toBe(true); // a cold launch
    expect(shouldShowTitle('?mode=daily', {}, now, false)).toBe(false); // a shared Daily: zero taps
    expect(shouldShowTitle('?seed=3', {}, now, false)).toBe(false);
    expect(shouldShowTitle('', { at: now - 9 * 60_000 }, now, false)).toBe(false); // a quick return
    expect(shouldShowTitle('', { at: now - 11 * 60_000 }, now, false)).toBe(true);
    expect(shouldShowTitle('', { at: now + 5_000 }, now, false)).toBe(true); // a clock moved back
    expect(shouldShowTitle('', { off: true }, now, false)).toBe(false); // "Open straight into the game"
    expect(shouldShowTitle('', {}, now, true)).toBe(false); // automated runs, unless asked
    expect(shouldShowTitle('?titlerules', {}, now, true)).toBe(true);
  });
  it('sets the theme before first paint', () => {
    expect(runInline('', {}, false, now, 'night').theme).toBe('night');
    expect(runInline('', {}, false, now, 'day', true).theme).toBe('day');
    expect(runInline('', {}, false, now, 'auto', true).theme).toBe('night');
    expect(runInline('', {}, false, now, 'auto', false).theme).toBe('day');
  });
  it('the wordmark is the only text set in the title subset font', () => {
    // public/fonts/lagoon-title.woff2 holds just these glyphs (scripts/fonts.sh)
    expect(html).toMatch(/<span>Lagooner<\/span> <span>Beach<\/span>/);
    expect(html).toContain('aria-label="Lagooner Beach"');
    const css = readFileSync('src/ui/style.css', 'utf8');
    expect(css.match(/'Lagoon Title'/g)?.length).toBe(2); // the @font-face and .title-word only
  });
});
