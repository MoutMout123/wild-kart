// Wild Kart : serveur des comptes (fonction Netlify + Netlify Blobs).
// Un compte = pseudo + mot de passe. Il garde la sauvegarde du jeu (identifiant ami, amis, groupes, code d'accès, kart, records…).
// Mot de passe perdu : code de secours (donné à la création) ou code de réinitialisation signé par le chef.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import nacl from 'tweetnacl';

const CHEF_PK = new Uint8Array(Buffer.from('03cqxEXIAS3R0Dkv5aNhLxa57hrAecBnXq0L87F9gGI=', 'base64'));
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: H });
const err = (e, status = 200) => out({ e }, status);

const PSEUDO = /^[A-Za-z0-9_-]{3,16}$/, FID = /^[A-Z0-9]{1,10}-\d{4}$/;
const ukey = (p) => 'u/' + p.toLowerCase(), fkey = (f) => 'f/' + f;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('base64url');
const hashPass = (pass, salt) => crypto.pbkdf2Sync(String(pass), salt, 120000, 32, 'sha256').toString('base64');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const newTok = () => crypto.randomBytes(24).toString('base64url');
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newRec = () => { const b = crypto.randomBytes(12); let s = ''; for (let i = 0; i < 12; i++) s += ABC[b[i] % ABC.length]; return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8); };
const recNorm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const b64u = (s) => new Uint8Array(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
const MAX_SAVE = 150000;

function setPass(u, pass) { u.salt = crypto.randomBytes(16).toString('base64'); u.h = hashPass(pass, u.salt); }
function addTok(u) { const t = newTok(); u.toks = (u.toks || []).filter((x) => Date.now() - x.at < 180 * 86400e3).slice(-9); u.toks.push({ h: sha(t), at: Date.now() }); return t; }
const authOk = (u, tok) => !!(u && tok && (u.toks || []).some((x) => same(x.h, sha(tok))));
function locked(u) { const f = u.fails || { n: 0, t: 0 }; return f.n >= 8 && Date.now() - f.t < 15 * 60e3; }
function fail(u) { const f = u.fails && Date.now() - u.fails.t < 15 * 60e3 ? u.fails : { n: 0, t: 0 }; u.fails = { n: f.n + 1, t: Date.now() }; }
const pub = (u, tok, rec) => ({ ok: true, pseudo: u.p, fid: u.fid, save: u.save || null, at: u.at || 0, tok, rec });

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: H });
  if (req.method !== 'POST') return err('Utilise POST.', 405);
  const txt = await req.text(); if (txt.length > MAX_SAVE + 4000) return err('Sauvegarde trop grosse.', 413);
  let b; try { b = JSON.parse(txt); } catch (e) { return err('Requête illisible.', 400); }
  const st = getStore({ name: 'comptes', consistency: 'strong' });
  const pseudo = String(b.pseudo || '').trim(); const getU = () => st.get(ukey(pseudo), { type: 'json' });
  const putU = (u) => st.setJSON(ukey(pseudo), u);

  // identifiant ami libre ? (et réservation si connecté)
  if (b.a === 'fid') {
    const fid = String(b.fid || ''); if (!FID.test(fid)) return err('L\'identifiant ressemble à LEA-4821.');
    const owner = await st.get(fkey(fid), { type: 'text' }); const me = pseudo ? pseudo.toLowerCase() : null;
    if (owner && owner !== me) return out({ ok: true, free: false });
    if (!b.tok) return out({ ok: true, free: true });
    const u = await getU(); if (!authOk(u, b.tok)) return err('Reconnecte-toi à ton compte.', 401);
    if (!owner) { const w = await st.set(fkey(fid), me, { onlyIfNew: true }); if (w && w.modified === false) return out({ ok: true, free: false }); }
    if (u.fid && u.fid !== fid) await st.delete(fkey(u.fid)); u.fid = fid; await putU(u); return out({ ok: true, free: true, set: true });
  }

  if (!PSEUDO.test(pseudo)) return err('Pseudo : 3 à 16 lettres ou chiffres (sans espace).');

  if (b.a === 'create') {
    const pass = String(b.pass || ''); if (pass.length < 4) return err('Mot de passe : au moins 4 caractères.');
    let fid = FID.test(String(b.fid || '')) ? String(b.fid) : 'JOUEUR-' + (1000 + crypto.randomInt(9000));
    const save = b.save && typeof b.save === 'object' ? b.save : {}; if (JSON.stringify(save).length > MAX_SAVE) return err('Sauvegarde trop grosse.');
    const u = { p: pseudo, fid, save, at: Date.now(), created: Date.now() }; setPass(u, pass); const tok = addTok(u), rec = newRec(); u.rec = sha(recNorm(rec));
    const w = await st.setJSON(ukey(pseudo), u, { onlyIfNew: true }); if (w && w.modified === false) return err('Ce pseudo est déjà pris. Choisis-en un autre.');
    // identifiant ami réservé pour ce compte (si déjà pris par un autre compte : nouveau numéro)
    for (let i = 0; i < 25; i++) { const r = await st.set(fkey(fid), pseudo.toLowerCase(), { onlyIfNew: true }); if (!r || r.modified !== false) break; const owner = await st.get(fkey(fid), { type: 'text' }); if (owner === pseudo.toLowerCase()) break; fid = fid.split('-')[0] + '-' + (1000 + crypto.randomInt(9000)); }
    if (fid !== u.fid) { u.fid = fid; u.save = Object.assign({}, save, { fid }); await putU(u); }
    return out(pub(u, tok, rec));
  }

  const u = await getU(); if (!u) return err('Aucun compte avec ce pseudo.');

  if (b.a === 'login') {
    if (locked(u)) return err('Trop d\'essais ratés. Attends 15 minutes.');
    if (!same(hashPass(b.pass || '', u.salt), u.h)) { fail(u); await putU(u); return err('Mot de passe incorrect.'); }
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
    setPass(u, pass); u.toks = []; u.fails = null; const tok = addTok(u), rec = newRec(); u.rec = sha(recNorm(rec)); await putU(u); return out(pub(u, tok, rec));
  }

  if (!authOk(u, b.tok)) return err('Reconnecte-toi à ton compte.', 401);
  if (b.a === 'load') return out(pub(u));
  if (b.a === 'save') {
    const save = b.save && typeof b.save === 'object' ? b.save : null; if (!save) return err('Rien à sauvegarder.');
    if (JSON.stringify(save).length > MAX_SAVE) return err('Sauvegarde trop grosse.');
    u.save = Object.assign({}, save, { fid: u.fid }); u.at = Date.now(); await putU(u); return out({ ok: true, at: u.at });
  }
  if (b.a === 'pass') {
    if (!same(hashPass(b.old || '', u.salt), u.h)) return err('Ancien mot de passe incorrect.');
    if (String(b.pass || '').length < 4) return err('Nouveau mot de passe : au moins 4 caractères.');
    setPass(u, b.pass); u.toks = []; const tok = addTok(u); await putU(u); return out({ ok: true, tok });
  }
  if (b.a === 'logout') { u.toks = (u.toks || []).filter((x) => !same(x.h, sha(b.tok))); await putU(u); return out({ ok: true }); }
  return err('Action inconnue.', 400);
};

export const config = { path: '/api/compte' };
