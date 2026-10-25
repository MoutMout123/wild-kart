// Wild Kart : serveur (Cloudflare Workers). Même code que l'ancien serveur Netlify ; il récupère tout seul les comptes de l'ancien.
import { setEnv } from './store.mjs';
import handler from './compte.mjs';
// relais TURN Cloudflare (gratuit jusqu'à 1 000 Go/mois) : permet de jouer en ligne entre réseaux différents (4G, box différentes)
let ICE = null, ICEt = 0;
async function iceServers(env) {
  if (!env.TURN_ID || !env.TURN_TOKEN) return null; if (ICE && Date.now() - ICEt < 6 * 3600e3) return ICE;
  try { const r = await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + env.TURN_ID + '/credentials/generate-ice-servers', { method: 'POST', headers: { Authorization: 'Bearer ' + env.TURN_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }) });
    if (!r.ok) return ICE; const j = await r.json(); const L = (j.iceServers || []).map((s) => Object.assign({}, s, { urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }));
    ICE = L; ICEt = Date.now(); return ICE; } catch (e) { return ICE; } }
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
export default { async fetch(req, env) {
  if (req.method === 'POST') { const txt = await req.clone().text(); if (/"a"\s*:\s*"ice"/.test(txt.slice(0, 40))) { const s = await iceServers(env); return new Response(JSON.stringify({ ok: true, iceServers: s || [] }), { headers: H }); } }
  await setEnv(env); globalThis.WK_OLD_API = env.OLD_API || ''; return handler(req); } };
