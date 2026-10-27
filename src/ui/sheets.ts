/**
 * Destination sheets, loaded on first use (a lazy chunk; prefetched on idle): Settings, the Beach
 * Journal (rarity frames, habitat pools, the one-at-a-time ambient signature), species pages
 * (size line) and the reef list. They render through the Ui's components (overlay.ts `SheetKit`).
 */
import './tiles.css';
import './sheets.css';
import type { Profile } from '../platform/storage.ts';
import { loadWoke, saveSeen, saveWoke } from '../platform/storage.ts';
import { SKINS } from '../meta/unlocks.ts';
import { HABITATS, SPECIES, type Species } from '../meta/creatures.ts';
import { found, type Journal } from '../meta/journal.ts';
import { dozesNow, drawCreature, drowsyPick, hasNewArt } from '../render/creatures.ts';
import { lookFor } from '../render/skins.ts';
import { fmt } from '../render/theme.ts';
import { buildReefList, type ReefListModel } from './reefList.ts';
import { icon, type IconName } from './icons.ts';
import { HABITAT_UI, RARITY_RANK, pipsHtml } from './rarity.ts';
import { creatureThumb, PEBBLE_CM, type SheetKit, type ThumbRedraw, type UiHandlers } from './overlay.ts';

const night = (): boolean => document.documentElement.dataset.theme === 'night';
const reduced = (): boolean => document.documentElement.dataset.rm === '1';
const sizeText = (cm: number): string =>
  cm >= 100 ? `${(cm / 100).toFixed(cm >= 1000 ? 0 : 1)} m` : `${cm < 10 ? cm.toFixed(1) : Math.round(cm)} cm`;

