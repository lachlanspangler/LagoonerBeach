"""Contact sheet of a filmstrip folder: python3 -I scripts/montage.py <dir> [cols] [scale]"""
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 5; sc = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
fs = sorted(f for f in os.listdir(d) if f.endswith('.png') and f != 'sheet.png')
ims = [Image.open(os.path.join(d, f)) for f in fs]
w, h = int(ims[0].width * sc), int(ims[0].height * sc)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 16)), 'white')
dr = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 16)
    sheet.paste(im.resize((w, h)), (x, y + 16)); dr.text((x + 4, y + 2), f, fill='black')
sheet.save(os.path.join(d, 'sheet.png')); print(os.path.join(d, 'sheet.png'), sheet.size)
