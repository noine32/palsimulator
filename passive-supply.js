(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  let state = {eng: null, owned: null};
  let panel = null;
  let summary = null;
  let list = null;

  function selectedIds() {
    return $$('.passiveSelect').map(select => select.value).filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index).slice(0, 4);
  }

  function sourceRows(id) {
    const sources = new Map();
    for (const individual of state.owned?.individuals || []) {
      if (!new Set((individual.passives || []).map(String)).has(id)) continue;
      const species = individual.species || '不明';
      if (!sources.has(species)) sources.set(species, {species, count: 0, male: 0, female: 0, other: 0});
      const source = sources.get(species);
      source.count++;
      if (individual.gender === 'Male') source.male++;
      else if (individual.gender === 'Female') source.female++;
      else source.other++;
    }
    return [...sources.values()].sort((a, b) => b.count - a.count || a.species.localeCompare(b.species, 'ja'));
  }

  function sourceLabel(species) {
    return typeof state.eng?.label === 'function' ? state.eng.label(species) : species;
  }

  function render() {
    if (!panel || !summary || !list) return;
    const ids = selectedIds();
    if (!ids.length) {
      summary.textContent = '';
      list.innerHTML = '<p class="muted">パッシブを選択すると、所持個体から供給元を確認できます。</p>';
      return;
    }
    if (!state.eng || !state.owned) {
      summary.textContent = '所持データ未読込';
      list.innerHTML = '<p class="muted">所持データを読み込むと、供給元のパルを確認できます。</p>';
      return;
    }

    const rows = ids.map(id => ({id, name: state.eng.passiveName(id), sources: sourceRows(id)}));
    const missingCount = rows.filter(row => !row.sources.length).length;
    summary.textContent = `供給元あり ${rows.length - missingCount}個 / 不足 ${missingCount}個`;
    list.innerHTML = rows.map(row => {
      const total = row.sources.reduce((sum, source) => sum + source.count, 0);
      const status = row.sources.length ? '所持中' : '不足';
      const sourceHtml = row.sources.length
        ? `<div class="passive-supply-donors">${row.sources.map(source => `<span class="passive-supply-donor"><strong>${esc(sourceLabel(source.species))}</strong><small>${source.count}体・♂${source.male} / ♀${source.female}${source.other ? ` / 不明${source.other}` : ''}</small></span>`).join('')}</div>`
        : '<p class="passive-supply-empty">このパッシブを持つ所持個体はいません。</p>';
      return `<article class="passive-supply-item ${row.sources.length ? 'is-available' : 'is-missing'}"><div class="passive-supply-item-head"><strong>${esc(row.name)}</strong><span>${status}</span></div><p class="muted">${row.sources.length ? `供給元 ${row.sources.length}種 / ${total}体` : '所持データ内に供給元なし'}</p>${sourceHtml}</article>`;
    }).join('');
  }

  function enhance() {
    const grid = $('.passive-ext-grid');
    const selects = $$('.passiveSelect');
    if (!grid || selects.length !== 4) return false;
    if (panel) {
      render();
      return true;
    }

    panel = document.createElement('section');
    panel.id = 'passiveSupplyPanel';
    panel.className = 'passive-supply-panel';
    panel.setAttribute('aria-labelledby', 'passiveSupplyTitle');
    panel.innerHTML = '<div class="passive-supply-head"><div><strong id="passiveSupplyTitle">所持パルから供給元を逆引き</strong><p class="muted">選択中のパッシブを持つ所持個体を、パルごとに確認できます。</p></div><span id="passiveSupplySummary" class="passive-supply-summary muted"></span></div><div id="passiveSupplyList" class="passive-supply-list" aria-live="polite"></div>';
    grid.after(panel);
    summary = $('#passiveSupplySummary');
    list = $('#passiveSupplyList');
    selects.forEach(select => select.addEventListener('change', render));
    $('#presetSelect')?.addEventListener('change', () => requestAnimationFrame(render));
    render();
    return true;
  }

  window.addEventListener('palbreeder:passive-state', event => {
    state = event.detail || state;
    if (enhance()) render();
  });

  if (!enhance()) {
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.body, {childList: true, subtree: true});
  }
})();
