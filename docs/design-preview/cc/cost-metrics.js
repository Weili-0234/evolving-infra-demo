// Alternative bill normalizations over the same completed-call cohort.
// These are all-token charges at the existing demo rates, not three price lists.
(() => {
  const options={
    tokens:{key:'tokens',letter:'A',name:'Per million total tokens',short:'Input + output tokens',header:'USER COST / 1M TOKENS',unit:'$ / 1M input + output tokens',decimals:3,max:.5,ticks:[0,.1,.2,.3,.4,.5],scale:1e6,
      denominator:r=>r.input+r.output,
      formula:'Total token charges ÷ (input + output tokens) × 1,000,000',
      description:'The effective blended price for all tokens processed. Cached input is counted once.',
      tradeoff:'Easy to compare with a token budget. Long cached prompts dominate the denominator.'},
    output:{key:'output',letter:'B',name:'Per million output tokens',short:'Output tokens',header:'USER COST / 1M OUTPUT',unit:'$ / 1M output tokens',decimals:2,max:60,ticks:[0,15,30,45,60],scale:1e6,
      denominator:r=>r.output,
      formula:'Total token charges ÷ output tokens × 1,000,000',
      description:'Includes both input and output charges, normalized by the generated output.',
      tradeoff:'Shows the bill per unit of output. It is not the output-token list price, and prompt/output mix still matters.'},
    call:{key:'call',letter:'C',name:'Per model call',short:'Model calls',header:'USER COST / CALL',unit:'$ / completed model call',decimals:4,max:.08,ticks:[0,.02,.04,.06,.08],scale:1,
      denominator:r=>r.calls,
      formula:'Total token charges ÷ completed model calls',
      description:'The average charge for one model request, including its input and output.',
      tradeoff:'Easy to read as a bill per interaction. Calls have different prompt and output lengths.'},
  };
  function value(r,key){const opt=options[key],denom=opt.denominator(r);return r.calls>0&&denom>0?r.charge/denom*opt.scale:null;}
  function fromRow(r){return {charge:r[1],calls:r[3],input:r[5],output:r[7]};}
  function fromTotal(r){return {charge:r.revenue,calls:r.calls,input:r.promptTokens,output:r.outputTokens};}
  function format(v,key){return v===null?'—':'$'+v.toLocaleString('en-US',{minimumFractionDigits:options[key].decimals,maximumFractionDigits:options[key].decimals});}
  window.CostMetrics={options,value,fromRow,fromTotal,format};
})();
