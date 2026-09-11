(()=>{
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const key=target=>`palbreeder-flow-checks:${target.normalize('NFKC').trim()}`;
  const load=target=>{try{return new Set(JSON.parse(localStorage.getItem(key(target))||'[]'))}catch{return new Set()}};
  const save=(target,done)=>{try{localStorage.setItem(key(target),JSON.stringify([...done]))}catch{}}

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
        return `<li class="flow-task${checked?' is-done':''}"><label><input type="checkbox" data-flow-step="${index}"${checked?' checked':''}><span class="flow-task-number">${esc(no)}</span><span class="flow-task-copy"><strong>${esc(parent1)} × ${esc(parent2)}</strong><span>→ ${esc(child)}</span><small>${esc(status)}</small></span></label></li>`;
      }).join('');
      const first=rows.findIndex((_,index)=>!done.has(index));
      next.classList.remove('is-complete');
      if(!rows.length)next.textContent='目的パルを検索すると手順が表示されます。';
      else if(first<0){next.textContent='すべての手順を完了しました。';next.classList.add('is-complete')}
      else next.textContent=`次は手順 ${first+1}：${rows[first][1]} × ${rows[first][2]} で配合`;
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

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
