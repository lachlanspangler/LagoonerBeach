/**
 * "Couldn't load — tap to retry": a small chip for a lazy chunk that failed to arrive (flaky
 * network, offline before the chunk was cached). One at a time; tapping it retries the action.
 */
let current: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export function showRetry(retry: () => void, label = 'Couldn’t load — tap to retry'): void {
  dismissRetry();
  const box = document.createElement('div');
  box.className = 'retry-chip';
  box.setAttribute('role', 'status');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'retry-btn';
  b.dataset.testid = 'retry-chip';
  b.textContent = label;
  b.addEventListener('click', () => {
    dismissRetry();
    retry();
  });
  box.append(b);
  document.body.append(box);
  current = box;
  timer = setTimeout(dismissRetry, 10_000);
}

export function dismissRetry(): void {
  clearTimeout(timer);
  current?.remove();
  current = null;
}
