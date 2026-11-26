"""Build the six stone kick-back cartoons (bounce_scenes.py) into the game.

    python3 tools/cutaways/bounce_export.py [preview-folder]

Writes the new drawings to public/art/cutaways/sk-*.webp and adds (or replaces) the bounce-* scenes in
public/cutaway-scenes.js, leaving every other scene as it is. export.py rebuilds that file from the art box and does
not know these scenes: after running export.py, run this again. With a preview folder it also writes, for checking,
every step of every cartoon drawn from the exported data (as the phone draws it), a contact sheet and an mp4 each.

Drawings: an approved drawing already in public/art/cutaways is used as it is (its layer is moved and sized so the
whole file lands where the cut-down copy was placed). A mirrored approved drawing is saved as sk-<name>-m.webp.
Parts cut out of approved drawings and the placeholder drawings are saved as sk-<name>.webp."""
import sys, os, json, math, subprocess, numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bounce_lib as lib
lib.build()
import bounce_scenes as BS
REPO=lib.REPO; ARTDIR=REPO+'/public/art/cutaways/'; SCENEJS=REPO+'/public/cutaway-scenes.js'
OUT=sys.argv[1] if len(sys.argv)>1 else None
# ---------- names in the game ----------
def gname(n, flip):
    if lib.KIND[n]=='existing': return 'sk-'+n+'-m' if flip else n
    return 'sk-'+n+('-m' if flip else '')
def full_image(n):
    """the picture file the game will draw for drawing n (before mirroring)"""
    return Image.open(ARTDIR+n+'.webp').convert('RGBA') if lib.KIND[n]=='existing' else lib.SP[n]
def layer_row(L, sh):
    """one layer as the game draws it: [x, y, w, h, turn, opacity] for the whole picture file"""
    x,y,w,h=L.x+sh[0],L.y+sh[1],L.w,L.h
    if lib.KIND[L.n]=='existing':
        x0,y0,W,H=lib.ORIGIN[L.n]; cw,ch=lib.SP[L.n].size; kx,ky=w/cw,h/ch
        ox=(W-x0-cw) if L.flip else x0
        X,Y,FW,FH=x-ox*kx,y-y0*ky,W*kx,H*ky
        if L.rot:   # the game turns a layer about the middle of the whole file, so move that middle where the turn puts it
            cx,cy=x+w/2,y+h/2; dx,dy=X+FW/2-cx,Y+FH/2-cy; th=math.radians(L.rot); c,s=math.cos(th),math.sin(th)
            ncx,ncy=cx+c*dx+s*dy, cy-s*dx+c*dy; X,Y=ncx-FW/2,ncy-FH/2
        x,y,w,h=X,Y,FW,FH
    return [x,y,w,h,L.rot,L.a]
def to_game(steps):
    names=sorted({gname(L.n,L.flip) for ls,_ in steps for L in ls})
    out=[]
    for ls,sh in steps:
        st=[]
        for L in ls:
            x,y,w,h,rot,a=layer_row(L,sh)
            r=[names.index(gname(L.n,L.flip)),round(x,2),round(y,2),round(w,2),round(h,2)]
            if rot or a<1: r.append(round(rot,2))
            if a<1: r.append(round(a,3))
            st.append(r)
        out.append(st)
    return {'sprites':names,'steps':out}
# ---------- build ----------
scenes={sid:fn() for sid,(fn,line) in BS.SCENES.items()}
for sid,fr in scenes.items():
    b=lib.bounds(fr); print(sid, len(fr), 'steps; out of card:', b[:4] if b else 'none')
data={sid:to_game(fr) for sid,fr in scenes.items()}
need={}
for sid,fr in scenes.items():
    for ls,_ in fr:
        for L in ls: need[gname(L.n,L.flip)]=(L.n,L.flip)
for g,(n,flip) in sorted(need.items()):
    if g==n: continue
    im=full_image(n); im=ImageOps.mirror(im) if flip else im
    im.save(ARTDIR+g+'.webp','WEBP',lossless=True,method=6)
# merge into the scene file
src=open(SCENEJS).read(); head,rest=src.split('  const ART = ',1); body,tail=rest.split(';\n',1)
ART=json.loads(body)
for sid in [k for k in ART['scenes'] if k.startswith('bounce-')]: del ART['scenes'][sid]
for k in [k for k in ART['sprites'] if k.startswith('sk-')]: del ART['sprites'][k]
for g in sorted(need): ART['sprites'][g]='/art/cutaways/'+g+'.webp'
ART['sprites']=dict(sorted(ART['sprites'].items()))
for sid,d in data.items(): ART['scenes'][sid]=d
open(SCENEJS,'w').write(head+'  const ART = '+json.dumps(ART,separators=(',',':'))+';\n'+tail)
print('drawings:', ', '.join(sorted(g for g in need if g.startswith('sk-'))))
# ---------- check: draw the exported data the way public/cutaways.js drawStep does ----------
_pics={}
def pic(g):
    if g not in _pics: _pics[g]=Image.open(REPO+'/public'+ART['sprites'][g]).convert('RGBA')
    return _pics[g]
