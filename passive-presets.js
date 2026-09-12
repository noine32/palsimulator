(() => {
  const STORAGE_KEY = 'palbreeder.passivePresets.v1';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  let state = {eng: null, owned: null};
  let preset = null;
  let summary = null;
  let result = null;
  let recommendButton = null;
  let nameInput = null;
  let saveButton = null;
  let deleteButton = null;
  let customGroup = null;

  function readSaved() {
    try {
      const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(rows)) return [];
      return rows.filter(row => row && typeof row.name === 'string' && Array.isArray(row.ids))
        .map(row => ({name: row.name.trim().slice(0, 40), ids: [...new Set(row.ids.map(String))].slice(0, 4)}))
        .filter(row => row.name && row.ids.length);
    } catch (_) {
      return [];
    }
  }

  function writeSaved(rows) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      return true;
    } catch (_) {
      return false;
    }
  }

  function customForValue(value) {
    if (!String(value).startsWith('custom:')) return null;
    const name = String(value).slice(7);
    return readSaved().find(row => row.name === name) || null;
  }

  function selectedIds() {
    return $$('.passiveSelect').map(select => select.value).filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index).slice(0, 4);
  }

  function setSelected(ids) {
    const values = [...new Set(ids)].slice(0, 4);
    $$('.passiveSelect').forEach((select, index) => {
      select.value = values[index] || '';
      select.dispatchEvent(new Event('change', {bubbles: true}));
    });
  }

  function ownedPassiveRows() {
    const counts = new Map();
    const species = new Map();
    for (const individual of state.owned?.individuals || []) {
      for (const id of new Set(individual.passives || [])) {
        if (!state.eng?.passives?.[id]) continue;
        counts.set(id, (counts.get(id) || 0) + 1);
        if (!species.has(id)) species.set(id, new Set());
        species.get(id).add(individual.species);
      }
    }
    return [...counts].map(([id, count]) => ({
      id,
      count,
      species: species.get(id)?.size || 0,
      name: state.eng.passiveName(id)
    })).sort((a, b) => b.count - a.count || b.species - a.species || a.name.localeCompare(b.name, 'ja'));
  }

  function renderCustomOptions() {
    if (!preset) return;
    if (!customGroup || customGroup.parentElement !== preset) {
      customGroup = document.createElement('optgroup');
      customGroup.label = '保存したプリセット';
      customGroup.dataset.customPresetGroup = 'true';
      preset.appendChild(customGroup);
    }
    const current = preset.value;
    customGroup.innerHTML = '';
    for (const row of readSaved()) {
      const option = document.createElement('option');
      option.value = `custom:${row.name}`;
      option.textContent = row.name;
      customGroup.appendChild(option);
    }
    if (current.startsWith('custom:') && !customForValue(current)) preset.value = '（手動選択）';
  }

  function refreshControls() {
    const rows = ownedPassiveRows();
    if (!state.eng || !state.owned) {
      summary.textContent = '所持データを読み込むと、所持中のパッシブからおすすめを作成できます。';
    } else if (!rows.length) {
      summary.textContent = '所持個体から確認できるパッシブがありません。';
    } else {
      summary.textContent = `所持パッシブ ${rows.length}種類。所持個体数と所持種数が多い順におすすめします。`;
    }
    recommendButton.disabled = !rows.length;
    saveButton.disabled = !selectedIds().length;
    deleteButton.disabled = !customForValue(preset.value);
  }

  function enhance() {
    const grid = $('.passive-ext-grid');
    preset = $('#presetSelect');
    if (!grid || !preset) return false;
    if ($('#ownedPassivePresetTools')) return true;

    const tools = document.createElement('div');
    tools.id = 'ownedPassivePresetTools';
    tools.className = 'owned-passive-preset-tools';
    tools.innerHTML = `<div class="owned-passive-preset-head"><div><strong>所持パッシブから設定</strong><p id="ownedPassiveSummary" class="muted">所持データを読み込むと、所持中のパッシブからおすすめを作成できます。</p></div><button id="recommendOwnedPresetBtn" type="button" class="button">所持状況からおすすめ</button></div><p id="ownedPassivePresetResult" class="muted" aria-live="polite"></p><details class="passive-preset-manager"><summary>自分のプリセットを保存・管理</summary><div class="passive-preset-manager-row"><input id="customPresetName" type="text" maxlength="40" placeholder="例：今あるパル・拠点用"><button id="savePassivePresetBtn" type="button" class="button">現在の構成を保存</button><button id="deletePassivePresetBtn" type="button" class="button">選択中を削除</button></div><p class="muted">保存するのはパッシブ構成だけです。所持データやトークンは保存・送信しません。</p></details>`;
    grid.after(tools);

    summary = $('#ownedPassiveSummary');
    result = $('#ownedPassivePresetResult');
    recommendButton = $('#recommendOwnedPresetBtn');
    nameInput = $('#customPresetName');
    saveButton = $('#savePassivePresetBtn');
    deleteButton = $('#deletePassivePresetBtn');
    customGroup = document.createElement('optgroup');
    customGroup.label = '保存したプリセット';
    customGroup.dataset.customPresetGroup = 'true';
    preset.appendChild(customGroup);
    renderCustomOptions();

    preset.addEventListener('change', event => {
      const row = customForValue(preset.value);
      if (!row) {
        refreshControls();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelected(row.ids);
      result.textContent = `「${row.name}」を適用しました。`;
      refreshControls();
    }, true);

    recommendButton.addEventListener('click', () => {
      const rows = ownedPassiveRows().slice(0, 4);
      if (!rows.length) return;
      setSelected(rows.map(row => row.id));
      preset.value = '（手動選択）';
      result.textContent = `おすすめを設定しました：${rows.map(row => row.name).join(' / ')}`;
      refreshControls();
    });

    saveButton.addEventListener('click', () => {
      const ids = selectedIds();
      const name = nameInput.value.trim().slice(0, 40);
      if (!name) {
        result.textContent = 'プリセット名を入力してください。';
        nameInput.focus();
        return;
      }
      if (!ids.length) {
        result.textContent = '保存するパッシブを1つ以上選択してください。';
        return;
      }
      const rows = readSaved().filter(row => row.name !== name);
      rows.push({name, ids});
      if (!writeSaved(rows)) {
        result.textContent = 'この端末に保存できませんでした。';
        return;
      }
      renderCustomOptions();
      preset.value = `custom:${name}`;
      nameInput.value = '';
      result.textContent = `「${name}」を保存しました。`;
      refreshControls();
    });

    deleteButton.addEventListener('click', () => {
      const row = customForValue(preset.value);
      if (!row) return;
      if (!window.confirm(`「${row.name}」を削除しますか？`)) return;
      if (!writeSaved(readSaved().filter(item => item.name !== row.name))) {
        result.textContent = 'プリセットを削除できませんでした。';
        return;
      }
      preset.value = '（手動選択）';
      renderCustomOptions();
      result.textContent = `「${row.name}」を削除しました。`;
      refreshControls();
    });

    refreshControls();
    return true;
  }

  window.addEventListener('palbreeder:passive-state', event => {
    state = event.detail || state;
    if (enhance()) {
      renderCustomOptions();
      refreshControls();
    }
  });

  if (!enhance()) {
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.body, {childList: true, subtree: true});
  }
})();
