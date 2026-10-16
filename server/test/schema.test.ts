/**
 * schema.sql can't run here (no SQLite on Node 20), so pin the constraints that matter as text.
 * The name CHECK must constrain every character, not just the first (`GLOB '[A-Z]*'` accepted "A1!").
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

describe('schema.sql', () => {
  it('players.name is 1–7 letters A–Z in every position', () => {
    const check = /name\s+TEXT NOT NULL CHECK \(([^\n]*)\),/.exec(sql)?.[1] ?? '';
    expect(check).toContain("name NOT GLOB '*[^A-Z]*'");
    expect(check).toContain('length(name) BETWEEN 1 AND 7');
    expect(check).not.toMatch(/name GLOB '\[A-Z\]\*'/);
  });
});
