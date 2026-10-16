/**
 * On-device leaderboard backend: the default until a real server URL is configured (VITE_LB_URL).
 * It runs the same checks as the server (names, rules version, daily seed/window, full replay) and
 * keeps your rows in localStorage. Each board is seeded with deterministic demo players so it looks
 * alive offline and in demos; the UI labels these boards "Demo" (BoardView.demo).
 */
import { RULES_VERSION } from '../core/version.ts';
import { Rng, hashSeed } from '../core/rng.ts';
import { SPECIES } from '../meta/creatures.ts';
import {
  BoardTable,
  boardsFor,
  checkSubmission,
  parseBoard,
  policyFor,
  resolveBoard,
  type BoardId,
  type BoardRef,
  type RunTicket,
  type ScoreSubmission,
  type Standing,
  type SubmitResponse,
} from '../meta/boards.ts';
import { LbError, localKv, type Kv, type LeaderboardBackend } from './leaderboard.ts';

export const K_MOCK = 'atoll.v1.lbmock';

/** Demo players' names (all pass the name filter; see names.test.ts). */
export const DEMO_NAMES = [
  'CORAL',
  'KELP',
  'TIDE',
  'PEARL',
  'SANDY',
  'DRIFT',
  'SHELLY',
  'MARLIN',
  'GULL',
  'ISLA',
  'FINN',
  'JUNO',
  'MAYA',
  'NOOR',
  'KAI',
  'ZOE',
  'OTTO',
  'IVY',
  'LEO',
  'MILO',
  'RUBY',
  'BEA',
  'SOL',
  'MARIS',
  'NAMI',
  'COVE',
  'DUNE',
  'BRINE',
  'SKIPPER',
  'OSPREY',
  'URCHIN',
  'WRASSE',
  'PIPER',
  'SURF',
  'SPRAY',
  'HARBOR',
  'LUNA',
  'REEFY',
  'SAILOR',
  'TERN',
  'AMARA',
  'BODHI',
  'ELIO',
  'HANA',
  'IKAIKA',
  'KIRRA',
  'MATEO',
  'NIAMH',
  'OLA',
  'SIONE',
];

const SHAPE: Record<'daily' | 'week' | 'all', { n: [number, number]; lo: number; hi: number }> = {
  daily: { n: [24, 41], lo: 260, hi: 14_000 },
  week: { n: [40, 81], lo: 500, hi: 22_000 },
  all: { n: [90, 151], lo: 1_200, hi: 60_000 },
};

function localToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface MockOptions {
  kv?: Kv;
  now?: () => number;
  today?: () => string;
  latencyMs?: number;
  /** Simulate being offline (debug: `?lboffline=1`). */
  offline?: () => boolean;
}

export class MockBackend implements LeaderboardBackend {
  readonly kind = 'mock' as const;
  private table = new BoardTable();
  private seeded = new Set<string>();
  private readonly kv: Kv;
  private readonly now: () => number;
  private readonly today: () => string;

  constructor(private readonly o: MockOptions = {}) {
    this.kv = o.kv ?? localKv;
    this.now = o.now ?? (() => Date.now());
    this.today = o.today ?? (() => localToday());
    try {
      this.table.load(JSON.parse(this.kv.get(K_MOCK) ?? 'null'), (r) => !r.id.startsWith('demo:'));
    } catch {
      /* corrupt: start empty */
    }
  }

  private async tick(): Promise<void> {
    if (this.o.offline?.()) throw new LbError('offline');
    const ms = this.o.latencyMs ?? 120;
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }

  private persist(): void {
    const d = this.table.dump();
    for (const k of Object.keys(d)) d[k] = d[k]!.filter((r) => !r.id.startsWith('demo:'));
    this.kv.set(K_MOCK, JSON.stringify(d));
  }

  /** Deterministic demo players for a board (same everywhere, never persisted). */
  private seed(board: BoardId): void {
    if (this.seeded.has(board)) return;
    this.seeded.add(board);
    const kind = board.startsWith('daily:') ? 'daily' : board === 'endless:all' ? 'all' : 'week';
    const s = SHAPE[kind];
    const rng = new Rng(hashSeed(`lb-demo:${board}`));
    const n = s.n[0] + rng.int(s.n[1] - s.n[0]);
    // demo rows predate any real submission on the board, so ties go to them (earlier wins)
    const day = board.startsWith('daily:') ? Date.parse(`${board.slice(6)}T00:00:00Z`) : Date.UTC(2026, 0, 1);
    for (let i = 0; i < n; i++) {
      const u = rng.next();
      const score = Math.floor(s.lo * (s.hi / s.lo) ** (u ** 1.7));
      this.table.put(
        board,
        {
          id: `demo:${i}`,
          name: DEMO_NAMES[rng.int(DEMO_NAMES.length)]!,
          avatar: SPECIES[rng.int(Math.min(24, SPECIES.length))]!.id,
          score,
          moves: 18 + Math.floor(score / 48) + rng.int(12),
          at: day - 86_400_000 + rng.int(3_600_000),
          visible: true,
        },
        'best',
      );
    }
  }

  private resolve(board: BoardRef): BoardId {
    if (!parseBoard(board)) throw new LbError('not_found');
    const b = resolveBoard(board, this.today());
    this.seed(b);
    return b;
  }

  async startRun(): Promise<RunTicket | null> {
    return null; // on-device seeds: nothing to sign
  }

  async markStarted(): Promise<void> {
    /* no tickets, nothing to time */
  }

  async submit(entry: ScoreSubmission): Promise<SubmitResponse> {
    await this.tick();
    const c = checkSubmission(entry, this.now(), RULES_VERSION);
    if (!c.ok) throw new LbError(c.code);
    const { sub, state } = c;
    const out: Standing[] = [];
    this.table.rename(sub.installId, sub.name, sub.avatar);
    for (const b of boardsFor(sub, this.today())) {
      this.seed(b);
      const r = this.table.put(
        b,
        {
          id: sub.installId,
          name: sub.name,
          ...(sub.avatar ? { avatar: sub.avatar } : {}),
          score: state.score,
          moves: state.moves,
          at: this.now(),
          visible: true,
        },
        policyFor(b),
      );
      out.push(this.table.standing(b, sub.installId, r.improved)!);
    }
    this.persist();
    return { verifiedScore: state.score, boards: out };
  }

  async top(board: BoardRef, n: number, installId?: string) {
    await this.tick();
    return this.table.top(this.resolve(board), n, installId);
  }

  async around(board: BoardRef, installId: string, window: number) {
    await this.tick();
    return this.table.around(this.resolve(board), installId, window, window);
  }

  async myRank(board: BoardRef, installId: string) {
    await this.tick();
    return this.table.standing(this.resolve(board), installId, false);
  }

  async deletePlayer(installId: string) {
    await this.tick();
    this.table.deletePlayer(installId);
    this.persist();
  }
}
