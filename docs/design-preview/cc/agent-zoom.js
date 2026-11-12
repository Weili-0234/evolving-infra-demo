/* Deterministic geometric zoom: the completed screen becomes one session in a cluster. */
(() => {
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
 const lerp=(a,b,t)=>a+(b-a)*t;
 const rect=(node,r)=>{for(const k of ['left','top','width','height'])node.style[k]=r[k]+'px';};
 function mount(film,workload,slots){
  const root=document.createElement('div');root.className='agent-zoom';root.hidden=true;
  const start=workload==='cua'?[{left:6.75,top:223.5,width:711,height:401.25},{left:722.25,top:223.5,width:711,height:401.25}]:[{left:8,top:224,width:708,height:400},{left:724,top:224,width:708,height:400}];
  const hole=r=>`M${r.left} ${r.top}h${r.width}v${r.height}h-${r.width}Z`;
  root.innerHTML='<svg class="zoom-backdrop" viewBox="0 0 1440 810" aria-hidden="true"><defs><clipPath id="zoom-background-mask"><path clip-rule="evenodd" d="M0 0H1440V810H0Z '+start.map(hole).join(' ')+'"/></clipPath></defs><image href="zoom-'+workload+'-stage.jpg?v=zoom-v9" width="1440" height="810" clip-path="url(#zoom-background-mask)"/></svg>';
  const backdrop=root.firstElementChild,arms=[];
  ['dyn','ours'].forEach((arm,index)=>{
   const cluster=document.createElement('div');cluster.className='zoom-cluster '+arm;
   const name=document.createElement('span');name.className='zoom-cluster-name';name.textContent=arm==='dyn'?'Dynamo+SGLang':'Evolving Infra';cluster.append(name);
   const count=document.createElement('span');count.className='zoom-cluster-count';count.textContent=slots[arm]+' agents running concurrently';cluster.append(count);
   const cols=slots[arm]===126?14:16,rows=Math.ceil(slots[arm]/cols),cells=[];
   for(let q=0;q<slots[arm];q++){const cell=document.createElement('i');cell.className='zoom-window';cluster.append(cell);cells.push(cell);}
   root.append(cluster);
   const screen=document.createElement('div');screen.className='zoom-screen '+arm;
   const image=document.createElement('img');image.src='zoom-'+workload+'-'+arm+'.jpg?v=zoom-v9';image.alt='The completed '+(workload==='cua'?'computer-use task':'coding session');screen.append(image);root.append(screen);
   arms.push({cluster,screen,cells,cols,rows,start:start[index],index});
  });
  film.append(root);
  return {render(t,layout){
   const mobile=innerWidth<=760;
   if(t<0||t>=2.8||mobile){root.hidden=true;film.dataset.zooming='false';return {content:1,heading:1};}
   root.hidden=false;film.dataset.zooming='true';
   const shrink=ease((t-.15)/1.85),reveal=ease((t-.35)/.8),handoff=ease((t-2.2)/.6);
   backdrop.style.opacity=1-ease(t/.55);
   arms.forEach(a=>{
    const destination={left:a.index?736:27,top:164,width:677,height:layout==='levels'?lerp(350,174,handoff):350};
    const box=Object.fromEntries(['left','top','width','height'].map(k=>[k,lerp(a.start[k],destination[k],shrink)]));
    const pitchX=(box.width-24)/a.cols,pitchY=(box.height-24)/a.rows;
    const col=Math.floor(a.cols/2),row=Math.floor(a.rows/2),w=Math.min(pitchX-5,(pitchY-6)*a.start.width/a.start.height),h=w*a.start.height/a.start.width;
    const target={left:box.left+12+col*pitchX+(pitchX-5-w)/2,top:box.top+12+row*pitchY+(pitchY-h)/2,width:w,height:h};
    rect(a.cluster,box);a.cluster.style.opacity=reveal*(1-handoff);
    a.cells.forEach((cell,q)=>{rect(cell,{left:12+(q%a.cols)*pitchX,top:12+Math.floor(q/a.cols)*pitchY,width:pitchX-5,height:pitchY-6});cell.style.opacity=q===row*a.cols+col?0:clamp((t-.65)/.9);});
    rect(a.screen,Object.fromEntries(['left','top','width','height'].map(k=>[k,lerp(a.start[k],target[k],shrink)])));a.screen.style.opacity=1-handoff;
   });
   return {content:handoff,heading:ease((t-.45)/.45)};
  }};
 }
 window.AgentZoom={mount};
})();
