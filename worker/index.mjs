// Wild Kart : serveur (Cloudflare Workers). Même code que l'ancien serveur Netlify ; il récupère tout seul les comptes de l'ancien.
import { setEnv, getStore } from './store.mjs';
import handler, { wkAccessOk } from './compte.mjs';
// relais TURN Cloudflare (gratuit jusqu'à 1 000 Go/mois) : permet de jouer en ligne entre réseaux différents (4G, box différentes)
let ICE = null, ICEt = 0;
async function iceServers(env) {
  if (!env.TURN_ID || !env.TURN_TOKEN) return null; if (ICE && Date.now() - ICEt < 3600e3) return ICE;
  try { const r = await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + env.TURN_ID + '/credentials/generate-ice-servers', { method: 'POST', headers: { Authorization: 'Bearer ' + env.TURN_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 6 * 3600 }) });
    if (!r.ok) return ICE; const j = await r.json(); const L = (j.iceServers || []).map((s) => Object.assign({}, s, { urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }));
    ICE = L; ICEt = Date.now(); return ICE; } catch (e) { return ICE; } }
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
export default { async fetch(req, env) {
  if (req.method === 'POST') { const txt = await req.clone().text(); if (/"a"\s*:\s*"ice"/.test(txt.slice(0, 40))) {
      // garde-fous pour ne jamais payer : relais seulement pour un code d'accès valide, et 400 demandes par jour au maximum
      let b = {}; try { b = JSON.parse(txt); } catch (e) { /* rien */ }
      if (!wkAccessOk(b.code, b)) return new Response(JSON.stringify({ ok: true, iceServers: [], why: 'code' }), { headers: H });
      await setEnv(env); const st = getStore(), day = 'ice/' + new Date().toISOString().slice(0, 10); const n = +((await st.get(day)) || 0);
      if (n >= 400) return new Response(JSON.stringify({ ok: true, iceServers: [], why: 'limite' }), { headers: H });
      await st.set(day, String(n + 1)); const s = await iceServers(env); return new Response(JSON.stringify({ ok: true, iceServers: s || [] }), { headers: H }); } }
  await setEnv(env); globalThis.WK_OLD_API = env.OLD_API || ''; globalThis.WK_TEST = env.TEST_MODE === '1'; return handler(req); } };
