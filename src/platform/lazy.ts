/**
 * Lazy chunks that can fail. `import()` rejections used to be cached forever (`p ??= import(…)`),
 * so one dropped request broke Settings/leaderboards/reveals until a reload. `retryable` caches
 * only success; a rejection clears the cache so the next use tries the network again.
 */
export function retryable<T>(load: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () =>
    (p ??= load().catch((e: unknown) => {
      p = null;
      throw e;
    }));
}

const RELOAD_KEY = 'lb.chunkReload';
/** A reload this recent means we already tried: don't loop, let the retry chip take over. */
const RELOAD_GUARD_MS = 30_000;

type Win = Pick<Window, 'addEventListener' | 'sessionStorage'> & { location: Pick<Location, 'reload'> };

/**
 * Vite fires `vite:preloadError` when a lazy chunk (or its CSS) fails to load — usually a deploy
 * replaced the hashed files under an open page. Reload once to pick up the new index; a
 * sessionStorage timestamp guards against reload loops (offline, or a genuinely missing file).
 * The error still propagates, so callers' retry paths run if we don't reload.
 */
export function installPreloadRecovery(w: Win = window, now: () => number = Date.now): void {
  // a chunk aborted because the page is being left (reload, navigation) is not a stale deploy:
  // reloading then would fight the navigation already under way. pagehide only: `beforeunload`
  // also fires for a navigation that is then cancelled, or one that turns into a download, and
  // nothing would clear the flag (no pageshow), leaving recovery off for the rest of the session.
  let leaving = false;
  w.addEventListener('pagehide', () => (leaving = true));
  w.addEventListener('pageshow', () => (leaving = false));
  w.addEventListener('vite:preloadError', () => {
    if (leaving) return;
    try {
      const last = Number(w.sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (now() - last < RELOAD_GUARD_MS) return;
      w.sessionStorage.setItem(RELOAD_KEY, String(now()));
    } catch {
      return; // no sessionStorage: never risk a loop
    }
    w.location.reload();
  });
}
