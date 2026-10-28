/**
 * Leaderboard UI (lazy-loaded): name entry (seven pebble slots + an on-screen A–Z keypad, hardware
 * keys filtered live) and the boards sheet (Daily / This week / All-time, the "just above you"
 * target, your row pinned, medals, loading/empty/offline/not-named states). Spec:
 * docs/research/UI_DESIGN.md §6.4–6.5. Styles: the "Leaderboards" section of style.css.
 *
 * Hooks into the app through `createLeaderboardUi` (main.ts) and the results-card button
 * (overlay.ts `showGameOver({ leaderboard })`); everything else lives here.
 */
import type { Ui } from './overlay.ts';
import { creatureThumb } from './overlay.ts';
import { icon } from './icons.ts';
import './leaderboard.css';
import type { Profile } from '../platform/storage.ts';
import type { Journal } from '../meta/journal.ts';
import { SPECIES_BY_ID } from '../meta/creatures.ts';
import { NAME_MAX, NAME_REASON_TEXT, sanitizeNameInput, validateName } from '../meta/names.ts';
import {
  resetsIn,
  ALL_TIME,
  dailyBoard,
  utcDay,
  weekBoard,
  type BoardEntry,
  type BoardId,
  type BoardRef,
  type Standing,
} from '../meta/boards.ts';
import { HttpBackend, LbError, LeaderboardClient, type BoardView, type PostOutcome } from '../platform/leaderboard.ts';
import { MockBackend } from '../platform/lbmock.ts';
import type { FinishedRun } from '../platform/runlog.ts';

export type Tab = 'daily' | 'week' | 'all';

export interface LbUiDeps {
  ui: Ui;
  /** Server base URL (VITE_LB_URL); unset → on-device demo boards. */
  url?: string;
  profile: Profile;
  save(): void;
  journal(): Journal;
  clientVersion: string;
  playDaily(): void;
  playEndless(): void;
  click(): void;
  reducedMotion(): boolean;
  /** Debug: simulate being offline. */
  offline?: boolean;
  /** The last finished, locally verified Classic/Daily run (posted by "Choose a name" if it wasn't). */
  lastRun?: () => FinishedRun | null;
}

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All-time' },
];

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const SURPRISE = ['SANDY', 'CORAL', 'KELP', 'TIDE', 'DRIFT', 'PEARL', 'COVE', 'DUNE', 'SURF', 'SPRAY', 'BRINE', 'TERN'];

const fmt = (n: number) => n.toLocaleString('en-US');

function localToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Which board a tab shows; `pin` = the board a just-posted run actually landed on (server's id). */
const boardFor = (t: Tab, pin?: Partial<Record<Tab, BoardId>>): BoardRef =>
  pin?.[t] ?? (t === 'daily' ? dailyBoard(localToday()) : t === 'week' ? 'endless:week' : ALL_TIME);
const tabLabel = (t: Tab) => TABS.find((x) => x.id === t)!.label;

/** The boards a post landed on, by tab, straight from the server's standings (never guessed). */
export function pinnedBoards(o: PostOutcome | undefined): Partial<Record<Tab, BoardId>> {
  const pin: Partial<Record<Tab, BoardId>> = {};
  if (o?.status !== 'posted') return pin;
  for (const s of o.standings) {
    const b = String(s.board) as BoardId;
    if (b === ALL_TIME) pin.all = b;
    else if (b.startsWith('daily:')) pin.daily = b;
    else if (b.startsWith('endless:w')) pin.week = b;
  }
  return pin;
}

/** "today" / "this week" when the board is the current one, else which day or week it is. */
export function periodLabel(board: BoardId, now = new Date()): string {
  if (board.startsWith('daily:')) {
    const day = board.slice(6);
    if (day === localToday(now)) return 'today';
    return day === localToday(new Date(now.getTime() - 86_400_000)) ? 'yesterday' : `on ${day}`;
  }
  if (board.startsWith('endless:w')) {
    if (board === weekBoard(utcDay(now.getTime()))) return 'this week';
    const prev = weekBoard(utcDay(now.getTime() - 7 * 86_400_000));
    return board === prev ? 'last week' : `in week ${Number(board.slice(-2))}`;
  }
  return 'all-time';
}

/** Scallop-shell medal for ranks 1–3 (built as DOM; the rank is set as text). */
function medal(rank: number): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'lb-medal');
  svg.setAttribute('viewBox', '0 0 28 28');
  svg.setAttribute('aria-hidden', 'true');
  const shell = document.createElementNS(NS, 'path');
  shell.setAttribute(
    'd',
    'M14 25c-1.6 0-3-.6-3.6-1.6L3.2 12.6C2.4 11.3 3 9.6 4.4 9c.6-2.6 2.9-4.6 5.6-4.9C11 3.4 12.4 3 14 3s3 .4 4 1.1c2.7.3 5 2.3 5.6 4.9 1.4.6 2 2.3 1.2 3.6l-7.2 10.8c-.6 1-2 1.6-3.6 1.6z',
  );
  const ribs = document.createElementNS(NS, 'path');
  ribs.setAttribute('class', 'lb-medal-ribs');
  ribs.setAttribute('d', 'M14 24V6M9.5 22.5 7 9.5M18.5 22.5 21 9.5');
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', '14');
  t.setAttribute('y', '17.5');
  t.setAttribute('text-anchor', 'middle');
  t.textContent = String(rank);
  svg.append(shell, ribs, t);
  return svg;
}

