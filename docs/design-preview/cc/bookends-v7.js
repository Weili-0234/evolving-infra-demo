(() => {
  'use strict';
  const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search);
  // v7 (2026-11-16): the opening starts with the MIT HAN Lab lockup alone (frame 0 = README thumbnail), with a soft pulse on
  // D0. From D0+2 beats it dissolves while our gear-and-orbit icon (a vector model fitted to the 177x120 raster, see
  // icon_fit3.py) grows in at the centre, already turning; the red dot draws the orbit behind it and lands on D1. The icon keeps
  // moving (gear: one tooth per bar; dot and orbit: one turn per 4 bars, behind the gear on the far side of the ellipse) while the
  // "EVOLVING INFRA" wordmark fades in from D1+1 beat to D1+2 beats. On D2 the icon crossfades into the server grid; the tagline
  // scene (v6.1, one bar later) and the slowed title card follow. Old frame 210 lands on music time 7.0 s + 7 bars.
  // Music times are measured onsets of the source track (onsets.py); the music starts PAD s into the video; events snap to frames.
  // ?scene=poster: the title card image (?poster=<png>) with the logo row (vector icon, static pose); ?scene=iconcheck: the icon
  // alone at 177x120, scale 1, on a flat ?checkbg= colour (static-match validation against the raster).
  const FPS=30,BEAT=.59897,BARS=7,F210=714,PAD=F210/FPS-(7.0+BARS*4*BEAT);
  const MUSIC={b0:.1221,D0:1.9196,D0b2:3.1192,D0b3:3.7227,D1:4.3172,D1b1:4.9251,D1b2:5.5153,D2:6.717,D2b1:7.3211,D2b2:7.9189,D3:9.118,D4:11.5187,D5:13.9168};
  const fr=k=>Math.round((MUSIC[k]+PAD)*FPS);const F={};for(const k in MUSIC)F[k]=fr(k);
  const TOTAL={intro:(F.D5+16)/FPS,end:6.0,poster:0,iconcheck:0};
  const at=f=>f/FPS,pre=f=>(f-1)/FPS;                       // a ramp starting at pre(f) shows its first change on frame f
  const T={pulse:at(F.D0),lockOut:[pre(F.D0b2),pre(F.D0b2)+.45],gearIn:[pre(F.D0b2+6),at(F.D1)],comet:[pre(F.D0b2+9),at(F.D1)],land:at(F.D1)-.001,
    word:[pre(F.D1b1),at(F.D1b2)],out:[pre(F.D2),at(F.D2b1)],tagIn:[at(F.D3)-.12,at(F.D3)],subIn:[at(F.D4)-.12,at(F.D4)],glow:at(F.D3)-.001,
    fromImg:[0,.12],endIn:[.25,.85],endOut:[5.15,5.85]};
  // ---- icon geometry (icon_fit3.py, raster pixel units; y down; teeth/body angles in degrees, t* ellipse parameters in radians).
  // The orbit band lies between an outer and an inner ellipse (suffix o / i); ex, ey, rho: their mean, whose major axis splits front/back.
  const IC={"gx":88.4959,"gy":62.1932,"phase":-0.071,"Rt":57.0857,"Rb":46.5662,"k":0.0567,"phib":0.1168,"hb":12.1847,"ht":8.0553,"Rh":20.3694,"exo":88.644,"eyo":62.1836,"Ao":97.4,"Bo":38.3703,"rhoo":151.9549,"exi":88.5423,"eyi":61.8737,"Ai":89.344,"Bi":30.6966,"rhoi":151.9723,"ex":88.5931,"ey":62.0287,"rho":151.9636,"t0o":2.1812,"t0i":2.2624,"t1o":7.2495,"t1i":7.1374,"td":2.7112,"rd":8.8862,"dn":-0.5515,"g":3.6634,"front_sign":-1.0,"red":[165.0,44.0,37.0],"gray":[140.0,140.0,140.0],"size":[177,120]};
  const ICON={cx:960,cy:500,S:2.4};                          // gear centre on the stage and scale (icon 425 x 288 px)
  const OMEGA=45/(4*BEAT),SPIN=50,ORBIT=2*Math.PI/(4*4*BEAT),ORAMP=2*BEAT;   // deg/s (one tooth per bar), extra spin-in, rad/s (one turn per 4 bars)
  const easeIn=x=>Math.pow(clampG(x,0,1),3);function clampG(x,a,b){return Math.max(a,Math.min(b,x));}
  const COLS=9,ROWS=4,BW=100,BH=56,GAP=18,GRID_X=438,CX0=GRID_X+BW/2,CX8=GRID_X+8*(BW+GAP)+BW/2;
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
    return {ox:ICON.cx,oy:ICON.cy,S:ICON.S,rot,gearScale:.55+.45*easeOut(u),gearAlpha:easeOut(clamp((t-T.gearIn[0])/.4,0,1)),
      a,sig,cometAlpha:clamp((t-T.comet[0])/.15,0,1),dotScale:1+.3*pop,
      ripple:rp>=0&&rp<1?{r:IC.rd*(1.15+1.8*easeOut(rp)),alpha:.55*Math.pow(1-rp,2)}:null};
  }
  const GRAY={fill:[34,38,46],edge:[74,80,91],fin:[58,64,74],led:[74,80,91]};
  const REDB={fill:[201,35,54],edge:[232,92,106],fin:[142,22,36],led:[255,214,218]};
  const blocks=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const el=document.createElement('div');el.className='blk';el.innerHTML='<i></i><i></i><i></i><b></b>';
    const x=c*(BW+GAP),y=r*(BH+GAP);el.style.left=x+'px';el.style.top=y+'px';$('grid').appendChild(el);
    const touch=(F.D2b2+Math.round(c*(F.D3-F.D2b2)/8))/FPS-.001;   // column 1 on D2+2 beats, column 9 on D3, each on a whole frame
    blocks.push({el,fins:[...el.querySelectorAll('i')],led:el.querySelector('b'),touch,phase:(r*3+c)%5*.55});
  }
  if(qs.get('bg')){$('bg').src=qs.get('bg');$('bg').style.display='block';}if(qs.get('from'))$('from').src=qs.get('from');if(qs.get('poster'))$('poster-bg').src=qs.get('poster');
  function renderIntro(t){
    // HAN lockup: 1.00 -> 1.02 -> 1.00 pulse peaking on D0, then dissolves (0.45 s fade + scale to 0.9) from D0+2 beats;
    // the gear starts 6 frames later, the dot 9 frames later
    const up=t<=T.pulse?easeIn((t-(T.pulse-.15))/.15):Math.exp(-(t-T.pulse)/.25),lo=ease(ramp(t,T.lockOut));
    $('lockup').style.opacity=(1-lo).toFixed(4);$('lockup').style.transform='scale('+((1+.02*up)*(1-.1*lo)).toFixed(5)+')';
    $('lockup').style.visibility=t>=T.lockOut[1]?'hidden':'visible';
    const out=ramp(t,T.out),ic=$('icon'),c=ic.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,ic.width,ic.height);
    ic.style.opacity=(1-out).toFixed(4);
    if(t>=T.gearIn[0]&&out<1)drawIcon(c,iconState(t));
    const wa=ramp(t,T.word);$('wordmark').style.opacity=(wa*(1-out)).toFixed(4);$('wordmark').style.transform='translateY('+((1-wa)*10).toFixed(2)+'px)';
    $('grid').style.opacity=out;
    const all=t<T.glow?0:Math.exp(-(t-T.glow)/.25)*.5;   // glow pulse on every block at D3
    for(const b of blocks){
      const u=t-b.touch,a=u<0?0:easeOut(u/.3),flash=(u<0?0:Math.exp(-u/.18)*.35)+all;
      const pulse=u<0?0:.5-.5*Math.cos(2*Math.PI*1.05*u+b.phase*(1-Math.exp(-u/.4)));
      const hot=a;
      b.el.style.background=rgb(mix(mix(GRAY.fill,REDB.fill,hot),[255,90,104],clamp(flash+.10*pulse*a,0,1)));
      b.el.style.borderColor=rgb(mix(GRAY.edge,REDB.edge,hot));
      b.fins.forEach(f=>f.style.background=rgb(mix(GRAY.fin,REDB.fin,hot)));
      b.led.style.background=rgb(mix(GRAY.led,REDB.led,hot*(.55+.45*pulse)));
      b.el.style.boxShadow=a>0?'0 0 '+(14+14*pulse).toFixed(1)+'px rgba(201,35,54,'+(a*(.22+.26*pulse+flash)).toFixed(3)+')':'none';
    }
    const t1=F.D2b2/FPS,t8=F.D3/FPS,sx=CX0+(t-t1)/(t8-t1)*(CX8-CX0);   // band centre passes each column as it turns red
    $('sweep').style.left=sx.toFixed(1)+'px';$('sweep').style.opacity=clamp(Math.min((t-(t1-.25))/.25,(t8+.25-t)/.25),0,1);
    const ta=easeIn((t-T.tagIn[0])/(T.tagIn[1]-T.tagIn[0]));$('tagline').style.opacity=ta;$('tagline').style.transform='translateY('+((1-ta)*8).toFixed(2)+'px)';
    const sa=easeIn((t-T.subIn[0])/(T.subIn[1]-T.subIn[0]));$('subline').style.opacity=sa;$('subline').style.transform='translateY('+((1-sa)*6).toFixed(2)+'px)';
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
    const [dx,dy]=dotPos(0,0),X=ICON.cx+ICON.S*(dx-IC.gx),Y=ICON.cy+ICON.S*(dy-IC.gy),R=Math.round(2.6*IC.rd*ICON.S);
    return {bars:BARS,beat:BEAT,pad:PAD,f210:F210,music:MUSIC,frames:F,icon:ICON,dot_stage:[X,Y],events:[
    {name:'HAN lockup pulse peak',kind:'impulse',frame:F.D0,target:'D0',music:MUSIC.D0},
    {name:'lockup starts to dissolve (gear grows in from 6 frames later, turning)',kind:'onset',frame:F.D0b2,target:'D0+2 beats',music:MUSIC.D0b2},
    {name:'dot lands at its rest place (pop + ripple); orbit drawn; gear at its static pose',kind:'impulse',frame:F.D1,target:'D1',music:MUSIC.D1,roi:[Math.round(X-R),Math.round(Y-R),Math.round(X+R),Math.round(Y+R)]},
    {name:'wordmark starts to fade in',kind:'onset',frame:F.D1b1,target:'D1+1 beat',music:MUSIC.D1b1,roi:[560,676,1360,760]},
    {name:'wordmark fully in',kind:'end',frame:F.D1b2,target:'D1+2 beats',music:MUSIC.D1b2,roi:[560,676,1360,760]},
    {name:'icon + wordmark start to crossfade out, grid in',kind:'onset',frame:F.D2,target:'D2',music:MUSIC.D2,roi:[440,520,600,680]},
    {name:'crossfade done (grid in, icon gone)',kind:'end',frame:F.D2b1,target:'D2+1 beat',music:MUSIC.D2b1,roi:[440,520,600,680]},
    {name:'column 1 red',kind:'impulse',frame:F.D2b2,target:'D2+2 beats',music:MUSIC.D2b2},
    {name:'column 9 red + glow pulse + tagline full',kind:'impulse',frame:F.D3,target:'D3',music:MUSIC.D3},
    {name:'subline full',kind:'impulse',frame:F.D4,target:'D4',music:MUSIC.D4}]};}
  window.bookends={seek,setScene,plan,state(){return {time,scene,total:TOTAL[scene],playing};},iconParams:()=>IC};
})();
