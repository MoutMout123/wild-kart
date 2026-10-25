// Consommation Cloudflare des dernières 24 h (lecture seule, aucun secret affiché)
const T = process.env.CLOUDFLARE_API_TOKEN, H = { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' };
const api = (p) => fetch('https://api.cloudflare.com/client/v4' + p, { headers: H }).then((r) => r.json());
const gql = (query, variables) => fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: H, body: JSON.stringify({ query, variables }) }).then((r) => r.json());
const acc = (await api('/accounts')).result?.[0]; if (!acc) { console.log('compte introuvable'); process.exit(0); }
const to = new Date(), from = new Date(to - 24 * 3600e3), v = { a: acc.id, f: from.toISOString(), t: to.toISOString() };
console.log('période : ' + v.f + ' -> ' + v.t + '  (limites gratuites : 100 000 requêtes/jour, D1 5 000 000 lignes lues et 100 000 écrites/jour)');
const w = await gql(`query($a:String!,$f:Time!,$t:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:2000,filter:{datetime_geq:$f,datetime_leq:$t}){sum{requests errors}quantiles{cpuTimeP50 cpuTimeP99}dimensions{scriptName datetimeHour}}}}}`, v);
if (w.errors) console.log('requêtes : ' + JSON.stringify(w.errors).slice(0, 300));
const W = w.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [], byS = {};
for (const x of W) { const s = (byS[x.dimensions.scriptName] = byS[x.dimensions.scriptName] || { req: 0, err: 0, h: {} }); s.req += x.sum.requests; s.err += x.sum.errors; s.h[x.dimensions.datetimeHour] = (s.h[x.dimensions.datetimeHour] || 0) + x.sum.requests; }
for (const [n, s] of Object.entries(byS)) { console.log(`\n${n} : ${s.req} requêtes en 24 h (${s.err} erreurs)`); for (const h of Object.keys(s.h).sort()) console.log('  ' + h.slice(5, 13).replace('T', ' ') + 'h UTC : ' + s.h[h]); }
const d = await gql(`query($a:String!,$f:Time!,$t:Time!){viewer{accounts(filter:{accountTag:$a}){d1AnalyticsAdaptiveGroups(limit:2000,filter:{datetime_geq:$f,datetime_leq:$t}){sum{readQueries writeQueries rowsRead rowsWritten}dimensions{databaseId datetimeHour}}}}}`, v);
if (d.errors) console.log('D1 : ' + JSON.stringify(d.errors).slice(0, 300));
const dbs = (await api('/accounts/' + acc.id + '/d1/database')).result || [], nm = Object.fromEntries(dbs.map((x) => [x.uuid, x.name])), byD = {};
for (const x of d.data?.viewer?.accounts?.[0]?.d1AnalyticsAdaptiveGroups || []) { const k = nm[x.dimensions.databaseId] || x.dimensions.databaseId, s = (byD[k] = byD[k] || { r: 0, w: 0, rr: 0, rw: 0, h: {} }); s.r += x.sum.readQueries; s.w += x.sum.writeQueries; s.rr += x.sum.rowsRead; s.rw += x.sum.rowsWritten; const h = (s.h[x.dimensions.datetimeHour] = s.h[x.dimensions.datetimeHour] || [0, 0]); h[0] += x.sum.rowsRead; h[1] += x.sum.rowsWritten; }
for (const [n, s] of Object.entries(byD)) { console.log(`\nbase ${n} : ${s.rr} lignes lues, ${s.rw} lignes écrites (${s.r} lectures, ${s.w} écritures)`); for (const h of Object.keys(s.h).sort()) console.log('  ' + h.slice(5, 13).replace('T', ' ') + 'h UTC : lues ' + s.h[h][0] + ', écrites ' + s.h[h][1]); }
