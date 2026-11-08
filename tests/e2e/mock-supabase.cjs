// Máy chủ giả lập Supabase dùng Postgres THẬT: Auth tối giản + PostgREST tối giản (bảng và RPC).
// Chuẩn bị: chạy tests/sql/supabase-stub.sql rồi supabase/schema.sql trên một CSDL Postgres.
// Chạy:    PGPORT=54329 PGDATABASE=t node tests/e2e/mock-supabase.cjs
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({ host: process.env.PGHOST || '/tmp', port: +(process.env.PGPORT || 54329), user: 'postgres', database: process.env.PGDATABASE || 't' });
const users = new Map();
const tokens = new Map();
const log = [];
const TABLES = new Set(['transactions', 'accounts', 'goals', 'categories', 'settings']);
const FUNCS = new Set(['register_device', 'my_device', 'list_devices', 'approve_device', 'deny_device', 'revoke_device', 'create_recovery_codes', 'use_recovery_code']);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function session(u) {
  const sid = crypto.randomUUID();
  const claims = { sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', session_id: sid, exp: Math.floor(Date.now() / 1000) + 3600 };
  const at = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig`;
  tokens.set(at, claims);
  return {
    access_token: at, token_type: 'bearer', expires_in: 3600, expires_at: claims.exp, refresh_token: crypto.randomUUID(),
    user: { id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
}

// Chạy một truy vấn với vai trò "authenticated" và JWT của người dùng, đúng như PostgREST
async function asUser(claims, fn, role = 'authenticated') {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await c.query(`set local role ${role}`);
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

function where(q, params) {
  const parts = [];
  for (const [k, v] of Object.entries(q)) {
    if (['select', 'on_conflict', 'limit', 'offset', 'order', 'columns'].includes(k)) continue;
    if (!/^\w+$/.test(k)) throw new Error('bad column');
    if (v.startsWith('eq.')) { params.push(v.slice(3)); parts.push(`"${k}"::text = $${params.length}`); }
    else if (v.startsWith('in.')) { params.push(v.slice(4, -1).split(',').map((x) => x.replace(/^"|"$/g, ''))); parts.push(`"${k}"::text = any($${params.length})`); }
  }
  return parts.length ? 'where ' + parts.join(' and ') : '';
}

http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  const cors = {
    'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
    'access-control-expose-headers': 'content-range', 'access-control-allow-credentials': 'true',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    const send = (code, obj, h = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...cors, ...h }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
    const j = body ? JSON.parse(body) : {};
    try {
      if (u.pathname === '/auth/v1/signup') {
        if ([...users.values()].some((x) => x.email === j.email)) return send(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
        const us = { id: crypto.randomUUID(), email: j.email, password: j.password };
        users.set(us.id, us);
        await pool.query('insert into auth.users (id, email) values ($1, $2)', [us.id, us.email]);
        return send(200, session(us));
      }
      if (u.pathname === '/auth/v1/token') {
        const us = [...users.values()].find((x) => x.email === j.email && x.password === j.password);
        return us ? send(200, session(us)) : send(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      if (u.pathname === '/auth/v1/user') {
        const c = tokens.get((req.headers.authorization || '').replace('Bearer ', ''));
        return c ? send(200, { id: c.sub, email: c.email }) : send(401, { msg: 'bad jwt' });
      }
      if (u.pathname === '/auth/v1/logout') return send(204);
      const apikey = req.headers.apikey || '';
      if (u.pathname === '/auth/v1/settings') return apikey === (process.env.MOCK_KEY || 'test-anon-key') ? send(200, { mailer_autoconfirm: true, disable_signup: false }) : send(401, { message: 'Invalid API key' });
      if (u.pathname === '/__state') return send(200, { log: log.slice(-80) });

      const bearer = (req.headers.authorization || '').replace('Bearer ', '');
      const claims = tokens.get(bearer);
      const anon = !claims && apikey === (process.env.MOCK_KEY || 'test-anon-key');
      const rpc = u.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      if (rpc) {
        if (!claims && !anon) return send(401, { message: 'JWT invalid' });
        if (!FUNCS.has(rpc[1])) return send(404, { code: 'PGRST202', message: `Could not find the function public.${rpc[1]}` });
        log.push(`RPC ${rpc[1]}`);
        const keys = Object.keys(j);
        const sql = `select public.${rpc[1]}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`;
        const r = await asUser(claims || {}, (c) => c.query(sql, keys.map((k) => j[k])), claims ? 'authenticated' : 'anon');
        return send(200, r.rows[0].r);
      }
      const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/);
      if (m && TABLES.has(m[1])) {
        if (!claims && !anon) return send(401, { message: 'JWT invalid' });
        const t = m[1];
        log.push(`${req.method} ${t}`);
        if (req.method === 'GET' || req.method === 'HEAD') {
          const params = [];
          const w = where(u.query, params);
          const off = +(u.query.offset || 0);
          const lim = u.query.limit ? +u.query.limit : 100000;
          const r = await asUser(claims || {}, async (c) => ({
            rows: (await c.query(`select * from public.${t} ${w} order by 1, 2 offset ${off} limit ${lim}`, params)).rows,
            total: +(await c.query(`select count(*) from public.${t} ${w}`, params)).rows[0].count,
          }), claims ? 'authenticated' : 'anon');
          return send(200, req.method === 'HEAD' ? undefined : r.rows, { 'content-range': `${r.rows.length ? off + '-' + (off + r.rows.length - 1) : '*'}/${r.total}` });
        }
        if (req.method === 'POST') {
          const arr = Array.isArray(j) ? j : [j];
          if (!arr.length) return send(201);
          const cols = Object.keys(arr[0]).filter((c) => !['user_id', 'id'].includes(c));
          if (!cols.every((c) => /^\w+$/.test(c))) throw new Error('bad col');
          const sets = cols.map((c) => `"${c}" = excluded."${c}"`).join(', ');
          await asUser(claims, (c) => c.query(`insert into public.${t} select * from json_populate_recordset(null::public.${t}, $1) on conflict (user_id, id) do update set ${sets}`, [JSON.stringify(arr)]));
          return send(201);
        }
        if (req.method === 'DELETE') {
          const params = [];
          const w = where(u.query, params);
          await asUser(claims, (c) => c.query(`delete from public.${t} ${w}`, params));
          return send(204);
        }
      }
      send(404, { message: 'not found ' + u.pathname });
    } catch (e) {
      log.push('ERR ' + String(e.message).slice(0, 80));
      send(e.code === '42501' ? 403 : 400, { code: e.code || 'P0001', message: e.message });
    }
  });
}).listen(54321, () => console.log('mock (Postgres thật) sẵn sàng'));
