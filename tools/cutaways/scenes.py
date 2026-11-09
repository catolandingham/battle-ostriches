"""Every cutaway as layers per 50 ms step, in the approved clip's own card coordinates.
Each layer: (sprite, x, y, s, rot_deg_ccw, alpha). x,y = top-left of the unrotated scaled sprite."""
import math, json, numpy as np
from PIL import Image, ImageOps, ImageFilter, ImageDraw
from spr import Sprite
import cv2
V='/workspace/bw/scenes/art/cutaway/v2/clean/'; M='/workspace/bw/scenes/art/cutaway/moments/clean/'
B='/workspace/bw/scenes/art/moments-b/clean/'; RAW='/workspace/bw/scenes/out/combos/raw/'
RECTS=json.load(open('/workspace/bw/scenes/rebuild/tools/cardrects.json'))
from erase_data import ERASE, ADD
SP={}
def sp(name, src, **kw):
    if name not in SP:
        kw.setdefault('erase', ERASE.get(name, ())); kw.setdefault('add', ADD.get(name, ()))
        SP[name]=Sprite(name, src, **kw)
    return name
def lerp(a,b,t): return a+(b-a)*t
def clamp(t): return max(0.0,min(1.0,t))
def ease_io(t): t=clamp(t); return 0.5-0.5*math.cos(math.pi*t)
def ease_out(t): t=clamp(t); return 1-(1-t)**2
def smooth(t): t=clamp(t); return t*t*(3-2*t)
def L(name,x,y,s,rot=0.0,a=1.0): return (name,float(x),float(y),float(s),float(rot),float(a))

