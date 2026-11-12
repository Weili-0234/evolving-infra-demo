(() => {
  'use strict';
  // Two summary cards per workload, rendered deterministically from seek(t).
  // Card k occupies [k*CARD, (k+1)*CARD): fade in from black, grow bars, hold, fade to black.
  const D=window.SUMMARY_DATA.workloads,$=id=>document.getElementById(id),qs=new URLSearchParams(location.search);
  const CARD=5,TOTAL=2*CARD,FADE_IN=.35,FADE_OUT=.3,GROW=.8,STAGGER=.12,BAR_MAX=800,BAR_LEFT=520;
  const NAMES={ours:'Evolving Infra',dyn:'Dynamo+SGLang'};
  const film=qs.has('film');if(film)document.body.classList.add('export');
  let workload=qs.get('workload')==='cc'?'cc':'cua',time=Math.max(0,Math.min(TOTAL,Number(qs.get('t'))||0)),playing=!film,last=null,cards=[];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),easeOut=x=>1-Math.pow(1-clamp(x,0,1),3),easeInOut=x=>{x=clamp(x,0,1);return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;};
  const secs=v=>v.toFixed(1)+' s',money2=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),money4=v=>'$'+v.toFixed(4),count=v=>Math.round(v).toLocaleString('en-US');
  function gain(ours,dyn,lower){
    const r=lower?dyn/ours:ours/dyn,word=lower?'lower':'higher';
    if(r>=1.5)return (r>=10?String(Math.round(r)):r.toFixed(1))+'× '+word;
    const pct=lower?(1-ours/dyn)*100:(ours/dyn-1)*100;
    return (pct>=10?String(Math.round(pct)):pct.toFixed(1))+'% '+word;
  }
  function spec(w){
    const d=D[w],cua=w==='cua',mins=d.windowSeconds/60,agents=d.agents;
    const who=cua?agents+' computer-use agents':agents+' coding agents';
    const setup=(cua?agents+' computer-use agents with Kimi K2.6':agents+' Claude Code agents with GLM-5.2')+' on 36 NVIDIA GB300 GPUs per system, measured over '+mins+' minutes after warmup.';
    return {eyebrow:cua?'Computer use with Kimi K2.6':'Claude Code with GLM-5.2',cards:[
      {title:'Latency across all '+who,groups:[
        {label:'Mean end-to-end latency per request',key:'e2eMean',fmt:secs,lower:true},
        {label:'P95 time to first token',key:'ttftP95',fmt:secs,lower:true}],
       foot:[setup,'Latency is measured at the agent client for every model call completed in that window: '+count(d.arms.dyn.calls)+' calls on Dynamo+SGLang and '+count(d.arms.ours.calls)+' on Evolving Infra.']},
      {title:'Throughput, revenue and user cost',groups:[
        {label:'Completed model calls per minute',key:'callsPerMinute',fmt:count,lower:false},
        {label:cua?'Provider revenue in the 55-minute window':'Provider revenue in the hour',key:'revenue',fmt:money2,lower:false},
        {label:'User cost per 1M tokens',key:'userCostPerMillionTokens',fmt:money4,lower:true}],
       foot:[setup,'User cost is all token charges divided by all input and output tokens, at demo token prices. Revenue is the sum of those charges.']}]};
  }
  function build(){
    const stage=$('stage');stage.querySelectorAll('.card').forEach(n=>n.remove());cards=[];
    const s=spec(workload),arms=D[workload].arms;
    s.cards.forEach((c,k)=>{
      const el=document.createElement('section');el.className='card';
      el.innerHTML='<p class="eyebrow"></p><h1 class="title"></h1><div class="groups"></div><div class="foot"><p class="main"></p><p class="detail"></p></div>';
      el.querySelector('.eyebrow').textContent=s.eyebrow;el.querySelector('.title').textContent=c.title;
      el.querySelector('.main').textContent=c.foot[0];el.querySelector('.detail').textContent=c.foot[1];
      const box=el.querySelector('.groups'),pitch=c.groups.length===2?232:212;
      box.style.top=(c.groups.length===2?376:304)+'px';
      const rows=[];
      c.groups.forEach((g,i)=>{
        const ge=document.createElement('div');ge.className='group';ge.style.position='absolute';ge.style.left='0';ge.style.right='0';ge.style.top=(i*pitch)+'px';
        ge.innerHTML='<p class="group-label"></p>';ge.querySelector('.group-label').textContent=g.label;ge.querySelector('.group-label').style.margin='0';
        const max=Math.max(arms.ours[g.key],arms.dyn[g.key]);
        ['ours','dyn'].forEach((a,j)=>{
          const r=document.createElement('div');r.className='row '+a;r.style.top=(48+j*62)+'px';
          r.innerHTML='<span class="name"></span><span class="bar"></span><span class="value"><span class="num"></span><span class="ratio"></span></span>';
          r.querySelector('.name').textContent=NAMES[a];r.querySelector('.num').textContent=g.fmt(arms[a][g.key]);
          r.querySelector('.ratio').textContent=a==='ours'?gain(arms.ours[g.key],arms.dyn[g.key],g.lower):'';
          ge.appendChild(r);rows.push({row:r,group:i,width:BAR_MAX*arms[a][g.key]/max});
        });
        box.appendChild(ge);
      });
      stage.insertBefore(el,$('black'));cards.push({el,rows});
    });
    $('note').textContent=workload==='cua'?'Computer-use agents: 55-minute scored window (1,800–5,100 s after the run start). Latency and throughput use the same completed-call cohort as the fleet charts.':'Coding agents: 60-minute scored window (1,800–5,400 s after the run start). Latency and throughput use the same completed-call cohort as the fleet charts.';
    document.querySelectorAll('[data-workload]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.workload===workload)));
  }
  function render(){
    cards.forEach((c,k)=>{
      const u=time-k*CARD,inside=u>=0&&(u<CARD||(k===cards.length-1&&u<=CARD));
      const alpha=!inside?0:Math.min(easeInOut(u/FADE_IN),easeInOut((CARD-u)/FADE_OUT));
      c.el.style.opacity=String(alpha);c.el.style.visibility=alpha>0?'visible':'hidden';
      for(const r of c.rows){
        const g=easeOut((u-FADE_IN-STAGGER*r.group)/GROW),w=r.width*g;
        r.row.querySelector('.bar').style.width=w.toFixed(2)+'px';
        const v=r.row.querySelector('.value');v.style.left=(BAR_LEFT+w+18).toFixed(2)+'px';v.style.opacity=String(clamp(g*2.5-.5,0,1));
        const ratio=r.row.querySelector('.ratio');ratio.style.opacity=String(easeInOut((u-FADE_IN-STAGGER*r.group-GROW)/.3));
      }
    });
    $('seek').value=String(time);$('clock').textContent=time.toFixed(1)+' s';
  }
  function resize(){if(film)return;const s=$('wrap').clientWidth/1920;$('stage').style.transform='scale('+s+')';}
  function seek(t){time=clamp(Number(t)||0,0,TOTAL);render();}
  function setPlaying(v){playing=v;last=null;$('play').textContent=v?'Pause':'Play';}
  function tick(now){if(playing){if(last!==null){time+=(now-last)/1000;if(time>TOTAL)time=0;render();}last=now;}requestAnimationFrame(tick);}
  $('play').addEventListener('click',()=>setPlaying(!playing));
  $('seek').addEventListener('input',e=>{setPlaying(false);seek(e.target.value);});
  document.querySelectorAll('[data-workload]').forEach(b=>b.addEventListener('click',()=>{workload=b.dataset.workload;build();seek(0);setPlaying(true);const url=new URL(location.href);url.searchParams.set('workload',workload);history.replaceState(null,'',url);}));
  new ResizeObserver(resize).observe($('wrap'));addEventListener('resize',resize);
  build();resize();render();if(playing)requestAnimationFrame(tick);
  window.summaryDemo={seek,state(){return {time,total:TOTAL,workload,card:CARD,playing};}};
})();
