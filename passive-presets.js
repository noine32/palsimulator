(() => {
  const STORAGE_KEY = 'palbreeder.passivePresets.v1';
  const RECOMMENDATION_PROFILES = {
    '所持状況優先': {description: '所持個体数・所持種数を優先', preferred: [], patterns: []},
    '拠点・最高作業速度': {
      description: '拠点作業向け：作業速度をプラスする効果だけを優先',
      preferred: ['WorldTree_CraftSpeed', 'CraftSpeed_up3', 'CraftSpeed_up2', 'PAL_CorporateSlave'],
      patterns: [{re: /作業速度|craftspeed|workspeed/i, weight: 1, label: '作業速度'}],
      positiveEffects: ['CraftSpeed'],
      allowFallback: false
    },
    '拠点・標準作業速度': {
      description: '拠点作業向け：作業速度をプラスする効果だけを優先',
      preferred: ['CraftSpeed_up3', 'CraftSpeed_up2', 'PAL_CorporateSlave', 'CraftSpeed_up1'],
      patterns: [{re: /作業速度|craftspeed|workspeed/i, weight: 1, label: '作業速度'}],
      positiveEffects: ['CraftSpeed'],
      allowFallback: false
    },
    '戦闘・汎用安定': {
      description: '戦闘向け：攻撃・耐久・クールタイムのプラス効果を優先',
      preferred: ['MutationPal_Immortal', 'PAL_ALLAttack_up3', 'CoolTimeReduction_Up_1', 'Legend'],
      patterns: [
        {re: /攻撃|attack|shotattack/i, weight: 3, label: '攻撃'},
        {re: /防御|defen[cs]e|hp|回復|吸収|immortal|life.?steal/i, weight: 2, label: '防御・回復'},
        {re: /クールタイム|cooltime|cooldown|アクティブスキル/i, weight: 2, label: 'クールタイム'}
      ],
      positiveEffects: ['ShotAttack', 'Defense', 'LifeSteal', 'AutoHPRegeneRate', 'ActiveSkillCoolTime_Decrease', /^ElementBoost_/],
      allowFallback: false
    },
    '戦闘・最大火力': {
      description: '戦闘向け：攻撃・属性ダメージをプラスする効果だけを優先',
      preferred: ['WorldTree_ATK', 'PAL_ALLAttack_up3', 'PAL_ALLAttack_up2', 'Legend'],
      patterns: [
        {re: /攻撃|attack|shotattack|属性攻撃|elementboost|ダメージ増加/i, weight: 3, label: '攻撃・属性ダメージ'},
        {re: /クリティカル|critical|弱点/i, weight: 2, label: 'クリティカル・弱点'}
      ],
      positiveEffects: ['ShotAttack', /^ElementBoost_/],
      allowFallback: false
    },
    'レイド・耐久': {
      description: 'レイド向け：防御・回復・耐性のプラス効果を優先',
      preferred: ['MutationPal_Immortal', 'Deffence_up3', 'Legend', 'CoolTimeReduction_Up_1'],
      patterns: [
        {re: /防御|defen[cs]e|hp|maxhp|体力/i, weight: 3, label: '防御・体力'},
        {re: /回復|吸収|不死|immortal|life.?steal|耐性|resist|ひるみ|吹き飛び/i, weight: 2, label: '回復・耐性'},
        {re: /クールタイム|cooltime|cooldown|アクティブスキル/i, weight: 1, label: 'クールタイム'}
      ],
      positiveEffects: ['Defense', 'LifeSteal', 'AutoHPRegeneRate', 'ActiveSkillCoolTime_Decrease', /^ElementResist_/, /^ResistAdditionalEffect_/, 'ExplosionResist', 'MaxHP'],
      allowFallback: false
    },
    '移動・地上': {
      description: '地上マウント向け：移動速度・スタミナのプラス効果だけを優先',
      preferred: ['WorldTree_MoveSpeed', 'MoveSpeed_up_3', 'MoveSpeed_up_2', 'Stamina_Up_1'],
      patterns: [
        {re: /移動速度|movespeed/i, weight: 3, label: '移動速度'},
        {re: /スタミナ|stamina|palsp/i, weight: 2, label: 'スタミナ'},
        {re: /ライド|ride|mount|騎乗/i, weight: 1, label: 'ライド操作'}
      ],
      positiveEffects: ['MoveSpeed', 'PalSP_Increase'],
      allowFallback: false,
      exclude: [/水上|swimspeed|swim|泳ぐ|空渡り|ridejump/i]
    },
    '移動・飛行': {
      description: '飛行マウント向け：移動速度・スタミナ・空中操作のプラス効果だけを優先',
      preferred: ['WorldTree_MoveSpeed', 'MoveSpeed_up_3', 'Stamina_Up_1', 'RideJumpCount_Increase2'],
      patterns: [
        {re: /移動速度|movespeed/i, weight: 3, label: '移動速度'},
        {re: /スタミナ|stamina|palsp/i, weight: 2, label: 'スタミナ'},
        {re: /ライド|ride|mount|空渡り|ridejump/i, weight: 2, label: '空中操作'}
      ],
      positiveEffects: ['MoveSpeed', 'PalSP_Increase', 'RideJumpCount_Increase'],
      allowFallback: false,
      exclude: [/水上|swimspeed|swim|泳ぐ/i]
    },
    '移動・水上': {
      description: '水上マウント向け：水上移動速度・スタミナのプラス効果だけを優先',
      preferred: ['SwimSpeed_up_3', 'SwimSpeed_up_2', 'SwimSpeed_up_1', 'Stamina_Up_1'],
      patterns: [
        {re: /水上の移動速度|swimspeed|swim|泳ぐ/i, weight: 3, label: '水上移動速度'},
        {re: /スタミナ|stamina|palsp/i, weight: 2, label: 'スタミナ'}
      ],
      positiveEffects: ['SwimSpeed', 'PalSP_Increase'],
      allowFallback: false
    },
    '移動マウント': {
      description: '汎用マウント向け：移動速度・スタミナのプラス効果だけを優先',
      preferred: ['WorldTree_MoveSpeed', 'MoveSpeed_up_3', 'MoveSpeed_up_2', 'Stamina_Up_1'],
      patterns: [
        {re: /移動速度|movespeed/i, weight: 3, label: '移動速度'},
        {re: /スタミナ|stamina|palsp/i, weight: 2, label: 'スタミナ'},
        {re: /ライド|ride|mount|騎乗/i, weight: 1, label: 'ライド操作'}
      ],
      positiveEffects: ['MoveSpeed', 'PalSP_Increase'],
      allowFallback: false,
      exclude: [/水上|swimspeed|swim|泳ぐ/i]
    }
  };
  const RECOMMENDATION_KEYS = Object.keys(RECOMMENDATION_PROFILES);
  const MOVEMENT_PURPOSES = {ground: '移動・地上', flight: '移動・飛行', water: '移動・水上'};
  const MOVEMENT_LABELS = {ground: '地上', flight: '飛行', water: '水上'};
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const norm = value => String(value ?? '').normalize('NFKC').replace(/[\u3041-\u3096]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60)).toLowerCase().trim();

  let state = {eng: null, owned: null};
  let preset = null;
  let summary = null;
  let result = null;
  let recommendationDetails = null;
  let recommendButton = null;
  let purposeSelect = null;
  let purposeNote = null;
  let movementHint = null;
  let targetInput = null;
  let autoPurpose = null;
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
      sources: [...(species.get(id) || [])],
      name: state.eng.passiveName(id)
    })).sort((a, b) => b.count - a.count || b.species - a.species || a.name.localeCompare(b.name, 'ja'));
  }

  function recommendationFit(row, profile) {
    if (!profile.patterns.length) return 0;
    const passive = state.eng?.passives?.[row.id] || {};
    if (profile.positiveEffects?.length && !profile.positiveEffects.some(pattern => (passive.effects || []).some(effect => {
      const matches = pattern instanceof RegExp ? pattern.test(effect.type) : pattern === effect.type;
      return matches && Number(effect.value) > 0;
    }))) return 0;
    const text = `${row.id} ${row.name} ${passive.desc || ''}`;
    if (profile.exclude?.some(pattern => pattern.test(text))) return 0;
    return profile.patterns.reduce((score, pattern) => {
      if (pattern instanceof RegExp) return score + (pattern.test(text) ? 1 : 0);
      return score + (pattern.re.test(text) ? pattern.weight : 0);
    }, 0);
  }

  function recommendationReason(row, purpose) {
    const profile = RECOMMENDATION_PROFILES[purpose] || RECOMMENDATION_PROFILES['所持状況優先'];
    if (purpose === '所持状況優先') return profile.description;
    const passive = state.eng?.passives?.[row.id] || {};
    const text = `${row.id} ${row.name} ${passive.desc || ''}`;
    const labels = [];
    if (row.preferredIndex >= 0) labels.push('定番構成');
    for (const pattern of profile.patterns) {
      if (!(pattern instanceof RegExp) && pattern.label && pattern.re.test(text)) labels.push(pattern.label);
    }
    return [...new Set(labels)].join('・') || '所持状況順で補完';
  }

  function recommendationSources(row) {
    const names = (row.sources || []).map(species => state.eng?.label?.(species) || species);
    if (!names.length) return '供給元情報なし';
    const visible = names.slice(0, 4).join(' / ');
    return names.length > 4 ? `${visible} ほか${names.length - 4}種` : visible;
  }

  function renderRecommendationDetails(purpose, recommendation) {
    if (!recommendationDetails) return;
    if (!recommendation.rows.length) {
      recommendationDetails.innerHTML = '';
      return;
    }
    const coverage = recommendation.fallbackCount
      ? `用途一致 ${recommendation.matchedCount}種類 + 所持状況順 ${recommendation.fallbackCount}枠`
      : `選択 ${recommendation.rows.length}枠`;
    recommendationDetails.innerHTML = `<div class="owned-passive-recommendation-details-head"><strong>選定理由・供給元</strong><span class="muted">${esc(coverage)}</span></div>${recommendation.rows.map(row => `<article class="owned-passive-recommendation-card"><div class="owned-passive-recommendation-card-head"><strong>${esc(row.name)}</strong><span>${row.count}体 / ${row.species}種</span></div><p>${esc(recommendationReason(row, purpose))}</p><p class="muted">供給元：${esc(recommendationSources(row))}</p></article>`).join('')}`;
  }

  function clearRecommendationDetails() {
    if (recommendationDetails) recommendationDetails.innerHTML = '';
  }

  function recommendedPassiveRows(purpose) {
    const rows = ownedPassiveRows();
    const profile = RECOMMENDATION_PROFILES[purpose] || RECOMMENDATION_PROFILES['所持状況優先'];
    if (!profile.patterns.length) {
      return {rows: rows.slice(0, 4), matchedCount: 0, fallbackCount: 0};
    }

    const ranked = rows.map(row => ({
      ...row,
      fit: recommendationFit(row, profile),
      preferredIndex: profile.preferred.indexOf(row.id)
    })).sort((a, b) => {
      const aPreferred = a.preferredIndex >= 0;
      const bPreferred = b.preferredIndex >= 0;
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
      if (aPreferred && a.preferredIndex !== b.preferredIndex) return a.preferredIndex - b.preferredIndex;
      return b.fit - a.fit || b.count - a.count || b.species - a.species || a.name.localeCompare(b.name, 'ja');
    });

    const matched = ranked.filter(row => row.fit > 0).slice(0, 4);
    const fallback = profile.allowFallback === false
      ? []
      : ranked.filter(row => row.fit === 0).slice(0, Math.max(0, 4 - matched.length));
    return {rows: [...matched, ...fallback], matchedCount: matched.length, fallbackCount: fallback.length};
  }

  function refreshPurposeNote() {
    if (!purposeNote || !purposeSelect) return;
    const profile = RECOMMENDATION_PROFILES[purposeSelect.value] || RECOMMENDATION_PROFILES['所持状況優先'];
    purposeNote.textContent = profile.description || '';
  }

  function exactTarget() {
    const value = targetInput?.value?.trim();
    if (!value || !state.eng?.resolve) return null;
    const target = state.eng.resolve(value);
    if (!target) return null;
    const info = state.eng.info?.[target];
    const candidates = [target, state.eng.jp?.(target), info?.deck, `#${info?.deck || ''}`, state.eng.label?.(target)];
    return candidates.some(candidate => candidate && norm(candidate) === norm(value)) ? target : null;
  }

  function refreshMovementHint() {
    if (!movementHint || !purposeSelect) return;
    if (!state.eng || !targetInput?.value?.trim()) {
      movementHint.textContent = '目的パルを確定すると、移動タイプに合うおすすめ用途を自動選択します。';
      return;
    }
    const target = exactTarget();
    if (!target) {
      movementHint.textContent = '目的パルを候補から確定すると、移動タイプを判定できます。';
      return;
    }
    const types = state.eng.movementTypes?.(target) || [];
    const current = purposeSelect?.value || '所持状況優先';
    const canAutoSelect = current === '所持状況優先' || current === '移動マウント' || current === autoPurpose;
    if (!types.length) {
      if (canAutoSelect) {
        purposeSelect.value = '所持状況優先';
        autoPurpose = '所持状況優先';
        refreshPurposeNote();
      }
      movementHint.textContent = `${state.eng.label(target)} はマウント区分を判定できません。おすすめ用途を手動で選択してください。`;
      return;
    }
    const primaryType = types[0];
    const suggestedPurpose = MOVEMENT_PURPOSES[primaryType];
    if (canAutoSelect && suggestedPurpose) {
      purposeSelect.value = suggestedPurpose;
      autoPurpose = suggestedPurpose;
      refreshPurposeNote();
    }
    const labels = types.map(type => MOVEMENT_LABELS[type]).filter(Boolean);
    const multiple = labels.length > 1;
    movementHint.textContent = `${state.eng.label(target)}：${labels.join(' / ')}${multiple ? `対応。${suggestedPurpose}を仮選択しました。必要に応じて変更してください。` : `マウント。${suggestedPurpose}を自動選択しました。`}`;
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
      summary.textContent = `所持パッシブ ${rows.length}種類。おすすめ用途ごとの定番構成を、所持中のパッシブだけで組みます。`;
    }
    recommendButton.disabled = !rows.length;
    purposeSelect.disabled = !rows.length;
    refreshPurposeNote();
    refreshMovementHint();
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
    tools.innerHTML = `<div class="owned-passive-preset-head"><div><strong>所持パッシブから設定</strong><p id="ownedPassiveSummary" class="muted">所持データを読み込むと、所持中のパッシブからおすすめを作成できます。</p><p id="ownedPassiveMovementHint" class="owned-passive-movement-hint muted">目的パルを確定すると、移動タイプに合うおすすめ用途を自動選択します。</p></div><div class="owned-passive-preset-actions"><label class="owned-passive-purpose"><span>おすすめ用途</span><select id="ownedPassivePurpose">${RECOMMENDATION_KEYS.map(key => `<option value="${key}">${key}</option>`).join('')}</select><small id="ownedPassivePurposeNote"></small></label><button id="recommendOwnedPresetBtn" type="button" class="button">この用途でおすすめ</button></div></div><p id="ownedPassivePresetResult" class="muted" aria-live="polite"></p><div id="ownedPassivePresetDetails" class="owned-passive-preset-details" aria-live="polite"></div><details class="passive-preset-manager"><summary>自分のプリセットを保存・管理</summary><div class="passive-preset-manager-row"><input id="customPresetName" type="text" maxlength="40" placeholder="例：今あるパル・拠点用"><button id="savePassivePresetBtn" type="button" class="button">現在の構成を保存</button><button id="deletePassivePresetBtn" type="button" class="button">選択中を削除</button></div><p class="muted">保存するのはパッシブ構成だけです。所持データやトークンは保存・送信しません。</p></details>`;
    grid.after(tools);

    summary = $('#ownedPassiveSummary');
    result = $('#ownedPassivePresetResult');
    recommendationDetails = $('#ownedPassivePresetDetails');
    recommendButton = $('#recommendOwnedPresetBtn');
    purposeSelect = $('#ownedPassivePurpose');
    purposeNote = $('#ownedPassivePurposeNote');
    movementHint = $('#ownedPassiveMovementHint');
    targetInput = $('#targetInput');
    nameInput = $('#customPresetName');
    saveButton = $('#savePassivePresetBtn');
    deleteButton = $('#deletePassivePresetBtn');
    purposeSelect.addEventListener('change', () => {
      if (purposeSelect.value !== autoPurpose) autoPurpose = null;
      refreshControls();
    });
    targetInput?.addEventListener('input', refreshMovementHint);
    targetInput?.addEventListener('change', refreshMovementHint);
    customGroup = document.createElement('optgroup');
    customGroup.label = '保存したプリセット';
    customGroup.dataset.customPresetGroup = 'true';
    preset.appendChild(customGroup);
    renderCustomOptions();

    preset.addEventListener('change', event => {
      const row = customForValue(preset.value);
      if (!row) {
        clearRecommendationDetails();
        refreshControls();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelected(row.ids);
      result.textContent = `「${row.name}」を適用しました。`;
      clearRecommendationDetails();
      refreshControls();
    }, true);

    recommendButton.addEventListener('click', () => {
      const purpose = purposeSelect.value;
      const recommendation = recommendedPassiveRows(purpose);
      const rows = recommendation.rows;
      if (!rows.length) {
        clearRecommendationDetails();
        result.textContent = `「${purpose}」向けの所持パッシブが見つかりません。手動で選択するか、別の用途を試してください。`;
        refreshControls();
        return;
      }
      setSelected(rows.map(row => row.id));
      preset.value = '（手動選択）';
      renderRecommendationDetails(purpose, recommendation);
      let message = `「${purpose}」向けに設定しました：${rows.map(row => row.name).join(' / ')}`;
      if (purpose !== '所持状況優先' && recommendation.fallbackCount) {
        message += ` 用途に合う所持パッシブが${recommendation.matchedCount}種類のため、残り${recommendation.fallbackCount}枠は所持状況順で補完しました。`;
      } else if (purpose !== '所持状況優先' && rows.length < 4) {
        message += ` 用途に合う所持パッシブが${rows.length}種類のため、残り${4 - rows.length}枠は未選択です。`;
      }
      result.textContent = message;
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
      clearRecommendationDetails();
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
