"""Toolkit for the stone kick-back cartoons (bounce_scenes.py): sprites (the approved cartoon drawings already in
public/art/cutaways, parts cut out of them, and placeholder drawings), and a renderer that draws a 336x412 card the way
public/cutaways.js drawStep does. Started from the storyboard toolkit of 2026-11-25; runs on this Mac (no /workspace paths)."""
import math, os, json, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
REPO=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART=REPO+'/public/art/cutaways/'
SPRDIR=None   # set to a folder to also save the cut-out and placeholder drawings as PNG for checking
CW,CH=336,412
SP={}      # name -> RGBA PIL image, cropped to ink + 4px
ORIGIN={}  # name -> (crop_x0, crop_y0, src_w, src_h) to map points from the source drawing
KIND={}    # name -> 'existing' | 'crop' | 'placeholder'
def _crop(im,pad=4):
    a=np.array(im)[...,3]; ys,xs=np.where(a>8)
    x0,y0=max(0,xs.min()-pad),max(0,ys.min()-pad); x1,y1=min(im.width,xs.max()+pad+1),min(im.height,ys.max()+pad+1)
    return im.crop((x0,y0,x1,y1)),(x0,y0)
def existing(name):
    im=Image.open(ART+name+'.webp').convert('RGBA'); c,o=_crop(im); SP[name]=c; ORIGIN[name]=(*o,im.width,im.height); KIND[name]='existing'
def from_comps(new, src, keep):
    """A crop of an existing drawing: keep only the connected parts listed (by bbox test)."""
    im=Image.open(ART+src+'.webp').convert('RGBA'); a=np.array(im)
    n,lab,st,cen=cv2.connectedComponentsWithStats((a[...,3]>8).astype(np.uint8),8)
    m=np.zeros(lab.shape,bool)
    for i in range(1,n):
        x,y,w,h,ar=st[i]
        if keep(x,y,w,h,ar): m|=lab==i
    a=a.copy(); a[~m]=0; c,o=_crop(Image.fromarray(a)); SP[new]=c; ORIGIN[new]=(*o,im.width,im.height); KIND[new]=('crop',src)
    if SPRDIR: c.save(SPRDIR+new+'.png')
def pt(name, rx, ry):
    """a point given as a fraction of the SOURCE drawing (as the egg-smash data places the stone) -> fraction of the cropped sprite"""
    x0,y0,W,H=ORIGIN[name]; im=SP[name]; return ((rx*W-x0)/im.width,(ry*H-y0)/im.height)
