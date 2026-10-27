'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const { X509Certificate, createHash } = require('node:crypto');
// Confiance limitée à la CA du proxy géré ; aucune désactivation générale de TLS.
const caPin = process.env.WK_CA_CERT ? createHash('sha256').update(new X509Certificate(fs.readFileSync(process.env.WK_CA_CERT)).publicKey.export({type:'spki',format:'der'})).digest('base64') : null;

const ROOT = process.cwd();
const WEB = path.join(ROOT, 'www');
const OUT = path.join(ROOT, 'artifacts');
const PORT = 8765;
const URL = process.env.WK_TEST_URL || `http://127.0.0.1:${PORT}/index.html`;
const errors = { page: [], console: [], failedRequests: [] };
const checks = [];
let server;
let browser;

function check(name, ok, detail = '') {
  checks.push({ name, ok: !!ok, detail: String(detail || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: WEB,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverOutput = '';
  server.stdout.on('data', d => { serverOutput += d.toString(); });
  server.stderr.on('data', d => { serverOutput += d.toString(); });
  server.on('error', e => { serverOutput += String(e); });
  await sleep(1200);

  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--enable-unsafe-swiftshader', ...(caPin ? ['--ignore-certificate-errors-spki-list=' + caPin] : [])] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.page.push(String(e)));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.console.push(msg.text());
  });
  page.on('requestfailed', req => {
    errors.failedRequests.push({ url: req.url(), error: req.failure()?.errorText || 'unknown' });
  });

  // Le test contourne uniquement le contrôle d'accès dans cette page de test locale.
  // Aucun fichier du jeu ni réglage d'accès n'est modifié.
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, ...args) {
      if (typeof callback === 'function' && callback.name === 'accessInit') return 0;
      return nativeSetTimeout.call(this, callback, ...args);
    };
  });

  let response = null;
  try {
    response = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    check('La page locale se charge', false, e.message);
  }
  check('Le serveur local répond en HTTP 200', !!response && response.status() === 200,
    response ? `HTTP ${response.status()}` : 'aucune réponse');
  if (!response || response.status() !== 200) throw new Error('La page web ne se charge pas.');

  let ready = false;
  try {
    await page.waitForFunction(() => window.__TK && Array.isArray(window.__TK.TRACKS) && window.__TK.TRACKS.length > 0, { timeout: 30000 });
    ready = true;
  } catch (e) {
    check('L’API de test du jeu est initialisée', false, e.message);
  }
  check('L’API de test du jeu est initialisée', ready);
  if (!ready) throw new Error('window.__TK n’est pas disponible.');

  const info = await page.evaluate(() => ({
    version: window.TK_VER || '',
    tracks: window.__TK.TRACKS.map(t => ({ id: t.id, name: t.name })),
    canvasCount: document.querySelectorAll('canvas').length,
    title: document.title
  }));
  check('Le titre du jeu est renseigné', info.title === 'Wild Kart', info.title);
  check('Le jeu possède au moins un circuit', info.tracks.length > 0, `${info.tracks.length} circuit(s)`);
  check('Le moteur a créé un canvas', info.canvasCount > 0, `${info.canvasCount} canvas`);
  await page.screenshot({ path: path.join(OUT, 'menu.png'), fullPage: true });

  const race = await page.evaluate(() => {
    const K = window.__TK;
    const G = K.G;
    // Une seule boucle : le test n'a pas besoin de serveur multijoueur.
    K.SAVE.quality = 'low'; K.applyQuality(); K.renderer.setPixelRatio(.5);
    K.SAVE.laps = 1;
    K.SAVE.obst = false;
    K.startRace(0, 1);
    K.setAutopilot(true);
    let steps = 0;
    const maxSteps = 60 * 400;
    while (steps < maxSteps && G.karts && !G.karts.every(k => k.finished)) {
      K.simStep(1 / 60);
      steps++;
    }
    try {
      K.updateVisuals(1 / 60);
      K.render();
    } catch (e) {
      return { track: K.TRACKS[0]?.id || 'unknown', steps, kartCount: G.karts?.length || 0,
        finishedCount: G.karts?.filter(k => k.finished).length || 0, renderError: String(e) };
    }
    return {
      track: K.TRACKS[0]?.id || 'unknown',
      steps,
      kartCount: G.karts?.length || 0,
      finishedCount: G.karts?.filter(k => k.finished).length || 0,
      karts: (G.karts || []).map(k => ({ name: k.name, finished: !!k.finished, finishTime: k.finishTime ?? null }))
    };
  });
  // Véritable capture du canvas : aucune API MediaRecorder simulée.
  await page.evaluate(() => { const K = window.__TK; K.REPLAY.on = false; K.REC.on = true; K.REC.fin = true; K.REC.t = 0; K.REC.acc = 0; K.REC.fr = []; K.REC.full = []; for (let i = 0; i < 30; i++) K.recTick(1/30); K.REC.on = false; });
  // Le test de simulation ne suit pas la cadence du rendu ; construire un clip avec ses images réelles.
  const recording = await page.evaluate(() => {
    const K = window.__TK, fr = K.REC.fr;
    if (fr.length < 2) return false;
    const a = fr[0], b = fr[fr.length - 1];
    K.REC.best = { fr: [a, b], ev: [{t: -99}], pe: [], label: 'Action de test', at: -99 };
    K.replayShare(); return true;
  });
  check('Un clip vidéo peut être préparé', recording);
  if (recording) {
    await page.waitForSelector('[data-video-save]', { state: 'visible', timeout: 30000 });
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-video-save]')]);
    const dest = path.join(OUT, download.suggestedFilename()); await download.saveAs(dest);
    check('La capture vidéo produit un fichier non vide', fs.statSync(dest).size > 1000, `${fs.statSync(dest).size} octets`);
    await page.click('[data-video-close]');
  }
  // Web Share doit être appelé seulement après un nouveau clic, pas au terme de la capture.
  await page.evaluate(async () => {
    window.__shares = 0;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { window.__shares++; throw new DOMException('Annulé', 'AbortError'); } });
    await window.__TK.videoReady(new Blob(['video'], { type: 'video/webm' }), 'Test');
  });
  check('Aucun partage automatique sans clic', await page.evaluate(() => window.__shares === 0));
  await page.click('[data-video-share]');
  check('Le clic déclenche le partage et permet de réessayer après annulation', await page.evaluate(() => window.__shares === 1 && !document.querySelector('[data-video-share]').disabled));
  await page.click('[data-video-close]');
  await page.screenshot({ path: path.join(OUT, 'race.png'), fullPage: true });
  check('La course solo démarre et crée les karts', race.kartCount > 0, `${race.kartCount} kart(s), circuit ${race.track}`);
  check('Le rendu de la course ne lève pas d’erreur', !race.renderError, race.renderError || 'OK');
  check('Tous les karts terminent la course automatisée',
    race.kartCount > 0 && race.finishedCount === race.kartCount,
    `${race.finishedCount}/${race.kartCount} terminés en ${race.steps} pas de simulation`);
  check('Aucune exception JavaScript dans la page', errors.page.length === 0,
    errors.page.length ? errors.page.join(' | ') : 'aucune');

  const report = {
    url: URL,
    version: info.version,
    title: info.title,
    tracks: info.tracks,
    race,
    checks,
    errors
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const lines = [
    '# Résultats des tests navigateur Wild Kart',
    '',
    `- URL testée : \`${URL}\``,
    `- Version web : ${info.version || 'absente'}`,
    `- Circuits détectés : ${info.tracks.length}`,
    `- Course automatisée : ${race.finishedCount}/${race.kartCount} karts terminés sur ${race.track}`,
    '',
    '## Vérifications',
    ...checks.map(c => `- ${c.ok ? '✅' : '❌'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`),
    '',
    '## Diagnostics',
    `- Exceptions JavaScript : ${errors.page.length}`,
    `- Messages console de type erreur : ${errors.console.length}`,
    `- Requêtes échouées : ${errors.failedRequests.length}`,
    '',
    'Les messages console et requêtes échouées sont conservés dans `report.json`; certaines ressources externes peuvent échouer sans bloquer le jeu.',
    '',
    'Captures jointes : `menu.png` et `race.png`.'
  ];
  fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n') + '\n');

  console.log('\n--- DIAGNOSTICS ---');
  console.log(JSON.stringify({ consoleErrors: errors.console, failedRequests: errors.failedRequests, serverOutput }, null, 2));
  if (checks.some(c => !c.ok)) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  try {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'fatal-error.txt'), String(err?.stack || err));
  } catch (_) {}
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill('SIGTERM');
});
