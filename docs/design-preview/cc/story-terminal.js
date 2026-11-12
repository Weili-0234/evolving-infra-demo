/*
 * Original presentation code for an illustrative Claude Code terminal.
 * Request timing and token counts come from session-data.js. The transcript,
 * tools, filenames, diffs and test output below are authored examples, not logs.
 */
(() => {
  'use strict';
  const read = (path, count) => ({name:'Read', argument:path, result:`Read ${count} lines`});
  const bash = (command, result, pass=false) => ({name:'Bash', argument:command, result, pass});
  const edit = (path, result, diff) => ({name:'Update', argument:path, result, diff});
  const script = [
    {text:"I'll trace the search state and check the existing tests.", tools:[bash('rg --files src/search tests/search', 'src/search/useSearch.ts\nsrc/search/SearchPage.tsx\ntests/search/pagination.test.ts')]},
    {text:"I'll start with the hook that owns the filters and page number, then follow the change handler into the search page.", tools:[read('src/search/useSearch.ts',124),read('src/search/SearchPage.tsx',86)]},
    {text:"The filter handler updates the filter values, but leaves the previous page in state. A new search can therefore request page 4 even when it has only one page of results.", tools:[{name:'Grep',argument:'"setFilters|setPage|onFilterChange" (src/search)',result:'Found 8 matches in 2 files'}]},
    {text:"I'll check how the tests initialize the hook before adding a regression case.", tools:[read('tests/search/pagination.test.ts',92)]},
    {text:"There are two different transitions here:\n\n  1. Changing a filter starts a new search at page 1.\n  2. Moving to another page keeps the current filters.\n\nI'll cover both, including a filter change from a later page. The reset should live in the filter handler so every caller gets the same behavior.", tools:[edit('tests/search/pagination.test.ts','Added 12 lines',[
      [35,'context','describe("search pagination", () => {'],
      [36,'add','+  it("resets the page when a filter changes", () => {'],
      [37,'add','+    const { result } = renderSearch({ page: 4 });'],
      [38,'add','+    act(() => result.current.setFilters({ status: "open" }));'],
      [39,'add','+    expect(result.current.page).toBe(1);'],
      [40,'add','+  });'],
    ])]},
    {text:"First I'll run the new case against the current implementation.",tools:[bash('npm test -- pagination.test.ts','FAIL  tests/search/pagination.test.ts\n  × resets the page when a filter changes\n    Expected: 1\n    Received: 4')]},
    {text:"The regression reproduces the bug. I'll reset the page in the same state update as the filters, so the next request sees both changes together.",tools:[read('src/search/useSearch.ts',124)]},
    {text:"The functional update also keeps changes from racing with another state update. Page navigation will continue to use its own handler.",tools:[edit('src/search/useSearch.ts','Added 5 lines, removed 1 line',[
      [47,'context','const setFilters = (patch: Partial<SearchFilters>) => {'],
      [48,'remove','-  setState({ ...state, filters: { ...state.filters, ...patch } });'],
      [48,'add','+  setState(previous => ({'],
      [49,'add','+    ...previous,'],
      [50,'add','+    filters: { ...previous.filters, ...patch },'],
      [51,'add','+    page: 1,'],
      [52,'add','+  }));'],
      [53,'context','};'],
    ])]},
    {text:"I'll rerun the pagination tests.",tools:[bash('npm test -- pagination.test.ts','PASS  tests/search/pagination.test.ts\n  ✓ resets the page when a filter changes\n  ✓ keeps filters while moving to the next page\nTests: 8 passed, 8 total',true)]},
    {text:"The reset passes. I'll check the URL synchronization too: back/forward navigation should restore the selected page instead of triggering a filter reset.",tools:[read('src/search/useSearchParams.ts',74)]},
    {text:"The URL restore path replaces the state directly, so it can preserve the page from history. I'll add coverage for changing more than one filter at a time and clearing an existing filter.",tools:[edit('tests/search/pagination.test.ts','Added 14 lines',[
      [54,'add','+  it("resets after a multi-filter change", () => {'],
      [55,'add','+    const { result } = renderSearch({ page: 3 });'],
      [56,'add','+    act(() => result.current.setFilters({'],
      [57,'add','+      status: "closed", owner: "me",'],
      [58,'add','+    }));'],
      [59,'add','+    expect(result.current.page).toBe(1);'],
      [60,'add','+  });'],
    ])]},
    {text:"I'll verify the page handler leaves the filter object alone. The important part is that changing pages does not flow back through setFilters.\n\nThe hook already has separate handlers, so the fix can stay small: one state update and regression coverage around the existing API.",tools:[read('src/search/useSearch.ts',124),bash('git diff --stat','src/search/useSearch.ts          |  6 +++++-\ntests/search/pagination.test.ts | 26 ++++++++++++++++++++++++++')]},
    {text:"I'll make the filter-preservation test explicit about the complete filter object, and check that neither transition mutates the previous state.",tools:[edit('tests/search/pagination.test.ts','Added 9 lines',[
      [75,'context','it("keeps filters while changing pages", () => {'],
      [76,'add','+  const filters = { status: "open", owner: "me" };'],
      [77,'add','+  const { result } = renderSearch({ filters, page: 1 });'],
      [78,'add','+  act(() => result.current.setPage(2));'],
      [79,'add','+  expect(result.current.filters).toEqual(filters);'],
      [80,'add','+  expect(result.current.page).toBe(2);'],
      [81,'context','});'],
    ])]},
    {text:"The updated tests now cover reset, preservation, multi-filter changes, and clearing a filter.",tools:[bash('npm test -- pagination.test.ts','PASS  tests/search/pagination.test.ts\nTests: 11 passed, 11 total',true)]},
    {text:"I'll check the search-page integration to make sure the filter component uses the updated handler.",tools:[{name:'Grep',argument:'"onFilterChange|setFilters" (src/search/SearchPage.tsx)',result:'42: onFilterChange={setFilters}\n61: onPageChange={setPage}'}]},
    {text:"Both callbacks are wired correctly. I'll add one integration case for the request that follows a filter change.",tools:[edit('tests/search/pagination.test.ts','Added 7 lines',[
      [97,'add','+  it("requests page 1 with the new filters", async () => {'],
      [98,'add','+    const search = renderSearch({ page: 4 });'],
      [99,'add','+    await search.changeFilter("status", "open");'],
      [100,'add','+    expect(lastRequest()).toMatchObject({'],
      [101,'add','+      page: 1, status: "open",'],
      [102,'add','+    });'],
      [103,'add','+  });'],
    ])]},
    {text:"I'll run all search tests together.",tools:[bash('npm test -- tests/search','PASS  tests/search/pagination.test.ts\nTests: 12 passed, 12 total',true)]},
    {text:"The search tests pass. I'll check the TypeScript types next.",tools:[bash('npm run typecheck','> tsc --noEmit\nCompleted without errors.',true)]},
    {text:"I'll review the final diff.",tools:[bash('git diff --check','No whitespace errors.',true)]},
    {text:"The production change is confined to setFilters. It merges the filter patch with the previous filters and resets page to 1 in one update.\n\nThe tests cover the state transitions and the request they produce. I'll take one last look at the callback dependencies and history handling.",tools:[read('src/search/useSearch.ts',124)]},
    {text:"The callback uses a functional state update, so it does not capture an old filter or page value. The history restore path is unchanged, and page navigation keeps the selected filters.\n\nNo additional component changes are needed. I'll verify the final working tree and rerun the focused tests after the review.",tools:[bash('git diff --stat','src/search/useSearch.ts          |  6 +++++-\ntests/search/pagination.test.ts | 42 ++++++++++++++++++++++++++++++++++++++++++\n2 files changed, 47 insertions(+), 1 deletion(-)')]},
    {text:"I'll run the final regression check.",tools:[bash('npm test -- tests/search','PASS  tests/search/pagination.test.ts\nTests: 12 passed, 12 total',true)]},
    {text:"All regression cases pass. I'll confirm the change only touches the hook and its tests.",tools:[bash('git status --short','M src/search/useSearch.ts\nM tests/search/pagination.test.ts')]},
    {text:"The final patch is ready: filter changes reset pagination, and moving between pages preserves the filters.",tools:[bash('git diff --check','No whitespace errors.',true)]},
    {text:"Fixed the pagination reset.\n\n  • Filter changes now reset the page to 1.\n  • Page navigation preserves the selected filters.\n  • Added regression coverage for both paths.\n\nAll 12 tests pass; typecheck is clean.",tools:[]},
  ];
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const seconds=value=>{const n=Math.max(0,Math.floor(value));return n<60?n+'s':Math.floor(n/60)+'m '+n%60+'s';};
  const glyphs=['·','✢','✳','✶','✻','✽','✻','✶','✳','✢'];

  function toolNode(tool) {
    const root=el('div','cc-tool');
    const title=el('div','cc-tool-title');
    const name=el('span');name.append(el('strong','',tool.name),el('span','cc-argument','('+tool.argument+')'));
    title.append(el('span','cc-bullet','●'),name);root.append(title);
    const result=el('div','cc-result');
    const marker=el('span','cc-result-marker');marker.setAttribute('aria-hidden','true');
    result.append(marker,el('pre',tool.pass?'cc-test-pass':'',tool.result));
    root.append(result);
    let diff=null;
    if(tool.diff){
      diff=el('div','cc-diff');
      for(const [number,kind,code] of tool.diff){
        const row=el('div','cc-diff-row '+kind);
        row.append(el('span','cc-line-number',String(number)),el('span','cc-line-code',code));diff.append(row);
      }
      root.append(diff);
    }
    return {root,result,diff};
  }

  function mount(root, rows) {
    root.replaceChildren();
    const title=el('div','cc-titlebar','search-ui — claude');
    const buttons=el('span','cc-window-buttons');buttons.setAttribute('aria-hidden','true');
    buttons.append(el('i'),el('i'),el('i'));title.append(buttons);
    const scroll=el('div','cc-scroll');scroll.dataset.scroll='';
    const welcome=el('div','cc-welcome');
    const mascot=el('pre','cc-mascot',' ▐▛███▜▌\n▝▜█████▛▘\n  ▘▘ ▝▝');mascot.setAttribute('aria-hidden','true');
    const welcomeText=el('div');welcomeText.append(el('strong','','Claude Code'),el('p','','GLM-5.2 · API Usage'),el('p','','~/workspace/search-ui'));
    welcome.append(mascot,welcomeText);
    const user=el('div','cc-user');user.append(el('span','','❯'),el('p','','Fix pagination when the search filters change. Keep the\nselected filters when paging, and add regression tests.'));
    scroll.append(welcome,user);
    const entries=rows.map((_,index)=>{
      const scene=script[index],entry=el('div','cc-entry');
      const response=el('div','cc-response'),text=el('p');response.append(el('span','cc-bullet','●'),text);entry.append(response);
      const tools=el('div','cc-tools'),nodes=scene.tools.map(toolNode);nodes.forEach(n=>tools.append(n.root));entry.append(tools);scroll.append(entry);
      return {scene,entry,text,tools,nodes,shown:-1};
    });
    const bottom=el('div','cc-bottom'),working=el('div','cc-working');
    const spinner=el('span','cc-spinner','✻'),verb=el('span','','Thinking…'),detail=el('small');working.append(spinner,verb,detail);
    const prompt=el('div','cc-prompt');const cursor=el('span','cc-cursor');prompt.append(el('span','','❯'),cursor);
    const footer=el('div','cc-footer'),mode=el('span','cc-mode');
    const arrows=el('span','cc-mode-arrows');arrows.setAttribute('aria-hidden','true');
    arrows.append(el('i'),el('i'));mode.append(arrows,document.createTextNode(' accept edits on'),el('small','',' (shift+tab to cycle)'));
    const hint=el('span','','esc to interrupt');footer.append(mode,hint);
    bottom.append(working,prompt,footer);root.append(title,scroll,bottom);
    const end=Math.max(...rows.map(r=>r[2]));
    return {
      render(t,videoTime,reducedMotion){
        let complete=0,active=null,decoding=false;
        rows.forEach((r,index)=>{
          const node=entries[index],finished=t+1e-8>=r[2],started=t+1e-8>=r[0];
          const fraction=finished?1:t<r[1]?0:Math.min(1,Math.max(0,(t-r[1])/Math.max(1e-8,r[2]-r[1])));
          node.entry.hidden=fraction===0;
          const length=Math.floor(node.scene.text.length*Math.min(1,fraction/.85));
          if(node.shown!==length){node.text.textContent=node.scene.text.slice(0,length);node.shown=length;}
          node.tools.hidden=(!finished&&fraction<.85)||!node.nodes.length;
          node.nodes.forEach(n=>{n.root.classList.toggle('is-complete',finished);n.result.hidden=!finished;if(n.diff)n.diff.hidden=!finished;});
          if(finished)complete++;
          if(started&&!finished){active=r;if(t>=r[1])decoding=true;}
        });
        const done=complete===rows.length;
        const duration=done?end:active?t-active[0]:0;
        const tokens=active&&t>=active[1]?Math.floor(active[6]*Math.min(1,(t-active[1])/Math.max(1e-8,active[2]-active[1]))):0;
        working.classList.toggle('done',done);
        spinner.textContent=done||reducedMotion?'✻':glyphs[Math.floor(videoTime*8)%glyphs.length];
        verb.textContent=done?'Worked for '+seconds(end):decoding?'Working…':'Thinking…';
        detail.textContent=done?'':'('+seconds(duration)+' · ↓ '+tokens.toLocaleString('en-US')+' tokens)';
        hint.textContent=done?'? for shortcuts':'esc to interrupt';
        cursor.style.opacity=reducedMotion||Math.floor(videoTime*2)%2===0?'1':'0';
        scroll.scrollTop=Math.max(0,scroll.scrollHeight-scroll.clientHeight);
        root.dataset.completed=String(complete);
      }
    };
  }
  window.CCTerminal={mount};
})();