# ---------- procedural sprites ----------
def _feather_draw(rot, Q=12):
    w,h=16,32
    im=Image.new('RGBA',((w+8)*Q,(h+8)*Q),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.ellipse([2*Q,1*Q,w*Q,(h-4)*Q],outline=(0,0,0,255),width=2*Q,fill=(255,255,255,255))
    d.line([((w//2+1)*Q,2*Q),((w//2+1)*Q,(h+2)*Q)],fill=(0,0,0,255),width=2*Q)
    if rot: im=im.rotate(rot,expand=True,resample=Image.BICUBIC)
    a=np.array(im).astype(np.float32)/255
    g=a[...,0]*a[...,3]+(1-a[...,3]); F=(a[...,3]>0.5).astype(np.uint8)
    return g,F
FEATHER_ROTS=(-35,-15,10,28,45,-50)
for r in FEATHER_ROTS:
    SP[f'feather{r}']=Sprite(f'feather{r}', f'proc:feather{r}', draw=(lambda r=r: _feather_draw(r)))
FEATHER_Q=12
def _ground_draw(Q=8):
    # burst ground: line y=332..334 x 15..326 (ink .86), little grass ticks every 28 px from x=22
    W,H=341*Q,24*Q; g=np.ones((H,W),np.float32)
    big=np.ones((H,W),np.float32)
    y0=332-316  # sprite top at y=316 in card coords
    cv2.line(big,(15*Q,int((y0+1.5)*Q)),(326*Q,int((y0+1.5)*Q)),0.14,int(3*Q),cv2.LINE_AA)
    for x0 in range(22,310,28):
        cv2.line(big,(x0*Q,int((y0-3)*Q)),((x0+4)*Q,int((y0-7)*Q)),0.28,int(2.2*Q),cv2.LINE_AA)
    return big,(big<0.99).astype(np.uint8)
SP['ground']=Sprite('ground','proc:ground',draw=_ground_draw,thr=0.6)
GROUND_Q=8

# ---------- originals ----------
def kick_sprites():
    sp('ow',V+'ostrich-windup.png'); sp('ok',V+'ostrich-kick.png'); sp('hs',V+'hyena-stand.png')
    sp('hf',V+'hyena-fly.png'); sp('kburst',V+'burst.png')
def fly_path(f, f0, f1, start, end):
    t=ease_out((f-f0)/max(1,(f1-f0)))
    return [lerp(a,b,t) for a,b in zip(start,end)]
def scene_kick():
    kick_sprites(); fr=[]
    hfw,hfh=SP['hf'].size()
    for f in range(30):
        if f<14: fr.append([L('hs',166.5,157.6,.211),L('ow',3.4,97.8,.259)])
        elif f<20: fr.append([L('hs',166.5,157.6,.211),L('ok',3.9,98.8,.252),L('kburst',168,177,.301)])
        else:
            # kicked hyena flies up and away, getting smaller, never leaving the card
            s,cx,cy,rot=fly_path(f,20,29,(0.20,250,233,-20),(0.11,282,62,-30))
            fr.append([L('ok',3.9,98.8,.252),L('hf',cx-hfw*s/2,cy-hfh*s/2,s,rot)])
    return fr
def scene_wrap():
    kick_sprites(); fr=[]
    hfw,hfh=SP['hf'].size()
    for f in range(14):
        if f<7: fr.append([L('hs',164,151,.2108),L('ow',1.0,91.2,.2581)])
        elif f<10: fr.append([L('hs',164,151,.2108),L('ok',.9,91.2,.253),L('kburst',165.5,170.4,.3007)])
        else:
            s,cx,cy,rot=fly_path(f,10,14,(0.18,236,224,-20),(0.15,250,178,-26))
            fr.append([L('ok',.9,91.2,.253),L('hf',cx-hfw*s/2,cy-hfh*s/2,s,rot)])
    return fr
def scene_catch():
    sp('c2face',M+'catch2-faceoff.png'); sp('c2feather',M+'catch2b-feather.png')
    return [[L('c2face',18.6,114.6,.3408)] if f<14 else [L('c2feather',18.5,119.0,.3408)] for f in range(30)]
def scene_knockout():
    sp('c2feather',M+'catch2b-feather.png'); sp('kodizzy',M+'ko-dizzy.png'); sp('koflop',M+'ko-flop.png')
    fr=[]
    dw,dh=SP['kodizzy'].size(); fw,fh=SP['koflop'].size()
    sd,sf=KO_SIZES
    for f in range(30):
        if f<16: fr.append([L('c2feather',18.5,119.0,.3408)])
        elif f<24: fr.append([L('kodizzy',171-dw*sd/2,214-dh*sd/2,sd)])
        else: fr.append([L('koflop',172-fw*sf/2,214-fh*sf/2,sf)])
    return fr
KO_SIZES=(0.344,0.373)
def scene_stone():
    sp('vfly',B+'vulture-fly.png'); sp('vempty',B+'vulture-fly-empty2.png'); sp('hs',V+'hyena-stand.png')
    sp('stone',B+'stone.png'); sp('stars',B+'stars.png'); sp('hbonk',B+'hyena-bonk.png')
    fr=[]
    for f in range(30):
        if f<14:
            x=3.5 if f<=3 else lerp(3.5,43.5,(f-3)/10)
            fr.append([L('hs',115.0,236.5,.1766),L('vfly',x,24.9,.2108)])
        elif f<20:
            fr.append([L('hs',115.0,236.5,.1766),L('vempty',100.5,13.1,.2129),L('stone',140,179,.496),L('stars',204,135,.4248)])
        else:
            t=ease_out((f-19)/5)
            fr.append([L('hbonk',66.4,137,.2278),L('vempty',lerp(100.5,127,t),lerp(13.1,5,t),.2129)])
    return fr
def scene_burst():
    sp('mound',B+'mound-tunnel.png'); sp('hwalkF',B+'hyena-walk.png',flip=True); sp('holeeyes',B+'hole-eyes.png')
    sp('holeempty',B+'hole-empty.png'); sp('bpop',B+'badger-pop.png'); sp('bshove',B+'badger-shove-from-hole.png')
    sp('hbrace',B+'hyena-bracing.png'); sp('htumble',B+'hyena-tumble-side.png')
    gq=1/GROUND_Q; fr=[]
    tw,th=SP['htumble'].size()
    for f in range(30):
        ls=[L('ground',0,316,gq)]
        hx=lerp(210,175,f/13) if f<13 else 175
        if f<14: ls+= [L('mound',lerp(0,59,ease_out(f/13)),277,.0865)]
        elif f<19: ls+=[L('holeeyes',51,263,.133)]
        if 19<=f<=24: ls+=[L('holeempty',57,306,.1173)]
        if 19<=f<=24:
            by={19:218.7,20:182.6,21:139.7}.get(f,128.7); ls+=[L('bpop',39.5,by,.1565)]
        if f<24: ls+=[L('hwalkF',hx,175.5,.133)]
        elif f==24: ls+=[L('hwalkF',179,175.5,.133)]
        if f>=25: ls+=[L('bshove',30,125,.1809)]
        if f in (25,26): ls+=[L('hbrace',185 if f==25 else 188,173.5 if f==25 else 172.5,.137)]
        if f>=27:
            s={27:.150,28:.138,29:.128}[f]; x={27:194,28:205,29:214}[f]; cy={27:220,28:215,29:226}[f]
            ls+=[L('htumble',x,cy-th*s/2,s)]
        fr.append(ls)
    return fr

# ---------- the 11 combos (same art box + motion as build_combos/rebuild_fix/fix_shoves) ----------
ART_W,ART_H=291,360; AX,AY=28-4,36-4   # art box inside the white card interior
def combo_place(raw_path):
    im=Image.open(raw_path).convert('RGB')
    g=ImageOps.grayscale(im).filter(ImageFilter.MedianFilter(size=3)); g=ImageOps.autocontrast(g,cutoff=2)
    arr=np.array(g).astype(np.float32)
    out=np.where(arr<150,0,np.where(arr>210,255,255-(210-arr)*0.3)).astype(np.uint8)
    out=np.where(out<40,0,np.where(out>220,255,out)).astype(np.uint8)
    ys,xs=np.where(out<240); pad=14
    x0,y0,x1,y1=max(0,xs.min()-pad),max(0,ys.min()-pad),min(out.shape[1],xs.max()+pad+1),min(out.shape[0],ys.max()+pad+1)
    cw,ch=x1-x0,y1-y0
    t=Image.new('L',(cw,ch)); t.thumbnail((ART_W-4,ART_H-4))
    w,h=t.size; s=w/cw
    return (int(x0),int(y0),int(x1),int(y1)), s, AX+(ART_W-w)//2, AY+(ART_H-h)//2
def combo(name, raw, flip=False):
    crop,s,x,y=combo_place(RAW+raw)
    sp(name,RAW+raw,crop=crop,flip=flip)
    return (name,x,y,s)
def static(c): n,x,y,s=c; return L(n,x,y,s)
BITE_FEATHERS=False
def bite(c, fi, start, end):
    n,x,y,s=c; t=(fi-start)/max(1,end-start-1)
    bob=int(3*math.sin(t*math.pi*4))
    ls=[L(n,x+bob,y,s)]
    # Brian 2026-11-09: the extra see-through feathers piled up on the bird's raised wing as a grey tangle.
    # The drawing already has its own loose feathers, so the overlay is gone and the wing shows clean.
    if not BITE_FEATHERS: return ls
    cx,cy=ART_W//2+10,ART_H//2+20
    for i,r in enumerate(FEATHER_ROTS):
        ang=-0.4+i*0.35; dist=18+t*(40+i*8)+6*math.sin(t*6+i)
        fx=int(cx+dist*math.cos(ang)+bob); fy=int(cy-dist*0.7-t*30)
        alpha=min(255,int(80+t*200))/255
        fw,fh=SP[f'feather{r}'].size(); W,H=fw/FEATHER_Q,fh/FEATHER_Q
        # PIL pasted at (fx-w//2, fy-h//2) with integer 1x sizes
        ls.append(L(f'feather{r}',AX+fx-int(W)//2,AY+fy-int(H)//2,1/FEATHER_Q,0,alpha))
    return ls
def scene_combo_kick(t):
    w=combo(f'k{t}-wind',f'kick-ostrich-{t}-wind.jpg'); i=combo(f'k{t}-impact',f'kick-ostrich-{t}-impact.jpg'); fl=combo(f'k{t}-fly',f'kick-ostrich-{t}-fly.jpg')
    return [[static(w)] if f<14 else [static(i)] if f<20 else [static(fl)] for f in range(30)]
def scene_combo_catch(by,bird):
    w=combo(f'c{by}{bird}-wind',f'catch-{by}-{bird}-wind.jpg'); i=combo(f'c{by}{bird}-impact',f'catch-{by}-{bird}-impact.jpg')
    return [[static(w)] if f<14 else bite(i,f,14,30) for f in range(30)]
def scene_combo_ko(by,bird):
    w=combo(f'c{by}{bird}-wind',f'catch-{by}-{bird}-wind.jpg'); i=combo(f'c{by}{bird}-impact',f'catch-{by}-{bird}-impact.jpg')
    d=combo(f'ko{by}{bird}-dizzy',f'ko-{by}-{bird}-dizzy.jpg'); fl=combo(f'ko{by}{bird}-flop',f'ko-{by}-{bird}-flop.jpg')
    return [[static(w)] if f<8 else bite(i,f,8,16) if f<16 else [static(d)] if f<24 else [static(fl)] for f in range(30)]
def scene_combo_stone():
    w=combo('svb-wind','stone-vulture-badger-wind.jpg'); i=combo('svb-impact','stone-vulture-badger-impact.jpg'); a=combo('svb-after','stone-vulture-badger-after.jpg')
    return [[static(w)] if f<14 else [static(i)] if f<22 else [static(a)] for f in range(30)]
def shove_dx(fi, A, push_max):
    if fi<4: return 0.0,'in'
    hold=push_max-30.0
    keys=[(4,0.0),(8,A),(12,-A),(16,A*0.6),(18,hold)]
    if fi<19:
        for (t0,v0),(t1,v1) in zip(keys,keys[1:]):
            if fi<=t1: return v0+(v1-v0)*ease_io((fi-t0)/(t1-t0)),'sway'
        return keys[-1][1],'sway'
    if fi<22: return hold,'cross'
    u=smooth((fi-22)/7); return hold+(push_max-hold)*u,'push'
def scene_combo_shove(winner):
    loser='hyena' if winner=='badger' else 'badger'
    st=combo(f'sh{winner}-struggle','shove-badger-hyena-struggle.jpg',flip=(winner=='hyena'))
    wn=combo(f'sh{winner}-win',f'shove-{winner}-{loser}-win.jpg')
    A,push=shove_room(st,wn)
    fr=[]
    for f in range(30):
        dx,ph=shove_dx(f,A,push)
        if ph in('in','sway') or (ph=='cross' and f<20): n,x,y,s=st
        else: n,x,y,s=wn
        fr.append([L(n,x+dx,y,s)])
    return fr
def ink_x(n):
    g,F=SP[n].base(); xs=np.where((g<0.75).any(0))[0]; return xs.min(),xs.max()+1
def shove_room(st,wn,W=339,m=3.0):
    n,x,y,s=st; a0,a1=ink_x(n); left,right=x+a0*s,x+a1*s
    A=min(26.0,left-m,W-m-right)
    n2,x2,y2,s2=wn; b0,b1=ink_x(n2); push=min(110.0,W-m-(x2+b1*s2))
    return A,push
SCENES={
 'kick':(scene_kick,'kick'), 'kick-wrap':(scene_wrap,'kick-wrap'),
 'kick-badger':(lambda: scene_combo_kick('badger'),'kick-badger'), 'kick-vulture':(lambda: scene_combo_kick('vulture'),'kick-vulture'),
 'knockout':(scene_knockout,'knockout'),
 'knockout-hyena-vulture':(lambda: scene_combo_ko('hyena','vulture'),'knockout-hyena-vulture'),
 'knockout-badger-ostrich':(lambda: scene_combo_ko('badger','ostrich'),'knockout-badger-ostrich'),
 'knockout-badger-vulture':(lambda: scene_combo_ko('badger','vulture'),'knockout-badger-vulture'),
 'catch':(scene_catch,'catch'),
 'catch-hyena-vulture':(lambda: scene_combo_catch('hyena','vulture'),'catch-hyena-vulture'),
 'catch-badger-ostrich':(lambda: scene_combo_catch('badger','ostrich'),'catch-badger-ostrich'),
 'catch-badger-vulture':(lambda: scene_combo_catch('badger','vulture'),'catch-badger-vulture'),
 'stone':(scene_stone,'stone'), 'stone-badger':(scene_combo_stone,'stone-badger'),
 'burst':(scene_burst,'burst'),
 'shove-badger-hyena':(lambda: scene_combo_shove('badger'),'shove-badger-hyena'),
 'shove-hyena-badger':(lambda: scene_combo_shove('hyena'),'shove-hyena-badger'),
}
# ---------- egg smash (5a) ----------
# A new scene: a function that returns 30 steps of layers, its card rect in RECTS, a row in SCENES,
# then run export.py and add a TABLE row in public/cutaways.js.
import egg5a
RECTS['egg-smash']=[24,174,341,426]
SCENES['egg-smash']=(lambda: egg5a.scene(SP),'egg-smash')
