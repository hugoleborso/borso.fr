import re,sys
def parse(path):
    t=open(path).read(); out={}
    for m in re.finditer(r'--color-([\w-]+):\s*(?:light-dark\((#[0-9a-fA-F]+),\s*(#[0-9a-fA-F]+)\)|(#[0-9a-fA-F]+))',t):
        n=m.group(1)
        if m.group(4): out[n]=(m.group(4),m.group(4))
        else: out[n]=(m.group(2),m.group(3))
    return out
def rgba(h):
    h=h.lstrip('#')
    if len(h)==3: h=''.join(c*2 for c in h)
    r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    a=int(h[6:8],16)/255 if len(h)==8 else 1
    return r,g,b,a
def over(fg,bg):
    r,g,b,a=fg; R,G,B,_=bg
    return (r*a+R*(1-a),g*a+G*(1-a),b*a+B*(1-a),1)
def lum(c):
    f=lambda v: v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def ratio(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)
def resolve(tok,mode,name):
    layers=name.split('/')  # fg on bg1/bg2 stacking: "fill/surface"
    i=0 if mode=='light' else 1
    col=None
    for n in reversed(layers):
        c=rgba(tok[n][i]) if n in tok else rgba(n)
        col=c if col is None else over(c,col)
    return col
path=sys.argv[1]; tok=parse(path)
for line in sys.argv[2:]:
    fg,bg=line.split(' on ')
    vals=[]
    for mode in ('light','dark'):
        b=resolve(tok,mode,bg); f=resolve(tok,mode,fg+'/'+bg) if '#' not in fg and tok.get(fg,('',''))[0 if mode=='light' else 1].__len__()==9 else resolve(tok,mode,fg)
        if len(rgba(tok[fg][0 if mode=='light' else 1]) if fg in tok else rgba(fg))==4 and (rgba(tok[fg][0 if mode=='light' else 1]) if fg in tok else rgba(fg))[3]<1:
            f=over(rgba(tok[fg][0 if mode=='light' else 1]),b)
        else:
            f=rgba(tok[fg][0 if mode=='light' else 1]) if fg in tok else rgba(fg)
        vals.append(ratio(f,b))
    print(f"{line:42s} {vals[0]:6.2f} {vals[1]:6.2f}")
