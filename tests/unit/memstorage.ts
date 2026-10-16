/** A localStorage stand-in for Node tests: items are own enumerable properties, like the real one. */
export class MemStorage {
  getItem(k: string): string | null {
    return Object.prototype.hasOwnProperty.call(this, k) ? (this as unknown as Record<string, string>)[k]! : null;
  }
  setItem(k: string, v: string): void {
    (this as unknown as Record<string, string>)[k] = String(v);
  }
  removeItem(k: string): void {
    delete (this as unknown as Record<string, string>)[k];
  }
  clear(): void {
    for (const k of Object.keys(this)) this.removeItem(k);
  }
  key(i: number): string | null {
    return Object.keys(this)[i] ?? null;
  }
  get length(): number {
    return Object.keys(this).length;
  }
}

/** Install a fresh MemStorage as globalThis.localStorage; returns it. */
export function freshLocalStorage(): MemStorage {
  const s = new MemStorage();
  (globalThis as { localStorage?: unknown }).localStorage = s;
  return s;
}
