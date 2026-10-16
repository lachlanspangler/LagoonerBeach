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
import type { Profile } from '../platform/storage.ts';
import type { Journal } from '../meta/journal.ts';
import { SPECIES_BY_ID } from '../meta/creatures.ts';
import { NAME_MAX, NAME_REASON_TEXT, sanitizeNameInput, validateName } from '../meta/names.ts';
import { dailyBoard, type BoardEntry, type BoardRef, type Standing } from '../meta/boards.ts';
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

const boardFor = (t: Tab): BoardRef =>
  t === 'daily' ? dailyBoard(localToday()) : t === 'week' ? 'endless:week' : 'endless:all';
const tabLabel = (t: Tab) => TABS.find((x) => x.id === t)!.label;

/** Scallop-shell medal for ranks 1–3. */
function medal(rank: number): string {
  return `<svg class="lb-medal" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 25c-1.6 0-3-.6-3.6-1.6L3.2 12.6C2.4 11.3 3 9.6 4.4 9c.6-2.6 2.9-4.6 5.6-4.9C11 3.4 12.4 3 14 3s3 .4 4 1.1c2.7.3 5 2.3 5.6 4.9 1.4.6 2 2.3 1.2 3.6l-7.2 10.8c-.6 1-2 1.6-3.6 1.6z"/><path class="lb-medal-ribs" d="M14 24V6M9.5 22.5 7 9.5M18.5 22.5 21 9.5" /><text x="14" y="17.5" text-anchor="middle">${rank}</text></svg>`;
}

const ICON_OFFLINE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M8.5 8.6A5 5 0 0 0 7 18h10.5M16.6 11A3.5 3.5 0 0 1 20 17.2"/><path d="M10.5 6.2A5 5 0 0 1 16 9"/></svg>`;

export function createLeaderboardUi(d: LbUiDeps): LeaderboardUi {
  return new LeaderboardUi(d);
}

export class LeaderboardUi {
  readonly client: LeaderboardClient;
  /** Re-render hook for the open boards sheet (background posts refresh it). */
  private refresh: (() => void) | null = null;