/** `<tag class=cls>text</tag>`: every server-provided string goes in as text, never as HTML. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** Numbers from the server are formatted only if they really are numbers. */
const num = (v: unknown): string => (typeof v === 'number' && Number.isFinite(v) ? fmt(v) : '–');

const ICON_OFFLINE = icon('offline');

export function createLeaderboardUi(d: LbUiDeps): LeaderboardUi {
  return new LeaderboardUi(d);
}

export class LeaderboardUi {
  readonly client: LeaderboardClient;
  /** Re-render hook for the open boards sheet (background posts refresh it). */
  private refresh: (() => void) | null = null;

  constructor(private readonly d: LbUiDeps) {
    // VITE_LB is replaced at build time, so a release build drops the demo backend entirely
    const backend = d.url
      ? new HttpBackend(d.url)
      : import.meta.env.VITE_LB === 'demo'
        ? new MockBackend({
            offline: () => !!d.offline,
            // demo players fill the boards for automated runs (and `?lbdemo`); a person starts empty
            demoPlayers: navigator.webdriver === true || new URLSearchParams(location.search).has('lbdemo'),
          })
        : (() => {
            throw new Error('leaderboards need VITE_LB_URL (or VITE_LB=demo in dev/tests)');
          })();
    this.client = new LeaderboardClient({
      backend,
      lb: () => (d.profile.lb ??= {}),
      save: d.save,
      avatar: () => this.avatar(),
      clientVersion: d.clientVersion,
    });
    this.client.onPosted = () => this.refresh?.();
  }

  /** Your avatar: the first creature you ever caught (the journal made social at zero art cost). */
  avatar(): string | undefined {
    const e = Object.entries(this.d.journal().entries);
    e.sort(([a, x], [b, y]) => (x.first < y.first ? -1 : x.first > y.first ? 1 : a < b ? -1 : 1));
    return e[0]?.[0];
  }

  /** Background work: pending deletions, queued scores, a spare server seed. */
  async background(): Promise<void> {
    await this.client.processForget();
    await this.client.flush();
    await this.client.prefetchTicket();
  }

  // ── results card hook ───────────────────────────────────────────────────────────────────
  /**
   * The latest finished run that could be posted but hasn't been (the player has no name yet). A
   * "Choose a name" on any boards sheet posts it, so naming yourself never loses that game.
   */
  private unposted: { run: FinishedRun; post: (name: string) => Promise<PostOutcome> } | null = null;
  /** Runs already posted, or declined with "No thanks" (never posted behind the player's back). */
  private handled = new WeakSet<FinishedRun>();

  /** An Endless run that started without a server seed can't be verified by the server. */
  private unranked(run: FinishedRun): boolean {
    return run.mode === 'endless' && !run.runToken && this.client.backend.kind === 'http';
  }

  /** "Choose a name" posts the latest finished game that wasn't posted or declined, if it can be. */
  private postLatest(name: string): Promise<PostOutcome> | undefined {
    if (this.unposted) return this.unposted.post(name);
    const r = this.d.lastRun?.();
    if (!r || this.handled.has(r) || this.unranked(r) || this.client.expired(r)) return undefined;
    this.handled.add(r);
    return this.client.post(r, name);
  }

