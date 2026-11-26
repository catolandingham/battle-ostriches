"""The three stone kick-back cartoons Brian picked from the storyboards (2026-11-25): kick-back A, leaf A, rock B.
Each comes in two looks: the ostrich with the egg in her beak (she was carrying) and without. 50 ms steps on the 336x412 card.

Changes from the storyboards (Brian):
- The opening is longer so the throw reads: the vulture holds the stone (steps 0-3), rears back (4-7), throws (8-9),
  and the stone flies to the ostrich (8-14) while she sees it coming and winds up (11-14). She kicks at step 15/16.
  Everything after the kick is the storyboard, moved later. Leaf and rock end 4 steps (0.2 s) sooner than their
  storyboards so each cartoon fits the 2 s the game already holds the board for a cartoon (40 steps).
- egg=True draws the egg (the approved egg-smash egg) in her beak in every step she is on the card."""
import math
from bounce_lib import S, foot, SP, WING
import bounce_lib as lib
G=336; SO=0.29; SV=0.27; OL=6     # ground line, ostrich and vulture source scales, ostrich left edge
def layout(g,so,sv,ol=6):
    global G,SO,SV,OL; G,SO,SV,OL=g,so,sv,ol
def lerp(a,b,t): return a+(b-a)*t
def cl(t): return max(0.0,min(1.0,t))
def eo(t): t=cl(t); return 1-(1-t)**2
def ei(t): t=cl(t); return t*t
def arc(p0,p1,apex,t):
    t=cl(t); cx=(p0[0]+p1[0])/2; cy=2*apex-(p0[1]+p1[1])/2
    return ((1-t)**2*p0[0]+2*(1-t)*t*cx+t*t*p1[0], (1-t)**2*p0[1]+2*(1-t)*t*cy+t*t*p1[1])
def ground(): return S('eground',168,G+2,300/734)
def stone(x,y,rot=0,sx=1,sy=1,w=28): return S('estone',x,y,w/107,rot=rot,sx=sx,sy=sy,anchor='center')
def burst(x,y,w=52,a=1): return S('kburst',x,y,w/176,a=a,anchor='center')
def speed(x,y,rot,w=40,a=1): return S('speed',x,y,w/SP['speed'].width,rot=rot,a=a,anchor='center')
def shakes(x,y,w=120,a=1): return S('shake',x,y,w/SP['shake'].width,a=a,anchor='center')
def O(pose, rot=0, dy=0, sx=1, sy=1):
    left=OL+(4 if pose=='oknee' else 0); w=SP[pose].width*SO
    return S(pose,left+w/2,G+dy,SO,rot=rot,sx=sx,sy=sy)
def turned(L, fx, fy):
    """card point at fraction (fx,fy) of a placed drawing, after its turn (counter-clockwise about its middle)"""
    x,y=foot(L,fx,fy); cx,cy=L.x+L.w/2,L.y+L.h/2; th=math.radians(L.rot); c,s=math.cos(th),math.sin(th)
    dx,dy=x-cx,y-cy; return cx+c*dx+s*dy, cy-s*dx+c*dy
def ostrich(ls, pose, egg, **kw):
    """the ostrich in one of her poses; egg=True draws the carrying version of that pose (bounce_lib.carry_pose, a placeholder)"""
    o=O(pose,**kw)
    if egg: o.n='carry-'+pose          # same size and place as the plain drawing
    ls.append(o); return o
def kick_point(): return foot(O('ok'),0.985,0.405)
def V(pose, cx, bottom=None, rot=0, sx=1, sy=1, flip=True, k=1.0, a=1):
    return S(pose,cx,G if bottom is None else bottom,SV*k,rot=rot,sx=sx,sy=sy,flip=flip,a=a)
def held(v, dx=0, dy=0):
    fx,fy=WING[v.n]; x,y=foot(v,fx,fy); return x+(-dx if v.flip else dx), y+dy
def fly(p0,p1,f,f0,f1,ls,rot0=0):
    """the stone shot flat and fast from p0 to p1 over steps f0..f1, stretched, with speed lines behind"""
    t=(f-f0+1)/(f1-f0+1); x,y=lerp(p0[0],p1[0],ei(t)),lerp(p0[1],p1[1],ei(t))
    ang=math.degrees(math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0])); ux,uy=math.cos(math.radians(ang)),-math.sin(math.radians(ang))
    ls+= [speed(x-ux*32,y-uy*32-6,ang+18), stone(x,y,rot=-60*f,sx=1.35,sy=0.8)]
