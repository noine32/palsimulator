(()=>{
  const $=selector=>document.querySelector(selector);

  function openTab(name){
    const button=$(`.tabs .tab[data-tab="${name}"]`);
    if(!button)return;
    button.click();
    requestAnimationFrame(()=>document.querySelector(`#tab-${name}`)?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function setup(){
    $('#dataStatusBar')?.addEventListener('click',()=>openTab('data'));
    $('#openPassiveBtn')?.addEventListener('click',()=>openTab('passive'));

    const summary=$('#ownedSummary');
    const bar=$('#dataStatusBar');
    if(!summary||!bar)return;
    const sync=()=>{
      const text=(summary.textContent||'').trim();
      bar.classList.toggle('has-data',Boolean(text&&text!=='—'&&!/^0体/.test(text)));
    };
    sync();
    new MutationObserver(sync).observe(summary,{childList:true,characterData:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
