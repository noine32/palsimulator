(() => {
  const $ = s => document.querySelector(s);
  const endpoint = $('#cloudEndpoint');
  const token = $('#cloudToken');
  const button = $('#cloudLoadBtn');
  const status = $('#cloudStatus');
  if (!endpoint || !token || !button || !status) return;

  endpoint.value = sessionStorage.getItem('palbreeder.cloudEndpoint') || '';
  token.value = sessionStorage.getItem('palbreeder.readToken') || '';

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

  button.addEventListener('click', async () => {
    const base = endpoint.value.trim().replace(/\/$/, '');
    const readToken = token.value.trim();
    if (!/^https:\/\//i.test(base)) {
      setStatus('Worker URLは https:// で入力してください。', 'error');
      return;
    }
    if (readToken.length < 32) {
      setStatus('プレイヤートークンを確認してください。', 'error');
      return;
    }

    button.disabled = true;
    setStatus('クラウドから取得中…');
    try {
      const r = await fetch(`${base}/api/v1/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${readToken}` },
        cache: 'no-store'
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      if (body?.schema !== 'palbreeder-owned-pals-v1') throw new Error('取得データの形式が不正です。');
      sessionStorage.setItem('palbreeder.cloudEndpoint', base);
      sessionStorage.setItem('palbreeder.readToken', readToken);
      await injectAsLocalFile(body);
      setStatus('取得完了。所持データを読み込みました。', 'ok');
    } catch (e) {
      setStatus(`取得失敗: ${e.message}`, 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