// ─────────────────────────────────────────────────────────────────────────── settings
export function showSettings(k: SheetKit, p: Profile): void {
  const { card, body } = k.sheet('Settings', { kind: 'settings', close: false });
  const s = p.settings;
  const rm = s.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const group = (label: string) => {
    const g = document.createElement('section');
    g.className = 'group';
    g.innerHTML = `<h3 class="overline group-label">${label}</h3>`;
    const box = document.createElement('div');
    box.className = 'group-box';
    g.append(box);
    body.append(g);
    return box;
  };
  const row = (box: HTMLElement, ic: IconName, label: string, trailing?: HTMLElement, sub?: string) => {
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = `<span class="row-ic">${icon(ic)}</span><span class="row-label">${label}${sub ? `<small>${sub}</small>` : ''}</span>`;
    if (trailing) r.append(trailing);
    box.append(r);
    return r;
  };
  const sw = (
    box: HTMLElement,
    ic: IconName,
    label: string,
    on: boolean,
    key: Parameters<UiHandlers['onToggle']>[0],
  ) => {
    const b = k.button('', 'switch', '<i></i>', label, () => k.h.onToggle(key));
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(on));
    row(box, ic, label, b);
  };
  const feel = group('Sound & feel');
  sw(feel, s.sound ? 'sound' : 'soundOff', 'Sound', s.sound, 'sound');
  sw(feel, 'music', 'Music', s.music, 'music');
  sw(feel, 'haptics', 'Haptics', s.haptics, 'haptics');

  const look = group('Look');
  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-label', 'Theme');
  for (const [t, l, ic] of [
    ['auto', 'Auto', 'themeAuto'],
    ['day', 'Day', 'sun'],
    ['night', 'Night', 'moon'],
  ] as const) {
    const on = s.theme === t;
    const b = k.button('', 'seg-b seg-cap', `${icon(ic, { filled: on })}<small>${l}</small>`, `Theme ${l}`, () =>
      k.h.onTheme(t),
    );
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(on));
    seg.append(b);
  }
  row(look, night() ? 'moon' : 'sun', 'Theme', seg);
  const cur = SKINS.find((k) => k.id === p.settings.skin) ?? SKINS[0]!;
  const sw6 = lookFor(cur.id)
    .colors.slice(1, 7)
    .map((c) => `<i style="background:${c}"></i>`)
    .join('');
  const name = cur.name.replace(' (high contrast)', '');
  const style = k.button(
    '',
    'style-btn',
    `<span class="swatches" aria-hidden="true">${sw6}</span>${name}${icon('chevronRight')}`,
    `Style: ${cur.name}. Change`,
    () => k.h.onSkin(),
  );
  const next = SKINS.find((k) => !p.unlocked.includes(k.id) && k.hint);
  const left = SKINS.filter((k) => !p.unlocked.includes(k.id)).length;
  row(look, 'style', 'Style', style, next ? `${left} more to find` : undefined);
  sw(look, 'motion', 'Reduced motion', rm, 'reducedMotion');
  sw(look, 'textSize', 'Larger text', !!s.largeText, 'largeText');

  if (p.stats.games) {
    const prog = group('Your beach');
    row(
      prog,
      'endless',
      `<span class="num">${fmt(p.stats.games)}</span> games · <span class="num">${fmt(p.stats.captures)}</span> lagoons`,
      undefined,
      p.best ? `Best ${fmt(p.best)} · top lagoon ${p.stats.bestPocket}` : undefined,
    );
  }

  const about = group('About');
  const info = document.createElement('div');
  info.className = 'about';
  info.innerHTML = `<b>Lagooner Beach ${__APP_VERSION__}</b> · no ads, no tracking.<br>
    Sounds and music are made in code, on your device.`;
  about.append(info);
  // font licences live one tap away, behind Credits
  const credits = document.createElement('details');
  credits.className = 'credits';
  credits.innerHTML = `<summary class="row row-link"><span class="row-ic">${icon('sparkle')}</span><span class="row-label">Credits</span><span class="chev">${icon('chevronDown')}</span></summary>
    <div class="about">Type: Fraunces and Nunito, under the SIL Open Font License 1.1 ·
    <a href="./fonts/OFL-Fraunces.txt" target="_blank" rel="noopener">Fraunces license</a> ·
    <a href="./fonts/OFL-Nunito.txt" target="_blank" rel="noopener">Nunito license</a></div>`;
  about.append(credits);
  const priv = document.createElement('a');
  priv.className = 'row row-link';
  priv.href = './privacy.html';
  priv.target = '_blank';
  priv.rel = 'noopener';
  priv.innerHTML = `<span class="row-ic">${icon('info')}</span><span class="row-label">Privacy policy</span><span class="chev">${icon('chevronRight')}</span>`;
  about.append(priv);

  let armed = 0;
  const erase = k.button('', 'btn ghost danger', `${icon('erase')}Erase all progress`, 'Erase all progress', () => {
    if (Date.now() - armed < 3000) return k.h.onErase();
    armed = Date.now();
    erase.lastChild!.textContent = 'Tap again to erase everything';
    setTimeout(() => erase.isConnected && (erase.lastChild!.textContent = 'Erase all progress'), 3000);
  });
  body.append(erase);
  card.append(k.button('', 'btn primary', 'Done', 'Done', () => k.h.onResume()));
  k.show(card, true, 'settings');
}

