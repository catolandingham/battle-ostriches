"""Egg smash 5a (Brian's pick, 2026-11-09) as layers, from build_egg5_v2.py frame_clean(mirror=False).
Same geometry as the approved clip, in its 720x960 art space, mapped onto the card; drawings are
the native-resolution poses plus redrawn-at-3x egg, shell halves, speed lines and impact rays.
Change from the clip: the fly-in starts with the vulture already inside the card (it used to start off the left edge)."""
import sys, math, json, numpy as np, cv2
from PIL import Image, ImageDraw
sys.path.insert(0,'/workspace/bw/scenes/art/moments-b/egg3/egg5')
import build_egg5_v2 as M
from spr import Sprite
SRC='/workspace/bw/scenes/rebuild/src/egg5a/'
AW,AH=M.ART_W,M.ART_H
F=297/720          # art -> 5a card (fit 720x960 into 319x396)
OX,OY=22.0,15.0    # art origin inside the card rect [24,174,341,426]
Q=3
def lerp(a,b,t): return a+(b-a)*t
# ---------- hi-res procedural drawings (same shapes as the clip, all sizes x Q) ----------
def egg_hi(cracked=False):
    w,h=300*Q,int(300*1.28)*Q; pad=12*Q
    im=Image.new('RGBA',(w+24*Q,h+24*Q),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.ellipse([pad,pad,w+pad,h+pad],fill=(255,255,255,255),outline=(0,0,0,255),width=9*Q)
    d.arc([pad+w*0.28,pad+h*0.18,pad+w*0.50,pad+h*0.38],start=210,end=310,fill=(0,0,0,255),width=6*Q)
    im=M.trim(im,4*Q)
    if cracked:
        d=ImageDraw.Draw(im); W_,H_=im.size; cx=W_//2; pts=[]; y=int(H_*0.05); x=cx; step=int(H_*0.10); i=0
        while y<int(H_*0.88):
            pts.append((x,y)); x=cx+(22*Q if i%2==0 else -22*Q); y+=step; i+=1
        pts.append((cx,int(H_*0.92)))
        d.line(pts,fill=(0,0,0,255),width=14*Q,joint='curve')
        d.line([(cx-6*Q,int(H_*0.35)),(cx-40*Q,int(H_*0.38))],fill=(0,0,0,255),width=6*Q)
        d.line([(cx+6*Q,int(H_*0.55)),(cx+42*Q,int(H_*0.52))],fill=(0,0,0,255),width=6*Q)
    return im
def halves_hi():
    im=Image.new('RGBA',(600*Q,400*Q),(0,0,0,0)); d=ImageDraw.Draw(im)
    left=[(40,40),(190,20),(215,95),(185,160),(220,230),(180,295),(210,360),(145,380),(30,320),(15,180),(25,80)]
    right=[(380,25),(540,50),(560,160),(535,270),(555,355),(410,380),(380,310),(410,245),(370,180),(405,100),(380,40)]
    puff=[(270,160),(295,140),(320,155),(330,185),(310,210),(285,215),(260,190)]
    for poly,wd in ((left,7),(right,7),(puff,5)):
        P=[(x*Q,y*Q) for x,y in poly]; d.polygon(P,fill=(255,255,255,255)); d.line(P+[P[0]],fill=(0,0,0,255),width=wd*Q,joint='curve')
    return M.trim(im,6*Q)
def save(im,name): p=SRC+name+'.png'; im.save(p); return p
def lines_draw(segs, box, Q2=6):
    """segs: [((x0,y0),(x1,y1),width)] in art px; box=(bx0,by0,bx1,by1) art px. returns (G,F) for Sprite.draw"""
    bx0,by0,bx1,by1=box; W,H=int((bx1-bx0)*Q2),int((by1-by0)*Q2); g=np.ones((H,W),np.float32)
    for (a,b,wd) in segs:
        cv2.line(g,(int((a[0]-bx0)*Q2),int((a[1]-by0)*Q2)),(int((b[0]-bx0)*Q2),int((b[1]-by0)*Q2)),0.0,max(1,int(wd*Q2)),cv2.LINE_AA)
    return g,(g<0.99).astype(np.uint8)
# ---------- build drawings ----------
def build(SP):
    def sp(name,src,**kw):
        if name not in SP: SP[name]=Sprite(name,src,**kw)
        return SP[name]
    P=M.POSES
    for k,f in (('evstand','stand_hold_v2'),('evrear','rear_v2'),('evthrow','throw_v2'),('evempty','stand_empty_v2')): sp(k,str(P/f'{f}.png'))
    stone=M.load_rgba_on_black(M.STONE); sp('estone',save(stone,'stone'),tone=True)
    fly=M.load_rgba_on_black(M.FLY); sp('efly',save(fly,'fly'))
    sp('eegg',save(egg_hi(),'egg')); sp('eeggc',save(egg_hi(True),'egg-cracked')); sp('ehalves',save(halves_hi(),'halves'))
    return stone,fly
# ---------- layout helpers (art px) ----------
def dims(w,h,mw,mh):
    im=Image.new('L',(w,h)); im.thumbnail((mw,mh)); return im.size
def at(cx,cy,w,h): return int(AW*cx-w/2), int(AH*cy-h/2)
def scene(SP):
    stone,fly=build(SP)
    egg1=M.make_plain_egg(300); eggc1=M.crack_egg(egg1,'single'); hal1=M.make_halves()
    st1=M.big_stone(stone,100)            # what the clip pastes (thumbnail never enlarges)
    fly_st=M.fly_with_stone(fly,stone)
    # where the fly and its stone sit inside fly_st
    f=M.fit(fly,520,380); c=Image.new('RGBA',(f.width+140,f.height+80)); c.alpha_composite(f,(20,40))
    st110=M.big_stone(stone,110); bxs=int(20+f.width*0.78); bys=int(40+f.height*0.44); c.alpha_composite(st110,(bxs-8,int(bys-st110.height*0.5)))
    a=np.array(c)[...,3]; ys,xs=np.where(a>10); tx0,ty0=max(0,xs.min()-2),max(0,ys.min()-2)
    assert (c.crop((tx0,ty0,xs.max()+3,ys.max()+3)).size==fly_st.size)
    def lay(name,X,Y,sw_art):   # sprite at art (X,Y) drawn sw_art art-px wide
        s=SP[name]; w,_=s.size(); k=sw_art/w
        return (name,OX+F*X,OY+F*Y,F*k,0.0,1.0)
    def fly_layers(mw,mh,cx,cy):
        fw,fh=dims(fly_st.width,fly_st.height,mw,mh); q=fw/fly_st.width; ax,ay=at(cx,cy,fw,fh)
        return [lay('efly',ax+(20-tx0)*q,ay+(40-ty0)*q,f.width*q),
                lay('estone',ax+(bxs-8-tx0)*q,ay+(int(bys-st110.height*0.5)-ty0)*q,st110.width*q)]
    def egg_layer(name,one,mw,mh,cx,cy):
        w,h=dims(one.width,one.height,mw,mh); ax,ay=at(cx,cy,w,h); return lay(name,ax,ay,w)
    ground=('eground',)
    gy=int(AH*0.84); gx0,gx1=int(AW*0.08),int(AW*0.92)
    if 'eground' not in SP:
        SP['eground']=Sprite('eground','proc:eground',draw=lambda: (lambda G,F_: (1-(1-G)*160/255,F_))(*lines_draw([((gx0,gy),(gx1,gy),3)],(gx0-4,gy-4,gx1+4,gy+4))),thr=0.75)
    GL=('eground',OX+F*(gx0-4),OY+F*(gy-4),F/6,0.0,1.0)
    def pose(name,mw,mh,cx,cy):
        s=SP[name]; w0,h0=s.size(); w,h=dims(w0,h0,mw,mh); ax,ay=at(cx,cy,w,h); return ax,ay,w,h
    def hold(name,fx,fy,mh,raise_y):
        img=Image.open(SP[name].src).convert('RGBA'); art=M.fit(img,360,mh)
        ax,ay=at(0.30,0.50-raise_y,art.width,art.height)
        x0,y0,x1,y1=M.content_bbox(art); tlx=x0+fx*(x1-x0); tly=y0+fy*(y1-y0); bx,by=ax+tlx,ay+tly
        q=art.width/img.width
        out=[lay(name,ax,ay,art.width),egg_layer('eegg',egg1,220,280,0.74,0.68)]
        out.append(lay('estone',int(bx-20),int(by-st1.height*0.52),st1.width))
        # the beak tip drawn again over the stone: the same crop of the native pose
        r0x,r0y,r1x,r1y=max(0,int(tlx)-28),max(0,int(tly)-22),min(art.width,int(tlx)+2),min(art.height,int(tly)+22)
        nx0,ny0,nx1,ny1=[int(round(v/q)) for v in (r0x,r0y,r1x,r1y)]
        tn=f'{name}tip'
        if tn not in SP: SP[tn]=Sprite(tn,SP[name].src,crop=(nx0,ny0,nx1,ny1))
        out.append(lay(tn,ax+nx0*q,ay+ny0*q,(nx1-nx0)*q))
        return out
    meta=M.META; frames=[]
    # fly-in start moved inside the card: ink at least 7 px inside the card edge
    def swoop_pos(t):
        return lerp(-0.12,0.30,M.ease_out(t)),lerp(0.08,0.48,M.ease_in_out(t))
    w0,h0=dims(fly_st.width,fly_st.height,int(500*1.05),int(360*1.05)); cx0,cy0=swoop_pos(0); ax0,ay0=at(cx0,cy0,w0,h0)
    a=np.array(fly_st)[...,3]; ys,xs=np.where(a>10); q0=w0/fly_st.width
    need_dx=max(0,-36-(ax0+xs.min()*q0)); need_dy=max(0,-20-(ay0+ys.min()*q0))
    for fi in range(30):
        L=[GL]
        if fi<=6:
            t=fi/6.0; cx,cy=swoop_pos(t); u=1-M.ease_out(t); v=1-M.ease_in_out(t)
            cx+=need_dx/AW*u; cy+=need_dy/AH*v
            L+=fly_layers(int(500*lerp(1.05,0.95,t)),int(360*lerp(1.05,0.95,t)),cx,cy)
            L.append(egg_layer('eegg',egg1,220,280,0.74,0.68))
        elif fi<=8:
            L+=fly_layers(460,340,0.30,lerp(0.48,0.52,min(1,fi-7))); L.append(egg_layer('eegg',egg1,220,280,0.74,0.68))
        elif fi<=11:
            L+=hold('evstand',meta['stand_fx'],meta['stand_fy'],520,0.0)
        elif fi<=14:
            L+=hold('evrear',meta['rear_fx'],meta['rear_fy'],560,lerp(0.0,0.04,M.ease_out((fi-11)/3.0)))
        elif fi<=19:
            t=(fi-15)/4.0
            nm,mw,mh,cyv=('evthrow',380,540,0.48) if fi<=16 else ('evempty',360,520,0.50)
            ax,ay,w,h=pose(nm,mw,mh,0.30,cyv); L.append(lay(nm,ax,ay,w)); L.append(egg_layer('eegg',egg1,220,280,0.74,0.68))
            rel=M.fit(Image.open(SP[nm].src).convert('RGBA'),mw,mh)
            fx=meta['throw_fx'] if fi<=16 else meta['stand_fx']; fy=meta['throw_fy'] if fi<=16 else meta['stand_fy']
            p0x,p0y=M.beak_xy_on_canvas(rel,int(AW*0.30-rel.width/2),int(AH*cyv-rel.height/2),fx,fy)
            p0=((p0x+25)/AW,p0y/AH); p1=(0.74,0.50); uu=M.ease_in(t)
            sx,sy=M.stone_arc(p0,p1,uu,arch=0.12); L.append(lay('estone',*at(sx,sy,st1.width,st1.height),st1.width))
            if t>0.08:
                pv=M.stone_arc(p0,p1,max(0,uu-0.16),arch=0.12)
                x0l,y0l,x1l,y1l=int(AW*pv[0]),int(AH*pv[1]),int(AW*sx),int(AH*sy)
                segs=[((x0l,y0l),(x1l,y1l),3),((x0l,y0l-4),(x1l,y1l-3),2)]
                box=(min(x0l,x1l)-6,min(y0l,y1l)-10,max(x0l,x1l)+6,max(y0l,y1l)+6); nm2=f'estreak{fi}'
                if nm2 not in SP: SP[nm2]=Sprite(nm2,'proc:'+nm2,draw=(lambda s=segs,b=box: lines_draw(s,b)))
                L.append((nm2,OX+F*box[0],OY+F*box[1],F/6,0.0,1.0))
        elif fi<=22:
            t=(fi-20)/2.0; ax,ay,w,h=pose('evempty',360,520,0.30,0.50); L.append(lay('evempty',ax,ay,w))
            L.append(egg_layer('eegg' if t<0.3 else 'eeggc',egg1,220,280,0.74,0.68))
            L.append(lay('estone',*at(0.74,0.50,st1.width,st1.height),st1.width))
            if t>=0.15:
                ex,ey=int(AW*0.74),int(AH*0.50)
                segs=[((ex,ey),(ex+int(40*math.cos(math.radians(g))),ey+int(40*math.sin(math.radians(g)))),4) for g in (15,55,100,160,210,260,310)]
                box=(ex-46,ey-46,ex+46,ey+46)
                if 'eimpact' not in SP: SP['eimpact']=Sprite('eimpact','proc:eimpact',draw=lambda s=segs,b=box: lines_draw(s,b))
                L.append(('eimpact',OX+F*box[0],OY+F*box[1],F/6,0.0,1.0))
        else:
            ax,ay,w,h=pose('evempty',360,520,0.30,0.50); L.append(lay('evempty',ax,ay,w))
            L.append(egg_layer('ehalves',hal1,400,280,0.74,0.74))
            L.append(lay('estone',*at(0.74,0.70,st1.width,st1.height),st1.width))
        frames.append(L)
    return frames
