import sys, os, json, math, numpy as np, cv2
sys.path.insert(0,'/workspace/bw/scenes/rebuild/tools')
import scenes as SC
CW,CH,DPR=336,412,3
def mapping(scene):
    x,y,w,h=SC.RECTS[scene]; k=min(CW/w,CH/h); return k,(CW-w*k)/2,(CH-h*k)/2
def to_canvas(scene, frames):
    k,ox,oy=mapping(scene); out=[]
    for ls in frames:
        out.append([(n,float(ox+k*x),float(oy+k*y),float(k*s),float(rot),float(a)) for (n,x,y,s,rot,a) in ls])
    return out
def need_widths(all_canvas):
    need={}
    for fr in all_canvas:
        for ls in fr:
            for (n,X,Y,S,rot,a) in ls:
                sw,sh=SC.SP[n].size(); need[n]=max(need.get(n,0),math.ceil(sw*S*DPR))
    return need
_mcache={}
def master(n,w):
    if (n,w) not in _mcache: _mcache[(n,w)]=SC.SP[n].master(w)
    return _mcache[(n,w)]
def draw_layer(out, m, X, Y, W, H, rot, a, dpr=DPR):
    """out: float gray HxW (1=white). m: RGBA master. place at CSS (X,Y) size (W,H), rot ccw deg about center."""
    tw,th=max(1,int(round(W*dpr))),max(1,int(round(H*dpr)))
    A=m[...,3].astype(np.float32)/255; C=m[...,0].astype(np.float32)/255; P=C*A
    interp=cv2.INTER_AREA if tw<m.shape[1] else cv2.INTER_CUBIC
    A2=cv2.resize(A,(tw,th),interpolation=interp); P2=cv2.resize(P,(tw,th),interpolation=interp)
    # affine from resized sprite pixel to output pixel (subpixel position, rotation about center)
    cx,cy=(X+W/2)*dpr,(Y+H/2)*dpr
    th_=math.radians(rot); c,s=math.cos(th_),math.sin(th_)
    # CCW visual rotation in y-down coords: x' = c*x + s*y, y' = -s*x + c*y
    sx,sy=W*dpr/tw,H*dpr/th
    Mx=np.float32([[c*sx, s*sy, 0],[-s*sx, c*sy, 0]])
    off=np.array([tw/2,th/2]); Mx[:,2]=np.array([cx,cy])-Mx[:,:2]@off
    Hh,Ww=out.shape
    Aw=cv2.warpAffine(np.clip(A2,0,1),Mx,(Ww,Hh),flags=cv2.INTER_LINEAR,borderValue=0)
    Pw=cv2.warpAffine(np.clip(P2,0,1),Mx,(Ww,Hh),flags=cv2.INTER_LINEAR,borderValue=0)
    out*= (1-a*Aw); out+= a*Pw
def render_frame(ls, widths, dpr=DPR):
    out=np.ones((int(CH*dpr),int(CW*dpr)),np.float32)
    for (n,X,Y,S,rot,a) in ls:
        sw,sh=SC.SP[n].size(); m=master(n,widths[n])
        draw_layer(out,m,X,Y,sw*S,sh*S,rot,a,dpr)
    return out
def ink_bbox(n):
    g,F=SC.SP[n].base(); ys,xs=np.where(g<0.75)
    return xs.min(),ys.min(),xs.max()+1,ys.max()+1
def bounds_report(scene, canvas, margin=2.0):
    bad=[]
    for fi,ls in enumerate(canvas):
        for (n,X,Y,S,rot,a) in ls:
            if n=='ground': continue
            x0,y0,x1,y1=ink_bbox(n); sw,sh=SC.SP[n].size()
            pts=np.array([[x0,y0],[x1,y0],[x0,y1],[x1,y1]],np.float32)*S
            cx,cy=sw*S/2,sh*S/2; th=math.radians(rot); c,s=math.cos(th),math.sin(th)
            q=[(X+cx+c*(px-cx)+s*(py-cy), Y+cy-s*(px-cx)+c*(py-cy)) for px,py in pts]
            qx=[p[0] for p in q]; qy=[p[1] for p in q]
            if min(qx)<margin or min(qy)<margin or max(qx)>CW-margin or max(qy)>CH-margin:
                bad.append((fi,n,round(float(min(qx)),1),round(float(min(qy)),1),round(float(max(qx)),1),round(float(max(qy)),1)))
    return bad
