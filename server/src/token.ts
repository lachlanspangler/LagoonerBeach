/**
 * Endless run tokens: `base64url(JSON claims).base64url(HMAC-SHA256(secret, claims))`. Stateless to
 * verify (Web Crypto `verify` is constant-time); single use is enforced by the `used_runs` table.
 */
export interface RunClaims {
  readonly v: 1;
  /** Run id (random). */
  readonly rid: string;
  /** Install id the run was issued to ('' = unbound: the first submitter claims it). */
  readonly pid: string;
  readonly seed: number;
  readonly teach: boolean;
  readonly rules: number;
  readonly iat: number;
  readonly exp: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signRun(c: RunClaims, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(c)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** Claims if the signature is valid (expiry and binding are the caller's checks), else null. */
export async function readRun(token: string, secret: string): Promise<RunClaims | null> {
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const s = unb64url(sig);
  if (!s) return null;
  const ok = await crypto.subtle.verify('HMAC', await key(secret), s, enc.encode(body));
  if (!ok) return null;
  try {
    const c = JSON.parse(new TextDecoder().decode(unb64url(body)!)) as RunClaims;
    if (c.v !== 1 || typeof c.rid !== 'string' || typeof c.pid !== 'string' || typeof c.seed !== 'number') return null;
    return c;
  } catch {
    return null;
  }
}

/** Short stable hash of a run (idempotent retries of the same submission). */
export async function runHash(moves: string, score: number): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${score}:${moves}`)));
  return [...d.slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomU32(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]!;
}
