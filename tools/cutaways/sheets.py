import sys,os,glob
from PIL import Image, ImageDraw
FR='/workspace/bw/scenes/rebuild/capframes'; OUT='/workspace/bw/scenes/rebuild/captures'
scenes=sys.argv[1:] or sorted(os.listdir(FR))
for s in scenes:
    fs=sorted(glob.glob(f'{FR}/{s}/*.png'))
    ims=[Image.open(f).convert('RGB') for f in fs]
    box=(0,600,1170,2100)  # card area in device px (CSS y 200-700)
    tw,th=234,300; cols=8; rows=(len(ims)+cols-1)//cols
    W=Image.new('RGB',(cols*tw,rows*(th+14)),'white'); d=ImageDraw.Draw(W)
    for k,im in enumerate(ims):
        t=im.crop(box).resize((tw,th),Image.LANCZOS); x=(k%cols)*tw; y=(k//cols)*(th+14)
        W.paste(t,(x,y+14)); d.text((x+3,y+1),f'{k:02d}  {k*50}ms',fill='red')
    W.save(f'{OUT}/sheets/{s}.png')
    mid={'kick-wrap':12}.get(s,22)
    ims[mid].crop((0,640,1170,2060)).save(f'{OUT}/zoom/{s}-f{mid:02d}.png')
    print(s,len(ims))
