/** Small environment helpers (wall clock, entropy) kept out of the pure core. */

/** Local calendar date as YYYY-MM-DD (the daily rolls over at local midnight). */
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A fresh game seed: `?seed=N` when given (tests, repros), otherwise crypto randomness. */
export function freshSeed(params: URLSearchParams): number {
  if (params.has('seed')) return Number(params.get('seed')) >>> 0;
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]!;
}
