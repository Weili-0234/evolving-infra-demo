/* Two presentations of the same measured fleet. Levels show counts, not identities. */
(() => {
  const clamp=x=>Math.max(0,Math.min(1,x));
  const colors={I:[24,27,35],T:[23,40,70],G:[16,55,42],W:[74,56,18]};
  const borders={I:[42,46,57],T:[54,79,121],G:[48,142,106],W:[176,127,42]};
  const mix=(palette,weights)=>'rgb('+[0,1,2].map(c=>Math.round(Object.keys(weights).reduce((v,k)=>v+palette[k][c]*weights[k],0))).join(',')+')';
  function prepare(run){
    const levels={};
    for(const arm of ['dyn','ours']){
      const raw=run.grid[arm].map(row=>Object.fromEntries(['W','G','T','I'].map(k=>[k,[...row].filter(c=>c===k).length])));
      levels[arm]=raw.map((_,i)=>{const rows=raw.slice(Math.max(0,i-6),i+1);return Object.fromEntries(['W','G','T','I'].map(k=>[k,rows.reduce((s,r)=>s+r[k],0)/rows.length]));});
    }
    return {render(arm,t,tiles){
      const rows=levels[arm],i=Math.min(rows.length-1,Math.floor(t/run.sampleSeconds)),j=Math.min(i+1,rows.length-1),f=clamp((t-i*run.sampleSeconds)/run.sampleSeconds);
      const n=Object.fromEntries(['W','G','T','I'].map(k=>[k,rows[i][k]+(rows[j][k]-rows[i][k])*f]));
      const cols=tiles.length===126?14:16,totalRows=Math.ceil(tiles.length/cols);
      tiles.forEach((tile,q)=>{
        const rank=(totalRows-1-Math.floor(q/cols))*cols+q%cols;
        const w=clamp(n.W-rank),g=clamp(n.W+n.G-rank)-w,tool=clamp(n.W+n.G+n.T-rank)-w-g;
        const weights={W:w,G:g,T:tool,I:Math.max(0,1-w-g-tool)};
        for(const k of ['W','G','T'])tile._glyphs[k].style.opacity=weights[k];
        tile.style.backgroundColor=mix(colors,weights);tile.style.borderColor=mix(borders,weights);
      });
      return n;
    }};
  }
  const moviePath=(kind,key,layout)=>(kind==='combined'?(key==='tokens'?'combined-preview':'combined-'+key):'story'+(key==='tokens'?'':'-'+key))+(layout==='levels'?'-levels':'')+'.mp4';
  window.FleetView={prepare,moviePath,isMovieReady:()=>true};
})();
