// Throwaway playable prototype for the shortlisted mechanics. Ugly on purpose.
import { N } from '../sim/core.ts';
import { ALL, Mechanic, Move, State, skidLanding, pockets } from '../sim/mechanics.ts';
import { BOTS } from '../sim/bots.ts';
import { Rng } from '../sim/core.ts';

const ids = ['hollow8-ramp2', 'skid', 'flip', 'lines', 'overgrowth', 'exact-hard'];
const sel = document.getElementById('mech') as HTMLSelectElement;
for (const id of ids) sel.add(new Option(ALL.find((m) => m.id === id)!.name, id));
const cv = document.getElementById('c') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const info = document.getElementById('info')!;
const W = Math.min(innerWidth, 420), CELL = Math.floor((W - 20) / N), BX = 10, BY = 10, TRAY_Y = BY + CELL * N + 20;
cv.width = W; cv.height = TRAY_Y + CELL * 4;

let mech: Mechanic, s: State, seed = Number(new URLSearchParams(location.search).get('seed') ?? Date.now() % 100000);
let drag: { slot: number; px: number; py: number; ox: number; oy: number } | null = null;
let flash: { cells: number[]; t: number } | null = null;
let log: string[] = [];

function start() {
  mech = ALL.find((m) => m.id === sel.value)!;
  s = mech.init(seed++);
  log = [];
  draw();
}
sel.onchange = start;
(document.getElementById('new') as HTMLButtonElement).onclick = start;

function traySlotX(i: number) { return 10 + i * (W / 3); }
const TC = Math.floor(CELL * 0.55);

function candidate(): Move | null {
  if (!drag) return null;
  const p = s.tray[drag.slot]!;
  const gx = Math.round((drag.px - drag.ox - BX) / CELL), gy = Math.round((drag.py - drag.oy - CELL * 1.5 - BY) / CELL);
  if (mech.id.startsWith('skid')) {
    // choose the edge nearest to the release point; lane from piece position
    const cx = (drag.px - BX) / CELL, cy = (drag.py - CELL * 1.5 - BY) / CELL;
    const d = [N - cy, cy, N - cx, cx]; // bottom, top, right, left distances
    const dir = d.indexOf(Math.min(...d));
    const lane = dir < 2 ? Math.max(0, Math.min(N - p.w, gx)) : Math.max(0, Math.min(N - p.h, gy));
    const l = skidLanding(s.board, p, dir, lane);
    return l ? { slot: drag.slot, x: l[0], y: l[1], dir } : null;
  }
  const mv = mech.moves(s).find((m) => m.slot === drag!.slot && m.x === gx && m.y === gy);
  return mv ?? null;
}

function draw() {
  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, cv.width, cv.height);
  const cand = candidate();
  let ghost = new Set<number>(), willPop = new Set<number>();
  if (cand) {
    const p = s.tray[cand.slot]!;
    for (const [dx, dy] of p.cells) ghost.add((cand.y + dy) * N + cand.x + dx);
    const r = mech.apply(s, cand, { noRefill: true });
    for (let i = 0; i < N * N; i++) if ((s.board[i] || ghost.has(i)) && !r.state.board[i]) willPop.add(i);
    if (mech.id.startsWith('hollow')) { const b2 = s.board.slice(); ghost.forEach((g) => (b2[g] = 1)); for (const c of pockets(b2)) for (const k of c) willPop.add(k); }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    ctx.fillStyle = s.board[i] ? '#6af' : '#333';
    if (ghost.has(i)) ctx.fillStyle = mech.id === 'flip' && s.board[i] ? '#a33' : '#9cf8';
    if (willPop.has(i)) ctx.fillStyle = '#fd6';
    if (flash && flash.cells.includes(i)) ctx.fillStyle = '#fff';
    ctx.fillRect(BX + x * CELL + 1, BY + y * CELL + 1, CELL - 2, CELL - 2);
  }
  if (mech.id === 'exact-hard' || mech.id === 'exact') {
    ctx.fillStyle = '#ddd'; ctx.font = '12px system-ui';
    for (let i = 0; i < N; i++) { ctx.fillText(String(s.aux![i]), BX + N * CELL - 12, BY + i * CELL + 14); ctx.fillText(String(s.aux![N + i]), BX + i * CELL + 4, BY + N * CELL + 12); }
  }
  s.tray.forEach((p, i) => {
    if (!p || drag?.slot === i) return;
    for (const [dx, dy] of p.cells) { ctx.fillStyle = '#6af'; ctx.fillRect(traySlotX(i) + dx * TC, TRAY_Y + dy * TC, TC - 2, TC - 2); }
  });
  if (drag) {
    const p = s.tray[drag.slot]!;
    for (const [dx, dy] of p.cells) { ctx.fillStyle = '#6afc'; ctx.fillRect(drag.px - drag.ox + dx * CELL, drag.py - drag.oy - CELL * 1.5 + dy * CELL, CELL - 2, CELL - 2); }
  }
  const over = !mech.moves(s).length || (mech.budget && s.moves >= mech.budget);
  info.textContent = `score ${s.score} moves ${s.moves}${over ? ' — GAME OVER' : ''}`;
  (window as any).__proto = {
    s, mech, log, over,
    /** For automated playtests: pick a move with a bot, return pointer-down and release points that produce it. */
    plan(bot: string) {
      if (over) return null;
      const mv = BOTS[bot]!(mech, s, new Rng(s.moves + 1));
      const p = s.tray[mv.slot]!;
      const down = { x: traySlotX(mv.slot) + TC / 2, y: TRAY_Y + TC / 2 };
      const saved = drag;
      for (let py = 0; py < cv.height; py += CELL / 4)
        for (let px = 0; px < W; px += CELL / 4) {
          drag = { slot: mv.slot, px, py, ox: (p.w * CELL) / 2, oy: (p.h * CELL) / 2 };
          const c = candidate();
          if (c && c.x === mv.x && c.y === mv.y) { drag = saved; return { down, up: { x: px, y: py } }; }
        }
      drag = saved;
      return null;
    },
  };
}

cv.addEventListener('pointerdown', (e) => {
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  if (py < TRAY_Y - 10) return;
  const slot = Math.floor((px - 10) / (W / 3));
  const p = s.tray[slot];
  if (!p) return;
  drag = { slot, px, py, ox: px - traySlotX(slot), oy: py - TRAY_Y - CELL * 1.5 + CELL * 1.5 };
  drag.ox = (p.w * CELL) / 2; drag.oy = (p.h * CELL) / 2 - CELL * 1.5 + CELL * 1.5;
  cv.setPointerCapture(e.pointerId);
  draw();
});
cv.addEventListener('pointermove', (e) => { if (!drag) return; const r = cv.getBoundingClientRect(); drag.px = e.clientX - r.left; drag.py = e.clientY - r.top; draw(); });
cv.addEventListener('pointerup', () => {
  const c = candidate();
  if (c) {
    const before = s.board.slice();
    const res = mech.apply(s, c);
    const popped: number[] = [];
    for (let i = 0; i < N * N; i++) if (before[i] && !res.state.board[i]) popped.push(i);
    s = res.state;
    log.push(`m${s.moves} +${res.points} clr${res.cleared} ev${res.events}${res.area ? ' area' + res.area : ''}`);
    flash = { cells: popped, t: performance.now() };
    setTimeout(() => { flash = null; draw(); }, 180);
  }
  drag = null;
  draw();
});
start();
