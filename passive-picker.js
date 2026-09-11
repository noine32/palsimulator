(()=>{
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const norm=value=>String(value??'').normalize('NFKC').toLowerCase().trim();

  function enhance(){
    const selects=$$('.passiveSelect');
    if(selects.length!==4||selects.some(select=>!select.options.length)||$('#passivePickerSheet'))return false;

    const selected=document.createElement('div');
    selected.id='selectedPassiveChips';selected.className='selected-passive-chips';
    selects[0].closest('.passive-ext-grid')?.after(selected);

    const sheet=document.createElement('div');
    sheet.id='passivePickerSheet';sheet.className='passive-picker-sheet hidden';
    sheet.innerHTML=`<div class="passive-picker-backdrop"></div><section class="passive-picker-dialog" role="dialog" aria-modal="true" aria-label="パッシブを選択"><div class="passive-picker-head"><button type="button" data-picker-close>閉じる</button><strong>パッシブを選択</strong><button type="button" data-picker-clear>解除</button></div><div class="passive-picker-search"><input type="search" inputmode="search" autocomplete="off" placeholder="パッシブ名で検索"></div><div class="passive-picker-options"></div></section>`;
    document.body.appendChild(sheet);
    const search=sheet.querySelector('input'),options=sheet.querySelector('.passive-picker-options');
    let active=0,previousOverflow='';

    const sync=()=>{
      $$('.passive-picker-launcher').forEach((button,index)=>{
        const option=selects[index].selectedOptions[0];
        button.textContent=selects[index].value?option.textContent:`パッシブ${index+1}を選択`;
        button.classList.toggle('has-value',Boolean(selects[index].value));
      });
      const values=selects.map((select,index)=>select.value?{index,name:select.selectedOptions[0].textContent}:null).filter(Boolean);
      selected.innerHTML=values.length?values.map(item=>`<button type="button" data-remove-passive="${item.index}">${esc(item.name)}<span aria-hidden="true">×</span></button>`).join(''):'<span class="muted">選択したパッシブがここに表示されます。</span>';
    };
    const render=()=>{
      const q=norm(search.value);
      const current=selects[active].value;
      const rows=[...selects[active].options].filter(option=>option.value&&(!q||norm(option.textContent).includes(q)));
      options.innerHTML=rows.length?rows.map(option=>`<button type="button" data-passive-value="${esc(option.value)}"${option.value===current?' class="active"':''}><span>${esc(option.textContent)}</span>${option.value===current?'<small>選択中</small>':''}</button>`).join(''):'<p class="muted">一致するパッシブがありません。</p>';
    };
    const open=index=>{
      active=index;search.value='';render();previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';sheet.classList.remove('hidden');
      requestAnimationFrame(()=>search.focus({preventScroll:true}));
    };
    const close=()=>{sheet.classList.add('hidden');document.body.style.overflow=previousOverflow};

    selects.forEach((select,index)=>{
      const button=document.createElement('button');button.type='button';button.className='passive-picker-launcher';button.addEventListener('click',()=>open(index));
      select.after(button);select.addEventListener('change',sync);
    });
    options.addEventListener('click',event=>{const button=event.target.closest('[data-passive-value]');if(!button)return;selects[active].value=button.dataset.passiveValue;selects[active].dispatchEvent(new Event('change',{bubbles:true}));close()});
    selected.addEventListener('click',event=>{const button=event.target.closest('[data-remove-passive]');if(!button)return;const select=selects[Number(button.dataset.removePassive)];select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));});
    search.addEventListener('input',render);
    sheet.querySelector('[data-picker-close]').addEventListener('click',close);
    sheet.querySelector('[data-picker-clear]').addEventListener('click',()=>{selects[active].value='';selects[active].dispatchEvent(new Event('change',{bubbles:true}));close()});
    sheet.querySelector('.passive-picker-backdrop').addEventListener('click',close);
    sheet.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}});
    $('#presetSelect')?.addEventListener('change',()=>requestAnimationFrame(sync));
    sync();return true;
  }

  if(!enhance()){
    const observer=new MutationObserver(()=>{if(enhance())observer.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
  }
})();
