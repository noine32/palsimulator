(()=>{
  const normalize=s=>String(s??'').normalize('NFKC').replace(/[\u3041-\u3096]/g,ch=>String.fromCharCode(ch.charCodeAt(0)+0x60)).toLowerCase().trim();
  const optionValues=()=>[...document.querySelectorAll('#palOptions option')].map(o=>o.value).filter(Boolean);
  const recentKey=id=>`palbreeder-recent-${id}`;
  const getRecent=id=>{try{return JSON.parse(localStorage.getItem(recentKey(id))||'[]')}catch{return[]}};
  const saveRecent=(id,value)=>{if(!value)return;const xs=[value,...getRecent(id).filter(x=>x!==value)].slice(0,5);try{localStorage.setItem(recentKey(id),JSON.stringify(xs))}catch{}};
  const score=(value,q)=>{const v=normalize(value);if(!q)return 9;if(v===q)return 0;if(v.startsWith(q))return 1;const words=v.split(/\s+/);if(words.some(w=>w.startsWith(q)))return 2;if(v.includes(q))return 3;return 99};

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

    const render=()=>{
      const all=optionValues();
      if(!all.length){panel.innerHTML='<div class="pal-search-empty">パルデータを読み込み中…</div>';panel.classList.remove('hidden');return;}
      const q=normalize(input.value);
      let rows=[];
      if(!q){
        const recent=getRecent(inputId).filter(v=>all.includes(v));
        const rest=all.filter(v=>!recent.includes(v)).slice(0,8-recent.length);
        rows=[...recent,...rest].slice(0,8).map((v,i)=>({v,recent:i<recent.length}));
      }else{
        rows=all.map(v=>({v,s:score(v,q)})).filter(x=>x.s<99).sort((a,b)=>a.s-b.s||a.v.localeCompare(b.v,'ja')).slice(0,10);
      }
      if(!rows.length){panel.innerHTML='<div class="pal-search-empty">一致するパルがありません</div>';}
      else{
        panel.innerHTML=rows.map(x=>`<button type="button" class="pal-search-option" role="option" data-value="${x.v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}"><span>${x.v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>${x.recent?'<small>最近</small>':''}</button>`).join('');
      }
      panel.classList.remove('hidden');
      input.setAttribute('aria-expanded','true');
    };
    const close=()=>{panel.classList.add('hidden');input.setAttribute('aria-expanded','false')};
    const choose=value=>{
      input.value=value;
      saveRecent(inputId,value);
      close();
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      if(button&&!button.disabled){
        button.click();
        input.blur();
      }
    };

    input.addEventListener('focus',()=>{render();setTimeout(()=>input.scrollIntoView({block:'center',behavior:'smooth'}),80)});
    input.addEventListener('input',render);
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();input.blur();return}
      if(e.key==='Enter'){
        const first=panel.querySelector('.pal-search-option');
        if(!panel.classList.contains('hidden')&&first){e.preventDefault();choose(first.dataset.value);return}
        if(button&&!button.disabled){e.preventDefault();saveRecent(inputId,input.value);button.click();input.blur()}
      }
    });

    let touchStart=null;
    panel.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'||e.pointerType==='pen')touchStart={x:e.clientX,y:e.clientY,id:e.pointerId};
    });
    panel.addEventListener('pointercancel',()=>{touchStart=null});
    panel.addEventListener('pointerup',e=>{
      const el=e.target.closest('.pal-search-option');
      if(!el)return;
      if(e.pointerType==='touch'||e.pointerType==='pen'){
        if(!touchStart||touchStart.id!==e.pointerId)return;
        const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;
        touchStart=null;
        if(Math.hypot(dx,dy)>10)return;
      }
      choose(el.dataset.value);
    });
    panel.addEventListener('click',e=>{
      if(e.detail===0){
        const el=e.target.closest('.pal-search-option');
        if(el)choose(el.dataset.value);
      }
    });

    clear.addEventListener('click',()=>{input.value='';input.focus();render()});
    button?.addEventListener('click',()=>saveRecent(inputId,input.value));
    document.addEventListener('pointerdown',e=>{if(!parent.contains(e.target))close()});
  }

  const init=()=>{enhance('targetInput','searchBtn');enhance('reverseInput','reverseBtn')};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