  forResult(run: FinishedRun | null, mode: 'classic' | 'daily', back: () => void) {
    const tab: Tab = mode === 'daily' ? 'daily' : 'week';
    const unranked = !!run && this.unranked(run);
    // one whose ticket ran out (a game resumed days later) never will be: say so, don't queue it
    const expired = !!run && !unranked && this.client.expired(run);
    const postable = run && !unranked && !expired ? run : null;
    // the Daily's board is the date the game was played on (it may be yesterday by now)
    const pinDaily: Partial<Record<Tab, BoardId>> = run?.date ? { daily: dailyBoard(run.date) } : {};
    let outcome: Promise<PostOutcome> | null = null;
    let button: HTMLButtonElement | null = null;
    const label = (o: PostOutcome) => {
      if (!button) return;
      // the board the server says this run landed on, labelled by what it is (not by a prefix)
      const board = pinnedBoards(o)[tab];
      const s = board && o.status === 'posted' ? o.standings.find((x) => x.board === board) : undefined;
      const text =
        s && board
          ? `Leaderboard · #${num(s.rank)} ${periodLabel(board)}`
          : o.status === 'queued'
            ? 'Leaderboard · posts when online'
            : 'Leaderboard';
      button.textContent = text;
      button.setAttribute('aria-label', text);
    };
    const post = (n: string) => {
      outcome = this.client.post(postable!, n);
      this.handled.add(postable!);
      if (this.unposted?.run === postable) this.unposted = null;
      void outcome.then(label);
      return outcome;
    };
    this.unposted = null;
    const name = this.client.name;
    if (postable && name)
      post(name); // opted in: post automatically
    else if (postable) this.unposted = { run: postable, post };
    const boards = (o: PostOutcome) => ({ ...pinDaily, ...pinnedBoards(o) });
    return {
      mount: (b: HTMLButtonElement) => {
        button = b;
        void outcome?.then(label);
      },
      open: () => {
        if (!postable)
          return this.showBoards(tab, {
            back,
            boards: pinDaily,
            note: unranked ? 'unranked' : expired ? 'expired' : run ? undefined : 'unverified',
          });
        if (outcome) return void outcome.then((o) => this.showBoards(tab, { back, outcome: o, boards: boards(o) }));
        this.showNameEntry({
          score: postable.score,
          mode,
          board: boardFor(tab, pinDaily),
          onDone: (n) => {
            const p = post(n);
            void p.then((o) => {
              // the server's filter is the final word; the client's normally catches this first
              if (o.status === 'rejected' && o.reason === 'name_rejected') this.reopenName(postable, mode, back);
            });
            this.showBoards(tab, { back, pending: p, boards: pinDaily });
          },
          onSkip: () => {
            // "No thanks" declines this score: a later "Choose a name" must not post it
            if (this.unposted?.run === postable) this.unposted = null;
            this.handled.add(postable);
            back();
          },
        });
      },
    };
  }

  private reopenName(run: FinishedRun, mode: 'classic' | 'daily', back: () => void): void {
    this.showNameEntry({
      score: run.score,
      mode,
      error: NAME_REASON_TEXT.blocked,
      onDone: (n) => {
        const o = this.client.post(run, n);
        void o.then((x) => x.status === 'rejected' && x.reason === 'name_rejected' && this.reopenName(run, mode, back));
        this.showBoards(mode === 'daily' ? 'daily' : 'week', {
          back,
          pending: o,
          boards: run.date ? { daily: dailyBoard(run.date) } : {},
        });
      },
      onSkip: back,
    });
  }

