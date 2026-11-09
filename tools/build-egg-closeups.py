"""Compose actual-play YOU/egg/bird/14 close-up plus real-size egg-state fixtures.
Usage: python3 tools/build-egg-closeups.py <real-play-shots> <icon-shot> <output-dir>
"""
from PIL import Image, ImageDraw
from pathlib import Path
import json, sys
root, icon, out = map(Path, sys.argv[1:4]); out.mkdir(parents=True, exist_ok=True)
name = 'ostrich-a-standing-on-its-egg'
im = Image.open(root / (name+'.png'))
x,y,w,h = json.loads((root / (name+'.cells.json')).read_text())[5*9+3]
scale = im.width/390
crop = im.crop(tuple(round(v*scale) for v in (x-3,y-14,x+w+3,y+h+3)))
crop = crop.resize((400,round(crop.height*400/crop.width)))
ref = Image.open(icon); ref.thumbnail((700,1000))
sheet = Image.new('RGB',(1140,max(600,ref.height+50)),'white'); draw = ImageDraw.Draw(sheet)
draw.text((15,12),'Real play: YOU + egg + bird + 14 (enlarged)',fill='black')
sheet.paste(crop,(15,40))
draw.text((430,12),'Egg states, 1/14 countdowns, plain/lit squares',fill='black')
sheet.paste(ref,(430,40));sheet.save(out/'eggs-closeup.png')
crop.save(out/'you-egg-bird-14-closeup.png')
Image.open(icon).save(out/'eggs-real-size.png')