// ─────────────────────────────────────────────────────────────────────────── journal
/** The Beach Journal: every creature by habitat; found ones framed by rarity, unknowns as silhouettes. */
export function showJournal(k: SheetKit, j: Journal): void {
  const { card, head, body } = k.sheet('Beach Journal', { full: true, kind: 'journal' });
  card.classList.add('journal');
  const n = found(j);
  const golden = Object.values(j.entries).reduce((a, e) => a + (e.golden ? 1 : 0), 0);
  const C = 2 * Math.PI * 27;
  const ring = document.createElement('div');
  ring.className = 'j-ring';
  ring.setAttribute('role', 'img');
  ring.setAttribute('aria-label', `${n} of ${SPECIES.length} found`);
  ring.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="bg" cx="32" cy="32" r="27"/><circle class="fg" cx="32" cy="32" r="27" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - n / SPECIES.length)).toFixed(1)}"/></svg><b class="num">${n}<small>/${SPECIES.length}</small></b>`;
  head.insertBefore(ring, head.firstChild);
  const sub = document.createElement('p');
  sub.className = 'callout j-sub';
  sub.textContent =
    [golden ? `${golden} golden` : '', j.total ? `${fmt(j.total)} caught & released` : '']
      .filter(Boolean)
      .join(' · ') || 'Close a loop to catch your first creature';
  head.querySelector('.title-m')!.append(sub);
  const ink = night() ? '#6C8193' : '#968672'; // ink.3; silhouettes at 45%
  const life = new JournalLife();
  for (const h of HABITATS) {
    const list = SPECIES.filter((sp) => sp.habitat === h.id);
    const got = list.filter((sp) => j.entries[sp.id]).length;
    const sec = document.createElement('div');
    sec.className = 'j-sec';
    sec.innerHTML = `<h3 class="title-s">${h.name}</h3><span class="overline num">${got}/${list.length}</span><div class="track"><i style="width:${Math.round((got / list.length) * 100)}%"></i></div>`;
    const grid = document.createElement('div');
    grid.className = 'j-grid';
    // CRITIQUE-4: ≤ 30 % of the page dozes (the same ones every time), the rest are awake. Lazy:
    // the art chunk (which knows who dozes) may land after the tiles are built.
    let drowsy: Set<string> | null = null;
    const dozes = (sp: Species): boolean => {
      if (!hasNewArt(sp.id)) return false;
      drowsy ??= drowsyPick(
        list.filter((x) => dozesNow(x, night())).map((x) => x.id),
        list.length,
      );
      return drowsy.has(sp.id);
    };
    for (const sp of list) {
      const e = j.entries[sp.id];
      const isNew = !!e && !k.seenFor(j).has(sp.id);
      const b = k.button(
        '',
        `j-tile r-${sp.rarity}${e ? ' got' : ' locked'}${(e?.golden ?? 0) > 0 ? ' golden' : ''}`,
        '',
        e
          ? `${sp.name}, ${sp.rarity}, caught ${e.count}${isNew ? ', new' : ''}`
          : `Unknown ${sp.rarity} creature. Hint: ${sp.hint}`,
        () => showSpecies(k, sp, j),
      );
      b.style.setProperty('--hab', HABITAT_UI[sp.habitat][night() ? 1 : 0]);
      b.style.setProperty('--hab-ring', HABITAT_UI[sp.habitat][night() ? 1 : 0]);
      const pool = document.createElement('span');
      pool.className = 'j-pool';
      const thumb = creatureThumb(sp, 70, e ? undefined : `${ink}73`, (e?.golden ?? 0) > 0, {
        awake: () => !dozes(sp),
      });
      thumb.dataset.face = e && hasNewArt(sp.id) ? (dozes(sp) ? 'dozing' : 'awake') : '';
      pool.append(thumb);
      b.append(pool);
      if (e && hasNewArt(sp.id)) life.add(thumb, sp, dozes(sp));
      b.insertAdjacentHTML(
        'beforeend',
        `<span class="j-name">${e ? sp.name : '???'}</span>${pipsHtml(RARITY_RANK[sp.rarity])}${
          // epic and legendary say so in a word, not only in pips and frame
          sp.rarity === 'epic' || sp.rarity === 'legendary' ? `<span class="j-rar">${sp.rarity}</span>` : ''
        }${
          (e?.golden ?? 0) > 0 ? icon('sparkle', { filled: true, cls: 'spark' }) : ''
        }${isNew ? '<span class="new" aria-hidden="true"></span>' : ''}`,
      );
      grid.append(b);
    }
    body.append(sec, grid);
  }
  k.show(card, true, 'journal');
  life.start(card);
  // first run of the wake-up memory: what was already seen before this opening counts as woken
  if (loadWoke() === null) saveWoke(k.seenFor(j));
  // looked at: every caught species is now seen (the dots clear next time)
  const seen = k.seenFor(j);
  for (const id of Object.keys(j.entries)) seen.add(id);
  saveSeen(seen);
  k.markUnseen(j);
}

