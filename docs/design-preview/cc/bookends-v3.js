(() => {
  'use strict';
  // v3 (2026-11-16): v2 plus the subline "so it evolves with your workload."; opening 3.8 s (114 frames) and end card (6 s) for the combined demo video, rendered deterministically from seek(t).
  // Film mode (?film=1): ?to=<png> is the first frame of the old video (the opening dissolves into it);
  // ?bg=<png> paints the opening background with that image (old frame 0) instead of the CSS gradient, so there is no dither.
  // ?from=<png> is the last frame of the old video (the end card starts from it, through dark).
  const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search);
  const TOTAL={intro:3.8,end:6.0};
  const T={gridIn:[0,.4],sweep:[.4,1.3],tagIn:[1.0,1.35],subIn:[1.5,1.85],toImg:[3.3,3.75],fromImg:[0,.12],endIn:[.25,.85],endOut:[5.15,5.85]};
  const COLS=9,ROWS=4,BW=100,BH=56,GAP=18,GRID_X=438,SWEEP_X=[150,1770];
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
    const cx=GRID_X+x+BW/2,touch=T.sweep[0]+(cx-SWEEP_X[0])/(SWEEP_X[1]-SWEEP_X[0])*(T.sweep[1]-T.sweep[0]);
    blocks.push({el,fins:[...el.querySelectorAll('i')],led:el.querySelector('b'),touch,phase:(r*3+c)%5*.55});
  }
  if(qs.get('to'))$('to').src=qs.get('to');if(qs.get('bg')){$('bg').src=qs.get('bg');$('bg').style.display='block';}if(qs.get('from'))$('from').src=qs.get('from');
  function renderIntro(t){
    $('grid').style.opacity=ease(ramp(t,T.gridIn));
    for(const b of blocks){
      const u=t-b.touch,a=u<0?0:easeOut(u/.3),flash=u<0?0:Math.exp(-u/.18)*.35;
      const pulse=u<0?0:.5-.5*Math.cos(2*Math.PI*1.05*u+b.phase*(1-Math.exp(-u/.4)));
      const hot=a;
      b.el.style.background=rgb(mix(mix(GRAY.fill,RED.fill,hot),[255,90,104],clamp(flash+.10*pulse*a,0,1)));
      b.el.style.borderColor=rgb(mix(GRAY.edge,RED.edge,hot));
      b.fins.forEach(f=>f.style.background=rgb(mix(GRAY.fin,RED.fin,hot)));
      b.led.style.background=rgb(mix(GRAY.led,RED.led,hot*(.55+.45*pulse)));
      b.el.style.boxShadow=a>0?'0 0 '+(14+14*pulse).toFixed(1)+'px rgba(201,35,54,'+(a*(.22+.26*pulse+flash)).toFixed(3)+')':'none';
    }
    const sp=ramp(t,T.sweep),sx=SWEEP_X[0]+(SWEEP_X[1]-SWEEP_X[0])*sp;
    $('sweep').style.left=sx.toFixed(1)+'px';$('sweep').style.opacity=t<T.sweep[0]||t>T.sweep[1]?0:Math.min(1,sp/.12,(1-sp)/.12);
    const ta=ease(ramp(t,T.tagIn));$('tagline').style.opacity=ta;$('tagline').style.transform='translateY('+((1-ta)*14).toFixed(2)+'px)';
    const sa=ease(ramp(t,T.subIn));$('subline').style.opacity=sa;$('subline').style.transform='translateY('+((1-sa)*10).toFixed(2)+'px)';
    $('to').style.opacity=$('to').getAttribute('src')?ease(ramp(t,T.toImg)):0;
    $('black').style.opacity=$('to').getAttribute('src')?0:ease(ramp(t,T.toImg));
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
  window.bookends={seek,setScene,state(){return {time,scene,total:TOTAL[scene],playing};}};
})();
