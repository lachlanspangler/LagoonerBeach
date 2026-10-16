/**
 * Text play for design review: replays moves from a seed and prints the board, tray and preview of
 * every capturing move available. Usage: npx tsx scripts/play-cli.ts <seed> "s,x,y s,x,y ..."
 */
import { applyMove, legalMoves, newGame, previewMove } from '../src/core/game.ts';
import { pieceById } from '../src/core/pieces.ts';
const seed = Number(process.argv[2] ?? 1);
const moves = (process.argv[3] ?? '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((m) => m.split(',').map(Number));
let s = newGame(seed);
for (const [slot, x, y] of moves) {
  const r = applyMove(s, { slot: slot!, x: x!, y: y! });
  if (!r) throw new Error(`illegal ${slot},${x},${y}`);
  const cap = r.events.find((e) => e.type === 'captured');
  if (cap && cap.type === 'captured')
    console.log(
      `  move ${slot},${x},${y}: captured ${cap.pockets.map((p) => p.cells.length).join('+')} cells, waves ${cap.waves.length}, +${cap.score.total}`,
    );
  s = r.state;
}
console.log(`moves ${s.moves} score ${s.score} streak ${s.streak} over ${s.over}`);
console.log('   01234567');
for (let y = 0; y < 8; y++)
  console.log(`${y}  ` + Array.from(s.board.slice(y * 8, y * 8 + 8), (c) => (c ? '#' : '.')).join(''));
s.tray.forEach((t, i) => {
  if (!t) return;
  const p = pieceById(t.pieceId);
  const rows = Array.from({ length: p.h }, (_, y) =>
    Array.from({ length: p.w }, (_, x) => (p.cells.some(([a, b]) => a === x && b === y) ? '#' : '.')).join(''),
  );
  console.log(`slot ${i}: ${t.pieceId}  ${rows.join(' / ')}`);
});
const caps = legalMoves(s)
  .map((m) => ({ m, pv: previewMove(s, m)! }))
  .filter((x) => x.pv.pockets.length)
  .sort((a, b) => b.pv.points - a.pv.points)
  .slice(0, 6);
console.log(
  'captures available:',
  caps
    .map((c) => `${c.m.slot},${c.m.x},${c.m.y}(+${c.pv.points},${c.pv.pockets.map((p) => p.cells.length).join('+')})`)
    .join('  ') || 'none',
);
