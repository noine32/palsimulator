(()=>{
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const key=target=>`palbreeder-flow-checks:${target.normalize('NFKC').trim()}`;
  const load=target=>{try{return new Set(JSON.parse(localStorage.getItem(key(target))||'[]'))}catch{return new Set()}};
  const save=(target,done)=>{try{localStorage.setItem(key(target),JSON.stringify([...done]))}catch{}}
  const passiveKey=(target,ids)=>`palbreeder-passive-flow-checks:${target.normalize('NFKC').trim()}:${ids.join(',')}`;
  const passiveLoad=(target,ids)=>{try{return new Set(JSON.parse(localStorage.getItem(passiveKey(target,ids))||'[]'))}catch{return new Set()}};
  const passiveSave=(target,ids,done)=>{try{localStorage.setItem(passiveKey(target,ids),JSON.stringify([...done]))}catch{}}

  const routeAction=status=>{
    if(status==='すぐ可能')return '所持個体から配合できます';
    if(/性別/.test(status))return '親の性別を確認してください';
    if(/未所持|必要/.test(status))return '不足している親を確認してください';
    if(/前段/.test(status))return '前の手順で子を作ってください';
    return 'この手順の条件を確認してください';
  };

  function setup(){
    const body=$('#routeBody'),list=$('#flowTaskList'),next=$('#flowNextAction'),target=$('#targetInput');
    const toggle=$('#toggleFlowDiagram'),diagram=$('#flowDiagram');
    if(!body||!list||!next||!target||!toggle||!diagram)return;

    const render=()=>{
      const rows=[...body.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>cell.textContent.trim())).filter(row=>row.length>=5);
      const targetName=target.value.trim()||'未選択';
      const done=load(targetName);
      list.innerHTML=rows.map(([no,parent1,parent2,child,status],index)=>{
        const checked=done.has(index);
        const action=routeAction(status),needsCheck=status!=='すぐ可能';
        return `<li class="flow-task${checked?' is-done':''}${needsCheck?' is-missing':''}"><label><input type="checkbox" data-flow-step="${index}"${checked?' checked':''}><span class="flow-task-number">${esc(no)}</span><span class="flow-task-copy"><strong>${esc(parent1)} × ${esc(parent2)}</strong><span>→ ${esc(child)}</span><small>${esc(status)}</small><b class="flow-task-action">${esc(action)}</b></span></label></li>`;
      }).join('');
      const first=rows.findIndex((_,index)=>!done.has(index));
      next.classList.remove('is-complete');
      if(!rows.length)next.textContent='目的パルを検索すると手順が表示されます。';
      else if(first<0){next.textContent='すべての手順を完了しました。';next.classList.add('is-complete')}
      else next.textContent=`次は手順 ${first+1}：${rows[first][1]} × ${rows[first][2]} で配合。${routeAction(rows[first][4])}`;
    };

    list.addEventListener('change',event=>{
      const checkbox=event.target.closest('[data-flow-step]');
      if(!checkbox)return;
      const targetName=target.value.trim()||'未選択';
      const done=load(targetName),step=Number(checkbox.dataset.flowStep);
      checkbox.checked?done.add(step):done.delete(step);
      save(targetName,done);render();
    });
    toggle.addEventListener('click',()=>{
      const open=diagram.classList.toggle('is-mobile-open');
      toggle.setAttribute('aria-expanded',String(open));
      toggle.textContent=open?'全体図を閉じる':'全体図を見る';
      if(open)requestAnimationFrame(()=>diagram.scrollIntoView({behavior:'smooth',block:'nearest'}));
    });
    new MutationObserver(render).observe(body,{childList:true,subtree:true,characterData:true});
    target.addEventListener('input',render);
    render();
  }

  function setupPassive(){
    const body=$('#passiveBody'),list=$('#passiveTaskList'),next=$('#passiveNextAction'),guide=$('#passiveTaskGuide'),reset=$('#passiveResetChecks'),target=$('#targetInput');
    if(!body||!list||!next||!guide||!reset||!target)return;

    const selected=()=>$$('.passiveSelect').map(select=>select.value).filter(Boolean).filter((id,index,ids)=>ids.indexOf(id)===index).slice(0,4);
    const render=()=>{
      const rows=[...body.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>cell.textContent.trim())).filter(row=>row.length>=5);
      const targetName=target.value.trim()||'未選択',ids=selected(),done=passiveLoad(targetName,ids);
      list.innerHTML=rows.map(([no,parent1,parent2,child,passives],index)=>{
        const checked=done.has(index);
        return `<li class="flow-task passive-flow-task${checked?' is-done':''}"><label><input type="checkbox" data-passive-flow-step="${index}"${checked?' checked':''}><span class="flow-task-number">${esc(no)}</span><span class="flow-task-copy"><strong>${esc(parent1)} × ${esc(parent2)}</strong><span>→ ${esc(child)}</span><small>保持確認：${esc(passives||'なし')}</small><b class="flow-task-action">この子が目的のパッシブを保持しているか確認</b></span></label></li>`;
      }).join('');
      next.classList.remove('is-complete');
      reset.disabled=!rows.length;
      if(!rows.length)next.textContent='パッシブルート検索後に手順が表示されます。';
      else {
        const first=rows.findIndex((_,index)=>!done.has(index));
        if(first<0){next.textContent='すべてのパッシブ継承手順を完了しました。';next.classList.add('is-complete')}
        else next.textContent=`次は手順 ${first+1}：${rows[first][1]} × ${rows[first][2]} で配合し、保持パッシブを確認`;
      }
    };

    list.addEventListener('change',event=>{
      const checkbox=event.target.closest('[data-passive-flow-step]');
      if(!checkbox)return;
      const targetName=target.value.trim()||'未選択',ids=selected(),done=passiveLoad(targetName,ids),step=Number(checkbox.dataset.passiveFlowStep);
      checkbox.checked?done.add(step):done.delete(step);
      passiveSave(targetName,ids,done);render();
    });
    reset.addEventListener('click',()=>{
      const targetName=target.value.trim()||'未選択',ids=selected();
      try{localStorage.removeItem(passiveKey(targetName,ids))}catch{}
      render();
    });
    new MutationObserver(render).observe(body,{childList:true,subtree:true,characterData:true});
    target.addEventListener('input',render);
    target.addEventListener('change',render);
    $$('.passiveSelect').forEach(select=>select.addEventListener('change',render));
    render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setup();setupPassive()});else{setup();setupPassive()}
})();
