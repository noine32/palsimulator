(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function setupGuide(){
    const routePanel=$('#tab-route');
    if(!routePanel||$('#emptyGuide'))return;
    const guide=document.createElement('div');
    guide.id='emptyGuide';
    guide.className='card empty-guide';
    guide.innerHTML=`
      <div class="empty-guide-icon">🧭</div>
      <h2>まずは所持データを読み込みましょう</h2>
      <p class="muted">3ステップで配合ルートを確認できます。</p>
      <ol>
        <li>クラウド同期または owned_pals.json を読み込む</li>
        <li>目的パルを検索する</li>
        <li>最短手順と必要な親を確認する</li>
      </ol>
      <div class="empty-guide-actions">
        <button id="guideDataBtn" class="button primary" type="button">所持データを読み込む</button>
        <button id="demoBtn" class="button" type="button">デモデータで試す</button>
      </div>
      <p class="muted empty-guide-note">デモはこの端末内だけで使う仮データです。</p>`;
    routePanel.prepend(guide);

    $('#guideDataBtn')?.addEventListener('click',()=>{
      $('.tabs .tab[data-tab="data"]')?.click();
      requestAnimationFrame(()=>$('#dropZone')?.scrollIntoView({behavior:'smooth',block:'start'}));
    });
    $('#demoBtn')?.addEventListener('click',loadDemo);

    const sync=()=>{
      const summary=($('#ownedSummary')?.textContent||'').trim();
      const hasData=summary && summary!=='—' && !/^0体/.test(summary);
      guide.classList.toggle('hidden',Boolean(hasData));
      routePanel.querySelectorAll(':scope > .grid.two, :scope > .route-primary, :scope > .other-ways-card').forEach(x=>x.classList.toggle('hidden',!hasData));
    };
    sync();
    const ownedSummary=$('#ownedSummary');
    if(ownedSummary)new MutationObserver(sync).observe(ownedSummary,{childList:true,characterData:true,subtree:true});
  }

  function setupPlannerHint(){
    const card=$('.target-card');
    if(!card||$('#plannerFlowHint'))return;
    const hint=document.createElement('p');
    hint.id='plannerFlowHint';
    hint.className='planner-flow-hint';
    hint.innerHTML='<span>使い方</span> 所持データ → 目的パル → 通常配合 / パッシブ継承 → 結果を確認';
    card.append(hint);
  }

  async function loadDemo(){
    const btn=$('#demoBtn');
    if(!btn)return;
    const old=btn.textContent;
    btn.disabled=true;btn.textContent='デモ準備中…';
    try{
      const r=await fetch('https://raw.githubusercontent.com/helios57/palworld/main/data/internal_id_map.json',{cache:'no-cache'});
      if(!r.ok)throw new Error('デモ用データを取得できませんでした。');
      const idmap=await r.json();
      const reverse=new Map(Object.entries(idmap).map(([id,name])=>[name,id]));
      const picks=['Lamball','Cattiva','Foxparks','Pengullet','Tanzee','Gumoss','Cremis','Dazzi','Killamari','Hoocrates'];
      const pals=picks.map((name,i)=>reverse.get(name)?{
        internal_id:reverse.get(name),
        level:10+i,
        gender:i%2?'Female':'Male',
        nickname:'',
        passive_skill_ids:[]
      }:null).filter(Boolean);
      if(!pals.length)throw new Error('デモ用のパルを作成できませんでした。');
      const payload={schema:'palbreeder-owned-pals-v1',generated_at:new Date().toISOString(),player:{nickname:'デモ',level:42,uid:'0',owned_pal_count:pals.length},pals};
      const file=new File([JSON.stringify(payload)],'demo-owned-pals.json',{type:'application/json'});
      const dt=new DataTransfer();dt.items.add(file);
      const input=$('#fileInput');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      setTimeout(()=>$('#targetInput')?.focus(),250);
    }catch(e){alert(e.message||String(e));}
    finally{btn.disabled=false;btn.textContent=old;}
  }

  function setupRouteCards(){
    const body=$('#routeBody');
    if(!body||$('#routeCards'))return;
    const wrap=body.closest('.table-wrap');
    if(wrap)wrap.classList.add('route-table-wrap');
    const list=document.createElement('ol');
    list.id='routeCards';
    list.className='step-list';
    wrap?.before(list);

    const render=()=>{
      const rows=$$('#routeBody tr');
      list.innerHTML=rows.map(tr=>{
        const cells=[...tr.children].map(x=>x.textContent.trim());
        if(cells.length<5)return'';
        const [no,p1,p2,child,state]=cells;
        let cls='state-warn';
        if(state==='すぐ可能')cls='state-good';
        else if(/未所持|必要|合わない/.test(state))cls='state-bad';
        return `<li class="step-card"><span class="step-no">${esc(no)}</span><div class="step-main"><div class="step-parents"><span>${esc(p1)}</span><em>×</em><span>${esc(p2)}</span></div><div class="step-child">→ ${esc(child)}</div></div><span class="step-chip ${cls}">${esc(state)}</span></li>`;
      }).join('');
      list.classList.toggle('empty',!rows.length);
    };
    render();
    new MutationObserver(render).observe(body,{childList:true,subtree:true,characterData:true});
  }

  function init(){setupGuide();setupPlannerHint();setupRouteCards();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
