const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || 'https://noine32.github.io').replace(/\/$/, '');
  if (!origin || origin.replace(/\/$/, '') !== allowed) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Authorization,Content-Type',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
}

function json(body, status = 200, origin = '', env = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...cors(origin, env) } });
}

function bearer(request) {
  const v = request.headers.get('authorization') || '';
  return v.startsWith('Bearer ') ? v.slice(7).trim() : '';
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function validUid(uid) { return /^[0-9]{1,20}$/.test(uid); }

async function parseJson(request, maxBytes = 2_000_000) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new Error('payload too large');
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('payload too large');
  return JSON.parse(text);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';

    if (request.method === 'OPTIONS') {
      const h = cors(origin, env);
      if (!Object.keys(h).length) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: h });
    }

    if (url.pathname === '/api/v1/health' && request.method === 'GET') {
      return json({ ok: true, service: 'palbreeder-sync-v1' }, 200, origin, env);
    }

    const m = url.pathname.match(/^\/api\/v1\/player\/([0-9]{1,20})$/);
    if (m && request.method === 'POST') {
      if (!env.PUSH_SECRET || bearer(request) !== env.PUSH_SECRET) return json({ error: 'unauthorized' }, 401, origin, env);
      const uid = m[1];
      if (!validUid(uid)) return json({ error: 'invalid uid' }, 400, origin, env);
      try {
        const data = await parseJson(request);
        if (data?.schema !== 'palbreeder-owned-pals-v1') return json({ error: 'invalid schema' }, 400, origin, env);
        if (String(data?.player?.uid ?? '') !== uid) return json({ error: 'uid mismatch' }, 400, origin, env);
        await env.PAL_DATA.put(`player:${uid}`, JSON.stringify(data));
        return json({ ok: true, uid, generated_at: data.generated_at || null }, 200, origin, env);
      } catch (e) {
        return json({ error: e.message || 'invalid json' }, 400, origin, env);
      }
    }

    if (url.pathname === '/api/v1/admin/player-token' && request.method === 'POST') {
      if (!env.PUSH_SECRET || bearer(request) !== env.PUSH_SECRET) return json({ error: 'unauthorized' }, 401, origin, env);
      try {
        const body = await parseJson(request, 16_384);
        const uid = String(body?.uid ?? '');
        const token = String(body?.read_token ?? '');
        if (!validUid(uid) || token.length < 32) return json({ error: 'invalid uid or token' }, 400, origin, env);
        const hash = await sha256Hex(token);
        await env.PAL_DATA.put(`token:${hash}`, uid);
        return json({ ok: true, uid }, 200, origin, env);
      } catch (e) {
        return json({ error: e.message || 'invalid json' }, 400, origin, env);
      }
    }

    if (url.pathname === '/api/v1/me' && request.method === 'GET') {
      const token = bearer(request);
      if (token.length < 32) return json({ error: 'unauthorized' }, 401, origin, env);
      const hash = await sha256Hex(token);
      const uid = await env.PAL_DATA.get(`token:${hash}`);
      if (!uid) return json({ error: 'invalid token' }, 401, origin, env);
      const raw = await env.PAL_DATA.get(`player:${uid}`);
      if (!raw) return json({ error: 'player data not found' }, 404, origin, env);
      return new Response(raw, { status: 200, headers: { ...JSON_HEADERS, ...cors(origin, env) } });
    }

    return json({ error: 'not found' }, 404, origin, env);
  }
};
