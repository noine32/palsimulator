(()=>{
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];

  function sync(){
    const active=$('.tab-panel.active')?.id?.replace(/^tab-/,'')||'route';
    $$('.planner-mode-button').forEach(button=>{
      const selected=button.dataset.plannerMode===active;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-selected',String(selected));
    });
  }

  function activate(mode){
    const source=$(`.tabs .tab[data-tab="${mode}"]`);
    if(!source)return;
    source.click();
    requestAnimationFrame(()=>{
      sync();
      $(`#tab-${mode}`)?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  function setup(){
    const mode=$('#plannerMode');
    if(!mode)return;
    mode.querySelectorAll('[data-planner-mode]').forEach(button=>button.addEventListener('click',()=>activate(button.dataset.plannerMode)));
    document.addEventListener('click',event=>{
      if(event.target.closest('.tabs .tab'))requestAnimationFrame(sync);
    });
    new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
    sync();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
