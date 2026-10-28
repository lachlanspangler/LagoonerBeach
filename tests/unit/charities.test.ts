import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARITIES, hostOf } from '../../src/meta/charities.ts';

// The About page's list must be exactly the verified picks in docs/research/CHARITIES.md (ADR 0016).
const doc = readFileSync('docs/research/CHARITIES.md', 'utf8');
const rows = doc
  .split('\n')
  .filter((l) => l.startsWith('| **'))
  .map((l) => l.split('|').map((c) => c.trim()));

describe('charities (About page)', () => {
  it('lists 3–5 charities, each a verified row of the evidence table', () => {
    expect(CHARITIES.length).toBeGreaterThanOrEqual(3);
    expect(CHARITIES.length).toBeLessThanOrEqual(5);
    expect(rows.length).toBe(CHARITIES.length); // bold rows = the picks
    for (const c of CHARITIES) {
      const r = rows.find((x) => x[1] === `**${c.name}**`);
      expect(r, c.name).toBeDefined();
      expect(r![3], `${c.name} EIN`).toBe(c.ein);
      expect(r![6], `${c.name} donate URL`).toContain(c.url);
    }
  });
  it('links are clean https URLs on the charity’s own domain (no tracking, no query)', () => {
    for (const c of CHARITIES) {
      const u = new URL(c.url);
      expect(u.protocol).toBe('https:');
      expect(u.search).toBe('');
      expect(u.hash).toBe('');
      expect(doc).toContain(hostOf(c.url));
    }
    expect(new Set(CHARITIES.map((c) => c.id)).size).toBe(CHARITIES.length);
  });
  it('each shows its own logo, bundled (never hot-linked: no tracking, works offline)', () => {
    for (const c of CHARITIES) {
      expect(c.logo.src, c.name).toMatch(/^\.\/charities\/[a-z]+\.png$/);
      expect(existsSync(`public/${c.logo.src.slice(2)}`), c.logo.src).toBe(true);
    }
  });
});
