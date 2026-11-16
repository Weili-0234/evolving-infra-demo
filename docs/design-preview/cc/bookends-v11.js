(() => {
  'use strict';
  const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search);
  // v11 (2026-11-16): v10 + sentence-screen option A (user choice): icon kept and glided into a lockup with the left-aligned
  // sentence; "life" breathes + orbit dot pulses on D3; gear quarter turn + "evolves" glow on D3+2 beats; background band
  // cross-faded into the title-card gradient during the institutions fade. Options B/C remain available via ?opt=B|C.
  // v10 (2026-11-16): v9 with the institutions hold one bar shorter: fade from D2+3 beats (was D3+3), sentence on D3 / D3+2
  // beats, title card on D5 (lines on D5+1, +2, +3 beats). Everything else as v9: frame 0 = wordmark; it shrinks under the icon
  // from b1 while the vector gear-and-orbit icon grows in and the dot lands on D0; glide up D0+3 beats..D1; the two labs on D1
  // (MIT HAN Lab; Sky Computing Lab with the official sky logo), Georgia Tech / UIUC / NVIDIA / OpenAI on D1+1 beat. End card 7.8 s.
  // Music times are measured onsets of the source track (onsets.py); the music starts PAD s into the video; events snap to frames.
  // ?scene=poster: title card image (?poster=<png>) with the icon + wordmark; ?scene=iconcheck: icon alone at 177x120.
  const FPS=30,BEAT=.59897,PAD=.0206;
  const MUSIC={b1:.703,D0:1.9196,D0b3:3.7227,D1:4.3172,D1b1:4.9251,D2b3:8.5231,D3:9.118,D3b2:10.3182,D5:13.9168,D5b1:14.523,D5b2:15.1172,D5b3:15.7212};
  const fr=k=>Math.round((MUSIC[k]+PAD)*FPS);const F={};for(const k in MUSIC)F[k]=fr(k);
  const TOTAL={intro:(F.D5+16)/FPS,end:7.8,poster:0,iconcheck:0};
  const at=f=>f/FPS,pre=f=>(f-1)/FPS;                       // a ramp starting at pre(f) shows its first change on frame f
  const T={word:[pre(F.b1),pre(F.b1)+.85],gearIn:[pre(F.b1+14),at(F.D0)],comet:[pre(F.b1+16),at(F.D0)],land:at(F.D0)-.001,glide:[pre(F.D0b3),at(F.D1)],
    tier1:pre(F.D1),tier2:pre(F.D1b1),rise:.4,stagger:2/FPS,out:[pre(F.D2b3),at(F.D3)-.13],tagIn:[at(F.D3)-.12,at(F.D3)],subIn:[at(F.D3b2)-.12,at(F.D3b2)],
    fromImg:[0,.1],endIn:[.1,.6],endOut:[7.2,7.8]};
  // ---- icon geometry (icon_fit3.py, raster pixel units; y down; teeth/body angles in degrees, t* ellipse parameters in radians).
  // The orbit band lies between an outer and an inner ellipse (suffix o / i); ex, ey, rho: their mean, whose major axis splits front/back.
  const IC={"gx":88.4959,"gy":62.1932,"phase":-0.071,"Rt":57.0857,"Rb":46.5662,"k":0.0567,"phib":0.1168,"hb":12.1847,"ht":8.0553,"Rh":20.3694,"exo":88.644,"eyo":62.1836,"Ao":97.4,"Bo":38.3703,"rhoo":151.9549,"exi":88.5423,"eyi":61.8737,"Ai":89.344,"Bi":30.6966,"rhoi":151.9723,"ex":88.5931,"ey":62.0287,"rho":151.9636,"t0o":2.1812,"t0i":2.2624,"t1o":7.2495,"t1i":7.1374,"td":2.7112,"rd":8.8862,"dn":-0.5515,"g":3.6634,"front_sign":-1.0,"red":[165.0,44.0,37.0],"gray":[140.0,140.0,140.0],"size":[177,120]};
  const ICON={cx:960,cy:375.5,S:1.6,lift:133};               // gear centre (after the glide), scale (icon 283 x 192 px), glide distance
  const OMEGA=45/(4*BEAT),SPIN=60,ORBIT=2*Math.PI/(4*4*BEAT),ORAMP=2*BEAT;   // deg/s (one tooth per bar), extra spin-in, rad/s (one turn per 4 bars)
  const easeIn=x=>Math.pow(clampG(x,0,1),3);function clampG(x,a,b){return Math.max(a,Math.min(b,x));}
  const film=qs.has('film');if(film)document.body.classList.add('export');
  let scene=['end','poster','iconcheck'].includes(qs.get('scene'))?qs.get('scene'):'intro',time=Math.max(0,Number(qs.get('t'))||0),playing=!film,last=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ramp=(t,[a,b])=>clamp((t-a)/(b-a),0,1);
  const ease=x=>{x=clamp(x,0,1);return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;},easeOut=x=>1-Math.pow(1-clamp(x,0,1),3);
  const smooth=x=>{x=clamp(x,0,1);return x*x*x*(x*(6*x-15)+10);};
  const mix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k)),rgb=c=>'rgb('+c.join(',')+')';
  // ---- icon drawing: back orbit, gear (knocked out by the front orbit dilated by g), front orbit; the split is the major axis
  function ell1(e,t){const r=IC['rho'+e]*Math.PI/180,c=Math.cos(r),s=Math.sin(r),u=IC['A'+e]*Math.cos(t),w=IC['B'+e]*Math.sin(t);
    return [IC['ex'+e]+u*c-w*s,IC['ey'+e]+u*s+w*c];}
  function ell(t){const [xo,yo]=ell1('o',t),[xi,yi]=ell1('i',t),nl=Math.hypot(xo-xi,yo-yi);   // centre line and outward unit normal
    return [(xo+xi)/2,(yo+yi)/2,(xo-xi)/nl,(yo-yi)/nl];}
  function bandPoly(a,sig){        // a >= 0: the nose end (and dot) runs a radians behind its rest place; sig: whole comet moved by -sig
    const N=220,pts=[],o0=IC.t0o+a-sig,o1=IC.t1o-sig,i0=IC.t0i+a-sig,i1=IC.t1i-sig;
    for(let k=0;k<=N;k++)pts.push(ell1('o',o0+(o1-o0)*k/N));
    for(let k=N;k>=0;k--)pts.push(ell1('i',i0+(i1-i0)*k/N));
    return pts;}
  function dotPos(a,sig){const [x,y,nx,ny]=ell(IC.td+a-sig);return [x+nx*IC.dn,y+ny*IC.dn];}
  function gearPolys(rot){
    const out=[],body=[];
    for(let k=0;k<720;k++){const th=k*.5,x=(((th-IC.phase-rot-IC.phib)%45)+45)%45-22.5,r=IC.Rb*Math.pow(1/Math.cos(x*Math.PI/180),IC.k);
      body.push([IC.gx+r*Math.cos(th*Math.PI/180),IC.gy+r*Math.sin(th*Math.PI/180)]);}
    out.push(body);
    for(let j=0;j<8;j++){const a=(IC.phase+rot+45*j)*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),vx=-uy,vy=ux,ub=IC.Rb*.7;
      out.push([[ub,-IC.hb],[IC.Rt,-IC.ht],[IC.Rt,IC.ht],[ub,IC.hb]].map(([u,v])=>[IC.gx+u*ux+v*vx,IC.gy+u*uy+v*vy]));}
    return out;}
  const area=p=>{let s=0;for(let i=0;i<p.length;i++){const [x0,y0]=p[i],[x1,y1]=p[(i+1)%p.length];s+=x0*y1-x1*y0;}return s/2;};
  function polyPath(c,polys){for(const p of polys){c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);c.closePath();}}
  function cometPath(c,band,dot,r){c.beginPath();polyPath(c,[band]);if(r>0){c.moveTo(dot[0]+r,dot[1]);c.arc(dot[0],dot[1],r,0,2*Math.PI,area(band)<0);c.closePath();}}
  function halfPlane(c,sign,over=0){   // over > 0 moves the edge that far into the other half (the back layer overlaps under the front: no seam)
    const cc=Math.cos(IC.rho*Math.PI/180),s=Math.sin(IC.rho*Math.PI/180),L=2000,nx=-s*IC.front_sign*sign,ny=cc*IC.front_sign*sign,X=IC.ex-over*nx,Y=IC.ey-over*ny;
    c.beginPath();c.moveTo(X-L*cc,Y-L*s);c.lineTo(X+L*cc,Y+L*s);c.lineTo(X+L*cc+L*nx,Y+L*s+L*ny);c.lineTo(X-L*cc+L*nx,Y-L*s+L*ny);c.closePath();c.clip();}
  const layers=new Map();
  function layer(w,h,k){const key=w+'x'+h+k;if(!layers.has(key)){const cv=document.createElement('canvas');cv.width=w;cv.height=h;layers.set(key,cv.getContext('2d'));}return layers.get(key);}
  const RED=()=>'rgb('+IC.red.map(Math.round).join(',')+')',GRAYC=()=>'rgb('+IC.gray.map(Math.round).join(',')+')';
  function drawIcon(ctx,o){
    // o: ox,oy (gear centre on the canvas), S; rot (deg), gearScale, gearAlpha; a, sig, cometAlpha, dotScale; ripple {r, alpha}
    const w=ctx.canvas.width,h=ctx.canvas.height,G=layer(w,h,'g'),Fr=layer(w,h,'f'),Bk=layer(w,h,'b');
    const band=bandPoly(o.a||0,o.sig||0),dot=dotPos(o.a||0,o.sig||0),rd=IC.rd*(o.dotScale??1),gp=gearPolys(o.rot||0),gs=o.gearScale??1;
    const base=c=>{c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.setTransform(o.S,0,0,o.S,o.ox-o.S*IC.gx,o.oy-o.S*IC.gy);};
    const gearT=c=>{c.translate(IC.gx,IC.gy);c.scale(gs,gs);c.translate(-IC.gx,-IC.gy);};
    // gear: body + teeth (one nonzero path), hole cut out, then the front orbit dilated by g cut out
    base(G);G.save();gearT(G);G.beginPath();polyPath(G,gp);G.fillStyle=GRAYC();G.fill('nonzero');
    G.globalCompositeOperation='destination-out';G.beginPath();G.arc(IC.gx,IC.gy,IC.Rh,0,2*Math.PI);G.fill();G.restore();
    if((o.cometAlpha??1)>0){G.save();G.globalCompositeOperation='destination-out';halfPlane(G,1);cometPath(G,band,dot,rd);G.fill('nonzero');
      G.lineWidth=2*IC.g;G.lineJoin='round';G.stroke();G.restore();}
    // front orbit
    base(Fr);Fr.save();halfPlane(Fr,1);cometPath(Fr,band,dot,rd);Fr.fillStyle=RED();Fr.fill('nonzero');Fr.restore();
    // back orbit, with the gear dilated by g cut out
    base(Bk);Bk.save();halfPlane(Bk,-1,1.5);cometPath(Bk,band,dot,rd);Bk.fillStyle=RED();Bk.fill('nonzero');Bk.restore();
    if((o.gearAlpha??1)>0){Bk.save();Bk.globalCompositeOperation='destination-out';Bk.globalAlpha=o.gearAlpha??1;gearT(Bk);Bk.beginPath();polyPath(Bk,gp);Bk.fill('nonzero');
      Bk.lineWidth=2*IC.g;Bk.lineJoin='round';Bk.stroke();Bk.restore();}
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha=o.cometAlpha??1;ctx.drawImage(Bk.canvas,0,0);ctx.globalAlpha=o.gearAlpha??1;ctx.drawImage(G.canvas,0,0);
    ctx.globalAlpha=o.cometAlpha??1;ctx.drawImage(Fr.canvas,0,0);ctx.restore();
    if(o.ripple&&o.ripple.alpha>0){ctx.save();ctx.setTransform(o.S,0,0,o.S,o.ox-o.S*IC.gx,o.oy-o.S*IC.gy);ctx.beginPath();ctx.arc(dot[0],dot[1],o.ripple.r,0,2*Math.PI);
      ctx.strokeStyle=RED();ctx.globalAlpha=o.ripple.alpha;ctx.lineWidth=1.1;ctx.stroke();ctx.restore();}
  }
  function iconState(t){             // opening timeline of the icon (stage coordinates)
    const tl=T.land,u=ramp(t,T.gearIn),rot=-OMEGA*(t-tl)+(t<tl?SPIN*Math.pow(1-u,3):0);
    const a0=IC.t1i-IC.td-.05,uc=ramp(t,T.comet),a=t<tl?a0*(1-smooth(uc)):0;
    const tau=Math.max(0,t-tl),sig=ORBIT*(tau<ORAMP?Math.pow(tau,3)/ORAMP**2-Math.pow(tau,4)/(2*ORAMP**3):tau-ORAMP/2);
    const pop=t<tl?0:Math.exp(-(t-tl)/.15),rp=t<tl?-1:(t-tl)/.6;
    return {ox:ICON.cx,oy:ICON.cy+ICON.lift*(1-ease(ramp(t,T.glide))),S:ICON.S,rot,gearScale:.55+.45*easeOut(u),gearAlpha:easeOut(clamp((t-T.gearIn[0])/.4,0,1)),
      a,sig,cometAlpha:clamp((t-T.comet[0])/.15,0,1),dotScale:1+.3*pop,
      ripple:rp>=0&&rp<1?{r:IC.rd*(1.15+1.8*easeOut(rp)),alpha:.55*Math.pow(1-rp,2)}:null};
  }
  if(qs.get('bg')){$('bg').src=qs.get('bg');$('bg').style.display='block';}if(qs.get('from'))$('from').src=qs.get('from');if(qs.get('poster'))$('poster-bg').src=qs.get('poster');
  const chips=[...$('tier1').children,...$('tier2').children];

  // ---- v11 tagline options (?opt=A|B|C). Timeline unchanged from v10: line 1 full on D3, line 2 full on D3+2 beats, title
  // card dissolves in on D5. The band of old frame 0 (?bg) cross-fades into the smooth title-card gradient (?grad) while the
  // institutions fade out, so the sentence screen and the title card share one background.
  const OPT=(qs.get('opt')||'A').toUpperCase();
  $('grad').src=qs.get('grad')||'v11-grad.png';$('grad').style.display='block';
  if(OPT==='A')$('lockA').style.display='block';
  if(OPT==='C'){$('c1').style.display='block';$('c2').style.display='block';}
  const bf=k=>Math.round((MUSIC.D3+k*BEAT+PAD)*FPS);
  const O={glideA:[pre(F.D2b3),T.out[1]],   // v11: the glide ends with the institutions fade (4 frames before D3), so the icon is at rest when the dot pulses on D3
    breathe:[pre(F.D3),pre(F.D3)+BEAT],turn:[pre(F.D3b2),pre(F.D3b2)+BEAT],
    lineIn:[pre(F.D2b3),at(F.D3)],blip:[pre(F.D3),pre(F.D3)+BEAT],morph:[pre(F.D3b2),pre(F.D3b2)+BEAT],
    draw:[pre(F.D3),pre(F.D3)+.45],evolve:[pre(F.D3b2),pre(F.D3b2)+BEAT]};
  const bump=x=>x<=0||x>=1?0:Math.sin(Math.PI*x),REDC=[201,35,54],rgba=(c,a)=>'rgba('+c.join(',')+','+a.toFixed(4)+')';
  const entr=(t,[a,b])=>easeIn((t-a)/(b-a));
  // A: icon + left-aligned two-line text as one lockup centred on the screen
  const LA={S:1.25,gap:56,top:449,h:87+24+71};
  function lockA(){const w=$('lockA').offsetWidth,iw=IC.size[0]*LA.S,ih=IC.size[1]*LA.S,x0=Math.round((1920-(iw+LA.gap+w))/2);
    $('lockA').style.left=Math.round(x0+iw+LA.gap)+'px';const cy=LA.top+LA.h/2;
    return {ox:x0+LA.S*IC.gx,oy:cy-ih/2+LA.S*IC.gy,box:[x0,Math.round(cy-ih/2),Math.round(x0+iw),Math.round(cy+ih/2)],text:[Math.round(x0+iw+LA.gap),LA.top,Math.round(x0+iw+LA.gap+w),LA.top+LA.h]};}
  function iconA(t){const L=lockA(),g=ease(ramp(t,O.glideA)),st=iconState(t);
    st.ox+=(L.ox-st.ox)*g;st.oy+=(L.oy-st.oy)*g;st.S+=(LA.S-st.S)*g;     // from the opening position (incl. the early glide-up)
    const tp=t-O.breathe[0];if(tp>0)st.dotScale=(st.dotScale||1)*(1+.45*Math.exp(-tp/.2));   // v11: dot pops on D3 (as on D0), then settles
    const rp=(t-O.breathe[0])/.7;if(rp>=0&&rp<1)st.ripple={r:IC.rd*(1.15+2.4*easeOut(rp)),alpha:.65*Math.pow(1-rp,2)};
    st.rot+=-90*easeOut(ramp(t,O.turn));return st;}
  function renderA(t){
    const ta=entr(t,T.tagIn),sa=entr(t,T.subIn);
    $('a1').style.opacity=ta;$('a1').style.transform='translateY('+((1-ta)*8).toFixed(2)+'px)';
    $('a2').style.opacity=sa;$('a2').style.transform='translateY('+((1-sa)*6).toFixed(2)+'px)';
    const b=bump(ramp(t,O.breathe));$('lifeA').style.transform='scale('+(1+.05*b).toFixed(5)+')';
    $('lifeA').style.textShadow=b>0?'0 0 '+(10+18*b).toFixed(1)+'px '+rgba(REDC,.95*b)+', 0 0 '+(4*b).toFixed(1)+'px '+rgba(REDC,.8*b):'none';
    const e=bump(ramp(t,O.turn));$('evoA').style.textShadow=e>0?'0 0 '+(8+12*e).toFixed(1)+'px '+rgba(REDC,.7*e):'none';
  }
  // B: thin line under the text: flat gray -> heartbeat blip (D3) -> drifting workload curve (D3+2 beats)
  const yB=()=>$('subline').offsetTop+$('subline').offsetHeight+60;
  function ecg(d){if(d<-90||d>50)return 0;if(d<-60)return 8*Math.sin(Math.PI*(d+90)/30);if(d<-40)return 0;if(d<-32)return -10*Math.sin(Math.PI*(d+40)/8);
    if(d<-16)return 56*(1-Math.abs(d+24)/8);if(d<-6)return -18*Math.sin(Math.PI*(d+16)/10);if(d<10)return 0;return 14*Math.sin(Math.PI*(d-10)/40);}
  const wave=(x,t)=>.5+.5*(.55*Math.sin(2*Math.PI*x/980+.9+.55*t)+.30*Math.sin(2*Math.PI*x/470+2.1-.8*t)+.15*Math.sin(2*Math.PI*x/210+.4+1.3*t));
  const XB=[120,2000];
  function renderB(t){
    const c=$('fx').getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,1920,1080);
    const a=ease(ramp(t,O.lineIn));if(a<=0)return;
    const y0=yB(),half=960*a,xL=960-half,xR=960+half,k=easeOut(ramp(t,O.morph)),ub=(t-O.blip[0])/BEAT,xp=XB[0]+(XB[1]-XB[0])*ub,bon=ub>0&&ub<1.6;
    const pts=[];for(let x=xL;x<=xR+.01;x+=3){const yc=y0+12-64*wave(x,t);pts.push([x,y0+(yc-y0)*k-(bon?ecg(x-xp):0)*(1-k)]);}
    const path=()=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));};
    if(k>0){path();c.lineTo(xR,1080);c.lineTo(xL,1080);c.closePath();const g=c.createLinearGradient(0,y0-60,0,y0+220);
      g.addColorStop(0,rgba(REDC,.22*k));g.addColorStop(1,rgba(REDC,0));c.fillStyle=g;c.fill();}
    const gray=[140,140,140],col=gray.map((v,i)=>Math.round(v+(REDC[i]-v)*k));
    path();c.lineWidth=2+.6*k;c.lineJoin='round';c.strokeStyle=rgba(col,.75+.2*k);c.stroke();
    if(bon&&k<1){const fade=ub<1?1:1-(ub-1)/.6,g=c.createLinearGradient(xp-420,0,xp+60,0);
      g.addColorStop(0,rgba(REDC,0));g.addColorStop(.79,rgba(REDC,fade));g.addColorStop(.98,rgba(REDC,fade));g.addColorStop(1,rgba(REDC,0));
      c.save();c.shadowColor=rgba(REDC,.8*fade);c.shadowBlur=14;path();c.lineWidth=3;c.strokeStyle=g;c.stroke();c.restore();}
    c.save();c.globalCompositeOperation='destination-in';const m=c.createLinearGradient(0,0,1920,0);
    m.addColorStop(0,'rgba(0,0,0,0)');m.addColorStop(.11,'rgba(0,0,0,1)');m.addColorStop(.89,'rgba(0,0,0,1)');m.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=m;c.fillRect(0,0,1920,1080);c.restore();
  }
  // C: kinetic type, both lines 72 px; "life" draws in with a red glow (D3); "evolves" gray monospace -> red humanist (D3+2 beats)
  function renderC(t){
    const ta=entr(t,T.tagIn),sa=entr(t,T.subIn);
    $('c1').style.opacity=ta;$('c1').style.transform='translateY('+((1-ta)*8).toFixed(2)+'px)';
    $('c2').style.opacity=sa;$('c2').style.transform='translateY('+((1-sa)*6).toFixed(2)+'px)';
    const u=easeOut(ramp(t,O.draw)),P=-14+128*u,mk='linear-gradient(90deg,#000 '+(P-14).toFixed(2)+'%,transparent '+P.toFixed(2)+'%)',L=$('lifeC');
    L.style.webkitMaskImage=mk;L.style.maskImage=mk;
    const ga=t<O.draw[0]?0:(.35+.55*Math.exp(-Math.max(0,t-O.draw[1])/.5))*u;
    L.style.textShadow=ga>0?'0 0 22px '+rgba(REDC,ga)+', 0 0 6px '+rgba(REDC,.6*ga):'none';
    const k=easeOut(ramp(t,O.evolve)),M=$('evoM'),S_=$('evoS');
    S_.style.letterSpacing='0em';S_.style.fontWeight='600';const wS=S_.offsetWidth,wM=M.offsetWidth;
    $('slotC').style.width=(wM+(wS-wM)*k).toFixed(2)+'px';
    M.style.opacity=(1-k).toFixed(4);M.style.transform='translateX(-50%) scaleX('+(1-.12*k).toFixed(4)+')';M.style.filter='blur('+(3*k).toFixed(2)+'px)';
    M.firstElementChild.style.letterSpacing=(-.06*k).toFixed(4)+'em';
    S_.style.opacity=k.toFixed(4);S_.style.letterSpacing=(.22*(1-k)).toFixed(4)+'em';S_.style.fontWeight=String(Math.round(300+300*k));
    S_.style.color=rgb(mix([140,146,156],REDC,k));S_.style.transform='translateX(-50%)';S_.style.filter='blur('+(3*(1-k)).toFixed(2)+'px)';
  }
  function optPlan(){
    const r=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)];};
    const ev=[];
    if(OPT==='A'){const L=lockA();ev.push({name:'icon glides to the left of the text (chips and wordmark fade)',frame:F.D2b3,target:'D2+3 beats',roi:[860,250,1060,500]},
      {name:'line 1 full; "life" breathes (scale 1.05, red glow) and the orbit dot pulses',frame:F.D3,target:'D3',roi:L.text},
      {name:'line 2 full; gear turns a quarter turn; "evolves" glows',frame:F.D3b2,target:'D3+2 beats',roi:L.box});}
    if(OPT==='B'){const y=yB();ev.push({name:'flat gray line starts to draw out from the centre',frame:F.D2b3,target:'D2+3 beats',roi:[860,y-8,1060,y+8]},
      {name:'line 1 full; red heartbeat blip starts left -> right',frame:F.D3,target:'D3',roi:[160,y-70,620,y+30]},
      {name:'line 2 full; line starts to morph into the workload curve',frame:F.D3b2,target:'D3+2 beats',roi:[300,y-70,1620,y+30]});}
    if(OPT==='C'){ev.push({name:'line 1 full; "life" starts to draw in with a red glow',frame:F.D3,target:'D3',roi:r($('lifeC'))},
      {name:'line 2 full with "evolves" in gray monospace; morph to red humanist over one beat',frame:F.D3b2,target:'D3+2 beats',roi:r($('slotC'))});}
    return {opt:OPT,frames:{D2b3:F.D2b3,D3:F.D3,D3b1:bf(1),D3b2:F.D3b2,D3b3:bf(3),D5:F.D5},events:ev,
      boxes:{a:OPT==='A'?lockA():null,yB:OPT==='B'?yB():null}};
  }
  function renderIntro(t){
    const gl=1-ease(ramp(t,T.glide)),out=ramp(t,T.out);
    // wordmark: 96 px centred on y 540 -> half size under the icon (y 513 + glide offset); ease-out so it starts visibly on b1
    const w=easeOut(ramp(t,T.word)),sc=1-.5*w,wy=(513+ICON.lift*gl-540)*w;
    $('wordmark').style.transform='translateY('+wy.toFixed(2)+'px) scale('+sc.toFixed(5)+')';$('wordmark').style.opacity=(1-out).toFixed(4);
    const ic=$('icon'),c=ic.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,ic.width,ic.height);
    ic.style.opacity=(OPT==='A'?1:1-out).toFixed(4);if(OPT==='A'){if(t>=T.gearIn[0])drawIcon(c,iconA(t));}else if(t>=T.gearIn[0]&&out<1)drawIcon(c,iconState(t));
    $('grad').style.opacity=ease(out).toFixed(4);
    // institutions: the two labs on D1, the other four on D1+1 beat (2 frames apart); fade + 14-px rise over 0.4 s
    chips.forEach((ch,i)=>{const t0=i<2?T.tier1:T.tier2+(i-2)*T.stagger,u=easeOut((t-t0)/T.rise);
      ch.style.opacity=(t<t0?0:u*(1-out)).toFixed(4);ch.style.transform='translateY('+((1-(t<t0?0:u))*14).toFixed(2)+'px)';});
    const ta=easeIn((t-T.tagIn[0])/(T.tagIn[1]-T.tagIn[0]));$('tagline').style.opacity=ta;$('tagline').style.transform='translateY('+((1-ta)*8).toFixed(2)+'px)';
    const sa=easeIn((t-T.subIn[0])/(T.subIn[1]-T.subIn[0]));$('subline').style.opacity=sa;$('subline').style.transform='translateY('+((1-sa)*6).toFixed(2)+'px)';
    if(OPT==='A'||OPT==='C'){$('tagline').style.opacity=0;$('subline').style.opacity=0;}
    if(OPT==='A')renderA(t);else if(OPT==='B')renderB(t);else if(OPT==='C')renderC(t);
    $('black').style.opacity=0;
  }
  function renderEnd(t){
    $('from').style.opacity=$('from').getAttribute('src')?1-ease(ramp(t,T.fromImg)):0;
    $('black').style.opacity=1-ease(ramp(t,T.endIn))*(1-ease(ramp(t,T.endOut)));
  }
  function renderStatic(id,S){const cv=$(id),c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);
    drawIcon(c,{ox:(cv.width-IC.size[0]*S)/2+S*IC.gx,oy:(cv.height-IC.size[1]*S)/2+S*IC.gy,S});}
  function render(){
    for(const s of ['intro','end','poster','iconcheck'])$(s).style.visibility=scene===s?'visible':'hidden';
    $('from').style.visibility=scene==='end'?'visible':'hidden';
    if(scene==='iconcheck'){$('stage').style.background=qs.get('checkbg')||'#0a0c10';$('black').style.opacity=0;renderStatic('check-icon',1);}
    else if(scene==='intro')renderIntro(time);else if(scene==='end')renderEnd(time);else{$('black').style.opacity=0;renderStatic('poster-icon',96/120);}
    if(!film){$('seek').max=String(TOTAL[scene]);$('seek').value=String(time);$('clock').textContent=time.toFixed(1)+' s';}
  }
  function resize(){if(film)return;const s=$('wrap').clientWidth/1920;$('stage').style.transform='scale('+s+')';}
  function seek(t){time=clamp(Number(t)||0,0,TOTAL[scene]);render();}
  function setScene(s){scene=s;document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===s)));seek(0);}
  function setPlaying(v){playing=v;last=null;$('play').textContent=v?'Pause':'Play';}
  function tick(now){if(playing){if(last!==null){time+=(now-last)/1000;if(time>TOTAL[scene])time=0;render();}last=now;}requestAnimationFrame(tick);}
  $('play').addEventListener('click',()=>setPlaying(!playing));
  $('seek').addEventListener('input',e=>{setPlaying(false);seek(e.target.value);});
  document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>{setScene(b.dataset.scene);setPlaying(true);const url=new URL(location.href);url.searchParams.set('scene',scene);history.replaceState(null,'',url);}));
  new ResizeObserver(resize).observe($('wrap'));addEventListener('resize',resize);
  setScene(scene);time=Math.max(0,Number(qs.get('t'))||0);resize();render();if(playing)requestAnimationFrame(tick);
  function plan(){
    const [dx,dy]=dotPos(0,0),X=ICON.cx+ICON.S*(dx-IC.gx),Y=ICON.cy+ICON.lift+ICON.S*(dy-IC.gy),R=Math.round(2.6*IC.rd*ICON.S);
    const T1=[700,594,1220,704],T2=[400,728,1520,804];
    return {beat:BEAT,pad:PAD,music:MUSIC,frames:F,icon:ICON,dot_stage_at_landing:[X,Y],events:[
    {name:'wordmark starts to shrink and move (icon transformation begins)',kind:'onset',frame:F.b1,target:'b1',music:MUSIC.b1},
    {name:'dot lands at its rest place (pop + ripple); orbit drawn; gear at its static pose',kind:'impulse',frame:F.D0,target:'D0',music:MUSIC.D0,roi:[Math.round(X-R),Math.round(Y-R),Math.round(X+R),Math.round(Y+R)]},
    {name:'two labs (MIT HAN Lab, UC Berkeley Sky Computing Lab) start to appear',kind:'onset',frame:F.D1,target:'D1',music:MUSIC.D1,roi:T1},
    {name:'Georgia Tech, UIUC, NVIDIA, OpenAI start to appear',kind:'onset',frame:F.D1b1,target:'D1+1 beat',music:MUSIC.D1b1,roi:T2},
    {name:OPT==='A'?'wordmark and institutions start to fade out; icon starts to glide into the lockup':'icon, wordmark and institutions start to fade out',kind:'onset',frame:F.D2b3,target:'D2+3 beats',music:MUSIC.D2b3,roi:T2},
    {name:'"We breathe life into infra," full',kind:'impulse',frame:F.D3,target:'D3',music:MUSIC.D3},
    {name:'"so it evolves with your workload." full',kind:'impulse',frame:F.D3b2,target:'D3+2 beats',music:MUSIC.D3b2}].concat(OPT==='A'?(()=>{const L=lockA();return [
    {name:'A: icon glide into the lockup starts',kind:'onset',frame:F.D2b3,target:'D2+3 beats',music:MUSIC.D2b3,roi:[700,220,1220,560]},
    (()=>{const st=iconA(at(F.D3)),[dx,dy]=dotPos(st.a,st.sig),X=st.ox+st.S*(dx-IC.gx),Y=st.oy+st.S*(dy-IC.gy),R=Math.round(2.6*IC.rd*st.S);
      return {name:'A: orbit dot pops (pulse + ripple) as "life" breathes',kind:'impulse',frame:F.D3,target:'D3',music:MUSIC.D3,roi:[Math.round(X-R),Math.round(Y-R),Math.round(X+R),Math.round(Y+R)]};})(),
    {name:'A: gear quarter turn starts',kind:'onset',frame:F.D3b2,target:'D3+2 beats',music:MUSIC.D3b2,roi:L.box}];})():[])};}
  window.bookends={seek,setScene,plan,optPlan,state(){return {time,scene,total:TOTAL[scene],playing};},iconParams:()=>IC};
})();
