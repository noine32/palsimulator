(() => {
  const SOURCES = {
    pals: 'https://raw.githubusercontent.com/helios57/palworld/main/data/pals.json',
    special: 'https://raw.githubusercontent.com/helios57/palworld/main/data/special_combos.json',
    idmap: 'https://raw.githubusercontent.com/helios57/palworld/main/data/internal_id_map.json',
    paldata: 'https://raw.githubusercontent.com/KrisCris/Palworld-Pal-Editor/develop/src/palworld_pal_editor/assets/data/pal_data.json',
    passives: 'https://raw.githubusercontent.com/KrisCris/Palworld-Pal-Editor/develop/src/palworld_pal_editor/assets/data/pal_passives.json'
  };

  const PRESETS = {
    '（手動選択）': [],
    '拠点・最高作業速度': ['WorldTree_CraftSpeed','CraftSpeed_up3','CraftSpeed_up2','PAL_CorporateSlave'],
    '拠点・標準作業速度': ['CraftSpeed_up3','CraftSpeed_up2','PAL_CorporateSlave','CraftSpeed_up1'],
    '戦闘・汎用安定': ['MutationPal_Immortal','PAL_ALLAttack_up3','CoolTimeReduction_Up_1','Legend'],
    '戦闘・最大火力': ['WorldTree_ATK','PAL_ALLAttack_up3','PAL_ALLAttack_up2','Legend'],
    'レイド・耐久': ['MutationPal_Immortal','Deffence_up3','Legend','CoolTimeReduction_Up_1'],
    '移動マウント': ['WorldTree_MoveSpeed','MoveSpeed_up_3','MoveSpeed_up_2','Stamina_Up_1']
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s ?? '').normalize('NFKC').replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0)+0x60)).toLowerCase().trim();
  const cmp = (a,b) => { for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]??0,y=b[i]??0;if(x<y)return-1;if(x>y)return 1;}return 0; };
  const keyState = s => `${s[0]}|${s[1]}`;
  const parseState = k => { const i=k.lastIndexOf('|'); return [k.slice(0,i),Number(k.slice(i+1))]; };

  let eng = null;
  let owned = {counts:new Map(), individuals:[]};
  let pendingOwnedFile = null;

  class Engine {
    constructor(palsObj,specials,idmap,palData,passiveData){
      this.info={};
      for(const [name,d] of Object.entries(palsObj||{})){
        if(!d || d.combi_rank===undefined) continue;
        this.info[name]={deck:String(d.paldeck??''),rank:Number(d.combi_rank),generic:Boolean(d.in_generic_pool)};
      }
      this.names=Object.keys(this.info);
      this.generic=this.names.filter(n=>this.info[n].generic);
      this.idmap=idmap||{};
      this.special=new Map();
      for(const c of specials||[]) if(c?.parent_a&&c?.parent_b&&c?.child) this.special.set(this.pairKey(c.parent_a,c.parent_b),c.child);
      this.jpByDeck={};
      for(const rec of Object.values(palData||{})){
        if(!rec?.I18n?.ja || !rec?.PaldeckIndex) continue;
        const deck=`${rec.PaldeckIndex}${rec.PaldeckSuffix||''}`;
        if(!this.jpByDeck[deck] || rec.RegularlyObtainable===true || rec.Invalid===false) this.jpByDeck[deck]=rec.I18n.ja;
      }
      this.passives={};
      for(const [id,rec] of Object.entries(passiveData||{})) this.passives[id]={name:rec?.I18n?.ja?.Name||rec?.I18n?.en?.Name||id,desc:rec?.I18n?.ja?.Description||''};
      this.cache=new Map();
    }
    pairKey(a,b){return[a,b].sort().join('\0');}
    jp(n){return this.jpByDeck[this.info[n]?.deck]||n;}
    label(n){const d=this.info[n];return d?.deck?`${this.jp(n)} #${d.deck}`:this.jp(n);}
    passiveName(id){return this.passives[id]?.name||id;}
    result(a,b){
      const k=this.pairKey(a,b); if(this.cache.has(k)) return this.cache.get(k);
      let child;
      if(a===b) child=a;
      else if(this.special.has(k)) child=this.special.get(k);
      else {
        const target=Math.floor((this.info[a].rank+this.info[b].rank+1)/2);
        let best=null; child=null;
        for(const n of this.generic){
          const s=[Math.abs(this.info[n].rank-target),-this.info[n].rank,n];
          if(!best || s[0]<best[0] || (s[0]===best[0] && (s[1]<best[1] || (s[1]===best[1] && s[2]<best[2])))){best=s;child=n;}
        }
      }
      this.cache.set(k,child); return child;
    }
    resolve(q){
      q=norm(q); if(!q)return null;
      const exact=this.names.find(n=>[n,this.jp(n),this.info[n].deck,`#${this.info[n].deck}`,this.label(n)].some(x=>norm(x)===q));
      if(exact)return exact;
      const hits=this.names.filter(n=>norm(`${n} ${this.jp(n)} ${this.info[n].deck}`).includes(q));
      hits.sort((a,b)=>this.jp(a).localeCompare(this.jp(b),'ja')); return hits[0]||null;
    }
    internalToName(raw){
      for(const c of [raw,raw.replace(/^BOSS_/,''),raw.replace(/^RAID_/,''),raw.replace(/^GYM_/,''),raw.replace(/_Tower$/,'')]){const n=this.idmap[c];if(n&&this.info[n])return n;}
      return null;
    }
  }

  async function getJson(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error(`${r.status}: ${url}`);return r.json();}

  function injectUi(){
    const tabs=$('.tabs');
    if(!tabs || $('#tab-passive')) return;
    const reverseBtn=[...tabs.querySelectorAll('.tab')].find(b=>b.dataset.tab==='reverse');
    const btn=document.createElement('button'); btn.className='tab'; btn.dataset.tab='passive'; btn.textContent='パッシブ継承';
    tabs.insertBefore(btn,reverseBtn||null);
    const reversePanel=$('#tab-reverse');
    const panel=document.createElement('section'); panel.id='tab-passive'; panel.className='tab-panel';
    panel.innerHTML=`<article class="card">
      <div class="card-title"><div><h2>最大4パッシブ継承</h2><p class="muted">所持個体のパッシブから、目的パルへ集約する配合候補を探索します。</p></div><span id="passiveReady" class="badge">準備中</span></div>
      <div class="passive-ext-grid">
        <label><span>プリセット</span><select id="presetSelect"></select></label>
        <label><span>パッシブ1</span><select class="passiveSelect"></select></label>
        <label><span>パッシブ2</span><select class="passiveSelect"></select></label>
        <label><span>パッシブ3</span><select class="passiveSelect"></select></label>
        <label><span>パッシブ4</span><select class="passiveSelect"></select></label>
        <button id="passiveSearchBtn" class="button primary" disabled>パッシブルート検索</button>
      </div>
      <p id="passiveNote" class="muted">ゲームデータと所持JSONを読み込んでください。</p>
      <div class="table-wrap"><table><thead><tr><th>手順</th><th>親1</th><th>親2</th><th>子</th><th>保持したいパッシブ</th></tr></thead><tbody id="passiveBody"></tbody></table></div>
      <div class="card-title passive-chart-head"><h2>パッシブ継承フローチャート</h2><button id="passivePngBtn" class="button">PNG保存</button></div>
      <div class="flow-layout"><div class="flow-viewport"><svg id="passiveFlowSvg" xmlns="http://www.w3.org/2000/svg"></svg></div><aside id="passiveFlowDetail" class="detail-panel"><h3>継承ノード詳細</h3><p class="muted">ルート検索後、箱をクリックしてください。</p></aside></div>
    </article>`;
    reversePanel?.parentNode.insertBefore(panel,reversePanel);
    const style=document.createElement('style');
    style.textContent=`.passive-ext-grid{display:grid;grid-template-columns:1.25fr repeat(4,1fr) auto;gap:8px;align-items:end;margin:12px 0}.passive-ext-grid label span{display:block;font-size:12px;color:var(--muted);margin-bottom:5px}.passive-chart-head{margin-top:16px}@media(max-width:1050px){.passive-ext-grid{grid-template-columns:1fr 1fr 1fr}.passive-ext-grid .button{grid-column:span 3}}@media(max-width:620px){.passive-ext-grid{grid-template-columns:1fr}.passive-ext-grid .button{grid-column:auto}}`;
    document.head.appendChild(style);
  }

  function buildOptions(){
    if(!eng)return;
    const preset=$('#presetSelect');
    preset.innerHTML=Object.keys(PRESETS).map(k=>`<option>${esc(k)}</option>`).join('');
    const ids=Object.keys(eng.passives).sort((a,b)=>eng.passiveName(a).localeCompare(eng.passiveName(b),'ja'));
    const html='<option value="">（未選択）</option>'+ids.map(id=>`<option value="${esc(id)}">${esc(eng.passiveName(id))}</option>`).join('');
    $$('.passiveSelect').forEach(s=>s.innerHTML=html);
    preset.addEventListener('change',e=>{const ids=PRESETS[e.target.value]||[];$$('.passiveSelect').forEach((s,i)=>s.value=ids[i]||'');});
    $('#passiveSearchBtn').addEventListener('click',renderPassive);
    $('#passivePngBtn').addEventListener('click',()=>exportSvg($('#passiveFlowSvg'),'palbreeder-passives.png'));
    refresh();
  }

  function refresh(){
    const ready=Boolean(eng && owned.individuals.length);
    const b=$('#passiveSearchBtn'); if(b)b.disabled=!ready;
    const badge=$('#passiveReady'); if(badge)badge.textContent=eng?(owned.individuals.length?'利用可能':'所持JSON待ち'):'準備中';
    if(ready && $('#passiveNote')) $('#passiveNote').textContent='最大4つまで選択できます。目的パルは上部の検索欄を使用します。';
    window.dispatchEvent(new CustomEvent('palbreeder:passive-state',{detail:{eng,owned}}));
  }

  async function loadOwned(file){
    try{
      if(!eng){pendingOwnedFile=file;return;}
      const data=JSON.parse(await file.text());
      if(data.schema!=='palbreeder-owned-pals-v1') return;
      const x={counts:new Map(),individuals:[]};
      for(const r of data.pals||[]){
        const n=eng.internalToName(String(r.internal_id||'')); if(!n)continue;
        x.counts.set(n,(x.counts.get(n)||0)+1);
        x.individuals.push({species:n,passives:(r.passive_skill_ids||[]).map(String),gender:String(r.gender||''),level:r.level||''});
      }
      owned=x; refresh();
    }catch(_e){}
  }

  function selectedPassives(){return $$('.passiveSelect').map(s=>s.value).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,4);}
  function donorMask(ind,desired){let m=0;const p=new Set(ind.passives);desired.forEach((id,i)=>{if(p.has(id))m|=(1<<i);});return m;}
  function maskText(mask,desired){return desired.filter((_,i)=>mask&(1<<i)).map(id=>eng.passiveName(id)).join(' + ')||'なし';}

  function multiPassivePlan(desired,target,maxRounds=6){
    const full=(1<<desired.length)-1,best=new Map(),via=new Map();
    const ownedSpecies=[...owned.counts.keys()].filter(s=>eng.info[s]);
    for(const s of ownedSpecies){best.set(keyState([s,0]),[0,0]);via.set(keyState([s,0]),{type:'owned'});}
    for(const ind of owned.individuals){
      if(!eng.info[ind.species])continue;
      const m=donorMask(ind,desired); if(!m)continue;
      for(let sub=m;sub;sub=(sub-1)&m){const k=keyState([ind.species,sub]);if(!best.has(k)){best.set(k,[0,0]);via.set(k,{type:'source',ind});}}
    }
    const missing=desired.filter((_,i)=>![...best.keys()].some(k=>(parseState(k)[1]&(1<<i))));
    if(missing.length)return{missing,steps:[],score:null,full};
    const rank=(a,b)=>cmp(best.get(a),best.get(b));
    for(let round=0;round<maxRounds;round++){
      const passiveStates=[...best.keys()].filter(k=>parseState(k)[1]!==0),byMask=new Map();
      for(const k of passiveStates){const m=parseState(k)[1];if(!byMask.has(m))byMask.set(m,[]);byMask.get(m).push(k);}
      for(const arr of byMask.values()){arr.sort(rank);if(arr.length>90)arr.length=90;}
      const active=[...byMask.values()].flat(),cand=new Map();
      const offer=(k,score,rec)=>{const cur=best.get(k),p=cand.get(k);if((!cur||cmp(score,cur)<0)&&(!p||cmp(score,p.score)<0))cand.set(k,{score,rec});};
      for(const k of active){const[species,mask]=parseState(k),sc=best.get(k);for(const partner of ownedSpecies){const child=eng.result(species,partner),ck=keyState([child,mask]);offer(ck,[sc[0]+1,sc[1]+1],{type:'breed',left:[species,mask],right:[partner,0]});}}
      for(let i=0;i<active.length;i++){
        const[a,ma]=parseState(active[i]),sa=best.get(active[i]);
        for(let j=i;j<active.length;j++){
          const[b,mb]=parseState(active[j]),union=ma|mb;if(union===ma||union===mb)continue;
          const sb=best.get(active[j]),child=eng.result(a,b),ck=keyState([child,union]);
          offer(ck,[sa[0]+sb[0]+1,Math.max(sa[1],sb[1])+1],{type:'breed',left:[a,ma],right:[b,mb]});
        }
      }
      let changed=false;for(const[k,v]of cand){if(!best.has(k)||cmp(v.score,best.get(k))<0){best.set(k,v.score);via.set(k,v.rec);changed=true;}}
      if(best.has(keyState([target,full]))&&round>=1)break;if(!changed)break;
    }
    const final=keyState([target,full]);if(!best.has(final))return{missing:[],steps:[],score:null,full};
    const ordered=[],seen=new Set();
    const visit=st=>{const k=keyState(st);if(seen.has(k))return;seen.add(k);const r=via.get(k);if(!r||r.type!=='breed')return;visit(r.left);visit(r.right);ordered.push([r.left,r.right,st]);};
    visit([target,full]); return{missing:[],steps:ordered,score:best.get(final),full,via};
  }

  function renderPassive(){
    if(!eng||!owned.individuals.length)return;
    const target=eng.resolve($('#targetInput')?.value||''),desired=selectedPassives();
    if(!target){$('#passiveNote').textContent='上部で目的パルを選択してください。';return;}
    if(!desired.length){$('#passiveNote').textContent='パッシブを1～4個選択してください。';return;}
    $('#passiveNote').textContent='計算中…'; $('#passiveSearchBtn').disabled=true;
    setTimeout(()=>{
      try{
        const r=multiPassivePlan(desired,target);
        if(r.missing.length){$('#passiveBody').innerHTML='';$('#passiveNote').textContent='所持個体に供給元がないパッシブ: '+r.missing.map(x=>eng.passiveName(x)).join(' / ');return;}
        if(!r.score){$('#passiveBody').innerHTML='';$('#passiveNote').textContent='探索範囲内で目的パルへ集約する候補が見つかりませんでした。';return;}
        $('#passiveBody').innerHTML=r.steps.map(([l,rr,s],i)=>`<tr><td>${i+1}</td><td>${esc(eng.label(l[0]))}</td><td>${esc(eng.label(rr[0]))}</td><td>${esc(eng.label(s[0]))}</td><td>${esc(maskText(s[1],desired))}</td></tr>`).join('');
        $('#passiveNote').textContent=`狙うパッシブ: ${desired.map(x=>eng.passiveName(x)).join(' / ')}。候補: 配合 ${r.score[0]}回 / ${r.score[1]}世代。継承はランダムなので、各段階で目的パッシブを継承した子を選別してください。`;
        drawPassiveFlow(target,r.steps,desired);
      } finally { refresh(); }
    },20);
  }

  function drawPassiveFlow(target,steps,desired){
    const svg=$('#passiveFlowSvg'),detail=$('#passiveFlowDetail'); svg.innerHTML='';
    const all=new Map(),edges=[];
    const add=(st,generated=false,step=0)=>{const k=keyState(st);if(!all.has(k))all.set(k,{k,species:st[0],mask:st[1],generated,step});else{const n=all.get(k);n.generated=n.generated||generated;n.step=n.step||step;}return k;};
    steps.forEach((s,i)=>{const a=add(s[0],false),b=add(s[1],false),c=add(s[2],true,i+1);edges.push([a,c],[b,c]);});
    const final=keyState([target,(1<<desired.length)-1]); if(!all.has(final))add([target,(1<<desired.length)-1],true,steps.length);
    const parents=new Map();for(const[a,c]of edges){if(!parents.has(c))parents.set(c,[]);parents.get(c).push(a);}
    const depthMemo=new Map();const depth=k=>{if(depthMemo.has(k))return depthMemo.get(k);const ps=parents.get(k)||[];const d=ps.length?Math.max(...ps.map(depth))+1:0;depthMemo.set(k,d);return d;};
    const columns=new Map();for(const n of all.values()){const d=depth(n.k);if(!columns.has(d))columns.set(d,[]);columns.get(d).push(n);}
    const maxD=Math.max(0,...columns.keys()),boxW=230,boxH=86,colGap=330,rowGap=128,left=45,top=70,pos=new Map();
    let maxRows=1;for(const col of columns.values())maxRows=Math.max(maxRows,col.length);
    for(let d=0;d<=maxD;d++){
      const col=columns.get(d)||[];col.sort((a,b)=>a.step-b.step||a.species.localeCompare(b.species));
      const offset=(maxRows-col.length)*rowGap/2;col.forEach((n,i)=>pos.set(n.k,[left+d*colGap,top+offset+i*rowGap]));
    }
    const W=left+(maxD+1)*colGap+boxW+60,H=Math.max(320,top+(maxRows-1)*rowGap+boxH+80);
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',W);svg.setAttribute('height',H);
    svg.innerHTML='<defs><marker id="passiveArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#657080"/></marker></defs>';
    for(const[a,c]of edges){const[x1,y1]=pos.get(a),[x2,y2]=pos.get(c),sx=x1+boxW,sy=y1+boxH/2,ex=x2,ey=y2+boxH/2,mx=(sx+ex)/2;svg.insertAdjacentHTML('beforeend',`<path d="M${sx} ${sy} H${mx} V${ey} H${ex}" fill="none" stroke="#657080" stroke-width="1.5" marker-end="url(#passiveArrow)"/>`);}
    for(const n of all.values()){
      const[x,y]=pos.get(n.k),goal=n.k===final,fill=goal?'#ffe28a':n.generated?'#cfe1fa':'#ccebd6',txt=maskText(n.mask,desired),id='p'+Math.random().toString(36).slice(2);
      svg.insertAdjacentHTML('beforeend',`<g id="${id}" tabindex="0"><rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="10" fill="${fill}" stroke="#607080"/><text x="${x+10}" y="${y+22}" fill="#17202a" font-size="13" font-weight="700">${esc(eng.label(n.species))}</text><text x="${x+10}" y="${y+45}" fill="#2e3b47" font-size="11">${n.generated?`途中で作成 / 手順 ${n.step}`:'所持親候補'}</text><text x="${x+10}" y="${y+66}" fill="#4c5a67" font-size="10">${esc(txt.length>34?txt.slice(0,34)+'…':txt)}</text></g>`);
      svg.querySelector('#'+id).addEventListener('click',()=>{detail.innerHTML=`<h3>${esc(eng.label(n.species))}</h3><p>状態: ${n.generated?'途中で作成':'所持親候補'}</p><p>保持したいパッシブ:</p><p class="muted">${esc(txt)}</p>`;});
    }
  }

  function exportSvg(svg,filename){
    if(!svg?.viewBox?.baseVal?.width)return;const clone=svg.cloneNode(true),vb=svg.viewBox.baseVal;clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{const scale=2,c=document.createElement('canvas');c.width=Math.max(1,vb.width*scale);c.height=Math.max(1,vb.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.scale(scale,scale);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);c.toBlob(p=>{const a=document.createElement('a');a.href=URL.createObjectURL(p);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);},'image/png');};img.src=url;
  }

  async function init(){
    injectUi();
    const fi=$('#fileInput');fi?.addEventListener('change',e=>e.target.files[0]&&loadOwned(e.target.files[0]));
    $('#dropZone')?.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)loadOwned(f);});
    try{
      const[p,s,i,d,ps]=await Promise.all(Object.values(SOURCES).map(getJson));eng=new Engine(p,s,i,d,ps);buildOptions();
      if(pendingOwnedFile){const file=pendingOwnedFile;pendingOwnedFile=null;await loadOwned(file);}
    }catch(e){const note=$('#passiveNote');if(note)note.textContent='パッシブ用データの取得に失敗しました: '+e.message;}
  }

  init();
})();
