(() => {
  'use strict';
  const source=window.SESSION_REPLAY_DATA;
  const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search);
  const workload=qs.get('workload')==='cua'?'cua':'cc';
  const run=window.FLEET_DATA[workload],WINDOW=run.windowSeconds;
  document.title=run.label+' — Evolving Infra vs. Dynamo+SGLang';
  const fleetOnly=qs.has('fleet')||workload==='cua';
  const metrics=window.CostMetrics;
  let layout=qs.get('layout')==='levels'?'levels':'clean';
  const fleetView=FleetView.prepare(run);
  $('film').dataset.layout=layout;
  let metricKey='tokens';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(qs.has('film'))document.body.classList.add('export');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const fmt=s=>{const n=Math.max(0,Math.floor(s));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
  const money=(v,d=2)=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const price=r=>((r[3]-r[4])*run.ratesPerMillion.input+r[4]*run.ratesPerMillion.cachedInput+r[6]*run.ratesPerMillion.output)/1e6;
  const rows={},stats={},sides={};
  // Remove only gaps with no in-flight request. Every request keeps its own
  // measured TTFT and decode duration; overlapping requests remain overlapping.
  for(const arm of ['dyn','ours']){
    let busyEnd=0,removed=0;
    rows[arm]=source[arm].map(r=>{removed+=Math.max(0,r[0]-busyEnd);busyEnd=Math.max(busyEnd,r[2]);return [r[0]-removed,r[1]-removed,r[2]-removed,...r.slice(3)];});
    const prompt=source[arm].reduce((s,r)=>s+r[3],0),cached=source[arm].reduce((s,r)=>s+r[4],0);
    stats[arm]={hit:cached/prompt,ttft:source[arm].reduce((s,r)=>s+r[1]-r[0],0),cost:source[arm].reduce((s,r)=>s+price(r),0),modelEnd:Math.max(...rows[arm].map(r=>r[2])),omitted:removed};
    const root=$('story-'+arm);
    const native=window.CCTerminal.mount(root.querySelector('.terminal'),rows[arm]);
    sides[arm]={root,native,status:root.querySelector('[data-status]'),state:root.querySelector('[data-state]'),wait:root.querySelector('[data-wait]'),finish:root.querySelector('[data-finish]'),progress:root.querySelector('[data-progress]'),bar:root.querySelector('[data-progress-bar]'),hit:root.querySelector('[data-hit]'),cost:root.querySelector('[data-cost]'),elapsed:root.querySelector('[data-elapsed]')};
  }
  const modelEnd=Math.max(stats.dyn.modelEnd,stats.ours.modelEnd);
  const points=[...new Set([0,...Object.values(rows).flatMap(rs=>rs.flatMap(r=>[r[1],r[2]]))])].sort((a,b)=>a-b);
  const segments=[];let modelVideo=0;
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],middle=(a+b)/2;
    const streaming=Object.values(rows).some(rs=>rs.some(r=>r[1]<=middle&&middle<r[2]));
    const rate=streaming?8:120,duration=(b-a)/rate;
    segments.push({a,b,rate,start:modelVideo,end:modelVideo+duration});modelVideo+=duration;
  }
  const INTRO=.8,SESSION_END=fleetOnly?0:INTRO+modelVideo+.7,FLEET_INTRO=.6,RUN_DURATION=18,END_HOLD=3.5,TOTAL=SESSION_END+FLEET_INTRO+RUN_DURATION+END_HOLD;
  let time=clamp(Number(qs.get('t'))||0,0,TOTAL),playing=!qs.has('t')&&!reduced.matches,last=null,currentPhase='';
  function modelAt(video){
    const v=Math.max(0,video-INTRO);
    if(v>=modelVideo)return {time:modelEnd,rate:1};
    const seg=segments.find(s=>v<s.end)||segments[segments.length-1];
    return {time:seg.a+(v-seg.start)*seg.rate,rate:seg.rate};
  }
  function renderArm(arm,t){
    const side=sides[arm];let done=0,active=null,decoding=false,prompt=0,cached=0,output=0,charge=0;
    rows[arm].forEach((r,i)=>{
      const started=t+1e-8>=r[0],finished=t+1e-8>=r[2];
      if(finished){done++;prompt+=r[3];cached+=r[4];output+=r[6];charge+=price(r);}
      if(started&&!finished){active={row:r,index:i};if(t>=r[1])decoding=true;}
    });
    const finished=done===rows[arm].length,phase=finished?'done':decoding?'decode':'wait';
    side.status.dataset.phase=phase;
    side.state.textContent=finished?'SESSION COMPLETE':decoding?'STREAMING OUTPUT':'FIRST-TOKEN WAIT';
    side.wait.textContent=finished?'25 / 25':decoding?'Decoding':fmt(active?t-active.row[0]:0);
    side.finish.textContent=finished?'FINISHED '+fmt(stats[arm].modelEnd):'';
    side.elapsed.textContent=fmt(Math.min(t,stats[arm].modelEnd));
    side.hit.textContent=prompt?(cached/prompt*100).toFixed(1)+'%':'—';
    side.cost.textContent=metrics.format(metrics.value({charge,input:prompt,output,calls:done},metricKey),metricKey);
    side.progress.innerHTML=done+' <small>/ 25</small>';side.bar.style.width=(done/25*100)+'%';
    side.native.render(t,time,reduced.matches);
  }
  function sample(arm,t){
    const series=run.series[arm],index=Math.min(series.length-1,Math.floor(t/run.sampleSeconds));
    const a=series[index],b=series[Math.min(index+1,series.length-1)],f=clamp((t-a[0])/run.sampleSeconds,0,1);
    const revenue=a[1]+(b[1]-a[1])*f,calls=a[3]+(b[3]-a[3])*f;
    const prompt=a[5]+(b[5]-a[5])*f,cached=a[6]+(b[6]-a[6])*f,output=a[7]+(b[7]-a[7])*f;
    return {revenue,calls,hit:a[5]>0?cached/prompt:null,cost:a[3]>0?metrics.value({charge:revenue,calls,input:prompt,output},metricKey):null};
  }
  const plots={},tiles={};
  for(const arm of ['dyn','ours']){
    const grid=$('grid-'+arm),count=run.slots[arm];
    grid.style.gridTemplateColumns='repeat('+(count===126?14:16)+',minmax(0,1fr))';
    grid.setAttribute('aria-label',count+' concurrent agent slots');
    tiles[arm]=Array.from({length:count},(_,i)=>{const tile=document.createElement('i');tile.className='agent-tile';tile.dataset.slot=String(i+1);tile.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path data-glyph="W" fill="#f0a830" d="M4 2h8L4 14h8Z"/><path data-glyph="G" fill="#3ecf8e" d="M8 0Q8 8 16 8Q8 8 8 16Q8 8 0 8Q8 8 8 0"/><path data-glyph="T" fill="none" stroke="#5b8def" stroke-width="1.7" d="m3 3 4 5-4 5m5-1h6"/></svg>';tile._glyphs=Object.fromEntries([...tile.querySelectorAll('[data-glyph]')].map(n=>[n.dataset.glyph,n]));grid.append(tile);return tile;});
  }
  $('brick-count').textContent='Grouped by state · trailing 60 s average';
  document.querySelectorAll('[data-session-method]').forEach(n=>n.hidden=fleetOnly);
  document.querySelector('[data-chapter="session"]').hidden=fleetOnly;
  $('workload-method').textContent=run.harness+' · '+run.model+' · '+run.slots.dyn+' / '+run.slots.ours+' concurrent slots (Dynamo+SGLang / Evolving Infra) · 36 GB300 GPUs per system. The measured window is ['+run.windowStartSeconds+', '+(run.windowStartSeconds+WINDOW)+') seconds after each run starts ('+(WINDOW/60)+' minutes after warmup). Successful non-warmup completions enter the billing cohort. Curves retain original wall time, including tool calls, and interpolate '+run.sampleSeconds+'-second cumulative samples.';
  $('price-method').textContent='Provider revenue and user cost are valuations at these per-million token rates: $'+run.ratesPerMillion.input.toFixed(2)+' uncached input, $'+run.ratesPerMillion.cachedInput.toFixed(2)+' cached input, $'+run.ratesPerMillion.output.toFixed(2)+' output. User cost divides total charges by input plus output tokens, multiplied by one million. They are not measured payments. The selected-session example and aggregate cohort have different scopes.';
  function axisFor(maximum){
    const target=maximum*1.1/4,power=10**Math.floor(Math.log10(Math.max(target,1e-9)));
    const step=[1,2,2.5,5,10].map(x=>x*power).find(x=>x>=target)||power*10;
    const max=Math.ceil(maximum*1.08/step)*step;
    return {max,ticks:Array.from({length:Math.round(max/step)+1},(_,i)=>i*step),decimals:Math.max(0,-Math.floor(Math.log10(step))+(step/power===2.5?1:0))};
  }
  function makePlot(id,min,max,ticks,format){
    const svg=$(id),height=layout==='clean'?265:180,bottom=height-47,x=t=>52+(t/WINDOW)*560,y=v=>bottom-(v-min)/(max-min)*(bottom-18);
    svg.setAttribute('viewBox','0 0 630 '+height);
    let markup='';
    for(const v of ticks)markup+='<line class="plot-grid" x1="52" x2="612" y1="'+y(v)+'" y2="'+y(v)+'"/><text class="plot-axis" text-anchor="end" x="42" y="'+(y(v)+4)+'">'+format(v)+'</text>';
    for(const m of [...Array(Math.floor(WINDOW/900)+1)].map((_,i)=>i*15).filter(m=>m<WINDOW/60).concat(WINDOW/60))markup+='<text class="plot-axis" text-anchor="middle" x="'+x(m*60)+'" y="'+(height-26)+'">'+m+'</text>';
    markup+='<text class="plot-axis" text-anchor="middle" x="332" y="'+(height-5)+'">Time after warmup (min)</text><line class="plot-cursor" y1="18" y2="'+bottom+'"/>';
    for(const arm of ['dyn','ours'])markup+='<path class="plot-line plot-'+arm+'" data-line="'+arm+'"/><circle class="plot-dot" data-dot="'+arm+'" r="4" fill="'+(arm==='ours'?'#c92336':'#b8c2cc')+'"/>';
    svg.innerHTML=markup;
    return {svg,x,y,lines:Object.fromEntries(['dyn','ours'].map(a=>[a,svg.querySelector('[data-line="'+a+'"]')])),dots:Object.fromEntries(['dyn','ours'].map(a=>[a,svg.querySelector('[data-dot="'+a+'"]')]))};
  }
  const revenueAxis=axisFor(Math.max(run.totals.dyn.revenue,run.totals.ours.revenue));
  plots.revenue=makePlot('revenue-chart',0,revenueAxis.max,revenueAxis.ticks,v=>'$'+v.toLocaleString('en-US',{maximumFractionDigits:0}));
  function configureCost(){
    const opt=metrics.options[metricKey];
    const maximum=Math.max(...['dyn','ours'].flatMap(a=>run.series[a].map(r=>metrics.value(metrics.fromRow(r),metricKey)||0)));
    const axis=workload==='cc'?{min:.30,max:.42,ticks:[.30,.32,.34,.36,.38,.40,.42],decimals:2}:{min:.20,max:.24,ticks:[.20,.21,.22,.23,.24],decimals:2};
    plots.cost=makePlot('cost-chart',axis.min||0,axis.max,axis.ticks,v=>'$'+(v===0?'0':v.toFixed(axis.decimals)));
    $('cost-unit').textContent='Average so far · '+opt.unit;
    $('cost-chart').setAttribute('aria-label','User cost in '+opt.unit+' over the '+(WINDOW/60)+'-minute measurement window');
    document.querySelectorAll('[data-cost-label]').forEach(n=>n.textContent=opt.header);
    document.querySelectorAll('[data-cost-option]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.costOption===metricKey)));
    $('cost-formula').textContent=opt.formula;
    $('cost-tradeoff').textContent=opt.description+' '+opt.tradeoff;
    $('download-movie').hidden=!FleetView.isMovieReady(layout);
    $('download-movie').href=FleetView.moviePath(fleetOnly?'combined':'story',metricKey,layout)+'?v=fleet-v8';
    $('download-movie').textContent=fleetOnly?'Download combined MP4 ↓':'Download MP4 ↓';
    $('combined-link').href='combined.html?cost='+metricKey+'&layout='+(FleetView.isMovieReady(layout)?layout:'clean')+'&v=fleet-v8';
    $('film').dataset.cost=metricKey;
    $('metric-totals').textContent='Measurement-window totals ('+opt.unit+'): Dynamo+SGLang '+metrics.format(metrics.value(metrics.fromTotal(run.totals.dyn),metricKey),metricKey)+'; Evolving Infra '+metrics.format(metrics.value(metrics.fromTotal(run.totals.ours),metricKey),metricKey)+'. Provider revenue: '+money(run.totals.dyn.revenue)+' and '+money(run.totals.ours.revenue)+' respectively.';
  }
  configureCost();
  function drawPlot(key,t,values){
    const plot=plots[key];
    for(const arm of ['dyn','ours']){
      const points=run.series[arm].filter(r=>r[0]<=t).map(r=>[r[0],key==='revenue'?r[1]:metrics.value(metrics.fromRow(r),metricKey)]).filter(p=>p[1]!==null);
      const current=values[arm][key];if(current!==null)points.push([t,current]);
      plot.lines[arm].setAttribute('d',points.map((p,i)=>(i?'L':'M')+plot.x(p[0]).toFixed(2)+' '+plot.y(p[1]).toFixed(2)).join(' '));
      plot.dots[arm].style.display=current===null?'none':'';
      if(current!==null){plot.dots[arm].setAttribute('cx',plot.x(t));plot.dots[arm].setAttribute('cy',plot.y(current));}
    }
    const cursor=plot.svg.querySelector('.plot-cursor');cursor.setAttribute('x1',plot.x(t));cursor.setAttribute('x2',plot.x(t));
  }
  function renderRun(t){
    const values={dyn:sample('dyn',t),ours:sample('ours',t)};
    for(const arm of ['dyn','ours']){
      const r=values[arm];$('run-'+arm+'-calls').textContent=Math.floor(r.calls+1e-8).toLocaleString('en-US');
      $('run-'+arm+'-hit').textContent=r.hit===null?'—':(r.hit*100).toFixed(1)+'%';
      const fill=$('cache-fill-'+arm),track=fill.parentElement;
      fill.style.width=(r.hit===null?0:r.hit*100)+'%';
      if(r.hit===null){track.removeAttribute('aria-valuenow');track.setAttribute('aria-valuetext','No completed calls yet');}
      else{track.setAttribute('aria-valuenow',(r.hit*100).toFixed(2));track.setAttribute('aria-valuetext',(r.hit*100).toFixed(1)+' percent');}
      if(layout==='levels')fleetView.render(arm,t,tiles[arm]);
      $('revenue-'+arm).textContent=money(r.revenue);
      $('cost-'+arm).textContent=metrics.format(r.cost,metricKey);
    }
    drawPlot('revenue',t,values);drawPlot('cost',t,values);$('run-clock').textContent=fmt(t);
    const current=values.dyn.cost!==null&&values.ours.cost!==null&&values.dyn.cost>0;
    const lower=current?(1-values.ours.cost/values.dyn.cost)*100:null;
    const ratio=values.dyn.revenue>0?values.ours.revenue/values.dyn.revenue:null;
    const costResult=lower===null?'':Math.abs(lower)<.1?'Similar user cost (&lt;0.1% difference)':Math.abs(lower).toFixed(1)+'% '+(lower>=0?'lower':'higher')+' user cost';
    $('run-takeaway').innerHTML=current?(t>=WINDOW?'At '+(WINDOW/60)+' min: <b>'+ratio.toFixed(2)+'× provider revenue</b> · <b>'+costResult+'.</b>':'At '+fmt(t)+': <b>'+costResult+'.</b>'):'Serving up to '+run.slots.dyn+' agents concurrently on each system.';
  }
  function render(){
    const phase=time<SESSION_END?'session':'run';
    if(phase!==currentPhase){
      currentPhase=phase;$('session-scene').hidden=phase!=='session';$('run-scene').hidden=phase!=='run';
      $('film').dataset.scene=phase;
      $('eyebrow').textContent=phase==='session'?'ONE SESSION · CLAUDE CODE · GLM-5.2':run.slots.dyn+' CONCURRENT AGENTS · '+run.model.toUpperCase();
      $('title').textContent=phase==='session'?'Coding agents':run.label;
      $('setup').textContent=phase==='session'?'Same 25 model calls · 15,028 output tokens · GLM-5.2 · 126 agents at once on 36 GB300 GPUs':run.harness+' · '+run.model+' · '+(WINDOW/60)+'-minute measurement window · 36 GB300 GPUs per system';
      $('film-note').textContent=(phase==='session'?'Tool-call time omitted; illustrative terminal text. ':(layout==='levels'?'Original wall time. Tiles show grouped state counts, averaged over the preceding 60 seconds. ':'Original wall time. '))+metrics.options[metricKey].unit+'; all input and output charges included, at demo token prices.';
      document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chapter===phase)));
      resize();
    }
    $('film').style.opacity=phase==='session'?clamp((SESSION_END-time)/.25,0,1):clamp((time-SESSION_END)/.45,0,1);
    if(phase==='session'){
      const m=modelAt(time);renderArm('dyn',m.time);renderArm('ours',m.time);
      $('model-rate').textContent=m.time>=modelEnd?'End':m.rate+'×';
    }else {renderRun(clamp((time-SESSION_END-FLEET_INTRO)/RUN_DURATION*WINDOW,0,WINDOW));$('fleet-rate').textContent=Math.round(WINDOW/RUN_DURATION)+'×';}
    $('seek').value=String(time);$('video-clock').textContent=fmt(time);
  }
  function resize(){
    const mobile=innerWidth<=760,scale=$('film-wrap').clientWidth/1440;
    $('film').style.transform=mobile?'none':'scale('+scale+')';
    $('film-wrap').style.height=mobile?'auto':810*scale+'px';
  }
  new ResizeObserver(resize).observe($('film-wrap'));addEventListener('resize',resize);
  function setPlaying(value){playing=value;last=null;$('play').textContent=value?'Pause':'Play';$('play').setAttribute('aria-pressed',String(value));}
  function seek(value){setPlaying(false);time=clamp(Number(value)||0,0,TOTAL);render();}
  $('play').addEventListener('click',()=>{if(time>=TOTAL)time=0;setPlaying(!playing);render();});
  $('replay').addEventListener('click',()=>{time=0;setPlaying(true);render();});
  $('seek').addEventListener('input',e=>seek(e.target.value));
  document.querySelectorAll('[data-chapter]').forEach(b=>b.addEventListener('click',()=>{seek(b.dataset.chapter==='run'?SESSION_END:0);setPlaying(!reduced.matches);}));
  addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON','SUMMARY'].includes(document.activeElement.tagName)){e.preventDefault();setPlaying(!playing);}});
  document.addEventListener('visibilitychange',()=>{last=null;});
  function tick(now){if(playing&&!document.hidden){if(last!==null){time+=(now-last)/1000;if(time>TOTAL)time%=TOTAL;}last=now;render();}requestAnimationFrame(tick);}
  function setCost(key){metricKey='tokens';configureCost();currentPhase='';render();const url=new URL(location.href);url.searchParams.set('cost',metricKey);history.replaceState(null,'',url);}
  document.querySelectorAll('[data-cost-option]').forEach(b=>b.addEventListener('click',()=>setCost(b.dataset.costOption)));
  function setLayout(next){
    layout=next==='levels'?'levels':'clean';$('film').dataset.layout=layout;
    plots.revenue=makePlot('revenue-chart',0,revenueAxis.max,revenueAxis.ticks,v=>'$'+v.toLocaleString('en-US',{maximumFractionDigits:0}));
    configureCost();currentPhase='';render();resize();
    document.querySelectorAll('[data-layout-option]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layoutOption===layout)));
    const url=new URL(location.href);url.searchParams.set('layout',layout);url.searchParams.set('cost','tokens');history.replaceState(null,'',url);
  }
  document.querySelectorAll('[data-layout-option]').forEach(b=>b.addEventListener('click',()=>setLayout(b.dataset.layoutOption)));
  $('seek').max=String(TOTAL);$('video-duration').textContent=fmt(TOTAL);
  window.storyDemo={seek,setCost,setLayout,play(){setPlaying(true);},restart(){time=0;setPlaying(true);render();},modelRows(arm){return rows[arm];},state(){return {time,playing,layout,metric:metricKey,workload,fleetOnly,windowSeconds:WINDOW,fleetIntro:FLEET_INTRO,runDuration:RUN_DURATION,phase:currentPhase,total:TOTAL,sessionEnd:SESSION_END,modelEnd,modelVideo,stats};}};
  window.renderAt=seek;
  resize();setLayout(layout);setPlaying(playing);requestAnimationFrame(tick);
})();
