(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const mobile=()=>matchMedia('(max-width:900px)').matches;
  const icons={
    route:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    flow:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M9 5.5h4a4 4 0 0 1 4 4V16M13 13l4 3 4-3"/></svg>',
    reverse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 5 11l4 4M5 11h8a5 5 0 0 1 5 5v2"/></svg>',
    owned:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5zM4 8.5l8 4.5 8-4.5M12 13v8"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
    passive:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M12 13c-4 0-6-2-6-6 4 0 6 2 6 6ZM12 10c3.5 0 5.5-2 5.5-5.5-3.5 0-5.5 2-5.5 5.5Z"/></svg>',
    data:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4 4 0 1 1 .7-7.9A6 6 0 0 1 19 12a3 3 0 0 1-1 5.8M12 12v8M9 15l3-3 3 3"/></svg>',
    privacy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
  };

  function setup(){
    if($('#mobileBottomNav'))return;
    const nav=document.createElement('nav');
    nav.id='mobileBottomNav';
    nav.className='mobile-bottom-nav';
    nav.setAttribute('aria-label','メインメニュー');
    nav.innerHTML=[
      ['route','検索'],['flow','フロー'],['reverse','逆引き'],['owned','所持']
    ].map(([tab,label])=>`<button type="button" class="mobile-nav-button" data-mobile-tab="${tab}">${icons[tab]}<span>${label}</span></button>`).join('')+`<button type="button" class="mobile-nav-button" data-mobile-more aria-haspopup="dialog" aria-expanded="false">${icons.more}<span>その他</span></button>`;
    document.body.appendChild(nav);

    const menu=document.createElement('div');
    menu.id='mobileMoreMenu';
    menu.className='mobile-more-menu hidden';
    menu.innerHTML=`<div class="mobile-more-backdrop"></div><section class="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="その他のメニュー"><p class="mobile-more-title">その他の機能</p><button type="button" class="mobile-more-action" data-more-tab="passive">${icons.passive}<span>パッシブ継承</span></button><button type="button" class="mobile-more-action" data-more-data>${icons.data}<span>データ読込・クラウド同期</span></button><button type="button" class="mobile-more-action" data-more-tab="privacy">${icons.privacy}<span>データの扱い・プライバシー</span></button></section>`;
    document.body.appendChild(menu);

    const moreButton=nav.querySelector('[data-mobile-more]');
    let returnFocus=null;
    const openMenu=()=>{
      if(!mobile())return;
      returnFocus=document.activeElement;
      menu.classList.remove('hidden');
      moreButton.setAttribute('aria-expanded','true');
      menu.querySelector('.mobile-more-action')?.focus();
    };
    const closeMenu=({restoreFocus=false}={})=>{
      menu.classList.add('hidden');
      moreButton.setAttribute('aria-expanded','false');
      if(restoreFocus)returnFocus?.focus();
    };
    const syncActive=()=>{
      const active=$('.tab-panel.active')?.id?.replace(/^tab-/,'')||'route';
      nav.querySelectorAll('[data-mobile-tab]').forEach(button=>{
        const current=button.dataset.mobileTab===active;
        button.classList.toggle('active',current);
        if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
      });
      const moreActive=active==='passive'||active==='privacy';
      moreButton.classList.toggle('active',moreActive);
      if(moreActive)moreButton.setAttribute('aria-current','page');else moreButton.removeAttribute('aria-current');
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
    moreButton.addEventListener('click',()=>menu.classList.contains('hidden')?openMenu():closeMenu({restoreFocus:true}));
    menu.querySelectorAll('[data-more-tab]').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.moreTab;closeMenu();activate(tab)}));
    menu.querySelector('[data-more-data]')?.addEventListener('click',()=>{closeMenu();$('#dropZone')?.scrollIntoView({behavior:'smooth',block:'start'})});
    menu.querySelector('.mobile-more-backdrop')?.addEventListener('click',()=>closeMenu({restoreFocus:true}));
    menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeMenu({restoreFocus:true})}});
    document.addEventListener('click',event=>{if(event.target.closest('.tabs .tab'))requestAnimationFrame(syncActive)});
    new MutationObserver(syncActive).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
    syncActive();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
