(() => {
  const $=id=>document.getElementById(id),m=window.CostMetrics,data=window.FLEET_DATA;
  const qs=new URLSearchParams(location.search);
  let key='tokens';
  let layout=qs.get('layout')==='levels'?'levels':'clean';
  let workload=qs.get('workload')==='cua'?'cua':'cc';
  let minute=data[workload].windowSeconds/60,playing=false,last=null;
  const descriptions={
    tokens:['处理 token 的平均单价','总费用 ÷（输入 tokens ＋ 输出 tokens）× 1,000,000','适合对照 token 预算；长上下文和缓存输入在分母中占比很高。'],
    output:['生成同等数量输出所对应的账单','总费用 ÷ 输出 tokens × 1,000,000','输入与输出费用都计入。更接近“这些输出花了多少钱”，但仍受每次请求的输入/输出比例影响。'],
    call:['一次模型调用的平均账单','总费用 ÷ 已完成模型调用数','最容易解释为每轮调用的费用；不同调用长短不一，不能直接当作固定任务的价格。'],
  };
  const iframe=$('frame'),fmt=s=>{const n=Math.round(s);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
  function api(){return iframe.contentWindow?.storyDemo;}
  function seek(){
    const demo=api(),run=data[workload];
    if(demo&&demo.state().workload===workload){const state=demo.state();demo.seek(state.sessionEnd+state.fleetIntro+(minute*60/run.windowSeconds)*state.runDuration);}
    $('minute').value=String(minute);$('time').textContent=fmt(minute*60)+' / '+fmt(run.windowSeconds);
  }
  function updateCards(){
    const run=data[workload];
    $('window-note').textContent=run.model+' · '+run.slots.dyn+' concurrent slots · '+(run.windowSeconds/60)+'-minute window';
    $('minute').max=String(run.windowSeconds/60);
    $('pricing-note').textContent=run.model+'：每百万 tokens 为 $'+run.ratesPerMillion.input.toFixed(2)+' 未缓存输入、$'+run.ratesPerMillion.cachedInput.toFixed(2)+' 缓存输入、$'+run.ratesPerMillion.output.toFixed(2)+' 输出。';
    document.querySelectorAll('[data-workload]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.workload===workload)));
  }
  function select(next){
    key='tokens';document.querySelectorAll('[data-option]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.option===key)));
    const d=descriptions[key];$('meaning').textContent=d[0];$('formula').textContent=d[1];$('tradeoff').textContent=d[2];
    $('full-story').href=workload==='cc'?'story.html?cost='+key+'&layout='+layout+'&v=fleet-v7':'combined.html?cost='+key+'&chapter=cua&layout='+(FleetView.isMovieReady(layout)?layout:'clean')+'&v=fleet-v7';
    $('movie').hidden=!FleetView.isMovieReady(layout);
    $('combined').textContent=FleetView.isMovieReady(layout)?'看完整合片 ↗':'纯曲线合片 ↗';
    $('combined').href='combined.html?cost='+key+'&layout='+(FleetView.isMovieReady(layout)?layout:'clean')+'&v=fleet-v7';$('movie').href=FleetView.moviePath('combined',key,layout)+'?v=fleet-v7';
    if(api()&&api().state().workload===workload){api().setCost(key);api().setLayout(layout);seek();}
    const url=new URL(location.href);url.searchParams.set('cost',key);url.searchParams.set('workload',workload);url.searchParams.set('layout',layout);history.replaceState(null,'',url);
  }
  function setLayout(next){layout=next==='levels'?'levels':'clean';document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layout)));select(key);}
  document.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>setLayout(b.dataset.layout)));
  function setWorkload(next){
    const atEnd=Math.abs(minute-data[workload].windowSeconds/60)<.01;
    workload=next;minute=atEnd?data[workload].windowSeconds/60:Math.min(minute,data[workload].windowSeconds/60);
    setPlaying(false);updateCards();select(key);
    iframe.src='story.html?film=1&fleet=1&workload='+workload+'&cost='+key+'&layout='+layout+'&t=22&v=fleet-v7';
  }
  function setPlaying(value){playing=value;last=null;$('play').textContent=value?'暂停':'播放并发场景';}
  document.querySelectorAll('[data-option]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.option)));
  document.querySelectorAll('[data-workload]').forEach(b=>b.addEventListener('click',()=>setWorkload(b.dataset.workload)));
  $('play').addEventListener('click',()=>{if(minute>=data[workload].windowSeconds/60)minute=0;setPlaying(!playing);seek();});
  $('end').addEventListener('click',()=>{setPlaying(false);minute=data[workload].windowSeconds/60;seek();});
  $('minute').addEventListener('input',e=>{setPlaying(false);minute=Number(e.target.value);seek();});
  iframe.addEventListener('load',()=>{setLayout(layout);seek();});
  function resize(){iframe.style.transform='scale('+($('preview').clientWidth/1440)+')';}
  new ResizeObserver(resize).observe($('preview'));
  function tick(now){if(playing&&!document.hidden){if(last!==null)minute+=((now-last)/1000)*(data[workload].windowSeconds/60/18);if(minute>=data[workload].windowSeconds/60){minute=data[workload].windowSeconds/60;setPlaying(false);}seek();last=now;}requestAnimationFrame(tick);}
  updateCards();setLayout(layout);if(workload==='cua')setWorkload(workload);resize();requestAnimationFrame(tick);
})();
