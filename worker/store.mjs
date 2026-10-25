// Remplace « Netlify Blobs » par une petite table clé → valeur dans la base D1 de Cloudflare
let ENV = null, ready = null;
export function setEnv(env) { ENV = env; if (!ready) ready = env.DB.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)').catch((e) => { ready = null; throw e; }); return ready; }
export function getStore() { const db = ENV.DB; return {
  async get(k, o) { const r = await db.prepare('SELECT v FROM kv WHERE k = ?').bind(k).first(); if (!r) return null; return o && o.type === 'json' ? JSON.parse(r.v) : r.v; },
  async set(k, v, o) { if (o && o.onlyIfNew) { const r = await db.prepare('INSERT OR IGNORE INTO kv (k, v) VALUES (?, ?)').bind(k, String(v)).run(); return { modified: !!(r.meta && r.meta.changes) }; }
    await db.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, String(v)).run(); return { modified: true }; },
  async setJSON(k, v, o) { return this.set(k, JSON.stringify(v), o); },
  async delete(k) { await db.prepare('DELETE FROM kv WHERE k = ?').bind(k).run(); },
  async list(o) { const p = (o && o.prefix) || ''; const r = await db.prepare('SELECT k FROM kv WHERE k >= ? AND k < ?').bind(p, p + '￿').all(); return { blobs: (r.results || []).map((x) => ({ key: x.k })) }; },
}; }