TIPS={'evrear':('evreartip',0.750,0.256),'evstand':('evstandtip',0.885,0.360)}
def holdrock(v, w=30, name='toprock'):
    """the rock gripped the way the approved egg-smash vulture grips its stone: rock at the wing point, the wing-tip drawing over it"""
    x,y=held(v); out=[S(name,x,y,w/SP[name].width,anchor='center')]
    if v.n in TIPS:
        tn,fx,fy=TIPS[v.n]; px,py=lib.pt(v.n,fx,fy); tx,ty=foot(v,px,py)
        k=v.w/SP[v.n].width; out.append(S(tn,tx,ty,k,flip=v.flip,anchor='center'))
    return out
FEATHERS=['feather0','feather1','feather2','feather3','feather4','feather5']
def feathers(t, x0, y0, spread=1.0, fall=2.6, dirs=None):
    out=[]
    dirs=dirs or [(-1.0,-0.9),(1.1,-0.8),(-0.6,-1.3),(0.5,-1.4),(-1.3,0.1),(1.2,0.2)]
    for i,(n,(dx,dy)) in enumerate(zip(FEATHERS,dirs)):
        b=eo(t/3)
        x=x0+dx*36*spread*b+5*math.sin(t*0.6+i)
        y=y0+dy*30*spread*b+max(0,t-3)*fall
        out.append(S(n,x,y,0.42,rot=25*math.sin(t*0.5+i*1.7),anchor='center'))
    return out
# ---------------- the opening every cartoon shares (steps 0-14) ----------------
KICK=15   # the step she is in her kick pose with the stone at her foot; the burst is the step after
def opening(f, Vx, vb, ls, egg, target=None, pose=None):
    """the vulture holds the stone, rears back, throws; the stone arcs to the ostrich, who sees it and winds up.
    target: where the stone flies to (her foot unless given). pose(f, ls): draws the ostrich instead of the kick wind-up."""
    Sx,Sy=kick_point(); p1=target or (Sx+4,Sy)
    if pose: pose(f,ls)
    elif f<11: ostrich(ls,'oknee',egg)
    else: ostrich(ls,'ow',egg,rot=3 if f>=13 else 0)
    if f<4: v=V('evstand',Vx,vb); ls+=[v,*holdrock(v,24,'estone')]                                   # holds the stone up
    elif f<8: v=V('evrear',Vx,vb-(3 if f in (5,6) else 0)); ls+=[v,*holdrock(v,24,'estone')]          # rears back: the wind-up
    elif f<10: ls.append(V('evthrow',Vx,vb))                                                           # the throw
    else: ls.append(V('evempty',Vx,vb))                                                                # watches it go
    if f>=8:
        p0=held(V('evthrow',Vx,vb)); t=(f-7)/8.0
        x,y=arc(p0,p1,min(p0[1],p1[1])-58,t); ls.append(stone(x,y,rot=-45*(f-7)))
        if f in (8,9):                                                                                 # a swoosh as it leaves the wing
            a=math.degrees(math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]))
            ls.append(speed(x+22,y-4,a+200,w=38,a=0.9 if f==8 else 0.6))
    return Sx,Sy
# ---- the ending for a stone sent straight back (Brian, 2026-11-25): it hits the vulture in the chest, the vulture is knocked
# backward off the right edge of the card, and the stone drops THUNK on the spot where the vulture stood (that square is wrecked).
HIT=19    # the step the stone hits the vulture's chest
def chest(Vx): return foot(V('vscared',Vx,flip=False),0.34,0.44)
def knocked(f, Vx, src, ls):
    """steps HIT-2 on: the stone flies from src into the vulture's chest, the vulture goes off the right edge, the stone drops"""
    h=f-HIT; cx,cy=chest(Vx); sh=(0,0)
    if h<-1: ls.append(V('evempty',Vx))
    elif h<0: ls.append(V('vscared',Vx,sy=1.08,sx=0.95,flip=False))                                   # sees it coming
    elif h==0: ls.append(V('vscared',Vx+14,rot=-10,sx=0.86,sy=1.04,flip=False))                        # hit in the chest
    else:
        t=cl(h/4); x=lerp(Vx+14,470,eo(t)*0.35+ei(t)*0.65); lift=26*math.sin(math.pi*min(1,t*1.1))
        if t<1: ls.append(V('vscared',x,G-lift,rot=-8-48*t,sx=0.9,sy=1.05,flip=False))                 # knocked backward, off the card
        if h in (1,2): ls.append(speed(x-70,G-70-lift,-8,w=46,a=0.8))
    if -2<=h<0: fly(src,(cx,cy),f,HIT-2,HIT,ls)
    elif h==0: ls+=[burst(cx+8,cy,84), stone(cx+6,cy,sx=0.62,sy=1.4)]; sh=(4,2)
    elif h in (1,2): ls.append(stone(lerp(cx,Vx,h/2),lerp(cy,G-10,ei(h/2)),rot=-50*h))                 # it drops straight down
    elif h==3: ls+=[burst(Vx,G-10,80), stone(Vx,G-8,sx=1.5,sy=0.6)]; sh=(4,2)                        # THUNK on its old spot
    elif h==4: ls+=[burst(Vx,G-10,64,a=0.55), stone(Vx,G-16)]; sh=(-3,-1)
    elif h>=5: ls.append(stone(Vx,G-12))
    if h>=0: ls+=feathers(h,cx+10,cy,0.9,3.0)
    return sh
