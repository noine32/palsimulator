(() => {
  const $ = s => document.querySelector(s);
  const DEFAULT_ENDPOINT = 'https://palbreeder-api.ryota-k-4869.workers.dev';
  const endpoint = $('#cloudEndpoint');
  const token = $('#cloudToken');
  const remember = $('#cloudRemember');
  const button = $('#cloudLoadBtn');
  const clearButton = $('#cloudClearBtn');
  const status = $('#cloudStatus');
  if (!endpoint || !token || !button || !status) return;

  const LOCAL_ENDPOINT = 'palbreeder.cloudEndpoint';
  const LOCAL_TOKEN = 'palbreeder.readToken';

  endpoint.value = localStorage.getItem(LOCAL_ENDPOINT)
    || sessionStorage.getItem(LOCAL_ENDPOINT)
    || DEFAULT_ENDPOINT;

  const savedToken = localStorage.getItem(LOCAL_TOKEN) || '';
  const sessionToken = sessionStorage.getItem(LOCAL_TOKEN) || '';
  token.value = savedToken || sessionToken;
  if (remember) remember.checked = Boolean(savedToken);

  function setStatus(text, kind = '') {
    status.textContent = text;
    status.dataset.kind = kind;
  }

  async function injectAsLocalFile(data) {
    const input = document.getElementById('fileInput');
    if (!input) throw new Error('JSON入力欄が見つかりません。');
    const file = new File([JSON.stringify(data)], 'owned_pals.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function persistCredentials(base, readToken) {
    sessionStorage.setItem(LOCAL_ENDPOINT, base);
    sessionStorage.setItem(LOCAL_TOKEN, readToken);
    if (remember?.checked) {
      localStorage.setItem(LOCAL_ENDPOINT, base);
      localStorage.setItem(LOCAL_TOKEN, readToken);
    } else {
      localStorage.removeItem(LOCAL_ENDPOINT);
      localStorage.removeItem(LOCAL_TOKEN);
    }
  }

  async function loadCloud({ automatic = false } = {}) {
    const base = endpoint.value.trim().replace(/\/$/, '') || DEFAULT_ENDPOINT;
    const readToken = token.value.trim();
    if (!/^https:\/\//i.test(base)) {
      setStatus('Worker URLは https:// で入力してください。', 'error');
      return false;
    }
    if (readToken.length < 32) {
      if (!automatic) setStatus('プレイヤートークンを確認してください。', 'error');
      return false;
    }

    button.disabled = true;
    setStatus(automatic ? '保存済みトークンで自動取得中…' : 'クラウドから取得中…');
    try {
      const r = await fetch(`${base}/api/v1/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${readToken}` },
        cache: 'no-store'
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      if (body?.schema !== 'palbreeder-owned-pals-v1') throw new Error('取得データの形式が不正です。');
      endpoint.value = base;
      persistCredentials(base, readToken);
      await injectAsLocalFile(body);
      setStatus(automatic ? '自動取得完了。所持データを読み込みました。' : '取得完了。所持データを読み込みました。', 'ok');
      return true;
    } catch (e) {
      setStatus(`取得失敗: ${e.message}`, 'error');
      return false;
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', () => loadCloud());

  clearButton?.addEventListener('click', () => {
    localStorage.removeItem(LOCAL_ENDPOINT);
    localStorage.removeItem(LOCAL_TOKEN);
    sessionStorage.removeItem(LOCAL_ENDPOINT);
    sessionStorage.removeItem(LOCAL_TOKEN);
    token.value = '';
    endpoint.value = DEFAULT_ENDPOINT;
    if (remember) remember.checked = false;
    setStatus('保存したトークンを削除しました。', 'ok');
  });

  if (savedToken.length >= 32) {
    window.addEventListener('load', () => loadCloud({ automatic: true }), { once: true });
  } else if (sessionToken.length >= 32) {
    setStatus('このタブではトークンを再利用できます。');
  }
})();
