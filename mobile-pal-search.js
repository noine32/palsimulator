(()=>{
  const normalize=s=>String(s??'').normalize('NFKC').replace(/[\u3041-\u3096]/g,ch=>String.fromCharCode(ch.charCodeAt(0)+0x60)).toLowerCase().trim();
  const optionValues=()=>[...document.querySelectorAll('#palOptions option')].map(o=>o.value).filter(Boolean);
  const recentKey=id=>`palbreeder-recent-${id}`;
  const getRecent=id=>{try{return JSON.parse(localStorage.getItem(recentKey(id))||'[]')}catch{return[]}};
  const saveRecent=(id,value)=>{if(!value)return;const xs=[value,...getRecent(id).filter(x=>x!==value)].slice(0,5);try{localStorage.setItem(recentKey(id),JSON.stringify(xs))}catch{}};
  const score=(value,q)=>{const v=normalize(value);if(!q)return 9;if(v===q)return 0;if(v.startsWith(q))return 1;const words=v.split(/\s+/);if(words.some(w=>w.startsWith(q)))return 2;if(v.includes(q))return 3;return 99};
  const isMobile=()=>matchMedia('(max-width:900px)').matches;
  const escapeHtml=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function rowsFor(inputId,q){
    const all=optionValues();
    if(!all.length)return[];
    const nq=normalize(q);
    if(!nq){
      const recent=getRecent(inputId).filter(v=>all.includes(v));
      const rest=all.filter(v=>!recent.includes(v)).slice(0,30-recent.length);
      return [...recent,...rest].slice(0,30).map((v,i)=>({v,recent:i<recent.length}));
    }
    return all.map(v=>({v,s:score(v,nq)})).filter(x=>x.s<99).sort((a,b)=>a.s-b.s||a.v.localeCompare(b.v,'ja')).slice(0,40);
  }

  function renderRows(container,inputId,q){
    const all=optionValues();
    if(!all.length){container.innerHTML='<div class="pal-search-empty">パルデータを読み込み中…</div>';return}
    const rows=rowsFor(inputId,q);
    if(!rows.length){container.innerHTML='<div class="pal-search-empty">一致するパルがありません</div>';return}
    container.innerHTML=rows.map(x=>`<button type="button" class="pal-search-option" role="option" data-value="${escapeHtml(x.v)}"><span>${escapeHtml(x.v)}</span>${x.recent?'<small>最近</small>':''}</button>`).join('');
  }

  function makeMobilePicker(input,inputId,button,choose){
    const modal=document.createElement('div');
    modal.className='pal-search-modal hidden';
    modal.innerHTML=`
      <div class="pal-search-modal-backdrop"></div>
      <section class="pal-search-sheet" role="dialog" aria-modal="true" aria-label="パル検索">
        <div class="pal-search-sheet-head">
          <button type="button" class="pal-search-sheet-close">閉じる</button>
          <strong>${inputId==='reverseInput'?'親パルを検索':'目的パルを検索'}</strong>
          <span></span>
        </div>
        <div class="pal-search-sheet-control">
          <input class="pal-search-sheet-input" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="名前 / 英名 / #番号で検索">
          <button type="button" class="pal-search-sheet-clear" aria-label="入力をクリア">×</button>
        </div>
        <div class="pal-search-sheet-results" role="listbox"></div>
      </section>`;
    document.body.appendChild(modal);
    const searchInput=modal.querySelector('.pal-search-sheet-input');
    const results=modal.querySelector('.pal-search-sheet-results');
    const closeBtn=modal.querySelector('.pal-search-sheet-close');
    const clearBtn=modal.querySelector('.pal-search-sheet-clear');
    let previousBodyOverflow='';
    let previousValue='';
    let suppressChoiceUntil=0;

    const updateViewport=()=>{
      const h=window.visualViewport?.height||window.innerHeight;
      modal.style.setProperty('--pal-search-vh',`${Math.round(h)}px`);
    };
    const open=()=>{
      if(!isMobile()||!modal.classList.contains('hidden'))return;
      previousValue=input.value;
      searchInput.value=input.value;
      renderRows(results,inputId,searchInput.value);
      updateViewport();
      previousBodyOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      document.body.classList.add('pal-search-open');
      modal.classList.remove('hidden');
      // Do not allow the same tap that opened the sheet to select a result.
      suppressChoiceUntil=performance.now()+350;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        searchInput.focus({preventScroll:true});
        searchInput.select();
      }));
    };
    const close=()=>{
      modal.classList.add('hidden');
      document.body.classList.remove('pal-search-open');
      document.body.style.overflow=previousBodyOverflow;
      input.blur();
    };

    // Open only after the tap has completed. Opening on pointerdown can place the
    // newly-created result row under the finger and cause accidental click-through.
    input.addEventListener('click',e=>{
      if(!isMobile())return;
      e.preventDefault();
      open();
    });
    input.addEventListener('keydown',e=>{
      if(!isMobile())return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}
    });

    searchInput.addEventListener('input',()=>renderRows(results,inputId,searchInput.value));
    searchInput.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return}
      if(e.key==='Enter'){
        const first=results.querySelector('.pal-search-option');
        if(first){e.preventDefault();choose(first.dataset.value);close()}
      }
    });
    results.addEventListener('click',e=>{
      if(performance.now()<suppressChoiceUntil)return;
      const el=e.target.closest('.pal-search-option');
      if(!el)return;
      choose(el.dataset.value);
      close();
    });
    clearBtn.addEventListener('click',()=>{searchInput.value='';renderRows(results,inputId,'');searchInput.focus({preventScroll:true})});
    closeBtn.addEventListener('click',()=>{input.value=previousValue;close()});
    modal.querySelector('.pal-search-modal-backdrop').addEventListener('click',close);
    window.visualViewport?.addEventListener('resize',()=>{if(!modal.classList.contains('hidden'))updateViewport()});
    window.visualViewport?.addEventListener('scroll',()=>{if(!modal.classList.contains('hidden'))updateViewport()});
    return{open,close};
  }

  function enhance(inputId,buttonId){
    const input=document.getElementById(inputId),button=document.getElementById(buttonId);
    if(!input||input.dataset.mobileSearchReady)return;
    input.dataset.mobileSearchReady='1';
    input.removeAttribute('list');
    input.setAttribute('inputmode','search');
    input.setAttribute('enterkeyhint','search');
    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-expanded','false');

    const parent=input.parentElement;
    parent.classList.add('pal-search-label');
    const wrap=document.createElement('div');
    wrap.className='pal-search-control';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);

    const clear=document.createElement('button');
    clear.type='button';
    clear.className='pal-search-clear';
    clear.setAttribute('aria-label','入力をクリア');
    clear.textContent='×';
    wrap.appendChild(clear);

    const panel=document.createElement('div');
    panel.className='pal-search-suggestions hidden';
    panel.setAttribute('role','listbox');
    parent.appendChild(panel);

    const closeInline=()=>{panel.classList.add('hidden');input.setAttribute('aria-expanded','false')};
    const choose=value=>{
      input.value=value;
      saveRecent(inputId,value);
      closeInline();
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      if(button&&!button.disabled){button.click();input.blur()}
    };

    const picker=makeMobilePicker(input,inputId,button,choose);
    const mobileMq=matchMedia('(max-width:900px)');
    const syncMobileInput=()=>{
      // On mobile this field acts as a launcher, not as the actual text editor.
      // readonly prevents the phone keyboard from appearing before the search sheet.
      input.readOnly=mobileMq.matches;
      if(mobileMq.matches){input.setAttribute('aria-haspopup','dialog')}
      else input.removeAttribute('aria-haspopup');
    };
    syncMobileInput();
    mobileMq.addEventListener?.('change',syncMobileInput);

    const renderInline=()=>{
      if(isMobile())return;
      renderRows(panel,inputId,input.value);
      panel.classList.remove('hidden');
      input.setAttribute('aria-expanded','true');
    };

    input.addEventListener('focus',renderInline);
    input.addEventListener('input',renderInline);
    input.addEventListener('keydown',e=>{
      if(isMobile())return;
      if(e.key==='Escape'){closeInline();input.blur();return}
      if(e.key==='Enter'){
        const first=panel.querySelector('.pal-search-option');
        if(!panel.classList.contains('hidden')&&first){e.preventDefault();choose(first.dataset.value);return}
        if(button&&!button.disabled){e.preventDefault();saveRecent(inputId,input.value);button.click();input.blur()}
      }
    });
    panel.addEventListener('click',e=>{
      if(isMobile())return;
      const el=e.target.closest('.pal-search-option');
      if(el)choose(el.dataset.value);
    });
    clear.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      if(isMobile())picker.open();
      else{input.focus();renderInline()}
    });
    button?.addEventListener('click',()=>saveRecent(inputId,input.value));
    document.addEventListener('pointerdown',e=>{if(!parent.contains(e.target))closeInline()});
  }

  const init=()=>{enhance('targetInput','searchBtn');enhance('reverseInput','reverseBtn')};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