# ======================================================================
# KICK-BACK A (new ending, Brian 2026-11-25): she kicks it straight back into the vulture's chest
STEPS_KB=34
def kickback(egg=False):
    layout(336,0.29,0.27); fr=[]; Vx=266; Sx,Sy=kick_point()
    for f in range(STEPS_KB):
        ls=[ground()]; sh=(0,0)
        if f<KICK: opening(f,Vx,G,ls,egg); fr.append((ls,sh)); continue
        ostrich(ls,'ok' if f<HIT+3 else 'oknee',egg)
        if f==KICK: ls.append(stone(Sx+4,Sy,rot=-45*8))
        elif f==KICK+1: ls+=[burst(Sx+6,Sy,58), stone(Sx+8,Sy,sx=1.5,sy=0.62)]
        sh=knocked(f,Vx,(Sx+8,Sy),ls)
        fr.append((ls,sh))
    return fr
# TRAMPOLINE (new, Brian 2026-11-25): she stands on a leaf, grabs its end in her bill and pulls it back taut, the other end on the
# ground; the stone boings off it straight back into the vulture. Never with the egg (she is not carrying).
def tramp_leaf(a, b, sy=0.8, sx=1.0):
    """the leaf stretched from point a (the stalk end) to point b"""
    L=math.hypot(b[0]-a[0],b[1]-a[1]); ang=math.degrees(math.atan2(-(b[1]-a[1]),b[0]-a[0]))
    return S('leaf',(a[0]+b[0])/2,(a[1]+b[1])/2,L*sx/SP['leaf'].width,rot=ang,sy=sy*1.35,anchor='center')
def bill_point(o):
    W,H=SP[o.n].size; x0,y0,x1,y1=lib.BILLS[o.n]; return turned(o,(x0+x1)/2/W,(y1+4)/H)
def trampoline():
    layout(336,0.29,0.27); fr=[]; Vx=266
    FLAT=((14,G-2),(176,G-2)); END=(206,G-2)
    def leaf_at(f):
        o=O('oknee',rot=5 if 11<=f<HIT+6 else 0)
        if f<10 or f>=HIT+8: return o,FLAT[0],FLAT[1]
        bp=bill_point(o)
        if f<13: t=eo((f-9)/3); return o,(lerp(FLAT[0][0],bp[0],t),lerp(FLAT[0][1],bp[1],t)),(lerp(FLAT[1][0],END[0],t),END[1])
        if f<HIT+6: return o,bp,END
        t=eo((f-HIT-5)/3); return o,(lerp(bp[0],FLAT[0][0],t),lerp(bp[1],FLAT[0][1],t)),(lerp(END[0],FLAT[1][0],t),END[1])
    def hit_point(f):
        o,a,b=leaf_at(f); return lerp(a[0],b[0],0.62)+7,lerp(a[1],b[1],0.62)-7
    def pose(f, ls):
        o,a,b=leaf_at(f); held=10<=f<HIT+8
        if held: ls+=[o, tramp_leaf(a,b,sy=0.75 if f>=13 else 0.85)]
        else: ls+=[tramp_leaf(a,b,sy=0.9), o]                     # flat on the ground under her feet
    for f in range(STEPS_KB):
        ls=[ground()]; sh=(0,0)
        if f<KICK: opening(f,Vx,G,ls,False,target=hit_point(14),pose=pose); fr.append((ls,sh)); continue
        o,a,b=leaf_at(f); hx,hy=hit_point(f)
        if f==KICK:                                              # the stone hits the leaf: it gives
            ls+=[o, tramp_leaf(a,b,sy=0.6,sx=0.97), stone(hx-4,hy+3,sx=1.4,sy=0.65), shakes(hx,hy,90)]
        elif f==KICK+1: ls+=[o, tramp_leaf(a,b,sy=1.1), shakes(hx,hy,90,a=0.7)]   # and springs back: boing
        else: pose(f,ls)
        sh=knocked(f,Vx,(hx+6,hy-4),ls)
        fr.append((ls,sh))
    return fr
