"""Small labelled JPG contact sheet of a filmstrip folder (for docs/media, kept under ~300 KB).
python3 -I scripts/contact.py <dir> <out.jpg> [title] [scale] [cols]"""
import os
import sys

from PIL import Image, ImageDraw

d, out = sys.argv[1], sys.argv[2]
title = sys.argv[3] if len(sys.argv) > 3 else os.path.basename(d)
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.42
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 7
fs = sorted(f for f in os.listdir(d) if f.startswith('t') and f.endswith('.png'))
ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in fs]
w, h = int(ims[0].width * sc), int(ims[0].height * sc)
rows = (len(ims) + cols - 1) // cols
cols = min(cols, len(ims))
sheet = Image.new('RGB', (cols * w, 22 + rows * (h + 14)), 'white')
dr = ImageDraw.Draw(sheet)
dr.text((6, 5), title, fill='black')
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, 22 + (i // cols) * (h + 14)
    dr.text((x + 4, y + 1), f"{int(f[1:5])} ms", fill='#555')
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + 14))
q = 82
while True:
    sheet.save(out, quality=q, optimize=True)
    if os.path.getsize(out) <= 300_000 or q <= 40:
        break
    q -= 8
print(out, sheet.size, os.path.getsize(out) // 1024, 'KB')