function showSpecies(k: SheetKit, sp: Species, j: Journal): void {
  const e = j.entries[sp.id];
  const no = SPECIES.indexOf(sp) + 1;
  const hab = HABITATS.find((x) => x.id === sp.habitat)?.name ?? '';
  const { card, body, title } = k.sheet(`No. ${no} · ${hab}`, {
    back: () => showJournal(k, j),
    kind: 'species',
  });
  title.className = 'title-s';
  title.style.flex = '1';
  const isGolden = (e?.golden ?? 0) > 0;
  const art = document.createElement('div');
  art.className = `sp-art r-${sp.rarity}${isGolden ? ' golden' : ''}`;
  art.style.setProperty('--hab', HABITAT_UI[sp.habitat][night() ? 1 : 0]);
  const frame: Record<string, [string, string]> = {
    common: ['var(--line)', '1px'],
    uncommon: ['#53C08C', '1.5px'],
    rare: ['#3D9BE9', '2px'],
    epic: ['#8E5BD8', '2px'],
    legendary: ['#F2B93B', '2.5px'],
  };
  art.style.setProperty('--frame', frame[sp.rarity]![0]);
  art.style.setProperty('--fw', frame[sp.rarity]![1]);
  const ink = night() ? '#6C8193A0' : '#968672A0';
  // CRITIQUE-4: a new catch opens its eyes the first time its page is opened (then stays awake here)
  const woke = loadWoke() ?? new Set<string>();
  const wake = !!e && !woke.has(sp.id);
  if (e && wake) {
    woke.add(sp.id);
    saveWoke(woke);
  }
  const thumb = creatureThumb(sp, 176, e ? undefined : ink, isGolden, { animate: true, shy: e?.count === 1, wake });
  thumb.dataset.wake = wake ? '1' : '';
  art.append(thumb);
  body.append(art);
  const info = document.createElement('div');
  if (e) {
    const last = e.last ?? e.best;
    info.innerHTML = `<h3 class="sp-name">${sp.name}</h3>
      <div class="sp-rarity" style="--frame:${frame[sp.rarity]![0]}">${pipsHtml(RARITY_RANK[sp.rarity], 'lg')}<span class="overline">${isGolden ? 'Golden · ' : ''}${sp.rarity}</span></div>
      <p class="sp-flavor">${sp.flavor}</p>
      <div class="sp-size" data-testid="size-line"><span class="sp-scale"></span><span>Caught <b class="num">${sizeText(last)}</b> · record <b class="num">${sizeText(e.best)}</b><br>${pebbleLine(e.best)}</span></div>
      <div class="inline-stats"><div><b class="num">${fmt(e.count)}</b><span>Caught</span></div><div><b class="num">${e.golden || '—'}</b><span>Golden</span></div><div><b>${prettyDate(e.first)}</b><span>First</span></div></div>`;
    info.querySelector('.sp-scale')!.append(sizeScale(sp, e.best));
  } else {
    info.innerHTML = `<h3 class="sp-name">???</h3>
      <div class="sp-rarity">${pipsHtml(RARITY_RANK[sp.rarity], 'lg')}<span class="overline">${sp.rarity}</span></div>
      <p class="sp-flavor">Hint: ${sp.hint}</p>`;
  }
  body.append(info);
  k.show(card, true, 'species');
}

/** Reefs by chapter, shipped and endless (src/ui/reefList.ts); tap one to play it. */
export function showReefs(k: SheetKit, m: ReefListModel): void {
  const card = buildReefList(
    m,
    (id, cls, html, label, fn) => k.button(id, cls, html, label, fn),
    (i) => k.h.onPuzzlePick(i),
    () => k.h.onResume(),
  );
  k.show(card, true, 'reefs');
}

/** A dozing tile wakes: blink open, look at you a while, blink, back to its doze (ms). */
const WAKE_MS = 2400;
/** Share of the dozing (off-theme) tiles that may wake when picked (CRITIQUE-2 NEW 1). */
const WAKERS = 0.3;

/** The face of a waking tile at progress u (0–1); exported for tests. */
export function wakeFace(u: number): 'blink' | 'idle' | 'drowsy' {
  return u < 0.06 || (u >= 0.86 && u < 0.92) ? 'blink' : u < 0.86 ? 'idle' : 'drowsy';
}

