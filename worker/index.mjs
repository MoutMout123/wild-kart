// Wild Kart : serveur (Cloudflare Workers). Même code que l'ancien serveur Netlify ; il récupère tout seul les comptes de l'ancien.
import { setEnv } from './store.mjs';
import handler from './compte.mjs';
export default { async fetch(req, env) { await setEnv(env); globalThis.WK_OLD_API = env.OLD_API || ''; return handler(req); } };
