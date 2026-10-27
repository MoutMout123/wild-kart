import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

// Exercise both production handlers with isolated storage; never access player data.
for (const path of ['worker/compte.mjs', 'netlify/functions/compte.mjs']) {
  const data = new Map();
  const st = {
    async get(k, o) { const v = data.get(k); return v == null ? null : o?.type === 'json' ? JSON.parse(v) : v; },
    async set(k, v, o) { if (o?.onlyIfNew && data.has(k)) return { modified: false }; data.set(k, String(v)); return { modified: true }; },
    async setJSON(k, v, o) { return this.set(k, JSON.stringify(v), o); },
    async delete(k) { data.delete(k); },
    async list(o) { return { blobs: [...data.keys()].filter(k => k.startsWith(o.prefix)).map(key => ({ key })) }; }
  };
  const require = createRequire(new URL('../' + path, import.meta.url));
  const context = vm.createContext({ Response, Request, Buffer, TextEncoder, Uint8Array, Date, setTimeout, crypto: crypto.webcrypto });
  const module = new vm.SourceTextModule(await readFile(new URL('../' + path, import.meta.url), 'utf8'), { context });
  await module.link(async spec => {
    const values = spec === 'node:crypto' ? { default: crypto } : spec === 'tweetnacl' ? { default: require('tweetnacl') } : { getStore: () => st };
    const m = new vm.SyntheticModule(Object.keys(values), function () { for (const [k, v] of Object.entries(values)) this.setExport(k, v); }, { context });
    return m;
  });
  await module.evaluate();
  const call = async (a, b = {}) => { const r = await module.namespace.default(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({ a, ...b }) })); return { ...await r.json(), status: r.status }; };
  const friends = [{ id: 'AMI-1234', name: 'Ami' }], groups = [{ code: 'G-ABC123', owner: 'LEA-4821', members: [{ id: 'LEA-4821', name: 'Lea' }] }];
  const made = await call('create', { pseudo: 'Lea', pass: 'test', fid: 'LEA-4821', save: { friends, groups, records: { a: 42 } } });
  assert.equal(made.ok, true);
  const auth = { pseudo: 'Lea', tok: made.tok };
  assert.equal((await call('find', { name: 'lea' })).fid, 'LEA-4821');
  assert.equal((await call('name', { ...auth, tok: 'bad', name: 'Julie' })).status, 401);
  const renamed = await call('name', { ...auth, name: 'Julie' });
  assert.equal(renamed.name, 'Julie'); assert.equal(renamed.pseudo, 'Lea'); assert.equal(renamed.fid, made.fid);
  assert.deepEqual(renamed.save.friends, friends); assert.deepEqual(renamed.save.groups, groups); assert.deepEqual(renamed.save.records, { a: 42 });
  assert.equal((await call('find', { name: 'JULIE' })).fid, made.fid);
  assert.ok((await call('find', { name: 'Lea' })).e);
  assert.equal((await call('login', { pseudo: 'Lea', pass: 'test' })).name, 'Julie');
  await call('save', { ...auth, save: { ...made.save, name: 'Lea' } });
  assert.equal((await call('load', auth)).save.name, 'Julie');
  const other = await call('create', { pseudo: 'Paul', pass: 'test' });
  assert.ok((await call('name', { pseudo: 'Paul', tok: other.tok, name: 'Julie' })).e);
  assert.ok((await call('name', { ...auth, name: 'Paul' })).e);
  assert.ok((await call('create', { pseudo: 'Julie', pass: 'test' })).e);
  assert.ok((await call('name', { ...auth, name: '<script>' })).e);
  await call('name', { ...auth, name: 'Lea-1234' });
  assert.equal((await call('find', { name: 'Lea-1234' })).fid, made.fid);
  assert.ok((await call('find', { name: 'Julie' })).e);
  await call('gsave', { me: { id: made.fid, name: 'Lea' }, group: { code: 'G-ABC123', name: 'Amis', public: true } });
  const presence = await call('fpoll', { me: { id: made.fid, name: 'Lea-1234' }, groups: ['G-ABC123'] });
  assert.equal(presence.groups['G-ABC123'].owner, made.fid);
  assert.deepEqual(presence.groups['G-ABC123'].members, [{ id: made.fid, name: 'Lea-1234' }]);
  const observer = await call('fpoll', { me: { id: 'AMI-1234', name: 'Ami' }, ids: [made.fid] });
  assert.equal(observer.names[made.fid], 'Lea-1234');
  const accented = await call('name', { ...auth, name: 'Léa du Kart' });
  assert.equal(accented.name, 'Léa du Kart');
  assert.equal((await call('find', { name: 'LÉA DU KART' })).fid, made.fid);
  console.log(path + ': name edits, lookup, authentication, collisions and friendship preservation passed');
}
