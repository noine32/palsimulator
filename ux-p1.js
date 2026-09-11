(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const statusForRow=status=>{
    if(status==='すぐ可能')return{key:'ready',label:'すぐ可能',detail:''};
    if(status==='片方未所持'||status==='同種2体目が必要')return{key:'one',label:'あと1体',detail:status};
    if(status==='両方未所持')return{key:'missing',label:'未所持',detail:status};
    return{key:'confirm',label:'要確認',detail:status};
  };

  const readRows=(body,columns)=>body?[...body.querySelectorAll('tr')].map(tr=>[...tr.children].map(cell=>cell.textContent.trim())).filter(row=>row.length>=columns):[];

  function setup(){
    const body=$('#otherWaysBody'),directBody=$('#directBody'),oneBody=$('#oneMissingBody'),requiredBody=$('#requiredBody'),routeBadge=$('#routeBadge');
    if(!body||!directBody)return;
    let filter='all';
    const filters=$$('#otherWaysFilters [data-other-filter]');

    const render=()=>{
      if(routeBadge?.textContent?.trim()==='未計算')return;
      const direct=readRows(directBody,3);
      const oneMissing=new Map(readRows(oneBody,2).map(([have,need])=>[`${have}|${need}`,{have,need}]));
      const items=direct.map(([parent1,parent2,rawStatus])=>{
        const state=statusForRow(rawStatus);
        const missing=oneMissing.get(`${parent1}|${parent2}`)||oneMissing.get(`${parent2}|${parent1}`);
        let detail=state.detail;
        if(missing)detail=`所持: ${missing.have} / 追加: ${missing.need}`;
        return{parent1,parent2,...state,detail};
      });
      const counts={ready:0,one:0,missing:0,confirm:0};
      items.forEach(item=>counts[item.key]++);
      const visible=filter==='all'?items:items.filter(item=>item.key===filter);
      const count=$('#otherWaysCount'),summary=$('#otherWaysSummary');
      if(count)count.textContent=items.length?`${items.length}候補`:'候補なし';
      if(summary){
        const parts=[`${counts.ready}件すぐ可能`,`${counts.one}件あと1体`,`${counts.missing}件未所持`];
        if(counts.confirm)parts.push(`${counts.confirm}件要確認`);
        summary.textContent=items.length?parts.join(' / '):'この目的パルを直接作れる親候補が見つかりません。';
      }
      body.innerHTML=visible.length?visible.map(item=>`<div class="other-way-item" data-other-status="${item.key}"><div class="other-way-main"><div class="other-way-pair"><span>${esc(item.parent1)}</span><span class="operator">×</span><span>${esc(item.parent2)}</span></div>${item.detail?`<div class="other-way-detail">${esc(item.detail)}</div>`:''}</div><span class="other-way-status ${item.key}">${esc(item.label)}</span></div>`).join(''):'<div class="other-ways-empty">この条件に該当する親候補はありません。</div>';

      const checks=$('#otherWaysChecks');
      const required=readRows(requiredBody,2);
      if(checks){
        checks.classList.toggle('hidden',!required.length);
        checks.innerHTML=required.length?`<h3>最短ルートで追加の確認</h3><ul>${required.map(([name,reason])=>`<li><strong>${esc(name)}</strong>：${esc(reason)}</li>`).join('')}</ul>`:'';
      }
    };

    filters.forEach(button=>button.addEventListener('click',()=>{
      filter=button.dataset.otherFilter||'all';
      filters.forEach(x=>x.classList.toggle('active',x===button));
      render();
    }));
    render();
    const observer=new MutationObserver(()=>requestAnimationFrame(render));
    [directBody,oneBody,requiredBody,routeBadge].filter(Boolean).forEach(target=>observer.observe(target,{childList:true,subtree:true,characterData:true}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