# ---- leaf and rock: after the opening she kicks it straight back ----
def kick_after(o, ls, egg):
    """the storyboards' steps 3 on: kick pose with the stone at her foot (3), the contact (4), then the follow-through"""
    Sx,Sy=kick_point()
    ostrich(ls,'ok' if o<9 else 'oknee',egg)
    if o==3: ls.append(stone(Sx+4,Sy,rot=-45*8))
    elif o==4: ls+= [burst(Sx+6,Sy,56), stone(Sx+8,Sy,sx=1.5,sy=0.62)]
    return Sx,Sy
LAND=(311,None)
def landing(f, ls, f_land=19):
    x=LAND[0]
    if f==f_land: ls+= [burst(x,G-12,42), stone(x,G-10,sx=1.35,sy=0.68)]; return (2,1)
    if f>f_land: ls.append(stone(x,G-13))
    return (0,0)
LEAF_W=146
def leaf(cx, bottom, rot=0, sx=1, sy=1): return S('leaf',cx,bottom,LEAF_W/SP['leaf'].width,rot=rot,sx=sx,sy=sy*1.35)
STEPS_LR=38   # leaf and rock: the storyboard's 30 steps, 12 later, minus the last 4 steps of the ending
# LEAF A: the vulture flattens itself on the leaf, the leaf springs like a trampoline, the stone boings over. Smug.
def leafA(egg=False):
    layout(336,0.235,0.25); fr=[]; Vx=242; top=G-10; D=KICK-3
    wob={9:-17,10:12,11:-8,12:6,13:-4,14:3,15:-2,16:1}
    for f in range(STEPS_LR):
        ls=[ground()]; o=f-D
        lr=9 if o==8 else wob.get(o,0); lsy=0.8 if o==8 else 1.0
        ls.append(leaf(Vx-8,G+3,rot=lr,sy=lsy))
        if f<KICK: opening(f,Vx,top,ls,egg); fr.append((ls,(0,0))); continue
        Sx,Sy=kick_after(o,ls,egg)
        if o<4: ls.append(V('evempty',Vx,top))
        elif o<6: ls.append(V('vscared',Vx,top,sx=0.94,sy=1.1,flip=False))                      # the take
        elif o<17: ls.append(V('vscared',Vx+2,top-lr*0.3,sx=1.22,sy=0.55,rot=lr*0.4,flip=False))  # flattens itself
        elif o<18: ls.append(V('vscared',Vx,top,sx=1.08,sy=0.82,flip=False))
        elif o<19: ls.append(V('vsmug',Vx,top,sx=0.92,sy=1.12))
        else: ls.append(V('vsmug',Vx,top,rot=-4 if o>=21 else 0))
        hit=(Vx-8-LEAF_W/2+18,G-8)
        if 5<=o<=7: fly((Sx+8,Sy),hit,o,5,8,ls)
        elif o==8: ls.append(stone(hit[0],hit[1]+1,sx=1.45,sy=0.62))
        elif 9<=o<=18:
            x,y=arc(hit,(LAND[0],G-12),30,(o-8)/11.0); ls.append(stone(x,y,rot=-36*(o-8)))
        if o in (9,10,11): ls.append(shakes(Vx-8,G-24,LEAF_W+30,a=1.0-(o-9)*0.25))
        sh=landing(o,ls)
        fr.append((ls,sh))
    return fr
PILE_W=112
def pile(full=True): return S('rockpile' if full else 'rockpile2',246,G+2,PILE_W/SP['rockpile'].width)
def rock_tops():
    h=SP['rockpile'].height*PILE_W/SP['rockpile'].width
    return G+2-h*0.80, G+2-h*0.43     # the vulture's feet on the full pile, and on the pile without its top rock
