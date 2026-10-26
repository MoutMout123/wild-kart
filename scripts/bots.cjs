// Wild Kart : bots de test. Ils jouent tout seuls et vérifient les fonctions du jeu et du serveur de test.
// Lancement : node scripts/bots.cjs   (variable API = adresse du serveur de test, sinon lue dans worker/url-test.txt)
// Résultat : test-results/rapport.md + captures d'écran ; code de sortie 1 si un test échoue.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', 'www'), OUT = path.join(__dirname, '..', 'test-results');
fs.mkdirSync(OUT, { recursive: true });
let API = process.env.API || '';
if (!API) { try { API = fs.readFileSync(path.join(__dirname, '..', 'worker', 'url-test.txt'), 'utf8').trim() + '/api/compte'; } catch (e) { API = ''; } }
const RES = []; const log = (...a) => console.log(...a);
async function test(nom, fn) { if (process.env.ONLY && !nom.includes(process.env.ONLY) && !/démarrage/.test(nom)) return; const t0 = Date.now(); try { const d = await fn(); RES.push([nom, true, d || '']); log('✅', nom, d || ''); } catch (e) { RES.push([nom, false, String(e && e.message || e).slice(0, 300)]); log('❌', nom, e && e.message || e); } finally { log('   (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)'); } }
const ok = (c, msg) => { if (!c) throw new Error(msg); };
const api = async (a, b) => { const r = await fetch(API, { method: 'POST', body: JSON.stringify(Object.assign({ a }, b || {})) }); return r.json(); };
const rnd = () => Math.random().toString(36).slice(2, 8);

// petit serveur web pour le dossier www (comme le site)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });

