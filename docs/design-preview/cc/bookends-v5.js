(() => {
  'use strict';
  // v5 (2026-11-16): beat-locked opening. ?plan=a: 2 bars (144 frames), ?plan=b: 3 bars (216 frames). End card as v4.
  // Music times are onsets measured on the source track (beats.py/hits.py, 5-ms onset envelope); the music starts PAD s
  // into the video so that the cut to the old video (frame NI) lands on music time = whole bars (beat 0.59897 s).
  // Every event is snapped to the nearest video frame and is fully visible on that frame (fades end on the hit).
  // Film mode (?film=1): ?to=<png> is the first frame of the old video (the opening dissolves into it);
  // ?bg=<png> paints the opening background with that image (old frame 0) instead of the CSS gradient, so there is no dither.
  // ?from=<png> is the last frame of the old video (the end card starts from it, through dark).
  const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search);
  const FPS=30,BEAT=.59897,MUSIC={b0:.1221,b1:.7030,D0:1.9196,b4:2.5218,D1:4.3172,D2:6.7170};
  const PLANS={a:{bars:2,frames:144,sub:'b4',dis:'D1'},b:{bars:3,frames:216,sub:'D1',dis:'D2'}};
  const planName=qs.get('plan')==='b'?'b':'a',P=PLANS[planName],PAD=P.frames/FPS-P.bars*4*BEAT;
  const fr=k=>Math.round((MUSIC[k]+PAD)*FPS);                 // video frame of a music event
  const F={b0:fr('b0'),b1:fr('b1'),D0:fr('D0'),sub:fr(P.sub),dis:fr(P.dis),cut:P.frames};
  const TOTAL={intro:P.frames/FPS,end:6.0};
  const T={gridIn:[(F.b0-1)/FPS,F.b1/FPS],tagIn:[F.D0/FPS-.12,F.D0/FPS],subIn:[F.sub/FPS-.12,F.sub/FPS],toImg:[(F.dis-1)/FPS,(F.cut-1)/FPS],
    pulse:F.D0/FPS-.001,fromImg:[0,.12],endIn:[.25,.85],endOut:[5.15,5.85]};
  const easeIn=x=>Math.pow(clampG(x,0,1),3);function clampG(x,a,b){return Math.max(a,Math.min(b,x));}
  const COLS=9,ROWS=4,BW=100,BH=56,GAP=18,GRID_X=438,CX0=GRID_X+BW/2,CX8=GRID_X+8*(BW+GAP)+BW/2;
  const film=qs.has('film');if(film)document.body.classList.add('export');
  let scene=qs.get('scene')==='end'?'end':'intro',time=Math.max(0,Number(qs.get('t'))||0),playing=!film,last=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ramp=(t,[a,b])=>clamp((t-a)/(b-a),0,1);
  const ease=x=>{x=clamp(x,0,1);return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;},easeOut=x=>1-Math.pow(1-clamp(x,0,1),3);
  const mix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k)),rgb=c=>'rgb('+c.join(',')+')';
  const GRAY={fill:[34,38,46],edge:[74,80,91],fin:[58,64,74],led:[74,80,91]};
  const RED={fill:[201,35,54],edge:[232,92,106],fin:[142,22,36],led:[255,214,218]};
  const blocks=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const el=document.createElement('div');el.className='blk';el.innerHTML='<i></i><i></i><i></i><b></b>';
    const x=c*(BW+GAP),y=r*(BH+GAP);el.style.left=x+'px';el.style.top=y+'px';$('grid').appendChild(el);
    const touch=(F.b1+Math.round(c*(F.D0-F.b1)/8))/FPS-.001;   // column 0 on b1, column 8 on D0, each on a whole frame
    blocks.push({el,fins:[...el.querySelectorAll('i')],led:el.querySelector('b'),touch,phase:(r*3+c)%5*.55});
  }
  if(qs.get('to'))$('to').src=qs.get('to');if(qs.get('bg')){$('bg').src=qs.get('bg');$('bg').style.display='block';}if(qs.get('from'))$('from').src=qs.get('from');
  function renderIntro(t){
    $('grid').style.opacity=ramp(t,T.gridIn);
    const all=t<T.pulse?0:Math.exp(-(t-T.pulse)/.25)*.5;   // glow pulse on every block at D0
    for(const b of blocks){
      const u=t-b.touch,a=u<0?0:easeOut(u/.3),flash=(u<0?0:Math.exp(-u/.18)*.35)+all;
      const pulse=u<0?0:.5-.5*Math.cos(2*Math.PI*1.05*u+b.phase*(1-Math.exp(-u/.4)));
      const hot=a;
      b.el.style.background=rgb(mix(mix(GRAY.fill,RED.fill,hot),[255,90,104],clamp(flash+.10*pulse*a,0,1)));
      b.el.style.borderColor=rgb(mix(GRAY.edge,RED.edge,hot));
      b.fins.forEach(f=>f.style.background=rgb(mix(GRAY.fin,RED.fin,hot)));
      b.led.style.background=rgb(mix(GRAY.led,RED.led,hot*(.55+.45*pulse)));
      b.el.style.boxShadow=a>0?'0 0 '+(14+14*pulse).toFixed(1)+'px rgba(201,35,54,'+(a*(.22+.26*pulse+flash)).toFixed(3)+')':'none';
    }
    const t1=F.b1/FPS,t8=F.D0/FPS,sx=CX0+(t-t1)/(t8-t1)*(CX8-CX0);   // band centre passes each column as it turns red
    $('sweep').style.left=sx.toFixed(1)+'px';$('sweep').style.opacity=clamp(Math.min((t-(t1-.25))/.25,(t8+.25-t)/.25),0,1);
    const ta=easeIn((t-T.tagIn[0])/(T.tagIn[1]-T.tagIn[0]));$('tagline').style.opacity=ta;$('tagline').style.transform='translateY('+((1-ta)*8).toFixed(2)+'px)';
    const sa=easeIn((t-T.subIn[0])/(T.subIn[1]-T.subIn[0]));$('subline').style.opacity=sa;$('subline').style.transform='translateY('+((1-sa)*6).toFixed(2)+'px)';
    $('to').style.opacity=$('to').getAttribute('src')?ramp(t,T.toImg):0;
    $('black').style.opacity=$('to').getAttribute('src')?0:ramp(t,T.toImg);
  }
  function renderEnd(t){
    // the old last frame (above the black layer) fades to black, then the card fades in from black and out at the very end
    $('from').style.opacity=$('from').getAttribute('src')?1-ease(ramp(t,T.fromImg)):0;
    $('black').style.opacity=1-ease(ramp(t,T.endIn))*(1-ease(ramp(t,T.endOut)));
  }
  function render(){
    $('intro').style.visibility=scene==='intro'?'visible':'hidden';$('end').style.visibility=scene==='end'?'visible':'hidden';
    $('from').style.visibility=scene==='end'?'visible':'hidden';
    if(scene==='intro')renderIntro(time);else renderEnd(time);
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
  function plan(){return {plan:planName,bars:P.bars,beat:BEAT,pad:PAD,frames:P.frames,music:MUSIC,events:[
    {name:'grid starts to fade in',kind:'onset',frame:F.b0,target:'b0',music:MUSIC.b0},
    {name:'grid fully in; sweep turns column 1 red',kind:'impulse',frame:F.b1,target:'b1',music:MUSIC.b1},
    {name:'column 9 red + glow pulse + tagline full',kind:'impulse',frame:F.D0,target:'D0',music:MUSIC.D0},
    {name:'subline full',kind:'impulse',frame:F.sub,target:P.sub,music:MUSIC[P.sub]},
    {name:'dissolve starts',kind:'onset',frame:F.dis,target:P.dis,music:MUSIC[P.dis]},
    {name:'cut to old video t=0',kind:'cut',frame:F.cut,target:P.bars+' bars',music:P.bars*4*BEAT}]};}
  window.bookends={seek,setScene,plan,state(){return {time,scene,total:TOTAL[scene],playing};}};
})();
