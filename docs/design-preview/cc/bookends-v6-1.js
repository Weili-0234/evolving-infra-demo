(() => {
  'use strict';
  const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search);
  // v6.1 (2026-11-16): logo card on the dark video background, fully visible from frame 0 (README players show the first
  // frame); on D1 the logos crossfade out while the grid crossfades in (to D1+1 beat). Everything after is as v6.
  // ?scene=poster: the dark title card image (?poster=<png>) with the same logo row, smaller, along the bottom.
  // v6: logos first (MIT HAN Lab + Evolving Infra on a light card), then the beat-locked tagline scene, then
  // (rendered in Python, not here) the slowed title card. Music times are measured onsets of the source track; the music
  // starts PAD s into the video so that old frame 210 lands on music time 7.0 s + 6 bars. Events snap to whole frames.
  // Film mode (?film=1): ?bg=<png> paints the dark scene with old frame 0; ?from=<png> is the old last frame (end card).
  const FPS=30,BEAT=.59897,BARS=6,F210=642,PAD=F210/FPS-(7.0+BARS*4*BEAT);
  const MUSIC={b0:.1221,b1:.7030,D0:1.9196,D1:4.3172,D1b1:4.9251,D1b2:5.5153,D2:6.7170,D3:9.1180,D4:11.5187};
  const fr=k=>Math.round((MUSIC[k]+PAD)*FPS);const F={};for(const k in MUSIC)F[k]=fr(k);
  const TOTAL={intro:(F.D4+16)/FPS,end:6.0,poster:0};               // the page covers the scene up to the end of the D4 dissolve
  const T={logoIn:[(F.b0-1)/FPS,F.b1/FPS],pulse:F.D0/FPS,light:[(F.D1-1)/FPS,F.D1b1/FPS],gridIn:[(F.D1-1)/FPS,F.D1b1/FPS],
    tagIn:[F.D2/FPS-.12,F.D2/FPS],subIn:[F.D3/FPS-.12,F.D3/FPS],glow:F.D2/FPS-.001,fromImg:[0,.12],endIn:[.25,.85],endOut:[5.15,5.85]};
  const easeIn=x=>Math.pow(clampG(x,0,1),3);function clampG(x,a,b){return Math.max(a,Math.min(b,x));}
  const COLS=9,ROWS=4,BW=100,BH=56,GAP=18,GRID_X=438,CX0=GRID_X+BW/2,CX8=GRID_X+8*(BW+GAP)+BW/2;
  const film=qs.has('film');if(film)document.body.classList.add('export');
  let scene=['end','poster'].includes(qs.get('scene'))?qs.get('scene'):'intro',time=Math.max(0,Number(qs.get('t'))||0),playing=!film,last=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ramp=(t,[a,b])=>clamp((t-a)/(b-a),0,1);
  const ease=x=>{x=clamp(x,0,1);return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;},easeOut=x=>1-Math.pow(1-clamp(x,0,1),3);
  const mix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k)),rgb=c=>'rgb('+c.join(',')+')';
  const GRAY={fill:[34,38,46],edge:[74,80,91],fin:[58,64,74],led:[74,80,91]};
  const RED={fill:[201,35,54],edge:[232,92,106],fin:[142,22,36],led:[255,214,218]};
  const blocks=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const el=document.createElement('div');el.className='blk';el.innerHTML='<i></i><i></i><i></i><b></b>';
    const x=c*(BW+GAP),y=r*(BH+GAP);el.style.left=x+'px';el.style.top=y+'px';$('grid').appendChild(el);
    const touch=(F.D1b2+Math.round(c*(F.D2-F.D1b2)/8))/FPS-.001;   // column 1 on D1+2 beats, column 9 on D2, each on a whole frame
    blocks.push({el,fins:[...el.querySelectorAll('i')],led:el.querySelector('b'),touch,phase:(r*3+c)%5*.55});
  }
  if(qs.get('to'))$('to').src=qs.get('to');if(qs.get('bg')){$('bg').src=qs.get('bg');$('bg').style.display='block';}if(qs.get('from'))$('from').src=qs.get('from');if(qs.get('poster'))$('poster-bg').src=qs.get('poster');
  function renderIntro(t){
    // logo card: fade in b0 -> b1, a soft 1.00 -> 1.02 -> 1.00 scale pulse peaking on D0, light layer dissolves D1 -> D1+1 beat
    const up=t<=T.pulse?easeIn((t-(T.pulse-.15))/.15):Math.exp(-(t-T.pulse)/.25);
    $('logo-row').style.opacity=1;$('logo-row').style.transform='translate(-50%,-50%) scale('+(1+.02*up).toFixed(5)+')';
    $('light').style.opacity=1-ramp(t,T.light);$('light').style.visibility=t>=T.light[1]?'hidden':'visible';
    $('grid').style.opacity=ramp(t,T.gridIn);
    const all=t<T.glow?0:Math.exp(-(t-T.glow)/.25)*.5;   // glow pulse on every block at D2
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
    const t1=F.D1b2/FPS,t8=F.D2/FPS,sx=CX0+(t-t1)/(t8-t1)*(CX8-CX0);   // band centre passes each column as it turns red
    $('sweep').style.left=sx.toFixed(1)+'px';$('sweep').style.opacity=clamp(Math.min((t-(t1-.25))/.25,(t8+.25-t)/.25),0,1);
    const ta=easeIn((t-T.tagIn[0])/(T.tagIn[1]-T.tagIn[0]));$('tagline').style.opacity=ta;$('tagline').style.transform='translateY('+((1-ta)*8).toFixed(2)+'px)';
    const sa=easeIn((t-T.subIn[0])/(T.subIn[1]-T.subIn[0]));$('subline').style.opacity=sa;$('subline').style.transform='translateY('+((1-sa)*6).toFixed(2)+'px)';
    $('black').style.opacity=0;
  }
  function renderEnd(t){
    // the old last frame (above the black layer) fades to black, then the card fades in from black and out at the very end
    $('from').style.opacity=$('from').getAttribute('src')?1-ease(ramp(t,T.fromImg)):0;
    $('black').style.opacity=1-ease(ramp(t,T.endIn))*(1-ease(ramp(t,T.endOut)));
  }
  function render(){
    $('intro').style.visibility=scene==='intro'?'visible':'hidden';$('end').style.visibility=scene==='end'?'visible':'hidden';$('poster').style.visibility=scene==='poster'?'visible':'hidden';
    $('from').style.visibility=scene==='end'?'visible':'hidden';
    if(scene==='intro')renderIntro(time);else if(scene==='end')renderEnd(time);else $('black').style.opacity=0;
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
  function plan(){return {bars:BARS,beat:BEAT,pad:PAD,f210:F210,music:MUSIC,frames:F,events:[
    {name:'logo pulse peak',kind:'impulse',frame:F.D0,target:'D0',music:MUSIC.D0},
    {name:'logos start to crossfade out, grid in',kind:'onset',frame:F.D1,target:'D1',music:MUSIC.D1},
    {name:'crossfade done (grid in, logos gone)',kind:'end',frame:F.D1b1,target:'D1+1 beat',music:MUSIC.D1b1},
    {name:'grid in; column 1 red',kind:'impulse',frame:F.D1b2,target:'D1+2 beats',music:MUSIC.D1b2},
    {name:'column 9 red + glow pulse + tagline full',kind:'impulse',frame:F.D2,target:'D2',music:MUSIC.D2},
    {name:'subline full',kind:'impulse',frame:F.D3,target:'D3',music:MUSIC.D3}]};}
  window.bookends={seek,setScene,plan,state(){return {time,scene,total:TOTAL[scene],playing};}};
})();