  constructor(private readonly d: LbUiDeps) {
    const backend = d.url ? new HttpBackend(d.url) : new MockBackend({ offline: () => !!d.offline });
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
  forResult(run: FinishedRun | null, mode: 'classic' | 'daily', back: () => void) {
    const tab: Tab = mode === 'daily' ? 'daily' : 'week';
    // an Endless run that started without a server seed can't be verified by the server
    const unranked = !!run && run.mode === 'endless' && !run.runToken && this.client.backend.kind === 'http';
    const postable = run && !unranked ? run : null;
    let outcome: Promise<PostOutcome> | null = null;
    let button: HTMLButtonElement | null = null;
    const name = this.client.name;
    if (postable && name) outcome = this.client.post(postable, name); // opted in: post automatically
    const label = (o: PostOutcome) => {
      if (!button) return;
      const s =
        o.status === 'posted'
          ? o.standings.find((x) => (tab === 'daily' ? x.board.startsWith('daily:') : x.board.startsWith('endless:w')))
          : null;
      const text = s
        ? `Leaderboard · #${fmt(s.rank)} ${tab === 'daily' ? 'today' : 'this week'}`
        : o.status === 'queued'
          ? 'Leaderboard · posts when online'
          : 'Leaderboard';
      button.textContent = text;
      button.setAttribute('aria-label', text);
    };
    return {
      mount: (b: HTMLButtonElement) => {
        button = b;
        void outcome?.then(label);
      },
      open: () => {
        if (!postable)
          return this.showBoards(tab, { back, note: unranked ? 'unranked' : run ? undefined : 'unverified' });
        if (outcome) return void outcome.then((o) => this.showBoards(tab, { back, outcome: o }));
        this.showNameEntry({
          score: postable.score,
          mode,
          onDone: (n) => {
            outcome = this.client.post(postable, n);
            void outcome.then((o) => {
              label(o);
              // the server's filter is the final word; the client's normally catches this first
              if (o.status === 'rejected' && o.reason === 'name_rejected') this.reopenName(postable, mode, back);
            });
            this.showBoards(tab, { back, pending: outcome });
          },
          onSkip: back,
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
        this.showBoards(mode === 'daily' ? 'daily' : 'week', { back, pending: o });
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
    c.className = `card lb-sheet ${extra}${this.d.reducedMotion() ? ' lb-rm' : ''}`;
    return c;
  }

  private avatarEl(e: { avatar?: string; name: string }, px = 36): HTMLElement {
    const w = document.createElement('span');
    w.className = 'lb-av';
    const sp = e.avatar ? SPECIES_BY_ID.get(e.avatar) : undefined;
    if (sp) w.append(creatureThumb(sp, px, undefined, false, { avatar: true }));
    else w.textContent = e.name.slice(0, 1);
    return w;
  }

  // ── name entry ──────────────────────────────────────────────────────────────────────────
  showNameEntry(o: {
    score?: number;
    mode?: 'classic' | 'daily';
    error?: string;
    onDone(name: string): void;
    onSkip(): void;
  }): void {
    const card = this.card('lb-name-sheet');
    card.setAttribute('data-testid', 'lb-name-entry');
    let name = sanitizeNameInput(this.client.name ?? '');
    let error = o.error ?? '';
    const head = document.createElement('div');
    head.innerHTML = `<h2 class="lb-title">Your beach name</h2><div class="lb-sub">${
      o.score !== undefined
        ? `Put your ${o.mode === 'daily' ? 'Daily' : 'Classic'} score of <b class="lb-num">${fmt(o.score)}</b> on the beach board?`
        : 'Shown next to your scores on the boards.'
    }</div>`;
    const hero = document.createElement('div');
    hero.className = 'lb-name-hero';
    hero.setAttribute('aria-hidden', 'true');
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
      hero.textContent = name || '·······';
      hero.classList.toggle('empty', !name);
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

    card.append(head, hero, slots, hint, keys, actions, foot);
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
      note?: 'unranked' | 'unverified';
    } = {},
  ): void {
    const card = this.card('lb-board');
    card.setAttribute('data-testid', 'lb-board');
    const head = document.createElement('div');
    head.className = 'lb-head';
    head.innerHTML = `<h2 class="lb-title">Leaderboard</h2>${this.client.demo ? '<span class="lb-chip lb-demo" title="Sample players on this device">Demo</span>' : ''}`;
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
    panel.append(target, list);
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
      list.replaceChildren(...Array.from({ length: 6 }, () => skeleton()));
      if (o.pending && t === tab) {
        const r = await o.pending;
        if (token !== loadToken) return;
        o.outcome = r;
        o.pending = undefined;
      }
      let v: BoardView | null = null;
      let failed: LbError | null = null;
      try {
        v = await this.client.view(boardFor(t));
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

    const row = (e: BoardEntry) => {
      const r = document.createElement('div');
      r.className = `lb-row${e.me ? ' me' : ''}${e.rank <= 3 ? ` r${e.rank}` : ''}`;
      r.setAttribute('role', 'listitem');
      r.setAttribute('aria-label', `${e.me ? 'You, ' : ''}rank ${e.rank}, ${e.name}, ${fmt(e.score)}`);
      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.innerHTML = e.rank <= 3 ? medal(e.rank) : fmt(e.rank);
      const nm = document.createElement('span');
      nm.className = 'lb-nm';
      nm.textContent = e.name;
      if (e.me) nm.insertAdjacentHTML('beforeend', ' <span class="lb-you">You</span>');
      const sc = document.createElement('span');
      sc.className = 'lb-sc';
      sc.innerHTML = `${fmt(e.score)}${current === 'daily' ? `<small>${e.moves} moves</small>` : ''}`;
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
      const msg = outcomeNote(o.outcome, t);
      if (msg) {
        const n = document.createElement('div');
        n.className = `lb-note${o.outcome?.status === 'rejected' ? ' bad' : ''}`;
        n.textContent = msg;
        target.append(n);
      }
      if (!me) return;
      const box = document.createElement('div');
      box.className = 'lb-target-card';
      if (me.rank === 1) {
        const second = v.top[1];
        box.classList.add('gold');
        box.innerHTML = `<div class="lb-target-line">You're on top.${second ? ` Best by <b class="lb-num">${fmt(me.score - second.score)}</b>` : ''}</div>`;
      } else if (v.above) {
        const a = v.above;
        const need = a.score - me.score + 1; // ties go to whoever posted first
        const pct = Math.max(4, Math.min(100, Math.round((me.score / Math.max(1, a.score)) * 100)));
        box.append(this.avatarEl(a, 40));
        const txt = document.createElement('div');
        txt.className = 'lb-target-txt';
        txt.innerHTML = `<div class="lb-target-who"><span class="lb-nm">${a.name}</span> · #${fmt(a.rank)}</div>
          <div class="lb-target-line"><b class="lb-num">${fmt(need)}</b> to pass ${a.name}</div>
          <div class="bar" role="progressbar" aria-label="Your score as a share of ${a.name}'s" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
        box.append(txt);
        box.setAttribute('aria-label', `${a.name} is ${fmt(a.score - me.score)} ahead. Beat them!`);
      }
      target.append(box);
      if (me.rank > 1 && t !== 'daily') target.append(playBtn(t));
    };

    const renderBoard = (t: Tab, v: BoardView) => {
      renderTarget(t, v);
      if (v.total === 0) {
        const empty = document.createElement('div');
        empty.className = 'lb-empty';
        const sp = SPECIES_BY_ID.get('hermit');
        if (sp) empty.append(creatureThumb(sp, 72, undefined, false, { avatar: true }));
        empty.insertAdjacentHTML(
          'beforeend',
          `<div>${t === 'daily' ? 'Be the first on the beach today' : 'Be the first on the beach this week'}</div>`,
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
        if (!v.me) rows.push(this.youRow(t, v, () => this.showBoards(current, o)));
        list.replaceChildren(...rows);
        list.querySelector('.me')?.scrollIntoView?.({ block: 'nearest' });
      }
      foot.replaceChildren();
      const bits: string[] = [];
      if (v.stale) bits.push("You're offline: showing the last board you loaded.");
      if (this.client.demo)
        bits.push('Demo board: sample players on this device. Global boards arrive with the online update.');
      if (o.note === 'unranked') bits.push('This run started offline, so it is unranked.');
      if (o.note === 'unverified') bits.push("This run can't be posted (it began before leaderboards were on).");
      if (this.client.upgradeRequired) bits.push('Update the game to post new scores.');
      bits.push(`${fmt(v.total)} player${v.total === 1 ? '' : 's'}`);
      foot.textContent = bits.join(' ');
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
          name: this.client.name ?? 'YOU',
          score: best,
          moves: 0,
          me: true,
          avatar: this.avatar(),
        });
        r.querySelector('.lb-rank')!.textContent = '–';
        r.setAttribute('aria-label', `Your ${pend.length ? 'unposted' : 'local'} best, ${fmt(best)}`);
        rows.push(r);
      }
      list.replaceChildren(...rows);
      foot.textContent = this.client.demo ? 'Demo board.' : '';
    };

    card.append(head, tabs, panel, foot);
    if (o.back) card.append(this.btn('btn', 'Back to results', 'Back to results', () => o.back!()));
    card.append(
      this.btn(o.back ? 'btn ghost' : 'btn', 'Close', 'Close leaderboard', () => {
        this.refresh = null;
        this.d.ui.close();
      }),
    );
    this.d.ui.present(card, o.back ?? true);
    select(tab);
  }

  /** "Not yet named" / "not on this board yet" pinned row. */
  private youRow(t: Tab, _v: BoardView, reopen: () => void): HTMLElement {
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
          this.showNameEntry({ onDone: () => reopen(), onSkip: reopen }),
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

/** One-line feedback after posting, for the board it applies to. */
function outcomeNote(o: PostOutcome | undefined, t: Tab): string {
  if (!o) return '';
  if (o.status === 'queued') return 'Saved: your score will post when you’re back online.';
  if (o.status === 'rejected')
    return o.reason === 'name_rejected'
      ? 'That name was refused. Try another.'
      : o.reason === 'board_closed'
        ? 'That Daily has closed, so the score stays on your device.'
        : o.reason === 'upgrade_required'
          ? 'Update the game to post scores.'
          : "This score couldn't be verified, so it wasn't posted.";
  const s: Standing | undefined = o.standings.find((x) =>
    t === 'daily'
      ? x.board.startsWith('daily:')
      : t === 'week'
        ? x.board.startsWith('endless:w')
        : x.board === 'endless:all',
  );
  if (!s) return '';
  if (s.board.startsWith('daily:') && !s.improved) return `Your first Daily of the day counts: #${fmt(s.rank)}.`;
  return s.improved
    ? `Posted: #${fmt(s.rank)} of ${fmt(s.total)}`
    : `Your best here is still ${fmt(s.best)} (#${fmt(s.rank)}).`;
}
