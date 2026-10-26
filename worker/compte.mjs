// Wild Kart : serveur des comptes (fonction Netlify + Netlify Blobs).
// Un compte = pseudo + mot de passe. Il garde la sauvegarde du jeu (identifiant ami, amis, groupes, code d'accès, kart, records…).
// Mot de passe perdu : code de secours (donné à la création) ou code de réinitialisation signé par le chef.
import { getStore } from './store.mjs';
import crypto from 'node:crypto';
import nacl from 'tweetnacl';

const CHEF_PK = new Uint8Array(Buffer.from('03cqxEXIAS3R0Dkv5aNhLxa57hrAecBnXq0L87F9gGI=', 'base64'));
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: H });
const err = (e, status = 200) => out({ e }, status);

const PSEUDO = /^[A-Za-z0-9_-]{3,16}$/, FID = /^[A-Z0-9]{1,10}-\d{4}$/;
const ukey = (p) => 'u/' + p.toLowerCase(), fkey = (f) => 'f/' + f;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('base64url');
// PBKDF2 par Web Crypto (rapide et natif : tient dans les 10 ms de calcul du serveur gratuit)
const PASS_IT = 20000;
async function hashPass(pass, salt, it) { const sub = (globalThis.crypto && globalThis.crypto.subtle) || crypto.webcrypto.subtle, enc = new TextEncoder();
  const key = await sub.importKey('raw', enc.encode(String(pass)), 'PBKDF2', false, ['deriveBits']);
  const bits = await sub.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(String(salt)), iterations: it || 120000 }, key, 256); return Buffer.from(bits).toString('base64'); }
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const newTok = () => crypto.randomBytes(24).toString('base64url');
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newRec = () => { const b = crypto.randomBytes(12); let s = ''; for (let i = 0; i < 12; i++) s += ABC[b[i] % ABC.length]; return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8); };
const recNorm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const b64u = (s) => new Uint8Array(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
const MAX_SAVE = 150000;
// ---------- reprise des comptes de l'ancien serveur (Netlify) : chaque compte est recopié tout seul à sa première visite ----------
const OLD = () => globalThis.WK_OLD_API || '';
async function oldCall(a, body) { if (!OLD()) return null; try { const r = await fetch(OLD(), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(Object.assign({ a }, body)) }); return await r.json(); } catch (e) { return null; } }
async function importU(st, pseudo, r, pass, tok) { const u = { p: r.pseudo || pseudo, fid: r.fid, save: r.save || {}, at: r.at || Date.now(), created: Date.now(), migrated: Date.now(), toks: [] };
  if (pass) await setPass(u, pass); if (tok) u.toks.push({ h: sha(tok), at: Date.now() });
  const w = await st.setJSON('u/' + pseudo.toLowerCase(), u, { onlyIfNew: true }); if (w && w.modified === false) return st.get('u/' + pseudo.toLowerCase(), { type: 'json' });
  if (u.fid) await st.set('f/' + u.fid, pseudo.toLowerCase(), { onlyIfNew: true }); return u; }