# ---------- placeholder drawings (same black line on white as the cartoon art, drawn at high res) ----------
Q=4
def _finish(im,name):
    im=im.resize((im.width//Q,im.height//Q),Image.LANCZOS); c,_=_crop(im); SP[name]=c; ORIGIN[name]=(0,0,c.width,c.height); KIND[name]='placeholder'; (c.save(SPRDIR+name+'-PLACEHOLDER.png') if SPRDIR else None)
def leaf_flat():
    # a big leaf lying on the ground, seen from the side and a little above: the board's leaf icon, stretched out
    W,H=640*Q,190*Q; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    pts=[]
    for i in range(0,181):
        t=i/180; x=40+560*t; top=95-78*math.sin(math.pi*t)**0.8; pts.append((x*Q,top*Q))
    for i in range(180,-1,-1):
        t=i/180; x=40+560*t; bot=95+62*math.sin(math.pi*t)**0.9; pts.append((x*Q,bot*Q))
    d.polygon(pts,fill=(255,255,255,255)); d.line(pts+[pts[0]],fill=(0,0,0,255),width=11*Q,joint='curve')
    d.line([(40*Q,95*Q),(-5*Q+40*Q,130*Q)],fill=(0,0,0,255),width=11*Q) # stalk
    d.line([(60*Q,100*Q),(585*Q,88*Q)],fill=(0,0,0,255),width=9*Q)     # midrib
    for k in range(1,6):
        x=60+k*90; d.line([(x*Q,98*Q-k*2*Q),((x+45)*Q,(50)*Q)],fill=(0,0,0,255),width=6*Q); d.line([(x*Q,98*Q-k*2*Q),((x+40)*Q,140*Q)],fill=(0,0,0,255),width=6*Q)
    _finish(im,'leaf')
def rockpile():
    # three or four chunky rocks stacked, like the board's rock icon; light grey fill like the stone
    W,H=520*Q,330*Q; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    rocks=[[(20,320),(40,210),(130,180),(205,215),(225,320)],
           [(215,320),(235,200),(330,170),(420,210),(445,320)],
           [(420,320),(440,250),(490,240),(510,320)],
           [(120,195),(150,110),(240,85),(330,120),(335,190),(240,215)]]
    for r in rocks:
        P=[(x*Q,y*Q) for x,y in r]; d.polygon(P,fill=(214,214,214,255)); d.line(P+[P[0]],fill=(0,0,0,255),width=12*Q,joint='curve')
    d.line([(190*Q,140*Q),(230*Q,128*Q)],fill=(0,0,0,255),width=7*Q); d.line([(300*Q,250*Q),(340*Q,240*Q)],fill=(0,0,0,255),width=7*Q)
    _finish(im,'rockpile')
def rockpile_top_gone():
    W,H=520*Q,330*Q; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    rocks=[[(20,320),(40,210),(130,180),(205,215),(225,320)],
           [(215,320),(235,200),(330,170),(420,210),(445,320)],
           [(420,320),(440,250),(490,240),(510,320)]]
    for r in rocks:
        P=[(x*Q,y*Q) for x,y in r]; d.polygon(P,fill=(214,214,214,255)); d.line(P+[P[0]],fill=(0,0,0,255),width=12*Q,joint='curve')
    d.line([(300*Q,250*Q),(340*Q,240*Q)],fill=(0,0,0,255),width=7*Q)
    # keep the same canvas height as the full pile so the two swap in place
    im2=Image.new('RGBA',(W,H),(0,0,0,0)); im2.alpha_composite(im)
    s=im2.resize((W//Q,H//Q),Image.LANCZOS); SP['rockpile2']=s.crop((0,0,s.width,s.height)); ORIGIN['rockpile2']=(0,0,s.width,s.height); KIND['rockpile2']='placeholder'; (s.save(SPRDIR+'rockpile2-PLACEHOLDER.png') if SPRDIR else None)
def toprock():
    # the pile's top rock on its own, for the vulture to hold
    W,H=260*Q,150*Q; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    r=[(10,110),(40,25),(130,5),(220,40),(225,110),(130,140)]
    P=[(x*Q,y*Q) for x,y in r]; d.polygon(P,fill=(214,214,214,255)); d.line(P+[P[0]],fill=(0,0,0,255),width=12*Q,joint='curve')
    d.line([(70*Q,55*Q),(110*Q,43*Q)],fill=(0,0,0,255),width=7*Q)
    _finish(im,'toprock')
def shake():
    # vibration marks: two pairs of short curved strokes, left and right of whatever is shaking
    W,H=420*Q,260*Q; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    for side in (-1,1):
        cx=210+side*170
        for k,r in enumerate((30,52)):
            st,en=(140,220) if side<0 else (-40,40)
            d.arc([(cx-side*40-r)*Q,(130-r)*Q,(cx-side*40+r)*Q,(130+r)*Q],start=st,end=en,fill=(0,0,0,255),width=8*Q)
    _finish(im,'shake')
def beak_egg():
    # PLACEHOLDER: the egg she holds in her bill, egg-shaped (narrower at the top), in the cartoon's own heavy line, with a shine
    W,H=150*Q,180*Q; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    cx,cy,rw,rh=75,92,60,78; pts=[]
    for i in range(240):
        t=2*math.pi*i/240; y=-math.cos(t)*rh; x=math.sin(t)*rw*(1-0.16*math.cos(t)); pts.append(((cx+x)*Q,(cy+y)*Q))
    d.polygon(pts,fill=(255,255,255,255)); d.line(pts+[pts[0]],fill=(0,0,0,255),width=11*Q,joint='curve')
    d.arc([(cx-38)*Q,(cy-56)*Q,(cx-6)*Q,(cy-18)*Q],start=195,end=290,fill=(0,0,0,255),width=7*Q)
    _finish(im,'beakegg')
# each ostrich drawing's bill (left, top, right, mouth line, in the drawing's pixels): where the egg she carries goes
BILLS={'ow':(360,118,548,163),'ok':(68,118,270,168),'oknee':(65,116,255,163)}
def build():
    for n in ['eegg','ow','ok','evstand','evstandtip','evrear','evreartip','evthrow','evempty','efly','estone','kburst','eimpact','eground','stars','estreak16','estreak17','estreak18','estreak19']: existing(n)
    from_comps('vscared','chyenavulture-wind',lambda x,y,w,h,a: x>=460)                     # vulture facing left, alarmed
    from_comps('vsmug','kvulture-wind',lambda x,y,w,h,a: x>=400 and a>50000)                # vulture, half-shut smug eyes
    from_comps('oknee','kvulture-wind',lambda x,y,w,h,a: x<400 and a>50000)                 # ostrich, knee up
    from_comps('vdizzy','kohyenavulture-dizzy',lambda x,y,w,h,a: x>=395)                    # vulture, spiral eyes and stars
    from_comps('speed','kvulture-fly',lambda x,y,w,h,a: x>=400 and a<2000 and y<300)        # speed lines (the upper set)
    feathers=[(367,116),(370,235),(318,383),(359,434),(514,479),(17,212)]
    for i,(fx,fy) in enumerate(feathers):
        from_comps(f'feather{i}','chyenavulture-impact',lambda x,y,w,h,a,fx=fx,fy=fy: x==fx and y==fy)
    leaf_flat(); rockpile(); rockpile_top_gone(); toprock(); shake(); beak_egg()
    # where the stone sits in the vulture's wing (from the approved egg-smash data, as fractions of the source drawing)
    global WING
    WING={'evstand':pt('evstand',0.866,0.357),'evrear':pt('evrear',0.856,0.253),'evthrow':pt('evthrow',0.969,0.41)}
# ---------- layers ----------
class Lyr:
    __slots__=('n','x','y','w','h','rot','a','flip')
    def __init__(s,n,x,y,w,h,rot=0,a=1,flip=False): s.n,s.x,s.y,s.w,s.h,s.rot,s.a,s.flip=n,x,y,w,h,rot,a,flip
def P(n, cx, bottom, height=None, width=None, rot=0, a=1, flip=False, sx=1, sy=1, anchor='bottom'):
    """place a drawing by its centre-x and its bottom (or centre, anchor='center'), sized by height or width; sx/sy squash and stretch"""
    im=SP[n]; asp=im.width/im.height
    if height is None: height=width/asp
    w=height*asp*sx; h=height*sy
    y=bottom-h if anchor=='bottom' else bottom-h/2
    return Lyr(n,cx-w/2,y,w,h,rot,a,flip)
def wing(v, lyr):
    """card position of the stone held in a vulture drawing's wing"""
    fx,fy=WING[v.n] if v.n in WING else (0.85,0.35)
    if v.flip: fx=1-fx
    return v.x+fx*v.w, v.y+fy*v.h
# ---------- render (same maths as cutaways.js drawStep: rotate about the centre, counter-clockwise) ----------
_cache={}
def _scaled(n,w,h,flip):
    k=(n,w,h,flip)
    if k not in _cache:
        im=SP[n].transpose(Image.FLIP_LEFT_RIGHT) if flip else SP[n]
        _cache[k]=im.resize((max(1,w),max(1,h)),Image.LANCZOS)
        if len(_cache)>4000: _cache.clear()
    return _cache[k]
def render(layers, k=2.0, shake=(0,0)):
    card=Image.new('RGBA',(round(CW*k),round(CH*k)),(255,255,255,255))
    for L in layers:
        w,h=round(L.w*k),round(L.h*k)
        if w<1 or h<1 or L.a<=0: continue
        im=_scaled(L.n,w,h,L.flip)
        if L.rot: im=im.rotate(L.rot,resample=Image.BICUBIC,expand=True)
        if L.a<1:
            a=np.array(im); a[...,3]=(a[...,3]*L.a).astype(np.uint8); im=Image.fromarray(a)
        cx,cy=(L.x+L.w/2+shake[0])*k,(L.y+L.h/2+shake[1])*k
        card.alpha_composite(im,(round(cx-im.width/2),round(cy-im.height/2))) if (round(cx-im.width/2)>=0 and round(cy-im.height/2)>=0) else _paste_any(card,im,round(cx-im.width/2),round(cy-im.height/2))
    return card.convert('RGB')
def _paste_any(card,im,x,y):
    tmp=Image.new('RGBA',card.size,(0,0,0,0)); tmp.paste(im,(x,y),im); card.alpha_composite(tmp)
def ink_box(L):
    """the drawn ink's corners on the card, after turn"""
    a=np.array(SP[L.n])[...,3]; ys,xs=np.where(a>8); W,H=SP[L.n].size
    x0,x1=xs.min()/W,(xs.max()+1)/W; y0,y1=ys.min()/H,(ys.max()+1)/H
    if L.flip: x0,x1=1-x1,1-x0
    cx,cy=L.x+L.w/2,L.y+L.h/2; th=math.radians(L.rot); c,s=math.cos(th),math.sin(th)
    q=[]
    for fx,fy in ((x0,y0),(x1,y0),(x0,y1),(x1,y1)):
        px,py=L.x+fx*L.w-cx,L.y+fy*L.h-cy; q.append((cx+c*px+s*py, cy-s*px+c*py))
    return min(p[0] for p in q),min(p[1] for p in q),max(p[0] for p in q),max(p[1] for p in q)
def bounds(steps, margin=2.0):
    bad=[]
    for i,(ls,_) in enumerate(steps):
        for L in ls:
            if L.n=='eground': continue
            x0,y0,x1,y1=ink_box(L)
            if x0<margin or y0<margin or x1>CW-margin or y1>CH-margin: bad.append((i,L.n,round(x0),round(y0),round(x1),round(y1)))
    return bad
def S(n, cx, bottom, s, rot=0, a=1, flip=False, sx=1, sy=1, anchor='bottom'):
    """place a drawing at a fixed source scale s (so every pose of one animal stays the same size)"""
    im=SP[n]; w=im.width*s*sx; h=im.height*s*sy
    y=bottom-h if anchor=='bottom' else bottom-h/2
    return Lyr(n,cx-w/2,y,w,h,rot,a,flip)
def foot(L, fx, fy):
    """card point at fraction (fx,fy) of a placed drawing (mirrors with flip)"""
    if L.flip: fx=1-fx
    return L.x+fx*L.w, L.y+fy*L.h