async function page(browser, name, opts) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push(String(e.stack || e).split('\n').slice(0, 3).join(' ← '))); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) p.errs.push(m.text()); });
  await p.addInitScript((o) => { window.TK_BUILD = 'pwa'; window.TK_TEST = true; if (o.api) window.TK_API = o.api; if (o.acct) { try { const k = 'tiltkart.v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.acct = o.acct; s.name = o.acct.u; localStorage.setItem(k, JSON.stringify(s)); } catch (e) { /* rien */ } } }, { api: API, acct: opts && opts.acct });
  await p.goto('http://localhost:8766/index.html', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForFunction(() => window.__TK, null, { timeout: 90000 });
  await p.evaluate(() => { for (const s of ['#acct', '#gate']) { const e = document.querySelector(s); if (e) e.hidden = true; } });
  p.shot = (n) => p.screenshot({ path: path.join(OUT, name + '-' + n + '.png') }); return p;
}
// fait avancer la course sans attendre l'écran (n images de 1/60 s)
const sim = (p, n, extra) => p.evaluate(([n, extra]) => { const K = window.__TK, G = K.G; for (let i = 0; i < n; i++) { K.simStep(1 / 60); K.updateVisuals(1 / 60); if (G.race && G.race.player) K.updateHud(1 / 60); K.recTick(1 / 60); K.ghostTick(); if (extra === 'untilFinish' && G.race.player && G.race.player.finished) return i; } return n; }, [n, extra]);

(async () => {
  await new Promise((r) => srv.listen(8766, r));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  log('Serveur de test :', API || '(aucun)');

  // ---------- serveur de test ----------
  let acct = null;
  if (API) {
    await test('Serveur : création de compte, connexion', async () => { const u = 'bot' + rnd(), r = await api('create', { pseudo: u, pass: 'abcd', fid: 'BOT-' + (1000 + Math.floor(Math.random() * 9000)) }); ok(r.ok && r.tok, JSON.stringify(r));
      const l = await api('login', { pseudo: u, pass: 'abcd' }); ok(l.ok, 'connexion : ' + JSON.stringify(l)); acct = { u, tok: l.tok, fid: r.fid }; return u; });
    await test('Serveur : joueurs fictifs (testeur1-3)', async () => { const r = await api('tfake', {}); ok(r.ok && r.made.length === 3, JSON.stringify(r)); return r.made.map((x) => x.p).join(', '); });
    await test('Serveur : liste du chef et comptes supprimés envoyés aux jeux', async () => { const r = await api('state', { fid: 'BOT-0001' }); ok(r.ok && Array.isArray(r.gone), JSON.stringify(r).slice(0, 200)); return r.gone.length + ' identifiant(s) supprimé(s) connus'; });
    await test('Serveur : supprimer un compte est réservé au chef', async () => { const r = await api('udel', { pseudo: 'testeur1' }); ok(r.e && /chef/i.test(r.e), JSON.stringify(r)); return 'refusé sans la clé du chef'; });
    await test('Serveur : défi du jour (classement)', async () => { ok(acct, 'pas de compte'); const day = new Date().toISOString().slice(0, 10);
      const t = 100 + Math.random() * 50, r = await api('dput', { day, pseudo: acct.u, tok: acct.tok, time: t }); ok(r.ok, JSON.stringify(r));
      const g = await api('dget', { day }); ok(g.ok && g.list.some((x) => x.u === acct.u), 'absent du classement');
      const bad = await api('dput', { day, pseudo: acct.u, tok: 'faux', time: 1 }); ok(!bad.ok, 'un faux jeton est accepté'); return g.list.length + ' au classement'; });
    await test('Serveur : lecture de la sauvegarde du compte', async () => { ok(acct, 'pas de compte'); const r = await api('load', { pseudo: acct.u, tok: acct.tok }); ok(r.ok, JSON.stringify(r)); return 'sauvegarde lue'; });
  } else RES.push(['Serveur de test', false, 'adresse inconnue (variable API)']);

  // ---------- jeu ----------
  srv.on('error', () => {});
  const p = await page(browser, 'jeu', { acct });
  await test('Jeu : démarrage sans erreur', async () => { ok(!p.errs.length, p.errs.join(' | ')); return 'ok'; });
  await test('Garage : 24 pièces au même total, nouvelles pièces affichées', async () => { const r = await p.evaluate(() => { const K = window.__TK, t = (x) => +(x.speed + x.accel + x.handling + x.off / 2).toFixed(3);
      const bad = Object.entries(K.BODIES).concat(Object.entries(K.WHEELS)).filter(([, x]) => t(x) !== 0).map(([k]) => k);
      for (const b of Object.keys(K.BODIES)) for (const w of Object.keys(K.WHEELS)) K.kartMesh({ body: b, wheels: w }); return { bad, n: Object.keys(K.BODIES).length + Object.keys(K.WHEELS).length }; });
    ok(!r.bad.length, 'pas équilibrées : ' + r.bad.join(', ')); return r.n + ' pièces'; });
  await test('Course solo complète (pièces, statistiques, succès, ralenti automatique)', async () => {
    await p.evaluate(() => { const K = window.__TK; K.SAVE.prog = {}; K.UI.mode = 'quick'; K.startRace(0, 0); K.setAutopilot(true); });
    const n = await sim(p, 60 * 400, 'untilFinish'); const r = await p.evaluate(() => { const K = window.__TK, R = K.G.race; return { fin: R.player.finished, award: R.award && R.award.tot, races: K.SAVE.prog.st && K.SAVE.prog.st.races, ach: Object.keys(K.SAVE.prog.ach || {}).length }; });
    ok(r.fin, 'course pas finie'); ok(r.award > 0, 'pas de pièces'); ok(r.races === 1, 'statistiques'); ok(r.ach >= 1, 'succès « Premier tour de piste »');
    await sim(p, 60 * 5); const rep = await p.evaluate(() => { const K = window.__TK, R = K.G.race; R.timer2 = Math.max(R.timer2 || 0, 3.4); for (let i = 0; i < 120 && !K.REPLAY.on && !R.resultsShown; i++) K.simStep(1 / 60); return { on: K.REPLAY.on, best: !!K.REC.best, label: K.REC.best && K.REC.best.label }; });
    ok(rep.best, 'pas de meilleure action'); ok(rep.on, 'le ralenti ne part pas tout seul'); await p.waitForTimeout(1500); await p.shot('ralenti');
    const bt = await p.evaluate(() => { const r = document.querySelector('#replay-x').getBoundingClientRect(); return [r.right > innerWidth - 40, r.bottom > innerHeight - 40]; }); ok(bt[0] && bt[1], 'bouton Passer pas en bas à droite');
    await p.evaluate(() => document.querySelector('#replay-x').click()); await p.waitForTimeout(300);
    const btns = await p.evaluate(() => [...document.querySelectorAll('#r-buttons button')].map((x) => x.textContent)); await p.shot('resultats');
    for (const b of ['Meilleure action', 'Revoir la course', 'Rejouer']) ok(btns.some((x) => x.includes(b)), 'bouton manquant : ' + b);
    return r.award + ' pièces · ' + rep.label; });
  await test('Partager la vidéo (le ralenti est filmé)', async () => {
    const r = await p.evaluate(() => new Promise((res) => { const K = window.__TK; navigator.canShare = () => true; navigator.share = async (d) => { res({ size: d.files[0].size, type: d.files[0].type }); };
      K.replayShare(); const R = K.REPLAY; setTimeout(() => { if (R.on) R.t = R.clip.fr[R.clip.fr.length - 1].t - .05; }, 2500); setTimeout(() => res({ size: -1 }), 20000); }));
    ok(r.size > 1000, 'vidéo vide ou absente (' + r.size + ')'); return Math.round(r.size / 1024) + ' Ko ' + r.type; });
  await test('Revoir la course (kart au choix, vitesse)', async () => { const r = await p.evaluate(async () => { const K = window.__TK; K.fullReplay(); await new Promise((x) => setTimeout(x, 600)); const a = document.querySelector('#replay-l').textContent;
      document.querySelector('#rf-next').click(); document.querySelector('#rf-sp').click(); await new Promise((x) => setTimeout(x, 800)); const b = document.querySelector('#replay-l').textContent, sp = K.REPLAY.speed; return { a, b, sp, on: K.REPLAY.on }; });
    await p.shot('revoir'); await p.evaluate(() => document.querySelector('#replay-x').click()); ok(r.on && r.sp === 2 && r.a.split(' · ')[0] !== r.b.split(' · ')[0], JSON.stringify(r)); return r.a + ' → ' + r.b; });
  await test('Fantôme du meilleur tour', async () => { await p.evaluate(() => { const K = window.__TK; K.UI.mode = 'quick'; K.startRace(0, 0); K.setAutopilot(true); }); await p.waitForTimeout(100); await sim(p, 60 * 25);
    const r = await p.evaluate(() => ({ ghost: !!window.__TK.GH.mesh, vis: window.__TK.GH.mesh && window.__TK.GH.mesh.g.visible, keys: Object.keys(localStorage).filter((k) => k.startsWith('wk-ghost')).length })); ok(r.keys > 0, 'aucun tour enregistré'); ok(r.ghost && r.vis, 'fantôme invisible'); return r.keys + ' record(s) enregistré(s)'; });
  await test('En course : écart, série en tête, météo, alerte d\'objet', async () => {
    await p.evaluate(() => { for (const k of window.__TK.G.karts) if (!k.isPlayer) k.maxSpeed *= .6; }); await sim(p, 60 * 30);
    const a = await p.evaluate(() => ({ place: window.__TK.G.race.player.place, gap: document.querySelector('#h-gap').textContent, streak: document.querySelector('#h-streak').textContent }));
    ok(a.place === 1 && /^\+\d/.test(a.gap) && /Série/.test(a.streak), 'HUD en tête : ' + JSON.stringify(a));
    const st = await p.evaluate(() => { const R = window.__TK.G.race; document.querySelector('[title="Outils de test"]').click(); [...document.querySelectorAll('[data-ti]')].find((x) => x.textContent === 'Pluie').click(); return { state: R.state, fin: R.player.finished, toast: (document.querySelector('#toast') || {}).textContent }; });
    await sim(p, 60 * 4); const g = await p.evaluate(() => window.__TK.G.W.wx && window.__TK.G.W.wx.grip); ok(g < .95, 'la pluie ne rend pas la piste glissante (' + g + ', ' + JSON.stringify(st) + ')');
    await p.evaluate(() => { document.querySelector('[title="Outils de test"]').click(); [...document.querySelectorAll('[data-ti]')].find((x) => /fusée/.test(x.textContent)).click(); });
    let w = '0'; for (let i = 0; i < 20 && w === '0'; i++) { await sim(p, 6); w = await p.evaluate(() => document.querySelector('#h-warn').style.opacity); } await p.shot('course');
    ok(+w > 0, 'pas d\'alerte pour la fusée'); return a.gap + ' · ' + a.streak + ' · adhérence ' + g.toFixed(2); });
  await test('Progression : niveaux, déblocages, coffre, onglet Progression', async () => { const r = await p.evaluate(() => { const K = window.__TK; K.show('garage'); const locked = [...document.querySelectorAll('#g-body button')].filter((b) => /🔒/.test(b.textContent)).length;
      const D = K.progData(); D.coins = 200; D.xp = 50 * 25 * 26; K.store(); K.show('title'); K.show('garage'); const locked2 = [...document.querySelectorAll('#g-body button')].filter((b) => /🔒/.test(b.textContent)).length;
      document.querySelector('#g-tabs [data-t="prog"]').click(); const coins0 = K.progData().coins; document.querySelector('#g-chest').click(); return { locked, locked2, coins0, coins1: K.progData().coins, lvl: K.progLevel(D.xp), txt: document.querySelector('#g-prog').innerText.slice(0, 60) }; });
    await p.shot('garage'); ok(r.locked > 0 && r.locked2 === 0, 'cadenas : ' + r.locked + ' → ' + r.locked2); ok(r.coins1 <= r.coins0 - 150 + 50, 'coffre'); return 'niveau ' + r.lvl + ' · coffre ouvert'; });
  await test('Défi du jour (réussi et envoyé au classement du serveur de test)', async () => { await p.evaluate(() => { const K = window.__TK; K.show('title'); document.querySelector('[title="Outils de test"]').click(); [...document.querySelectorAll('[data-ti]')].find((x) => /Jouer le défi/.test(x.textContent)).click(); });
    await p.evaluate(() => { window.__TK.G.testSpeed = 1; }); await sim(p, 60 * 400, 'untilFinish');
    const r = await p.evaluate(() => ({ daily: !!window.__TK.G.race.daily, ok: window.__TK.G.race.dailyOk, fin: window.__TK.G.race.player.finished, t: window.__TK.G.race.player.finishTime }));
    ok(r.daily && r.fin && r.ok, JSON.stringify(r)); if (API && acct) { await p.waitForTimeout(3000); const g = await api('dget', {}); ok(g.list.some((x) => x.u === acct.u), 'temps absent du classement'); } return 'temps ' + r.t.toFixed(2) + ' s'; });
  await test('Mode chef : blocage à durée, codes annulés, historique, message', async () => { const r = await p.evaluate(() => { const K = window.__TK, S = K.SAVE; const kp = nacl.sign.keyPair(); S.chefKey = btoa(String.fromCharCode(...kp.secretKey)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      K.CHU.srv = [{ id: 'c1', exp: Date.now() + 1e9, users: { 'LEA-1111': { n: 'Lea', p: 'lea', t: Date.now() } } }, { id: 'c2', exp: Date.now() + 1e9, users: { 'BOB-2222': { n: 'Bob', p: 'bob', t: Date.now() }, 'TOM-3333': { n: 'Tom', p: 'tom', t: Date.now() } } }];
      K.CHU.tab = 'joueurs'; K.show('chef'); K.chefRender(); document.querySelector('[data-pban="@lea"]').click(); document.querySelector('[data-pbant="@lea"][data-h="24"]').click();
      document.querySelector('[data-pban="@bob"]').click(); document.querySelector('[data-pbant="@bob"][data-h="0"]').click(); const st = K.chefState();
      const B = new K.BanSet(['x', 'y'], { x: Date.now() - 1 }); K.CHEF.msg = { t: Date.now(), txt: 'test' }; S.chefMsgSeen = 0; K.show('title'); K.chefMsgShow();
      const m = document.querySelector('#chef-msg'); const out = { b: st.b, bt: Object.keys(st.bt), r: st.r, log: st.log.length, exp: B.has('x'), perm: B.has('y'), msg: m && m.style.display }; delete S.chefKey; delete S.chefState; K.store(); if (m) m.style.display = 'none'; return out; });
    ok(r.b.includes('@lea') && r.b.includes('@bob'), 'blocage'); ok(r.bt.includes('@lea') && !r.bt.includes('@bob'), 'durée'); ok(r.r.includes('c1') && !r.r.includes('c2'), 'codes annulés : ' + r.r); ok(r.log >= 2, 'historique');
    ok(!r.exp && r.perm, 'fin des blocages à durée'); ok(r.msg === 'flex', 'message du chef'); return 'ok'; });

  // ---------- en ligne : deux joueurs, une vraie partie, des emojis ----------
  const errsSolo = p.errs.slice(); await p.goto('about:blank');   // la 1re page s'arrête : le processeur sert aux 2 bots en ligne
  if (API) await test('En ligne : 2 bots créent et jouent une partie, emojis', async () => {
    const A = await page(browser, 'hote'), B = await page(browser, 'invite');
    await A.evaluate(() => window.__TK.netCreate()); await A.waitForFunction(() => window.__TK.Net.pid, null, { timeout: 30000 }); const code = await A.evaluate(() => window.__TK.Net.code);
    await B.evaluate((c) => window.__TK.netJoin(c), code); await A.waitForFunction(() => window.__TK.Net.players.length >= 2, null, { timeout: 45000 });
    await A.evaluate(() => window.__TK.hostStart()); await B.waitForFunction(() => window.__TK.G.race && window.__TK.G.race.online, null, { timeout: 30000 });
    await A.evaluate(() => { window.__TK.setAutopilot(true); window.__TK.G.testSpeed = 3; }); await B.evaluate(() => { window.__TK.setAutopilot(true); window.__TK.G.testSpeed = 3; });
    await A.waitForTimeout(15000); await A.shot('course'); await B.shot('course');
    const sees = await B.evaluate(() => window.__TK.G.karts.filter((k) => k.isRemote).length); ok(sees >= 1, 'l\'invité ne voit pas l\'hôte');
    await A.evaluate(() => window.__TK.netEmit({ e: 'emo', n: 'Hôte', x: '🔥' }));   // comme le bouton 🔥 des résultats
    const got = await B.waitForFunction(() => [...document.querySelectorAll('div')].some((d) => d.textContent === 'Hôte 🔥'), null, { timeout: 8000 }).then(() => true, () => false);
    ok(got, 'emoji pas reçu'); const errs = A.errs.concat(B.errs); ok(!errs.length, errs.join(' | ')); await A.context().close(); await B.context().close(); return 'partie ' + code + ', emoji reçu'; });

  await test('Aucune erreur JavaScript pendant les tests', async () => { ok(!errsSolo.length, errsSolo.slice(0, 3).join(' | ')); return 'ok'; });
  await browser.close(); srv.close();
  const nOk = RES.filter((r) => r[1]).length, md = '# Bots de test Wild Kart\n\n' + nOk + ' / ' + RES.length + ' tests réussis\n\n| | Test | Détail |\n|---|---|---|\n' + RES.map(([n, o, d]) => '| ' + (o ? '✅' : '❌') + ' | ' + n + ' | ' + String(d).replace(/\|/g, '/').replace(/\n/g, ' ') + ' |').join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, 'rapport.md'), md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); log('\n' + md);
  process.exit(nOk === RES.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
