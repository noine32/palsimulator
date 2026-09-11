(()=>{
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function setup(){
    const body=$('#reverseBody');
    const cards=$('#reverseCards');
    const summary=$('#reverseSummary');
    const input=$('#reverseInput');
    const filter=$('#reverseResultFilter');
    if(!body||!cards||!summary||!input||!filter)return;

    const render=()=>{
      const allRows=[...body.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>cell.textContent.trim())).filter(row=>row.length>=3);
      const query=filter.value.normalize('NFKC').toLowerCase().trim();
      const rows=query?allRows.filter(row=>row.join(' ').normalize('NFKC').toLowerCase().includes(query)):allRows;
      const parent=input.value.trim();
      summary.textContent=allRows.length?`${parent||'選択した親'}から作れる組み合わせ ${allRows.length}件${query?`・表示 ${rows.length}件`:''}`:(parent?'該当する組み合わせがありません。':'親パルを選択してください。');
      cards.innerHTML=rows.length?rows.map(([partner,child,status])=>{
        const stateClass=status==='所持'?'is-owned':'is-missing';
        return `<article class="reverse-result"><div class="reverse-result-top"><span class="reverse-partner-label">組み合わせ相手</span><span class="reverse-state ${stateClass}">${esc(status)}</span></div><strong class="reverse-partner">${esc(partner)}</strong><div class="reverse-result-arrow"><span>×</span><span>↓</span></div><div class="reverse-child"><span>生まれるパル</span><strong>${esc(child)}</strong></div></article>`;
      }).join(''):'<div class="reverse-empty">親パルを選ぶと、ここに組み合わせが表示されます。</div>';
    };

    render();
    new MutationObserver(render).observe(body,{childList:true,subtree:true,characterData:true});
    input.addEventListener('input',()=>{if(!input.value.trim())render()});
    filter.addEventListener('input',render);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