// --- codes d'accès et liste du chef (même code que dans le jeu) ---
/* code d'accès Wild Kart : 8 octets (version, date de fin, aléa) + signature Ed25519, écrits en base 32 */
const WK_B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function wkB32enc(u8) { let bits = 0, val = 0, out = ''; for (const b of u8) { val = ((val << 8) | b) & 0xffffff; bits += 8; while (bits >= 5) { out += WK_B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += WK_B32[(val << (5 - bits)) & 31]; return out; }
function wkB32dec(s) { let bits = 0, val = 0; const out = []; for (const ch of s) { const v = WK_B32.indexOf(ch); if (v < 0) return null; val = ((val << 5) | v) & 0xffffff; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }
function wkCands(code) { const s = String(code || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, ''); const out = []; let i = s.indexOf('WK'); while (i >= 0) { if (s.length - i - 2 >= 116) out.push(s.slice(i + 2, i + 118)); i = s.indexOf('WK', i + 1); } if (!out.length && s.length >= 116) out.push(s.slice(0, 116)); return out; }
function wkParseOne(body) { const u = wkB32dec(body); if (!u || u.length < 72) return null; const msg = u.slice(0, 8), sig = u.slice(8, 72); if (msg[0] !== 1) return null; const exp = ((msg[1] << 24) >>> 0) + (msg[2] << 16) + (msg[3] << 8) + msg[4]; return { msg, sig, exp: exp * 1000 }; }
function wkParseAll(code) { return wkCands(code).map(wkParseOne).filter(Boolean); }
/* liste du chef (codes annulés, joueurs bloqués), signée : « WKL.<données>.<signature> » */
function wkB64u(u8) { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function wkB64uDec(t) { try { const s = atob(String(t).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; } catch (e) { return null; } }
const wkHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const wkCodeId = (p) => wkHex(p.msg.slice(1, 8));
function wkListParse(text, pk) { const m = /WKL\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)/.exec(String(text || '').replace(/\s+/g, '')); if (!m) return null; const body = wkB64uDec(m[1]), sig = wkB64uDec(m[2]); if (!body || !sig || sig.length !== 64) return null;
  let ok = false; try { ok = nacl.sign.detached.verify(body, sig, pk); } catch (e) { ok = false; } if (!ok) return null; let j; try { j = JSON.parse(new TextDecoder().decode(body)); } catch (e) { return null; }
  if (!j || typeof j.s !== 'number') return null; return { text: m[0], s: j.s, r: (j.r || []).map(String), b: (j.b || []).map(String), u: +j.u || 0 }; }

const btoa = globalThis.btoa || ((x) => Buffer.from(x, 'binary').toString('base64')), atob = globalThis.atob || ((x) => Buffer.from(x, 'base64').toString('binary'));
// actions réservées au chef : signées avec sa clé (« action.horodatage »)
function chefOk(b) { const ts = +b.ts; if (!ts || Math.abs(Date.now() - ts) > 10 * 60e3) return false; try { return nacl.sign.detached.verify(new TextEncoder().encode(b.a + '.' + ts), b64u(b.sig), CHEF_PK); } catch (e) { return false; } }
async function codeSeen(st, p, who) { const id = wkCodeId(p), key = 'c/' + id; const c = (await st.get(key, { type: 'json' })) || { id, exp: p.exp, first: Date.now(), users: {} };
  if (who) { const u = c.users[who.fid]; if (u && Date.now() - u.t < 10 * 60e3 && u.n === who.n && u.p === who.p) return; c.users[who.fid] = { n: who.n, p: who.p, t: Date.now() };
    const ks = Object.keys(c.users); if (ks.length > 60) { ks.sort((a, b) => c.users[a].t - c.users[b].t); for (const k of ks.slice(0, ks.length - 60)) delete c.users[k]; } }
  else if (c.chef) return; else c.chef = Date.now();
  await st.setJSON(key, c); }

async function setPass(u, pass) { u.salt = crypto.randomBytes(16).toString('base64'); u.it = PASS_IT; u.h = await hashPass(pass, u.salt, u.it); }
function addTok(u) { const t = newTok(); u.toks = (u.toks || []).filter((x) => Date.now() - x.at < 180 * 86400e3).slice(-9); u.toks.push({ h: sha(t), at: Date.now() }); return t; }
const authOk = (u, tok) => !!(u && tok && (u.toks || []).some((x) => same(x.h, sha(tok))));
function locked(u) { const f = u.fails || { n: 0, t: 0 }; return f.n >= 8 && Date.now() - f.t < 15 * 60e3; }
function fail(u) { const f = u.fails && Date.now() - u.fails.t < 15 * 60e3 ? u.fails : { n: 0, t: 0 }; u.fails = { n: f.n + 1, t: Date.now() }; }
const pub = (u, tok, rec) => ({ ok: true, pseudo: u.p, fid: u.fid, save: u.save || null, at: u.at || 0, tok, rec });

// code d'accès valide (signé par le chef, pas expiré) : sert au serveur pour réserver le relais TURN aux vrais joueurs
export function wkAccessOk(code, b) { if (b && b.a === 'ice' && b.sig && chefOk(b)) return true; try { const p = wkParseAll(String(code || '')).find((x) => { try { return nacl.sign.detached.verify(x.msg, x.sig, CHEF_PK); } catch (e) { return false; } }); return !!(p && p.exp > Date.now()); } catch (e) { return false; } }
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: H });
  if (req.method !== 'POST') return err('Utilise POST.', 405);
  const txt = await req.text(); if (txt.length > MAX_SAVE + 4000) return err('Sauvegarde trop grosse.', 413);
  let b; try { b = JSON.parse(txt); } catch (e) { return err('Requête illisible.', 400); }
  const st = getStore({ name: 'comptes', consistency: 'strong' });
  const pseudo = String(b.pseudo || '').trim(); const getU = () => st.get(ukey(pseudo), { type: 'json' });
  const putU = (u) => st.setJSON(ukey(pseudo), u);

  // ---------- mise en relation des parties en ligne (échange des adresses WebRTC) ----------
  if (/^sig(reg|poll|send|del)$/.test(String(b.a))) {
    const id = String(b.id || ''), t0 = Date.now(); if (!/^[A-Za-z0-9-]{3,48}$/.test(id)) return err('Identifiant invalide.');
    const sk = 's/' + id, qp = 'q/' + id + '/';
    if (b.a === 'sigreg') { const r = await st.get(sk, { type: 'json' }); if (r && t0 - r.t < 120e3 && r.k !== b.k) return out({ ok: false, code: 'unavailable-id', e: 'Déjà pris.' });
      await st.setJSON(sk, { t: t0, k: b.k || '' }); return out({ ok: true }); }
    if (b.a === 'sigpoll') { await st.setJSON(sk, { t: t0 }); let { blobs } = await st.list({ prefix: qp }); const msgs = [];
      // attente courte : la réponse part dès qu'un message arrive (connexion plus rapide, moins de requêtes)
      if (!blobs.length && b.wait) { const end = t0 + Math.min(7, Math.max(0, +b.wait || 0)) * 1000; let n = 0; while (!blobs.length && Date.now() < end && n++ < 20) { await new Promise((r) => setTimeout(r, 400)); ({ blobs } = await st.list({ prefix: qp })); } }
      for (const x of blobs) { const m = await st.get(x.key, { type: 'json' }); await st.delete(x.key); if (m && t0 - (m.at || 0) < 60e3) msgs.push(m); } return out({ ok: true, msgs }); }
    if (b.a === 'sigsend') { const r = await st.get(sk, { type: 'json' }); if (!r || t0 - r.t > 120e3) return out({ ok: false, code: 'peer-unavailable', e: 'Aucune partie avec ce code.' });
      const m = b.msg; if (!m || typeof m !== 'object' || JSON.stringify(m).length > 20000) return err('Message invalide.');
      await st.setJSON(qp + t0 + '-' + crypto.randomBytes(4).toString('hex'), Object.assign({}, m, { at: t0 })); return out({ ok: true }); }
    const { blobs } = await st.list({ prefix: qp }); for (const x of blobs) await st.delete(x.key); await st.delete(sk); return out({ ok: true });
  }
  // ---------- amis et groupes (boîte aux lettres + présence) ----------
  const GC = /^G-[A-Z0-9]{6}$/, nm = (x) => String(x || '').slice(0, 12), now = Date.now();
  const pubG = (g) => ({ code: g.code, name: g.name, public: g.public, owner: g.owner, members: g.members });
  if (b.a === 'fsend') {
    const from = b.from || {}; if (!FID.test(String(from.id))) return err('Expéditeur invalide.');
    let to = [...new Set((Array.isArray(b.to) ? b.to : []).map(String).filter((x) => FID.test(x)))].slice(0, 40);
    if (/^G-[A-Z0-9]{6}$/.test(String(b.group || ''))) { const g = await st.get('g/' + b.group, { type: 'json' }); if (g && g.members.some((x) => x.id === from.id)) to = [...new Set(to.concat(g.members.map((x) => x.id)))].filter((x) => x !== from.id).slice(0, 40); }   // tout le groupe (même ceux arrivés à l'instant)
    const msg = b.msg && typeof b.msg === 'object' ? b.msg : null; if (!msg || JSON.stringify(msg).length > 6000) return err('Message invalide.');
    const m = Object.assign({}, msg, { from: { id: from.id, name: nm(from.name) }, at: now, mid: crypto.randomBytes(6).toString('hex') }); const online = {};
    await Promise.all(to.map(async (id) => { const key = 'm/' + id; const L = ((await st.get(key, { type: 'json' })) || []).filter((x) => now - x.at < 7 * 86400e3).slice(-49); L.push(m); await st.setJSON(key, L);
      const pr = await st.get('p/' + id, { type: 'json' }); online[id] = !!(pr && now - pr.t < 90e3); }));
    return out({ ok: true, online });
  }
  if (b.a === 'fpoll') {
    const me = b.me || {}; if (!FID.test(String(me.id))) return err('Identifiant invalide.');
    const pk = 'p/' + me.id, pr = await st.get(pk, { type: 'json' }), stt = me.st && typeof me.st === 'object' && JSON.stringify(me.st).length < 600 ? me.st : null;
    if (!pr || now - pr.t > 40e3 || pr.n !== nm(me.name) || JSON.stringify(pr.st || null) !== JSON.stringify(stt)) await st.setJSON(pk, { t: now, n: nm(me.name), st: stt, pu: String(me.pu || '').slice(0, 16) });
    const mk = 'm/' + me.id; let L = (await st.get(mk, { type: 'json' })) || []; const ack = +b.ack || 0;
    // attente courte (jusqu'à ~10 s) : l'invitation arrive tout de suite au lieu d'attendre le prochain passage
    const nIds = Array.isArray(b.ids) ? Math.min(80, b.ids.length) : 0, nG = Array.isArray(b.groups) ? Math.min(20, b.groups.length) : 0; let lim = Math.min(11, 44 - nIds - nG);   // Cloudflare : 50 requêtes à la base max par appel
    if (b.wait && lim > 0 && !L.some((x) => x.at > (+b.since || 0))) { const end = Date.now() + Math.min(10, Math.max(0, +b.wait || 0)) * 1000;
      while (Date.now() < end && lim-- > 0) { await new Promise((r) => setTimeout(r, 900)); L = (await st.get(mk, { type: 'json' })) || []; if (L.some((x) => x.at > (+b.since || 0))) break; } }
    if (ack && L.some((x) => x.at <= ack)) { L = L.filter((x) => x.at > ack); await st.setJSON(mk, L); }
    const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(String).filter((x) => FID.test(x)))].slice(0, 80), online = {};
    await Promise.all(ids.map(async (id) => { const q = await st.get('p/' + id, { type: 'json' }); online[id] = q ? q.t : 0; }));
    const groups = {}; await Promise.all((Array.isArray(b.groups) ? b.groups : []).map(String).filter((c) => GC.test(c)).slice(0, 20).map(async (c) => { const g = await st.get('g/' + c, { type: 'json' }); groups[c] = g ? pubG(g) : null; }));
    return out({ ok: true, now, msgs: L.filter((x) => x.at > (+b.since || 0)), online, groups });
  }
  if (b.a === 'gsave' || b.a === 'gjoin' || b.a === 'gleave' || b.a === 'gren' || b.a === 'ginv') {
    const me = b.me || {}, code = String((b.group && b.group.code) || b.code || ''); if (!FID.test(String(me.id)) || !GC.test(code)) return err('Groupe invalide.');
    const key = 'g/' + code; let g = await st.get(key, { type: 'json' });
    if (b.a === 'gsave') { if (g) return out({ ok: true, group: pubG(g) }); const g0 = b.group;
      g = { code, name: String(g0.name || 'Groupe').slice(0, 24), public: !!g0.public, ph: g0.public ? '' : sha('g' + String(g0.pass || '')), owner: me.id, members: [{ id: me.id, name: nm(me.name) }], at: now };
      const w = await st.setJSON(key, g, { onlyIfNew: true }); if (w && w.modified === false) return err('Code déjà pris, réessaie.'); return out({ ok: true, group: pubG(g) }); }
    if (!g) return err('Groupe introuvable. Vérifie le code.');
    if (b.a === 'ginv') { if (!g.members.some((x) => x.id === me.id)) return err('Tu ne fais pas partie de ce groupe.'); g.inv = [...new Set((g.inv || []).concat((Array.isArray(b.to) ? b.to : []).map(String).filter((x) => FID.test(x))))].slice(-100); await st.setJSON(key, g); return out({ ok: true }); }
    if (b.a === 'gjoin') { const invited = (g.inv || []).includes(me.id); if (!g.public && !invited && !same(sha('g' + String(b.pass || '')), g.ph)) return err('Mot de passe incorrect.'); if (invited) g.inv = g.inv.filter((x) => x !== me.id);
      if (!g.members.some((x) => x.id === me.id)) { if (g.members.length >= 60) return err('Groupe complet.'); g.members.push({ id: me.id, name: nm(me.name) }); } await st.setJSON(key, g); return out({ ok: true, group: pubG(g) }); }
    if (b.a === 'gren') { const old = String(b.old || ''); const x = g.members.find((y) => y.id === old); if (x && !g.members.some((y) => y.id === me.id)) { x.id = me.id; x.name = nm(me.name); if (g.owner === old) g.owner = me.id; await st.setJSON(key, g); } return out({ ok: true, group: pubG(g) }); }
    g.members = g.members.filter((x) => x.id !== me.id); if (!g.members.length) await st.delete(key); else { if (g.owner === me.id) g.owner = g.members[0].id; await st.setJSON(key, g); } return out({ ok: true });
  }
  // état partagé : chaque jeu envoie son code (pour la liste des codes actifs du chef) et reçoit la liste du chef
  if (b.a === 'state') {
    const p = wkParseAll(b.code || '').find((x) => { try { return nacl.sign.detached.verify(x.msg, x.sig, CHEF_PK); } catch (e) { return false; } });
    const fid = FID.test(String(b.fid || '')) ? String(b.fid) : null;
    if (p && fid && p.exp > Date.now()) await codeSeen(st, p, { fid, n: String(b.name || '').slice(0, 12), p: String(b.pseudo || '').slice(0, 16) });
    return out({ ok: true, cl: (await st.get('chef/list', { type: 'text' })) || '' });
  }
  if (b.a === 'clset') { const L = wkListParse(b.cl, CHEF_PK); if (!L) return err('Liste du chef invalide.');
    const cur = wkListParse(await st.get('chef/list', { type: 'text' }), CHEF_PK); if (!cur || L.s > cur.s) await st.set('chef/list', L.text); return out({ ok: true }); }
  if (b.a === 'live') { if (!chefOk(b)) return err('Réservé au chef.', 403);
    const { blobs } = await st.list({ prefix: 'p/' }), live = [];
    await Promise.all(blobs.map(async (x) => { const p = await st.get(x.key, { type: 'json' }); if (!p) return; if (Date.now() - p.t > 60 * 86400e3) { await st.delete(x.key); return; } if (Date.now() - p.t < 150e3) live.push(Object.assign({ fid: x.key.slice(2) }, p)); }));
    return out({ ok: true, now: Date.now(), live }); }
  if (b.a === 'codeadd' || b.a === 'codes') {
    if (!chefOk(b)) return err('Réservé au chef.', 403);
    if (b.a === 'codeadd') { const p = wkParseAll(b.code || '').find((x) => nacl.sign.detached.verify(x.msg, x.sig, CHEF_PK)); if (!p) return err('Code invalide.'); await codeSeen(st, p, null); return out({ ok: true }); }
    const { blobs } = await st.list({ prefix: 'c/' }); const codes = [];
    for (const x of blobs) { const c = await st.get(x.key, { type: 'json' }); if (!c) continue; if (c.exp < Date.now() - 3 * 86400e3) { await st.delete(x.key); continue; } codes.push(c); }
    codes.sort((a, b) => b.exp - a.exp); return out({ ok: true, codes });
  }
  // identifiant ami libre ? (et réservation si connecté)
  if (b.a === 'fid') {
    const fid = String(b.fid || ''); if (!FID.test(fid)) return err('L\'identifiant ressemble à LEA-4821.');
    const owner = await st.get(fkey(fid), { type: 'text' }); const me = pseudo ? pseudo.toLowerCase() : null;
    if (owner && owner !== me) return out({ ok: true, free: false });
    { const pr = await st.get('p/' + fid, { type: 'json' }); if (pr && Date.now() - pr.t < 60 * 86400e3 && !b.tok) return out({ ok: true, free: false }); }
    if (!b.tok) { if (OLD() && !owner) { const o = await oldCall('fid', { fid }); if (o && o.ok && o.free === false) return out({ ok: true, free: false }); } return out({ ok: true, free: true }); }
    let u = await getU(); if (!u && OLD() && pseudo) { const o = await oldCall('load', { pseudo, tok: b.tok }); if (o && o.ok) u = await importU(st, pseudo, o, null, b.tok); }
    if (!authOk(u, b.tok)) return err('Reconnecte-toi à ton compte.', 401);
    if (!owner) { const w = await st.set(fkey(fid), me, { onlyIfNew: true }); if (w && w.modified === false) return out({ ok: true, free: false }); }
    if (u.fid && u.fid !== fid) await st.delete(fkey(u.fid)); u.fid = fid; await putU(u); return out({ ok: true, free: true, set: true });
  }

  if (!PSEUDO.test(pseudo)) return err('Pseudo : 3 à 16 lettres ou chiffres (sans espace).');
  // le chef supprime un compte (et libère son identifiant ami) ; « x/ » empêche de le recopier depuis l'ancien serveur
  if (b.a === 'udel') { if (!chefOk(b)) return err('Réservé au chef.', 403); const u = await getU(); if (!u) return err('Aucun compte avec ce pseudo.');
    if (u.fid && (await st.get(fkey(u.fid), { type: 'text' })) === pseudo.toLowerCase()) await st.delete(fkey(u.fid));
    await st.delete(ukey(pseudo)); await st.set('x/' + pseudo.toLowerCase(), String(Date.now())); return out({ ok: true }); }

  if (b.a === 'create') {
    const pass = String(b.pass || ''); if (pass.length < 4) return err('Mot de passe : au moins 4 caractères.');
    let fid = FID.test(String(b.fid || '')) ? String(b.fid) : 'JOUEUR-' + (1000 + crypto.randomInt(9000));
    const save = b.save && typeof b.save === 'object' ? b.save : {}; if (JSON.stringify(save).length > MAX_SAVE) return err('Sauvegarde trop grosse.');
    if (OLD() && !(await getU()) && !(await st.get('x/' + pseudo.toLowerCase()))) { const o = await oldCall('login', { pseudo, pass });
      if (o && o.ok) { const u2 = await importU(st, pseudo, o, pass, null); const tok = addTok(u2); await putU(u2); return out(pub(u2, tok)); }
      if (o && o.e && o.e !== 'Aucun compte avec ce pseudo.') return err('Ce pseudo est déjà pris. Choisis-en un autre.'); }
    const u = { p: pseudo, fid, save, at: Date.now(), created: Date.now() }; await setPass(u, pass); const tok = addTok(u), rec = newRec(); u.rec = sha(recNorm(rec));
    const w = await st.setJSON(ukey(pseudo), u, { onlyIfNew: true }); if (w && w.modified === false) return err('Ce pseudo est déjà pris. Choisis-en un autre.');
    // identifiant ami réservé pour ce compte (si déjà pris par un autre compte : nouveau numéro)
    for (let i = 0; i < 25; i++) { const r = await st.set(fkey(fid), pseudo.toLowerCase(), { onlyIfNew: true }); if (!r || r.modified !== false) break; const owner = await st.get(fkey(fid), { type: 'text' }); if (owner === pseudo.toLowerCase()) break; fid = fid.split('-')[0] + '-' + (1000 + crypto.randomInt(9000)); }
    if (fid !== u.fid) { u.fid = fid; u.save = Object.assign({}, save, { fid }); await putU(u); }
    return out(pub(u, tok, rec));
  }

  let u = await getU();
  if (!u && OLD() && !(await st.get('x/' + pseudo.toLowerCase()))) { if (b.a === 'login') { const o = await oldCall('login', { pseudo, pass: b.pass }); if (o && o.ok) u = await importU(st, pseudo, o, b.pass, null); else if (o && o.e) return err(o.e); }
    else if (b.tok) { const o = await oldCall('load', { pseudo, tok: b.tok }); if (o && o.ok) u = await importU(st, pseudo, o, null, b.tok); } }
  if (!u) return err('Aucun compte avec ce pseudo.');

  if (b.a === 'login') {
    if (locked(u)) return err('Trop d\'essais ratés. Attends 15 minutes.');
    if (!u.h) { const o = await oldCall('login', { pseudo, pass: b.pass }); if (o && o.ok) await setPass(u, b.pass); else return err((o && o.e) || 'Mot de passe incorrect.'); }
    if (!same(await hashPass(b.pass || '', u.salt, u.it), u.h)) { fail(u); await putU(u); return err('Mot de passe incorrect.'); }
    u.fails = null; const tok = addTok(u); await putU(u); return out(pub(u, tok));
  }
  if (b.a === 'reset') {
    const pass = String(b.pass || ''); if (pass.length < 4) return err('Nouveau mot de passe : au moins 4 caractères.');
    const code = String(b.code || '').trim(); let ok = false;
    const m = /^WKR\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(code.replace(/\s+/g, ''));
    if (m) { // code du chef
      try { const body = b64u(m[1]), sig = b64u(m[2]); const j = JSON.parse(Buffer.from(body).toString('utf8'));
        if (nacl.sign.detached.verify(body, sig, CHEF_PK) && String(j.u).toLowerCase() === pseudo.toLowerCase() && j.e > Date.now() && !(u.usedResets || []).includes(sha(m[2]))) { ok = true; u.usedResets = (u.usedResets || []).slice(-20).concat([sha(m[2])]); } } catch (e) { ok = false; }
      if (!ok) return err('Code du chef faux, expiré ou déjà utilisé (il doit être fait pour ce pseudo).');
    } else {
      if (locked(u)) return err('Trop d\'essais ratés. Attends 15 minutes.');
      ok = !!u.rec && same(sha(recNorm(code)), u.rec); if (!ok) { fail(u); await putU(u); return err('Code de secours incorrect.'); }
    }
    await setPass(u, pass); u.toks = []; u.fails = null; const tok = addTok(u), rec = newRec(); u.rec = sha(recNorm(rec)); await putU(u); return out(pub(u, tok, rec));
  }

  if (!authOk(u, b.tok)) return err('Reconnecte-toi à ton compte.', 401);
  if (b.a === 'load') return out(pub(u));
  if (b.a === 'save') {
    const save = b.save && typeof b.save === 'object' ? b.save : null; if (!save) return err('Rien à sauvegarder.');
    if (JSON.stringify(save).length > MAX_SAVE) return err('Sauvegarde trop grosse.');
    u.save = Object.assign({}, save, { fid: u.fid }); u.at = Date.now(); await putU(u); return out({ ok: true, at: u.at });
  }
  if (b.a === 'pass') {
    if (!u.h) { const o = await oldCall('login', { pseudo, pass: b.old }); if (!(o && o.ok)) return err('Ancien mot de passe incorrect.'); }
    else if (!same(await hashPass(b.old || '', u.salt, u.it), u.h)) return err('Ancien mot de passe incorrect.');
    if (String(b.pass || '').length < 4) return err('Nouveau mot de passe : au moins 4 caractères.');
    await setPass(u, b.pass); u.toks = []; const tok = addTok(u); await putU(u); return out({ ok: true, tok });
  }
  if (b.a === 'logout') { u.toks = (u.toks || []).filter((x) => !same(x.h, sha(b.tok))); await putU(u); return out({ ok: true }); }
  return err('Action inconnue.', 400);
};


