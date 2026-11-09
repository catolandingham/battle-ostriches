"""Make the review sheet from shots-real-play.js output. Usage: python3 tools/build-bw-review.py <shots> [earlier-shots]
Phone screenshots stay at native size in docs/reviews; only the contact sheet is scaled.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import sys, os
src = Path(sys.argv[1])
out = Path(os.environ.get('REVIEW_OUT', str(Path(__file__).resolve().parents[1] / 'docs/reviews/bw-theme-shots')))
out.mkdir(parents=True, exist_ok=True)
files = sorted(f for f in src.glob('*.png') if f.name != '00-contact-sheet.png')
w, h, cols = 260, 443, 5
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w+12), rows * (h+32)), '#dedede')
draw = ImageDraw.Draw(sheet)
for k, f in enumerate(files):
    (out / f.name).write_bytes(f.read_bytes())
    x, y = k % cols * (w+12), k // cols * (h+32)
    draw.text((x+3, y+5), f.stem, fill='black')
    sheet.paste(Image.open(f).resize((w, h)), (x, y+24))
sheet.save(out / '00-contact-sheet.png')
if len(sys.argv) > 2:
    earlier = Path(sys.argv[2])
    names = ['over-0-after-a-smash', 'howto-a-pictures', 'vulture-b0-just-found', 'ostrich-a-standing-on-its-egg']
    w, h = 300, 510
    sheet = Image.new('RGB', (630, len(names)*(h+24)), '#dedede')
    draw = ImageDraw.Draw(sheet)
    for k, name in enumerate(names):
        y = k*(h+24)
        draw.text((5,y+5), 'BEFORE '+name, fill='black')
        draw.text((325,y+5), 'AFTER', fill='black')
        for x, folder in [(5,earlier), (325,src)]:
            sheet.paste(Image.open(folder / (name+'.png')).resize((w,h)), (x,y+24))
    sheet.save(out / 'before-after-steer3.png')
print(f'{len(files)} screens: {out / "00-contact-sheet.png"}')