def game_render(d, i, k=2.0):
    card=Image.new('RGBA',(round(336*k),round(412*k)),(255,255,255,255))
    for r in d['steps'][min(i,len(d['steps'])-1)]:
        im=pic(d['sprites'][r[0]]); x,y,w,h=r[1:5]; rot=r[5] if len(r)>5 else 0; a=r[6] if len(r)>6 else 1
        im=im.resize((max(1,round(w*k)),max(1,round(h*k))),Image.LANCZOS)
        if rot: im=im.rotate(rot,resample=Image.BICUBIC,expand=True)
        if a<1: arr=np.array(im); arr[...,3]=(arr[...,3]*a).astype(np.uint8); im=Image.fromarray(arr)
        cx,cy=(x+w/2)*k,(y+h/2)*k; tmp=Image.new('RGBA',card.size,(0,0,0,0)); tmp.paste(im,(round(cx-im.width/2),round(cy-im.height/2)),im); card.alpha_composite(tmp)
    return card.convert('RGB')
worst=0
for sid,fr in scenes.items():
    for i in range(0,len(fr),5):
        a=np.asarray(lib.render(fr[i][0],k=1.0,shake=fr[i][1])).astype(int); b=np.asarray(game_render(data[sid],i,k=1.0)).astype(int)
        worst=max(worst,float(np.abs(a-b).mean()))
print('exported data vs. the scene as built, worst mean pixel difference (0-255):', round(worst,2))
if not OUT: sys.exit(0)
# ---------- previews ----------
os.makedirs(OUT,exist_ok=True)
def font(sz, bold=False):
    for p in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf','/System/Library/Fonts/Helvetica.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        try: return ImageFont.truetype(p,sz)
        except Exception: pass
    return ImageFont.load_default()
def card(d,i,k=1.0):
    E=3; art=game_render(d,i,k); W,H=art.width+2*round(E*k),art.height+2*round(E*k)
    c=Image.new('RGB',(W,H),'white'); c.paste(art,(round(E*k),round(E*k)))
    ImageDraw.Draw(c).rounded_rectangle([0,0,W-1,H-1],radius=round(22*k),outline=(17,17,17),width=max(1,round(E*k)))
    return c
TITLE={'bounce-kick':'Kick-back A, no egg','bounce-kick-egg':'Kick-back A, egg in her beak','bounce-leaf':'Leaf A, no egg','bounce-leaf-egg':'Leaf A, egg in her beak','bounce-rock':'Rock B, no egg','bounce-rock-egg':'Rock B, egg in her beak'}
rows=[]
for sid in ['bounce-kick','bounce-kick-egg','bounce-leaf','bounce-leaf-egg','bounce-rock','bounce-rock-egg']:
    kind=sid.split('-')[1]; keys=BS.KEYS[kind]; tiles=[]
    for i,beat in keys:
        c=card(data[sid],i,0.62); t=Image.new('RGB',(c.width+10,c.height+44),'white'); t.paste(c,(5,4))
        d=ImageDraw.Draw(t); d.text((6,c.height+8),f'step {i} ({i*50} ms)',font=font(13,True),fill=(30,30,30)); d.text((6,c.height+25),beat,font=font(12),fill=(80,80,80)); tiles.append(t)
    w,h=tiles[0].size; R=Image.new('RGB',(w*len(tiles)+10,h+34),'white')
    ImageDraw.Draw(R).text((8,8),f'{TITLE[sid]}  ({sid}, {len(data[sid]["steps"])} steps of 50 ms)  line: "{BS.LINES[kind]}"',font=font(16,True),fill='black')
    for j,t in enumerate(tiles): R.paste(t,(5+j*w,30))
    rows.append(R)
SHEET=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)),'white'); y=0
for r in rows: SHEET.paste(r,(0,y)); y+=r.height
SHEET.save(OUT+'/contact-sheet.png'); print(OUT+'/contact-sheet.png')
for sid,d in data.items():
    fd=OUT+'/frames/'+sid; os.makedirs(fd,exist_ok=True)
    for f in os.listdir(fd): os.remove(os.path.join(fd,f))
    n=len(d['steps']); line=BS.LINES[sid.split('-')[1]]
    allt=[card(d,i,0.5) for i in range(n)]; tw,th=allt[0].size; cols=10
    G=Image.new('RGB',(cols*(tw+6),((n+cols-1)//cols)*(th+20)),'white')
    for i,t in enumerate(allt): G.paste(t,((i%cols)*(tw+6),(i//cols)*(th+20))); ImageDraw.Draw(G).text(((i%cols)*(tw+6)+4,(i//cols)*(th+20)+th+2),str(i),font=font(13,True),fill=(200,0,0))
    G.save(OUT+'/'+sid+'-every-step.png')
    # the video: what the card shows for the 2 s the game holds it (the last step stays up), the line above it, three times
    seq=[min(i,n-1) for i in range(40)]+[None]*12; fi=0
    for _ in range(3):
        for i in seq:
            K=2; fr=Image.new('RGB',(390*K,560*K),'white'); dr=ImageDraw.Draw(fr); f=font(15*K,True); tw2=dr.textlength(line,font=f); dr.text(((fr.width-tw2)/2,14*K),line,font=f,fill='black')
            if i is not None: c=card(d,i,K*370/342); fr.paste(c,((fr.width-c.width)//2,52*K))
            else: dr.text((40*K,250*K),'(the board comes back)',font=font(14*K),fill=(150,150,150))
            fr.save(f'{fd}/{fi:04d}.png'); fi+=1
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','20','-i',f'{fd}/%04d.png','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',OUT+'/'+sid+'.mp4'],check=True)
    print(OUT+'/'+sid+'.mp4')
