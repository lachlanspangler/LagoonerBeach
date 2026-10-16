/** Render 32 beats of day and night music to WAV for listening: artifacts/audio/music-{day,night}.wav */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('artifacts/audio', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5317/?debug=1');
await p.waitForFunction(() => (window as any).__atoll);
for (const night of [false, true]) {
  const wav: number[] = await p.evaluate(async (n) => {
    const { Music } = await import('/src/audio/music.ts' as string);
    const sr = 44100,
      secs = 28;
    const ctx = new OfflineAudioContext(2, sr * secs, sr);
    const master = ctx.createGain();
    master.gain.value = 2.1;
    master.connect(ctx.createDynamicsCompressor()).connect(ctx.destination);
    const len = sr * 0.4,
      noise = ctx.createBuffer(1, len, sr),
      d = noise.getChannelData(0);
    let s = 22222;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      d[i] = (s / 2147483648 - 1) * (1 - i / len);
    }
    const m = new Music(() => ({ ctx, out: master, noise }));
    m.night = n;
    m.renderBeats(32);
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0),
      R = buf.getChannelData(1);
    const out = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) {
      out[i * 2] = Math.max(-1, Math.min(1, L[i]!)) * 32767;
      out[i * 2 + 1] = Math.max(-1, Math.min(1, R[i]!)) * 32767;
    }
    return Array.from(new Uint8Array(out.buffer));
  }, night);
  const data = Buffer.from(wav);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(44100, 24);
  h.writeUInt32LE(44100 * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(`artifacts/audio/music-${night ? 'night' : 'day'}.wav`, Buffer.concat([h, data]));
}
await b.close();
console.log('wrote artifacts/audio/music-{day,night}.wav');