/**
 * The journal grid's ambient life (CREATURE_ART R37): every 3–5 s, one random visible caught tile
 * plays its signature move once (≤ 30 fps) — or, for ~30 % of the dozing (off-theme) tiles, blinks
 * awake and looks at the player for a moment (CRITIQUE-2 NEW 1: the journal was a dormitory). Never
 * more than one at a time; stops when the grid closes or the page is hidden; none under reduced motion.
 */
class JournalLife {
  private tiles: { c: HTMLCanvasElement; sp: Species; waker: boolean }[] = [];
  /** `dozing`: the tile is one of its page's capped dozers (only those may blink awake). */
  add(c: HTMLCanvasElement, sp: Species, dozing: boolean): void {
    this.tiles.push({ c, sp, waker: dozing && Math.random() < WAKERS });
  }
  start(root: HTMLElement): void {
    if (reduced() || !this.tiles.length) return;
    const seenAt = performance.now();
    let next = seenAt + 1800;
    let cur: { c: HTMLCanvasElement; t0: number; wake: boolean } | null = null;
    let last = 0;
    const vis = new Set<HTMLCanvasElement>();
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        const c = e.target as HTMLCanvasElement;
        if (e.isIntersecting) vis.add(c);
        else vis.delete(c);
      }
    });
    for (const t of this.tiles) io.observe(t.c);
    const DUR = 1300;
    const tick = (now: number) => {
      if (!root.isConnected) return io.disconnect();
      requestAnimationFrame(tick);
      if (document.hidden) return;
      const redraw: ThumbRedraw = (...a) => (cur?.c as HTMLCanvasElement & { redraw?: ThumbRedraw }).redraw?.(...a);
      if (cur) {
        if (now - last < 33) return;
        last = now;
        const u = (now - cur.t0) / (cur.wake ? WAKE_MS : DUR);
        if (u >= 1) {
          redraw();
          cur = null;
          next = now + 3000 + Math.random() * 2000;
        } else if (cur.wake) redraw(now / 1000, undefined, wakeFace(u));
        else redraw(now / 1000, u);
        return;
      }
      if (now < next) return;
      const pool = this.tiles.filter((t) => vis.has(t.c));
      if (!pool.length) {
        next = now + 1000;
        return;
      }
      const pick = pool[Math.floor(Math.random() * pool.length)]!;
      cur = { c: pick.c, t0: now, wake: pick.waker };
    };
    requestAnimationFrame(tick);
  }
}

/** Species page size line: "about N pebbles" (1 pebble ≈ 4 cm) or boards for the giants. */
function pebbleLine(cm: number): string {
  const p = cm / PEBBLE_CM;
  if (p < 1) return 'smaller than a pebble';
  if (p < 1.5) return 'about a pebble';
  if (p < 8) return `about ${Math.round(p)} pebbles`;
  const boards = p / 8;
  return boards < 1.5 ? 'about one board' : `${Math.round(boards)} boards long`;
}

/** A pebble and the creature's silhouette side by side, at true relative scale (capped). */
function sizeScale(sp: Species, cm: number): HTMLCanvasElement {
  const H = 40;
  const W = 72;
  const c = document.createElement('canvas');
  const dpr = Math.min(3, devicePixelRatio || 1);
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  // the pebble keeps 12 px unless the creature would be over 48 px: then the pebble shrinks
  const ratio = cm / PEBBLE_CM;
  const peb = Math.max(5, Math.min(14, 50 / Math.max(1, ratio)));
  const crit = Math.max(8, Math.min(50, peb * ratio));
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-2').trim() || '#6B5C4B';
  g.fillStyle = '#3D9BE9';
  g.beginPath();
  g.roundRect(2, H - 3 - peb, peb, peb, peb * 0.26);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(2 + peb * 0.15, H - 3 - peb * 0.2, peb * 0.7, peb * 0.2);
  drawCreature(g, sp, peb + 6 + crit / 2, H - 3 - Math.min(crit, H - 4) / 2, crit, 0, { silhouette: ink });
  return c;
}

/** 2026-10-16 → "Oct 16" (current year) or "Oct 16, 2025". */
function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso || '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const s = `${months[Number(m[2]) - 1]} ${Number(m[3])}`;
  return Number(m[1]) === new Date().getFullYear() ? s : `${s}, ${m[1]}`;
}