# ROCK B: it bites the top rock off the pile and bats the stone, but CLANG: it buzzes, goes dizzy, drops the rock back.
def rockB(egg=False):
    layout(336,0.235,0.25); fr=[]; Vx=250; t1,t2=rock_tops(); D=KICK-3
    for f in range(STEPS_LR):
        o=f-D
        ls=[ground(), pile(full=(o<4 or o>=15))]
        if f<KICK: opening(f,Vx,t1,ls,egg); fr.append((ls,(0,0))); continue
        Sx,Sy=kick_after(o,ls,egg)
        jit=3 if o%2 else -3
        if o<4: ls.append(V('evempty',Vx,t1))
        elif o<5: v=V('evstand',Vx,t2,rot=-6,sx=1.05,sy=0.9); ls+=[v,*holdrock(v,32)]                   # grabs the top rock, plops down
        elif o<8: v=V('evrear',Vx,t2,rot=5 if o>=6 else 0); ls+=[v,*holdrock(v,32)]                    # rock up: ready
        elif o<9: v=V('evthrow',Vx,t2,rot=-8); ls+=[v,*holdrock(v,32), speed(Vx-6,t2-150,-120,w=46)]   # the swing
        elif o<12: v=V('evthrow',Vx+jit,t2,sx=1.04 if o%2 else 0.96); ls+=[v,*holdrock(v,32), shakes(Vx,t2-80,150)]   # CLANG: it buzzes
        elif o<15:
            v=V('vdizzy',Vx+jit,t2,sx=1.04 if o%2 else 0.96); ls+=[v, shakes(Vx,t2-80,150,a=0.8)]
            rx,ry=held(V('evthrow',Vx,t2)); ry+=10; t=(o-11)/4; ls.append(S('toprock',lerp(rx,Vx-6,t),lerp(ry,t1-8,ei(t)),32/SP['toprock'].width,rot=-30*(o-11),anchor='center'))  # the rock drops back
        elif o<16: ls.append(V('vdizzy',Vx,t1,sx=1.1,sy=0.88))                                         # lands back on the pile
        else: ls.append(V('vdizzy',Vx,t1,rot=6*math.sin((o-15)*0.6)))
        hit=held(V('evthrow',Vx,t2),26,6)
        if 5<=o<=7: fly((Sx+8,Sy),hit,o,5,8,ls)
        elif o==8: ls+= [burst(hit[0],hit[1],74), stone(hit[0]-4,hit[1]-2,sx=0.65,sy=1.4)]
        elif 9<=o<=18:
            x,y=arc((hit[0],hit[1]-6),(LAND[0],G-12),-30,(o-8)/11.0); ls.append(stone(x,max(24,y),rot=-40*(o-8)))
        sh=(4,0) if o==8 else landing(o,ls)
        fr.append((ls,sh))
    return fr
LINES={'kick':'The ostrich kicked the stone right back!','leaf':'The stone bounced off the leaf.','rock':'The vulture batted it away with a rock.',
       'trampoline':'The ostrich bounced it back off her leaf!'}
SCENES={}
for kind,fn in (('kick',kickback),('leaf',leafA),('rock',rockB)):
    SCENES['bounce-'+kind]=(lambda fn=fn: fn(False), LINES[kind])
    SCENES['bounce-'+kind+'-egg']=(lambda fn=fn: fn(True), LINES[kind])
SCENES['bounce-trampoline']=(trampoline, LINES['trampoline'])
KEYS={
 'kick':[(0,'vulture holds the stone'),(5,'rears back'),(8,'throws'),(12,'stone on its way; she winds up'),(16,'kicks it back'),(19,'hits it in the chest'),(21,'knocked off the edge'),(22,'THUNK on its old spot')],
 'trampoline':[(0,'vulture holds the stone'),(8,'throws'),(11,'she grabs the leaf'),(14,'pulls it taut'),(15,'the stone hits the leaf'),(16,'boing, straight back'),(19,'hits it in the chest'),(22,'THUNK; vulture gone')],
 'leaf':[(0,'vulture holds the stone'),(5,'rears back'),(8,'throws'),(12,'stone on its way; she winds up'),(16,'kicks it back'),(20,'stone hits the leaf'),(26,'boings over'),(37,'end: smug')],
 'rock':[(0,'vulture holds the stone'),(5,'rears back'),(8,'throws'),(12,'stone on its way; she winds up'),(16,'kicks it; it bites the top rock'),(20,'swings: CLANG'),(25,'dizzy; rock drops'),(37,'end: still dizzy')],
}
