// Dev-only review page: every species, normal / golden / silhouette, day and night backgrounds.
import { SPECIES } from '../src/meta/creatures.ts';
import { drawCreature } from '../src/render/creatures.ts';
const cols = 8,
  cw = 120,
  ch = 120;
const c = document.getElementById('c') as HTMLCanvasElement;
const rows = Math.ceil(SPECIES.length / cols);
c.width = cols * cw * 2;
c.height = rows * ch * 2;
c.style.width = `${cols * cw}px`;
const g = c.getContext('2d')!;
g.scale(2, 2);
const night = new URLSearchParams(location.search).has('night');
g.fillStyle = night ? '#0B1622' : '#F4EDE2';
g.fillRect(0, 0, cols * cw, rows * ch);
SPECIES.forEach((sp, i) => {
  const x = (i % cols) * cw,
    y = Math.floor(i / cols) * ch;
  g.fillStyle = night ? '#15293A' : '#E3D6C2';
  g.beginPath();
  g.roundRect(x + 4, y + 4, cw - 8, ch - 8, 14);
  g.fill();
  drawCreature(g, sp, x + cw / 2, y + ch / 2 - 6, 84, 0, {
    golden: location.search.includes('golden') && i % 2 === 0,
    silhouette: location.search.includes('sil') ? 'rgba(0,0,0,0.35)' : undefined,
  });
  g.fillStyle = night ? '#E8EEF2' : '#3B3229';
  g.font = '600 11px system-ui';
  g.textAlign = 'center';
  g.fillText(sp.name, x + cw / 2, y + ch - 12);
});
(window as unknown as { __ready: boolean }).__ready = true;
