(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const mobile=()=>matchMedia('(max-width:900px)').matches;
  const icons={
    route:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    flow:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M9 5.5h4a4 4 0 0 1 4 4V16M13 13l4 3 4-3"/></svg>',
    reverse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 5 11l4 4M5 11h8a5 5 0 0 1 5 5v2"/></svg>',
    owned:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5zM4 8.5l8 4.5 8-4.5M12 13v8"/></svg>',
    data:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4 4 0 1 1 .7-7.9A6 6 0 0 1 19 12a3 3 0 0 1-1 5.8M12 12v8M9 15l3-3 3 3"/></svg>'
  };

  function setup(){
    if($('#mobileBottomNav'))return;
    const nav=document.createElement('nav');
    nav.id='mobileBottomNav';
    nav.className='mobile-bottom-nav';
    nav.setAttribute('aria-label','メインメニュー');
    nav.innerHTML=[
      ['route','検索'],['flow','フロー'],['reverse','逆引き'],['owned','所持'],['data','データ']
    ].map(([tab,label])=>`<button type="button" class="mobile-nav-button" data-mobile-tab="${tab}">${icons[tab]}<span>${label}</span></button>`).join('');
    document.body.appendChild(nav);
    const syncActive=()=>{
      const active=$('.tab-panel.active')?.id?.replace(/^tab-/,'')||'route';
      nav.querySelectorAll('[data-mobile-tab]').forEach(button=>{
        const current=button.dataset.mobileTab===active;
        button.classList.toggle('active',current);
        if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
      });
    };
    const activate=tab=>{
      const source=$(`.tabs .tab[data-tab="${tab}"]`);
      if(!source)return;
      source.click();
      requestAnimationFrame(()=>{
        $(`#tab-${tab}`)?.scrollIntoView({behavior:'smooth',block:'start'});
        syncActive();
      });
    };

    nav.querySelectorAll('[data-mobile-tab]').forEach(button=>button.addEventListener('click',()=>activate(button.dataset.mobileTab)));
    document.addEventListener('click',event=>{if(event.target.closest('.tabs .tab'))requestAnimationFrame(syncActive)});
    new MutationObserver(syncActive).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
    syncActive();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