  // ── shared bits ─────────────────────────────────────────────────────────────────────────
  private btn(cls: string, html: string, label: string, fn: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.innerHTML = html;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.d.click();
      fn();
    });
    return b;
  }

  private card(extra: string): HTMLElement {
    const c = document.createElement('div');
    c.className = `sheet lb-sheet ${extra}${this.d.reducedMotion() ? ' lb-rm' : ''}`;
    return c;
  }

  private avatarEl(e: { avatar?: string; name: string }, px = 36): HTMLElement {
    const w = document.createElement('span');
    w.className = 'lb-av';
    const sp = e.avatar ? SPECIES_BY_ID.get(e.avatar) : undefined;
    if (sp) w.append(creatureThumb(sp, px, undefined, false, { avatar: true }));
    else w.textContent = String(e.name).slice(0, 1);
    return w;
  }

  /** The rank `score` would take on `board` (from its top rows), or null if it's below them / offline. */
  private async rankFor(board: BoardRef, score: number): Promise<number | null> {
    try {
      const v = await this.client.backend.top(board, 100);
      const above = v.entries.filter((e) => typeof e.score === 'number' && e.score >= score && !e.me).length;
      return above < v.entries.length || v.entries.length >= v.total ? above + 1 : null;
    } catch {
      return null;
    }
  }

  // ── name entry ──────────────────────────────────────────────────────────────────────────
  showNameEntry(o: {
    score?: number;
    mode?: 'classic' | 'daily';
    /** The board the score would land on: the preview row shows the rank it would take there. */
    board?: BoardRef;
    error?: string;
    onDone(name: string): void;
    onSkip(): void;
  }): void {
    const card = this.card('lb-name-sheet');
    card.setAttribute('data-testid', 'lb-name-entry');
    let name = sanitizeNameInput(this.client.name ?? '');
    let error = o.error ?? '';
    const head = document.createElement('div');
    const sub = el('div', 'lb-sub');
    if (o.score !== undefined)
      sub.append(
        `Put your ${o.mode === 'daily' ? 'Daily' : 'Endless'} score of `,
        el('b', 'lb-num', num(o.score)),
        ' on the beach board?',
      );
    else sub.textContent = 'Shown next to your scores on the boards.';
    head.append(el('h2', 'lb-title', 'Your beach name'), sub);
    // a live preview of your row on the board ("#12 · CORAL · 3,766"), in place of a big name hero
    const preview = document.createElement('div');
    preview.className = 'lb-row lb-preview';
    preview.setAttribute('aria-hidden', 'true');
    const pvRank = el('span', 'lb-rank', '–');
    const pvName = el('span', 'lb-nm');
    const pvScore = el('span', 'lb-sc', o.score !== undefined ? num(o.score) : '');
    preview.append(pvRank, this.avatarEl({ name: '?', avatar: this.avatar() }), pvName, pvScore);
    if (o.score !== undefined && o.board)
      void this.rankFor(o.board, o.score).then((r) => r && (pvRank.textContent = `#${num(r)}`));
    const slots = document.createElement('div');
    slots.className = 'lb-slots';
    slots.tabIndex = 0;
    slots.setAttribute('role', 'textbox');
    slots.setAttribute('aria-label', `Beach name, ${NAME_MAX} letters max`);
    slots.setAttribute('data-testid', 'lb-slots');
    const slotEls = Array.from({ length: NAME_MAX }, () => {
      const s = document.createElement('span');
      s.className = 'lb-slot';
      slots.append(s);
      return s;
    });
    const hint = document.createElement('div');
    hint.className = 'lb-hint';
    hint.id = 'lb-name-hint';
    hint.setAttribute('aria-live', 'polite');
    slots.setAttribute('aria-describedby', hint.id);

    const keys = document.createElement('div');
    keys.className = 'lb-keys';
    const done = this.btn('lb-key lb-key-wide lb-done', '<span>Post</span>', 'Post score', () => submit());
    done.setAttribute('data-testid', 'lb-post');
    const back = this.btn('lb-key lb-key-wide', '<span>⌫</span>', 'Delete letter', () => del());
    KEY_ROWS.forEach((row, i) => {
      const r = document.createElement('div');
      r.className = 'lb-key-row';
      if (i === 2) r.append(back);
      for (const ch of row) r.append(this.btn('lb-key', `<span>${ch}</span>`, ch, () => add(ch)));
      if (i === 2) r.append(done);
      keys.append(r);
    });

    const actions = document.createElement('div');
    actions.className = 'lb-actions';
    actions.append(
      this.btn('btn ghost', 'Surprise me', 'Surprise me: pick a beach name', () => {
        const pool = SURPRISE.filter((w) => w !== name);
        name = pool[Math.floor(Math.random() * pool.length)]!;
        error = '';
        render(true);
      }),
      this.btn('btn ghost', 'No thanks', 'No thanks', () => o.onSkip()),
    );
    const foot = document.createElement('div');
    foot.className = 'foot';
    foot.innerHTML = `Posting shares this name, your score and the moves of the game. <a href="./privacy.html" target="_blank" rel="noopener" style="color:inherit">Privacy</a>`;

    const render = (popLast = false) => {
      pvName.textContent = name || 'Your name';
      pvName.classList.toggle('lb-dim', !name);
      slotEls.forEach((s, i) => {
        s.textContent = name[i] ?? '';
        s.classList.toggle('filled', i < name.length);
        s.classList.toggle('active', i === name.length);
        s.classList.toggle('pop', popLast && i === name.length - 1);
      });
      slots.setAttribute('aria-valuetext', name || 'empty');
      const v = validateName(name);
      const left = NAME_MAX - name.length;
      hint.classList.toggle('bad', !!error || (!v.ok && v.reason !== 'empty'));
      hint.textContent =
        error ||
        (v.ok
          ? left
            ? `${left} letter${left > 1 ? 's' : ''} left · A–Z only`
            : `${NAME_MAX} letters · A–Z only`
          : v.reason === 'empty'
            ? `Up to ${NAME_MAX} letters, A–Z`
            : NAME_REASON_TEXT[v.reason]);
      done.disabled = !v.ok;
    };
    const shake = () => {
      error = 'Letters A–Z only';
      render();
      slots.classList.remove('shake');
      void slots.offsetWidth;
      slots.classList.add('shake');
    };
    const add = (raw: string) => {
      const ch = sanitizeNameInput(raw);
      if (!ch) return shake();
      error = '';
      if (name.length >= NAME_MAX) {
        error = `${NAME_MAX} letters max`;
        render();
        return;
      }
      name = sanitizeNameInput(name + ch);
      render(true);
    };
    const del = () => {
      name = name.slice(0, -1);
      error = '';
      render();
    };
    const submit = () => {
      const v = validateName(name);
      if (!v.ok) {
        error = NAME_REASON_TEXT[v.reason];
        render();
        return;
      }
      this.client.setName(name);
      o.onDone(name);
    };

    // hardware keyboards: letters type, Backspace deletes, Enter posts, anything else is refused.
    // Listens on the document while this sheet is up (focus may sit on the dialog itself).
    const onKey = (e: KeyboardEvent) => {
      if (!card.isConnected) return document.removeEventListener('keydown', onKey);
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Escape' || e.key === 'Tab') return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        del();
      } else if (
        e.key === 'Enter' &&
        (document.activeElement === slots || !(document.activeElement instanceof HTMLButtonElement))
      ) {
        e.preventDefault();
        submit();
      } else if (e.key.length === 1 && e.key !== ' ') {
        e.preventDefault();
        add(e.key);
      }
    };
    document.addEventListener('keydown', onKey);
    // pasting (or a screen reader typing into the textbox) is filtered the same way
    slots.addEventListener('paste', (e) => {
      e.preventDefault();
      const t = sanitizeNameInput(e.clipboardData?.getData('text') ?? '');
      if (!t) return shake();
      name = sanitizeNameInput(name + t);
      error = '';
      render(true);
    });

    card.append(head, preview, slots, hint, keys, actions, foot);
    render();
    this.d.ui.present(card, () => o.onSkip());
    if (matchMedia('(pointer: fine)').matches) slots.focus({ preventScroll: true });
  }

  // ── boards ──────────────────────────────────────────────────────────────────────────────
  showBoards(
    tab: Tab,
    o: {
      back?: () => void;
      outcome?: PostOutcome;
      pending?: Promise<PostOutcome>;
      note?: 'unranked' | 'unverified' | 'expired';
      /** Show these boards instead of the current ones (the boards a just-finished run belongs to). */
      boards?: Partial<Record<Tab, BoardId>>;
    } = {},
  ): void {
    const card = this.card('lb-board');
    card.setAttribute('data-testid', 'lb-board');
    // queued scores whose ticket expired while waiting are dropped; say so once
    const dropped = this.client.takeExpiredDrops();
    const head = document.createElement('div');
    head.className = 'lb-head';
    head.innerHTML = `<h2 class="lb-title">Leaderboard</h2>${this.client.demo ? '<span class="lb-chip lb-demo" title="Sample players on this device">Demo</span>' : ''}`;
    // one primary action at the bottom; closing is the grabber, a swipe down, or this small ×
    const closeAll = () => {
      this.refresh = null;
      this.d.ui.close();
    };
    head.append(this.btn('lb-x', icon('close'), 'Close leaderboard', closeAll));
    const tabs = document.createElement('div');
    tabs.className = 'lb-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Leaderboard period');
    const panel = document.createElement('div');
    panel.className = 'lb-panel';
    panel.id = 'lb-panel';
    panel.setAttribute('role', 'tabpanel');
    const target = document.createElement('div');
    target.className = 'lb-target';
    target.setAttribute('aria-live', 'polite');
    const list = document.createElement('div');
    list.className = 'lb-list';
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', 'Rankings');
    // scrolled: rows passing under the card above the list fade out too (they used to slide under
    // the pinned "Next up" card sliced and unmasked)
    const edge = () => list.classList.toggle('scrolled', list.scrollTop > 1);
    list.addEventListener('scroll', edge, { passive: true });
    // "you" when you're not on the board yet: pinned under the list, outside the scroller (a sticky
    // row inside it let the rows behind show around it)
    const pin = document.createElement('div');
    pin.className = 'lb-pin';
    panel.append(target, list, pin);
    const foot = document.createElement('div');
    foot.className = 'foot lb-foot';

    let current = tab;
    let loadToken = 0;
    const tabBtns = TABS.map((t) => {
      const b = this.btn('lb-tab', t.label, t.label, () => select(t.id, true));
      b.id = `lb-tab-${t.id}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', panel.id);
      tabs.append(b);
      return b;
    });
    tabs.addEventListener('keydown', (e) => {
      const i = TABS.findIndex((t) => t.id === current);
      const j =
        e.key === 'ArrowRight'
          ? (i + 1) % 3
          : e.key === 'ArrowLeft'
            ? (i + 2) % 3
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? 2
                : -1;
      if (j < 0) return;
      e.preventDefault();
      select(TABS[j]!.id, true);
      tabBtns[j]!.focus();
    });

    const select = (t: Tab, user = false) => {
      current = t;
      tabBtns.forEach((b, i) => {
        const on = TABS[i]!.id === t;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', `lb-tab-${t}`);
      if (user) this.d.ui.announce(`${tabLabel(t)} leaderboard`);
      void load();
    };

    const load = async () => {
      const token = ++loadToken;
      const t = current;
      list.setAttribute('aria-busy', 'true');
      target.replaceChildren();
      pin.replaceChildren();
      list.replaceChildren(...Array.from({ length: 6 }, () => skeleton()));
      if (o.pending && t === tab) {
        const r = await o.pending;
        if (token !== loadToken) return;
        o.outcome = r;
        o.pending = undefined;
        o.boards = { ...o.boards, ...pinnedBoards(r) };
      }
      let v: BoardView | null = null;
      let failed: LbError | null = null;
      try {
        v = await this.client.view(boardFor(t, o.boards));
      } catch (e) {
        failed = e instanceof LbError ? e : new LbError('offline');
      }
      if (token !== loadToken) return;
      list.removeAttribute('aria-busy');
      if (!v) return renderOffline(t, failed!);
      renderBoard(t, v);
    };
    this.refresh = () => card.isConnected && void load();

    const skeleton = () => {
      const s = document.createElement('div');
      s.className = 'lb-row lb-skel';
      s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<span class="lb-rank"></span><span class="lb-av"></span><i></i><b></b>';
      return s;
    };

    // every server-provided value below goes in through textContent / setAttribute, never innerHTML
    const row = (e: BoardEntry) => {
      const r = document.createElement('div');
      const top3 = typeof e.rank === 'number' && e.rank >= 1 && e.rank <= 3 ? e.rank : 0;
      r.className = `lb-row${e.me === true ? ' me' : ''}${top3 ? ` r${top3}` : ''}`;
      r.setAttribute('role', 'listitem');
      r.setAttribute(
        'aria-label',
        `${e.me === true ? 'You, ' : ''}rank ${num(e.rank)}, ${String(e.name)}, ${num(e.score)}`,
      );
      const rank = el('span', 'lb-rank');
      if (top3) rank.append(medal(top3));
      else rank.textContent = num(e.rank);
      const nm = el('span', 'lb-nm', String(e.name));
      if (e.me === true) nm.append(' ', el('span', 'lb-you', 'You'));
      const sc = el('span', 'lb-sc', num(e.score));
      if (current === 'daily') sc.append(el('small', '', `${num(e.moves)} moves`));
      r.append(rank, this.avatarEl(e), nm, sc);
      return r;
    };

    const gap = () => {
      const g = document.createElement('div');
      g.className = 'lb-gap';
      g.setAttribute('aria-hidden', 'true');
      g.textContent = '···';
      return g;
    };

    const playBtn = (t: Tab, primary = true) =>
      t === 'daily'
        ? this.btn(`btn${primary ? ' primary' : ''}`, 'Play the daily', 'Play the daily', () => this.d.playDaily())
        : this.btn(`btn${primary ? ' primary' : ''}`, 'Play Endless', 'Play Endless', () => this.d.playEndless());

    const renderTarget = (t: Tab, v: BoardView) => {
      target.replaceChildren();
      const me = v.me;
      const msg = outcomeNote(o.outcome, t, o.boards?.[t]);
      // the note and, for the current Daily / week, when the board starts over
      const pinned = o.boards?.[t];
      const live = t !== 'all' && (!pinned || periodLabel(pinned) === (t === 'daily' ? 'today' : 'this week'));
      if (msg || live) {
        const meta = el('div', 'lb-meta');
        meta.append(el('div', `lb-note${o.outcome?.status === 'rejected' ? ' bad' : ''}`, msg ?? ''));
        if (live) meta.append(el('div', 'lb-reset', resetsIn(t === 'daily' ? 'daily' : 'week', new Date())));
        target.append(meta);
      }
      if (dropped)
        target.append(
          el(
            'div',
            'lb-note bad',
            `Unranked: ${dropped} saved score${dropped > 1 ? 's' : ''} waited past ${dropped > 1 ? 'their' : 'its'} run ticket (72 hours), so ${dropped > 1 ? 'they' : 'it'} won't post.`,
          ),
        );
      if (!me) return;
      const box = document.createElement('div');
      box.className = 'lb-target-card';
      const score = (x: BoardEntry) => (typeof x.score === 'number' ? x.score : 0);
      if (me.rank === 1) {
        const second = v.top[1];
        box.classList.add('gold');
        const line = el('div', 'lb-target-line', "You're on top.");
        if (second) line.append(' Best by ', el('b', 'lb-num', num(score(me) - score(second))));
        box.append(line);
      } else if (v.above) {
        const a = v.above;
        const name = String(a.name);
        const need = score(a) - score(me) + 1; // ties go to whoever posted first
        const pct = Math.max(4, Math.min(100, Math.round((score(me) / Math.max(1, score(a))) * 100)));
        box.append(this.avatarEl(a, 40));
        const txt = el('div', 'lb-target-txt');
        const who = el('div', 'lb-target-who');
        who.append(`Next up · #${num(a.rank)}`); // the name lives in the line below, once
        const line = el('div', 'lb-target-line');
        line.append(el('b', 'lb-num', num(need)), ' to pass ', el('span', 'lb-nm', name));
        const bar = el('div', 'bar');
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-label', `Your score as a share of ${name}'s`);
        bar.setAttribute('aria-valuenow', String(pct));
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        const fill = el('i', '');
        fill.style.width = `${pct}%`;
        bar.append(fill);
        txt.append(who, line, bar);
        box.append(txt);
        box.setAttribute('aria-label', `${name} is ${num(score(a) - score(me))} ahead. Beat them!`);
      }
      // Play sits in the target card (a full-width button under it left the list ~2 rows on a phone)
      if (me.rank > 1 && t !== 'daily') {
        const play = playBtn(t);
        play.classList.add('lb-target-play');
        play.textContent = 'Play';
        box.append(play);
      }
      target.append(box);
    };

    const renderBoard = (t: Tab, v: BoardView) => {
      renderTarget(t, v);
      if (v.total === 0) {
        const empty = document.createElement('div');
        empty.className = 'lb-empty';
        const sp = SPECIES_BY_ID.get('hermit');
        if (sp) empty.append(creatureThumb(sp, 72, undefined, false, { avatar: true }));
        const pinned = o.boards?.[t];
        empty.append(
          el(
            'div',
            '',
            t === 'all'
              ? 'Be the first on the beach'
              : `Be the first on the beach ${pinned ? periodLabel(pinned) : t === 'daily' ? 'today' : 'this week'}`,
          ),
        );
        empty.append(playBtn(t));
        list.replaceChildren(empty);
      } else {
        const rows: HTMLElement[] = [];
        if (v.window.length) {
          const first = v.window[0]!.rank;
          const head = v.top.filter((e) => e.rank < first).slice(0, first <= 5 ? first - 1 : 3);
          rows.push(...head.map(row));
          if (head.length && head.at(-1)!.rank + 1 < first) rows.push(gap());
          rows.push(...v.window.map(row));
        } else {
          const upto = v.me ? Math.max(10, v.me.rank + 5) : 10;
          rows.push(...v.top.filter((e) => e.rank <= upto).map(row));
        }
        pin.replaceChildren(
          ...(v.me
            ? []
            : [this.youRow(t, v, (p) => this.showBoards(current, p ? { ...o, outcome: undefined, pending: p } : o))]),
        );
        list.replaceChildren(...rows);
        scrollToMe(list);
        requestAnimationFrame(() => scrollToMe(list)); // again once the sheet has its final size
      }
      foot.replaceChildren();
      const bits: string[] = [];
      if (v.stale) bits.push("You're offline: showing the last board you loaded.");
      if (this.client.demo)
        bits.push('Demo board: sample players on this device. Global boards arrive with the online update.');
      if (o.note === 'unranked') bits.push('This run started offline, so it is unranked.');
      if (o.note === 'expired') bits.push("Unranked: this run's ticket expired (runs must finish within 72 hours).");
      if (o.note === 'unverified') bits.push("This run can't be posted (it began before leaderboards were on).");
      if (this.client.upgradeRequired) bits.push('Update the game to post new scores.');
      const pinned = o.boards?.[t];
      if (pinned && t !== 'all' && periodLabel(pinned) !== (t === 'daily' ? 'today' : 'this week'))
        bits.push(`Showing the board this game counts on: ${periodLabel(pinned).replace(/^(on|in) /, '')}.`);
      foot.textContent = bits.join(' ');
      // the count is its own fact on its own line (it ran into the demo note's last sentence)
      const count = document.createElement('div');
      count.className = 'lb-count';
      count.textContent = `${num(v.total)} player${v.total === 1 ? '' : 's'}`;
      foot.append(count);
      if (this.client.name) foot.append(this.renameBtn(() => this.showBoards(current, o)));
    };

    const renderOffline = (t: Tab, e: LbError) => {
      target.replaceChildren();
      const box = document.createElement('div');
      box.className = 'lb-empty lb-offline';
      const pend = this.client.pending().filter((p) => (t === 'daily' ? p.mode === 'daily' : p.mode === 'endless'));
      const offline = e.retryable;
      box.innerHTML = `${ICON_OFFLINE}<div>${
        offline
          ? `You're offline: ${pend.length ? 'your score is saved and will post when you’re back' : 'boards will load when you’re back'}.`
          : "Couldn't load this board."
      }</div>`;
      box.append(this.btn('btn', 'Try again', 'Try again', () => void load()));
      const rows: HTMLElement[] = [box];
      const best = pend.length
        ? Math.max(...pend.map((p) => p.score))
        : t === 'daily'
          ? (this.d.profile.dailyBest[localToday()] ?? 0)
          : this.d.profile.best;
      if (best > 0) {
        const r = row({
          rank: 0,
          name: this.client.name ?? '', // unnamed: the You chip alone (not "YOU You")
          score: best,
          moves: 0,
          me: true,
          avatar: this.avatar(),
        });
        r.querySelector('.lb-rank')!.textContent = '–';
        r.setAttribute('aria-label', `Your ${pend.length ? 'unposted' : 'local'} best, ${num(best)}`);
        rows.push(r);
      }
      list.replaceChildren(...rows);
      foot.textContent = this.client.demo ? 'Demo board.' : '';
    };

    card.append(head, tabs, panel, foot);
    card.append(
      o.back
        ? this.btn('btn primary', 'Back to results', 'Back to results', () => o.back!())
        : this.btn('btn primary', 'Done', 'Done', closeAll),
    );
    this.d.ui.present(card, o.back ?? true);
    select(tab);
  }

  /** "Not yet named" / "not on this board yet" pinned row. */
  private youRow(t: Tab, _v: BoardView, reopen: (posting?: Promise<PostOutcome>) => void): HTMLElement {
    const r = document.createElement('div');
    r.className = 'lb-row me lb-you-row';
    r.setAttribute('role', 'listitem');
    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = '–';
    r.append(rank, this.avatarEl({ name: this.client.name ?? '?', avatar: this.avatar() }));
    if (!this.client.name) {
      r.append(
        this.btn('lb-choose', 'Choose a name', 'Choose a name', () =>
          this.showNameEntry({
            // naming yourself posts the game you just finished (if it could be posted), not only the name
            onDone: (n) => reopen(this.postLatest(n)),
            onSkip: () => reopen(),
          }),
        ),
      );
    } else {
      const s = document.createElement('span');
      s.className = 'lb-nm lb-dim';
      s.textContent = t === 'daily' ? 'Finish today’s Daily to join' : 'Finish an Endless game to join';
      r.append(s);
    }
    return r;
  }

  private renameBtn(reopen: () => void): HTMLButtonElement {
    return this.btn('lb-rename', 'Change name', 'Change your leaderboard name', () =>
      this.showNameEntry({ onDone: () => reopen(), onSkip: reopen }),
    );
  }
}

/** Why a post was refused, in words (exported for tests). */
export function rejectionText(reason: string): string {
  switch (reason) {
    case 'name_rejected':
      return 'That name was refused. Try another.';
    case 'board_closed':
      return 'That Daily has closed, so the score stays on your device.';
    case 'upgrade_required':
      return 'Update the game to post scores.';
    case 'token_expired':
      return "Unranked: this run's ticket expired (runs must finish within 72 hours).";
    case 'duplicate_run':
      return 'This run was already posted.';
    case 'board_limit':
      return 'Unranked: this network has already posted its share of scores on this Daily.';
    case 'banned':
      return 'Leaderboards are unavailable for this player.';
    case 'replay_invalid':
    case 'score_mismatch':
    case 'seed_mismatch':
    case 'token_invalid':
      return "This score couldn't be verified, so it wasn't posted.";
    default:
      return "This score couldn't be posted.";
  }
}

/**
 * Open the list on you and the row you're chasing, both in full: your row is sticky, so
 * scrollIntoView thinks it's already visible (pinned over the rows above it). Centre the pair
 * [row above, you] at your row's natural place; on a short list, the row above goes to the top.
 */
export function scrollToMe(list: HTMLElement): void {
  const me = list.querySelector<HTMLElement>('.lb-row.me');
  if (!me || !list.clientHeight) return;
  const prev = me.previousElementSibling;
  const above = prev instanceof HTMLElement && prev.classList.contains('lb-row') ? prev : null;
  const top0 = list.getBoundingClientRect().top - list.scrollTop;
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  let start: number;
  let end: number;
  if (above) {
    start = above.getBoundingClientRect().top - top0;
    end = start + above.offsetHeight + gap + me.offsetHeight;
  } else {
    // first row, or straight after the "…" gap: your natural place is under the previous element
    const p = me.previousElementSibling as HTMLElement | null;
    start = p ? p.getBoundingClientRect().bottom - top0 + gap : 0;
    end = start + me.offsetHeight;
  }
  const room = list.clientHeight;
  // your row sticks this far inside the scrollport (its sticky offset + the list's padding):
  // keep its natural place inside, so it never pins over the row you're chasing
  const cs = getComputedStyle(list);
  const ms = getComputedStyle(me);
  const mt = (parseFloat(ms.top) || 0) + (parseFloat(cs.paddingTop) || 0) + 2;
  const mb = (parseFloat(ms.bottom) || 0) + (parseFloat(cs.paddingBottom) || 0) + 2;
  const want = end - start <= room - mt - mb ? (start + end) / 2 - (mt + room - mb) / 2 : end - (room - mb); // too short for both: you in full, the row above cut by the top edge
  list.scrollTop = Math.max(0, Math.min(want, list.scrollHeight - room));
}

/** One-line feedback after posting, for the board the tab shows (the server's board id). */
function outcomeNote(o: PostOutcome | undefined, t: Tab, board?: BoardId): string {
  if (!o) return '';
  if (o.status === 'queued') return 'Saved: your score will post when you’re back online.';
  if (o.status === 'rejected') return rejectionText(o.reason);
  const want = board ?? pinnedBoards(o)[t];
  const s: Standing | undefined = want ? o.standings.find((x) => x.board === want) : undefined;
  if (!s) return '';
  if (String(s.board).startsWith('daily:') && !s.improved)
    return `Your first Daily of the day counts: #${num(s.rank)}.`;
  return s.improved
    ? `Posted: #${num(s.rank)} of ${num(s.total)}`
    : `Your best here is still ${num(s.best)} (#${num(s.rank)}).`;
}
