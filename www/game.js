/* WILD KART — jeu de kart original pour téléphone, à jouer en ligne entre potes (Three.js r158) */
(function () {
'use strict';
const T = window.THREE;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2, DEG = Math.PI / 180, RAD = 180 / Math.PI;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const angDiffDeg = (a, b) => { let d = (b - a) % 360; if (d > 180) d -= 360; else if (d < -180) d += 360; return d; };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = (t) => { if (!isFinite(t)) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
const isTouch = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window);
const BUILD = window.TK_BUILD || 'web';

/* ================= Sauvegarde ================= */
const KEY = 'tiltkart.v1';
const DEFAULT_SAVE = { name: 'Toi', body: 'equilibre', wheels: 'standard', pilot: 'casque', acc: 'aucun', finish: 'brillant', deco: 'aucune', trail: 'feu', skin: '#e0b08a', color: '#ff4f3a', helmet: '#ffc531', control: isTouch ? 'stick' : 'tilt', glider: 'classique', fps: 60, throttle: 'auto', botLvl: 1, laps: 0, obst: true,
  sens: 1, invert: false, calib: 0, calibrated: false, sound: true, music: true, quality: isTouch ? 'medium' : 'high', cc: 1, track: 0, records: {} };
let SAVE = (() => { try { return Object.assign({}, DEFAULT_SAVE, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return Object.assign({}, DEFAULT_SAVE); } })();
function store() { try { acctTrack(); } catch (e) { /* pas encore prêt */ } try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* stockage indisponible */ } try { acctDirty(); } catch (e) { /* pas encore prêt */ } }

/* ================= Données ================= */
const BODIES = {
  equilibre: { name: 'Équilibré', speed: 0, accel: 0, handling: 0, weight: 0, off: 0 },
  bolide: { name: 'Bolide', speed: .2, accel: -.12, handling: -.08, weight: .25, off: -.05 },
  libellule: { name: 'Libellule', speed: -.1, accel: .2, handling: .18, weight: -.22, off: 0 },
  buggy: { name: 'Buggy', speed: -.05, accel: .1, handling: 0, weight: .15, off: .35 },
  fusee: { name: 'Fusée', speed: .26, accel: -.18, handling: -.12, weight: .05, off: -.1 },
};
const WHEELS = {
  standard: { name: 'Standard', speed: 0, accel: 0, handling: 0, weight: 0, off: 0 },
  slicks: { name: 'Slicks', speed: .08, accel: 0, handling: -.05, weight: 0, off: -.15 },
  offroad: { name: 'Tout-terrain', speed: -.06, accel: .07, handling: .02, weight: .05, off: .4 },
  neon: { name: 'Néon', speed: .03, accel: .03, handling: .03, weight: -.05, off: -.05 },
};
const PILOTS = { casque: { name: 'Casque' }, casquette: { name: 'Casquette' }, capuche: { name: 'Capuche' }, robot: { name: 'Robot' } };
const ACCS = { aucun: { name: 'Aucun' }, antenne: { name: 'Antenne' }, crete: { name: 'Crête' }, couronne: { name: 'Couronne' }, cornes: { name: 'Cornes' }, aileron: { name: 'Aileron' } };
const FINISHES = { brillant: { name: 'Brillant', r: .26, m: .35 }, mat: { name: 'Mat', r: .78, m: .04 }, chrome: { name: 'Chromé', r: .1, m: .95 } };
const DECOS = { aucune: { name: 'Aucune' }, bande: { name: 'Bandes' }, damier: { name: 'Damier' } };
const TRAILS = { feu: { name: 'Feu', c: ['#ffb02e', '#ff7a1a'] }, bleu: { name: 'Bleu', c: ['#6fd8ff', '#2f7df6'] }, vert: { name: 'Vert', c: ['#8cff7a', '#22c55e'] }, arc: { name: 'Arc-en-ciel', c: ['#ff4f3a', '#ffc531', '#3ee08f', '#38b6ff', '#a87dff'] } };
const GLIDERS = {
  classique: { name: 'Classique', air: 0 }, parapente: { name: 'Parapente', air: .12 }, papillon: { name: 'Papillon', air: .08 },
  avion: { name: 'Avion en papier', air: .05 }, parapluie: { name: 'Parapluie', air: .1 }, chauvesouris: { name: 'Chauve-souris', air: .06 },
};
const SKINS = ['#f3d2b3', '#e0b08a', '#c68b5e', '#8d5a3b', '#5c3a25'];
function myCfg() { return { name: SAVE.name || 'Toi', color: SAVE.color, helmet: SAVE.helmet, body: SAVE.body, wheels: SAVE.wheels, pilot: SAVE.pilot, acc: SAVE.acc, finish: SAVE.finish, deco: SAVE.deco, trail: SAVE.trail, skin: SAVE.skin, glider: SAVE.glider }; }
function cleanCfg(c) {
  c = c || {}; const ok = (v, o, d) => (Object.prototype.hasOwnProperty.call(o, v) ? v : d); const col = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : d);
  return { name: String(c.name || 'Joueur').slice(0, 10), color: col(c.color, '#ff4f3a'), helmet: col(c.helmet, '#ffc531'), body: ok(c.body, BODIES, 'equilibre'), wheels: ok(c.wheels, WHEELS, 'standard'),
    pilot: ok(c.pilot, PILOTS, 'casque'), acc: ok(c.acc, ACCS, 'aucun'), finish: ok(c.finish, FINISHES, 'brillant'), deco: ok(c.deco, DECOS, 'aucune'), trail: ok(c.trail, TRAILS, 'feu'), skin: col(c.skin, '#e0b08a'), glider: ok(c.glider, GLIDERS, 'classique') };
}
const COLORS = ['#ff4f3a', '#ffc531', '#38b6ff', '#3ee08f', '#7c4dff', '#ff6fb5', '#f5f3ec', '#2b2b3a'];
function statsFor(body, wheels, glider) {
  const b = BODIES[body] || BODIES.equilibre, w = WHEELS[wheels] || WHEELS.standard, gl = GLIDERS[glider] || GLIDERS.classique;
  return { speed: clamp(.5 + b.speed + w.speed, 0, 1), accel: clamp(.5 + b.accel + w.accel, 0, 1), handling: clamp(.5 + b.handling + w.handling, 0, 1),
    weight: clamp(.5 + b.weight + w.weight, 0, 1), off: clamp(.3 + b.off + w.off, 0, 1), air: clamp(.35 + gl.air * 4, 0, 1) };
}
const CC = [{ name: '50cc', v: 44, ai: .84 }, { name: '100cc', v: 54, ai: .92 }, { name: '150cc', v: 64, ai: .985 }];
const RIVALS = [
  { name: 'Rivet', glider: 'avion', color: '#38b6ff', helmet: '#f5f3ec', body: 'bolide', wheels: 'slicks', pilot: 'casque', acc: 'aileron', deco: 'bande' },
  { name: 'Pépite', glider: 'papillon', color: '#ffc531', helmet: '#ff4f3a', body: 'libellule', wheels: 'standard', pilot: 'casquette', skin: '#c68b5e' },
  { name: 'Zéphyr', glider: 'parapente', color: '#3ee08f', helmet: '#2b2b3a', body: 'fusee', wheels: 'slicks', pilot: 'robot', acc: 'antenne', trail: 'vert' },
  { name: 'Bobine', glider: 'parapluie', color: '#ff6fb5', helmet: '#7c4dff', body: 'buggy', wheels: 'offroad', pilot: 'capuche', skin: '#f3d2b3' },
  { name: 'Mistral', glider: 'classique', color: '#f5f3ec', helmet: '#38b6ff', body: 'bolide', wheels: 'neon', pilot: 'casque', acc: 'couronne', finish: 'chrome', trail: 'bleu' },
  { name: 'Grenade', glider: 'chauvesouris', color: '#7c4dff', helmet: '#ffc531', body: 'equilibre', wheels: 'offroad', pilot: 'casque', acc: 'cornes', deco: 'damier' },
  { name: 'Kiwi', glider: 'papillon', color: '#9be22d', helmet: '#ff6fb5', body: 'buggy', wheels: 'standard', pilot: 'casquette', acc: 'crete', finish: 'mat', skin: '#8d5a3b' },
].map(cleanCfg);
const POINTS = [15, 12, 10, 8, 6, 4, 2, 1];
let LAPS = 3; const RACE_OPTS = { laps: 0, obst: true, seed: 1, music: 'auto' };

const TRACKS = [
  { id: 'prairie', name: 'Prairie Soleil', desc: 'Grandes courbes, un S rapide et des collines vertes.', level: 1, width: 24,
    pts: [[0, 0, 0], [110, 0, 0], [200, 10, 1], [260, 60, 3], [270, 140, 5], [220, 200, 5], [140, 210, 3], [80, 170, 1], [30, 120, 0], [-30, 110, 0], [-90, 150, 0], [-160, 170, 1], [-230, 130, 2], [-250, 50, 2], [-210, -10, 1], [-120, -20, 0]],
    boosts: [[.12, 0], [.47, -.35], [.8, .3]], items: [.06, .36, .66],
    theme: { sky: ['#3e9bff', '#d3efff'], fog: '#d3efff', fogN: 180, fogF: 950, ground: 'grass', road: '#55576a', curb: ['#ff4f3a', '#fffdf7'],
      barrier: ['#ffc531', '#17143a'], skirt: '#8a6a48', hemi: ['#d6efff', '#5a8f3c', 1.7], sun: '#fff1d0', sunI: 2.7, decor: 'prairie', night: false,
      music: { bpm: 138, root: 48, prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]] } } },
  { id: 'dunes', name: 'Dunes Dorées', desc: 'Bosses dans le sable, une épingle serrée et des cactus.', level: 2, width: 22,
    pts: [[0, 0, 0], [100, 0, 2], [200, 0, 7], [290, -10, 2], [350, -60, 0], [360, -140, 4], [320, -200, 9], [240, -215, 3], [180, -170, 0], [150, -110, 0], [100, -90, 3], [40, -130, 7], [-20, -200, 2], [-100, -220, 0], [-180, -190, 4], [-220, -120, 7], [-200, -50, 2], [-120, -10, 0]],
    boosts: [[.08, .3], [.43, 0], [.73, -.3]], items: [.03, .3, .6, .86],
    theme: { sky: ['#ff8f5a', '#ffe3a8'], fog: '#ffdca0', fogN: 160, fogF: 900, ground: 'sand', road: '#6b5a4c', curb: ['#2f7df6', '#fffdf7'],
      barrier: ['#ff4f3a', '#fffdf7'], skirt: '#c99556', hemi: ['#ffe6c0', '#c9955a', 1.6], sun: '#ffd9a0', sunI: 3, decor: 'desert', night: false,
      music: { bpm: 128, root: 50, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]] } } },
  { id: 'givre', name: 'Pic Givré', desc: 'Montée de nuit sur la neige, descente technique.', level: 3, width: 20,
    pts: [[0, 0, 0], [90, 0, 4], [170, 20, 10], [220, 80, 16], [200, 150, 22], [130, 170, 26], [70, 140, 26], [60, 90, 24], [0, 60, 20], [-60, 90, 16], [-80, 150, 14], [-150, 175, 12], [-220, 130, 9], [-230, 50, 6], [-180, -20, 3], [-100, -30, 1]],
    boosts: [[.1, 0], [.52, .3], [.86, -.3]], items: [.05, .33, .62],
    theme: { sky: ['#0b1035', '#3a4a8f'], fog: '#2e3a78', fogN: 120, fogF: 700, ground: 'snow', road: '#40455a', curb: ['#7c4dff', '#eef4ff'],
      barrier: ['#38b6ff', '#eef4ff'], skirt: '#5d6684', hemi: ['#a9bcff', '#3a4270', 1.4], sun: '#bcd0ff', sunI: 1.7, decor: 'snow', night: true,
      music: { bpm: 146, root: 45, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]] } } },
  { id: 'neon', name: 'Ville Néon', desc: 'Avenues de nuit, un pont surélevé et des néons partout.', level: 2, width: 22,
    pts: [[0, 0, 0], [120, 0, 0], [185, 20, 0], [205, 85, 1], [192, 160, 4], [140, 200, 7], [60, 210, 8], [0, 180, 8], [-20, 120, 5], [-80, 100, 2], [-150, 120, 0], [-210, 90, 0], [-222, 20, 0], [-180, -32, 0], [-90, -30, 0]],
    boosts: [[.1, 0], [.45, .3], [.78, -.3]], items: [.05, .33, .62, .86],
    theme: { sky: ['#140a33', '#4a1f6e'], fog: '#2a1450', fogN: 130, fogF: 720, ground: 'concrete', road: '#2e2f3d', curb: ['#ff2fa8', '#2ee6ff'],
      barrier: ['#2ee6ff', '#1b1840'], skirt: '#3a3550', hemi: ['#b48cff', '#2a2050', 1.5], sun: '#c9b4ff', sunI: 1.6, decor: 'city', night: true,
      music: { bpm: 150, root: 46, prog: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [-2, 2, 5]] } } },
  { id: 'plage', name: 'Plage Corail', desc: 'Bord de mer au coucher du soleil, palmiers et longues courbes.', level: 1, width: 24,
    pts: [[0, 0, 0], [130, -10, 0], [230, 10, 2], [300, 70, 4], [310, 150, 3], [260, 210, 1], [170, 230, 0], [80, 200, 0], [20, 240, 2], [-60, 250, 3], [-140, 210, 1], [-180, 130, 0], [-150, 60, 0], [-80, 20, 0]],
    boosts: [[.14, 0], [.5, -.3], [.82, .3]], items: [.07, .37, .68],
    theme: { sky: ['#ff6f91', '#ffd59e'], fog: '#ffc9a0', fogN: 170, fogF: 950, ground: 'sand', road: '#5b5560', curb: ['#ff4f3a', '#fffdf7'],
      barrier: ['#38b6ff', '#fffdf7'], skirt: '#d9aa63', hemi: ['#ffe0c8', '#d9aa63', 1.6], sun: '#ffd0a0', sunI: 2.8, decor: 'beach', night: false, water: true,
      music: { bpm: 124, root: 53, prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]] } } },
  { id: 'canyon', name: 'Canyon Rouge', desc: 'Très grand circuit sur les crêtes, deux envols en planeur au-dessus du canyon.', level: 3, width: 24, glideH: 9,
    pts: [[0, 0, 0], [160, 0, 2], [300, 30, 8], [400, 110, 16], [420, 230, 18], [360, 340, 18], [240, 380, 18], [120, 350, 14], [30, 300, 10], [-80, 320, 8], [-200, 380, 12], [-330, 350, 18], [-400, 250, 18], [-390, 130, 14], [-320, 40, 8], [-180, -10, 2]],
    glide: [[.29, .33], [.69, .725]], boosts: [[.1, 0], [.5, .3], [.8, -.3]], items: [.06, .4, .6, .88],
    theme: { sky: ['#ff7a59', '#ffd9a8'], fog: '#ffc79a', fogN: 220, fogF: 1150, ground: 'redsand', road: '#5e4a44', curb: ['#ffc531', '#2b2b3a'],
      barrier: ['#ff4f3a', '#fffdf7'], skirt: '#b4532f', hemi: ['#ffd9b8', '#b4532f', 1.6], sun: '#ffc890', sunI: 3, decor: 'canyon', night: false,
      music: { bpm: 132, root: 47, prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]] } } },
  { id: 'ciel', name: 'Îles Célestes', desc: 'Routes suspendues au-dessus des nuages, trois envols en planeur.', level: 3, width: 22, glideH: 8,
    pts: [[0, 0, 30], [180, -20, 32], [330, 40, 36], [420, 160, 40], [400, 300, 44], [300, 400, 44], [160, 420, 40], [40, 360, 36], [-60, 420, 34], [-200, 430, 36], [-320, 360, 40], [-380, 230, 42], [-340, 100, 38], [-220, 20, 32], [-110, -10, 30]],
    glide: [[.12, .155], [.45, .49], [.79, .825]], boosts: [[.25, 0], [.55, -.3], [.9, .3]], items: [.05, .3, .6, .88],
    theme: { sky: ['#5aa9ff', '#eaf5ff'], fog: '#dcecff', fogN: 240, fogF: 1250, ground: 'cloud', groundY: -40, skirtDepth: 9, floating: true, road: '#5a5d72', curb: ['#38b6ff', '#fffdf7'],
      barrier: ['#ffc531', '#fffdf7'], skirt: '#8a6a4f', hemi: ['#ffffff', '#9ab0d8', 1.8], sun: '#fff6e0', sunI: 2.8, decor: 'sky', night: false,
      music: { bpm: 140, root: 52, prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]] } } },
  { id: 'volcan', name: 'Volcan', desc: 'Roche noire et lave, deux envols au-dessus des coulées.', level: 3, width: 22, glideH: 10,
    pts: [[0, 0, 0], [150, 10, 4], [280, -30, 12], [400, 10, 20], [470, 120, 22], [440, 250, 20], [330, 320, 14], [200, 300, 10], [110, 380, 14], [-30, 420, 20], [-170, 380, 22], [-260, 270, 16], [-240, 150, 10], [-310, 40, 6], [-220, -40, 2], [-100, -30, 0]],
    glide: [[.22, .26], [.59, .63]], boosts: [[.12, 0], [.45, .3], [.8, -.3]], items: [.05, .35, .7, .9],
    theme: { sky: ['#1a0b14', '#6b1f1a'], fog: '#3a1410', fogN: 150, fogF: 850, ground: 'ash', road: '#3a3438', curb: ['#ff6a1a', '#2b2b3a'],
      barrier: ['#ff6a1a', '#2b2b3a'], skirt: '#2a2228', hemi: ['#ff9a6a', '#2a1a1a', 1.5], sun: '#ffb080', sunI: 2.1, decor: 'volcano', night: true, lava: true,
      music: { bpm: 156, root: 45, prog: [[0, 3, 7], [1, 5, 8], [-2, 2, 5], [0, 3, 7]] } } },
  { id: 'foret', name: 'Forêt Enchantée', desc: 'Long circuit de nuit, champignons lumineux et trois tunnels en bois.', level: 2, width: 22,
    pts: [[0, 0, 0], [150, -10, 0], [280, 20, 2], [360, 100, 4], [380, 220, 6], [320, 330, 6], [200, 370, 4], [90, 330, 2], [40, 240, 0], [-40, 200, 0], [-120, 260, 2], [-150, 370, 4], [-260, 420, 6], [-380, 380, 6], [-440, 270, 4], [-420, 140, 2], [-330, 60, 0], [-200, 10, 0], [-90, -10, 0]],
    tunnels: [[.07, .12], [.52, .565], [.86, .9]], boosts: [[.2, 0], [.46, .3], [.7, -.3]], items: [.04, .3, .6, .8],
    theme: { sky: ['#061a1c', '#123c3a'], fog: '#0f2e2e', fogN: 110, fogF: 680, ground: 'moss', road: '#3a3a44', curb: ['#2ee6c0', '#1b1840'], tunnel: 'wood',
      barrier: ['#3ee08f', '#1b1840'], skirt: '#3a2a1e', hemi: ['#7fe8d0', '#10201c', 1.5], sun: '#9ff3e0', sunI: 1.5, decor: 'forest', night: true,
      music: { bpm: 126, root: 50, prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-2, 2, 5]] } } },
  { id: 'lune', name: 'Base Lunaire', desc: 'Autoroute sur la Lune : trois sauts en apesanteur au-dessus des cratères.', level: 2, width: 24, glideH: 7, hop: true,
    pts: [[0, 0, 6], [180, 0, 8], [340, 60, 8], [440, 180, 8], [450, 330, 8], [360, 450, 8], [200, 480, 8], [60, 420, 8], [-60, 460, 8], [-200, 500, 8], [-340, 440, 8], [-420, 300, 8], [-400, 160, 8], [-300, 60, 8], [-150, 10, 6]],
    glide: [[.12, .15], [.45, .48], [.78, .81]], boosts: [[.08, 0], [.4, .3], [.7, -.3]], items: [.05, .3, .62, .9],
    theme: { sky: ['#000000', '#0b0b1a'], fog: '#05050c', fogN: 320, fogF: 1450, ground: 'moon', road: '#4a4a52', curb: ['#ffffff', '#2b2b3a'],
      barrier: ['#38b6ff', '#e9ecf4'], skirt: '#6a6a74', hemi: ['#c8d0ff', '#3a3a44', 1.5], sun: '#ffffff', sunI: 3.2, decor: 'moon', night: true,
      music: { bpm: 118, root: 48, prog: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-1, 2, 7]] } } },
  { id: 'glacier', name: 'Glacier Express', desc: 'Route verglacée sous les aurores : ça glisse dans les virages.', level: 3, width: 22, grip: .55,
    pts: [[0, 0, 0], [160, 20, 0], [300, 0, 2], [420, 60, 4], [460, 180, 4], [400, 290, 2], [300, 330, 0], [220, 420, 0], [100, 460, 2], [-40, 430, 4], [-160, 470, 4], [-300, 420, 2], [-360, 300, 0], [-300, 200, 0], [-360, 100, 0], [-280, 20, 0], [-140, -20, 0]],
    boosts: [[.15, 0], [.48, -.3], [.78, .3]], items: [.05, .33, .62, .9],
    theme: { sky: ['#0f3a6e', '#bfe6ff'], fog: '#cfe8ff', fogN: 200, fogF: 1100, ground: 'snow', road: '#6c7f9e', curb: ['#38b6ff', '#fffdf7'],
      barrier: ['#7c4dff', '#fffdf7'], skirt: '#9fb4d8', hemi: ['#e8f4ff', '#8fa9c8', 1.8], sun: '#ffffff', sunI: 2.8, decor: 'glacier', night: false,
      music: { bpm: 136, root: 52, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [3, 7, 10]] } } },
  { id: 'jungle', name: 'Temple Jungle', desc: 'Temples perdus et rivières : deux envols au-dessus des chutes.', level: 3, width: 22, glideH: 10,
    pts: [[0, 0, 0], [140, 20, 2], [260, 0, 6], [380, 40, 12], [440, 150, 16], [420, 280, 16], [320, 360, 12], [200, 400, 8], [80, 360, 4], [0, 280, 2], [-80, 320, 4], [-200, 380, 10], [-320, 340, 16], [-380, 220, 16], [-340, 100, 10], [-230, 20, 4], [-110, -20, 0]],
    glide: [[.25, .29], [.71, .75]], boosts: [[.15, 0], [.5, .3], [.83, -.3]], items: [.05, .38, .6, .88],
    theme: { sky: ['#2f8a6a', '#d8f5d0'], fog: '#bfe8c8', fogN: 170, fogF: 950, ground: 'jungle', road: '#5a5048', curb: ['#ffc531', '#2b2b3a'],
      barrier: ['#3ee08f', '#2b2b3a'], skirt: '#6a5038', hemi: ['#e0ffd8', '#2f6b3a', 1.7], sun: '#fff0c8', sunI: 2.7, decor: 'jungle', night: false,
      music: { bpm: 144, root: 53, prog: [[0, 4, 7], [2, 5, 9], [-3, 0, 4], [-5, -1, 2]] } } },
];

const TERRAIN = { prairie: { h: 40, seed: 11 }, dunes: { h: 30, seed: 13 }, givre: { h: 90, seed: 17, ridges: true }, canyon: { h: 70, drop: 30, seed: 19 }, jungle: { h: 60, drop: 24, seed: 23 },
  foret: { h: 50, seed: 29 }, glacier: { h: 80, seed: 31, ridges: true }, lune: { h: 25, drop: 14, seed: 37 } };
for (const t of TRACKS) if (TERRAIN[t.id]) t.theme.terrain = TERRAIN[t.id];
const LEVELS7 = {"prairie": {"pts": [[0, 0, 0], [110, 0, 0], [200, 10, 1], [260, 60, 3], [270, 140, 5], [220, 200, 5], [140, 210, 3], [95, 198, 2.4], [82, 230, 1.5], [49, 260, 1.5], [5, 257, 1.5], [-35, 238, 1.5], [-49, 195, 1.5], [-45, 162, 0.6], [-90, 150, 0], [-160, 170, 1], [-230, 130, 2], [-250, 50, 2], [-210, -10, 1], [-120, -20, 0]], "boosts": [[0.113, 0], [0.4106, -0.35], [0.8083, 0.3]], "items": [0.0558, 0.3419, 0.6753], "branches": [{"from": 0.4006, "to": 0.5966, "mid": [[26, 177, 1.5]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "dunes": {"pts": [[0, 0, 0], [100, 0, 2], [200, 0, 7], [290, -10, 2], [350, -60, 0], [360, -140, 4], [320, -200, 9], [240, -215, 3], [180, -170, 0], [150, -110, 0], [82, -140, 0], [90, -168, 0], [84, -207, 0], [53, -228, 0], [16, -237, 0], [-17, -215, 0], [-32, -190, 0], [-100, -220, 0], [-180, -190, 4], [-220, -120, 7], [-200, -50, 2], [-120, -10, 0]], "boosts": [[0.0759, 0.3], [0.4114, 0], [0.7405, -0.3]], "items": [0.0278, 0.2873, 0.5291, 0.8658], "branches": [{"from": 0.519, "to": 0.6722, "mid": [[23, -162, 0]], "side": -1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "givre": {"pts": [[0, 0, 0], [90, 0, 4], [170, 20, 10], [220, 80, 16], [200, 150, 22], [130, 170, 26], [70, 140, 26], [60, 90, 24], [0, 60, 20], [-60, 90, 16], [-80, 150, 14], [-150, 175, 12], [-220, 130, 9], [-230, 50, 6], [-180, -20, 3], [-100, -30, 1]], "boosts": [[0.0995, 0], [0.5185, 0.3], [0.8587, -0.3]], "items": [0.0498, 0.3291, 0.6196], "branches": []}, "neon": {"pts": [[0, 0, 0], [120, 0, 0], [185, 20, 0], [205, 85, 1], [192, 160, 4], [140, 200, 7], [60, 210, 8], [0, 180, 8], [-20, 120, 5], [-80, 100, 2], [-150, 120, 0], [-210, 90, 0], [-222, 20, 0], [-180, -32, 0], [-90, -30, 0]], "boosts": [[0.099, 0], [0.4497, 0.3], [0.7795, -0.3]], "items": [0.0486, 0.3299, 0.6198, 0.8594], "branches": []}, "plage": {"pts": [[0, 0, 0], [130, -10, 0], [230, 10, 2], [300, 70, 4], [310, 150, 3], [260, 210, 1], [170, 230, 0], [77, 224, 0.3], [72, 253, 0.5], [48, 284, 0.5], [11, 289, 0.5], [-26, 279, 0.5], [-45, 245, 0.5], [-47, 216, 0.7], [-140, 210, 1], [-180, 130, 0], [-150, 60, 0], [-80, 20, 0]], "boosts": [[0.1318, 0], [0.4742, -0.3], [0.8273, 0.3]], "items": [0.0652, 0.3515, 0.7045], "branches": [{"from": 0.503, "to": 0.6848, "mid": [[15, 217, 0.5]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "canyon": {"pts": [[0, 0, 0], [160, 0, 2], [300, 30, 8], [400, 110, 16], [420, 230, 18], [360, 340, 18], [240, 380, 18], [120, 350, 14], [52, 356, 13.6], [51, 399, 13], [24, 451, 13], [-31, 466, 13], [-87, 461, 13], [-123, 416, 13], [-132, 374, 12.4], [-200, 380, 12], [-330, 350, 18], [-400, 250, 18], [-390, 130, 14], [-320, 40, 8], [-180, -10, 2]], "boosts": [[0.0952, 0], [0.4519, 0.3], [0.8095, -0.3]], "items": [0.0566, 0.381, 0.6199, 0.885], "glide": [[0.2638, 0.3276], [0.6924, 0.7516]], "branches": [{"from": 0.4474, "to": 0.602, "mid": [[-40, 361, 12.9]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "ciel": {"pts": [[0, 0, 30], [180, -20, 32], [330, 40, 36], [420, 160, 40], [400, 300, 44], [300, 400, 44], [160, 420, 40], [40, 360, 36], [-60, 420, 34], [-119, 406, 35.4], [-131, 438, 37], [-164, 470, 37], [-208, 468, 37], [-249, 450, 37], [-264, 407, 37], [-261, 374, 38.6], [-320, 360, 40], [-380, 230, 42], [-340, 100, 38], [-220, 20, 32], [-110, -10, 30]], "boosts": [[0.2394, 0], [0.5266, -0.3], [0.9042, 0.3]], "items": [0.0479, 0.2873, 0.5818, 0.8844], "glide": [[0.1027, 0.1621], [0.4189, 0.4828], [0.7866, 0.846]], "branches": [{"from": 0.5565, "to": 0.6811, "mid": [[-189, 388, 37]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "volcan": {"pts": [[0, 0, 0], [150, 10, 4], [280, -30, 12], [400, 10, 20], [470, 120, 22], [440, 250, 20], [333, 292, 18.1], [340, 320, 17], [333, 359, 17], [300, 379, 17], [263, 386, 17], [231, 363, 17], [217, 338, 15.9], [110, 380, 14], [-30, 420, 20], [-170, 380, 22], [-260, 270, 16], [-240, 150, 10], [-310, 40, 6], [-220, -40, 2], [-100, -30, 0]], "boosts": [[0.1164, 0], [0.473, 0.3], [0.8048, -0.3]], "items": [0.0486, 0.3373, 0.7076, 0.9019], "glide": [[0.2016, 0.2661], [0.5884, 0.6538]], "branches": [{"from": 0.363, "to": 0.473, "mid": [[273, 312, 16.9]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "foret": {"pts": [[0, 0, 0], [150, -10, 0], [280, 20, 2], [360, 100, 4], [380, 220, 6], [320, 330, 6], [200, 370, 4], [90, 330, 2], [40, 240, 0], [-40, 200, 0], [-120, 260, 2], [-150, 370, 4], [-260, 420, 6], [-304, 343, 4.9], [-335, 356, 4], [-381, 353, 4], [-409, 320, 4], [-424, 278, 4], [-403, 237, 4], [-376, 217, 3.1], [-420, 140, 2], [-330, 60, 0], [-200, 10, 0], [-90, -10, 0]], "boosts": [[0.1961, 0], [0.4503, 0.3], [0.6961, -0.3]], "items": [0.0385, 0.2937, 0.5882, 0.8031], "tunnels": [[0.0685, 0.1173], [0.5094, 0.5531], [0.8622, 0.9015]], "branches": [{"from": 0.649, "to": 0.7671, "mid": [[-338, 278, 4]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.1507, "to": 0.3562, "mid": [[207, 190, 3.1]], "width": 13, "narrow": true, "label": "RACCOURCI"}]}, "lune": {"pts": [[0, 0, 6], [180, 0, 8], [340, 60, 8], [440, 180, 8], [450, 330, 8], [360, 450, 8], [200, 480, 8], [60, 420, 8], [-60, 460, 8], [-200, 500, 8], [-242, 462, 8], [-274, 490, 8], [-331, 505, 8], [-378, 475, 8], [-413, 430, 8], [-403, 373, 8], [-378, 338, 8], [-420, 300, 8], [-400, 160, 8], [-300, 60, 8], [-150, 10, 6]], "boosts": [[0.0753, 0], [0.38, 0.3], [0.7093, -0.3]], "items": [0.0475, 0.285, 0.5872, 0.9042], "glide": [[0.1018, 0.1565], [0.4155, 0.4702], [0.7783, 0.833]], "branches": [{"from": 0.5962, "to": 0.7371, "mid": [[-309, 398, 8]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "glacier": {"pts": [[0, 0, 0], [160, 20, 0], [300, 0, 2], [420, 60, 4], [460, 180, 4], [400, 290, 2], [300, 330, 0], [220, 420, 0], [100, 460, 2], [32, 463, 2.5], [30, 492, 3], [10, 525, 3], [-27, 534, 3], [-65, 528, 3], [-88, 496, 3], [-92, 467, 3.5], [-160, 470, 4], [-300, 420, 2], [-360, 300, 0], [-300, 200, 0], [-360, 100, 0], [-280, 20, 0], [-140, -20, 0]], "boosts": [[0.1444, 0], [0.4624, -0.3], [0.7872, 0.3]], "items": [0.0479, 0.3179, 0.6325, 0.9034], "branches": [{"from": 0.4752, "to": 0.5778, "mid": [[-30, 462, 3]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.1641, "to": 0.3692, "mid": [[271, 184, 1.5]], "width": 13, "narrow": true, "label": "RACCOURCI"}]}, "jungle": {"pts": [[0, 0, 0], [140, 20, 2], [260, 0, 6], [380, 40, 12], [440, 150, 16], [420, 280, 16], [320, 360, 12], [200, 400, 8], [80, 360, 4], [2, 366, 5.7], [1, 395, 7], [-18, 429, 7], [-55, 439, 7], [-93, 434, 7], [-117, 403, 7], [-122, 374, 8.3], [-200, 380, 10], [-320, 340, 16], [-380, 220, 16], [-340, 100, 10], [-230, 20, 4], [-110, -20, 0]], "boosts": [[0.1473, 0], [0.4876, 0.3], [0.8326, -0.3]], "items": [0.0485, 0.3733, 0.613, 0.8811], "glide": [[0.2341, 0.2995], [0.7016, 0.7679]], "branches": [{"from": 0.5059, "to": 0.6167, "mid": [[-60, 366, 6.9]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}, "recif": {"pts": [[0, 0, 2], [160, -20, 2], [300, 10, 4], [400, 100, 6], [420, 230, 8], [350, 340, 8], [220, 370, 6], [110, 320, 4], [20, 380, 4], [-100, 420, 6], [-146, 390, 6.4], [-171, 419, 7], [-218, 440, 7], [-265, 421, 7], [-301, 386, 7], [-301, 335, 7], [-284, 300, 7.6], [-330, 270, 8], [-340, 140, 6], [-260, 40, 4], [-130, 0, 2]], "boosts": [[0.1135, 0], [0.4934, 0.3], [0.9043, -0.3]], "items": [0.0563, 0.4268, 0.8574], "glide": [[0.8069, 0.8611]], "branches": [{"from": 0.5854, "to": 0.7308, "mid": [[-214, 343, 7]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.1914, "to": 0.4165, "mid": [[247, 190, 5.4]], "width": 14, "label": "ÉPAVE", "tunnel": "ship", "narrow": true}]}, "col": {"pts": [[0, 0, 0], [160, 0, 4], [290, 40, 12], [340, 140, 20], [260, 210, 28], [150, 190, 34], [100, 270, 40], [180, 350, 48], [300, 380, 56], [400, 320, 60], [430, 200, 62], [520, 120, 58], [560, 10, 50], [500, -110, 40], [370, -160, 30], [220, -150, 20], [90, -90, 8]], "boosts": [[0.1197, 0], [0.5, 0.3], [0.8591, -0.3]], "items": [0.0497, 0.4494, 0.7993], "glide": [[0.6878, 0.7488]], "branches": [{"from": 0.1289, "to": 0.3453, "mid": [[114, 104, 25.7]], "width": 14, "label": "TUNNEL", "tunnel": "rock", "narrow": true}]}, "bonbons": {"pts": [[0, 0, 0], [150, 20, 2], [280, -10, 4], [390, 50, 6], [420, 170, 6], [340, 260, 4], [220, 240, 2], [130, 300, 4], [160, 410, 8], [60, 480, 10], [-80, 450, 8], [-179, 381, 6], [-198, 402, 5], [-235, 417, 5], [-269, 401, 5], [-296, 374, 5], [-295, 335, 5], [-281, 309, 4], [-380, 240, 2], [-370, 110, 4], [-260, 30, 2], [-130, -10, 0]], "boosts": [[0.1451, 0], [0.5804, -0.3], [0.9222, 0.3]], "items": [0.0481, 0.5323, 0.8829], "glide": [[0.4434, 0.5079]], "branches": [{"from": 0.611, "to": 0.7159, "mid": [[-228, 342, 5]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.1678, "to": 0.3776, "mid": [[201, 98, 4.3]], "width": 14, "label": "GUIMAUVE", "tunnel": "candy", "narrow": true}]}, "chateau": {"pts": [[0, 0, 0], [150, -10, 2], [280, 30, 6], [340, 140, 10], [300, 260, 12], [180, 300, 10], [60, 260, 6], [-40, 320, 6], [-60, 440, 10], [-143, 409, 9], [-161, 443, 8], [-202, 474, 8], [-252, 465, 8], [-295, 439, 8], [-306, 388, 8], [-297, 351, 7], [-380, 320, 6], [-330, 190, 4], [-360, 70, 2], [-250, -10, 0], [-120, -20, 0]], "boosts": [[0.1178, 0], [0.4232, 0.3], [0.7829, -0.3]], "items": [0.0488, 0.3937, 0.7038, 0.9006], "glide": [[0.7608, 0.8162]], "branches": [{"from": 0.5179, "to": 0.6605, "mid": [[-219, 377, 8]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.1288, "to": 0.3496, "mid": [[130, 107, 6.5]], "width": 14, "label": "CRYPTE", "tunnel": "stone", "narrow": true}]}};
const DESC7 = {"recif": "Sous la mer : coraux, bancs de poissons, raccourci dans une épave et courant marin.", "col": "Lacets jusqu'aux neiges : tunnel dans la roche, boules de neige et envol au-dessus du ravin.", "bonbons": "Sucettes géantes, tunnel en guimauve, hors-piste sucré et rivière de chocolat.", "chateau": "Nuit violette, crypte, blocs qui écrasent et saut au-dessus des douves."};
TRACKS.push(
  { id: 'recif', name: 'Récif Englouti', desc: 'Sous la mer : coraux, bancs de poissons, une épave à traverser et un courant marin qui te propulse.', level: 2, width: 24, glideH: 8, hop: true, hopLabel: 'Courant marin !',
    pts: [[0, 0, 2], [160, -20, 2], [300, 10, 4], [400, 100, 6], [420, 230, 8], [350, 340, 8], [220, 370, 6], [110, 320, 4], [20, 380, 4], [-100, 420, 6], [-240, 380, 8], [-330, 270, 8], [-340, 140, 6], [-260, 40, 4], [-130, 0, 2]],
    branches: [{ from: .218, to: .349, mid: [[350, 170, 6], [340, 260, 7]], width: 16, tunnel: 'ship', label: 'ÉPAVE', ai: .5 },
      { from: .594, to: .738, mid: [[-180, 480, 7], [-330, 450, 8]], width: 18, boost: true, label: 'ALGUES', ai: .4 }],
    glide: [[.81, .84]], boosts: [[.12, 0], [.52, .3], [.9, -.3]], items: [.06, .45, .85],
    theme: { sky: ['#0b4f86', '#1a6f94'], fog: '#1a6f94', fogN: 70, fogF: 560, ground: 'seabed', road: '#4f5d6e', curb: ['#ff6f91', '#fffdf7'],
      barrier: ['#3ee0c0', '#0f3050'], skirt: '#5a6a6a', hemi: ['#a8f0ff', '#1a4a5a', 1.7], sun: '#c8f6ff', sunI: 2.3, decor: 'reef', night: false, underwater: true,
      terrain: { h: 44, drop: 18, seed: 43, caustics: true },
      music: { bpm: 118, root: 50, prog: [[0, 4, 7], [-3, 0, 4], [2, 5, 9], [-5, -1, 2]] } } },
  { id: 'col', name: 'Col des Aigles', desc: 'Route de montagne en lacets jusqu\'aux neiges : tunnel dans la roche, corniche et envol au-dessus du ravin.', level: 3, width: 22, glideH: 10,
    pts: [[0, 0, 0], [160, 0, 4], [290, 40, 12], [340, 140, 20], [260, 210, 28], [150, 190, 34], [100, 270, 40], [180, 350, 48], [300, 380, 56], [400, 320, 60], [430, 200, 62], [520, 120, 58], [560, 10, 50], [500, -110, 40], [370, -160, 30], [220, -150, 20], [90, -90, 8]],
    branches: [{ from: .242, to: .394, mid: [[215, 280, 40]], width: 16, tunnel: 'rock', label: 'TUNNEL', ai: .4 },
      { from: .564, to: .675, mid: [[540, 250, 62], [630, 130, 56]], width: 18, label: 'CORNICHE', ai: .45 }],
    glide: [[.70, .735]], boosts: [[.12, 0], [.5, .3], [.86, -.3]], items: [.05, .45, .8],
    theme: { sky: ['#3a8ae0', '#dceeff'], fog: '#d4e6f6', fogN: 220, fogF: 1250, ground: 'rock', road: '#4e5060', curb: ['#e2342a', '#fffdf7'],
      barrier: ['#e2342a', '#fffdf7'], skirt: '#6a6a70', hemi: ['#e8f4ff', '#5a6a50', 1.7], sun: '#fff4dc', sunI: 2.9, decor: 'alpine', night: false,
      terrain: { h: 110, ridges: true, seed: 41, blend: 80, drop: 30, colors: [[-30, '#4f8a3e'], [18, '#6aa050'], [40, '#7f8a66'], [58, '#8e8e94'], [80, '#a6a6ae'], [96, '#f4f8ff']] },
      music: { bpm: 140, root: 50, prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [-3, 0, 4]] } } },
  { id: 'bonbons', name: 'Pays des Bonbons', desc: 'Sucettes géantes, tunnel en guimauve et envol au-dessus d\'une rivière de chocolat.', level: 1, width: 24, glideH: 9,
    pts: [[0, 0, 0], [150, 20, 2], [280, -10, 4], [390, 50, 6], [420, 170, 6], [340, 260, 4], [220, 240, 2], [130, 300, 4], [160, 410, 8], [60, 480, 10], [-80, 450, 8], [-160, 350, 4], [-280, 330, 2], [-380, 240, 2], [-370, 110, 4], [-260, 30, 2], [-130, -10, 0]],
    branches: [{ from: .244, to: .406, mid: [[310, 160, 5], [200, 180, 3]], width: 16, tunnel: 'candy', label: 'GUIMAUVE', ai: .5 },
      { from: .695, to: .817, mid: [[-290, 220, 3]], width: 18, label: 'SUCETTES', ai: .45 }],
    glide: [[.47, .51]], boosts: [[.15, 0], [.6, -.3], [.92, .3]], items: [.05, .55, .88],
    theme: { sky: ['#ff8fcf', '#fff0f8'], fog: '#ffe2f2', fogN: 200, fogF: 1050, ground: 'candy', road: '#6a3f2e', curb: ['#ff4f7a', '#fffdf7'],
      barrier: ['#a87dff', '#fffdf7'], skirt: '#c87a9a', hemi: ['#fff0f8', '#ff9ad5', 1.8], sun: '#fff4f8', sunI: 2.8, decor: 'candy', night: false,
      terrain: { h: 36, drop: 22, seed: 53 },
      music: { bpm: 150, root: 55, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]] } } },
  { id: 'chateau', name: 'Château Hanté', desc: 'Nuit violette, crypte souterraine, cimetière et saut au-dessus des douves.', level: 3, width: 22, glideH: 9,
    pts: [[0, 0, 0], [150, -10, 2], [280, 30, 6], [340, 140, 10], [300, 260, 12], [180, 300, 10], [60, 260, 6], [-40, 320, 6], [-60, 440, 10], [-180, 500, 12], [-320, 450, 10], [-380, 320, 6], [-330, 190, 4], [-360, 70, 2], [-250, -10, 0], [-120, -20, 0]],
    branches: [{ from: .194, to: .316, mid: [[240, 190, 10]], width: 16, tunnel: 'stone', label: 'CRYPTE', ai: .45 },
      { from: .489, to: .624, mid: [[-180, 400, 8]], width: 18, label: 'CIMETIÈRE', ai: .45 }],
    glide: [[.77, .80]], boosts: [[.12, 0], [.43, .3], [.78, -.3]], items: [.05, .4, .7, .9],
    theme: { sky: ['#140a2a', '#3a2052'], fog: '#2c1a40', fogN: 110, fogF: 720, ground: 'graveyard', road: '#3a3644', curb: ['#ff7a1a', '#1b1840'],
      barrier: ['#a87dff', '#1b1840'], skirt: '#3a3040', hemi: ['#b8a0ff', '#1a1428', 1.5], sun: '#c8b8ff', sunI: 1.6, decor: 'haunted', night: true,
      terrain: { h: 44, drop: 22, seed: 67 },
      music: { bpm: 132, root: 45, prog: [[0, 3, 7], [1, 5, 8], [-4, 0, 3], [-5, -2, 2]] } } }
);
for (const t of TRACKS) { const L = LEVELS7[t.id]; if (L) { t.pts = L.pts; t.boosts = L.boosts; t.items = L.items; if (L.glide) t.glide = L.glide; if (L.tunnels) t.tunnels = L.tunnels; t.branches = L.branches; } if (DESC7[t.id]) t.desc = DESC7[t.id]; }
TRACKS.push(
  { id: 'sakura', laps: 2, name: 'Vallée Sakura', desc: 'Grand circuit japonais : cerisiers en fleurs, portiques rouges, pagode sur la colline et envol au-dessus de la cascade.', level: 2, width: 24, glideH: 10,
    theme: { sky: ['#ff9fbf', '#ffe9dc'], fog: '#ffe2e6', fogN: 230, fogF: 1350, ground: 'sakura', road: '#4a4652', curb: ['#e2342a', '#fffdf7'], barrier: ['#e2342a', '#fffdf7'], skirt: '#7a5a48', hemi: ['#fff0f4', '#6a8a4a', 1.75], sun: '#fff0d8', sunI: 2.8, decor: 'sakura', night: false,
      terrain: { h: 70, ridges: true, seed: 71, drop: 28 }, music: { bpm: 132, root: 50, prog: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [-2, 2, 5]] } } },
  { id: 'safari', laps: 2, name: 'Safari Doré', desc: 'Immense savane au coucher du soleil : girafes, éléphants, baobabs et deux envols au-dessus des rivières.', level: 2, width: 26, glideH: 9,
    theme: { sky: ['#ff6a3a', '#ffd7a0'], fog: '#ffc896', fogN: 260, fogF: 1450, ground: 'savanna', road: '#6a4a3a', curb: ['#ffc531', '#7a3a1a'], barrier: ['#ffc531', '#6b3a1a'], skirt: '#b07a48', hemi: ['#ffe0b8', '#a07a40', 1.7], sun: '#ffb060', sunI: 3, decor: 'safari', night: false,
      terrain: { h: 34, seed: 73, drop: 24 }, music: { bpm: 120, root: 52, prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]] } } },
  { id: 'fete', laps: 2, name: 'Fête Foraine', desc: 'La nuit à la fête : grande roue, manèges, chapiteaux, montagnes russes, feux d\'artifice et train fantôme.', level: 2, width: 22, glideH: 9,
    theme: { sky: ['#12082e', '#4a1a6a'], fog: '#2a1450', fogN: 160, fogF: 950, ground: 'fair', road: '#2e2f3d', curb: ['#ff4f7a', '#ffc531'], barrier: ['#ffc531', '#ff4f3a'], skirt: '#3a3050', hemi: ['#d0a0ff', '#2a2050', 1.6], sun: '#ffd0f0', sunI: 1.8, decor: 'fair', night: true, tunnel: 'fun',
      terrain: { h: 22, seed: 79, drop: 20 }, music: { bpm: 156, root: 55, prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]] } } },
  { id: 'espace', laps: 2, name: 'Anneau Stellaire', desc: 'Circuit suspendu dans l\'espace : planètes géantes, astéroïdes, station orbitale et trois envols en gravité zéro.', level: 3, width: 22, glideH: 10, hopLabel: 'Gravité zéro !',
    theme: { sky: ['#03020c', '#0e0b2e'], fog: '#07061a', fogN: 420, fogF: 1800, ground: 'space', groundY: -160, skirtDepth: 8, floating: true, noGround: true, road: '#2a2a3a', curb: ['#2ee6ff', '#ff2fa8'], barrier: ['#2ee6ff', '#1b1840'], skirt: '#3a3a5a', hemi: ['#b8c8ff', '#1a1a3a', 1.6], sun: '#ffffff', sunI: 2.8, decor: 'space', night: true, tunnel: 'metal',
      music: { bpm: 142, root: 48, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [3, 7, 10]] } } }
);
const LEVELS8 = {"sakura": {"pts": [[0, 0, 0], [135, -15, 0], [255, 0, 2], [345, 60, 6], [375, 150, 12], [330, 225, 18], [240, 240, 22], [165, 300, 26], [195, 390, 30], [300, 420, 34], [405, 390, 38], [465, 315, 40], [525, 240, 38], [615, 225, 34], [660, 300, 30], [630, 405, 26], [540, 480, 22], [420, 525, 18], [285, 525, 14], [202, 514, 12], [192, 551, 10], [158, 590, 10], [108, 592, 10], [60, 577, 10], [38, 530, 10], [38, 491, 8], [-45, 480, 6], [-90, 390, 4], [-60, 300, 2], [-120, 225, 2], [-195, 180, 2], [-225, 90, 2], [-165, 23, 1], [-82, -7, 0]], "boosts": [[0.1352, 0], [0.4445, 0.3], [0.7245, -0.3]], "items": [0.0478, 0.2895, 0.6033, 0.8061], "glide": [[0.4918, 0.5759]], "torii": [[0.176, 0.3036]], "branches": [{"from": 0.6403, "to": 0.7392, "mid": [[120, 499, 10]], "side": 1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.2474, "to": 0.4005, "mid": [[337, 257, 32.7]], "width": 13, "narrow": true, "label": "BAMBOUS"}]}, "safari": {"pts": [[0, 0, 0], [145, 0, 0], [277, 20, 2], [383, 79, 4], [422, 185, 6], [396, 290, 8], [317, 356, 8], [211, 370, 6], [132, 422, 4], [145, 515, 6], [238, 568, 8], [356, 568, 10], [462, 515, 10], [541, 436, 8], [571, 389, 6.9], [610, 407, 5], [668, 406, 5], [706, 365, 5], [728, 313, 5], [703, 260, 5], [670, 232, 3.1], [700, 185, 2], [660, 92, 2], [581, 53, 2], [502, -26, 2], [396, -92, 2], [264, -132, 2], [132, -132, 1], [0, -119, 0], [-106, -79, 0], [-145, -13, 0], [-92, 26, 0]], "boosts": [[0.1336, 0], [0.4406, 0.3], [0.7315, -0.3]], "items": [0.0475, 0.2871, 0.5003, 0.8658], "glide": [[0.3297, 0.4039], [0.7632, 0.8374]], "branches": [{"from": 0.4926, "to": 0.6031, "mid": [[618, 310, 5]], "side": -1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.131, "to": 0.2852, "mid": [[244, 214, 4.4]], "width": 13, "narrow": true, "label": "PISTE"}]}, "fete": {"pts": [[0, 0, 0], [128, 0, 0], [240, 32, 2], [288, 128, 6], [240, 224, 10], [144, 240, 10], [80, 304, 8], [112, 400, 6], [224, 432, 4], [285, 419, 5.6], [300, 460, 8], [341, 501, 8], [397, 500, 8], [449, 478, 8], [470, 424, 8], [467, 381, 10.4], [528, 368, 12], [576, 464, 10], [512, 560, 6], [384, 592, 4], [256, 576, 2], [128, 608, 2], [0, 576, 4], [-80, 496, 6], [-64, 384, 8], [-144, 304, 6], [-240, 272, 4], [-288, 176, 2], [-240, 80, 0], [-128, 16, 0]], "boosts": [[0.1347, 0], [0.4798, 0.3], [0.7299, -0.3]], "items": [0.0478, 0.2887, 0.5667, 0.8069], "glide": [[0.6098, 0.6882]], "tunnels": [[0.8062, 0.8779]], "branches": [{"from": 0.3092, "to": 0.4234, "mid": [[375, 396, 8]], "side": -1, "width": 14, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.1221, "to": 0.2681, "mid": [[274, 306, 5.7]], "width": 13, "narrow": true, "label": "COULISSES", "tunnel": "fun"}]}, "espace": {"pts": [[0, 0, 40], [132, -13, 44], [251, 13, 50], [330, 92, 58], [290, 142, 59], [265, 127, 60], [226, 123, 60], [197, 148, 60], [179, 182, 60], [192, 219, 60], [212, 240, 61], [172, 290, 62], [92, 356, 56], [106, 462, 52], [198, 515, 50], [317, 502, 54], [409, 436, 60], [462, 343, 66], [541, 277, 70], [620, 304, 66], [647, 396, 60], [594, 488, 54], [502, 554, 50], [383, 594, 48], [251, 607, 46], [119, 594, 44], [0, 541, 42], [-79, 462, 40], [-106, 356, 40], [-66, 264, 42], [-119, 172, 44], [-132, 79, 42], [-79, 20, 40]], "boosts": [[0.1305, 0], [0.4643, 0.3], [0.7518, -0.3]], "items": [0.0495, 0.3653, 0.5537, 0.8013], "glide": [[0.2607, 0.3413], [0.6536, 0.7343], [0.8825, 0.9529]], "tunnels": [[0.4791, 0.5383]], "branches": [{"from": 0.137, "to": 0.2141, "mid": [[254, 194, 60.1]], "side": -1, "width": 14, "offroad": true, "label": "HORS-PISTE"}]}};
for (const t of TRACKS) { const L = LEVELS8[t.id]; if (L) { t.pts = L.pts; t.boosts = L.boosts; t.items = L.items; if (L.glide) t.glide = L.glide; if (L.tunnels) t.tunnels = L.tunnels; if (L.torii) t.torii = L.torii; t.branches = L.branches; } }

TRACKS.push(
  { id: 'lavande', laps: 3, name: 'Champs de Lavande', desc: 'Grandes courbes au milieu des champs de lavande et des tournesols, cyprès, vieux mas et envol au-dessus de la rivière.', level: 1, width: 24, glideH: 9,
    theme: { sky: ['#6aaeff', '#ffe6c4'], fog: '#f4e2cc', fogN: 230, fogF: 1300, ground: 'lavender', road: '#57525e', curb: ['#8a5cff', '#fffdf7'], barrier: ['#8a5cff', '#fffdf7'], skirt: '#7a6a50', hemi: ['#fff4e0', '#7a9a50', 1.75], sun: '#fff0d0', sunI: 3, decor: 'provence', night: false,
      terrain: { h: 40, seed: 91, drop: 24 }, music: { bpm: 124, root: 53, prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]] } } },
  { id: 'automne', laps: 2, name: 'Forêt d\'Automne', desc: 'Long ruban qui serpente doucement entre érables rouges et dorés, citrouilles, granges et pont couvert en bois.', level: 2, width: 24, glideH: 9,
    theme: { sky: ['#ff9a5a', '#ffe4bc'], fog: '#f2c9a0', fogN: 200, fogF: 1200, ground: 'autumn', road: '#4a4048', curb: ['#d8452a', '#fff2d8'], barrier: ['#a8462a', '#fff2d8'], skirt: '#6a4a30', hemi: ['#ffe4c8', '#8a6a3a', 1.7], sun: '#ffc890', sunI: 2.9, decor: 'autumn', night: false, tunnel: 'wood',
      terrain: { h: 55, seed: 93, drop: 24 }, music: { bpm: 118, root: 50, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]] } } },
  { id: 'lagon', laps: 3, name: 'Lagon Tropical', desc: 'Circuit large et rapide autour d\'un lagon turquoise : palmiers, cabanes sur pilotis, îlots et envol au-dessus de la baie.', level: 1, width: 26, glideH: 9,
    theme: { sky: ['#2aa8ff', '#c8f4ff'], fog: '#c4f0ff', fogN: 260, fogF: 1450, ground: 'tropic', road: '#55566a', curb: ['#2ee6c0', '#fffdf7'], barrier: ['#ff6f5a', '#fffdf7'], skirt: '#c8a870', hemi: ['#f0fbff', '#c8b080', 1.8], sun: '#fff8e0', sunI: 3.1, decor: 'tropic', night: false,
      terrain: { h: 26, seed: 95, drop: 18, min: -10 }, music: { bpm: 128, root: 55, prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]] } } },
  { id: 'ruines', laps: 3, name: 'Ruines Antiques', desc: 'Sur une colline face à la mer : temples, colonnes, amphithéâtre, oliviers, une arche en pierre et un envol au-dessus du ravin.', level: 2, width: 24, glideH: 9,
    theme: { sky: ['#3f96ff', '#fff0d6'], fog: '#f0e4cc', fogN: 240, fogF: 1350, ground: 'antique', road: '#675f56', curb: ['#3a6ab8', '#fffdf7'], barrier: ['#3a6ab8', '#fffdf7'], skirt: '#a89878', hemi: ['#fff6e8', '#a09060', 1.75], sun: '#fff2d8', sunI: 3, decor: 'antique', night: false,
      terrain: { h: 50, seed: 97, drop: 26 }, music: { bpm: 112, root: 52, prog: [[0, 3, 7], [5, 8, 12], [-2, 2, 5], [3, 7, 10]] } } }
);
const LEVELS10 = {"lavande": {"pts": [[0, 0, 0], [160, -8, 1], [304, 16, 3], [400, 88, 6], [416, 192, 9], [352, 264, 10], [256, 280, 10], [184, 336, 9], [160, 424, 7], [80, 472, 5], [-32, 448, 3], [-96, 360, 2], [-112, 240, 1], [-144, 144, 0], [-112, 48, 0]], "glide": [[0.7834, 0.8284]], "branches": [{"from": 0.0947, "to": 0.4343, "mid": [[227, 131, 5.5]], "width": 14, "side": 1, "offroad": true, "label": "HORS-PISTE"}], "items": [0.05, 0.3, 0.55, 0.863], "boosts": [[0.17, 0], [0.469, 0.3], [0.68, -0.3]]}, "automne": {"pts": [[0, 0, 0], [154, 0, 0], [280, 42, 2], [336, 140, 5], [294, 231, 8], [196, 252, 9], [140, 322, 10], [182, 406, 10], [294, 434, 9], [392, 392, 7], [434, 294, 6], [504, 231, 6], [574, 266, 7], [581, 364, 8], [518, 462, 8], [392, 518, 6], [238, 532, 4], [98, 490, 3], [-14, 420, 2], [-56, 315, 1], [-70, 196, 0], [-56, 84, 0]], "tunnels": [[0.7142, 0.7713]], "branches": [{"from": 0.2388, "to": 0.444, "mid": [[275, 313, 7.5]], "width": 14, "side": -1, "offroad": true, "label": "HORS-PISTE"}], "items": [0.05, 0.3, 0.55, 0.8], "boosts": [[0.17, 0], [0.479, 0.3], [0.68, -0.3]]}, "lagon": {"pts": [[0, 0, 0], [200, -16, 0], [384, 16, 1], [496, 112, 2], [512, 240, 3], [432, 320, 3], [304, 336, 2], [208, 400, 2], [96, 416, 2], [-16, 368, 1], [-96, 272, 1], [-112, 144, 0], [-72, 48, 0]], "glide": [[0.6424, 0.6924]], "branches": [{"from": 0.2267, "to": 0.5326, "mid": [[352, 179, 1.5]], "width": 14, "side": 1, "offroad": true, "label": "HORS-PISTE"}], "items": [0.05, 0.3, 0.568, 0.8], "boosts": [[0.17, 0], [0.43, 0.3], [0.727, -0.3]]}, "ruines": {"pts": [[0, 0, 0], [130, -29, 1], [259, -14, 3], [331, 58, 6], [317, 158, 9], [374, 238, 11], [475, 259, 12], [533, 346, 12], [490, 432, 10], [374, 461, 8], [259, 432, 6], [187, 360, 5], [86, 338, 4], [-14, 374, 3], [-101, 331, 2], [-122, 230, 1], [-86, 130, 0], [-58, 50, 0]], "glide": [[0.8363, 0.8813]], "tunnels": [[0.4613, 0.5251]], "branches": [{"from": 0.3536, "to": 0.6412, "mid": [[347, 322, 8.5]], "width": 14, "side": 1, "offroad": true, "label": "HORS-PISTE"}], "items": [0.05, 0.3, 0.55, 0.696], "boosts": [[0.17, 0], [0.43, 0.3], [0.76, -0.3]]}};
for (const t of TRACKS) { const L = LEVELS10[t.id]; if (L) { t.pts = L.pts; t.boosts = L.boosts; t.items = L.items; if (L.glide) t.glide = L.glide; if (L.tunnels) t.tunnels = L.tunnels; t.branches = L.branches; } }

/* ================= v11 : coupes Grand Frisson et Gueule de Bois — décors ================= */
const PINBALL_THEME = { sky: ['#0a0620', '#2a1050'], fog: '#140a30', fogN: 260, fogF: 1300, ground: 'pinball', road: '#232048', roadStyle: 'pinball', curb: ['#ff3a8a', '#ffe14a'], barrier: ['#38e0ff', '#1b1840'], skirt: '#2a2050',
  hemi: ['#b8a8ff', '#2a1a48', 1.5], sun: '#e8d8ff', sunI: 1.9, decor: 'pinball', night: true,
  music: { bpm: 128, root: 50, prog: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]] } };
function groundTexPinball() { const n = fbm(5, 3, 913); return pixelTex(512, 512, (u, v) => {
  const m = n(u, v); let c = mix3([22, 18, 60], [48, 22, 92], m);
  const cx = (u * 3) % 1 - .5, cz = (v * 3) % 1 - .5, r = Math.hypot(cx, cz);
  if (r > .3 && r < .34) c = mix3(c, [255, 200, 60], .7); else if (r < .08) c = mix3(c, [255, 70, 150], .6);
  const st = Math.abs(((u * 6 + v * 6) % 1) - .5) < .012; if (st) c = mix3(c, [60, 220, 255], .45);
  return c; }); }
// route « ruban » (satin rose, liseré doré) et route de flipper (laque bleu nuit, flèches de couloir)
function roadTexStyle(th) {
  if (th.roadStyle === 'carpet') return carpetRoadTex();
  if (th.roadStyle === 'ribbon') { const n1 = tileNoise(128, 31); return pixelTex(512, 512, (u, v) => {
    const sheen = .82 + .22 * Math.sin(u * Math.PI) + .06 * Math.sin(v * TAU * 6 + u * 9) + (n1(u, v) - .5) * .05;
    let c = mulc([238, 120, 170], sheen); if (u < .05 || u > .95) c = mulc([255, 205, 90], .9 + n1(u, v) * .2); else if (u < .07 || u > .93) c = [255, 240, 248];
    if (u > .494 && u < .506 && (v * 4) % 1 < .5) c = mix3(c, [255, 245, 250], .7); return c; }); }
  if (th.roadStyle === 'pinball') { const n1 = tileNoise(128, 37); return pixelTex(512, 512, (u, v) => {
    let c = mulc([34, 30, 78], .9 + (n1(u, v) - .5) * .1 + .12 * Math.sin(u * Math.PI));
    if (u < .04 || u > .96) c = [255, 225, 80];
    const ax = Math.abs(u - .5), vv = (v * 2) % 1; if (vv > .2 && vv < .5 && ax < .14 - (vv - .2) * .4 && ax > .1 - (vv - .2) * .4) c = mix3(c, [255, 80, 160], .85);
    if ((u > .24 && u < .25) || (u > .75 && u < .76)) c = mix3(c, [80, 230, 255], .6); return c; }); }
  return null;
}
function neonMat(c, k) { return new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k || 1.2, roughness: .3 }); }
function buildPinball(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W, S = W.S; W.anim = W.anim || [];
  // rebords inclinés du plateau (grand anneau) + liserés néon
  const R0 = ext + 90, nW = 36;
  for (let k = 0; k < nW; k++) { const a = k / nW * TAU, x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0; const w = TAU * R0 / nW + 2;
    const m = new T.Mesh(new T.BoxGeometry(w, 40, 6), stdMat('#2a1c5a', .4, .3)); m.position.set(x, 18, z); m.rotation.y = -a + Math.PI / 2; m.rotation.x = 0; scene.add(m);
    const s = new T.Mesh(new T.BoxGeometry(w, 1.2, 6.4), neonMat(k % 2 ? '#38e0ff' : '#ff3a8a', 1.4)); s.position.set(x, 30, z); s.rotation.y = m.rotation.y; scene.add(s); }
  // champignons-bumpers géants (hors piste), qui clignotent
  const bump = []; const mush = scatter(14 * q + 8, 14, 150, 1.4, 2.4);
  for (const p of mush) { const g = new T.Group(); const c = pick(['#ff3a8a', '#38e0ff', '#ffe14a', '#7cff6a']);
    const st = new T.Mesh(new T.CylinderGeometry(3.2, 3.6, 4, 24), stdMat('#f4f0ff', .3, .2)); st.position.y = 2; g.add(st);
    const cap = new T.Mesh(new T.CylinderGeometry(5.2, 5.2, 1.6, 28), neonMat(c, .6)); cap.position.y = 4.8; g.add(cap);
    const ringM = new T.Mesh(new T.TorusGeometry(4.2, .45, 10, 32), stdMat('#ffffff', .2, .6)); ringM.rotation.x = Math.PI / 2; ringM.position.y = 3.2; g.add(ringM);
    g.position.set(p.x, hy(W, p.x, p.z), p.z); g.scale.setScalar(p.s); scene.add(g); bump.push(cap.material); }
  W.anim.push((dt, t) => { for (let i = 0; i < bump.length; i++) bump[i].emissiveIntensity = .4 + Math.max(0, Math.sin(t * 3 + i * 1.7)) * 1.4; });
  // lance-billes (triangles) et grands batteurs qui battent
  const flips = [];
  for (const p of scatter(6, 30, 200, 1, 1)) { const g = new T.Group(); g.position.set(p.x, hy(W, p.x, p.z), p.z); g.rotation.y = rand(0, TAU);
    for (const sg of [-1, 1]) { const piv = new T.Group(); piv.position.set(sg * 16, 2, 0); const bat = new T.Mesh(rbox(22, 4, 5, 1.6), stdMat(sg > 0 ? '#ff3a8a' : '#38e0ff', .3, .2)); bat.position.x = -sg * 10; piv.add(bat);
      const cap = new T.Mesh(new T.CylinderGeometry(3.2, 3.2, 4.6, 18), stdMat('#f4f0ff', .3, .4)); piv.add(cap); g.add(piv); flips.push({ piv, sg, ph: rand(0, 3) }); }
    scene.add(g); }
  W.anim.push((dt, t) => { for (const f of flips) { const c = ((t + f.ph) % 3) / 3; const a = c < .08 ? c / .08 : c < .2 ? 1 : Math.max(0, 1 - (c - .2) / .1); f.piv.rotation.y = f.sg * (-.35 + a * .9); } });
  const tri = scatter(10 * q + 4, 20, 160, 1, 1.4);
  instanced(scene, [{ geo: new T.CylinderGeometry(6, 6, 3, 3), mat: stdMat('#ffe14a', .4, .2), off: tr(0, 1.5, 0) }, { geo: new T.CylinderGeometry(6.4, 6.4, .8, 3), mat: neonMat('#ff3a8a', 1), off: tr(0, 3.2, 0) }], tri);
  // grosses billes d'acier posées
  for (const p of scatter(5 * q + 3, 16, 180, 1, 1)) { const b = new T.Mesh(new T.SphereGeometry(6, 32, 20), new T.MeshStandardMaterial({ color: '#e0e4f0', roughness: .06, metalness: 1 })); b.position.set(p.x, hy(W, p.x, p.z) + 6, p.z); scene.add(b); }
  // fronton lumineux « EXTRA-BILLE »
  const bt = canvasTex(512, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a0a5a'); gr.addColorStop(1, '#5a0a4a'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.font = 'bold 74px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ffe14a'; x.strokeStyle = '#ff3a8a'; x.lineWidth = 6; x.strokeText('EXTRA-BILLE', w / 2, 110); x.fillText('EXTRA-BILLE', w / 2, 110);
    x.font = 'bold 40px monospace'; x.fillStyle = '#38e0ff'; x.fillText('SCORE 1 000 000', w / 2, 190); for (let i = 0; i < 24; i++) { x.fillStyle = i % 2 ? '#ff3a8a' : '#ffe14a'; x.beginPath(); x.arc(20 + i * 20.5, 236, 6, 0, TAU); x.fill(); } }, false);
  const board = new T.Mesh(new T.PlaneGeometry(260, 130), new T.MeshBasicMaterial({ map: bt, side: T.DoubleSide })); board.position.set(cx, 95, cz - R0 - 10); scene.add(board);
  // lumières de couloir le long de la piste
  const pts = []; for (let i = 0; i < S.N; i += 9) { if (S.glide[i] || (S.wz && S.wz[i])) continue; for (const sg of [-1, 1]) { const d = sg * (W.wallD + 2.4); pts.push(S.px[i] + S.rx[i] * d, S.py[i] + 1.4, S.pz[i] + S.rz[i] * d); } }
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  const pm = new T.PointsMaterial({ color: '#ffe14a', size: 3.4, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .9 }); scene.add(new T.Points(gg, pm));
  W.anim.push((dt, t) => { pm.color.setHSL((t * .15) % 1, .9, .62); });
  // étoiles dans le ciel
  const sp = []; for (let k = 0; k < 500; k++) { const a = Math.random() * TAU, e = Math.acos(rand(.1, 1)); sp.push(Math.cos(a) * Math.sin(e) * 1300, Math.cos(e) * 1300, Math.sin(a) * Math.sin(e) * 1300); }
  const sg2 = new T.BufferGeometry(); sg2.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); W.sky.add(new T.Points(sg2, new T.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: .8, depthWrite: false })));
}
// forteresse : remparts crénelés, tours aux fenêtres de braise, grand portail au départ, barbecues géants fumants
function buildFortress(W) {
  const { scene } = W, S = W.S, N = S.N; const stone = stdMat('#3a3238', .9, 0), dark = stdMat('#251f26', .9, 0), ember = neonMat('#ff6a1a', 1.6);
  const walls = [], merl = [], towers = [], wins = [];
  const busy = (i) => S.glide[i] || (S.wz && S.wz[i]) || (S.nowall && S.nowall[i]) || W.branches.some((B) => { const d = (j) => Math.min(Math.abs(i - j), N - Math.abs(i - j)); return d(B.i0) < 40 || d(B.i1) < 40; });
  for (let i = 0; i < N; i += 6) { if (busy(i)) continue; for (const sg of [-1, 1]) { const d = sg * (W.wallD + 16); const x = S.px[i] + S.rx[i] * d, z = S.pz[i] + S.rz[i] * d, y = hy(W, x, z);
    walls.push({ x, z, y, s: 1, r: S.hd[i] }); if ((i / 6) % 2 === 0) merl.push({ x, z, y: y + 11, s: 1, r: S.hd[i] });
    if (i % 120 === 0) { towers.push({ x: x + S.rx[i] * sg * 4, z: z + S.rz[i] * sg * 4, y, s: 1, r: 0 }); for (let h = 0; h < 3; h++) wins.push({ x: x + S.rx[i] * sg * 4 - S.rx[i] * sg * 5.6, z: z + S.rz[i] * sg * 4 - S.rz[i] * sg * 5.6, y: y + 8 + h * 7, s: 1, r: S.hd[i] }); } } }
  instanced(scene, [{ geo: new T.BoxGeometry(2.4, 10, 12.6), mat: stone, off: tr(0, 5, 0) }], walls);
  instanced(scene, [{ geo: new T.BoxGeometry(2.6, 2.4, 3), mat: dark, off: tr(0, 1.2, 0) }], merl);
  instanced(scene, [{ geo: new T.CylinderGeometry(5.5, 6.2, 30, 14), mat: stone, off: tr(0, 15, 0) }, { geo: new T.ConeGeometry(7, 9, 14), mat: stdMat('#5a1a1a', .8, 0), off: tr(0, 34.5, 0) }], towers);
  instanced(scene, [{ geo: new T.BoxGeometry(.6, 2.6, 1.4), mat: ember }], wins);
  // portail au-dessus de la ligne de départ
  { const i = 10, g = new T.Group(); g.position.set(S.px[i], S.py[i], S.pz[i]); g.rotation.y = S.hd[i];
    for (const sg of [-1, 1]) { const p = new T.Mesh(new T.BoxGeometry(6, 22, 6), stone); p.position.set(sg * (W.wallD + 4), 11, 0); g.add(p); }
    const top = new T.Mesh(new T.BoxGeometry(W.wallD * 2 + 14, 6, 6.5), stone); top.position.y = 24; g.add(top);
    for (let k = -3; k <= 3; k++) { const m = new T.Mesh(new T.BoxGeometry(3, 3, 6.8), dark); m.position.set(k * (W.wallD + 6) / 3.4, 28.5, 0); g.add(m); }
    const grill = new T.Mesh(new T.BoxGeometry(W.wallD * 2, 3, .6), stdMat('#1a1418', .6, .6)); grill.position.y = 19.5; g.add(grill); scene.add(g); }
  // barbecues géants (hors piste) avec braises et fumée
  const smoke = [];
  const bbq = []; for (let k = 0; k < 7; k++) { const i = Math.floor((k + .5) / 7 * N); if (busy(i)) continue; const sg = k % 2 ? 1 : -1, d = sg * (W.wallD + 34); bbq.push({ x: S.px[i] + S.rx[i] * d, z: S.pz[i] + S.rz[i] * d }); }
  for (const b of bbq) { const g = new T.Group(); const y = hy(W, b.x, b.z); g.position.set(b.x, y, b.z);
    const bowl = new T.Mesh(new T.SphereGeometry(9, 24, 12, 0, TAU, Math.PI / 2, Math.PI / 2), stdMat('#1a1418', .5, .7)); bowl.position.y = 11; g.add(bowl);
    const coals = new T.Mesh(new T.CircleGeometry(8.6, 24), ember); coals.rotation.x = -Math.PI / 2; coals.position.y = 10.6; g.add(coals);
    for (let l = 0; l < 3; l++) { const leg = new T.Mesh(new T.CylinderGeometry(.5, .5, 11, 8), stdMat('#2a2228', .5, .6)); const a = l / 3 * TAU; leg.position.set(Math.cos(a) * 5, 5, Math.sin(a) * 5); leg.rotation.set(Math.sin(a) * .3, 0, -Math.cos(a) * .3); g.add(leg); }
    for (let s = 0; s < 6; s++) { const sk = new T.Mesh(new T.CylinderGeometry(.9, .9, 7, 10), stdMat(pick(['#a8452a', '#c86a3a', '#ffcf9a']), .7, 0)); sk.rotation.z = Math.PI / 2; sk.position.set(rand(-4, 4), 11.8, -5 + s * 2); g.add(sk); }
    scene.add(g); smoke.push({ x: b.x, y: y + 13, z: b.z }); }
  W.anim = W.anim || []; let acc = 0;
  W.anim.push((dt) => { acc += dt; if (acc < .12 || !W.parts) return; acc = 0; for (const s of smoke) W.parts.emit(s.x + rand(-3, 3), s.y, s.z + rand(-3, 3), rand(-.5, .5), rand(3, 5), rand(-.5, .5), pick(['#5a5058', '#7a7078', '#ff8a3a']), 1.4, 0); });
}

/* ================= v11 : Coupe After (circuits XXL) — décors ================= */
const HOUSE_THEME = { sky: ['#ffe8c8', '#fff6ea'], fog: '#f4e2c8', fogN: 300, fogF: 1500, ground: 'parquet', road: '#a8243a', roadStyle: 'carpet', curb: ['#ffd25a', '#fff6e8'], barrier: ['#5ab0ff', '#fff6e8'], skirt: '#8a5a3a',
  hemi: ['#fff4e0', '#a8784a', 1.9], sun: '#ffe8c0', sunI: 2.6, decor: 'house', night: false, tunnel: 'wood',
  music: { bpm: 112, root: 52, prog: [[0, 4, 7], [5, 9, 12], [2, 5, 9], [7, 11, 14]] } };
const FEST_THEME = { sky: ['#07041a', '#2a0a3a'], fog: '#120826', fogN: 220, fogF: 1300, ground: 'grass', road: '#2e2f3d', curb: ['#ff3a8a', '#38e0ff'], barrier: ['#ffe14a', '#1b1840'], skirt: '#2a3a28',
  hemi: ['#c0a0ff', '#20301a', 1.4], sun: '#ffd0f0', sunI: 1.7, decor: 'festival', night: true, tunnel: 'fun',
  music: { bpm: 126, root: 53, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [3, 7, 10]] } };
function groundTexParquet() { const n = tileNoise(128, 51), nL = fbm(5, 3, 52); return pixelTex(512, 512, (u, v) => {
  const row = Math.floor(v * 16), off = (row % 2) * .5, pl = Math.floor(u * 4 + off), x = (u * 4 + off) % 1, y = (v * 16) % 1;
  const tint = [[168, 112, 64], [184, 126, 74], [150, 98, 56], [176, 120, 70]][(pl * 7 + row * 3) % 4];
  let c = mulc(tint, .9 + (n(u * 2 % 1, v) - .5) * .18 + Math.sin((u * 60 + nL(u, v) * 6) * 1.3) * .03); if (x < .01 || y < .05) c = mulc(c, .7); return c; }); }
function carpetRoadTex() { const n1 = tileNoise(128, 61); return pixelTex(512, 512, (u, v) => {
  let c = mulc([168, 36, 58], .86 + (n1(u, v) - .5) * .12 + .08 * Math.sin(u * Math.PI)); const e = Math.min(u, 1 - u);
  if (e < .05) c = mulc([240, 196, 80], .9 + n1(u, v) * .15); else if (e < .07) c = [120, 20, 40];
  const vv = (v * 3) % 1, ax = Math.abs(u - .5); if (ax < .06 && Math.abs(vv - .5) < .06 - ax) c = mix3(c, [240, 196, 80], .3); return c; }); }
// ---------- Boum chez Tonton : une maison géante (on est minuscules) ----------
function buildHouse(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; W.anim = W.anim || [];
  const wallp = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#f6e6c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8c890'; for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 12, h); x.fillStyle = '#d8743a'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.beginPath(); x.arc(i * 32 + 22, j * 32 + 16, 4, 0, TAU); x.fill(); } });
  wallp.wrapS = wallp.wrapT = T.RepeatWrapping; wallp.repeat.set(16, 3);
  const R = ext + 160, H = 320; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const m = new T.Mesh(new T.PlaneGeometry(R * 2.2, H), new T.MeshLambertMaterial({ map: wallp, side: T.DoubleSide }));
    m.position.set(cx + Math.sin(a) * R, H / 2 - 2, cz + Math.cos(a) * R); m.rotation.y = a + Math.PI; scene.add(m);
    const base = new T.Mesh(new T.BoxGeometry(R * 2.2, 14, 3), lam('#fff6ea')); base.position.set(cx + Math.sin(a) * (R - 2), 7, cz + Math.cos(a) * (R - 2)); base.rotation.y = a; scene.add(base); }
  // meubles géants posés au sol, toujours hors de la piste
  const place = (n, near, far) => scatter(n, near, far, 1, 1);
  for (const p of place(3, 70, 150)) { const g = new T.Group(); const c = pick(['#3a6ac8', '#c84a3a', '#3a9a7a']); // canapé
    const seat = new T.Mesh(rbox(110, 22, 46, 6), stdMat(c, .9, 0)); seat.position.y = 11 + 10; g.add(seat); const back = new T.Mesh(rbox(110, 40, 14, 6), stdMat(c, .9, 0)); back.position.set(0, 46, -18); g.add(back);
    for (const sx of [-58, 58]) { const arm = new T.Mesh(rbox(14, 34, 46, 6), stdMat(c, .9, 0)); arm.position.set(sx, 27, 0); g.add(arm); }
    for (const [lx, lz] of [[-48, -18], [48, -18], [-48, 18], [48, 18]]) { const leg = new T.Mesh(new T.CylinderGeometry(2.5, 2, 10, 10), lam('#5a3a22')); leg.position.set(lx, 5, lz); g.add(leg); }
    for (let k = 0; k < 3; k++) { const cu = new T.Mesh(rbox(30, 10, 34, 5), stdMat(pick(['#ffd25a', '#ff7a9a', '#fff6e8']), .9, 0)); cu.position.set(-34 + k * 34, 37, 2); g.add(cu); }
    g.position.set(p.x, hy(W, p.x, p.z), p.z); g.rotation.y = rand(0, TAU); scene.add(g); }
  for (const p of place(3, 60, 160)) { const g = new T.Group(); // table basse + bouteilles, verres, chips
    const top = new T.Mesh(new T.BoxGeometry(80, 4, 50), stdMat('#8a5a32', .5, 0)); top.position.y = 30; g.add(top);
    for (const [lx, lz] of [[-36, -21], [36, -21], [-36, 21], [36, 21]]) { const leg = new T.Mesh(new T.BoxGeometry(4, 28, 4), lam('#6a4426')); leg.position.set(lx, 14, lz); g.add(leg); }
    for (let k = 0; k < 6; k++) { const col = pick(['#2a8a3a', '#7a2a1a', '#c8a040', '#3a5aa8']); const b = new T.Mesh(new T.CylinderGeometry(3.6, 3.6, 18, 16), new T.MeshStandardMaterial({ color: col, roughness: .1, metalness: .1, transparent: true, opacity: .85 })); b.position.set(rand(-30, 30), 41, rand(-18, 18)); g.add(b);
      const nk = new T.Mesh(new T.CylinderGeometry(1.2, 2.8, 8, 12), b.material); nk.position.set(b.position.x, 54, b.position.z); g.add(nk); }
    for (let k = 0; k < 4; k++) { const cup = new T.Mesh(new T.CylinderGeometry(4, 3, 10, 16, 1, true), new T.MeshStandardMaterial({ color: '#ff3a4a', side: T.DoubleSide })); cup.position.set(rand(-30, 30), 37, rand(-18, 18)); g.add(cup); }
    const bowl = new T.Mesh(new T.SphereGeometry(12, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), lam('#e8e0d0')); bowl.position.set(0, 44, 0); bowl.rotation.x = Math.PI; g.add(bowl);
    g.position.set(p.x, hy(W, p.x, p.z), p.z); g.rotation.y = rand(0, TAU); scene.add(g); }
  // tapis, disques vinyles, ballons, guirlandes, boule disco géante
  instanced(scene, [{ geo: new T.CylinderGeometry(16, 16, .6, 32), mat: lam('#17141a'), off: tr(0, .3, 0) }, { geo: new T.CylinderGeometry(5, 5, .7, 20), mat: lam('#ffffff'), off: tr(0, .35, 0), colors: ['#ff4f7a', '#ffc531', '#38b6ff'] }], scatter(18 * q + 6, 30, 200, .8, 1.2));
  const bal = scatter(40 * q + 10, 20, 220, .8, 1.3).map((p) => Object.assign(p, { y: rand(20, 90) }));
  instanced(scene, [{ geo: new T.SphereGeometry(6, 16, 12), mat: stdMat('#ffffff', .3, .1), colors: ['#ff4f7a', '#ffc531', '#38b6ff', '#3ee08f', '#a87dff'] }, { geo: new T.CylinderGeometry(.08, .08, 30, 4), mat: lam('#ffffff'), off: tr(0, -21, 0) }], bal);
  const disco = new T.Mesh(new T.SphereGeometry(26, 24, 16), new T.MeshStandardMaterial({ color: '#d8dce8', roughness: .15, metalness: 1, flatShading: true })); disco.position.set(cx, 210, cz); scene.add(disco);
  W.anim.push((dt) => { disco.rotation.y += dt * .3; });
  const g2 = []; for (let k = 0; k < 120; k++) { const a = k / 120 * TAU; g2.push(cx + Math.cos(a) * (R - 6), 180 + Math.sin(k * .9) * 6, cz + Math.sin(a) * (R - 6)); }
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(g2, 3)); const pm = new T.PointsMaterial({ color: '#ffd25a', size: 9, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending }); scene.add(new T.Points(gg, pm));
  W.anim.push((dt, t) => { pm.color.setHSL((t * .1) % 1, .8, .65); });
  // banderole « BOUM CHEZ TONTON »
  const bt = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#ff4f7a'; x.fillRect(0, 0, w, h); x.font = 'bold 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff6e8'; x.fillText('BOUM CHEZ TONTON', w / 2, h / 2 + 4); }, false);
  const ban = new T.Mesh(new T.PlaneGeometry(240, 60), new T.MeshBasicMaterial({ map: bt, side: T.DoubleSide })); ban.position.set(cx, 140, cz - R + 4); scene.add(ban);
}
// ---------- Train Fou : voie ferrée qui longe la route, gares, trains qui roulent ----------
function buildRailway(W) {
  const { scene } = W, S = W.S, N = S.N; W.anim = W.anim || []; const off = W.wallD + 22; const busy = (i) => S.glide[i] || (S.bridge && S.bridge[i]);
  const sleepers = [], rails = [], bed = []; const yR = (i, x, z) => Math.max(hy(W, x, z), S.py[i] - .6) + .35;
  for (let i = 0; i < N; i += 2) { if (busy(i)) continue; const x = S.px[i] + S.rx[i] * off, z = S.pz[i] + S.rz[i] * off, y = yR(i, x, z); sleepers.push({ x, z, y, s: 1, r: S.hd[i] + Math.PI / 2 }); if (i % 4 === 0) bed.push({ x, z, y, s: 1, r: S.hd[i] }); }
  instanced(scene, [{ geo: new T.BoxGeometry(7.5, 4.6, 8.8), mat: lam('#8a8478'), off: tr(0, -2.2, 0) }], bed);
  instanced(scene, [{ geo: new T.BoxGeometry(5.4, .4, 1), mat: lam('#5a3a22'), off: tr(0, .2, 0) }], sleepers);
  for (const d of [-1.6, 1.6]) { const pts = []; for (let i = 0; i < N; i += 2) { if (busy(i)) { if (pts.length > 1) rails.push(pts.splice(0)); else pts.length = 0; continue; } const o = off + d, x = S.px[i] + S.rx[i] * o, z = S.pz[i] + S.rz[i] * o; pts.push(new T.Vector3(x, yR(i, x, z) + .55, z)); } if (pts.length > 1) rails.push(pts); }
  const rm = stdMat('#c8ccd8', .3, .9); for (const p of rails) { const c = new T.CatmullRomCurve3(p); scene.add(new T.Mesh(new T.TubeGeometry(c, p.length * 2, .18, 5, false), rm)); }
  // train : locomotive + wagons qui avancent le long de la voie
  const train = new T.Group(); const parts = [];
  const mk = (len, col, loco) => { const g = new T.Group(); const body = new T.Mesh(rbox(3.4, 3.6, len, .4), stdMat(col, .4, .3)); body.position.y = 2.6; g.add(body);
    if (loco) { const cab = new T.Mesh(rbox(3.4, 2, 3, .3), stdMat('#2a2a3a', .4, .3)); cab.position.set(0, 5.2, -len * .3); g.add(cab); const ch = new T.Mesh(new T.CylinderGeometry(.7, .9, 2.4, 12), lam('#2a2a3a')); ch.position.set(0, 5.4, len * .3); g.add(ch); }
    for (const z of [-len * .35, len * .35]) for (const x of [-1.5, 1.5]) { const w = new T.Mesh(new T.CylinderGeometry(.7, .7, .4, 12), lam('#17141a')); w.rotation.z = Math.PI / 2; w.position.set(x, .8, z); g.add(w); }
    const win = new T.Mesh(new T.BoxGeometry(3.46, 1, len * .8), new T.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffcf6a', emissiveIntensity: .6 })); win.position.y = 3.2; g.add(win); scene.add(g); return g; };
  parts.push(mk(11, '#e2342a', true)); for (let k = 0; k < 5; k++) parts.push(mk(10, ['#ffc531', '#38b6ff', '#3ee08f', '#ff6fb5', '#fffdf7'][k], false));
  let s = 0; const seg = S.seg; W.anim.push((dt) => { s = (s + dt * 26) % S.L; for (let k = 0; k < parts.length; k++) { const fi = ((s - k * 12) / seg % N + N) % N; const i = Math.floor(fi); const x = S.px[i] + S.rx[i] * off, z = S.pz[i] + S.rz[i] * off; const g = parts[k];
    g.visible = !busy(i); g.position.set(x, yR(i, x, z) + .4, z); g.rotation.y = S.hd[i]; } });
  // gares et panneaux
  const sta = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#1b3a8a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fffdf7'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GARE DU TRAIN FOU', w / 2, h / 2 + 2); }, false);
  for (let k = 0; k < 3; k++) { const i = Math.floor((k + .3) / 3 * N); if (busy(i)) continue; const o = off + 9, x = S.px[i] + S.rx[i] * o, z = S.pz[i] + S.rz[i] * o, y = yR(i, x, z) - .35; const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = S.hd[i];
    const pf = new T.Mesh(new T.BoxGeometry(8, 1, 40), lam('#b8b0a0')); pf.position.y = .5; g.add(pf); const roof = new T.Mesh(new T.BoxGeometry(9, .6, 36), lam('#a83a2a')); roof.position.y = 6; g.add(roof);
    for (const z2 of [-15, 0, 15]) { const p = new T.Mesh(new T.CylinderGeometry(.3, .3, 5.5, 8), lam('#2a2a3a')); p.position.set(2.5, 3.2, z2); g.add(p); }
    const sg = new T.Mesh(new T.PlaneGeometry(10, 2.5), new T.MeshBasicMaterial({ map: sta, side: T.DoubleSide })); sg.position.set(0, 7.8, 0); sg.rotation.y = Math.PI / 2; g.add(sg); scene.add(g); }
}
// ---------- Croisière Karaoké : paquebot géant + scène de karaoké ----------
function buildCruise(W, ext, cx, cz) {
  const { scene } = W; W.anim = W.anim || []; const g = new T.Group(); const L = 420;
  const hull = new T.Mesh(rbox(70, 34, L, 10), stdMat('#fffdf7', .5, .1)); hull.position.y = 12; g.add(hull);
  const red = new T.Mesh(new T.BoxGeometry(71, 8, L - 6), stdMat('#c8283a', .5, .1)); red.position.y = -1; g.add(red);
  for (let d = 0; d < 4; d++) { const deck = new T.Mesh(rbox(60 - d * 8, 10, L * (.8 - d * .12), 4), stdMat(d % 2 ? '#e8f0ff' : '#fffdf7', .5, .1)); deck.position.y = 34 + d * 10; g.add(deck);
    const win = new T.Mesh(new T.BoxGeometry(60.4 - d * 8, 2.4, L * (.8 - d * .12) - 8), new T.MeshStandardMaterial({ color: '#2a4a7a', emissive: '#7ab8ff', emissiveIntensity: .35 })); win.position.y = 34 + d * 10; g.add(win); }
  for (const z of [-60, 30]) { const ch = new T.Mesh(new T.CylinderGeometry(10, 12, 40, 20), stdMat('#ffc531', .4, .1)); ch.position.set(0, 90, z); g.add(ch); const top = new T.Mesh(new T.CylinderGeometry(10.2, 10.2, 7, 20), lam('#17141a')); top.position.set(0, 107, z); g.add(top); }
  for (let k = 0; k < 10; k++) for (const sx of [-1, 1]) { const lb = new T.Mesh(rbox(6, 3, 14, 1.4), stdMat('#ff8a1e', .5, 0)); lb.position.set(sx * 37, 30, -170 + k * 36); g.add(lb); }
  const pool = new T.Mesh(new T.BoxGeometry(30, .6, 50), new T.MeshStandardMaterial({ map: waterTex(), color: '#5fd8ff', roughness: .05 })); pool.position.set(0, 75, 120); g.add(pool);
  // scène karaoké sur le pont avant
  const scr = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#17083a'; x.fillRect(0, 0, w, h); x.font = 'bold 76px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ff6fb5'; x.fillText('KARAOKÉ', w / 2, 100); x.font = 'bold 34px sans-serif'; x.fillStyle = '#fffdf7'; x.fillText('♪ la la la… tout le monde chante ! ♪', w / 2, 180); }, false);
  const screen = new T.Mesh(new T.PlaneGeometry(56, 28), new T.MeshBasicMaterial({ map: scr, side: T.DoubleSide })); screen.position.set(0, 100, 180); g.add(screen);
  const notes = []; for (let k = 0; k < 14; k++) { const n = new T.Mesh(new T.SphereGeometry(2.4, 10, 8), neonMat(pick(['#ff6fb5', '#ffc531', '#38e0ff']), 1.2)); n.position.set(rand(-30, 30), 90 + rand(0, 40), 190 + rand(-10, 10)); n.userData.y0 = n.position.y; n.userData.ph = rand(0, TAU); g.add(n); notes.push(n); }
  W.anim.push((dt, t) => { for (const n of notes) n.position.y = n.userData.y0 + Math.sin(t * 1.5 + n.userData.ph) * 6; });
  // posé au large, en dehors du circuit
  const S = W.S; let far = null, best = -1; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, r = ext + 150, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; let md = 1e9; for (let i = 0; i < S.N; i += 8) md = Math.min(md, Math.hypot(S.px[i] - x, S.pz[i] - z)); if (md > best) { best = md; far = [x, z, a]; } }
  g.position.set(far[0], 2, far[1]); g.rotation.y = -far[2]; scene.add(g);
}
// ---------- Festival Boum-Boum : scènes, enceintes, projecteurs, foule, feux d'artifice ----------
function buildFestival(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; W.anim = W.anim || []; const beams = [];
  for (const p of scatter(4, 80, 220, 1, 1)) { const g = new T.Group(); g.position.set(p.x, hy(W, p.x, p.z), p.z); g.lookAt(cx, g.position.y, cz);
    const st = new T.Mesh(new T.BoxGeometry(70, 6, 36), lam('#2a2a3a')); st.position.y = 3; g.add(st);
    const back = new T.Mesh(new T.PlaneGeometry(70, 34), new T.MeshBasicMaterial({ map: canvasTex(256, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff3a8a'); gr.addColorStop(.5, '#7a3aff'); gr.addColorStop(1, '#38e0ff'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText('BOUM-BOUM', w / 2, h / 2 + 10); }, false), side: T.DoubleSide })); back.position.set(0, 23, -16); g.add(back);
    for (const sx of [-40, 40]) for (let h = 0; h < 4; h++) { const sp = new T.Mesh(new T.BoxGeometry(9, 8, 8), lam('#17141a')); sp.position.set(sx, 4 + h * 8, 0); g.add(sp); const cone = new T.Mesh(new T.CircleGeometry(3, 16), lam('#3a3a4a')); cone.position.set(sx, 4 + h * 8, 4.05); g.add(cone); }
    const truss = new T.Mesh(new T.BoxGeometry(78, 2, 2), stdMat('#c8ccd8', .3, .8)); truss.position.set(0, 42, 4); g.add(truss);
    for (let k = 0; k < 6; k++) { const b = new T.Mesh(new T.ConeGeometry(5, 60, 12, 1, true), new T.MeshBasicMaterial({ color: pick(['#ff3a8a', '#38e0ff', '#ffe14a', '#7cff6a']), transparent: true, opacity: .18, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      b.geometry.translate(0, -30, 0); const piv = new T.Group(); piv.position.set(-30 + k * 12, 42, 4); piv.add(b); g.add(piv); beams.push({ piv, ph: k * .9 }); }
    scene.add(g); }
  W.anim.push((dt, t) => { for (const b of beams) { b.piv.rotation.z = Math.sin(t * 1.1 + b.ph) * .6; b.piv.rotation.x = .5 + Math.cos(t * .8 + b.ph) * .3; } });
  // foule
  const ppl = scatter(380 * q + 60, 6, 120, .9, 1.1); const shirts = ['#ff4f3a', '#38b6ff', '#ffc531', '#3ee08f', '#7c4dff', '#ff6fb5', '#fffdf7', '#2b2b3a'];
  instanced(scene, [{ geo: new T.CapsuleGeometry(.4, .9, 4, 8), mat: lam('#ffffff'), off: tr(0, 1, 0), colors: shirts }, { geo: new T.SphereGeometry(.3, 10, 8), mat: lam('#ffffff'), off: tr(0, 1.95, 0), colors: SKINS }], ppl);
  // tentes, food-trucks, drapeaux
  instanced(scene, [{ geo: new T.ConeGeometry(7, 7, 4), mat: lam('#ffffff'), off: tr(0, 6.5, 0), colors: ['#ff4f7a', '#ffc531', '#38b6ff', '#fffdf7'] }, { geo: new T.BoxGeometry(9.6, 3, 9.6), mat: lam('#fffdf7'), off: tr(0, 1.5, 0) }], scatter(30 * q + 6, 22, 200, .9, 1.3));
  instanced(scene, [{ geo: new T.CylinderGeometry(.15, .15, 12, 6), mat: lam('#c8ccd8'), off: tr(0, 6, 0) }, { geo: new T.PlaneGeometry(4, 2.4), mat: new T.MeshLambertMaterial({ color: '#ffffff', side: T.DoubleSide }), off: tr(2, 10.6, 0), colors: ['#ff3a8a', '#38e0ff', '#ffe14a', '#7cff6a'] }], scatter(40 * q + 8, 10, 160, 1, 1));
  // feux d'artifice réguliers
  let fw = 0; W.anim.push((dt) => { fw -= dt; if (fw > 0 || !W.parts) return; fw = rand(.8, 1.8); const a = rand(0, TAU), r = rand(ext * .3, ext + 60), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = rand(70, 120), col = pick(['#ff3a8a', '#38e0ff', '#ffe14a', '#7cff6a', '#fffdf7']);
    for (let k = 0; k < 36; k++) { const u = rand(0, TAU), v = rand(-1, 1), s = rand(14, 22); W.parts.emit(x, y, z, Math.cos(u) * Math.sqrt(1 - v * v) * s, v * s, Math.sin(u) * Math.sqrt(1 - v * v) * s, col, 1.2, 0); } });
  const sp = []; for (let k = 0; k < 500; k++) { const a = Math.random() * TAU, e = Math.acos(rand(.1, 1)); sp.push(Math.cos(a) * Math.sin(e) * 1300, Math.cos(e) * 1300, Math.sin(a) * Math.sin(e) * 1300); }
  const sg2 = new T.BufferGeometry(); sg2.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); W.sky.add(new T.Points(sg2, new T.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: .8, depthWrite: false })));
}
// ---------- Circuit Caméléon : le décor et la conduite changent en permanence ----------
const CHAM_PHASES = [{ name: 'Prairie', env: null, ground: null, sky: ['#5aa9ff', '#eaf5ff'], fog: '#dcecff', tint: '#7ac84a' }, { name: 'Banquise', env: 'ice', ground: 'snow', sky: ['#9fc8ff', '#f4fbff'], fog: '#e8f4ff', tint: '#e8f4ff' },
  { name: 'Désert', env: 'sand', ground: 'sand', sky: ['#ffb05a', '#fff0d0'], fog: '#ffe4b8', tint: '#e8c070' }, { name: 'Lune', env: 'space', ground: 'moon', sky: ['#06051a', '#1a1440'], fog: '#0a0820', tint: '#8a8aa0' }];
function planChameleon(W) { if (!W.def.cham) return; const rng = seeded(seedHash(W.def.id + ':cham', RACE_OPTS.seed || 1)); const seq = [0]; for (let k = 1; k < 16; k++) { let v; do v = Math.floor(rng() * 4); while (v === seq[k - 1]); seq.push(v); }
  W.cham = { seq, period: W.def.cham.period || 40, cur: -1, base: W.env, tex: {} };
  if (W.groundMat) { W.cham.tex[''] = W.groundMat.map; for (const ph of CHAM_PHASES) if (ph.ground && !W.cham.tex[ph.ground]) { try { const t = groundTex(ph.ground); t.repeat.set(100, 100); W.cham.tex[ph.ground] = t; } catch (e) { /* texture indisponible */ } } } }
function updateChameleon(W, t, dt) { const C = W.cham; if (!C) return; const k = Math.floor(t / C.period), ph = CHAM_PHASES[C.seq[k % C.seq.length]], nx = CHAM_PHASES[C.seq[(k + 1) % C.seq.length]];
  if (t % C.period > C.period - 4 && C.ann !== k && G.race && G.race.player) { C.ann = k; banner('Le circuit change dans 4 s : ' + nx.name + ' !', 2.4, true); AudioSys.sfx('alarm'); }
  if (C.cur !== k) { C.cur = k; W.env = ph.env ? ENVS[ph.env] : C.base; if (k > 0 && G.race && G.race.player) { banner(ph.name + (ph.env ? ' : ' + ENVS[ph.env].name.toLowerCase() : ''), 1.6); AudioSys.sfx('gate'); } C.tgt = ph; if (W.groundMat) { const t = C.tex[ph.ground || ''] || C.tex['']; if (t && W.groundMat.map !== t) { W.groundMat.map = t; W.groundMat.needsUpdate = true; } } }
  const tg = C.tgt; if (!tg) return; const f = 1 - Math.exp(-dt * 1.2);
  if (W.scene.fog) W.scene.fog.color.lerp(new T.Color(tg.fog), f); if (W.scene.background && W.scene.background.isColor) W.scene.background.lerp(new T.Color(tg.fog), f);
  if (W.chamMat) W.chamMat.color.lerp(new T.Color(tg.tint), f);
  if (W.sky && W.sky.material && W.sky.material.uniforms && W.sky.material.uniforms.top) { const u = W.sky.material.uniforms; u.top.value.lerp(new T.Color(tg.sky[0]), f); u.bottom.value.lerp(new T.Color(tg.sky[1]), f); } }
function freeSpot(W, cx, cz, R) { const S = W.S; let best = -1, out = [cx, cz]; for (let gx = -6; gx <= 6; gx++) for (let gz = -6; gz <= 6; gz++) { const x = cx + gx / 6 * R, z = cz + gz / 6 * R; let md = 1e9; for (let i = 0; i < S.N; i += 6) md = Math.min(md, Math.hypot(S.px[i] - x, S.pz[i] - z)); for (const B of W.branches) for (let j = 0; j < B.N; j += 4) md = Math.min(md, Math.hypot(B.px[j] - x, B.pz[j] - z)); if (md > best) { best = md; out = [x, z]; } } return { x: out[0], z: out[1], d: best }; }
function buildChameleon(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; // quatre quartiers aux décors différents + un grand caméléon de pierre
  const quad = (p, k) => { const a = Math.atan2(p.z - cz, p.x - cx); return ((Math.floor((a + Math.PI) / (Math.PI / 2)) % 4) + 4) % 4 === k; };
  const all = scatter(420 * q + 60, 6, 240, .8, 1.6);
  instanced(scene, [{ geo: decorGeo('ptrunk'), mat: lam('#5b4030'), off: tr(0, 1, 0) }, { geo: decorGeo('pine1'), mat: lam('#ffffff'), off: tr(0, 3.6, 0), colors: ['#eef4ff'] }, { geo: decorGeo('pine2'), mat: lam('#ffffff'), off: tr(0, 5.5, 0), colors: ['#f4f8ff'] }], all.filter((p) => quad(p, 1)));
  instanced(scene, [{ geo: decorGeo('cactus'), mat: lam('#ffffff'), off: tr(0, 0, 0), colors: ['#4a9a4a', '#5aae5a'] }], all.filter((p) => quad(p, 2)));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#8a8aa0', '#b0b0c0'] }], all.filter((p) => quad(p, 3)));
  instanced(scene, [{ geo: decorGeo('trunk'), mat: lam('#6b4a32'), off: tr(0, 1.4, 0) }, { geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, 4, 0), colors: ['#4aae48', '#5abe50', '#3a9a3a'] }], all.filter((p) => quad(p, 0)));
  const g = new T.Group(); const sk = stdMat('#3ab86a', .6, 0); W.chamMat = sk; // caméléon (original, stylisé)
  const body = new T.Mesh(new T.SphereGeometry(30, 24, 16), sk); body.scale.set(1.6, 1, 1); body.position.y = 34; g.add(body);
  const head = new T.Mesh(new T.ConeGeometry(18, 40, 18), sk); head.rotation.z = -Math.PI / 2; head.position.set(62, 40, 0); g.add(head);
  for (const sz of [-1, 1]) { const eye = new T.Mesh(new T.SphereGeometry(7, 16, 12), lam('#fffdf7')); eye.position.set(58, 50, sz * 10); g.add(eye); const pu = new T.Mesh(new T.SphereGeometry(3, 10, 8), lam('#17141a')); pu.position.set(63, 51, sz * 13); g.add(pu); }
  const tail = new T.Mesh(new T.TorusGeometry(18, 6, 12, 32, Math.PI * 1.5), sk); tail.position.set(-56, 24, 0); g.add(tail);
  for (const [lx, lz] of [[30, 18], [30, -18], [-26, 18], [-26, -18]]) { const leg = new T.Mesh(new T.CylinderGeometry(5, 6, 26, 10), sk); leg.position.set(lx, 12, lz); g.add(leg); }
  const fs = freeSpot(W, cx, cz, ext * .8); g.scale.setScalar(clamp((fs.d - 20) / 90, .35, 1)); g.position.set(fs.x, hy(W, fs.x, fs.z), fs.z); g.rotation.y = rand(0, TAU); scene.add(g);
}

/* ================= v11 : nouveaux circuits (coupes) ================= */
const LEVELS11 = {"piquenique": {"pts": [[0, 0, 0], [160, 0, 0], [300, 10, 1], [400, 60, 3], [440, 160, 5], [400, 260, 6], [300, 300, 6], [200, 280, 5], [120, 300, 4], [60, 380, 3], [-40, 400, 2], [-140, 360, 1], [-200, 260, 0], [-200, 140, 0], [-140, 40, 0], [-70, 5, 0]], "width": 28, "tricks": [0.9143], "branches": [{"from": 0.1714, "to": 0.4251, "mid": [[315, 141, 13.5]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.5314, "to": 0.7783, "mid": [[-35, 285, 2]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "fun", "ai": 0.3, "secret": true, "role": "secret"}], "zones": [[0.14, 0.36, "fleurs"], [0.56, 0.8, "foret"]], "items": [0.06, 0.3, 0.566, 0.816], "boosts": [[0.202, 0], [0.462, 0.3], [0.68, -0.3]]}, "coupsoleil": {"pts": [[0, 0, 0], [260, 0, 0], [520, 10, 1], [700, 40, 2], [780, 110, 3], [760, 190, 3], [660, 220, 2], [500, 200, 2], [340, 230, 2], [200, 280, 4], [60, 300, 4], [-60, 260, 2], [-120, 170, 1], [-110, 80, 0], [-60, 20, 0]], "width": 28, "glide": [[0.7561, 0.7911]], "tricks": [0.2483], "branches": [{"from": 0.3362, "to": 0.5568, "mid": [[564, 122, 12]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.8348, "to": 0.9312, "mid": [[-78, 170, 1]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "aqua", "ai": 0.3, "secret": true, "water": true, "role": "secret"}], "zones": [[0.14, 0.36, "foret"], [0.56, 0.8, "desert"]], "items": [0.06, 0.3, 0.59, 0.872], "boosts": [[0.17, 0], [0.43, 0.3], [0.68, -0.3]]}, "pinacolada": {"pts": [[0, 0, 0], [200, 0, 0], [380, 40, 1], [480, 140, 2], [480, 260, 3], [400, 360, 3], [300, 460, 4], [200, 520, 5], [100, 500, 5], [40, 420, 4], [0, 320, 3], [-60, 240, 2], [-120, 160, 1], [-110, 70, 0], [-60, 15, 0]], "width": 28, "glide": [[0.6213, 0.6613]], "branches": [{"from": 0.1121, "to": 0.4383, "mid": [[312, 159, 11.5]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.815, "to": 0.9226, "mid": [[-78, 154, 1]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "aqua", "ai": 0.3, "secret": true, "water": true, "role": "secret"}], "zones": [[0.14, 0.36, "plage"], [0.56, 0.8, "foret"]], "items": [0.06, 0.3, 0.55, 0.848], "boosts": [[0.17, 0], [0.47, 0.3], [0.696, -0.3]]}, "sieste": {"pts": [[0, 0, 0], [180, 0, 0], [340, 30, 2], [440, 120, 5], [420, 240, 8], [320, 300, 9], [260, 400, 9], [300, 520, 7], [200, 600, 5], [60, 580, 4], [-40, 480, 3], [-60, 340, 2], [-140, 240, 1], [-160, 120, 0], [-90, 30, 0]], "width": 28, "glide": [[0.7503, 0.7853]], "tricks": [0.0901], "branches": [{"from": 0.4214, "to": 0.6967, "mid": [[72, 424, 16]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.1722, "to": 0.3033, "mid": [[386, 134, 5]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "fun", "ai": 0.3, "secret": true, "role": "secret"}], "zones": [[0.14, 0.36, "foret"], [0.56, 0.8, "desert"]], "items": [0.06, 0.34, 0.55, 0.816], "boosts": [[0.21, 0], [0.454, 0.3], [0.872, -0.3]]}, "soldes": {"pts": [[0, 0, 0], [160, 0, 0], [260, 0, 0], [330, 40, 0], [350, 120, 4], [350, 200, 8], [320, 270, 8], [240, 290, 8], [160, 260, 8], [120, 190, 8], [60, 150, 8], [-20, 170, 6], [-80, 230, 3], [-160, 250, 0], [-240, 210, 0], [-260, 120, 0], [-220, 40, 0], [-120, 5, 0]], "width": 24, "branches": [{"from": 0.5018, "to": 0.6471, "mid": [[28, 198, 5.5]], "width": 14, "side": -1, "narrow": true, "label": "BOUTIQUE", "tunnel": "fun", "ai": 0.5}, {"from": 0.096, "to": 0.3037, "mid": [[255, 95, 14]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "ville"], [0.56, 0.8, "fleurs"]], "items": [0.06, 0.34, 0.55, 0.8], "boosts": [[0.17, 0], [0.43, 0.3], [0.68, -0.3]]}, "neonafter": {"pts": [[0, 0, 1], [106, 0, 2.7], [163, 61, 5.1], [168, 159, 7.8], [127, 250, 10.6], [54, 291, 13], [-40, 257, 14.8], [-144, 157, 15.8], [-251, 29, 15.9], [-356, -78, 15], [-452, -122, 13.3], [-529, -91, 10.9], [-575, -4, 8.2], [-576, 96, 5.4], [-526, 164, 3], [-427, 172, 1.2], [-290, 125, 0.2], [-140, 53, 0.1]], "width": 24, "tricks": [0.1401], "branches": [{"from": 0.5, "to": 0.6881, "mid": [[-465, -4, 20.2]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.1891, "to": 0.3484, "mid": [[-2, 212, 13.2]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "fun", "ai": 0.3, "secret": true, "role": "secret"}], "zones": [[0.14, 0.36, "foret"], [0.56, 0.8, "plage"]], "items": [0.06, 0.3, 0.55, 0.8], "boosts": [[0.226, 0], [0.43, 0.3], [0.72, -0.3]]}, "safaribouchon": {"pts": [[0, 0, 0], [240, -10, 0], [440, 20, 1], [560, 120, 2], [580, 260, 3], [520, 360, 3], [420, 400, 3], [380, 500, 4], [400, 620, 5], [320, 700, 5], [200, 690, 5], [160, 600, 4], [200, 500, 4], [180, 420, 3], [80, 400, 2], [-40, 420, 1], [-140, 360, 0], [-180, 240, 0], [-150, 110, 0], [-80, 20, 0]], "width": 26, "branches": [{"from": 0.4254, "to": 0.6499, "mid": [[284, 460, 4]], "width": 14, "side": 1, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.7245, "to": 0.9223, "mid": [[-35, 263, 11]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.0942, "to": 0.3391, "mid": [[380, 175, 1.5]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "fun", "ai": 0.3, "secret": true, "role": "secret"}], "zones": [[0.14, 0.36, "desert"], [0.56, 0.8, "foret"]], "items": [0.132, 0.3, 0.55, 0.8], "boosts": [[0.186, 0], [0.462, 0.3], [0.68, -0.3]]}, "barbapapa": {"pts": [[0, 0, 0], [180, 0, 0], [320, 20, 1], [400, 100, 2], [400, 200, 3], [320, 260, 3], [220, 250, 3], [150, 300, 3], [160, 400, 3], [240, 460, 3], [240, 560, 2], [140, 610, 2], [20, 580, 1], [-40, 480, 1], [-100, 380, 0], [-180, 320, 0], [-200, 200, 0], [-150, 90, 0], [-80, 20, 0]], "width": 24, "branches": [{"from": 0.2516, "to": 0.4837, "mid": [[340, 346, 3]], "width": 14, "side": -1, "narrow": true, "label": "CHAPITEAU", "tunnel": "fun", "ai": 0.45}, {"from": 0.753, "to": 0.9152, "mid": [[-125, 235, 10]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "fleurs"], [0.56, 0.8, "ville"]], "items": [0.06, 0.3, 0.55, 0.8], "boosts": [[0.17, 0], [0.43, 0.3], [0.68, -0.3]]}, "glissade": {"pts": [[0, 0, 0], [220, 0, 2], [420, 30, 6], [560, 120, 12], [600, 260, 18], [540, 380, 24], [420, 440, 28], [280, 440, 30], [160, 500, 30], [80, 600, 28], [-60, 640, 24], [-200, 600, 18], [-280, 480, 12], [-300, 340, 6], [-260, 200, 2], [-160, 60, 0], [-80, 10, 0]], "width": 26, "glide": [[0.5477, 0.5877]], "tricks": [0.0881], "warp": [{"type": "wall", "angle": 65, "side": 1, "from": 0.7446, "to": 0.8014}], "branches": [{"from": 0.6861, "to": 0.8607, "mid": [[-230, 400, 10]], "width": 14, "side": 1, "offroad": true, "label": "PISTE NOIRE"}, {"from": 0.1689, "to": 0.4059, "mid": [[427, 229, 27]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "foret"], [0.56, 0.8, "lune"]], "items": [0.06, 0.3, 0.622, 0.824], "boosts": [[0.202, 0], [0.438, 0.3], [0.72, -0.3]]}, "tchintchin": {"pts": [[0, 0, 0], [160, 0, 0], [260, 0, 0], [300, 15, 0], [340, 32, 0], [380, 40, 0], [520, 40, 0], [640, 100, 2], [680, 220, 4], [620, 330, 4], [480, 370, 3], [320, 360, 2], [200, 420, 2], [60, 440, 2], [-80, 380, 1], [-140, 260, 0], [-130, 120, 0], [-70, 30, 0]], "width": 26, "glide": [[0.6216, 0.6616]], "warp": [{"type": "loop", "r": 17, "from": 0.1223, "to": 0.1825}], "branches": [{"from": 0.3123, "to": 0.5033, "mid": [[584, 232, 2.5]], "width": 14, "side": 1, "narrow": true, "label": "GROTTE", "tunnel": "fun", "ai": 0.5}, {"from": 0.7093, "to": 0.9125, "mid": [[-35, 280, 11]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "plage"], [0.56, 0.8, "volcan"]], "items": [0.06, 0.348, 0.55, 0.8], "boosts": [[0.21, 0], [0.43, 0.3], [0.744, -0.3]]}, "grandsaut": {"pts": [[0, 0, 1.2], [142, 0, 3.1], [229, 66, 5.7], [254, 178, 8.7], [222, 297, 11.8], [143, 377, 14.8], [32, 384, 17.3], [-99, 309, 19], [-240, 170, 19.9], [-384, 11, 19.8], [-524, -118, 18.8], [-652, -180, 16.9], [-758, -158, 14.3], [-830, -67, 11.3], [-852, 54, 8.2], [-815, 161, 5.2], [-718, 215, 2.7], [-567, 203, 1], [-380, 139, 0.1], [-182, 57, 0.2]], "width": 26, "glide": [[0.1864, 0.2264], [0.6864, 0.7264]], "tricks": [0.435], "branches": [{"from": 0.0487, "to": 0.1671, "mid": [[191, 132, 7.5]], "width": 14, "side": 1, "narrow": true, "label": "CORNICHE", "ai": 0.5}, {"from": 0.5, "to": 0.6671, "mid": [[-688, -32, 23.5]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "desert"], [0.56, 0.8, "foret"]], "items": [0.084, 0.3, 0.55, 0.8], "boosts": [[0.354, 0], [0.462, 0.3], [0.856, -0.3]]}, "gravitezero": {"pts": [[0, 0, 0], [140, 0, 0], [240, 0, 0], [280, 15, 0], [320, 32, 0], [360, 40, 0], [520, 40, 0], [640, 100, 0], [680, 220, 0], [620, 330, 0], [520, 360, 0], [420, 360, 0], [380, 345, 0], [340, 328, 0], [300, 320, 0], [160, 320, 0], [20, 300, 0], [-80, 240, 0], [-120, 140, 0], [-80, 40, 0]], "width": 24, "warp": [{"type": "loop", "r": 17, "from": 0.1222, "to": 0.1874}, {"type": "loop", "r": 17, "from": 0.5743, "to": 0.6385}], "branches": [{"from": 0.7098, "to": 0.8982, "mid": [[20, 230, 0]], "width": 14, "side": 1, "narrow": true, "label": "SAS", "tunnel": "fun", "ai": 0.5}, {"from": 0.2688, "to": 0.5224, "mid": [[544, 180, 10]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "lune"], [0.56, 0.8, "volcan"]], "items": [0.06, 0.3, 0.662, 0.8], "boosts": [[0.21, 0], [0.43, 0.3], [0.744, -0.3]]}, "barbecue": {"pts": [[0, 0, 0], [160, 0, 0], [240, 30, 1], [260, 90, 2], [200, 130, 3], [80, 120, 4], [20, 160, 5], [40, 220, 6], [160, 240, 7], [280, 250, 8], [340, 300, 9], [320, 370, 10], [200, 380, 11], [80, 390, 12], [0, 440, 12], [-40, 520, 11], [-140, 540, 9], [-220, 480, 7], [-240, 380, 5], [-220, 260, 3], [-200, 150, 1], [-150, 60, 0], [-80, 10, 0]], "width": 21, "glide": [[0.6752, 0.7052]], "edges": [[0.2216, 0.2827, 0], [0.5105, 0.6047, 1]], "branches": [{"from": 0.0698, "to": 0.1693, "mid": [[210, 48, 1.5]], "width": 14, "side": 1, "narrow": true, "label": "PONT DE LAVE", "ai": 0.5}, {"from": 0.3368, "to": 0.4572, "mid": [[246, 297, 18.5]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "desert"], [0.56, 0.8, "lune"]], "items": [0.1, 0.3, 0.55, 0.8], "boosts": [[0.202, 0], [0.494, 0.3], [0.736, -0.3]]}, "flipper": {"pts": [[0, 0, 0], [200, 0, 0], [300, 20, 0], [340, 100, 0], [330, 220, 0], [280, 300, 0], [200, 320, 0], [150, 270, 0], [160, 200, 0], [110, 150, 0], [40, 170, 0], [20, 250, 0], [60, 330, 0], [60, 420, 0], [0, 500, 0], [-100, 520, 0], [-180, 460, 0], [-200, 360, 0], [-170, 260, 0], [-190, 160, 0], [-160, 70, 0], [-90, 15, 0]], "width": 22, "tricks": [0.0929, 0.6794], "branches": [{"from": 0.184, "to": 0.3234, "mid": [[273, 211, 0]], "width": 14, "side": 1, "narrow": true, "label": "RAMPE", "ai": 0.5}, {"from": 0.3913, "to": 0.5409, "mid": [[110, 265, 10]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "ville"], [0.56, 0.8, "lune"]], "items": [0.06, 0.356, 0.574, 0.8], "boosts": [[0.218, 0], [0.43, 0.3], [0.704, -0.3]]}, "bellemere": {"pts": [[0, 0, 0], [120, 0, 0], [180, 40, 1], [240, 20, 2], [300, 60, 3], [300, 140, 4], [240, 180, 5], [260, 250, 6], [330, 290, 6], [340, 380, 5], [280, 440, 4], [180, 430, 3], [120, 480, 2], [130, 570, 2], [60, 630, 1], [-40, 600, 1], [-80, 520, 0], [-60, 430, 0], [-120, 360, 0], [-200, 330, 0], [-230, 240, 0], [-190, 150, 0], [-200, 70, 0], [-130, 15, 0]], "width": 20, "edges": [[0.4645, 0.5512, 0], [0.8135, 0.8975, 1]], "branches": [{"from": 0.6427, "to": 0.7692, "mid": [[-128, 426, 0]], "width": 14, "side": -1, "narrow": true, "label": "PASSAGE SECRET", "tunnel": "fun", "ai": 0.5}, {"from": 0.2595, "to": 0.4275, "mid": [[280, 360, 14.5]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.0896, "to": 0.1911, "mid": [[240, 66, 2.5]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "fun", "ai": 0.3, "secret": true, "role": "secret"}], "zones": [[0.14, 0.36, "foret"], [0.56, 0.8, "neige"]], "items": [0.124, 0.3, 0.55, 0.8], "boosts": [[0.354, 0], [0.462, 0.3], [0.68, -0.3]]}, "ruban": {"pts": [[0, 0, 10], [300, 0, 12], [600, 60, 16], [840, 210, 22], [930, 450, 28], [840, 690, 34], [630, 780, 38], [390, 750, 40], [180, 840, 42], [90, 1050, 44], [210, 1260, 46], [480, 1320, 46], [750, 1260, 44], [990, 1320, 42], [1170, 1500, 40], [1140, 1740, 36], [930, 1860, 32], [660, 1830, 28], [420, 1890, 24], [180, 1860, 20], [-30, 1740, 18], [-180, 1530, 16], [-300, 1290, 14], [-390, 1020, 12], [-450, 750, 12], [-420, 480, 12], [-330, 240, 10], [-180, 60, 10]], "width": 22, "glide": [[0.286, 0.302], [0.7816, 0.7976]], "edges": [[0.0415, 0.9734, 0]], "warp": [{"type": "wall", "angle": 60, "side": 1, "from": 0.1597, "to": 0.196}, {"type": "wall", "angle": 60, "side": 1, "from": 0.5086, "to": 0.5429}], "branches": [{"from": 0.3264, "to": 0.438, "mid": [[420, 1155, 54]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.6149, "to": 0.7525, "mid": [[240, 1680, 22]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "fun", "ai": 0.3, "secret": true, "role": "secret"}, {"from": 0.8292, "to": 0.9408, "mid": [[-342, 606, 25]], "width": 14, "side": 1, "narrow": true, "label": "ROUTE DU HAUT", "ai": 0.5, "role": "haut"}], "zones": [[0.14, 0.36, "neige"], [0.56, 0.8, "desert"]], "items": [0.06, 0.364, 0.566, 0.864], "boosts": [[0.218, 0], [0.47, 0.3], [0.68, -0.3]]}, "tonton": {"pts": [[0, 0, 0], [300, 0, 0], [600, 0, 0], [800, 60, 0], [900, 200, 2], [880, 380, 6], [760, 480, 10], [600, 500, 14], [440, 460, 18], [320, 520, 20], [260, 660, 20], [320, 800, 18], [500, 860, 14], [700, 840, 10], [860, 900, 6], [900, 1060, 3], [780, 1160, 0], [560, 1160, 0], [340, 1100, 0], [160, 1140, 0], [0, 1060, 0], [-100, 900, 0], [-60, 720, 0], [-160, 560, 0], [-220, 380, 0], [-180, 200, 0], [-100, 60, 0]], "width": 26, "glide": [[0.374, 0.399]], "tunnels": [[0.7572, 0.7952]], "tricks": [0.1188, 0.8697], "branches": [{"from": 0.4954, "to": 0.6392, "mid": [[745, 950, 5]], "width": 14, "side": 1, "narrow": true, "label": "CHATIÈRE", "tunnel": "fun", "ai": 0.5}, {"from": 0.1608, "to": 0.2958, "mid": [[700, 280, 17]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "fleurs"], [0.56, 0.8, "plage"]], "items": [0.06, 0.332, 0.55, 0.808], "boosts": [[0.194, 0], [0.43, 0.3], [0.68, -0.3]]}, "trainfou": {"pts": [[0, 0, 1.5], [203, 0, 3.2], [348, 67, 5.3], [426, 192, 7.9], [437, 351, 10.8], [389, 512, 13.6], [291, 636, 16.4], [155, 692, 19], [-5, 663, 21.1], [-182, 547, 22.7], [-366, 362, 23.7], [-553, 141, 24], [-741, -78, 23.6], [-924, -255, 22.5], [-1099, -360, 20.8], [-1257, -377, 18.7], [-1388, -309, 16.1], [-1480, -178, 13.2], [-1521, -16, 10.4], [-1500, 141, 7.6], [-1413, 259, 5], [-1260, 316, 2.9], [-1049, 308, 1.3], [-796, 244, 0.3], [-521, 149, 0], [-248, 58, 0.4]], "width": 26, "glide": [[0.6787, 0.7037]], "tunnels": [[0.098, 0.1609]], "tricks": [0.4514], "branches": [{"from": 0.4998, "to": 0.6287, "mid": [[-1202, -216, 17.9]], "width": 14, "side": -1, "offroad": true, "label": "HORS-PISTE"}, {"from": 0.191, "to": 0.3412, "mid": [[-47, 489, 30]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "neige"], [0.56, 0.8, "foret"]], "items": [0.06, 0.3, 0.55, 0.8], "boosts": [[0.226, 0], [0.734, 0.3], [0.856, -0.3]]}, "croisiere": {"pts": [[0, 0, 0], [416, 0, 0], [832, 26, 0], [1170, 130, 1], [1378, 338, 2], [1404, 624, 4], [1248, 832, 6], [988, 884, 8], [728, 806, 10], [520, 884, 12], [442, 1092, 14], [546, 1300, 14], [780, 1404, 12], [1040, 1456, 6], [1274, 1586, 3], [1300, 1820, 1], [1118, 1976, 0], [806, 2002, 0], [520, 1924, 0], [234, 1950, 0], [-26, 1846, 0], [-182, 1612, 0], [-208, 1300, 0], [-312, 1014, 0], [-364, 702, 0], [-312, 390, 0], [-208, 130, 0], [-104, 26, 0]], "width": 26, "glide": [[0.7586, 0.7836]], "tricks": [0.19], "branches": [{"from": 0.4862, "to": 0.6235, "mid": [[1099, 1658, 3]], "width": 14, "side": 1, "narrow": true, "label": "CABINES", "tunnel": "fun", "ai": 0.5}, {"from": 0.2959, "to": 0.4192, "mid": [[748, 949, 21]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.8113, "to": 0.967, "mid": [[-208, 715, 0]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "aqua", "ai": 0.3, "secret": true, "water": true, "role": "secret"}], "zones": [[0.14, 0.36, "plage"], [0.56, 0.8, "ville"]], "items": [0.06, 0.332, 0.55, 0.848], "boosts": [[0.218, 0], [0.654, 0.3], [0.704, -0.3]]}, "festival": {"pts": [[0, 0, 0], [300, 0, 0], [600, -40, 0], [880, 0, 1], [1080, 140, 2], [1140, 360, 3], [1060, 560, 4], [880, 640, 5], [700, 600, 6], [560, 480, 8], [440, 500, 10], [400, 640, 12], [480, 800, 12], [660, 900, 10], [820, 1000, 8], [860, 1180, 6], [760, 1340, 4], [560, 1400, 2], [340, 1360, 1], [160, 1260, 0], [60, 1100, 0], [-100, 1000, 0], [-260, 1060, 0], [-400, 980, 0], [-420, 780, 0], [-300, 600, 0], [-280, 400, 0], [-240, 200, 0], [-140, 50, 0]], "width": 26, "glide": [[0.7937, 0.8137]], "tricks": [0.2307, 0.7142], "branches": [{"from": 0.4767, "to": 0.6091, "mid": [[610, 1150, 6]], "width": 14, "side": 1, "offroad": true, "label": "FOSSE"}, {"from": 0.3331, "to": 0.4111, "mid": [[550, 620, 19]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "desert"], [0.56, 0.8, "foret"]], "items": [0.06, 0.364, 0.55, 0.848], "boosts": [[0.17, 0], [0.646, 0.3], [0.736, -0.3]]}, "cameleon": {"pts": [[0, 0, 0], [300, 0, 0], [580, 40, 1], [780, 160, 2], [860, 360, 3], [820, 560, 4], [680, 700, 5], [500, 740, 6], [340, 700, 7], [200, 760, 8], [140, 920, 8], [220, 1080, 7], [400, 1140, 6], [600, 1100, 5], [780, 1160, 4], [880, 1320, 3], [820, 1500, 2], [640, 1580, 1], [420, 1560, 0], [200, 1600, 0], [0, 1520, 0], [-120, 1340, 0], [-140, 1100, 0], [-220, 880, 0], [-260, 640, 0], [-240, 400, 0], [-180, 180, 0], [-90, 40, 0]], "width": 26, "tricks": [0.3353], "branches": [{"from": 0.1407, "to": 0.2481, "mid": [[730, 430, 3.5]], "width": 14, "side": 1, "narrow": true, "label": "ROUTE B", "ai": 0.5}, {"from": 0.5309, "to": 0.6366, "mid": [[616, 1428, 1.5]], "width": 14, "side": 1, "narrow": true, "label": "ROUTE B", "ai": 0.5}], "gates": [{"branch": 0, "period": 30, "mode": "alt"}, {"branch": 1, "period": 36, "mode": "alt"}], "items": [0.06, 0.3, 0.566, 0.8], "boosts": [[0.178, 0], [0.43, 0.3], [0.68, -0.3]]}, "plongeon": {"pts": [[0, 0, 0], [260, 0, 0], [480, 30, 1], [620, 120, 2], [680, 260, 3], [640, 400, 4], [520, 480, 5], [380, 500, 6], [240, 560, 6], [160, 680, 5], [200, 800, 4], [340, 860, 3], [480, 900, 2], [560, 1000, 1], [500, 1110, 0], [360, 1150, 0], [200, 1110, 0], [60, 1020, 0], [-60, 900, 0], [-140, 760, 0], [-180, 600, 0], [-160, 420, 0], [-180, 260, 0], [-140, 110, 0], [-70, 20, 0]], "width": 26, "glide": [[0.4906, 0.5206]], "tricks": [0.3185], "warp": [{"type": "spiral", "from": 0.781, "to": 0.8703}], "branches": [{"from": 0.4287, "to": 0.5728, "mid": [[324, 966, 2]], "width": 14, "side": 1, "narrow": true, "label": "SOUS L'EAU", "tunnel": "aqua", "ai": 0.5, "water": true, "role": "eau"}, {"from": 0.1241, "to": 0.2821, "mid": [[506, 248, 13]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "plage"], [0.56, 0.8, "foret"]], "items": [0.06, 0.34, 0.606, 0.896], "boosts": [[0.17, 0], [0.662, 0.3], [0.712, -0.3]]}, "tirebouchon": {"pts": [[0, 0, 0], [220, 0, 0], [440, 0, 0], [600, 60, 0], [680, 180, 0], [660, 320, 0], [560, 400, 0], [420, 400, 0], [300, 460, 0], [260, 580, 0], [320, 700, 0], [460, 740, 0], [600, 760, 0], [700, 860, 0], [680, 1000, 0], [560, 1080, 0], [400, 1060, 0], [240, 1080, 0], [100, 1020, 0], [0, 900, 0], [-60, 740, 0], [-60, 560, 0], [-120, 400, 0], [-140, 240, 0], [-110, 100, 0], [-60, 20, 0]], "width": 24, "glide": [[0.6128, 0.6428]], "warp": [{"type": "spiral", "from": 0.112, "to": 0.1935}, {"type": "spiral", "side": -1, "from": 0.7923, "to": 0.8814}], "branches": [{"from": 0.2994, "to": 0.4394, "mid": [[433, 565, 10]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}, {"from": 0.5122, "to": 0.5866, "mid": [[630, 970, 0]], "width": 14, "side": 1, "narrow": true, "label": "RACCOURCI", "tunnel": "fun", "ai": 0.3, "secret": true, "role": "secret"}], "zones": [[0.14, 0.36, "ville"], [0.56, 0.8, "lune"]], "items": [0.06, 0.332, 0.55, 0.904], "boosts": [[0.218, 0], [0.47, 0.3], [0.68, -0.3]]}, "cascade": {"pts": [[0, 0, 0], [200, 0, 2], [380, 40, 6], [500, 140, 10], [540, 280, 14], [480, 400, 18], [360, 440, 20], [240, 420, 20], [120, 460, 18], [60, 580, 15], [100, 700, 12], [220, 760, 9], [360, 780, 7], [480, 840, 5], [520, 960, 3], [440, 1060, 2], [300, 1090, 1], [160, 1040, 0], [40, 960, 0], [-60, 840, 0], [-100, 680, 0], [-140, 520, 0], [-160, 360, 0], [-140, 200, 0], [-80, 60, 0]], "width": 24, "glide": [[0.2096, 0.2446]], "tricks": [0.6689], "warp": [{"type": "wall", "angle": 65, "side": -1, "from": 0.5167, "to": 0.5884}], "branches": [{"from": 0.1894, "to": 0.2956, "mid": [[372, 340, 17]], "width": 14, "side": 1, "narrow": true, "label": "DERRIÈRE LA CASCADE", "tunnel": "aqua", "ai": 0.5, "water": true, "role": "eau"}, {"from": 0.3684, "to": 0.4795, "mid": [[210, 680, 21]], "width": 13, "side": -1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "zones": [[0.14, 0.36, "foret"], [0.56, 0.8, "neige"]], "items": [0.06, 0.332, 0.614, 0.8], "boosts": [[0.402, 0], [0.694, 0.3], [0.744, -0.3]]}, "deuxroutes": {"pts": [[0, 0, 0], [240, 0, 0], [480, -20, 1], [700, 20, 2], [860, 140, 3], [900, 320, 4], [820, 480, 5], [660, 540, 6], [500, 520, 6], [360, 580, 5], [300, 720, 4], [360, 860, 3], [520, 920, 2], [700, 940, 1], [840, 1020, 1], [860, 1180, 0], [740, 1300, 0], [540, 1320, 0], [340, 1280, 0], [160, 1300, 0], [0, 1220, 0], [-100, 1060, 0], [-120, 860, 0], [-180, 660, 0], [-200, 460, 0], [-160, 260, 0], [-100, 80, 0]], "width": 26, "glide": [[0.649, 0.679]], "warp": [{"type": "spiral", "from": 0.8141, "to": 0.8956}], "branches": [{"from": 0.1402, "to": 0.2542, "mid": [[740, 272, 3.5]], "width": 14, "side": 1, "narrow": true, "label": "ROUTE A", "ai": 0.5}, {"from": 0.3515, "to": 0.4476, "mid": [[468, 756, 3.5]], "width": 14, "side": -1, "narrow": true, "label": "ROUTE B", "ai": 0.5}, {"from": 0.5159, "to": 0.6235, "mid": [[707, 1171, 10.5]], "width": 13, "side": 1, "narrow": true, "label": "RISQUÉ", "ai": 0.35, "open": true, "role": "risque"}], "gates": [{"branch": 0, "period": 28, "mode": "alt"}, {"branch": 1, "period": 34, "mode": "alt"}], "zones": [[0.14, 0.36, "foret"], [0.56, 0.8, "desert"]], "items": [0.06, 0.3, 0.55, 0.92], "boosts": [[0.178, 0], [0.478, 0.3], [0.712, -0.3]]}};
const NEW_TRACKS = [
  // id, base (thème repris), nom, coupe, niveau, tours, description, surcharges
  ['piquenique', 'prairie', 'Prairie des Pique-Niqueurs', 1, 1, 3, 'Grandes courbes douces entre les nappes à carreaux et les moutons : parfait pour apprendre à drifter.', { obstZones: 2 }],
  ['coupsoleil', 'plage', 'Plage du Coup de Soleil', 1, 1, 3, 'Une longue plage au coucher du soleil, un tremplin à figures et un petit envol au-dessus de la crique.', { obstZones: 2 }],
  ['pinacolada', 'lagon', 'Lagon Pina Colada', 1, 1, 3, 'Tour du lagon turquoise : cabanes sur pilotis, palmiers et un envol au-dessus de la baie.', { obstZones: 2 }],
  ['sieste', 'lavande', 'Champs de la Sieste', 1, 1, 3, 'On roule tranquille entre lavande et tournesols, avec un saut au-dessus de la rivière. Zzz.', { obstZones: 2 }],
  ['soldes', null, 'Centre Commercial des Soldes', 2, 2, 3, 'Galeries, escalators entre les étages, chariots fous et un passage secret à travers une boutique.', { obst: { pillar: 'cones', car: 'cart', kinds: ['traffic', 'pillars', 'traffic'] }, obstZones: 3 }],
  ['neonafter', 'neon', 'Ville Néon After', 2, 2, 3, 'La ville la nuit en huit : un pont au-dessus du carrefour, des taxis et des bus partout.', { obst: { pillar: 'cones', crush: 'piston', car: 'car', kinds: ['traffic', 'crushers', 'traffic'] }, obstZones: 3 }],
  ['safaribouchon', 'safari', 'Safari Embouteillé', 2, 2, 2, 'Les zèbres traversent, les jeeps klaxonnent, et un raccourci hors-piste coupe la grande boucle.', { obst: { pillar: 'termite', walk: 'zebra', car: 'car', kinds: ['walkers', 'traffic', 'walkers'] }, obstZones: 3 }],
  ['barbapapa', 'fete', 'Fête Foraine Barbe-à-Papa', 2, 2, 2, 'Autos tamponneuses géantes, ballons qui roulent et un raccourci sous le chapiteau.', { obst: { pillar: 'balloons', roll: 'beachball', kinds: ['bumpers', 'rollers', 'bumpers'] }, obstZones: 3 }],
  ['glissade', 'givre', 'Pic de la Glissade', 3, 3, 3, 'Montée en lacets sur la neige, un virage relevé à flanc de falaise, une piste noire hors-piste et un grand envol vers la vallée.', { obst: { kinds: ['rollers', 'walkers', 'rollers'] }, obstZones: 3 }],
  ['tchintchin', 'recif', 'Récif Tchin-Tchin', 3, 3, 3, 'Sous la mer : une boucle complète la tête en bas sous une arche de corail, une grotte secrète et des geysers de bulles.', { obst: { jet: 'steam', kinds: ['jets', 'walkers', 'rollers'] }, obstZones: 3 }],
  ['grandsaut', 'canyon', 'Canyon du Grand Saut', 3, 3, 2, 'Un huit géant : un pont au-dessus de ta propre route, deux envols, des rochers qui dévalent et une corniche à flanc de falaise.', { obst: { ball: 'lava', kinds: ['balls', 'pillars', 'rollers'] }, obstZones: 3 }],
  ['gravitezero', 'espace', 'Anneau Gravité Zéro', 3, 3, 3, 'Deux loopings complets, un mur vertical et un sas secret : ici, le haut et le bas, c\'est relatif.', { obst: { pillar: 'crystal', walk: 'rover', roll: 'boulder', kinds: ['bumpers', 'walkers', 'pillars'] }, obstZones: 3 }],
  ['barbecue', 'volcan', 'Forteresse du Barbecue Infernal', 4, 4, 3, 'Remparts, tours de braise et barbecues géants. Gare aux jets de flammes et aux bords sans barrière au-dessus de la lave !', { fortress: true, themeX: { lava: true }, obst: { jet: 'lava', ball: 'lava', kinds: ['jets', 'crushers', 'balls', 'jets'] }, obstZones: 4 }],
  ['flipper', 'pinball', 'Flipper Extra-Bille', 4, 4, 3, 'Dans un flipper géant : bumpers qui te renvoient, billes d\'acier qui dévalent la piste, deux tremplins et une rampe.', { musicStyle: 'house', obst: { pillar: 'crystal', roll: 'gumball', ball: 'metal', kinds: ['bumpers', 'balls', 'bumpers', 'rollers'] }, obstZones: 4 }],
  ['bellemere', 'chateau', 'Manoir de la Belle-Mère', 4, 4, 3, 'Un manoir qui grince : virages serrés, douves sans barrière, fantômes et un passage secret derrière la bibliothèque.', { obstZones: 4 }],
  ['ruban', 'ciel', 'Ruban Céleste du Dernier Verre', 4, 4, 1, 'Une seule grande course en trois sections sur un ruban suspendu sans barrières, deux virages relevés et deux envols au-dessus des nuages.', { sections: true, themeX: { roadStyle: 'ribbon', curb: ['#ffd25a', '#fff4fa'], sky: ['#ff9ad5', '#ffe9d0'], fog: '#ffdcea' }, obst: { kinds: ['pillars', 'crushers', 'pillars'] }, obstZones: 4 }],
  ['tonton', 'house', 'Boum chez Tonton', 5, 4, 2, 'XXL : la fête dans une maison géante. On roule sur un tapis rouge entre le canapé, la table basse et les bouteilles, on monte à l\'étage, on plane au-dessus du salon et on passe par la chatière.', { musicStyle: 'funk', obst: { pillar: 'cones', roll: 'beachball', walk: 'sheep', kinds: ['rollers', 'bumpers', 'pillars', 'rollers'] }, obstZones: 4 }],
  ['trainfou', 'col', 'Train Fou', 5, 4, 2, 'XXL : un huit géant dans la montagne, le long d\'une voie ferrée où le train ne s\'arrête jamais. Tunnel, pont, envol et hors-piste.', { railway: true, musicStyle: 'rock', obst: { car: 'car', kinds: ['traffic', 'rollers', 'pillars'] }, obstZones: 4 }],
  ['croisiere', 'lagon', 'Croisière Karaoké', 5, 4, 1, 'XXL : une seule grande course en trois sections autour d\'un paquebot où tout le monde chante. Passage secret par les cabines et envol au-dessus de la baie.', { sections: true, cruise: true, musicStyle: 'latin', obst: { jet: 'steam', kinds: ['jets', 'walkers', 'bumpers', 'rollers'] }, obstZones: 5 }],
  ['festival', 'festival', 'Festival Boum-Boum', 5, 4, 2, 'XXL : de nuit entre les scènes, les projecteurs et la foule. Feux d\'artifice, flammes de la scène, enceintes-bumpers et un raccourci par la fosse.', { musicStyle: 'house', obst: { jet: 'lava', pillar: 'cones', kinds: ['jets', 'bumpers', 'jets', 'pillars'] }, obstZones: 5 }],
  ['cameleon', 'prairie', 'Circuit Caméléon', 5, 4, 2, 'XXL : le circuit change tout le temps. Toutes les 40 s, la piste devient banquise, désert ou lune, la météo tourne et deux routes s\'ouvrent et se ferment à tour de rôle. Tout est annoncé avant, et il y a toujours un chemin ouvert.', { cham: { period: 40 }, themeX: { decor: 'cameleon' }, musicStyle: 'pop', obst: { kinds: ['pillars', 'rollers', 'walkers', 'bumpers'] }, obstZones: 4 }],
  ['plongeon', 'lagon', 'Grand Plongeon', 6, 3, 3, 'Deux façons de traverser la baie : planer au-dessus de l\'eau ou plonger dans le tunnel sous-marin. Un tire-bouchon à la sortie !', { musicStyle: 'latin', obstZones: 3 }],
  ['tirebouchon', 'neon', 'Tire-Bouchon Express', 6, 4, 3, 'La ville la nuit avec deux tire-bouchons où l\'on roule la tête en bas, un envol et un raccourci risqué sans rebords.', { musicStyle: 'house', obst: { pillar: 'cones', crush: 'piston', car: 'car', kinds: ['traffic', 'crushers', 'pillars'] }, obstZones: 3 }],
  ['cascade', 'jungle', 'Cascades du Vertige', 6, 3, 3, 'Planer du haut de la cascade ou passer derrière le rideau d\'eau, puis un virage relevé dans la jungle.', { musicStyle: 'latin', obstZones: 3 }],
  ['deuxroutes', 'automne', 'Carrefour des Copains', 6, 4, 2, 'Deux grandes routes qui s\'ouvrent et se ferment à tour de rôle (c\'est annoncé), un tire-bouchon, un envol et un raccourci risqué.', { musicStyle: 'pop', obstZones: 4 }],
];
const MALL_THEME = { sky: ['#bfe2ff', '#fff4e6'], fog: '#f6efe6', fogN: 220, fogF: 1100, ground: 'mall', road: '#3a3a4a', curb: ['#ff4f7a', '#fffdf7'], barrier: ['#2ec4c0', '#fffdf7'], skirt: '#c8c0b8', hemi: ['#fffaf2', '#c8bcae', 1.9], sun: '#fff6e8', sunI: 2.4, decor: 'mall', night: false,
  music: { bpm: 122, root: 57, prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]] } };
(function installNewTracks() {
  const old = new Map(TRACKS.map((t) => [t.id, t])); const keep = [];
  const made = [];
  for (const [id, base, name, cup, level, laps, desc, extra] of NEW_TRACKS) {
    const L = LEVELS11[id]; if (!L) continue; const B = base && old.has(base) ? old.get(base) : null;
    const NT = { pinball: PINBALL_THEME, house: HOUSE_THEME, festival: FEST_THEME }; const t = { id, name, desc, cup, level, laps, width: L.width, glideH: (B && B.glideH) || 9, theme: B ? Object.assign({}, B.theme) : Object.assign({}, NT[base] || MALL_THEME) };
    if (B) { for (const k of ['grip', 'hop', 'hopLabel']) if (B[k] != null) t[k] = B[k]; }
    Object.assign(t, { pts: L.pts, boosts: L.boosts, items: L.items, branches: L.branches || [] });
    for (const k of ['glide', 'tunnels', 'tricks', 'edges', 'warp', 'gates', 'sections', 'weather', 'zones']) if (L[k]) t[k] = L[k];
    Object.assign(t, extra || {}); if (t.themeX) Object.assign(t.theme, t.themeX); made.push(t);
  }
  const classics = keep.map((id) => old.get(id)).filter(Boolean).map((t) => Object.assign(t, { cup: 9 }));
  TRACKS.length = 0; TRACKS.push(...made, ...classics.filter((t) => !made.some((m) => m.id === t.id)));
})();


/* ================= Rendu ================= */
const canvas = $('#gl');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
const camera = new T.PerspectiveCamera(70, 1, .3, 1900);
const QUALITY = { high: { pr: 2, decor: 1.15, shadows: true }, medium: { pr: 1.5, decor: .8, shadows: false }, low: { pr: 1, decor: .45, shadows: false } };
function qual() { return QUALITY[SAVE.quality] || QUALITY.high; }
renderer.shadowMap.type = T.PCFSoftShadowMap;
function applyQuality() {
  const Q = qual(); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
  if (renderer.shadowMap.enabled !== Q.shadows) { renderer.shadowMap.enabled = Q.shadows; if (typeof matCache !== 'undefined') for (const m of matCache.values()) m.needsUpdate = true; }
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); checkRotate();
}
window.addEventListener('resize', resize);
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
/* ================= v11 : graphismes (relief des surfaces en Moyen/Haut) ================= */
const GFX_N = {};
function normalTex(kind) { if (GFX_N[kind]) return GFX_N[kind];
  const n1 = tileNoise(kind === 'road' ? 96 : 48, kind === 'road' ? 101 : 202), n2 = tileNoise(24, 303), sz = 256, e = 1 / sz, k = kind === 'road' ? .55 : 1.1;
  const H = (u, v) => kind === 'road' ? n1(u, v) * .65 + n2(u, v) * .35 : n1(u, v) * .7 + n2(u, v) * .3;
  const c = document.createElement('canvas'); c.width = c.height = sz; const x = c.getContext('2d'), img = x.createImageData(sz, sz);
  for (let j = 0; j < sz; j++) for (let i = 0; i < sz; i++) { const u = i / sz, v = j / sz, dx = (H(u + e, v) - H(u - e, v)) * k * sz / 64, dy = (H(u, v + e) - H(u, v - e)) * k * sz / 64; const L = Math.hypot(dx, dy, 1), o = (j * sz + i) * 4;
    img.data[o] = (-dx / L * .5 + .5) * 255; img.data[o + 1] = (-dy / L * .5 + .5) * 255; img.data[o + 2] = (1 / L * .5 + .5) * 255; img.data[o + 3] = 255; }
  x.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, MAX_ANISO); GFX_N[kind] = t; if (typeof SHARED !== 'undefined') SHARED.add(t); return t; }
function gfxDetail(mat, kind) { if (!mat || qual().decor < .8) return mat; let t = normalTex(kind);
  if (mat.map && (mat.map.repeat.x !== 1 || mat.map.repeat.y !== 1)) { t = t.clone(); t.needsUpdate = true; t.repeat.copy(mat.map.repeat); if (typeof SHARED !== 'undefined') SHARED.add(t); }
  mat.normalMap = t; const s = kind === 'road' ? .35 : .28; mat.normalScale = new T.Vector2(s, s); mat.needsUpdate = true; return mat; }


function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); draw(x, w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  t.anisotropy = Math.min(8, MAX_ANISO); return t;
}
function speckle(x, w, h, n, colors, size, alpha = .3) {
  for (let i = 0; i < n; i++) { x.globalAlpha = alpha * (.4 + Math.random() * .8); x.fillStyle = colors[i % colors.length]; const s = size * (.5 + Math.random()); x.fillRect(Math.random() * w, Math.random() * h, s, s); }
  x.globalAlpha = 1;
}
function blobs(x, w, h, n, colors, r) {
  for (let i = 0; i < n; i++) { x.globalAlpha = .35 + Math.random() * .4; x.fillStyle = colors[i % colors.length]; x.beginPath();
    const cx = Math.random() * w, cy = Math.random() * h, rr = r * (.4 + Math.random());
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { x.moveTo(cx + ox + rr, cy + oy); x.arc(cx + ox, cy + oy, rr, 0, TAU); }
    x.fill(); }
  x.globalAlpha = 1;
}
/* ---- bruit procédural tuilable ---- */
function tileNoise(period, seed) {
  let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = new Float32Array(period * period); for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (u, v) => {
    const x = u * period, y = v * period, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period, x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const a = g[y0 * period + x0], b = g[y0 * period + x1], c = g[y1 * period + x0], d = g[y1 * period + x1];
    const top = a + (b - a) * sx, bot = c + (d - c) * sx; return top + (bot - top) * sy;
  };
}
function fbm(base, oct, seed) { const ns = []; for (let o = 0; o < oct; o++) ns.push(tileNoise(base << o, seed + o * 101)); return (u, v) => { let s = 0, a = .5, t = 0; for (const n of ns) { s += n(u, v) * a; t += a; a *= .5; } return s / t; }; }
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mulc = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
function pixelTex(w, h, fn, post, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const img = x.createImageData(w, h), d = img.data; let i = 0;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const col = fn(px / w, py / h); d[i++] = col[0]; d[i++] = col[1]; d[i++] = col[2]; d[i++] = col.length > 3 ? col[3] : 255; }
  x.putImageData(img, 0, 0); if (post) post(x, w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, MAX_ANISO); return t;
}
function wrapDraw(w, h, px, py, m, fn) { for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { const X = px + ox, Y = py + oy; if (X < -m || X > w + m || Y < -m || Y > h + m) continue; fn(X, Y); } }

function groundTex(kind) {
  { const g8 = groundTex8(kind) || groundTex10(kind) || (kind === 'mall' ? groundTexMall() : kind === 'pinball' ? groundTexPinball() : kind === 'parquet' ? groundTexParquet() : null); if (g8) return g8; }
  if (kind === 'grass') {
    const nL = fbm(3, 4, 11), nM = fbm(12, 3, 23), nF = tileNoise(128, 37); const d1 = rgb('#47923a'), d2 = rgb('#72bf50'), d3 = rgb('#3a7f30');
    return pixelTex(512, 512, (u, v) => { let c = mix3(d1, d2, clamp((nL(u, v) - .3) * 1.9, 0, 1)); c = mix3(c, d3, clamp((nM(u, v) - .55) * 2.6, 0, 1) * .55); return mulc(c, .93 + nF(u, v) * .14); },
      (x, w, h) => { x.lineCap = 'round'; x.lineWidth = 1.3; for (let i = 0; i < 3200; i++) { const px = Math.random() * w, py = Math.random() * h, l = 3 + Math.random() * 6, dx = rand(-1.8, 1.8);
        x.strokeStyle = Math.random() < .5 ? 'rgba(38,92,30,.32)' : 'rgba(160,222,115,.26)'; wrapDraw(w, h, px, py, 10, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + dx, Y - l); x.stroke(); }); } });
  }
  if (kind === 'sand') {
    const nL = fbm(3, 4, 51), nR = fbm(6, 3, 61), nF = tileNoise(256, 71); const a = rgb('#d9aa63'), b = rgb('#f3d597');
    return pixelTex(512, 512, (u, v) => { const r = Math.sin((v * 18 + nR(u, v) * 3.2) * TAU) * .5 + .5; const c = mix3(a, b, clamp((nL(u, v) - .25) * 1.7, 0, 1)); return mulc(c, (1 + (r - .5) * .13) * (.95 + nF(u, v) * .09)); });
  }
  if (kind === 'moss' || kind === 'jungle') {
    const nL = fbm(3, 4, 231), nF = tileNoise(128, 241); const a = rgb(kind === 'moss' ? '#163a2c' : '#2f7a34'), b = rgb(kind === 'moss' ? '#245a40' : '#4a9a3e');
    return pixelTex(512, 512, (u, v) => mulc(mix3(a, b, clamp((nL(u, v) - .3) * 1.9, 0, 1)), .9 + nF(u, v) * .18),
      (x, w, h) => { x.lineWidth = 1.3; for (let i = 0; i < 2400; i++) { const px = Math.random() * w, py = Math.random() * h, l = 3 + Math.random() * 6; x.strokeStyle = kind === 'moss' ? 'rgba(60,140,100,.3)' : 'rgba(150,215,100,.28)'; wrapDraw(w, h, px, py, 10, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + rand(-1.5, 1.5), Y - l); x.stroke(); }); } });
  }
  if (kind === 'moon') {
    const nL = fbm(4, 5, 251), nF = tileNoise(256, 261); const a = rgb('#6a6a72'), b = rgb('#a2a2ac');
    return pixelTex(512, 512, (u, v) => mulc(mix3(a, b, clamp((nL(u, v) - .25) * 1.8, 0, 1)), .9 + nF(u, v) * .18),
      (x, w, h) => { for (let i = 0; i < 40; i++) { const px = Math.random() * w, py = Math.random() * h, r = rand(4, 22); wrapDraw(w, h, px, py, r, (X, Y) => { x.beginPath(); x.arc(X, Y, r, 0, TAU); x.strokeStyle = 'rgba(40,40,48,.35)'; x.lineWidth = r * .25; x.stroke(); x.fillStyle = 'rgba(70,70,80,.25)'; x.fill(); }); } });
  }
  if (kind === 'redsand') {
    const nL = fbm(3, 4, 141), nR = fbm(6, 3, 151), nF = tileNoise(256, 161); const a = rgb('#b4532f'), b = rgb('#d98a52');
    return pixelTex(512, 512, (u, v) => { const r = Math.sin((v * 12 + nR(u, v) * 3) * TAU) * .5 + .5; return mulc(mix3(a, b, clamp((nL(u, v) - .25) * 1.7, 0, 1)), (1 + (r - .5) * .1) * (.94 + nF(u, v) * .1)); });
  }
  if (kind === 'ash') {
    const nL = fbm(4, 4, 171), nC = fbm(8, 3, 181), nF = tileNoise(256, 191); const a = rgb('#1e1a20'), b = rgb('#3a3238');
    return pixelTex(512, 512, (u, v) => { const c = mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)); const crack = Math.abs(nC(u, v) - .5) < .012 ? 1 : 0; return crack ? [230, 90, 30] : mulc(c, .9 + nF(u, v) * .2); });
  }
  if (kind === 'cloud') {
    const nL = fbm(3, 5, 211); return pixelTex(512, 512, (u, v) => { const a = nL(u, v); return mix3([200, 216, 240], [255, 255, 255], clamp((a - .3) * 2, 0, 1)); });
  }
  if (kind === 'concrete') {
    const nL = fbm(4, 4, 121), nF = tileNoise(256, 131); const a = rgb('#2b2a38'), b = rgb('#3d3b4d');
    return pixelTex(512, 512, (u, v) => { const c = mix3(a, b, clamp((nL(u, v) - .3) * 1.6, 0, 1)); const seam = (u % .25 < .006 || v % .25 < .006) ? .7 : 1; return mulc(c, (.92 + nF(u, v) * .14) * seam); });
  }
  if (kind === 'seabed') { const nL = fbm(3, 4, 331), nR = fbm(6, 3, 341), nF = tileNoise(256, 351); const a = rgb('#8fa89a'), b = rgb('#d8d0a8');
    return pixelTex(512, 512, (u, v) => { const r = Math.sin((v * 14 + nR(u, v) * 3) * TAU) * .5 + .5; return mulc(mix3(a, b, clamp((nL(u, v) - .25) * 1.7, 0, 1)), (1 + (r - .5) * .12) * (.94 + nF(u, v) * .1)); },
      (x, w, h) => { for (let i = 0; i < 260; i++) { const px = Math.random() * w, py = Math.random() * h, rr = rand(1, 3); x.fillStyle = pick(['rgba(255,255,255,.5)', 'rgba(255,170,190,.45)', 'rgba(90,110,100,.4)']); wrapDraw(w, h, px, py, 4, (X, Y) => { x.beginPath(); x.arc(X, Y, rr, 0, TAU); x.fill(); }); } }); }
  if (kind === 'rock') { const nL = fbm(3, 5, 361), nF = tileNoise(256, 371), nC = fbm(8, 3, 381); return pixelTex(512, 512, (u, v) => { const k = .8 + nL(u, v) * .25 + nF(u, v) * .08 - (Math.abs(nC(u, v) - .5) < .015 ? .15 : 0); return [232 * k, 236 * k, 228 * k]; }); }
  if (kind === 'candy') { const nL = fbm(3, 4, 391), nF = tileNoise(256, 401); const a = rgb('#ffb6d5'), b = rgb('#ffe0ee');
    return pixelTex(512, 512, (u, v) => mulc(mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)), .95 + nF(u, v) * .08),
      (x, w, h) => { x.lineCap = 'round'; x.lineWidth = 3; for (let i = 0; i < 700; i++) { const px = Math.random() * w, py = Math.random() * h, a2 = rand(0, TAU); x.strokeStyle = pick(['#ff4f7a', '#ffc531', '#38b6ff', '#3ee08f', '#a87dff', '#fffdf7']); wrapDraw(w, h, px, py, 6, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a2) * 5, Y + Math.sin(a2) * 5); x.stroke(); }); } }); }
  if (kind === 'graveyard') { const nL = fbm(3, 4, 411), nF = tileNoise(128, 421); const a = rgb('#1e2a24'), b = rgb('#34402e');
    return pixelTex(512, 512, (u, v) => mulc(mix3(a, b, clamp((nL(u, v) - .3) * 1.9, 0, 1)), .9 + nF(u, v) * .18),
      (x, w, h) => { x.lineWidth = 1.2; for (let i = 0; i < 1800; i++) { const px = Math.random() * w, py = Math.random() * h, l = 3 + Math.random() * 5, dx = rand(-1.5, 1.5); x.strokeStyle = Math.random() < .5 ? 'rgba(90,110,70,.3)' : 'rgba(80,60,100,.25)'; wrapDraw(w, h, px, py, 10, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + dx, Y - l); x.stroke(); }); } }); }
  const nL = fbm(3, 4, 81), nM = fbm(10, 3, 91), nF = tileNoise(256, 99); const a = rgb('#dce6f7'), b = rgb('#fbfdff'), sh = rgb('#bfcdea');
  return pixelTex(512, 512, (u, v) => { let c = mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)); c = mix3(c, sh, clamp((nM(u, v) - .6) * 2.5, 0, 1) * .5); return mulc(c, .97 + nF(u, v) * .05); },
    (x, w, h) => { for (let i = 0; i < 380; i++) { x.fillStyle = 'rgba(255,255,255,' + rand(.6, 1) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } });
}
function roadTex(theme) {
  const base = rgb(theme.road), n1 = tileNoise(256, 7), n2 = tileNoise(64, 13), n3 = fbm(4, 3, 17), n4 = tileNoise(512, 29);
  return pixelTex(512, 512, (u, v) => {
    let k = .9 + n1(u, v) * .14 + (n4(u, v) - .5) * .12 + (n2(u, v) - .5) * .06 + (n3(u, v) - .5) * .12;
    k -= (Math.exp(-((u - .3) ** 2) / .003) + Math.exp(-((u - .7) ** 2) / .003)) * .07;
    let c = mulc(base, k);
    const line = (u > .028 && u < .056) || (u > .944 && u < .972), dash = u > .489 && u < .511 && v < .42;
    if (line || dash) { const p = .84 + n1((u * 3) % 1, v) * .16; c = mix3(c, [246 * p, 243 * p, 234 * p], dash ? .78 : .94); }
    return c;
  });
}
function curbTex(ca, cb) {
  const A = rgb(ca), B = rgb(cb), n = tileNoise(32, 5);
  return pixelTex(64, 128, (u, v) => { const c = v < .5 ? A : B; const seam = (Math.min(Math.abs(v - .5), v, 1 - v) < .02) ? .72 : 1; const k = (.84 + Math.sin(u * Math.PI) * .18 + (n(u, v) - .5) * .06) * seam; return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)]; });
}
function barrierTex(ca, cb) {
  const A = rgb(ca), B = rgb(cb), n = tileNoise(32, 9);
  return pixelTex(64, 128, (u, v) => {
    if (u < .1) return mulc([40, 38, 64], .9 + n(u, v) * .2);
    const c = v < .5 ? A : B, pv = (v % .5) / .5; const inset = Math.min(pv, 1 - pv, (u - .1) * 3, (1 - u) * 3);
    let k = .86 + Math.sin((u - .1) / .9 * Math.PI) * .2; if (inset < .07) k *= .78; if (inset > .07 && inset < .12) k *= 1.14;
    return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
  });
}
function skirtTex(col) {
  const C = rgb(col), n = fbm(4, 4, 3), m = tileNoise(32, 44);
  return pixelTex(64, 128, (u, v) => { const s = Math.sin((u * 5 + n(u, v) * 1.6) * TAU) * .5 + .5; return mulc(C, .74 + .22 * s + (m(u, v) - .5) * .14); });
}
const DOT_TEX = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }, false);
const SHADOW_TEX = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.62)'); g.addColorStop(.55, 'rgba(0,0,0,.32)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }, false);
const ITEM_TEX = canvasTex(256, 256, (x, w) => {
  x.clearRect(0, 0, w, w); const g = x.createRadialGradient(110, 100, 10, 128, 128, 118); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffe7a6');
  x.beginPath(); x.arc(128, 128, 112, 0, TAU); x.fillStyle = g; x.fill(); x.lineWidth = 14; x.strokeStyle = '#17143a'; x.stroke();
  x.font = '900 170px "Arial Black",Impact,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = 18; x.strokeStyle = '#17143a'; x.strokeText('?', 128, 140); x.fillStyle = '#ff4f3a'; x.fillText('?', 128, 140);
}, false);
const BOOST_TEX = canvasTex(128, 256, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#d94a00'); g.addColorStop(.5, '#ff7a12'); g.addColorStop(1, '#d94a00'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 2; k++) {
    const o = k * 128; const cg = x.createLinearGradient(0, o + 100, 0, o + 30); cg.addColorStop(0, '#ffd23a'); cg.addColorStop(1, '#fffbe6');
    x.shadowColor = 'rgba(255,240,150,.9)'; x.shadowBlur = 14; x.fillStyle = cg; x.beginPath();
    x.moveTo(14, o + 96); x.lineTo(64, o + 36); x.lineTo(114, o + 96); x.lineTo(114, o + 116); x.lineTo(64, o + 60); x.lineTo(14, o + 116); x.closePath(); x.fill(); x.shadowBlur = 0;
  }
  x.fillStyle = 'rgba(23,20,58,.55)'; x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h);
});
const CHECK_TEX = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#1b1840' : '#f7f5ee'; x.fillRect(i * 16, j * 16, 16, 16); } x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 400; i++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }, false);
const BANNER_TEX = canvasTex(1024, 160, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2560'); g.addColorStop(1, '#17143a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 64; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#17143a' : '#f7f5ee'; x.fillRect(i * 16, j * 12, 16, 12); x.fillRect(i * 16, h - 24 + j * 12, 16, 12); }
  x.font = '900 82px "Arial Black",Impact,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = 12; x.strokeStyle = '#0d0b26'; x.strokeText('WILD  KART', w / 2 + 5, h / 2 + 7); x.fillStyle = '#0d0b26'; x.fillText('WILD  KART', w / 2 + 5, h / 2 + 7);
  const tg = x.createLinearGradient(0, 40, 0, 120); tg.addColorStop(0, '#ffe07a'); tg.addColorStop(1, '#ffb21e'); x.fillStyle = tg; x.fillText('WILD  KART', w / 2, h / 2 + 2);
}, false);

const matCache = new Map();
function stdMat(color, rough = .45, metal = .12) {
  const key = color + '|' + rough + '|' + metal; if (!matCache.has(key)) matCache.set(key, new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return matCache.get(key);
}
const SHARED = new Set();
[DOT_TEX, SHADOW_TEX, ITEM_TEX, BOOST_TEX, CHECK_TEX, BANNER_TEX].forEach((t) => SHARED.add(t));

/* ================= Construction du circuit ================= */
function buildSamples(def) {
  const pts = def.pts.map((p) => new T.Vector3(p[0], p[2] || 0, p[1]));
  const curve = new T.CatmullRomCurve3(pts, true, 'centripetal');
  const L = curve.getLength(); const N = Math.max(240, Math.round(L / 2)); const seg = L / N;
  const sp = curve.getSpacedPoints(N);
  const S = { N, L, seg, px: new Float32Array(N), py: new Float32Array(N), pz: new Float32Array(N), fx: new Float32Array(N), fz: new Float32Array(N),
    rx: new Float32Array(N), rz: new Float32Array(N), hd: new Float32Array(N), slope: new Float32Array(N), curv: new Float32Array(N) };
  for (let i = 0; i < N; i++) { S.px[i] = sp[i].x; S.py[i] = sp[i].y; S.pz[i] = sp[i].z; }
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N, p = (i - 1 + N) % N; let dx = S.px[n] - S.px[p], dz = S.pz[n] - S.pz[p]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    S.fx[i] = dx; S.fz[i] = dz; S.rx[i] = -dz; S.rz[i] = dx; S.hd[i] = Math.atan2(dx, dz); S.slope[i] = (S.py[n] - S.py[p]) / (2 * seg);
  }
  for (let i = 0; i < N; i++) S.curv[i] = angDiff(S.hd[(i - 3 + N) % N], S.hd[(i + 3) % N]) / 6;
  S.glide = new Uint8Array(N); S.glideT = new Float32Array(N);
  for (const [a, b] of def.glide || []) { const i0 = Math.floor(a * N), i1 = Math.floor(b * N); for (let i = i0; i <= i1; i++) { S.glide[i % N] = 1; S.glideT[i % N] = (i - i0) / Math.max(1, i1 - i0); } }
  S.closed = true; S.id = -1;
  return S;
}

/* ---- géométrie utilitaire ---- */
function bandGeo(S, cols, opts = {}) {
  // bande le long du circuit : chaque colonne = {o: décalage latéral, y: hauteur, abs: hauteur absolue, u}
  const N = S.N, C = cols.length, pos = [], uv = [], idx = []; const K = S.closed === false ? N - 1 : N;
  for (let k = 0; k <= K; k++) {
    const i = k % N;
    cols.forEach((c, j) => {
      let X = S.px[i] + S.rx[i] * c.o, Z = S.pz[i] + S.rz[i] * c.o, Y = c.abs ? c.y : S.py[i] + c.y;
      if (S.wz && S.wz[i] && !c.abs) { warpAt(S, i, c.o, c.y, _wv); X = _wv.x; Y = _wv.y; Z = _wv.z; }
      pos.push(X, Y, Z);
      if (opts.world) uv.push(X / 40, -Z / 40); else uv.push(c.u != null ? c.u : j / (C - 1), k * S.seg / (opts.vScale || 24));
    });
    if (k < K && !(opts.skip && opts.skip(i))) for (let j = 0; j < C - 1; j++) { const a = k * C + j, b = a + 1, c2 = a + C, d = c2 + 1; idx.push(a, b, c2, b, d, c2); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function tubeAlong(S, lat, y, r, seg = 8, step = 2, skip) {
  const pos = [], nor = [], idx = []; const open = S.closed === false; const rows = open ? Math.floor((S.N - 1) / step) : Math.ceil(S.N / step);
  for (let k = 0; k <= rows; k++) {
    const i = open ? Math.min(k * step, S.N - 1) : Math.min(k * step, S.N) % S.N; const cx = S.px[i] + S.rx[i] * lat, cy = S.py[i] + y, cz = S.pz[i] + S.rz[i] * lat; const wz = S.wz && S.wz[i];
    for (let s = 0; s < seg; s++) { const a = s / seg * TAU, ca = Math.cos(a), sa = Math.sin(a); if (wz) { warpAt(S, i, lat + ca * r, y + sa * r, _wv); pos.push(_wv.x, _wv.y, _wv.z); const k3 = i * 3; nor.push(S.wr[k3] * ca + S.wu[k3] * sa, S.wr[k3 + 1] * ca + S.wu[k3 + 1] * sa, S.wr[k3 + 2] * ca + S.wu[k3 + 2] * sa); } else { pos.push(cx + S.rx[i] * ca * r, cy + sa * r, cz + S.rz[i] * ca * r); nor.push(S.rx[i] * ca, sa, S.rz[i] * ca); } }
    if (k < rows && !(skip && skip(i))) for (let s = 0; s < seg; s++) { const a = k * seg + s, b = k * seg + (s + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
}
function quadAt(S, i, lat, halfW, halfL, y) {
  const fx = S.fx[i], fz = S.fz[i], rx = S.rx[i], rz = S.rz[i];
  const cx = S.px[i] + rx * lat, cz = S.pz[i] + rz * lat, cy = S.py[i] + y;
  const P = (sx, sl) => [cx + rx * sx + fx * sl, cy, cz + rz * sx + fz * sl];
  const pos = [...P(-halfW, -halfL), ...P(halfW, -halfL), ...P(-halfW, halfL), ...P(halfW, halfL)];
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2)); g.setIndex([0, 1, 2, 1, 3, 2]); g.computeVertexNormals(); return g;
}
function smooth(geo, angDeg = 60) {
  // normales lissées par position (avec angle limite), géométrie non indexée en sortie
  const g = geo.index ? geo.toNonIndexed() : geo; if (geo !== g) geo.dispose();
  const pos = g.attributes.position, n = pos.count, fn = new Float32Array(n * 3);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
  for (let i = 0; i < n; i += 3) { a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2); e1.subVectors(c, b); e2.subVectors(a, b); e1.cross(e2); const l = e1.length() || 1; e1.divideScalar(l);
    for (let k = 0; k < 3; k++) { fn[(i + k) * 3] = e1.x; fn[(i + k) * 3 + 1] = e1.y; fn[(i + k) * 3 + 2] = e1.z; } }
  const map = new Map(); for (let i = 0; i < n; i++) { const key = Math.round(pos.getX(i) * 1e3) + '_' + Math.round(pos.getY(i) * 1e3) + '_' + Math.round(pos.getZ(i) * 1e3); let l = map.get(key); if (!l) map.set(key, (l = [])); l.push(i); }
  const out = new Float32Array(n * 3), th = Math.cos(angDeg * DEG);
  for (const l of map.values()) for (const i of l) {
    let x = 0, y = 0, z = 0; for (const j of l) { const d = fn[i * 3] * fn[j * 3] + fn[i * 3 + 1] * fn[j * 3 + 1] + fn[i * 3 + 2] * fn[j * 3 + 2]; if (d >= th) { x += fn[j * 3]; y += fn[j * 3 + 1]; z += fn[j * 3 + 2]; } }
    const L = Math.hypot(x, y, z) || 1; out[i * 3] = x / L; out[i * 3 + 1] = y / L; out[i * 3 + 2] = z / L;
  }
  g.setAttribute('normal', new T.BufferAttribute(out, 3)); return g;
}
function wobble(geo, amt, freq = 1.4, seed = 1, xzOnly = false) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nz = (Math.sin(x * freq * 1.7 + seed) * Math.sin(y * freq * 2.3 + seed * 1.3) * Math.sin(z * freq * 1.9 + seed * .7) + .5 * Math.sin(x * freq * 3.1 + 2 + seed) * Math.sin(z * freq * 2.7 + 1)) / 1.5;
    const k = 1 + amt * nz; if (xzOnly) { p.setX(i, x * k); p.setZ(i, z * k); } else p.setXYZ(i, x * k, y * k, z * k);
  }
  return geo;
}
function mergeGeos(list) {
  let n = 0; const gs = list.map((g) => { const q = g.index ? g.toNonIndexed() : g; if (!q.attributes.normal) q.computeVertexNormals(); n += q.attributes.position.count; return q; });
  const withUV = gs.every((g) => g.attributes.uv); const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), U = withUV ? new Float32Array(n * 2) : null; let o = 0;
  for (const g of gs) { P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); if (U) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
  const m = new T.BufferGeometry(); m.setAttribute('position', new T.BufferAttribute(P, 3)); m.setAttribute('normal', new T.BufferAttribute(Nn, 3)); if (U) m.setAttribute('uv', new T.BufferAttribute(U, 2)); return m;
}
function roundRectShape(w, h, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function rbox(w, h, d, r) {
  r = Math.min(r, w / 2 - .002, h / 2 - .002, d / 2 - .002);
  const g = new T.ExtrudeGeometry(roundRectShape(w - 2 * r, h - 2 * r, r * .9), { depth: Math.max(.002, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 5 });
  g.translate(0, 0, -(d - 2 * r) / 2); return smooth(g, 50);
}
function trs(x, y, z, rx = 0, ry = 0, rz = 0, s = 1) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(s, s, s)); }
const tr = (x, y, z) => new T.Matrix4().makeTranslation(x, y, z);

let CUR_HAT = null;
function instanced(scene, parts, places) {
  if (!places.length) return;
  const m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), c = new T.Color(), e = new T.Euler();
  for (const part of parts) {
    if (part.geo.attributes.color && part.mat && !part.mat.vertexColors) { part.mat = part.mat.clone(); part.mat.vertexColors = true; }
    const im = new T.InstancedMesh(part.geo, part.mat, places.length);
    places.forEach((pl, k) => {
      e.set(0, pl.r || 0, 0); q.setFromEuler(e); s.set(pl.sx || pl.s, pl.sy || pl.s, pl.sz || pl.s); p.set(pl.x, pl.y + (pl.g && CUR_HAT ? CUR_HAT(pl.x, pl.z) : 0), pl.z);
      m.compose(p, q, s); if (part.off) m.multiply(part.off); im.setMatrixAt(k, m);
      if (part.colors) { c.set(part.colors[(k * 7 + 3) % part.colors.length]); c.offsetHSL(rand(-.01, .01), 0, rand(-.04, .04)); im.setColorAt(k, c); }
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    scene.add(im);
  }
}
const lam = (color, extra = {}) => new T.MeshLambertMaterial(Object.assign({ color }, extra));

/* ---- environnement (reflets) ---- */
function makeEnv(top, bottom, ground, sun = 3.2) {
  const s = new T.Scene();
  const m = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false,
    uniforms: { top: { value: new T.Color(top) }, bottom: { value: new T.Color(bottom) }, ground: { value: new T.Color(ground) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 ground; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(bottom, top, pow(clamp(h*1.4,0.0,1.0),0.7)) : mix(bottom, ground, clamp(-h*5.0,0.0,1.0)); gl_FragColor = vec4(c,1.0); }' });
  s.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), m));
  const sm = new T.Mesh(new T.SphereGeometry(1, 16, 8), new T.MeshBasicMaterial({ color: new T.Color(sun, sun * .95, sun * .85) })); sm.position.set(5, 7, 3); s.add(sm);
  const strip = new T.Mesh(new T.PlaneGeometry(14, 1.2), new T.MeshBasicMaterial({ color: new T.Color(1.6, 1.6, 1.7), side: T.DoubleSide })); strip.position.set(0, 6, -6); strip.lookAt(0, 0, 0); s.add(strip);
  const pm = new T.PMREMGenerator(renderer); const rt = pm.fromScene(s, .03); pm.dispose();
  s.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return rt;
}

function buildWorld(ti) {
  const def = TRACKS[ti], th = def.theme, S = buildSamples(def);
  const scene = new T.Scene();
  const hw = def.width / 2, curbW = 1.6, run = 5.5, wallD = hw + curbW + run;
  const W = { ti, def, th, S, scene, hw, curbW, wallD, lim: wallD - 1.3, boxes: [], pads: [], anim: [] };
  scene.fog = new T.Fog(th.fog, th.fogN, th.fogF);
  scene.background = new T.Color(th.fog);
  W.envRT = makeEnv(th.sky[0], th.sky[1], ({ grass: '#4f8f3c', sand: '#d9aa63', snow: '#dce6f7', concrete: '#34323f', redsand: '#b4532f', ash: '#2a2228', cloud: '#eef4ff', moss: '#163a2c', jungle: '#2f7a34', moon: '#6a6a72', seabed: '#3a6a7a', rock: '#7a8070', candy: '#ffb6d5', graveyard: '#2a2a36', sakura: '#6a9a4a', savanna: '#c8a050', fair: '#2a2a3a', space: '#0a0a1a', lavender: '#6a8a4a', autumn: '#a8763a', tropic: '#e8d29a', antique: '#b8a878' })[th.ground] || '#888888', th.night ? 1.4 : 3.2);
  scene.environment = W.envRT.texture;

  // ciel avec halo du soleil
  const sunPos = new T.Vector3(220, 320, 120).normalize();
  const sky = new T.Mesh(new T.SphereGeometry(1500, 32, 16), new T.ShaderMaterial({
    uniforms: { top: { value: new T.Color(th.sky[0]) }, bottom: { value: new T.Color(th.sky[1]) }, sunDir: { value: sunPos }, sunCol: { value: new T.Color(th.night ? '#000000' : th.sun) } }, side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = clamp(d.y*1.6+0.08,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.75)); float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 2.0 + pow(s, 24.0) * 0.22 + pow(s, 4.0) * 0.06); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}' }));
  sky.renderOrder = -1; scene.add(sky); W.sky = sky;

  scene.add(new T.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]));
  const sun = new T.DirectionalLight(th.sun, th.sunI); sun.position.set(220, 320, 120); scene.add(sun); scene.add(sun.target); W.sun = sun;
  if (qual().shadows) { sun.castShadow = true; sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048); const sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 20; sc.far = 500; sun.shadow.bias = -.0005; sun.shadow.normalBias = .04; }
  buildBranches(W); computeGore(W); planBumps(W); planKickers(W); buildWarp(S, def, hw); buildEdges(S, def); computeBridges(W); W.env = envFor(def);
  { let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity; const acc = (P) => { for (let i = 0; i < P.N; i++) { a = Math.min(a, P.px[i]); b = Math.max(b, P.px[i]); e = Math.min(e, P.pz[i]); f = Math.max(f, P.pz[i]); } }; acc(S); W.branches.forEach(acc);
    W.bb = { cx: (a + b) / 2, cz: (e + f) / 2, ext: Math.max(b - a, f - e) / 2 }; }
  W.nearAll = nearAllFn(W);
  if (th.terrain) buildTerrain(W, W.bb.ext, W.bb.cx, W.bb.cz);
  CUR_HAT = W.hAt || null;
  const openAt = (i, sg) => W.branches.some((B) => B.side === sg && (inWin(i, B.winA) || inWin(i, B.winB)));
  const gap = (i) => (S.glide[i] && S.glide[(i + 1) % S.N]) || !!(S.wz && (S.wz[i] || S.wz[(i + 1) % S.N]));
  const gapR = (i) => S.glide[i] && S.glide[(i + 1) % S.N];

  // sol
  const gtex = groundTex(th.ground); gtex.repeat.set(100, 100);
  const groundMat = gfxDetail(new T.MeshLambertMaterial({ map: gtex, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }), 'ground'); W.groundMat = groundMat;
  const ground = new T.Mesh(new T.PlaneGeometry(4000, 4000), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = th.groundY != null ? th.groundY : -.08; if (th.terrain || th.noGround) { ground.geometry.dispose(); groundMat.dispose(); } else scene.add(ground);
  const stex = gtex.clone(); stex.repeat.set(1, 1); stex.needsUpdate = true;
  const shoulderMat = new T.MeshLambertMaterial({ map: stex, side: T.DoubleSide });
  const nwL = (i) => !!(S.nowall && S.nowall[i] & 1), nwR = (i) => !!(S.nowall && S.nowall[i] & 2);
  scene.add(new T.Mesh(bandGeo(S, [{ o: -wallD, y: .06 }, { o: -hw - curbW + .05, y: .06 }], { world: true, skip: (i) => gap(i) || nwL(i) || nwL((i + 1) % S.N) }), shoulderMat));
  scene.add(new T.Mesh(bandGeo(S, [{ o: hw + curbW - .05, y: .06 }, { o: wallD, y: .06 }], { world: true, skip: (i) => gap(i) || nwR(i) || nwR((i + 1) % S.N) }), shoulderMat));

  // route + vibreurs bombés
  const roadMat = gfxDetail(new T.MeshStandardMaterial({ map: roadTexStyle(th) || roadTex(th), roughness: .82, metalness: 0, envMapIntensity: .35 }), 'road');
  scene.add(new T.Mesh(bandGeo(S, [{ o: -hw, y: .1 }, { o: hw, y: .1 }], { vScale: 24, skip: gapR }), roadMat));
  const curbMat = new T.MeshStandardMaterial({ map: curbTex(th.curb[0], th.curb[1]), roughness: .55, metalness: 0, envMapIntensity: .5 });
  scene.add(new T.Mesh(bandGeo(S, [{ o: -hw - curbW, y: .08 }, { o: -hw - curbW * .5, y: .2 }, { o: -hw, y: .11 }], { vScale: 6, skip: (i) => gapR(i) || (openAt(i, -1) && S.openPre[i]) }), curbMat));
  scene.add(new T.Mesh(bandGeo(S, [{ o: hw, y: .11 }, { o: hw + curbW * .5, y: .2 }, { o: hw + curbW, y: .08 }], { vScale: 6, skip: (i) => gapR(i) || (openAt(i, 1) && S.openPre[i]) }), curbMat));

  // barrières : panneaux + rail arrondi + talus
  const wallMat = new T.MeshStandardMaterial({ map: barrierTex(th.barrier[0], th.barrier[1]), side: T.DoubleSide, roughness: .5, metalness: .05, envMapIntensity: .5 });
  const railMat = new T.MeshStandardMaterial({ color: '#e9ecf4', roughness: .25, metalness: .75, side: T.DoubleSide });
  const skirtMat = new T.MeshLambertMaterial({ map: skirtTex(th.skirt), side: T.DoubleSide });
  for (const sgn of [-1, 1]) {
    const d = sgn * wallD;
    const nwS = (i) => !!(S.nowall && (S.nowall[i] & (sgn < 0 ? 1 : 2)));
    const sk = (i) => gap(i) || openAt(i, sgn) || nwS(i), skW = (i) => gapR(i) || openAt(i, sgn) || nwS(i);
    scene.add(new T.Mesh(bandGeo(S, [{ o: d, y: .06 }, { o: d, y: 1.12 }], { vScale: 8, skip: skW }), wallMat));
    scene.add(new T.Mesh(tubeAlong(S, d, 1.2, .14, 8, 2, (i) => S.glide[i] || S.glide[(i + 2) % S.N] || openAt(i, sgn) || openAt(i + 2, sgn) || nwS(i) || nwS((i + 2) % S.N)), railMat));
    if (S.nowall) scene.add(new T.Mesh(bandGeo(S, sgn > 0 ? [{ o: hw + curbW, y: .085 }, { o: hw + curbW, y: -2.4 }] : [{ o: -hw - curbW, y: -2.4 }, { o: -hw - curbW, y: .085 }], { vScale: 10, skip: (i) => !nwS(i) || !nwS((i + 1) % S.N) }), skirtMat));
    if (S.ag) scene.add(new T.Mesh(bandGeo(S, [{ o: d, y: 1.12 }, { o: d, y: 2.6 }], { vScale: 8, skip: (i) => !S.ag[i] || !S.ag[(i + 1) % S.N] }), new T.MeshBasicMaterial({ color: '#5ff2ff', transparent: true, opacity: .22, side: T.DoubleSide, depthWrite: false })));
    if (th.terrain) scene.add(new T.Mesh(sgn > 0 ? bandGeo(S, [{ o: d, y: .06 }, { o: d + 7, y: -5 }], { world: true, skip: sk }) : bandGeo(S, [{ o: d - 7, y: -5 }, { o: d, y: .06 }], { world: true, skip: sk }), shoulderMat));
    else scene.add(new T.Mesh(bandGeo(S, [th.skirtDepth ? { o: d, y: -th.skirtDepth } : { o: d, y: th.groundY != null ? th.groundY : -1, abs: true }, { o: d, y: .06 }], { vScale: 10, skip: sk }), skirtMat));
  }

  // ligne de départ + arche
  scene.add(new T.Mesh(quadAt(S, 0, 0, hw, 1.6, .13), new T.MeshStandardMaterial({ map: CHECK_TEX, roughness: .6, envMapIntensity: .4 })));
  const arch = new T.Group(); arch.position.set(S.px[0], S.py[0], S.pz[0]); arch.rotation.y = S.hd[0];
  const pil = new T.CylinderGeometry(.7, .85, 9.6, 28); const pm = stdMat('#1b1840', .35, .3); const gold = stdMat('#ffc531', .25, .7);
  const ringG = new T.TorusGeometry(.78, .12, 10, 28);
  for (const sx of [-1, 1]) { const m = new T.Mesh(pil, pm); m.position.set(sx * (hw + 2.6), 4.8, 0); arch.add(m);
    for (const y of [1.2, 7.4]) { const r = new T.Mesh(ringG, gold); r.rotation.x = Math.PI / 2; r.position.set(sx * (hw + 2.6), y, 0); arch.add(r); } }
  const banner = new T.Mesh(rbox(def.width + 7.4, 3.2, .8, .35), pm); banner.position.y = 9; arch.add(banner);
  const bm = new T.MeshBasicMaterial({ map: BANNER_TEX }); const bg = new T.PlaneGeometry(def.width + 6, 2.6);
  for (const s of [1, -1]) { const p = new T.Mesh(bg, bm); p.position.set(0, 9, s * .42); if (s < 0) p.rotation.y = Math.PI; arch.add(p); }
  scene.add(arch);

  // plaques turbo
  const padMat = new T.MeshBasicMaterial({ map: BOOST_TEX, transparent: true, opacity: .97 }); W.padTex = BOOST_TEX;
  for (const [t0, l] of def.boosts) { const t = clearOfJunctions(W, t0), i = Math.floor(t * S.N); const lat = l * hw; scene.add(new T.Mesh(quadAt(S, i, lat, 2.6, 4.5, .15), padMat)); W.pads.push({ i, lat }); }

  // boîtes à objets : coque arrondie translucide + badge « ? »
  const shellGeo = rbox(1.8, 1.8, 1.8, .38);
  const shellMat = new T.MeshStandardMaterial({ color: '#8fd3ff', transparent: true, opacity: .55, roughness: .06, metalness: .15, emissive: '#4a2cff', emissiveIntensity: .25, depthWrite: false });
  const qMat = new T.SpriteMaterial({ map: ITEM_TEX, depthWrite: false }); W.boxMat = shellMat;
  W.addBox = (x, z, y) => { const m = new T.Group(); const shell = new T.Mesh(shellGeo, shellMat); m.add(shell); const sp = new T.Sprite(qMat); sp.scale.setScalar(1.1); m.add(sp);
    m.position.set(x, y + 1.5, z); shell.rotation.set(.45, Math.random() * TAU, .3); scene.add(m); W.boxes.push({ mesh: m, shell, x, z, y, active: true, t: 0, phase: Math.random() * TAU }); };
  for (const it of itemPlan(W)) for (const [f, di] of it.pat) { const i = (it.i + di) % S.N; W.addBox(S.px[i] + S.rx[i] * f * hw, S.pz[i] + S.rz[i] * f * hw, S.py[i]); }
  const bmats = { shoulder: shoulderMat, road: roadMat, curb: curbMat, wall: wallMat, rail: railMat, skirt: skirtMat, pad: padMat, dirt: new T.MeshLambertMaterial({ map: stex, color: '#d8c0a0', polygonOffset: true, polygonOffsetFactor: -1 }), fence: new T.MeshLambertMaterial({ color: '#8a6a48', side: T.DoubleSide }), fenceRail: lam('#6b4a2b') };
  bmats.path = new T.MeshStandardMaterial({ map: DIRT_TEX, roughness: .95, envMapIntensity: .2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (const B of W.branches) buildBranchGeo2(W, B, bmats);
  buildGores(W, bmats);
  planGates(W); buildGates(W);
  W.clock = 0; if (RACE_OPTS.obst) planObstacles(W); else { W.obst = []; W.ramps = []; } buildObstacleMeshes(W);
  if (W.bumps && W.bumps.length) {
    const bt = BUMP_TEX.clone(); bt.needsUpdate = true; bt.repeat.set(Math.max(2, Math.round(hw / 2.2)), 1); SHARED.add(bt);
    const bmat = new T.MeshStandardMaterial({ map: bt, roughness: .7, envMapIntensity: .3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); W.bumpMat = bmat;
    const near = (i, c, r) => { const d = Math.abs(i - c); return Math.min(d, S.N - d) <= r; };
    for (const b of W.bumps) {
      scene.add(new T.Mesh(bandGeo(S, [{ o: -hw + .3, y: .12 }, { o: hw - .3, y: .12 }], { vScale: 3, skip: (i) => !near(i, b.i, 4) }), bmat));
      // panneaux triangulaires « dos d'âne » de chaque côté
      const j = (b.i - 40 + S.N) % S.N;
      for (const sg of [-1, 1]) { const sign = bumpSign(); sign.position.set(S.px[j] + S.rx[j] * sg * (wallD + 1.6), S.py[j], S.pz[j] + S.rz[j] * sg * (wallD + 1.6)); sign.rotation.y = S.hd[j] + Math.PI; scene.add(sign); }
    }
  }

  planWeather(W); buildBridges(W); if (W.def.fortress) buildFortress(W); buildZones(W); if (W.def.railway) buildRailway(W); planChameleon(W);
  buildDetails(W); warpNoDecor(W); buildWarpGlow(W); buildKickers(W);
  buildDecor(W); buildGrass9(W);
  W.parts = new Particles(scene, 420, true); W.dust = new Particles(scene, 200, false);
  if (th.decor === 'snow') W.snow = makeSnow(scene);
  buildGlideBits(W);
  buildTunnels(W);
  CUR_HAT = null;
  W.roles = new Map([[roadMat, 'road'], [curbMat, 'curb'], [shoulderMat, 'shoulder'], [padMat, 'road'], [bmats.dirt, 'road'], [skirtMat, 'skirt'], [wallMat, 'wall'], [W.bumpMat, 'road']]); if (W.terrain) W.roles.set(W.terrain.material, 'terrain');
  scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.material.transparent) o.receiveShadow = true; });
  return W;
}

function nearTrackFn(S, cell = 24) {
  const grid = new Map();
  for (let i = 0; i < S.N; i += 2) { const k = Math.floor(S.px[i] / cell) + ',' + Math.floor(S.pz[i] / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
  return (x, z, r) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell), rc = Math.ceil(r / cell) + 1; let best = Infinity, bi = -1;
    for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) { const l = grid.get((cx + a) + ',' + (cz + b)); if (!l) continue;
      for (const i of l) { const d = (S.px[i] - x) ** 2 + (S.pz[i] - z) ** 2; if (d < best) { best = d; bi = i; } } }
    return { d: Math.sqrt(best), i: bi };
  };
}

// géométries de décor (créées une fois, partagées entre circuits)
const DECOR = {};
const SHADE_GEO = { hill: [.8, 1.08], crown: [.6, 1.14], crown2: [.64, 1.12], bush: [.68, 1.1], pine1: [.58, 1.1], pine2: [.6, 1.1], pine3: [.64, 1.12], rock: [.7, 1.08], drybush: [.74, 1.08], cactus: [.78, 1.06] };
function shadeGeo(g, lo, hi) {
  // dégradé sombre en bas, clair en haut + petites variations : donne du volume aux arbres et rochers
  const p = g.attributes.position; g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const t = clamp((p.getY(i) - y0) / (y1 - y0 || 1), 0, 1), n = Math.sin(p.getX(i) * 3.1 + p.getZ(i) * 2.3) * .035 + Math.sin(p.getY(i) * 4.7) * .025;
    const v = lo + (hi - lo) * Math.pow(t, .85) + n; col[i * 3] = v * (1 + .03 * t); col[i * 3 + 1] = v; col[i * 3 + 2] = v * (1 - .04 * t); }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
}
function decorGeo(name) {
  if (DECOR[name]) return DECOR[name];
  let g;
  switch (name) {
    case 'crown': g = smooth(wobble(new T.IcosahedronGeometry(3.2, 2), .14, .9, 3), 80); break;
    case 'crown2': g = smooth(wobble(new T.IcosahedronGeometry(2.2, 2), .14, 1.2, 7), 80); break;
    case 'trunk': g = new T.CylinderGeometry(.38, .6, 4.4, 10); break;
    case 'bush': g = smooth(wobble(new T.IcosahedronGeometry(1.6, 2), .16, 1.6, 5), 80); g.scale(1, .72, 1); break;
    case 'flower': g = new T.SphereGeometry(.32, 10, 8); break;
    case 'rock': g = smooth(wobble(new T.DodecahedronGeometry(1.6, 1), .2, 1.3, 9), 70); g.scale(1, .7, 1); break;
    case 'hill': g = new T.SphereGeometry(1, 28, 12, 0, TAU, 0, Math.PI / 2); break;
    case 'cactus': g = new T.CapsuleGeometry(.6, 4.6, 8, 16); break;
    case 'arm': g = new T.CapsuleGeometry(.38, 1.5, 6, 12); break;
    case 'armH': g = new T.CapsuleGeometry(.36, .7, 6, 12); g.rotateZ(Math.PI / 2); break;
    case 'drybush': g = smooth(wobble(new T.IcosahedronGeometry(1, 1), .3, 2.2, 4), 80); break;
    case 'mesa': g = new T.CylinderGeometry(.78, 1, 1, 22, 4); g.translate(0, .5, 0); wobble(g, .1, 4, 2, true); g.computeVertexNormals(); break;
    case 'cloud': g = smooth(new T.IcosahedronGeometry(1, 2), 80); break;
    case 'pine1': g = new T.ConeGeometry(2.6, 3.8, 14); break;
    case 'pine2': g = new T.ConeGeometry(2, 3.3, 14); break;
    case 'pine3': g = new T.ConeGeometry(1.3, 2.6, 14); break;
    case 'ptrunk': g = new T.CylinderGeometry(.28, .4, 2, 8); break;
    case 'mountain': {
      g = new T.ConeGeometry(1, 1, 28, 8); g.translate(0, .5, 0); wobble(g, .12, 3, 5, true); g = smooth(g, 60);
      const p = g.attributes.position, col = new Float32Array(p.count * 3), rock = new T.Color('#4a5584'), snow = new T.Color('#eef4ff'), c = new T.Color();
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), line = .58 + Math.sin(p.getX(i) * 9) * .05 + Math.sin(p.getZ(i) * 7) * .05; c.copy(y > line ? snow : rock); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new T.BufferAttribute(col, 3)); break;
    }
    case 'post': g = new T.CylinderGeometry(.13, .17, 5.4, 10); break;
    case 'bulb': g = new T.SphereGeometry(.5, 16, 12); break;
  }
  if (SHADE_GEO[name]) shadeGeo(g, SHADE_GEO[name][0], SHADE_GEO[name][1]);
  g.userData.keep = true; DECOR[name] = g; return g;
}

function buildDecor(W) {
  const { S, scene, th } = W;
  const near = W.nearAll || nearTrackFn(S);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < S.N; i++) { minX = Math.min(minX, S.px[i]); maxX = Math.max(maxX, S.px[i]); minZ = Math.min(minZ, S.pz[i]); maxZ = Math.max(maxZ, S.pz[i]); }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, ext = Math.max(maxX - minX, maxZ - minZ) / 2;
  W.center = { x: cx, z: cz, r: ext }; if (th.water) W.waterX = maxX + 55;
  const scatter = (n, minD, maxD, sMin, sMax) => {
    const out = []; let guard = 0;
    while (out.length < n && guard++ < n * 30) {
      const x = cx + rand(-ext - 220, ext + 220), z = cz + rand(-ext - 220, ext + 220); const r = near(x, z, maxD);
      if (r.d < W.wallD + minD || r.d > maxD) continue;
      if (W.waterX != null && x > W.waterX - 8) continue;
      if (W.noDecor && W.noDecor.some((n) => (n.x - x) ** 2 + (n.z - z) ** 2 < n.r * n.r)) continue;
      out.push({ x, z, y: -.1, s: rand(sMin, sMax), r: rand(0, TAU), g: 1 });
    }
    return out;
  };
  const ring = (n, rMin, rMax) => { const out = []; for (let k = 0; k < n; k++) { const a = k / n * TAU + rand(-.08, .08), r = ext + rand(rMin, rMax); out.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, y: -1, r: rand(0, TAU), g: 1 }); } return out; };
  const q = qual().decor;
  const greens = ['#3f9a3c', '#4fb146', '#2f8a3a', '#62c04f', '#7cc94a'];

  if (th.decor === 'prairie') {
    instanced(scene, [{ geo: decorGeo('trunk'), mat: lam('#7a5233'), off: tr(0, 2.2, 0) }, { geo: decorGeo('crown'), mat: lam('#ffffff'), off: tr(0, 6.2, 0), colors: greens },
      { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: tr(1.4, 5, .7), colors: greens.slice().reverse() }], scatter(260 * q, 6, 260, .8, 1.5));
    instanced(scene, [{ geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, .7, 0), colors: ['#4fa83f', '#5fb84a', '#3d9535'] }], scatter(160 * q, 3, 160, .7, 1.4));
    instanced(scene, [{ geo: decorGeo('flower'), mat: lam('#ffffff'), off: tr(0, .32, 0), colors: ['#ff6fb5', '#ffc531', '#fffdf7', '#ff4f3a', '#9b7bff'] }], scatter(260 * q, 1.5, 90, .8, 1.3));
    instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#9a9aa8', '#8a8c9c', '#a9a8b4'] }], scatter(50 * q, 3, 200, .6, 1.6));
    const hills = ring(26, 260, 420).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(40, 95), sz: rand(90, 170) }));
    instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#5aa84a', '#4f9a42', '#69b452'] }], hills);
    addClouds(W, ext, cx, cz);
  } else if (th.decor === 'desert') {
    const cmat = lam('#ffffff');
    const cc = ['#4c9a4a', '#58a852', '#428a42'];
    instanced(scene, [{ geo: decorGeo('cactus'), mat: cmat, off: tr(0, 2.9, 0), colors: cc }, { geo: decorGeo('arm'), mat: cmat, off: tr(1.32, 4.3, 0), colors: cc },
      { geo: decorGeo('arm'), mat: cmat, off: trs(-1.32, 3.6, 0, 0, 0, 0, .85), colors: cc }, { geo: decorGeo('armH'), mat: cmat, off: tr(.8, 3.3, 0), colors: cc },
      { geo: decorGeo('armH'), mat: cmat, off: trs(-.8, 2.9, 0, 0, 0, 0, .9), colors: cc }], scatter(140 * q, 5, 240, .7, 1.4));
    instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .6, 0), colors: ['#c98e52', '#b8773e', '#d9a66a'] }], scatter(150 * q, 3, 240, .6, 2.2));
    instanced(scene, [{ geo: decorGeo('drybush'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#9a7a45', '#8a6c3c', '#a88a52'] }], scatter(110 * q, 2, 150, .6, 1.3));
    const mesas = ring(24, 250, 430).map((p) => { const r = rand(40, 90); return Object.assign(p, { sx: r, sy: rand(30, 80), sz: r }); });
    instanced(scene, [{ geo: decorGeo('mesa'), mat: lam('#ffffff'), colors: ['#d98a4e', '#c47640', '#e39a5c'] }], mesas);
    addClouds(W, ext, cx, cz, 8);
  } else if (th.decor === 'snow') {
    const pg = ['#2f6b52', '#2a5f4a', '#357a5c'];
    instanced(scene, [{ geo: decorGeo('ptrunk'), mat: lam('#5b4030'), off: tr(0, 1, 0) }, { geo: decorGeo('pine1'), mat: lam('#ffffff'), off: tr(0, 3.6, 0), colors: pg },
      { geo: decorGeo('pine2'), mat: lam('#ffffff'), off: tr(0, 5.5, 0), colors: pg }, { geo: decorGeo('pine3'), mat: lam('#eef4ff'), off: tr(0, 7.3, 0) }],
      scatter(340 * q, 5, 260, .8, 1.6));
    instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#6b7394', '#7d86a8'] }], scatter(70 * q, 3, 200, .6, 1.8));
    const mtn = ring(22, 260, 460).map((p) => { const r = rand(90, 170); return Object.assign(p, { sx: r, sy: rand(120, 230), sz: r }); });
    instanced(scene, [{ geo: decorGeo('mountain'), mat: lam('#ffffff', { vertexColors: true }) }], mtn);
    const lamps = []; const glow = [];
    for (let i = 0; i < S.N; i += 26) for (const sg of [-1, 1]) { const d = sg * (W.wallD + 1); const x = S.px[i] + S.rx[i] * d, z = S.pz[i] + S.rz[i] * d; lamps.push({ x, z, y: S.py[i], s: 1, r: 0 }); glow.push(x, S.py[i] + 5.6, z); }
    instanced(scene, [{ geo: decorGeo('post'), mat: lam('#1b1840'), off: tr(0, 2.7, 0) }, { geo: decorGeo('bulb'), mat: new T.MeshBasicMaterial({ color: '#ffe9a8' }), off: tr(0, 5.6, 0) }], lamps);
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(glow, 3));
    scene.add(new T.Points(gg, new T.PointsMaterial({ color: '#ffcf6a', size: 5, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .8 })));
    const sp = []; for (let k = 0; k < 700; k++) { const a = Math.random() * TAU, e = Math.acos(rand(.08, 1)); sp.push(Math.cos(a) * Math.sin(e) * 1300, Math.cos(e) * 1300, Math.sin(a) * Math.sin(e) * 1300); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    W.sky.add(new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: .85, depthWrite: false })));
    const moon = new T.Mesh(new T.SphereGeometry(45, 28, 18), new T.MeshBasicMaterial({ color: '#f4f2ff', fog: false })); moon.position.set(-700, 600, -900); W.sky.add(moon);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: DOT_TEX, color: '#9fb2ff', transparent: true, opacity: .35, depthWrite: false, fog: false, blending: T.AdditiveBlending })); halo.scale.setScalar(260); halo.position.copy(moon.position); W.sky.add(halo);
  } else if (th.decor === 'city') buildCity(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'beach') buildBeach(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'canyon') buildCanyon(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'sky') buildSkyIslands(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'volcano') buildVolcano(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'forest') buildForest(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'moon') buildMoon(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'glacier') buildGlacier(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'jungle') buildJungle(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'reef') buildReef(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'alpine') buildAlpine(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'candy') buildCandy(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'haunted') buildHaunted(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'sakura') buildSakura(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'safari') buildSafari(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'fair') buildFair(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'space') buildSpace(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'provence') buildProvence(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'autumn') buildAutumn(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'tropic') buildTropic(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'antique') buildAntique(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'mall') buildMall(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'pinball') buildPinball(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'house') buildHouse(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'festival') buildFestival(W, ext, cx, cz, scatter, ring, q);
  else if (th.decor === 'cameleon') buildChameleon(W, ext, cx, cz, scatter, ring, q);
  if (W.def.cruise) buildCruise(W, ext, cx, cz);
}
function addClouds(W, ext, cx, cz, n = 16) {
  const puffs = [];
  for (let c = 0; c < n; c++) { const x = cx + rand(-ext - 400, ext + 400), z = cz + rand(-ext - 400, ext + 400), y = rand(110, 170), s = rand(10, 18);
    for (let k = 0; k < 6; k++) puffs.push({ x: x + rand(-1.7, 1.7) * s, y: y + rand(-.2, .4) * s, z: z + rand(-.8, .8) * s, sx: s * rand(.9, 1.4), sy: s * rand(.55, .85), sz: s * rand(.8, 1.2), r: 0 }); }
  instanced(W.scene, [{ geo: decorGeo('cloud'), mat: new T.MeshLambertMaterial({ color: '#ffffff', emissive: '#c8d6e8', emissiveIntensity: .5, fog: false }) }], puffs);
}

/* ---- détails communs à tous les circuits ---- */
const CHEVRON_TEX = canvasTex(256, 96, (x, w, h) => {
  x.fillStyle = '#fffdf7'; x.fillRect(0, 0, w, h); x.fillStyle = '#e2342a';
  for (let k = 0; k < 3; k++) { const o = 30 + k * 78; x.beginPath(); x.moveTo(o + 46, 10); x.lineTo(o + 6, 48); x.lineTo(o + 46, 86); x.lineTo(o + 66, 86); x.lineTo(o + 26, 48); x.lineTo(o + 66, 10); x.closePath(); x.fill(); }
  x.lineWidth = 8; x.strokeStyle = '#17143a'; x.strokeRect(4, 4, w - 8, h - 8);
}, false);
SHARED.add(CHEVRON_TEX);
function buildDetails(W) {
  const { S, scene, th, wallD } = W, N = S.N; W.noDecor = [];
  if (th.floating) { const gridM = new T.MeshBasicMaterial({ color: '#f4f2ea' }); for (let slot = 0; slot < 8; slot++) { const row = Math.floor(slot / 2), i = (N - 7 - row * 6 + N) % N, lat = (slot % 2 ? 1 : -1) * W.hw * .4; scene.add(new T.Mesh(quadAt(S, (i + 2) % N, lat, 1.5, .16, .125), gridM)); } return; }
  // tribune avec public, côté gauche près du départ
  const gi = (N - 22) % N, side = -1, off = wallD + 3.2;
  const bx = S.px[gi] + S.rx[gi] * side * off, bz = S.pz[gi] + S.rz[gi] * side * off;
  const g = new T.Group(); g.position.set(bx, S.py[gi], bz); g.rotation.y = S.hd[gi];
  const conc = lam('#cfcbe0'), roofM = stdMat(th.barrier[0], .35, .25), postM = stdMat('#1b1840', .4, .4);
  for (let t = 0; t < 4; t++) { const m = new T.Mesh(rbox(1.9, .9 * (t + 1), 34, .12), conc); m.position.set(t * 1.8 + .9, .45 * (t + 1), 0); g.add(m); }
  const roof = new T.Mesh(rbox(8.6, .3, 35, .14), roofM); roof.position.set(3.9, 6.6, 0); roof.rotation.z = -.08; g.add(roof);
  for (const z of [-16.5, 0, 16.5]) { const p = new T.Mesh(new T.CylinderGeometry(.16, .18, 6.6, 10), postM); p.position.set(7.6, 3.3, z); g.add(p); }
  const body = new T.CapsuleGeometry(.24, .34, 4, 10), head = new T.SphereGeometry(.2, 12, 10);
  const n = 4 * 26, bm = new T.InstancedMesh(body, lam('#ffffff'), n), hm = new T.InstancedMesh(head, lam('#ffffff'), n);
  const m4 = new T.Matrix4(), c = new T.Color(); const shirts = ['#ff4f3a', '#38b6ff', '#ffc531', '#3ee08f', '#7c4dff', '#ff6fb5', '#fffdf7', '#2b2b3a'];
  let q = 0;
  for (let t = 0; t < 4; t++) for (let s = 0; s < 26; s++) {
    const x = t * 1.8 + .9 + rand(-.25, .25), y = .9 * (t + 1), z = -15.5 + s * 1.24 + rand(-.2, .2);
    m4.makeTranslation(x, y + .42, z); bm.setMatrixAt(q, m4); c.set(pick(shirts)); bm.setColorAt(q, c);
    m4.makeTranslation(x, y + .95, z); hm.setMatrixAt(q, m4); c.set(pick(SKINS)); hm.setColorAt(q, c); q++;
  }
  g.add(bm); g.add(hm); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g); W.crowd = { g, phase: 0 };
  W.noDecor.push({ x: bx - S.rx[gi] * side * -6, z: bz - S.rz[gi] * side * -6, r: 32 });

  // fanions le long de la ligne droite
  const pos = [], col = []; const cols = [th.curb[0], th.barrier[0], '#ffc531', '#38b6ff', '#fffdf7'];
  const pole = new T.CylinderGeometry(.08, .1, 4.6, 8), poleM = stdMat('#e9ecf4', .3, .7);
  for (const sg of [-1, 1]) {
    const pts = [];
    for (let k = -3; k <= 3; k++) { const i = (k * 11 + N) % N, d = sg * (wallD + .9); const p = new T.Vector3(S.px[i] + S.rx[i] * d, S.py[i] + 4.4, S.pz[i] + S.rz[i] * d); pts.push(p);
      const pm = new T.Mesh(pole, poleM); pm.position.set(p.x, S.py[i] + 2.2, p.z); scene.add(pm); }
    for (let k = 0; k < pts.length - 1; k++) {
      const A = pts[k], B = pts[k + 1];
      const at = (t) => new T.Vector3().lerpVectors(A, B, t).add(new T.Vector3(0, -Math.sin(t * Math.PI) * .9, 0));
      for (let f = 0; f < 9; f++) {
        const t0 = (f + .1) / 9, t1 = (f + .9) / 9, p0 = at(t0), p1 = at(t1), pm = at((t0 + t1) / 2).add(new T.Vector3(0, -.75, 0));
        pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, pm.x, pm.y, pm.z); c.set(cols[(f + k) % cols.length]); for (let v = 0; v < 3; v++) col.push(c.r, c.g, c.b);
      }
    }
  }
  const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); fg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  scene.add(new T.Mesh(fg, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide })));

  // panneaux de virage + piles de pneus à l'extérieur des épingles
  const signG = new T.PlaneGeometry(4.2, 1.6), signM = new T.MeshBasicMaterial({ map: CHEVRON_TEX, side: T.DoubleSide });
  const postG = new T.CylinderGeometry(.09, .09, 2.2, 8);
  const tires = []; let lastI = -999; const nearWin = (i) => W.branches.some((B) => (i >= B.winA[0] - 12 && i <= B.winA[1] + 24) || (i >= B.winB[0] - 24 && i <= B.winB[1] + 12));
  for (let i = 0; i < N; i += 4) {
    let cs = 0; for (let o = 0; o < 40; o += 2) cs += S.curv[(i + o) % N]; cs *= 2;
    if (Math.abs(cs) < .85 || i - lastI < 70 || S.glide[(i + 4) % N] || S.glide[(i + 20) % N] || nearWin(i) || nearWin(i + 20)) continue;
    lastI = i; const sg = cs > 0 ? 1 : -1, si = (i + 4) % N, d = sg * (wallD + .7);
    const sx = S.px[si] + S.rx[si] * d, sz = S.pz[si] + S.rz[si] * d;
    const sm = new T.Mesh(signG, signM); sm.position.set(sx, S.py[si] + 2.6, sz); sm.rotation.y = S.hd[si] + Math.PI; if (cs < 0) sm.scale.x = -1; scene.add(sm);
    for (const o of [-1.6, 1.6]) { const p = new T.Mesh(postG, postM); p.position.set(sx + S.rx[si] * o, S.py[si] + 1.1, sz + S.rz[si] * o); scene.add(p); }
    for (let k = 0; k < 3; k++) { const ti = (i + 14 + k * 3) % N, dd = sg * (wallD + 1.5); for (let h = 0; h < 4; h++) tires.push({ x: S.px[ti] + S.rx[ti] * dd, y: S.py[ti] + .2 + h * .36, z: S.pz[ti] + S.rz[ti] * dd, s: 1, r: 0 }); }
  }
  const tg = new T.TorusGeometry(.48, .2, 8, 18); tg.rotateX(Math.PI / 2);
  instanced(scene, [{ geo: tg, mat: lam('#ffffff'), colors: ['#24222f', '#24222f', th.curb[0], '#24222f'] }], tires);

  // marquages de la grille de départ
  const gridM = new T.MeshBasicMaterial({ color: '#f4f2ea' });
  for (let slot = 0; slot < 8; slot++) { const row = Math.floor(slot / 2), i = (N - 7 - row * 6 + N) % N, lat = (slot % 2 ? 1 : -1) * W.hw * .4; scene.add(new T.Mesh(quadAt(S, (i + 2) % N, lat, 1.5, .16, .125), gridM)); }
}

function buildCity(W, ext, cx, cz, scatter, ring, q) {
  const { S, scene } = W;
  const winTex = canvasTex(128, 256, (x, w, h) => { x.fillStyle = '#16142b'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 6; c++) { x.fillStyle = Math.random() < .55 ? pick(['#ffe7a0', '#ffd27a', '#bde4ff', '#ff9ad5', '#9ff3ff']) : '#272442'; x.fillRect(9 + c * 19.5, 8 + r * 15.5, 11, 9); } x.fillStyle = '#0f0d20'; x.fillRect(0, 0, w, 6); }, false);
  const bmat = new T.MeshLambertMaterial({ map: winTex, emissiveMap: winTex, emissive: '#ffffff', emissiveIntensity: .9 });
  const bgeo = new T.BoxGeometry(1, 1, 1); bgeo.translate(0, .5, 0);
  const tint = ['#ffffff', '#d6d0ff', '#ffd6ee', '#cfeaff', '#e8e4ff'];
  instanced(scene, [{ geo: bgeo, mat: bmat, colors: tint }], scatter(120 * q, 26, 220, 1, 1).map((p) => Object.assign(p, { sx: rand(12, 22), sy: rand(16, 60), sz: rand(12, 22), r: rand(-.3, .3) })));
  instanced(scene, [{ geo: bgeo, mat: bmat, colors: tint }], ring(46, 230, 420).map((p) => Object.assign(p, { sx: rand(26, 50), sy: rand(70, 200), sz: rand(26, 50), y: 0 })));
  const roofG = new T.CylinderGeometry(.5, .5, 1, 6); roofG.translate(0, .5, 0);
  // enseignes néon et lampadaires colorés
  const neonCols = ['#ff2fa8', '#2ee6ff', '#ffe14d', '#8b5cff'];
  const signs = [], posts = [], lights = { '#ff2fa8': [], '#2ee6ff': [] };
  for (let i = 0; i < S.N; i += 22) {
    const sg = (i / 22) % 2 ? 1 : -1, d = sg * (W.wallD + 3.5);
    signs.push({ x: S.px[i] + S.rx[i] * d, y: S.py[i] + rand(4, 7), z: S.pz[i] + S.rz[i] * d, sx: rand(4, 7), sy: .9, sz: .25, r: S.hd[i] });
    for (const s2 of [-1, 1]) { const d2 = s2 * (W.wallD + 1); const x = S.px[i] + S.rx[i] * d2, z = S.pz[i] + S.rz[i] * d2; posts.push({ x, z, y: S.py[i], s: 1, r: 0 }); lights[s2 < 0 ? '#ff2fa8' : '#2ee6ff'].push(x, S.py[i] + 5.6, z); }
  }
  instanced(scene, [{ geo: new T.BoxGeometry(1, 1, 1), mat: new T.MeshBasicMaterial({ color: '#ffffff' }), colors: neonCols }], signs);
  instanced(scene, [{ geo: decorGeo('post'), mat: lam('#14122a'), off: tr(0, 2.7, 0) }, { geo: decorGeo('bulb'), mat: new T.MeshBasicMaterial({ color: '#ffffff' }), off: tr(0, 5.6, 0), colors: ['#ff8fd0', '#9ff3ff'] }], posts);
  for (const k in lights) { const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(lights[k], 3)); scene.add(new T.Points(gg, new T.PointsMaterial({ color: k, size: 6, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .85 }))); }
  const sp = []; for (let k = 0; k < 300; k++) { const a = Math.random() * TAU, e = Math.acos(rand(.25, 1)); sp.push(Math.cos(a) * Math.sin(e) * 1300, Math.cos(e) * 1300, Math.sin(a) * Math.sin(e) * 1300); }
  const sg2 = new T.BufferGeometry(); sg2.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
  W.sky.add(new T.Points(sg2, new T.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .6, depthWrite: false })));
}

function buildBeach(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const wx = W.waterX;
  const n1 = fbm(4, 4, 301), n2 = tileNoise(64, 311);
  const wt = pixelTex(256, 256, (u, v) => { const a = n1(u, v), b = n2(u, v); const k = .82 + a * .3 + (b - .5) * .1; const foam = a > .72 ? (a - .72) * 3 : 0; return mix3(mulc([22, 140, 190], k), [235, 250, 255], clamp(foam, 0, .6)); });
  wt.repeat.set(60, 80); W.waterTex = wt;
  const water = new T.Mesh(new T.PlaneGeometry(3000, 4000), new T.MeshStandardMaterial({ map: wt, roughness: .12, metalness: .15, transparent: true, opacity: .94, envMapIntensity: 1.2 }));
  water.rotation.x = -Math.PI / 2; water.position.set(wx + 1500, .05, cz); scene.add(water);
  const foam = new T.Mesh(new T.PlaneGeometry(5, 4000), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, depthWrite: false })); foam.rotation.x = -Math.PI / 2; foam.position.set(wx + 1.5, .08, cz); scene.add(foam); W.foam = foam;
  const wet = new T.Mesh(new T.PlaneGeometry(16, 4000), new T.MeshLambertMaterial({ color: '#c8955a', polygonOffset: true, polygonOffsetFactor: 1 })); wet.rotation.x = -Math.PI / 2; wet.position.set(wx - 7, -.06, cz); scene.add(wet);
  // palmiers
  const trunkM = lam('#9a6b43'), leafM = lam('#ffffff', { side: T.DoubleSide }); const leafC = ['#2f9a46', '#3bb055', '#268a3e'];
  const parts = [];
  for (let s = 0; s < 6; s++) { const gseg = new T.CylinderGeometry(.3 - s * .025, .36 - s * .025, 1.55, 9); parts.push({ geo: gseg, mat: trunkM, off: trs(s * s * .045, .78 + s * 1.45, 0, 0, 0, -s * .05) }); }
  const topX = 1.6, topY = 8.8;
  const frond = new T.CapsuleGeometry(.3, 3, 4, 10); frond.scale(1, 1, .22); frond.rotateZ(-Math.PI / 2); frond.translate(1.7, 0, 0); frond.rotateZ(-.42);
  for (let f = 0; f < 7; f++) parts.push({ geo: frond, mat: leafM, off: trs(topX, topY, 0, 0, f / 7 * TAU + .3, 0), colors: leafC });
  const nut = new T.SphereGeometry(.22, 10, 8); for (let f = 0; f < 3; f++) parts.push({ geo: nut, mat: lam('#6b4a2b'), off: tr(topX + Math.cos(f * 2.1) * .3, topY - .3, Math.sin(f * 2.1) * .3) });
  instanced(scene, parts, scatter(110 * q, 6, 240, .8, 1.25));
  // parasols, serviettes, rochers
  const near = scatter(260 * q, 4, 400, .9, 1.2).filter((p) => p.x > wx - 45).slice(0, 26);
  instanced(scene, [{ geo: new T.CylinderGeometry(.06, .06, 2.7, 6), mat: lam('#f2efe6'), off: tr(0, 1.35, 0) }, { geo: new T.ConeGeometry(1.7, .8, 14), mat: lam('#ffffff'), off: tr(0, 2.9, 0), colors: ['#ff4f3a', '#ffc531', '#38b6ff', '#ff6fb5', '#3ee08f'] },
    { geo: new T.BoxGeometry(1.1, .05, 2.1), mat: lam('#ffffff'), off: tr(1.6, .02, .4), colors: ['#7c4dff', '#ff6fb5', '#38b6ff', '#ffc531'] }], near);
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#c9a27a', '#b38a62', '#d8b48a'] }], scatter(60 * q, 3, 220, .6, 1.8));
  const isl = []; for (let k = 0; k < 7; k++) { const r = rand(40, 90); isl.push({ x: wx + rand(260, 700), z: cz + rand(-700, 700), y: -2, sx: r, sy: rand(14, 34), sz: r * rand(.7, 1.2), r: 0 }); }
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#4f9a42', '#69b452', '#d9b47a'] }], isl);
  addClouds(W, ext, cx, cz, 10);
}

/* ---- circuits à planeur : décors spécifiques ---- */
const LAVA_TEX = (() => { const n1 = fbm(4, 4, 501), n2 = tileNoise(64, 507); const t = pixelTex(256, 256, (u, v) => { const a = n1(u, v), b = n2(u, v); const k = clamp((a - .35) * 2.2, 0, 1);
  return mix3(mix3([60, 12, 8], [255, 90, 20], k), [255, 225, 120], clamp((a - .62) * 3 + (b - .5) * .3, 0, 1)); }); SHARED.add(t); return t; })();
function cliffQuad(S, i, th, wallD, facing) {
  const bottom = th.terrain ? S.py[i] - (th.terrain.drop || 22) - 4 : th.skirtDepth ? S.py[i] - th.skirtDepth : (th.groundY != null ? th.groundY : -1);
  const rx = S.rx[i], rz = S.rz[i], x = S.px[i], z = S.pz[i], y = S.py[i] + .06;
  const P = (o, yy) => [x + rx * o, yy, z + rz * o];
  const pos = [...P(-wallD, bottom), ...P(wallD, bottom), ...P(-wallD, y), ...P(wallD, y)];
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 4, 0, 0, 1, 4, 1], 2)); g.setIndex(facing > 0 ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3]); g.computeVertexNormals(); return g;
}
function buildGlideBits(W) {
  const { S, scene, th, def, wallD, hw } = W; if (!def.glide) return;
  const skirtM = new T.MeshLambertMaterial({ map: skirtTex(th.skirt), side: T.DoubleSide });
  const padM = new T.MeshBasicMaterial({ map: BOOST_TEX, color: '#8fd8ff', transparent: true, opacity: .97 });
  for (const [a, b] of def.glide) {
    const i0 = Math.floor(a * S.N), i1 = Math.floor(b * S.N) % S.N;
    scene.add(new T.Mesh(cliffQuad(S, i0, th, wallD, 1), skirtM)); scene.add(new T.Mesh(cliffQuad(S, i1, th, wallD, -1), skirtM));
    scene.add(new T.Mesh(quadAt(S, (i0 - 5 + S.N) % S.N, 0, hw * .92, 3.2, .15), padM));
    if (th.lava) { const mid = Math.floor((i0 + i1) / 2) % S.N; const pool = new T.Mesh(new T.CircleGeometry(75, 40), new T.MeshBasicMaterial({ map: LAVA_TEX }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(S.px[mid], .06, S.pz[mid]); scene.add(pool); W.lavaGlow = true; }
  }
}
function buildCanyon(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const reds = ['#b4532f', '#c8643a', '#9a4426', '#d07a4a'];
  instanced(scene, [{ geo: decorGeo('mesa'), mat: lam('#ffffff'), colors: reds }], scatter(70 * q, 16, 260, 1, 1).map((p) => Object.assign(p, { sx: rand(6, 14), sy: rand(20, 55), sz: rand(6, 14) })));
  instanced(scene, [{ geo: decorGeo('mesa'), mat: lam('#ffffff'), colors: reds }], ring(28, 260, 460).map((p) => { const r = rand(50, 110); return Object.assign(p, { sx: r, sy: rand(40, 110), sz: r }); }));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .6, 0), colors: reds }], scatter(170 * q, 3, 240, .6, 2.4));
  instanced(scene, [{ geo: decorGeo('drybush'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#9a7a45', '#8a6c3c'] }], scatter(100 * q, 2, 160, .6, 1.3));
  const cc = ['#4c9a4a', '#58a852']; const cmat = lam('#ffffff');
  instanced(scene, [{ geo: decorGeo('cactus'), mat: cmat, off: tr(0, 2.9, 0), colors: cc }, { geo: decorGeo('arm'), mat: cmat, off: tr(1.32, 4.3, 0), colors: cc }, { geo: decorGeo('armH'), mat: cmat, off: tr(.8, 3.3, 0), colors: cc }], scatter(60 * q, 5, 220, .7, 1.3));
  addClouds(W, ext, cx, cz, 8);
}
function buildSkyIslands(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W;
  if (!DECOR.island) { const g = new T.ConeGeometry(1, 1.8, 12, 4); g.rotateX(Math.PI); g.translate(0, -.9, 0); wobble(g, .14, 2.4, 3); DECOR.island = smooth(g, 70); DECOR.island.userData.keep = true;
    const c = new T.CylinderGeometry(1.04, 1, .22, 16); c.translate(0, .1, 0); DECOR.islandTop = c; c.userData.keep = true; }
  const isl = scatter(90 * q, 20, 420, 1, 1).map((p) => Object.assign(p, { y: rand(-20, 70), s: rand(8, 26) }));
  ring(18, 320, 520).forEach((p) => isl.push(Object.assign(p, { y: rand(0, 120), s: rand(40, 90) })));
  instanced(scene, [{ geo: DECOR.island, mat: lam('#ffffff'), colors: ['#8a6a4f', '#7a5c44', '#9c7a5a'] }, { geo: DECOR.islandTop, mat: lam('#ffffff'), colors: ['#5fb84a', '#4fa83f', '#6cc152'] }], isl);
  const trees = isl.filter((p, i) => i % 2 === 0 && p.s < 30).map((p) => ({ x: p.x + rand(-.3, .3) * p.s, y: p.y + .2, z: p.z + rand(-.3, .3) * p.s, s: p.s / 12, r: rand(0, TAU) }));
  instanced(scene, [{ geo: decorGeo('trunk'), mat: lam('#7a5233'), off: tr(0, 2.2, 0) }, { geo: decorGeo('crown'), mat: lam('#ffffff'), off: tr(0, 6.2, 0), colors: ['#3f9a3c', '#62c04f', '#ff8fc8'] }], trees);
  const puffs = []; for (let c = 0; c < 26; c++) { const x = cx + rand(-ext - 500, ext + 500), z = cz + rand(-ext - 500, ext + 500), y = rand(-30, 20), s = rand(14, 26);
    for (let k = 0; k < 6; k++) puffs.push({ x: x + rand(-1.7, 1.7) * s, y: y + rand(-.2, .4) * s, z: z + rand(-.8, .8) * s, sx: s * rand(.9, 1.4), sy: s * rand(.55, .85), sz: s * rand(.8, 1.2), r: 0 }); }
  instanced(scene, [{ geo: decorGeo('cloud'), mat: new T.MeshLambertMaterial({ color: '#ffffff', emissive: '#dfe9ff', emissiveIntensity: .55 }) }], puffs);
  addClouds(W, ext, cx, cz, 10);
}
function buildVolcano(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W;
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#2e2830', '#3a3238', '#241f26'] }], scatter(220 * q, 3, 260, .6, 2.6));
  const pools = scatter(40 * q, 24, 240, 1, 1).map((p) => Object.assign(p, { s: rand(4, 12), y: .05 }));
  const pg = new T.CircleGeometry(1, 28); pg.rotateX(-Math.PI / 2);
  instanced(scene, [{ geo: pg, mat: new T.MeshBasicMaterial({ map: LAVA_TEX }) }], pools);
  const glow = []; for (const p of pools) glow.push(p.x, 1.5, p.z);
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(glow, 3));
  scene.add(new T.Points(gg, new T.PointsMaterial({ color: '#ff6a1a', size: 14, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .5 })));
  const vol = new T.Mesh(new T.CylinderGeometry(60, 330, 340, 40, 6, true), lam('#2a2228', { side: T.DoubleSide })); const a = rand(0, TAU), r = ext + 520;
  wobble(vol.geometry, .05, .02, 4, true); vol.geometry.computeVertexNormals(); vol.position.set(cx + Math.cos(a) * r, 168, cz + Math.sin(a) * r); scene.add(vol);
  const crater = new T.Sprite(new T.SpriteMaterial({ map: DOT_TEX, color: '#ff5a1a', transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending, fog: false })); crater.scale.set(260, 120, 1); crater.position.set(vol.position.x, 350, vol.position.z); scene.add(crater);
  instanced(scene, [{ geo: decorGeo('mountain'), mat: lam('#2c242a') }], ring(16, 300, 480).map((p) => { const rr = rand(90, 160); return Object.assign(p, { sx: rr, sy: rand(90, 170), sz: rr }); }));
  const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-60, 60); }
  const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const ep = new T.Points(eg, new T.PointsMaterial({ color: '#ff8a3a', size: .35, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); ep.frustumCulled = false; scene.add(ep);
  W.embers = { p: ep, pos, n };
  const sp = []; for (let k = 0; k < 250; k++) { const aa = Math.random() * TAU, e = Math.acos(rand(.3, 1)); sp.push(Math.cos(aa) * Math.sin(e) * 1300, Math.cos(e) * 1300, Math.sin(aa) * Math.sin(e) * 1300); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
  W.sky.add(new T.Points(sg, new T.PointsMaterial({ color: '#ffd0c0', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .5, depthWrite: false })));
}
let GLIDER_GEO = null;
function gliderGeo() {
  if (GLIDER_GEO) return GLIDER_GEO;
  const wing = extrudeSide(airfoilShape(1.15, .16), 3.9, .04, 2); const stripe = extrudeSide(airfoilShape(1.17, .17), .55, .03, 2);
  const s = []; for (const sg of [-1, 1]) { const a = new T.Vector3(sg * .26, -.95, .05), b = new T.Vector3(sg * 1.0, -.02, 0); const d = new T.Vector3().subVectors(b, a); const g = new T.CapsuleGeometry(.035, d.length(), 4, 8);
    g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), new T.Vector3(1, 1, 1))); s.push(g); }
  GLIDER_GEO = { wing, stripe, struts: mergeGeos(s) }; for (const k in GLIDER_GEO) GLIDER_GEO[k].userData.keep = true; return GLIDER_GEO;
}

/* ---- v5 : tunnels, forêt, Lune, glacier, jungle ---- */
let WATER_TEX = null;
function waterTex() { if (WATER_TEX) return WATER_TEX; const n1 = fbm(4, 4, 301), n2 = tileNoise(64, 311);
  WATER_TEX = pixelTex(256, 256, (u, v) => { const a = n1(u, v), b = n2(u, v); const k = .82 + a * .3 + (b - .5) * .1; const foam = a > .72 ? (a - .72) * 3 : 0; return mix3(mulc([22, 140, 190], k), [235, 250, 255], clamp(foam, 0, .6)); });
  SHARED.add(WATER_TEX); return WATER_TEX; }
function buildTunnels(W) {
  const { S, scene, def, th, wallD } = W; if (!def.tunnels) return;
  if (th.tunnel === 'fun' || th.tunnel === 'metal') { tunnelOn(W, S, def.tunnels.map(([a, b]) => [Math.floor(a * S.N), Math.floor(b * S.N)]), th.tunnel); return; }
  const wood = th.tunnel === 'wood';
  const tex = pixelTex(128, 128, (u, v) => { const n = Math.sin(u * TAU * 6 + Math.sin(v * TAU * 2) * 2) * .5 + .5; return wood ? mulc(mix3([92, 58, 34], [140, 96, 58], n), .9 + Math.random() * .1) : mulc(mix3([70, 66, 80], [110, 104, 120], n), .9 + Math.random() * .1); });
  tex.repeat.set(1, 6);
  const mat = new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide }); const r = wallD + .8, segs = 18;
  const lights = [];
  for (const [a, b] of def.tunnels) {
    const i0 = Math.floor(a * S.N), i1 = Math.floor(b * S.N); const pos = [], uv = [], idx = []; let rows = 0;
    for (let k = i0; k <= i1; k += 2) { const i = k % S.N;
      for (let s = 0; s <= segs; s++) { const t = s / segs * Math.PI, c = Math.cos(t) * r, h = Math.sin(t) * r * .62 + .06; pos.push(S.px[i] + S.rx[i] * c, S.py[i] + h, S.pz[i] + S.rz[i] * c); uv.push(s / segs, (k - i0) / 40); }
      if (k > i0) for (let s = 0; s < segs; s++) { const p0 = (rows - 1) * (segs + 1) + s, p1 = p0 + 1, q0 = rows * (segs + 1) + s, q1 = q0 + 1; idx.push(p0, q0, p1, p1, q0, q1); }
      rows++; if ((k - i0) % 12 === 0) lights.push(S.px[i], S.py[i] + r * .62 - .4, S.pz[i]); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    scene.add(new T.Mesh(g, mat));
    for (const i of [i0 % S.N, i1 % S.N]) { const p = new T.Mesh(new T.TorusGeometry(r, .9, 10, 30, Math.PI), stdMat(wood ? '#5a3a22' : '#4a4658', .7, .1)); p.scale.set(1, .62, 1); p.position.set(S.px[i], S.py[i] + .06, S.pz[i]); p.rotation.y = S.hd[i]; scene.add(p); }
  }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lights, 3));
  scene.add(new T.Points(lg, new T.PointsMaterial({ color: wood ? '#ffd27a' : '#bde4ff', size: 4, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
}
function palmParts(trunkCol, leafCols) {
  const trunkM = lam(trunkCol), leafM = lam('#ffffff', { side: T.DoubleSide }); const parts = [];
  for (let s = 0; s < 6; s++) { const gseg = new T.CylinderGeometry(.3 - s * .025, .36 - s * .025, 1.55, 9); parts.push({ geo: gseg, mat: trunkM, off: trs(s * s * .045, .78 + s * 1.45, 0, 0, 0, -s * .05) }); }
  const frond = new T.CapsuleGeometry(.3, 3, 4, 10); frond.scale(1, 1, .22); frond.rotateZ(-Math.PI / 2); frond.translate(1.7, 0, 0); frond.rotateZ(-.42);
  for (let f = 0; f < 7; f++) parts.push({ geo: frond, mat: leafM, off: trs(1.6, 8.8, 0, 0, f / 7 * TAU + .3, 0), colors: leafCols });
  return parts;
}
function addFireflies(W, color, n = 220) {
  const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-60, 60); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const p = new T.Points(g, new T.PointsMaterial({ color, size: .45, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); p.frustumCulled = false; W.scene.add(p);
  W.embers = { p, pos, n, slow: true };
}
function addStars(W, n, minE, op) { const sp = []; for (let k = 0; k < n; k++) { const a = Math.random() * TAU, e = Math.acos(rand(minE, 1)); sp.push(Math.cos(a) * Math.sin(e) * 1300, Math.cos(e) * 1300, Math.sin(a) * Math.sin(e) * 1300); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); W.sky.add(new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: op, depthWrite: false }))); }
function buildForest(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W;
  const tc = ['#1f5a4a', '#2a6b52', '#184a3e', '#2f7a5c'];
  instanced(scene, [{ geo: new T.CylinderGeometry(1.1, 1.9, 18, 10), mat: lam('#4a3020'), off: tr(0, 9, 0) }, { geo: decorGeo('crown'), mat: lam('#ffffff'), off: trs(0, 19, 0, 0, 0, 0, 2.4), colors: tc },
    { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: trs(2.5, 15, 1.5, 0, 0, 0, 2), colors: tc }], scatter(150 * q, 8, 260, .8, 1.4));
  instanced(scene, [{ geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, .7, 0), colors: ['#1f5a3a', '#2a6b42'] }], scatter(150 * q, 3, 160, .8, 1.6));
  const cap = new T.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2); cap.scale(1, .6, 1);
  instanced(scene, [{ geo: new T.CylinderGeometry(.25, .35, 1.6, 8), mat: lam('#e9e0c8'), off: tr(0, .8, 0) }, { geo: cap, mat: new T.MeshBasicMaterial({ color: '#ffffff' }), off: tr(0, 1.55, 0), colors: ['#2ee6ff', '#ff6fd8', '#a87dff', '#7dff9a'] }],
    scatter(160 * q, 2, 120, .6, 1.8));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#3a4a48', '#2e3c3a'] }], scatter(60 * q, 3, 200, .6, 1.6));
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#123a30', '#184438'] }], ring(24, 260, 420).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(50, 110), sz: rand(90, 170) })));
  addFireflies(W, '#e4ff7a'); addStars(W, 300, .3, .6);
}
function buildMoon(W, ext, cx, cz, scatter, ring, q) {
  const { scene, S, def } = W;
  const crater = new T.TorusGeometry(1, .28, 8, 28); crater.rotateX(Math.PI / 2); crater.scale(1, .5, 1);
  const cr = scatter(70 * q, 8, 300, 1, 1).map((p) => Object.assign(p, { s: rand(4, 18), y: 0 }));
  for (const [a, b] of def.glide || []) { const i = Math.floor((a + b) / 2 * S.N); cr.push({ x: S.px[i], z: S.pz[i], y: 0, s: 34, r: 0, g: 1 }); }
  instanced(scene, [{ geo: crater, mat: lam('#ffffff'), colors: ['#7a7a84', '#6a6a74', '#8a8a94'] }], cr);
  const disc = new T.CircleGeometry(1, 28); disc.rotateX(-Math.PI / 2); instanced(scene, [{ geo: disc, mat: lam('#4a4a52'), off: tr(0, .03, 0) }], cr);
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#8a8a94', '#6a6a74'] }], scatter(140 * q, 3, 260, .5, 2.2));
  const dome = new T.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2);
  const base = scatter(10, 20, 200, 1, 1).map((p) => Object.assign(p, { s: rand(5, 10), y: 0 }));
  instanced(scene, [{ geo: dome, mat: stdMat('#e9ecf4', .3, .5) }, { geo: new T.CylinderGeometry(.06, .06, 3, 6), mat: lam('#c8ccd8'), off: tr(.6, 1.6, 0) }, { geo: new T.SphereGeometry(.15, 8, 6), mat: new T.MeshBasicMaterial({ color: '#ff4f3a' }), off: tr(.6, 3.1, 0) }], base);
  instanced(scene, [{ geo: decorGeo('mountain'), mat: lam('#5a5a64') }], ring(18, 300, 480).map((p) => { const r = rand(90, 170); return Object.assign(p, { sx: r, sy: rand(60, 140), sz: r }); }));
  const et = canvasTex(256, 256, (x, w) => { x.fillStyle = '#2a6fd6'; x.fillRect(0, 0, w, w); x.fillStyle = '#3e9b4a'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * w, rand(15, 50), rand(10, 30), rand(0, 3), 0, TAU); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 20; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * w, rand(15, 60), rand(4, 10), rand(0, 3), 0, TAU); x.fill(); } });
  const earth = new T.Mesh(new T.SphereGeometry(110, 32, 20), new T.MeshBasicMaterial({ map: et, fog: false })); earth.position.set(-650, 520, -850); W.sky.add(earth);
  addStars(W, 900, .02, .95);
}
function buildGlacier(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W;
  const ice = ['#bfe6ff', '#9fd4ff', '#e0f4ff', '#8fc8f0'];
  if (!DECOR.berg) { const g = new T.ConeGeometry(1, 2, 7, 3); g.translate(0, 1, 0); wobble(g, .22, 2, 6, true); DECOR.berg = smooth(g, 40); DECOR.berg.userData.keep = true; }
  instanced(scene, [{ geo: DECOR.berg, mat: new T.MeshStandardMaterial({ color: '#ffffff', roughness: .15, metalness: .1 }), colors: ice }], scatter(80 * q, 6, 240, 1, 1).map((p) => Object.assign(p, { sx: rand(3, 9), sy: rand(5, 16), sz: rand(3, 9), y: -.2 })));
  const pg = ['#2f6b52', '#2a5f4a'];
  instanced(scene, [{ geo: decorGeo('ptrunk'), mat: lam('#5b4030'), off: tr(0, 1, 0) }, { geo: decorGeo('pine1'), mat: lam('#ffffff'), off: tr(0, 3.6, 0), colors: pg }, { geo: decorGeo('pine2'), mat: lam('#ffffff'), off: tr(0, 5.5, 0), colors: pg }, { geo: decorGeo('pine3'), mat: lam('#eef4ff'), off: tr(0, 7.3, 0) }], scatter(160 * q, 6, 260, .8, 1.5));
  const lake = new T.CircleGeometry(1, 32); lake.rotateX(-Math.PI / 2);
  instanced(scene, [{ geo: lake, mat: new T.MeshStandardMaterial({ color: '#a8dcff', roughness: .05, metalness: .3 }), off: tr(0, .02, 0) }], scatter(10, 18, 220, 1, 1).map((p) => Object.assign(p, { s: rand(12, 30), y: 0 })));
  const mtn = ring(22, 260, 460).map((p) => { const r = rand(90, 170); return Object.assign(p, { sx: r, sy: rand(140, 260), sz: r }); });
  instanced(scene, [{ geo: decorGeo('mountain'), mat: lam('#ffffff', { vertexColors: true }) }], mtn);
  const at = canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(120,255,190,0)'); g.addColorStop(.55, 'rgba(120,255,190,.55)'); g.addColorStop(.8, 'rgba(150,120,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false);
  W.auroras = [];
  for (let k = 0; k < 3; k++) { const a = new T.Mesh(new T.PlaneGeometry(1500, 360, 24, 1), new T.MeshBasicMaterial({ map: at, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, side: T.DoubleSide }));
    const ang = k * 2.1; a.position.set(Math.cos(ang) * 1000, 420 + k * 60, Math.sin(ang) * 1000); a.lookAt(0, 420, 0); W.sky.add(a); W.auroras.push(a); }
  addClouds(W, ext, cx, cz, 8);
}
function buildJungle(W, ext, cx, cz, scatter, ring, q) {
  const { scene, S, def } = W;
  const gc = ['#1f7a3a', '#2a8a44', '#176a32', '#36a050'];
  instanced(scene, [{ geo: new T.CylinderGeometry(.7, 1.1, 10, 9), mat: lam('#5a3d28'), off: tr(0, 5, 0) }, { geo: decorGeo('crown'), mat: lam('#ffffff'), off: trs(0, 11, 0, 0, 0, 0, 1.7), colors: gc }, { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: trs(-2, 9, 1, 0, 0, 0, 1.5), colors: gc }], scatter(170 * q, 6, 260, .8, 1.4));
  instanced(scene, palmParts('#7a5a3a', gc), scatter(70 * q, 5, 220, .8, 1.3));
  const fern = new T.CapsuleGeometry(.4, 2.6, 4, 8); fern.scale(1, 1, .2); fern.rotateZ(-Math.PI / 2); fern.translate(1.4, 0, 0); fern.rotateZ(-.7);
  const fparts = []; for (let f = 0; f < 6; f++) fparts.push({ geo: fern, mat: lam('#ffffff', { side: T.DoubleSide }), off: trs(0, .8, 0, 0, f / 6 * TAU, 0), colors: gc });
  instanced(scene, fparts, scatter(150 * q, 2, 140, .6, 1.2));
  // temples en escalier et colonnes en ruine
  const stoneM = lam('#ffffff'), sc = ['#8a8f7a', '#7a806a', '#9aa08a'];
  const temples = scatter(8, 26, 230, 1, 1).map((p) => Object.assign(p, { s: rand(1.4, 2.4), r: rand(0, TAU) }));
  const tparts = []; for (let l = 0; l < 5; l++) { const g = new T.BoxGeometry(14 - l * 2.6, 2.6, 14 - l * 2.6); tparts.push({ geo: g, mat: stoneM, off: tr(0, 1.3 + l * 2.6, 0), colors: sc }); }
  tparts.push({ geo: new T.BoxGeometry(2.2, 2.4, 2.2), mat: stoneM, off: tr(0, 14.2, 0), colors: sc });
  instanced(scene, tparts, temples);
  instanced(scene, [{ geo: new T.CylinderGeometry(.8, .9, 7, 10), mat: stoneM, off: tr(0, 3.5, 0), colors: sc }], scatter(40 * q, 5, 160, .6, 1.2).map((p) => Object.assign(p, { sy: rand(.4, 1.1) })));
  const wt = waterTex(); const wm = new T.MeshStandardMaterial({ map: wt, roughness: .12, metalness: .15, transparent: true, opacity: .92 });
  for (const [a, b] of def.glide || []) { const i = Math.floor((a + b) / 2 * S.N) % S.N; const river = new T.Mesh(new T.PlaneGeometry(60, W.hAt ? 220 : 700), wm); river.rotation.x = -Math.PI / 2; river.rotation.z = -S.hd[i] + Math.PI / 2; river.position.set(S.px[i], W.hAt ? W.hAt(S.px[i], S.pz[i]) + 1.2 : .05, S.pz[i]); scene.add(river); }
  W.waterTex = wt;
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#1f6a34', '#2a7a40'] }], ring(26, 260, 430).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(60, 130), sz: rand(90, 170) })));
  addClouds(W, ext, cx, cz, 10);
}

/* ================= v7 : modèles des obstacles et tremplins ================= */
const RAMP_TEX = canvasTex(128, 256, (x, w, h) => {
  x.fillStyle = '#ff8a1e'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffc531';
  for (let k = 0; k < 4; k++) { const o = k * 64; x.beginPath(); x.moveTo(0, o + 40); x.lineTo(w / 2, o); x.lineTo(w, o + 40); x.lineTo(w, o + 64); x.lineTo(w / 2, o + 24); x.lineTo(0, o + 64); x.closePath(); x.fill(); }
  x.strokeStyle = '#17143a'; x.lineWidth = 8; x.strokeRect(0, 0, w, h);
});
SHARED.add(RAMP_TEX);
function rampGeo(P, i, hw, len, hgt) {
  // coin incliné posé sur la route : bas au début, haut à la fin
  const n = 6, pos = [], uv = [], idx = [];
  const at = (f, side, up) => { const j = clamp(i + Math.round(f * len / P.seg), 0, P.N - 1); return [P.px[j] + P.rx[j] * side * hw, P.py[j] + .12 + up, P.pz[j] + P.rz[j] * side * hw]; };
  for (let s = 0; s <= n; s++) { const f = s / n, y = hgt * f * f * .35 + hgt * f * .65; pos.push(...at(f, -1, y), ...at(f, 1, y)); uv.push(0, f * 2, 1, f * 2); if (s < n) { const a = s * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const base = pos.length / 3; // face arrière
  pos.push(...at(1, -1, 0), ...at(1, 1, 0), ...at(1, -1, hgt), ...at(1, 1, hgt)); uv.push(0, 0, 1, 0, 0, .2, 1, .2); idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  for (const side of [-1, 1]) { const b2 = pos.length / 3; for (let s = 0; s <= n; s++) { const f = s / n, y = hgt * f * f * .35 + hgt * f * .65; pos.push(...at(f, side, 0), ...at(f, side, y)); uv.push(f, 0, f, .1); if (s < n) { const a = b2 + s * 2; if (side < 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function obstMesh(o, W) {
  const g = new T.Group(), st = o.style, L = (c, e) => lam(c, e || {}), S2 = (c, r = .45, m = .1) => stdMat(c, r, m);
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sc = 1) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (sc !== 1) m.scale.setScalar(sc); m.castShadow = true; g.add(m); return m; };
  const R = o.r;
  if (o.kind === 'pillar') {
    if (st === 'rock' || st === 'darkrock') { const m = add(decorGeo('rock'), L(st === 'rock' ? '#8c8a96' : '#2e2830')); m.scale.set(R / 1.3, R * 1.5 / 1.1, R / 1.3); m.position.y = R * .6;
      add(decorGeo('rock'), L(st === 'rock' ? '#7a7884' : '#3a3238'), R * .5, R * .2, R * .4, 0, 1, 0, .6); if (st === 'darkrock') add(new T.SphereGeometry(.5, 10, 8), new T.MeshBasicMaterial({ color: '#ff6a1a' }), R * .6, .3, -R * .5); }
    else if (st === 'cactus') { const cm = L('#4c9a4a'); add(new T.CapsuleGeometry(R * .42, R * 2.4, 8, 16), cm, 0, R * 1.6); add(new T.CapsuleGeometry(R * .26, R * .9, 6, 12), cm, R * .7, R * 2.1); add(new T.CapsuleGeometry(R * .22, R * .7, 6, 12), cm, -R * .62, R * 1.6);
      add(new T.CapsuleGeometry(R * .22, R * .5, 6, 12), cm, R * .45, R * 1.6, 0, 0, 0, Math.PI / 2); add(new T.SphereGeometry(R * .14, 10, 8), L('#ff6fb5'), 0, R * 2.95); }
    else if (st === 'snowman') { const w = S2('#f4f8ff', .6, 0); add(new T.SphereGeometry(R * .95, 22, 16), w, 0, R * .85); add(new T.SphereGeometry(R * .7, 22, 16), w, 0, R * 2.15); add(new T.SphereGeometry(R * .5, 20, 14), w, 0, R * 3.1);
      add(new T.ConeGeometry(R * .12, R * .6, 10), L('#ff8a1e'), 0, R * 3.1, R * .6, Math.PI / 2); add(new T.CylinderGeometry(R * .45, R * .45, R * .55, 18), L('#17143a'), 0, R * 3.7); add(new T.CylinderGeometry(R * .7, R * .7, .12, 18), L('#17143a'), 0, R * 3.45);
      add(new T.TorusGeometry(R * .55, R * .1, 8, 20), L('#ff4f3a'), 0, R * 2.65, 0, Math.PI / 2); }
    else if (st === 'cones') { const cm = S2('#ff6a1a', .5, 0), wm = S2('#fffdf7', .5, 0); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, r = k ? R * .65 : 0; add(new T.ConeGeometry(.6, 1.8, 16), cm, Math.cos(a) * r, .9, Math.sin(a) * r); add(new T.CylinderGeometry(.36, .42, .3, 16), wm, Math.cos(a) * r, 1.0, Math.sin(a) * r); }
      add(rbox(R * 1.9, .9, 1.2, .2), S2('#c8c4d4', .8, 0), 0, .45, -R * .9); }
    else if (st === 'sandcastle') { const sm = L('#e8c47a'); add(new T.CylinderGeometry(R * .9, R, R * 1.2, 20), sm, 0, R * .6); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4; add(new T.CylinderGeometry(R * .32, R * .35, R * 1.9, 14), sm, Math.cos(a) * R * .75, R * .95, Math.sin(a) * R * .75); add(new T.ConeGeometry(R * .38, R * .6, 14), L('#d9a85a'), Math.cos(a) * R * .75, R * 2.2, Math.sin(a) * R * .75); }
      add(new T.CylinderGeometry(.04, .04, 1.6, 6), L('#6b4a2b'), 0, R * 1.9); add(new T.PlaneGeometry(.9, .55), new T.MeshBasicMaterial({ color: '#ff4f3a', side: T.DoubleSide }), .45, R * 2.4); }
    else if (st === 'crystal') { const cm = new T.MeshStandardMaterial({ color: '#b48cff', emissive: '#7c4dff', emissiveIntensity: .6, roughness: .15, metalness: .2 });
      for (let k = 0; k < 4; k++) { const m = add(new T.OctahedronGeometry(R * (k ? .45 : .7), 0), cm, k ? Math.cos(k * 2) * R * .7 : 0, k ? R * .7 : R * 1.6, k ? Math.sin(k * 2) * R * .7 : 0, rand(-.3, .3), rand(0, 3), rand(-.3, .3)); m.scale.y = 2.2; } }
    else if (st === 'stump') { add(new T.CylinderGeometry(R * .85, R, R * 1.2, 20), L('#6b4a2b'), 0, R * .6); add(new T.CylinderGeometry(R * .8, R * .8, .06, 20), L('#d9b07a'), 0, R * 1.22);
      for (let k = 0; k < 3; k++) { const a = k * 2.1; add(new T.CylinderGeometry(.18, .22, .7, 8), L('#e9e0c8'), Math.cos(a) * R * .9, .35, Math.sin(a) * R * .9); add(new T.SphereGeometry(.5, 14, 8, 0, TAU, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: pick(['#2ee6ff', '#ff6fd8', '#7dff9a']) }), Math.cos(a) * R * .9, .7, Math.sin(a) * R * .9); } }
    else if (st === 'icepillar') { const im = new T.MeshStandardMaterial({ color: '#bfe6ff', roughness: .08, metalness: .1, transparent: true, opacity: .85 }); add(new T.CylinderGeometry(R * .7, R * .9, R * 3.4, 6), im, 0, R * 1.7); add(new T.ConeGeometry(R * .7, R * 1.2, 6), im, 0, R * 4); }
    else if (st === 'totem') { const cols = ['#c8643a', '#3ee08f', '#ffc531', '#38b6ff']; for (let k = 0; k < 4; k++) { add(rbox(R * 1.3, R * .95, R * 1.3, .15), L(cols[k]), 0, R * (.5 + k), 0, 0, k * .3); add(new T.BoxGeometry(R * .9, R * .12, .1), L('#17143a'), 0, R * (.5 + k), R * .66); }
      add(new T.ConeGeometry(R * .8, R * .9, 4), L('#ff4f3a'), 0, R * 4.4, 0, 0, Math.PI / 4); }
    else if (st === 'coral') { const cols = ['#ff6f91', '#ff9a3a', '#a87dff', '#3ee0c0']; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; const m = add(new T.CapsuleGeometry(R * .2, R * 1.6, 6, 10), L(cols[k % 4]), Math.cos(a) * R * .4, R * .9, Math.sin(a) * R * .4, Math.cos(a) * .4, 0, Math.sin(a) * .4); void m; }
      add(new T.SphereGeometry(R * .7, 16, 12), L('#ff6f91'), 0, R * .5); }
    else if (st === 'gumdrop') { const c = pick(['#ff4f7a', '#3ee08f', '#a87dff', '#ffc531']); add(new T.SphereGeometry(R, 24, 14, 0, TAU, 0, Math.PI / 2), S2(c, .2, .05), 0, 0); add(new T.SphereGeometry(R * .12, 8, 6), L('#fffdf7'), R * .4, R * .8, R * .3);
      add(new T.CylinderGeometry(.18, .18, R * 2.6, 8), L('#fffdf7'), R * .6, R * 1.3, -R * .5); const d = new T.CylinderGeometry(R * .55, R * .55, .35, 24); d.rotateX(Math.PI / 2); add(d, L('#ff6fb5'), R * .6, R * 2.7, -R * .5); }
    else if (st === 'tomb') { add(rbox(R * 1.6, R * 2.2, R * .55, .3), L('#6a6a7a'), 0, R * 1.1); add(new T.BoxGeometry(R * .3, R * 1.4, R * .3), L('#5a5a68'), R * 1.1, R * .7, 0); add(new T.BoxGeometry(R * .9, R * .3, R * .3), L('#5a5a68'), R * 1.1, R * 1.05, 0);
      add(new T.SphereGeometry(R * .2, 12, 10), new T.MeshBasicMaterial({ color: '#7dff9a' }), -R * .9, .4, R * .4); }
    else add(new T.CylinderGeometry(R, R, R * 2, 16), L('#888'), 0, R);
    g.position.set(o.x, o.y, o.z); g.rotation.y = o.P.hd[o.i];
  } else if (o.kind === 'roller') {
    const inner = new T.Group(); g.add(inner); g.userData.inner = inner; const addI = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; inner.add(m); return m; };
    if (st === 'barrel') { addI(new T.CylinderGeometry(R * .9, R * .9, R * 1.6, 20), L('#9a6b43'), 0, 0, 0, 0, 0, Math.PI / 2); for (const x of [-.5, 0, .5]) addI(new T.TorusGeometry(R * .92, .1, 8, 24), S2('#3a3a44', .4, .6), x * R * 1.4, 0, 0, 0, Math.PI / 2); }
    else if (st === 'snowball') addI(smooth(wobble(new T.IcosahedronGeometry(R, 3), .06, 2, 3), 80), S2('#f4f8ff', .7, 0));
    else if (st === 'urchin') { addI(new T.SphereGeometry(R * .7, 16, 12), L('#4a2a6a')); for (let k = 0; k < 22; k++) { const v = new T.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(); const c = new T.ConeGeometry(.12, R * .7, 6); c.translate(0, R * .85, 0); c.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v))); addI(c, L('#2a1a3a')); } }
    else if (st === 'gumball') { addI(new T.SphereGeometry(R, 24, 18), S2(pick(['#ff4f7a', '#38b6ff', '#3ee08f', '#ffc531']), .12, .05)); addI(new T.TorusGeometry(R * 1.0, .14, 8, 28), L('#fffdf7')); }
    else addI(smooth(wobble(new T.IcosahedronGeometry(R, 2), .14, 1.6, 9), 70), L(W.th.decor === 'jungle' ? '#8a8f7a' : W.th.decor === 'reef' ? '#6a5a8a' : '#8a6a52'));
    g.rotation.y = o.P.hd[o.i];
  } else if (o.kind === 'crusher') {
    if (st === 'geyser') { const col = new T.Mesh(new T.CylinderGeometry(1.2, 1.8, 7, 14, 1, true), new T.MeshBasicMaterial({ map: LAVA_TEX, transparent: true, opacity: .9, side: T.DoubleSide })); col.position.y = 3.5; g.add(col); g.userData.col = col;
      const ring = new T.Mesh(new T.TorusGeometry(2.2, .5, 8, 20), L('#2a2228')); ring.rotation.x = Math.PI / 2; ring.position.y = .2; g.add(ring); }
    else {
      const blk = new T.Group(); g.add(blk); g.userData.blk = blk;
      const mat = st === 'piston' ? S2('#9aa0b0', .3, .8) : L(st === 'thwomp' ? '#7a7a8c' : '#8a8a96');
      const b = new T.Mesh(rbox(R * 1.9, 2.4, R * 1.9, .3), mat); b.position.y = 1.2; b.castShadow = true; blk.add(b);
      if (st === 'thwomp') { const face = canvasTex(128, 128, (x, w) => { x.fillStyle = '#7a7a8c'; x.fillRect(0, 0, w, w); x.fillStyle = '#17143a'; x.beginPath(); x.moveTo(20, 34); x.lineTo(58, 50); x.lineTo(20, 58); x.fill(); x.beginPath(); x.moveTo(108, 34); x.lineTo(70, 50); x.lineTo(108, 58); x.fill();
        x.fillStyle = '#fffdf7'; x.fillRect(30, 80, 68, 22); x.fillStyle = '#17143a'; for (let k = 0; k < 6; k++) x.fillRect(34 + k * 11, 80, 3, 22); }, false);
        const fm = new T.Mesh(new T.PlaneGeometry(R * 1.7, 2.1), new T.MeshBasicMaterial({ map: face })); fm.position.set(0, 1.2, R * .97); blk.add(fm); const fm2 = fm.clone(); fm2.position.z = -R * .97; fm2.rotation.y = Math.PI; blk.add(fm2); }
      if (st === 'piston') { for (const s of [-1, 1]) { const rod = new T.Mesh(new T.CylinderGeometry(.25, .25, 12, 10), S2('#e9ecf4', .2, .9)); rod.position.set(s * R * .6, 7.5, 0); blk.add(rod); }
        const st2 = new T.Mesh(new T.BoxGeometry(R * 1.95, .4, R * 1.95), L('#ffc531')); st2.position.y = .25; blk.add(st2); }
      const warn = new T.Mesh(new T.CircleGeometry(R * 1.1, 24), new T.MeshBasicMaterial({ color: '#ff2a2a', transparent: true, opacity: .25, depthWrite: false })); warn.rotation.x = -Math.PI / 2; warn.position.y = .14; g.add(warn); g.userData.glow = warn;
    }
    g.position.set(o.x, o.y, o.z); g.rotation.y = o.P.hd[o.i];
  } else if (o.kind === 'walker') {
    if (st === 'crab') { const cm = L('#ff4f3a'); add(new T.SphereGeometry(.9, 16, 10), cm, 0, .7, 0).scale.set(1.3, .6, 1); for (const s of [-1, 1]) { add(new T.SphereGeometry(.38, 12, 8), cm, s * 1.15, .9, .5); add(new T.CylinderGeometry(.06, .06, .5, 6), L('#17143a'), s * .3, 1.2, .5); add(new T.SphereGeometry(.13, 10, 8), L('#fffdf7'), s * .3, 1.5, .5);
      for (let q = 0; q < 3; q++) add(new T.CylinderGeometry(.07, .07, .9, 6), cm, s * 1.0, .35, -.4 + q * .4, 0, 0, s * .9); } }
    else if (st === 'sheep') { const wm = L('#fffdf7'); for (let q = 0; q < 6; q++) add(new T.SphereGeometry(.55, 12, 10), wm, rand(-.4, .4), .95 + rand(-.1, .2), rand(-.5, .5)); add(new T.SphereGeometry(.38, 12, 10), L('#2b2b3a'), 0, 1.1, .85); for (let q = 0; q < 4; q++) add(new T.CylinderGeometry(.1, .1, .6, 6), L('#2b2b3a'), q < 2 ? -.35 : .35, .3, q % 2 ? -.4 : .4); }
    else if (st === 'penguin') { add(new T.CapsuleGeometry(.55, .7, 6, 14), L('#1b1b2a'), 0, .95); add(new T.SphereGeometry(.45, 14, 10), L('#fffdf7'), 0, .9, .25).scale.set(1, 1.3, .6); add(new T.ConeGeometry(.12, .35, 8), L('#ff8a1e'), 0, 1.45, .55, Math.PI / 2); }
    else if (st === 'rover') { add(rbox(1.6, .6, 2, .15), S2('#e9ecf4', .3, .6), 0, .8); for (let q = 0; q < 4; q++) add(new T.CylinderGeometry(.32, .32, .25, 12), L('#2b2b3a'), q < 2 ? -.85 : .85, .32, q % 2 ? -.7 : .7, 0, 0, Math.PI / 2); add(new T.CylinderGeometry(.04, .04, 1, 6), L('#9aa0b0'), .4, 1.6, -.5); add(new T.SphereGeometry(.12, 8, 6), new T.MeshBasicMaterial({ color: '#ff4f3a' }), .4, 2.1, -.5); }
    else if (st === 'ghost') { add(new T.CapsuleGeometry(.75, 1, 8, 16), new T.MeshBasicMaterial({ color: '#e8f4ff', transparent: true, opacity: .6, depthWrite: false }), 0, .6); for (const s of [-1, 1]) add(new T.SphereGeometry(.14, 10, 8), L('#17143a'), s * .25, 1.0, .7); }
    else add(new T.SphereGeometry(.9, 12, 10), L('#888'), 0, .9);
  }
  return g;
}
function buildObstacleMeshes(W) {
  for (const o of W.obst || []) { o.mesh = obstMesh11(o, W) || obstMesh10(o, W); W.scene.add(o.mesh); }
  const rm = new T.MeshStandardMaterial({ map: RAMP_TEX, roughness: .5, metalness: .1 });
  for (const r of W.ramps || []) { W.scene.add(new T.Mesh(rampGeo(r.P, r.i - 3, r.hw, 7, 1.5), rm)); }
}

class Particles {
  constructor(scene, n, additive) {
    this.n = n; this.i = 0; this.pos = new Float32Array(n * 3).fill(-9999); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setAttribute('color', new T.BufferAttribute(this.col, 3));
    this.geo = g; this.points = new T.Points(g, new T.PointsMaterial({ size: additive ? .7 : 1.4, map: DOT_TEX, vertexColors: true, transparent: true, depthWrite: false,
      blending: additive ? T.AdditiveBlending : T.NormalBlending, opacity: additive ? 1 : .6 }));
    this.points.frustumCulled = false; scene.add(this.points); this.c = new T.Color();
  }
  emit(x, y, z, vx, vy, vz, color, life, grav = 1) {
    const i = this.i; this.i = (this.i + 1) % this.n; const j = i * 3; this.c.set(color);
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.base[j] = this.c.r; this.base[j + 1] = this.c.g; this.base[j + 2] = this.c.b; this.life[i] = life; this.max[i] = life; this.grav[i] = grav;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue; const j = i * 3; this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[j + 1] = -9999; continue; }
      this.vel[j + 1] -= 9 * this.grav[i] * dt; this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      const f = this.life[i] / this.max[i]; this.col[j] = this.base[j] * f; this.col[j + 1] = this.base[j + 1] * f; this.col[j + 2] = this.base[j + 2] * f;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
}
function makeSnow(scene) {
  const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-60, 60); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const p = new T.Points(g, new T.PointsMaterial({ color: '#ffffff', size: .35, map: DOT_TEX, transparent: true, depthWrite: false, opacity: .9 }));
  p.frustumCulled = false; scene.add(p); return { p, pos, n };
}

function disposeWorld(W) {
  if (!W) return;
  const cached = new Set(matCache.values());
  W.scene.traverse((o) => {
    if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) { if (cached.has(m) || m.userData.keep) continue; if (m.map && !SHARED.has(m.map)) m.map.dispose(); m.dispose(); }
  });
  if (W.envRT) W.envRT.dispose();
}

/* ================= Kart (modèle 3D arrondi) ================= */
const KART_GEO = new Map();
function profileShape(type) {
  if (type === 'sport') return profileSport();
  const s = new T.Shape();
  if (type === 'bolide') {
    s.moveTo(-1.12, .36); s.lineTo(1.9, .36); s.quadraticCurveTo(2.22, .37, 2.16, .47); s.quadraticCurveTo(1.7, .56, .72, .7);
    s.quadraticCurveTo(.46, .86, .26, .82); s.lineTo(-.3, .66); s.quadraticCurveTo(-.6, .66, -.72, .9); s.lineTo(-1.06, .88); s.quadraticCurveTo(-1.2, .62, -1.12, .36);
  } else if (type === 'libellule') {
    s.moveTo(-.95, .42); s.lineTo(1.05, .42); s.quadraticCurveTo(1.52, .44, 1.47, .66); s.quadraticCurveTo(1.38, .92, .6, .9);
    s.quadraticCurveTo(.32, .93, .2, .82); s.lineTo(-.32, .74); s.quadraticCurveTo(-.66, .76, -.76, .96); s.quadraticCurveTo(-1.08, 1.04, -1.12, .7); s.quadraticCurveTo(-1.13, .44, -.95, .42);
  } else if (type === 'buggy') {
    s.moveTo(-1.02, .44); s.lineTo(1.3, .44); s.quadraticCurveTo(1.66, .46, 1.62, .64); s.lineTo(.82, .74); s.lineTo(-.3, .7);
    s.quadraticCurveTo(-.68, .7, -.78, .86); s.lineTo(-1.04, .84); s.quadraticCurveTo(-1.14, .62, -1.02, .44);
  } else {
    s.moveTo(-1.08, .38); s.lineTo(1.45, .38); s.quadraticCurveTo(1.83, .4, 1.8, .53); s.quadraticCurveTo(1.55, .66, .76, .74);
    s.quadraticCurveTo(.5, .9, .3, .85); s.lineTo(-.3, .7); s.quadraticCurveTo(-.62, .7, -.72, .9); s.quadraticCurveTo(-.95, .98, -1.1, .84); s.quadraticCurveTo(-1.2, .6, -1.08, .38);
  }
  return s;
}
function airfoilShape(chord, thick) {
  const s = new T.Shape(), c = chord / 2;
  s.moveTo(-c, 0); s.quadraticCurveTo(-c * .6, thick * 1.1, c * .3, thick * .7); s.quadraticCurveTo(c * 1.05, thick * .2, c, -thick * .1); s.quadraticCurveTo(0, -thick * .45, -c, 0); return s;
}
function extrudeSide(shape, width, bevel, segs = 4, sizeOverride) {
  const thick = sizeOverride != null ? Math.min(.02, width * .2) : bevel;
  const g = new T.ExtrudeGeometry(shape, { depth: Math.max(.01, width - 2 * thick), bevelEnabled: true, bevelThickness: thick, bevelSize: sizeOverride != null ? sizeOverride : bevel * .85, bevelSegments: segs, curveSegments: 10 });
  g.rotateY(-Math.PI / 2); g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0); return smooth(g, 48);
}
function tireGeo(R, w, knobby) {
  const r0 = R * .6, c = Math.min(w * .3, (R - r0) * .5), pts = [];
  pts.push(new T.Vector2(r0, -w / 2 + .02));
  for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + k / 6 * Math.PI / 2; pts.push(new T.Vector2(R - c + Math.cos(a) * c, -w / 2 + c + Math.sin(a) * c)); }
  for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; pts.push(new T.Vector2(R - c + Math.cos(a) * c, w / 2 - c + Math.sin(a) * c)); }
  pts.push(new T.Vector2(r0, w / 2 - .02));
  let g = new T.LatheGeometry(pts, 36); g.rotateZ(Math.PI / 2);
  if (knobby) {
    const list = [g]; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; const kb = rbox(w * .92, .1, .16, .04); kb.applyMatrix4(trs(0, Math.cos(a) * (R + .015), Math.sin(a) * (R + .015), a, 0, 0)); list.push(kb); }
    g = mergeGeos(list);
  }
  return g;
}
function rimGeo(R, w) {
  const r0 = R * .6, pts = [[.001, w * .34], [r0 * .28, w * .36], [r0 * .62, w * .22], [r0 * .97, w * .34], [r0 * .97, -w * .34], [r0 * .62, -w * .22], [r0 * .28, -w * .36], [.001, -w * .34]].map((p) => new T.Vector2(p[0], p[1]));
  const g = new T.LatheGeometry(pts, 28); g.rotateZ(Math.PI / 2); return g;
}
const WHEEL_DIM = { standard: { r: .43, w: .44 }, slicks: { r: .4, w: .66 }, offroad: { r: .56, w: .52 }, neon: { r: .44, w: .42 } };
const HEAD_TOP = { casque: 2.04, casquette: 1.97, capuche: 2.04, robot: 1.92 };
const BODY_W = { bolide: [1.12, .11], libellule: [1.45, .22], equilibre: [1.3, .13], buggy: [1.2, .1] };

function kartGeometry(cfg) {
  const key = [cfg.body, cfg.wheels, cfg.pilot, cfg.acc, cfg.deco].join('|'); if (KART_GEO.has(key)) return KART_GEO.get(key);
  const body = cfg.body;
  const parts = {}; const add = (k, g, m) => { if (m) g.applyMatrix4(m); (parts[k] = parts[k] || []).push(g); };
  const cap = (r, l, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new T.CapsuleGeometry(r, l, 6, 14); g.applyMatrix4(trs(x, y, z, rx, ry, rz)); return g; };
  const limb = (k, a, b, r) => { const d = new T.Vector3().subVectors(b, a); const len = d.length(); const g = new T.CapsuleGeometry(r, Math.max(.01, len), 5, 10);
    g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), new T.Vector3(1, 1, 1))); add(k, g); };
  const V = (x, y, z) => new T.Vector3(x, y, z);
  add('dark', rbox(1.72, .12, 2.85, .05), tr(0, .3, 0));
  let flames = [{ x: -.24, y: .86, z: -1.9, s: 1 }, { x: .24, y: .86, z: -1.9, s: 1 }];
  let deco = null;
  const xb = extraBody(body, add, limb, cap, V);
  if (xb) { flames = xb; } else if (body === 'fusee') {
    const hull = new T.CapsuleGeometry(.55, 2.1, 10, 28); hull.rotateX(Math.PI / 2); hull.translate(0, .8, .05); add('paint', hull);
    const nose = new T.ConeGeometry(.4, .95, 28); nose.rotateX(Math.PI / 2); nose.translate(0, .8, 1.95); add('paint', nose);
    const bst = new T.CylinderGeometry(.44, .52, .75, 28); bst.rotateX(Math.PI / 2); bst.translate(0, .8, -1.45); add('metal', bst);
    const noz = new T.CylinderGeometry(.52, .38, .38, 28, 1, true); noz.rotateX(Math.PI / 2); noz.translate(0, .8, -1.98); add('dark', noz);
    add('paint', rbox(.07, .75, .85, .03), trs(0, 1.5, -1.15, -.3, 0, 0));
    for (const s of [-1, 1]) { add('paint', rbox(.07, .6, .85, .03), trs(s * .74, .62, -1.15, 0, 0, s * 1.15)); add('dark', cap(.09, 1.4, 0, .42, 1.95, 0, 0, Math.PI / 2)); }
    add('glove', new T.SphereGeometry(.11, 14, 10), tr(0, .8, 2.42));
    flames = [{ x: 0, y: .8, z: -2.05, s: 2.4 }];
    if (cfg.deco !== 'aucune') { const rings = []; for (const z of [.75, -.35]) { const r = new T.TorusGeometry(.565, .07, 12, 44); r.translate(0, 0, z); r.rotateX(0); r.applyMatrix4(tr(0, .8, 0)); rings.push(r); } deco = mergeGeos(rings); }
  } else {
    const BW = BODY_W[body] || BODY_W.equilibre;
    add('paint', extrudeSide(profileShape(body), BW[0], BW[1]));
    if (body === 'bolide') {
      add('paint', extrudeSide(airfoilShape(.62, .1), 2.15, .03, 2), tr(0, .36, 2.08));
      add('paint', extrudeSide(airfoilShape(.8, .14), 2.1, .035, 2), tr(0, 1.46, -1.42));
      for (const s of [-1, 1]) { add('dark', rbox(.06, .36, .7, .025), tr(s * 1.06, .4, 2.06)); add('dark', rbox(.06, .5, .9, .025), tr(s * 1.05, 1.38, -1.42));
        add('dark', cap(.035, .42, s * .45, 1.15, -1.36)); add('paint', cap(.24, 1.25, s * .72, .52, -.12, Math.PI / 2)); }
      add('dark', new T.TorusGeometry(.26, .055, 8, 18, Math.PI), trs(0, 1.36, -.74, 0, Math.PI / 2, 0));
    } else if (body === 'libellule') {
      for (const [x, z] of [[-.98, .98], [.98, .98], [-.98, -.95], [.98, -.95]]) { const f = new T.SphereGeometry(.58, 20, 10, 0, TAU, 0, Math.PI / 2); f.scale(.85, .62, 1.1); f.translate(x, .64, z); add('paint', f); }
      add('paint', rbox(.08, .5, .62, .035), trs(0, 1.18, -1.0, -.25, 0, 0));
      for (const s of [-1, 1]) add('glove', new T.SphereGeometry(.12, 14, 10), tr(s * .42, .66, 1.5));
      add('dark', cap(.1, 1.3, 0, .44, 1.62, 0, 0, Math.PI / 2));
    } else if (body === 'sport') { sportExtras(add, cap);
    } else if (body === 'buggy') {
      // arceau de sécurité tubulaire
      const r = .055;
      for (const s of [-1, 1]) {
        limb('dark', V(s * .58, .78, -.95), V(s * .46, 1.98, -.82), r); limb('dark', V(s * .58, .78, .38), V(s * .42, 1.72, .08), r);
        limb('dark', V(s * .46, 1.98, -.82), V(s * .42, 1.72, .08), r); limb('dark', V(s * 1.02, .5, -.7), V(s * 1.02, .5, .75), .05);
        limb('dark', V(s * .58, .78, -.95), V(s * .58, .78, .38), r);
      }
      limb('dark', V(-.46, 1.98, -.82), V(.46, 1.98, -.82), r); limb('dark', V(-.42, 1.72, .08), V(.42, 1.72, .08), r);
      add('dark', rbox(.9, .14, .16, .05), tr(0, 1.8, .06));
      for (let q = 0; q < 4; q++) add('glove', new T.SphereGeometry(.06, 10, 8), tr(-.3 + q * .2, 1.8, .15));
      add('dark', cap(.07, 1.5, 0, .5, 1.78, 0, 0, Math.PI / 2)); limb('dark', V(-.5, .5, 1.78), V(-.3, .78, 1.55), .045); limb('dark', V(.5, .5, 1.78), V(.3, .78, 1.55), .045);
      for (const s of [-1, 1]) add('glove', new T.SphereGeometry(.1, 14, 10), tr(s * .45, .66, 1.62));
    } else {
      for (const s of [-1, 1]) { add('paint', cap(.2, 1.0, s * .78, .5, -.18, Math.PI / 2)); add('dark', rbox(.05, .34, .6, .02), tr(s * .96, 1.22, -1.3)); add('dark', cap(.035, .32, s * .45, 1.02, -1.25)); }
      add('dark', cap(.1, 1.5, 0, .42, 1.88, 0, 0, Math.PI / 2));
      add('paint', extrudeSide(airfoilShape(.6, .1), 1.92, .03, 2), tr(0, 1.27, -1.3));
    }
    // moteur + échappements
    add('metal', rbox(.82, .42, .52, .1), tr(0, .74, -1.24));
    for (let k = 0; k < 4; k++) add('dark', rbox(.86, .04, .5, .015), tr(0, .82 + k * .07, -1.24));
    for (const s of [-1, 1]) { const ex = new T.CylinderGeometry(.09, .12, .52, 14, 1, true); ex.applyMatrix4(trs(s * .24, .86, -1.62, Math.PI / 2, 0, 0)); add('metal', ex); const tip = new T.CircleGeometry(.1, 14); tip.applyMatrix4(trs(s * .24, .86, -1.87, 0, Math.PI, 0)); add('dark', tip); }
    // déco : bandes qui épousent la carrosserie
    if (cfg.deco !== 'aucune') {
      const mk = (w, off) => { const g = extrudeSide(profileShape(body), w, BW[1], 3, BW[1] * .85 + .014); g.translate(off, 0, 0); return g; };
      deco = cfg.deco === 'damier' ? mk(.42, 0) : mergeGeos([mk(.13, -.2), mk(.13, .2)]);
    }
  }
  // siège + pilote
  add('dark', rbox(.72, .62, .2, .08), trs(0, 1.0, -.64, -.15, 0, 0));
  add('suit', new T.CapsuleGeometry(.27, .3, 6, 16), new T.Matrix4().compose(V(0, 1.12, -.42), new T.Quaternion(), V(1, 1, .85)));
  add('dark', new T.CylinderGeometry(.1, .12, .14, 12), tr(0, 1.45, -.35));
  for (const s of [-1, 1]) { limb('suit', V(s * .27, 1.3, -.38), V(s * .22, 1.16, -.02), .085); limb('suit', V(s * .22, 1.16, -.02), V(s * .18, 1.22, .2), .075); add('glove', new T.SphereGeometry(.095, 12, 10), tr(s * .18, 1.22, .21)); }
  add('dark', new T.TorusGeometry(.2, .035, 10, 28), trs(0, 1.2, .23, -.9, 0, 0));
  add('dark', new T.CylinderGeometry(.03, .03, .4, 8), trs(0, 1.08, .38, -.9, 0, 0));
  const hz = -.3;
  if (cfg.pilot === 'casquette') {
    add('skin', new T.SphereGeometry(.3, 28, 20), tr(0, 1.64, hz));
    add('helm', new T.SphereGeometry(.318, 28, 12, 0, TAU, 0, Math.PI * .46), tr(0, 1.66, hz));
    add('helm', rbox(.44, .05, .34, .025), trs(0, 1.76, hz + .37, .12, 0, 0));
    add('glass', rbox(.48, .1, .08, .04), tr(0, 1.65, hz + .27));
    for (const s of [-1, 1]) add('skin', new T.SphereGeometry(.07, 10, 8), tr(s * .3, 1.62, hz));
  } else if (cfg.pilot === 'capuche') {
    add('skin', new T.SphereGeometry(.29, 28, 20), tr(0, 1.62, hz));
    add('suit', new T.SphereGeometry(.39, 28, 16, Math.PI / 2 + .85, TAU - 1.7, 0, Math.PI * .72), tr(0, 1.66, hz - .04));
    add('glass', rbox(.46, .1, .08, .04), tr(0, 1.64, hz + .26));
  } else if (cfg.pilot === 'robot') {
    add('metal', rbox(.56, .5, .5, .12), tr(0, 1.67, hz));
    add('led', rbox(.42, .09, .04, .02), tr(0, 1.71, hz + .25));
    add('dark', rbox(.6, .14, .3, .05), tr(0, 1.47, hz));
    for (const s of [-1, 1]) add('dark', new T.CylinderGeometry(.08, .08, .08, 14), trs(s * .3, 1.67, hz, 0, 0, Math.PI / 2));
  } else {
    add('helm', new T.SphereGeometry(.37, 32, 22), tr(0, 1.68, hz));
    add('visor', new T.SphereGeometry(.382, 28, 14, Math.PI / 2 - .95, 1.9, 1.12, .62), tr(0, 1.68, hz));
    add('paint', new T.TorusGeometry(.373, .045, 10, 40), trs(0, 1.68, hz, 0, Math.PI / 2, 0));
  }
  const top = HEAD_TOP[cfg.pilot] || 2.04;
  if (cfg.acc === 'antenne') { add('dark', cap(.018, .5, .12, top + .2, hz - .12)); add('paint', new T.SphereGeometry(.085, 14, 10), tr(.12, top + .5, hz - .12)); }
  else if (cfg.acc === 'crete') { for (let k = 0; k < 5; k++) { const s = new T.SphereGeometry(.1, 12, 8); s.scale(.45, 1.5 - Math.abs(k - 2) * .25, 1.1); add('paint', s, tr(0, top - .02, hz + .22 - k * .13)); } }
  else if (cfg.acc === 'couronne') { add('gold', new T.TorusGeometry(.2, .035, 8, 28), trs(0, top - .03, hz, Math.PI / 2, 0, 0)); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; add('gold', new T.ConeGeometry(.055, .2, 8), tr(Math.cos(a) * .2, top + .09, hz + Math.sin(a) * .2)); } }
  else if (cfg.acc === 'cornes') { for (const s of [-1, 1]) add('ivory', new T.ConeGeometry(.08, .36, 14), trs(s * .22, top - .02, hz, 0, 0, -s * .55)); }
  else if (cfg.acc === 'aileron') add('paint', rbox(.05, .32, .4, .025), trs(0, top + .06, hz - .1, -.35, 0, 0));
  const merged = {}; for (const k in parts) { merged[k] = mergeGeos(parts[k]); merged[k].userData.keep = true; }
  if (deco) deco.userData.keep = true;
  const WD = WHEEL_DIM[cfg.wheels] || WHEEL_DIM.standard;
  const wh = wheelGeoFor(cfg.wheels, WD);
  const out = { merged, wh, WD, flames, deco }; KART_GEO.set(key, out); return out;
}
function darken(hex, k) { const c = rgb(hex); return '#' + c.map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join(''); }
function glowMat(color) {
  const key = 'glow|' + color; if (!matCache.has(key)) matCache.set(key, new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, roughness: .3, metalness: .2 })); return matCache.get(key);
}
function checkerMat() {
  if (!matCache.has('checker')) { const t = canvasTex(64, 64, (x) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#17143a' : '#f7f5ee'; x.fillRect(i * 32, j * 32, 32, 32); } }); t.repeat.set(7, 7); SHARED.add(t);
    matCache.set('checker', new T.MeshStandardMaterial({ map: t, roughness: .3, metalness: .2 })); }
  return matCache.get('checker');
}
function kartMesh(cfgIn) {
  const cfg = cleanCfg(cfgIn);
  const g = new T.Group(); const tilt = new T.Group(); g.add(tilt);
  const geo = kartGeometry(cfg); const F = FINISHES[cfg.finish];
  const mats = { paint: stdMat(cfg.color, F.r, F.m), dark: stdMat('#22213a', .5, .35), metal: stdMat('#cfd2dc', .2, .9), suit: stdMat(cfg.color === '#2b2b3a' ? '#4a4a60' : darken(cfg.color, .45), .7, .05),
    helm: stdMat(cfg.helmet, .15, .3), visor: stdMat('#0b0b16', .05, .85), glove: stdMat('#f7f5ee', .6, 0), skin: stdMat(cfg.skin, .72, 0), glass: stdMat('#101018', .05, .75),
    led: glowMat('#2ee6ff'), gold: stdMat('#ffc531', .22, .85), ivory: stdMat('#f1e7cf', .5, 0), water: stdMat('#6fd8ff', .1, .2), duck: stdMat('#ffd23a', .4, 0), beak: stdMat('#ff8a1e', .5, 0),
    canopy: new T.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: .45, roughness: .05, metalness: .3 }) };
  for (const k in geo.merged) tilt.add(new T.Mesh(geo.merged[k], mats[k]));
  if (geo.deco) tilt.add(new T.Mesh(geo.deco, cfg.deco === 'damier' ? checkerMat() : stdMat(cfg.helmet, F.r, F.m)));
  const WD = geo.WD; const neon = cfg.wheels === 'neon';
  const wt = cfg.wheels; const tireM = wt === 'bois' ? stdMat('#a0703f', .8, 0) : wt === 'ballon' ? stdMat(cfg.helmet, .35, .05) : stdMat('#1c1b24', .85, 0), rimM = neon ? glowMat(cfg.helmet) : wt === 'etoile' ? stdMat('#ffc531', .22, .85) : wt === 'bois' ? stdMat('#5a3c24', .7, 0) : wt === 'ballon' ? stdMat('#fffdf7', .3, .1) : stdMat('#d8dbe4', .2, .9), capM = neon ? stdMat('#1c1b24', .4, .5) : stdMat(cfg.helmet, .3, .4);
  const wheels = [], fronts = []; const fz = { bolide: 1.22, fusee: 1.25, buggy: 1.12, sport: 1.28, monstre: 1.15 }[cfg.body] || 1.05; const wide = { buggy: .06, monstre: .2, baignoire: .04 }[cfg.body] || 0;
  for (const [x, z, front] of [[-1, fz, 1], [1, fz, 1], [-1, -1, 0], [1, -1, 0]]) {
    const piv = new T.Group(); piv.position.set(x * (.92 + wide + WD.w / 2 - .12), WD.r, z); tilt.add(piv);
    const w = new T.Group(); piv.add(w); w.add(new T.Mesh(geo.wh.tire, tireM)); w.add(new T.Mesh(geo.wh.rim, rimM)); w.add(new T.Mesh(geo.wh.cap, capM));
    if (geo.wh.glow) w.add(new T.Mesh(geo.wh.glow, glowMat(cfg.helmet)));
    if (geo.wh.star) w.add(new T.Mesh(geo.wh.star, stdMat('#ffc531', .22, .85)));
    wheels.push({ m: w, r: WD.r }); if (front) fronts.push(piv);
  }
  const trail = TRAILS[cfg.trail].c;
  const flameMat = new T.MeshBasicMaterial({ color: trail[0], transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false });
  const flames = []; const fg = new T.ConeGeometry(.2, 1, 12); fg.rotateX(-Math.PI / 2); fg.translate(0, 0, -.5);
  for (const fp of geo.flames) { const f = new T.Mesh(fg, flameMat); f.position.set(fp.x, fp.y, fp.z); f.scale.set(fp.s, fp.s, .01); f.userData.s = fp.s; tilt.add(f); flames.push(f); }
  const shield = new T.Mesh(new T.SphereGeometry(2.1, 32, 20), new T.MeshBasicMaterial({ color: '#38b6ff', transparent: true, opacity: .26, depthWrite: false, blending: T.AdditiveBlending }));
  shield.position.y = .9; shield.visible = false; g.add(shield);
  tilt.traverse((o) => { if (o.isMesh && o.material !== flameMat) o.castShadow = true; });
  const glider = gliderMesh(cfg); tilt.add(glider);
  const shadow = new T.Mesh(new T.PlaneGeometry(3.2, 4.3), new T.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .05; g.add(shadow);
  shadow.visible = !qual().shadows;
  return { g, tilt, wheels, fronts, flames, shield, wheelR: WD.r, trail, glider };
}

/* ================= v7 : nouvelles pièces de garage ================= */
Object.assign(BODIES, {
  sport: { name: 'Sportive', speed: .16, accel: .02, handling: .06, weight: .08, off: -.12 },
  monstre: { name: 'Monster 4x4', speed: -.08, accel: .04, handling: -.06, weight: .35, off: .4 },
  baignoire: { name: 'Baignoire', speed: -.02, accel: .14, handling: .1, weight: -.05, off: .05 },
});
Object.assign(WHEELS, {
  monstre: { name: 'Géantes', speed: -.04, accel: -.02, handling: -.04, weight: .14, off: .45 },
  ballon: { name: 'Ballon', speed: -.02, accel: .08, handling: .06, weight: -.08, off: .12 },
  etoile: { name: 'Étoile d\'or', speed: .06, accel: .04, handling: 0, weight: .04, off: -.02 },
  bois: { name: 'Bois', speed: -.05, accel: .1, handling: .02, weight: .06, off: .15 },
});

Object.assign(WHEEL_DIM, { monstre: { r: .72, w: .62 }, ballon: { r: .5, w: .68 }, etoile: { r: .45, w: .42 }, bois: { r: .47, w: .5 } });
Object.assign(BODY_W, { sport: [1.4, .1] });
Object.assign(HEAD_TOP, {});
function profileSport() {
  const s = new T.Shape(); s.moveTo(-1.15, .32); s.lineTo(1.95, .32); s.quadraticCurveTo(2.28, .34, 2.2, .5); s.quadraticCurveTo(1.6, .64, .9, .7);
  s.quadraticCurveTo(.55, .74, .34, .72); s.lineTo(-.55, .74); s.quadraticCurveTo(-1.05, .8, -1.16, .62); s.quadraticCurveTo(-1.24, .45, -1.15, .32); return s;
}
// carrosseries spéciales (appelée par kartGeometry)
function extraBody(body, add, limb, cap, V) {
  if (body === 'monstre') {
    add('dark', rbox(2.05, .2, 3.1, .06), tr(0, .72, 0));
    add('paint', rbox(1.95, .5, 1.35, .2), tr(0, 1.0, .95)); add('paint', rbox(1.7, .26, .9, .14), tr(0, 1.3, 1.05));
    add('paint', rbox(1.95, .55, .75, .2), tr(0, 1.02, -1.15));
    for (const s of [-1, 1]) { add('paint', rbox(.16, .5, 1.4, .07), tr(s * .9, 1.0, -.2)); add('glove', new T.SphereGeometry(.13, 14, 10), tr(s * .55, 1.12, 1.64));
      limb('dark', V(s * .7, 1.2, -.85), V(s * .55, 2.05, -.75), .06); limb('dark', V(s * .7, 1.2, .35), V(s * .5, 1.85, .1), .06); limb('dark', V(s * .55, 2.05, -.75), V(s * .5, 1.85, .1), .06); }
    limb('dark', V(-.55, 2.05, -.75), V(.55, 2.05, -.75), .06);
    for (let q = 0; q < 4; q++) add('glove', new T.SphereGeometry(.09, 10, 8), tr(-.36 + q * .24, 2.12, -.72));
    add('metal', rbox(1.2, .1, .3, .05), tr(0, .95, 1.66));
    add('metal', rbox(.82, .42, .52, .1), tr(0, 1.2, -1.3));
    for (const s of [-1, 1]) { const ex = new T.CylinderGeometry(.1, .12, .9, 14, 1, true); ex.applyMatrix4(trs(s * .6, 1.6, -1.45, 0, 0, 0)); add('metal', ex); }
    return [{ x: -.6, y: 2.05, z: -1.45, s: .8 }, { x: .6, y: 2.05, z: -1.45, s: .8 }];
  }
  if (body === 'baignoire') {
    add('glove', rbox(1.8, .78, 2.9, .38), tr(0, .82, -.05));
    add('paint', rbox(1.83, .12, 2.93, .06), tr(0, .9, -.05));
    add('water', rbox(1.5, .06, 2.5, .03), tr(0, 1.17, -.05));
    for (const [x, z] of [[-.72, 1.1], [.72, 1.1], [-.72, -1.2], [.72, -1.2]]) add('gold', new T.SphereGeometry(.16, 12, 10), tr(x, .42, z));
    limb('metal', V(0, 1.1, -1.35), V(0, 2.3, -1.35), .05); limb('metal', V(0, 2.3, -1.35), V(0, 2.4, -1.0), .05); add('metal', new T.CylinderGeometry(.2, .12, .12, 16), trs(0, 2.35, -.9, .4, 0, 0));
    add('duck', new T.SphereGeometry(.22, 14, 10), tr(.45, 1.28, 1.05)); add('duck', new T.SphereGeometry(.14, 12, 10), tr(.45, 1.52, 1.16)); add('beak', new T.ConeGeometry(.06, .14, 8), trs(.45, 1.5, 1.32, Math.PI / 2, 0, 0));
    for (let q = 0; q < 5; q++) add('glove', new T.SphereGeometry(.1 + Math.random() * .06, 10, 8), tr(rand(-.6, .6), 1.25, rand(-.9, .3)));
    return [{ x: 0, y: .9, z: -1.6, s: 1.4 }];
  }
  return null;
}
function sportExtras(add, cap) {
  add('paint', extrudeSide(airfoilShape(.7, .1), 2.2, .03, 2), tr(0, .34, 2.12));
  add('paint', extrudeSide(airfoilShape(.85, .12), 2.2, .035, 2), tr(0, 1.32, -1.38));
  for (const s of [-1, 1]) { add('dark', rbox(.06, .55, .7, .025), tr(s * 1.08, 1.12, -1.38)); add('dark', rbox(.36, .14, .5, .05), tr(s * .74, .66, .5)); add('glove', new T.SphereGeometry(.09, 12, 8), tr(s * .5, .55, 2.08)); }
  add('canopy', rbox(1.05, .36, .08, .04), trs(0, 1.1, .34, -.7, 0, 0));
  add('dark', cap(.1, 1.6, 0, .4, 1.98, 0, 0, Math.PI / 2));
}
function wheelGeoFor(type, WD) {
  const wh = {};
  if (type === 'ballon') { const t = new T.SphereGeometry(WD.r, 26, 18); t.scale(WD.w / (2 * WD.r), 1, 1); wh.tire = t; wh.rim = rimGeo(WD.r * .78, WD.w * 1.02); }
  else if (type === 'bois') { const t = new T.CylinderGeometry(WD.r, WD.r, WD.w, 22); t.rotateZ(Math.PI / 2); wh.tire = t; const ring = new T.TorusGeometry(WD.r * .7, .03, 6, 24); ring.rotateY(Math.PI / 2); const r2 = ring.clone(); ring.translate(WD.w / 2 + .01, 0, 0); r2.translate(-WD.w / 2 - .01, 0, 0); wh.rim = mergeGeos([ring, r2]); }
  else { wh.tire = tireGeo(WD.r, WD.w, type === 'offroad' || type === 'monstre'); wh.rim = rimGeo(WD.r, WD.w); }
  if (type === 'etoile') { const list = []; for (let k = 0; k < 5; k++) { const sp = new T.BoxGeometry(WD.w * .9, WD.r * .95, .07); sp.translate(0, WD.r * .42, 0); sp.applyMatrix4(trs(0, 0, 0, k / 5 * TAU, 0, 0)); list.push(sp); } wh.star = mergeGeos(list); }
  wh.cap = new T.CylinderGeometry(WD.r * .17, WD.r * .17, WD.w * .8, 16); wh.cap.rotateZ(Math.PI / 2);
  if (type === 'neon') { const a = new T.TorusGeometry(WD.r * .8, .028, 8, 32); a.rotateY(Math.PI / 2); const b = a.clone(); a.translate(WD.w / 2 + .005, 0, 0); b.translate(-WD.w / 2 - .005, 0, 0); wh.glow = mergeGeos([a, b]); }
  for (const k in wh) wh[k].userData.keep = true;
  return wh;
}
/* ---- planeurs : deux demi-ailes articulées pour l'animation de déploiement ---- */
const GLIDER_CACHE = new Map();
function gliderParts(type) {
  if (GLIDER_CACHE.has(type)) return GLIDER_CACHE.get(type);
  const L = [], R = [], C = []; // [geo, matKey]
  const half = (geo, key) => { const g2 = geo.clone(); g2.scale(-1, 1, 1); fixWinding(g2); R.push([geo, key]); L.push([g2, key]); };
  if (type === 'parapente') {
    const R = 2.7, arc = .78; const half2 = (cols) => { const g = new T.TorusGeometry(R, .3, 8, 18, arc); g.rotateZ(Math.PI / 2 - arc); g.scale(1, 1, 3.2); g.translate(0, -R + 1.7, 0); return g; };
    const cellA = half2(); half(cellA, 'a');
    for (const x of [.5, 1.3, 1.95]) { const top = new T.Vector3(x, Math.sqrt(Math.max(0, R * R - x * x)) - R + 1.55, 0), bot = new T.Vector3(.35, -.85, 0); const d = new T.Vector3().subVectors(top, bot); const ln = new T.CylinderGeometry(.012, .012, d.length(), 4);
      ln.applyMatrix4(new T.Matrix4().compose(top.clone().add(bot).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), new T.Vector3(1, 1, 1))); half(ln, 'line'); }
  } else if (type === 'papillon') {
    const lobe = (w, h, x, y, rot) => { const s = new T.Shape(); s.absellipse(0, 0, w, h, 0, TAU); const g = new T.ExtrudeGeometry(s, { depth: .04, bevelEnabled: false, curveSegments: 18 }); g.rotateX(-Math.PI / 2); g.rotateY(rot); g.translate(x, y, 0); return g; };
    half(lobe(1.05, .7, 1.05, .05, .25), 'a'); half(lobe(.75, .5, .85, .0, -.45), 'b'); half((() => { const g = new T.SphereGeometry(.16, 10, 8); g.translate(1.5, .08, .3); return g; })(), 'line');
    C.push([new T.CapsuleGeometry(.09, .7, 4, 8).rotateX(Math.PI / 2), 'line']);
  } else if (type === 'avion') {
    const tri = new T.BufferGeometry(); tri.setAttribute('position', new T.Float32BufferAttribute([0, 0, 1.2, 1.9, .05, -1.0, 0, 0, -1.0, 0, 0, 1.2, 0, 0, -1.0, 1.9, .05, -1.0], 3)); tri.computeVertexNormals(); half(tri, 'paper');
    const edge = new T.BoxGeometry(1.9, .03, .08); edge.translate(.95, .04, -.98); half(edge, 'a');
    const keel = new T.BufferGeometry(); keel.setAttribute('position', new T.Float32BufferAttribute([0, 0, 1.2, 0, -.45, -.9, 0, 0, -1.0, 0, 0, 1.2, 0, 0, -1.0, 0, -.45, -.9], 3)); keel.computeVertexNormals(); C.push([keel, 'paper']);
  } else if (type === 'parapluie') {
    const dome = new T.ConeGeometry(2.0, .9, 10, 1, true); dome.translate(0, .55, 0); C.push([dome, 'a']);
    for (let k = 0; k < 10; k++) { const r = new T.CylinderGeometry(.02, .02, 2.2, 4); r.rotateZ(Math.PI / 2 - .42); r.translate(1.0, .55, 0); r.rotateY(k / 10 * TAU); C.push([r, 'line']); }
    const h = new T.CylinderGeometry(.03, .03, 1.4, 6); h.translate(0, .2, 0); C.push([h, 'line']); const tip = new T.SphereGeometry(.07, 8, 6); tip.translate(0, 1.05, 0); C.push([tip, 'b']);
  } else if (type === 'chauvesouris') {
    const s = new T.Shape(); s.moveTo(0, .25); s.lineTo(2.1, .35); s.quadraticCurveTo(1.9, -.1, 1.7, -.35); s.quadraticCurveTo(1.45, -.05, 1.2, -.4); s.quadraticCurveTo(.95, -.05, .7, -.38); s.quadraticCurveTo(.4, -.05, 0, -.3); s.lineTo(0, .25);
    const g = new T.ExtrudeGeometry(s, { depth: .05, bevelEnabled: false, curveSegments: 10 }); g.rotateX(-Math.PI / 2); g.scale(1.1, 1, 1.4); g.rotateZ(.16); half(g, 'a');
    for (const x of [.7, 1.2, 1.7]) { const b = new T.CylinderGeometry(.025, .025, .75, 5); b.rotateX(Math.PI / 2); b.rotateY(-.4); b.translate(x, .05, 0); half(b, 'line'); }
  } else {
    const wing = extrudeSide(airfoilShape(1.15, .16), 1.95, .04, 2); wing.translate(.98, 0, 0); half(wing, 'a');
    const stripe = extrudeSide(airfoilShape(1.17, .17), .3, .03, 2); stripe.translate(1.5, 0, 0); half(stripe, 'b');
  }
  // montants vers le kart (communs)
  if (type !== 'parapluie') for (const sg of [-1, 1]) { const a = new T.Vector3(sg * .26, -.95, .05), b = new T.Vector3(sg * .9, -.02, 0); const d = new T.Vector3().subVectors(b, a); const g = new T.CapsuleGeometry(.035, d.length(), 4, 8);
    g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), new T.Vector3(1, 1, 1))); C.push([g, 'line']); }
  for (const arr of [L, R, C]) for (const p of arr) p[0].userData.keep = true;
  const out = { L, R, C }; GLIDER_CACHE.set(type, out); return out;
}
function fixWinding(g) { const idx = g.index; if (idx) { const a = idx.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } idx.needsUpdate = true; } else { const p = g.attributes.position; for (let i = 0; i < p.count; i += 3) for (let c = 0; c < 3; c++) { const t = p.array[(i + 1) * 3 + c]; p.array[(i + 1) * 3 + c] = p.array[(i + 2) * 3 + c]; p.array[(i + 2) * 3 + c] = t; } p.needsUpdate = true; } g.computeVertexNormals(); }
function gliderMesh(cfg) {
  const type = GLIDERS[cfg.glider] ? cfg.glider : 'classique'; const P = gliderParts(type);
  const ds = { side: T.DoubleSide };
  const M = { a: new T.MeshStandardMaterial(Object.assign({ color: cfg.helmet, roughness: .5, metalness: .1 }, ds)), b: new T.MeshStandardMaterial(Object.assign({ color: cfg.color, roughness: .5, metalness: .1 }, ds)),
    line: stdMat('#22213a', .5, .35), paper: new T.MeshStandardMaterial(Object.assign({ color: '#fbfaf4', roughness: .8 }, ds)) };
  if (type === 'chauvesouris') M.a = new T.MeshStandardMaterial(Object.assign({ color: '#4a2a6a', emissive: '#2a1040', emissiveIntensity: .4, roughness: .6 }, ds));
  const root = new T.Group(); root.position.set(0, 2.32, -.3);
  const mk = (list, parent) => { for (const [g, k] of list) { const m = new T.Mesh(g, M[k]); m.castShadow = true; parent.add(m); } };
  const left = new T.Group(), right = new T.Group(); root.add(left, right); mk(P.L, left); mk(P.R, right); mk(P.C, root);
  root.userData = { left, right, type }; root.visible = false; root.scale.setScalar(.01); return root;
}
const easeBack = (x) => { const c = 1.9; x = clamp(x, 0, 1); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function animateGlider(k, M, dt, now) {
  const gl = M.glider; if (!gl) return; const W = G.W;
  const want = k.air === 'glide' ? 1 : 0;
  k.glOpen = (k.glOpen || 0) + (want - (k.glOpen || 0)) * (1 - Math.exp(-dt * (want ? 4.5 : 9)));
  const o = k.glOpen; gl.visible = o > .02; if (!gl.visible) return;
  gl.scale.setScalar(Math.max(.01, easeBack(o)));
  const fold = (1 - o) * 1.35, st = k.isPlayer && !G.autopilot ? Input.tiltSteer + Input.digSteer + (Input.stickSteer || 0) : (k.vh !== undefined ? clamp(angDiff(k.vh, k.h) * 3, -1, 1) : 0);
  const flutter = Math.sin(now * 13 + k.x) * .025 * o;
  gl.userData.left.rotation.z = fold + flutter + st * .08; gl.userData.right.rotation.z = -fold - flutter + st * .08;
  gl.rotation.z = lerp(gl.rotation.z, -clamp(st, -1, 1) * .35, 1 - Math.exp(-dt * 6));
  gl.rotation.x = lerp(gl.rotation.x, clamp(-(k.vy || 0) * .035, -.3, .3), 1 - Math.exp(-dt * 5));
  if (gl.userData.type === 'parapluie') gl.rotation.y += dt * .8;
}

/* ================= Audio (synthétisé) ================= */
const AudioSys = {
  ctx: null, master: null, music: null, eng: null, seq: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C(); } catch (e) { return; }
    const c = this.ctx; this.master = c.createGain(); this.master.gain.value = SAVE.sound ? .8 : 0; this.master.connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = SAVE.music ? .2 : 0; this.music.connect(c.destination);
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o1.start(); o2.start(); this.eng = { o1, o2, f, g };
    const len = c.sampleRate * 1; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
  },
  setVolumes() { if (!this.ctx) return; this.master.gain.value = SAVE.sound ? .8 : 0; this.music.gain.value = SAVE.music ? .2 : 0; },
  engine(ratio, on, boost) {
    if (!this.eng) return; const t = this.ctx.currentTime; const fr = 48 + ratio * 140 + (boost ? 45 : 0);
    this.eng.o1.frequency.setTargetAtTime(fr, t, .05); this.eng.o2.frequency.setTargetAtTime(fr * .503, t, .05);
    this.eng.f.frequency.setTargetAtTime(350 + ratio * 1300 + (boost ? 600 : 0), t, .08); this.eng.g.gain.setTargetAtTime(on ? .035 + ratio * .045 : 0, t, .12);
  },
  tone(freq, dur, type = 'square', vol = .14, slide = 0, delay = 0, dest) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + .03);
  },
  noise(dur, vol = .2, freq = 1200, delay = 0, dest, q = 1) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur); s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t); s.stop(t + dur + .03);
  },
  sfx(n) {
    if (!this.ctx) return;
    switch (n) {
      case 'click': this.tone(700, .05, 'square', .06); break;
      case 'beep': this.tone(440, .22, 'square', .16); break;
      case 'go': this.tone(880, .55, 'square', .18); this.tone(1320, .55, 'triangle', .1); break;
      case 'box': [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, .08, 'square', .07, 0, i * .05)); break;
      case 'got': this.tone(1046, .15, 'triangle', .14); this.tone(1568, .2, 'triangle', .1, 0, .08); break;
      case 'boost': this.tone(180, .55, 'sawtooth', .12, 3.5); this.noise(.5, .16, 900); break;
      case 'mini': this.tone(300, .3, 'sawtooth', .1, 2.5); break;
      case 'hit': this.noise(.45, .35, 500); this.tone(420, .45, 'square', .12, .25); break;
      case 'bump': this.noise(.12, .25, 260); break;
      case 'wall': this.noise(.15, .3, 180); break;
      case 'shield': this.tone(1400, .3, 'sine', .14, .4); break;
      case 'rocket': this.noise(.6, .18, 2400); this.tone(420, .6, 'sawtooth', .07, 2.2); break;
      case 'oil': this.tone(160, .3, 'sine', .22, .5); break;
      case 'lap': [784, 988, 1175].forEach((f, i) => this.tone(f, .14, 'square', .1, 0, i * .09)); break;
      case 'final': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .16, 'square', .11, 0, i * .1)); break;
      case 'finish': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, .2, 'square', .11, 0, i * .12)); break;
      case 'zap': this.noise(.5, .3, 3000); this.tone(900, .5, 'sawtooth', .1, .2); break;
      case 'star': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .1, 'square', .08, 0, i * .06)); break;
      case 'glide': this.noise(.8, .12, 600, 0, null, .6); this.tone(330, .5, 'triangle', .08, 1.6); break;
      case 'land': this.noise(.15, .25, 220); break;
      case 'wrong': this.tone(220, .25, 'square', .1); this.tone(196, .3, 'square', .1, 0, .25); break;
    }
  },
  startMusic(spec) {
    this.stopMusic(); if (!this.ctx || !spec) return; const c = this.ctx; const stepDur = 60 / spec.bpm / 4; let step = 0; let next = c.currentTime + .1;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    this.seq = setInterval(() => {
      while (next < c.currentTime + .2) {
        const bar = Math.floor(step / 16) % spec.prog.length, s = step % 16, ch = spec.prog[bar], d = next - c.currentTime;
        if ([0, 3, 6, 8, 11, 14].includes(s)) this.tone(mtof(spec.root - 12 + ch[0]), stepDur * 1.8, 'square', .11, 0, d, this.music);
        const arp = [0, 1, 2, 1][s % 4], oct = s % 8 < 4 ? 12 : 24; this.tone(mtof(spec.root + ch[arp] + oct), stepDur * .9, 'triangle', .06, 0, d, this.music);
        if (s === 0 || s === 8) this.tone(150, .18, 'sine', .35, .25, d, this.music);
        if (s === 4 || s === 12) this.noise(.12, .18, 1800, d, this.music);
        if (s % 2 === 0) this.noise(.03, .06, 7000, d, this.music, 3);
        step++; next += stepDur;
      }
    }, 50);
  },
  stopMusic() { if (this.seq) { clearInterval(this.seq); this.seq = null; } },
};

/* ================= v11 : nouveau son (musiques composées à la volée + bruitages) ================= */
Object.assign(AudioSys, {
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return; try { this.ctx = new C({ latencyHint: isTouch ? 'playback' : 'interactive' }); } catch (e) { try { this.ctx = new C(); } catch (e2) { return; } }
    const c = this.ctx;
    if (!this.wake) { this.wake = () => { const x = this.ctx; if (x && x.state !== 'running' && document.visibilityState === 'visible') x.resume().catch(() => {}); };
      window.addEventListener('focus', this.wake); window.addEventListener('pageshow', this.wake);
      for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, this.wake, { passive: true });
      try { c.onstatechange = () => { if (c.state !== 'running') setTimeout(this.wake, 300); }; } catch (e) { /* rien */ } }
    // chaîne : effets + musique → compresseur → sortie ; une réverbération partagée
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.knee.value = 12; this.comp.ratio.value = 3.5; this.comp.attack.value = .004; this.comp.release.value = .18; this.comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = SAVE.sound ? .75 : 0; this.master.connect(this.comp);
    this.music = c.createGain(); this.music.gain.value = SAVE.music ? .28 : 0; this.music.connect(this.comp);
    this.rev = c.createConvolver(); this.rev.buffer = this.impulse(1.2, 2.8); this.revOut = c.createGain(); this.revOut.gain.value = .55; this.rev.connect(this.revOut); this.revOut.connect(this.comp);
    this.musRev = c.createGain(); this.musRev.gain.value = .32; this.musRev.connect(this.rev); this.sfxRev = c.createGain(); this.sfxRev.gain.value = .18; this.sfxRev.connect(this.rev);
    const len = c.sampleRate; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
    // moteur : 3 oscillateurs + grondement filtré, vitesses simulées (rapports)
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), ng = c.createGain(), nf = c.createBiquadFilter(), ns = c.createBufferSource();
    o1.type = 'sawtooth'; o2.type = 'square'; o3.type = 'sine'; f.type = 'lowpass'; f.Q.value = 2.5; g.gain.value = 0; ns.buffer = buf; ns.loop = true; nf.type = 'bandpass'; nf.frequency.value = 180; nf.Q.value = .8; ng.gain.value = 0;
    const g2 = c.createGain(); g2.gain.value = .45; const g3 = c.createGain(); g3.gain.value = .9;
    o1.connect(f); o2.connect(g2); g2.connect(f); o3.connect(g3); g3.connect(g); f.connect(g); ns.connect(nf); nf.connect(ng); ng.connect(this.master); g.connect(this.master);
    o1.start(); o2.start(); o3.start(); ns.start(); this.eng = { o1, o2, o3, f, g, ng, nf, gear: 0 };
    // crissement de dérapage
    const ds = c.createBufferSource(), df = c.createBiquadFilter(), dg = c.createGain(); ds.buffer = buf; ds.loop = true; df.type = 'bandpass'; df.frequency.value = 2400; df.Q.value = 6; dg.gain.value = 0; ds.connect(df); df.connect(dg); dg.connect(this.master); ds.start(); this.skid = { df, dg };
  },
  impulse(sec, decay) { const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; },
  setVolumes() { if (!this.ctx) return; this.master.gain.value = SAVE.sound ? .75 : 0; this.music.gain.value = SAVE.music ? .28 : 0; },
  engine(ratio, on, boost, drift) {
    if (!this.eng) return; const t = this.ctx.currentTime, E = this.eng;
    // rapports de boîte : le régime monte dans chaque rapport puis retombe au passage du suivant
    const gears = [0, .22, .42, .62, .82, 1.4]; let gi = 0; while (gi < gears.length - 2 && ratio > gears[gi + 1]) gi++;
    const inG = clamp((ratio - gears[gi]) / (gears[gi + 1] - gears[gi]), 0, 1), rpm = .35 + .65 * inG + gi * .06;
    const fr = 42 + rpm * 95 + (boost ? 30 : 0);
    E.o1.frequency.setTargetAtTime(fr, t, .04); E.o2.frequency.setTargetAtTime(fr * 1.005, t, .04); E.o3.frequency.setTargetAtTime(fr * .5, t, .04);
    E.f.frequency.setTargetAtTime(380 + rpm * 1500 + (boost ? 900 : 0), t, .06); E.g.gain.setTargetAtTime(on ? .026 + ratio * .03 : 0, t, .1);
    E.nf.frequency.setTargetAtTime(140 + ratio * 260, t, .1); E.ng.gain.setTargetAtTime(on ? .012 + ratio * .02 : 0, t, .15);
    if (this.skid) { this.skid.dg.gain.setTargetAtTime(on && drift ? .035 : 0, t, .05); this.skid.df.frequency.setTargetAtTime(2000 + ratio * 900, t, .1); }
  },
  env(g, t, a, peak, dur) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + dur); },
  tone(freq, dur, type = 'square', vol = .14, slide = 0, delay = 0, dest) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, freq * slide), t + dur);
    this.env(g, t, .006, vol * (type === 'square' || type === 'sawtooth' ? .7 : 1), dur); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + .05); return g;
  },
  noise(dur, vol = .2, freq = 1200, delay = 0, dest, q = 1, type = 'bandpass') {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain();
    this.env(g, t, .003, vol, dur); s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .05); return g;
  },
  // note « jolie » : 2 oscillateurs légèrement désaccordés + filtre + envoi réverbération
  note(freq, dur, opt = {}) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (opt.delay || 0); const g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.cut || 3200; f.Q.value = opt.q || .7;
    for (const [type, det, v] of opt.osc || [['triangle', 0, 1]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; const og = c.createGain(); og.gain.value = v; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + (opt.rel || .1) + .05); if (opt.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = opt.vib; l.connect(lg); lg.connect(o.detune); l.start(t + .08); l.stop(t + dur + .2); } }
    if (opt.fenv) { f.frequency.setValueAtTime(opt.fenv[0], t); f.frequency.exponentialRampToValueAtTime(opt.fenv[1], t + Math.min(dur, opt.fenv[2] || .2)); }
    const v = opt.vol || .1, a = opt.att || .008, rel = opt.rel || .1; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + Math.max(a, dur - .02) * (opt.sus != null ? opt.sus : 1)); g.gain.exponentialRampToValueAtTime(.0008, t + dur + rel);
    f.connect(g); g.connect(opt.dest || this.master); if (opt.rev) { const s = c.createGain(); s.gain.value = opt.rev; g.connect(s); s.connect(opt.revBus || this.sfxRev); }
  },
  sfx(n) {
    if (!this.ctx) return; const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12), bell = (m, d, v = .08, dl = 0) => this.note(m2f(m), d, { delay: dl, vol: v, osc: [['sine', 0, 1], ['sine', 1200, .25], ['triangle', 0, .3]], rel: .35, rev: .5, sus: .2 });
    switch (n) {
      case 'click': this.note(m2f(84), .03, { vol: .05, osc: [['sine', 0, 1]], rel: .05 }); this.noise(.02, .04, 3000); break;
      case 'beep': bell(76, .25, .12); bell(88, .2, .04); break;
      case 'go': bell(84, .5, .14); bell(88, .5, .1); bell(91, .6, .1); this.noise(.4, .08, 5000, 0, null, .5, 'highpass'); break;
      case 'box': [79, 84, 88, 91].forEach((m, i) => bell(m, .12, .05, i * .045)); this.noise(.12, .06, 4000, 0, null, 2); break;
      case 'got': bell(88, .18, .1); bell(95, .3, .08, .07); break;
      case 'boost': this.noise(.7, .2, 600, 0, null, .7, 'lowpass'); { const g = this.noise(.6, .16, 1800, 0, null, 1.5); } this.tone(140, .6, 'sawtooth', .07, 3.2); this.tone(70, .5, 'sine', .14, 2.2); break;
      case 'mini': this.noise(.35, .12, 1400, 0, null, 1); this.tone(220, .3, 'triangle', .08, 2.4); break;
      case 'hit': this.noise(.5, .3, 400, 0, null, .8); this.tone(300, .55, 'square', .07, .3); this.tone(90, .3, 'sine', .25, .5); [76, 72, 67].forEach((m, i) => bell(m, .14, .05, .15 + i * .09)); break;
      case 'bump': this.noise(.12, .22, 240, 0, null, 1); this.tone(110, .12, 'sine', .2, .6); break;
      case 'wall': this.noise(.16, .28, 200, 0, null, .8); this.tone(80, .14, 'sine', .25, .5); this.noise(.08, .06, 3500, .02); break;
      case 'shield': [72, 79, 84, 91].forEach((m, i) => this.note(m2f(m), .3, { delay: i * .03, vol: .05, osc: [['sine', 0, 1], ['sine', 7, .5]], rev: .6, rel: .4 })); break;
      case 'rocket': this.noise(.8, .16, 2200, 0, null, .9); this.tone(380, .7, 'sawtooth', .05, 2.6); break;
      case 'oil': this.tone(180, .25, 'sine', .2, .45); this.noise(.2, .1, 500, .05, null, 2); this.tone(120, .2, 'sine', .15, .5, .12); break;
      case 'lap': [79, 84, 88].forEach((m, i) => bell(m, .2, .09, i * .1)); break;
      case 'final': [72, 76, 79, 84, 88].forEach((m, i) => bell(m, .25, .09, i * .09)); break;
      case 'finish': { const seq = [[72, 0], [76, .12], [79, .24], [84, .36], [79, .55], [84, .67], [88, .8], [91, 1.0]]; for (const [m, d] of seq) { this.note(m2f(m), .22, { delay: d, vol: .07, osc: [['sawtooth', -6, .6], ['sawtooth', 6, .6], ['square', 0, .3]], cut: 2400, rev: .5 }); bell(m + 12, .3, .04, d); }
        this.note(m2f(48), 1.4, { delay: 1, vol: .12, osc: [['sawtooth', 0, 1]], cut: 900, rev: .4 }); this.noise(1.2, .06, 6000, 1, null, .4, 'highpass'); break; }
      case 'zap': this.noise(.6, .28, 3200, 0, null, .7); this.tone(1200, .5, 'sawtooth', .06, .15); this.noise(.3, .2, 300, .1); break;
      case 'star': [72, 76, 79, 84, 88, 91].forEach((m, i) => bell(m, .14, .07, i * .05)); break;
      case 'glide': this.noise(1, .1, 700, 0, null, .5); this.note(m2f(64), .5, { vol: .06, osc: [['triangle', 0, 1]], fenv: [400, 1600, .5], rev: .4 }); break;
      case 'land': this.noise(.16, .22, 220, 0, null, .8); this.tone(95, .15, 'sine', .2, .6); break;
      case 'wrong': this.note(m2f(55), .25, { vol: .08, osc: [['square', 0, .6], ['square', 8, .6]], cut: 1200 }); this.note(m2f(54), .35, { delay: .22, vol: .08, osc: [['square', 0, .6], ['square', 8, .6]], cut: 1200 }); break;
      case 'bumper': this.tone(520, .18, 'sine', .2, 2.2); this.tone(260, .25, 'triangle', .1, 1.8); bell(96, .2, .06); break;
      case 'ramp': this.noise(.5, .12, 900, 0, null, .6); this.note(m2f(60), .4, { vol: .07, osc: [['triangle', 0, 1]], fenv: [300, 2000, .35] }); break;
      case 'spring': this.tone(180, .45, 'sine', .25, 4); this.tone(360, .4, 'triangle', .08, 3); break;
      case 'bubble': [0, .06, .12].forEach((d, i) => this.tone(500 + i * 220, .12, 'sine', .14, 2.2, d)); break;
      case 'confetti': this.noise(.12, .3, 1200, 0, null, .8); for (let i = 0; i < 10; i++) this.noise(.04, .08, 5000 + Math.random() * 3000, .1 + Math.random() * .5, null, 3); break;
      case 'disco': [72, 76, 79, 83].forEach((m) => this.note(m2f(m), .6, { vol: .05, osc: [['sawtooth', -8, .5], ['sawtooth', 8, .5]], cut: 2600, rev: .7 })); this.tone(80, .4, 'sine', .3, .4); break;
      case 'agbump': this.tone(660, .2, 'sine', .12, 1.6); this.noise(.2, .1, 2500, 0, null, 2); break;
      case 'alarm': for (let i = 0; i < 3; i++) { this.note(m2f(81), .14, { delay: i * .32, vol: .07, osc: [['square', 0, .6]], cut: 2000 }); this.note(m2f(76), .14, { delay: i * .32 + .16, vol: .07, osc: [['square', 0, .6]], cut: 2000 }); } break;
      case 'gate': this.noise(.5, .1, 300, 0, null, .7); this.tone(140, .5, 'sawtooth', .05, .7); break;
      case 'fall': this.tone(700, .9, 'sine', .14, .2); this.noise(.8, .08, 1500, 0, null, .5); break;
      case 'drone': this.note(m2f(43), .9, { vol: .06, osc: [['sawtooth', 0, .5], ['sawtooth', 15, .5]], cut: 900, vib: 30 }); break;
      case 'police': for (let i = 0; i < 4; i++) { this.note(m2f(83), .22, { delay: i * .5, vol: .08, osc: [['square', 0, .5], ['sine', 0, .5]], cut: 2600 }); this.note(m2f(78), .22, { delay: i * .5 + .25, vol: .08, osc: [['square', 0, .5], ['sine', 0, .5]], cut: 2600 }); } break;
    }
  },
  // ---------- musique ----------
  // musique pré-calculée : la boucle complète est rendue une fois (hors temps réel) puis jouée en boucle.
  // Plus aucune note programmée pendant la course : le son ne coupe plus quand le téléphone est chargé.
  // musique : fichier pré-enregistré du circuit (aucun calcul, rien qui saccade) ; sinon boucle calculée dans les menus ; sinon direct
  musKey(spec) { return wkStrHash(JSON.stringify(spec)).toString(36); },
  musLoad(spec) { const key = this.musKey(spec), f = MUSF.list && MUSF.list[key]; if (!f || !this.ctx) return null; this.musPend = this.musPend || {}; if (this.musPend[key]) return this.musPend[key];
    const pr = fetch('music/' + f.f).then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((ab) => new Promise((res, rej) => { try { const p = this.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } }))
      .then((buf) => { buf.wkLoop = f.loop; this.musCache = this.musCache || new Map(); this.musCache.set(JSON.stringify(spec), buf); while (this.musCache.size > 4) this.musCache.delete(this.musCache.keys().next().value); return buf; });
    this.musPend[key] = pr; pr.finally(() => { delete this.musPend[key]; }).catch(() => {}); return pr; },
  startMusic(spec) {
    this.stopMusic(); if (!this.ctx || !spec) return; const tok = this.musTok, key = JSON.stringify(spec), c = this.ctx, live0 = c.currentTime;
    const play = (buf, fade) => { if (tok !== this.musTok || !this.ctx) return;
      try { const src = c.createBufferSource(), g = c.createGain(), t = c.currentTime + .08, dur = buf.wkLoop && buf.wkLoop < buf.duration ? buf.wkLoop : buf.duration, off = fade ? (((t - live0) % dur) + dur) % dur : 0;
        src.buffer = buf; src.loop = true; src.loopStart = 0; src.loopEnd = dur; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + (fade ? 1.2 : .3)); src.connect(g); g.connect(this.music); src.start(t, off); this.musSrc = src; if (fade) this.liveFade(t, 1.2); } catch (e) { /* rien */ } };
    this.musCache = this.musCache || new Map(); if (this.musCache.has(key)) { play(this.musCache.get(key), false); return; }
    const file = this.musLoad(spec); if (file) { file.then((buf) => play(buf, false)).catch(() => { if (tok === this.musTok) this.liveMusic(spec, 0, true); }); return; }
    this.liveMusic(spec, 0, true);
    const pr = this.musPend && this.musPend[key]; if (pr) pr.then((buf) => play(buf, true)).catch(() => { /* on garde le direct */ });
  },
  // à l'avance, dans les menus : fichier du circuit (léger) sinon calcul de la boucle, un morceau à la fois
  prewarmMusic(spec) {
    if (!spec) return; const key = JSON.stringify(spec); this.musCache = this.musCache || new Map(); this.musPend = this.musPend || {};
    if (this.musCache.has(key)) return; if (MUSF.list && MUSF.list[this.musKey(spec)]) { if (this.ctx) this.musLoad(spec); return; }
    if (!MUSF.list && MUSF.wait) { MUSF.wait.then(() => this.prewarmMusic(spec)); return; }
    if (this.musPend[key]) return; if (Object.keys(this.musPend).length) { this.musNext = spec; return; }
    let pr; try { pr = this.renderMusic(spec); } catch (e) { pr = null; } if (!pr) return; this.musPend[key] = pr;
    pr.then((buf) => { buf.wkLoop = 32 * 16 * 60 / spec.bpm / 4; this.musCache.set(key, buf); while (this.musCache.size > 4) this.musCache.delete(this.musCache.keys().next().value); }).catch(() => {}).finally(() => { delete this.musPend[key]; const n = this.musNext; this.musNext = null; if (n && !(G.race && G.race.state !== 'attract')) setTimeout(() => this.prewarmMusic(n), 300); });
  },
  liveFade(t, d) { if (this.seq) { clearInterval(this.seq); this.seq = null; } const L = this.liveBus; this.liveBus = null; if (!L) return; for (const b of L) { try { b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + d); } catch (e) { /* rien */ } } setTimeout(() => { for (const b of L) try { b.disconnect(); } catch (e) { /* rien */ } }, (t - this.ctx.currentTime + d) * 1000 + 2000); },
  renderMusic(spec) { if (MUSF.noRender) return null;
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC) return null;
    const steps = 32 * 16, sd = 60 / spec.bpm / 4, sr = 22050, oc = new OC(1, Math.ceil((steps * sd + .1) * sr), sr);
    const mus = oc.createGain(); mus.connect(oc.destination); const fake = { ctx: oc, music: mus, master: mus, musRev: null, sfxRev: null };
    const inOc = (fn) => { const real = { ctx: this.ctx, music: this.music, musRev: this.musRev, master: this.master, sfxRev: this.sfxRev, liveBus: this.liveBus, seq: this.seq }; Object.assign(this, fake); try { return fn(); } finally { Object.assign(this, real); } };
    const rv = oc.createConvolver(); inOc(() => { rv.buffer = this.impulse(1.2, 2.8); }); const ro = oc.createGain(); ro.gain.value = 1.9; rv.connect(ro); ro.connect(oc.destination);
    const mr = oc.createGain(); mr.gain.value = .32; mr.connect(rv); fake.musRev = mr; fake.sfxRev = mr;
    // les notes sont posées petit à petit pendant le calcul (pas de gros blocage du téléphone)
    const CH = 32; const ctl = inOc(() => this.liveMusic(spec, steps, false, CH + 16));
    try { if (typeof oc.suspend !== 'function') throw 0; for (let k = 1; k * CH < steps; k++) oc.suspend(k * CH * sd).then(() => { inOc(() => ctl.more((k + 1) * CH + 16)); oc.resume(); }); }
    catch (e) { inOc(() => ctl.more(steps)); }
    return oc.startRendering();
  },
  liveMusic(spec, offline, keep, lim0) {
    if (!offline && !keep) this.stopMusic(); if (!this.ctx || !spec) return; const c = this.ctx, style = spec.style || 'pop', bpm = spec.bpm, sd = 60 / bpm / 4; let step = 0, next = c.currentTime + .12, lim = offline ? Math.min(lim0 || offline, offline) : 0;
    let bus = null; if (!offline) { bus = [c.createGain(), c.createGain()]; bus[0].connect(this.music); bus[1].connect(this.musRev); this.liveBus = bus; }
    const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12), root = spec.root, prog = spec.prog, rnd = seeded(bpm * 131 + root * 7 + prog.length + (spec.seed || 0) * 977);
    const minor = prog[0][1] - prog[0][0] === 3; const scale = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    // mélodie : un motif de 2 mesures, rejoué avec variations ; notes de l'accord sur les temps forts
    const motif = []; for (let s = 0; s < 32; s++) { const strong = s % 4 === 0; const r = rnd(); motif.push(strong ? (r < .8 ? { deg: Math.floor(rnd() * 3), len: rnd() < .5 ? 2 : 3 } : null) : (r < .32 ? { deg: Math.floor(rnd() * 7) - 1, len: 1 + (rnd() < .3 ? 1 : 0), pass: true } : null)); }
    const P = { pop: { kick: [0, 8], kick2: [10], snare: [4, 12], hat: 2, swing: 0, bass: 'oct', lead: [['square', -5, .5], ['square', 5, .5]], cut: 2600, pad: true },
      funk: { kick: [0, 7, 10], snare: [4, 12], hat: 1, swing: .12, bass: 'funk', lead: [['sawtooth', -4, .5], ['square', 4, .4]], cut: 2000, pad: false },
      house: { kick: [0, 4, 8, 12], snare: [4, 12], clap: true, hat: 'off', swing: 0, bass: 'off', lead: [['sawtooth', -8, .5], ['sawtooth', 8, .5]], cut: 1800, pad: true },
      chill: { kick: [0, 10], snare: [8], hat: 2, swing: .18, bass: 'soft', lead: [['triangle', 0, 1], ['sine', 3, .4]], cut: 3000, pad: true },
      rock: { kick: [0, 6, 8], snare: [4, 12], hat: 2, swing: 0, bass: 'drive', lead: [['sawtooth', -10, .6], ['square', 10, .5]], cut: 1600, pad: false },
      latin: { kick: [0, 8], snare: [6, 14], hat: 2, conga: true, swing: .06, bass: 'tumbao', lead: [['triangle', 0, .8], ['square', 3, .3]], cut: 3200, pad: true },
      spooky: { kick: [0, 11], snare: [8], hat: 4, swing: .1, bass: 'soft', lead: [['sine', 0, .8], ['triangle', 9, .5]], cut: 2200, pad: true },
      space: { kick: [0, 8], snare: [12], hat: 2, swing: 0, bass: 'arp', lead: [['sine', 0, .7], ['sawtooth', 7, .3]], cut: 2400, pad: true } }[style] || null;
    const S = P || P0;
    const tick = () => {
      if (!offline && c.state !== 'running') { if (document.visibilityState === 'visible') c.resume().catch(() => {}); return; }
      if (next < c.currentTime) { const miss = Math.ceil((c.currentTime + .12 - next) / sd); step += miss; next += miss * sd; }
      const m0 = this.music, r0 = this.musRev; if (bus) { this.music = bus[0]; this.musRev = bus[1]; }
      try { while (offline ? step < lim : next < c.currentTime + 1.5) {
        const bar = Math.floor(step / 16), s = step % 16, sec = Math.floor(bar / 8) % 4, ch = prog[bar % prog.length], d = next - c.currentTime + (s % 2 ? S.swing * sd : 0), M = this.music;
        const full = sec === 1 || sec === 3, intro = sec === 0 && bar < 2, brk = sec === 2 && bar % 8 < 4;
        // batterie
        if (!brk && S.kick.includes(s)) this.kick(d); if (!brk && S.kick2 && full && S.kick2.includes(s)) this.kick(d, .6);
        if (!intro && !brk && S.snare.includes(s)) { this.snare(d); if (S.clap) this.noise(.08, .12, 1500, d + .005, M, 1.4); }
        if (!intro) { if (S.hat === 'off' ? s % 4 === 2 : s % S.hat === 0) this.noise(s % 8 === 6 && S.hat !== 1 ? .14 : .035, s % 4 === 2 ? .05 : .03, 9000, d, M, 2, 'highpass'); }
        if (S.conga && full && [3, 6, 11, 14].includes(s)) this.note(m2f(root + (s % 2 ? 12 : 19)), .12, { delay: d, vol: .05, osc: [['sine', 0, 1]], fenv: [900, 300, .08], dest: M });
        // basse
        const bn = root - 24 + ch[0]; const bass = (m, len, v = .11) => this.note(m2f(m), sd * len, { delay: d, vol: v, osc: [['sawtooth', 0, .7], ['square', -1200, .5]], cut: 500, fenv: [1400, 380, .12], dest: M, rel: .05 });
        if (S.bass === 'oct' && s % 2 === 0) bass(bn + (s % 4 === 2 ? 12 : 0), 1.6); else if (S.bass === 'off' && s % 4 === 2) bass(bn, 1.8, .13);
        else if (S.bass === 'funk' && [0, 3, 6, 8, 10, 13].includes(s)) bass(bn + ([3, 10].includes(s) ? 12 : s === 13 ? 7 : 0), 1); else if (S.bass === 'soft' && (s === 0 || s === 8)) bass(bn, 6, .1);
        else if (S.bass === 'drive' && s % 2 === 0) bass(bn, 1.5, .1); else if (S.bass === 'tumbao' && [0, 6, 10, 14].includes(s)) bass(bn + (s === 6 ? 7 : s === 14 ? 12 : 0), 2); else if (S.bass === 'arp' && s % 2 === 0) bass(bn + [0, 7, 12, 7][(s / 2) % 4] + (s >= 8 ? ch[1] - ch[0] : 0), 1.6, .09);
        // nappe d'accords (début de mesure)
        if (S.pad && s === 0 && !intro) for (const n2 of ch) this.note(m2f(root + n2), sd * 16, { delay: d, vol: .025, osc: [['sawtooth', -9, .5], ['sawtooth', 9, .5]], cut: 1100, att: .25, rel: .5, dest: M, rev: .5, revBus: this.musRev });
        // arpège (pluck)
        if ((full || brk) && s % 2 === 0) { const a = ch[[0, 1, 2, 1, 0, 2, 1, 2][(s / 2) % 8]] + (s >= 8 ? 12 : 0); this.note(m2f(root + 12 + a), sd * .9, { delay: d, vol: .035, osc: [['triangle', 0, 1], ['square', 1200, .15]], cut: 2600, fenv: [4000, 900, .1], dest: M, rel: .12, rev: .25, revBus: this.musRev }); }
        // mélodie
        if (full) { const mt = motif[(bar % 2) * 16 + s]; if (mt) { const var2 = bar % 8 >= 4 && mt.pass ? 1 : 0; let mm; if (!mt.pass) mm = root + 12 + ch[mt.deg % 3]; else { const sc = scale[((mt.deg + var2) % 7 + 7) % 7]; mm = root + 12 + sc; }
          this.note(m2f(mm + 12), sd * mt.len * .95, { delay: d, vol: .045, osc: S.lead, cut: S.cut, vib: 12, dest: M, rel: .08, rev: .35, revBus: this.musRev }); } }
        step++; next += sd;
      } } finally { this.music = m0; this.musRev = r0; }
    };
    if (offline) { tick(); return { more: (n) => { lim = Math.min(n, offline); tick(); } }; } tick(); this.seq = setInterval(tick, 100);
  },
  kick(d, v = 1) { const c = this.ctx, t = c.currentTime + d, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.5 * v, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + .32); o.connect(g); g.connect(this.music); o.start(t); o.stop(t + .35); this.noise(.012, .08 * v, 3000, d, this.music, 1); },
  snare(d) { this.noise(.16, .16, 1900, d, this.music, .8); const c = this.ctx, t = c.currentTime + d, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + .08); g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g); g.connect(this.music); o.start(t); o.stop(t + .14); const r = c.createGain(); r.gain.value = .3; g.connect(r); r.connect(this.musRev); },
  stopMusic() { this.musTok = (this.musTok || 0) + 1; if (this.seq) { clearInterval(this.seq); this.seq = null; } if (this.liveBus && this.ctx) { const L = this.liveBus; this.liveBus = null; for (const b of L) { try { b.gain.setTargetAtTime(0, this.ctx.currentTime, .03); } catch (e) { /* rien */ } } setTimeout(() => { for (const b of L) try { b.disconnect(); } catch (e) { /* rien */ } }, 300); } if (this.musSrc) { try { this.musSrc.stop(); } catch (e) { /* rien */ } this.musSrc = null; } },
});
// liste des musiques pré-enregistrées (sur le site)
const MUSF = { list: null, wait: null }; MUSF.wait = (BUILD === 'pwa' ? fetch('music/index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})) : Promise.resolve({})).then((j) => { MUSF.list = j || {}; return MUSF.list; });
const P0 = { kick: [0, 8], snare: [4, 12], hat: 2, swing: 0, bass: 'oct', lead: [['square', -5, .5], ['square', 5, .5]], cut: 2600, pad: true };
// style musical selon l'ambiance du circuit
function musicSpec0(t) { const mp = RACE_OPTS.music || 'auto'; if (mp === 'off') return null; return Object.assign({ style: mp !== 'auto' ? mp : t.musicStyle || musicStyleFor(t.theme) }, t.theme.music || { bpm: 124, root: 55, prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]] }); }
const wkStrHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h; };
function musicSpec(t) { const sp = musicSpec0(t); if (!sp) return null; const h = wkStrHash(String(t.id || '')); sp.seed = h % 9973;
  if ((RACE_OPTS.music || 'auto') === 'auto') { sp.root += [0, 2, -2, 3, -3, 5][h % 6]; sp.bpm += [0, 4, -4, 6, -2, 2][(h >>> 3) % 6]; } return sp; }
function musicStyleFor(th) { const d = th.decor; return ({ prairie: 'pop', beach: 'latin', tropic: 'latin', provence: 'chill', mall: 'funk', city: 'house', safari: 'funk', fair: 'pop', snow: 'chill', glacier: 'chill', reef: 'chill', canyon: 'rock', space: 'space', volcano: 'rock', haunted: 'spooky', sky: 'space', sakura: 'chill', autumn: 'chill', antique: 'latin', forest: 'spooky', jungle: 'latin', moon: 'space', candy: 'pop', desert: 'rock', alpine: 'pop' })[d] || 'pop'; }

/* ================= v11 : code secret ================= */
// 5 appuis sur le numéro de version (Réglages) ou appui long sur la mini-carte en course : un petit champ discret apparaît.
const Secret = { armed: false, last: -99 };
function secretCheck(v) { if (String(v || '').trim().toLowerCase() !== 'dbca') return false; const R = G.race;
  if (R && ['race', 'countdown', 'intro'].includes(R.state) && R.player && !R.player.finished && R.state === 'race' && !G.paused) policeStart(R.player); else Secret.armed = true; return true; }
function policeStart(by) { const R = G.race; if (!R || !G.W) return; if ((R.t || 0) - Secret.last < 25) return; Secret.last = R.t || 0;
  if (R.online) netEmit({ e: 'police', ex: by && by.netId }); policeSweep(by); }
function policeSweep(exK) {
  const S = G.W.S; const ks = G.karts.filter((k) => k !== exK && !k.finished); if (!ks.length) return; let lo = Infinity, hi = -Infinity; for (const k of ks) { lo = Math.min(lo, k.prog); hi = Math.max(hi, k.prog); }
  const span = (hi - lo) * S.seg, sp = (Math.max(75, span / 3) + 70) / S.seg; if (G.police && G.police.mesh) G.police.mesh.visible = false;
  const ref = exK || G.race.player; G.police = { s: (ref ? ref.prog : lo) + 14, n: ks.length, t: 0, out: 0, sp: Math.max(8, (ref ? Math.abs(ref.speed) : 30) * .55) / S.seg, ex: exK, done: new Set(), mesh: (G.police && G.police.mesh) || null };
  for (const k of ks) { G.police.done.add(k); cageKart(k); }
  if (!G.police.mesh || G.police.mesh.parent !== G.W.scene) { G.police.mesh = policeCarMesh(); G.W.scene.add(G.police.mesh); }
  G.police.mesh.visible = true; banner('Contrôle de police !', 2.2, true); AudioSys.sfx('police'); vibrate([60, 40, 60]);
}
function policeUpdate(dt) { const R = G.race; if (!R) return;
  if (Secret.armed && R.state === 'race' && R.t > 6 && R.player && !R.player.finished) { Secret.armed = false; policeStart(R.player); }
  const P = G.police; if (!P) return; const S = G.W.S, N = S.N; P.s += P.sp * dt; P.t += dt;
  const fi = ((P.s % N) + N) % N, i = Math.floor(fi), j = (i + 1) % N, f = fi - i, m = P.mesh;
  if (m) { m.position.set(lerp(S.px[i], S.px[j], f), lerp(S.py[i], S.py[j], f) + .1, lerp(S.pz[i], S.pz[j], f)); m.rotation.y = S.hd[i]; const on = Math.floor((G.W.clock || 0) * 8) % 2 === 0;
    m.userData.l1.material.color.set(on ? '#ff2a3a' : '#3a0a10'); m.userData.l2.material.color.set(on ? '#1a2a5a' : '#2a6aff'); }
  if (P.t > 6) P.out += dt; if (P.out > .3) { if (m) m.visible = false; G.police = null; }
}
function cageKart(k) { if (!k.isRemote) { k.cage = 15; k.boost = 0; if (k.drift) endDrift(k, false); } k.cageVis = 15; if (k.isPlayer) { banner('Au trou ! 15 secondes', 1.6, true); vibrate(80); AudioSys.sfx('hit'); } }
function cageStep(k, dt) { if (!(k.cage > 0)) return false; k.cage -= dt; k.speed = 0; k.vy = 0; k.air = null; return true; }
function policeCarMesh() { const g = new T.Group();
  const body = new T.Mesh(rbox(2.5, 1.2, 5, .35), stdMat('#fffdf7', .35, .3)); body.position.y = 1; g.add(body);
  const doors = new T.Mesh(new T.BoxGeometry(2.56, .5, 2.2), stdMat('#1a3a9a', .4, .2)); doors.position.y = 1.05; g.add(doors);
  const cab = new T.Mesh(rbox(2.2, .9, 2.4, .3), new T.MeshStandardMaterial({ color: '#9fd4ff', roughness: .1, metalness: .4 })); cab.position.set(0, 1.95, -.2); g.add(cab);
  const l1 = new T.Mesh(new T.BoxGeometry(.8, .3, .4), new T.MeshBasicMaterial({ color: '#ff2a3a' })); l1.position.set(-.45, 2.55, -.2); g.add(l1);
  const l2 = new T.Mesh(new T.BoxGeometry(.8, .3, .4), new T.MeshBasicMaterial({ color: '#2a6aff' })); l2.position.set(.45, 2.55, -.2); g.add(l2); g.userData.l1 = l1; g.userData.l2 = l2;
  const tx = canvasTex(128, 32, (x, w, h) => { x.fillStyle = '#1a3a9a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('POLICE', w / 2, h / 2 + 1); }, false);
  for (const s of [-1, 1]) { const p = new T.Mesh(new T.PlaneGeometry(2, .5), new T.MeshBasicMaterial({ map: tx })); p.position.set(s * 1.29, 1.05, 0); p.rotation.y = s * Math.PI / 2; g.add(p); }
  for (const [x, z] of [[-1.1, 1.6], [1.1, 1.6], [-1.1, -1.6], [1.1, -1.6]]) { const w = new T.Mesh(new T.CylinderGeometry(.45, .45, .35, 14), lam('#17141a')); w.rotation.z = Math.PI / 2; w.position.set(x, .45, z); g.add(w); }
  g.scale.setScalar(1.3); return g; }
function cageMesh() { const g = new T.Group(), m = stdMat('#3a3a48', .4, .8);
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; const b = new T.Mesh(new T.CylinderGeometry(.07, .07, 2.8, 6), m); b.position.set(Math.cos(a) * 2.2, 1.4, Math.sin(a) * 2.2); g.add(b); }
  for (const y of [.05, 2.8]) { const r = new T.Mesh(new T.TorusGeometry(2.2, .1, 6, 28), m); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  const top = new T.Mesh(new T.CircleGeometry(2.2, 20), new T.MeshStandardMaterial({ color: '#3a3a48', transparent: true, opacity: .5, side: T.DoubleSide })); top.rotation.x = -Math.PI / 2; top.position.y = 2.8; g.add(top); return g; }
function cageVisual(k, M, dt) { if (!(k.cageVis > 0) && !M.cage) return; if (!M.cage) { M.cage = cageMesh(); G.W.scene.add(M.cage); }
  k.cageVis = Math.max(0, (k.cageVis || 0) - dt); const on = k.cageVis > 0; M.cage.visible = on; if (!on) return;
  const drop = clamp((15 - k.cageVis) / .35, 0, 1); M.cage.position.set(k.x, k.y + (1 - drop) * 8, k.z); }
// interface : numéro de version + champ discret ; appui long sur la mini-carte en course
(function secretUI() {
  const ver = $('#set-ver'), inp = $('#secret-in'); let taps = 0, last = 0;
  if (ver && inp) { ver.addEventListener('click', () => { const n = performance.now(); taps = n - last < 2500 ? taps + 1 : 1; last = n; if (taps >= 5) { taps = 0; inp.hidden = false; inp.value = ''; inp.focus(); } });
    inp.addEventListener('input', () => { if (secretCheck(inp.value)) { inp.value = ''; inp.hidden = true; inp.blur(); vibrate(20); } }); }
  const map = $('#h-map'), rin = $('#secret-race'); if (!map || !rin) return; let hold = null, hideT = null;
  const hide = () => { rin.hidden = true; rin.value = ''; rin.blur(); };
  map.addEventListener('pointerdown', (e) => { e.stopPropagation(); clearTimeout(hold); hold = setTimeout(() => { rin.hidden = false; rin.value = ''; rin.focus(); clearTimeout(hideT); hideT = setTimeout(hide, 9000); }, 900); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) map.addEventListener(ev, () => clearTimeout(hold));
  rin.addEventListener('input', () => { if (secretCheck(rin.value)) { hide(); vibrate(20); } });
  rin.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== rin) rin.hidden = true; }, 200));
})();

/* ================= v11 : équilibrage des pièces (chaque pièce vaut à peu près autant, seul le style change) ================= */
(function rebalance() {
  const B = { equilibre: [0, 0, 0, 0, 0], bolide: [.1, -.1, -.06, .2, -.05], libellule: [-.08, .06, .12, -.2, 0], buggy: [-.08, .06, 0, .1, .3], fusee: [.16, -.14, -.1, .05, -.1],
    sport: [.06, -.04, .02, 0, -.15], monstre: [-.08, .02, -.06, .35, .45], baignoire: [-.06, .08, .04, -.05, .05] };
  const Wh = { standard: [0, 0, 0, 0, 0], slicks: [.06, 0, -.05, 0, -.15], offroad: [-.05, .03, 0, .05, .3], neon: [.02, .01, .02, -.05, -.1], monstre: [-.06, -.02, -.04, .2, .45],
    ballon: [-.04, .04, .04, -.08, .1], etoile: [.03, .02, -.04, .04, -.05], bois: [-.05, .06, 0, .06, .1] };
  const put = (O, T2) => { for (const k in T2) if (O[k]) { const [speed, accel, handling, weight, off] = T2[k]; Object.assign(O[k], { speed, accel, handling, weight, off }); } };
  put(BODIES, B); put(WHEELS, Wh);
})();

/* ================= v11 : progression continue sur les raccourcis + anti-téléportation ================= */
// progression « main » d'un échantillon de raccourci : position réelle dans les bouches, interpolée au milieu (aucun saut)
function branchMainProg(B, j, along) { const S = G.W.S, N = S.N;
  if (!B.mp) { const rel = (m) => ((m - B.i0 + (N >> 1)) % N + N) % N - (N >> 1), mp = new Float32Array(B.N), a = clamp(B.noseA, 0, B.N - 1), b = clamp(B.noseB, a, B.N - 1);
    for (let q = 0; q < B.N; q++) mp[q] = rel(B.map[q]);
    const ra = mp[a], rb = Math.max(mp[b], ra); for (let q = a; q <= b; q++) mp[q] = ra + (rb - ra) * (b > a ? (q - a) / (b - a) : 0);
    for (let q = 1; q < B.N; q++) if (mp[q] < mp[q - 1]) mp[q] = mp[q - 1]; B.mp = mp; }
  const q = clamp(j, 0, B.N - 1), q2 = clamp(j + (along >= 0 ? 1 : -1), 0, B.N - 1), f = Math.min(1, Math.abs(along) / B.seg);
  return B.i0 + B.mp[q] + (B.mp[q2] - B.mp[q]) * f; }
// si le kart se retrouve très loin de la route suivie (changement de route raté), on le rattache à la route la plus proche au lieu de le pousser contre un mur lointain
function relocateAny(k) { const W = G.W, S = W.S, N = S.N; let bestP = k.P || S, bi = k.idx, bd = Infinity;
  const tryP = (P, from, span) => { const [i, d] = nearestOn(P, k.x, k.z, from, span); if (d < bd) { bd = d; bestP = P; bi = i; } };
  const mi = (k.P || S) === S ? k.idx : (k.mainIdx || 0); tryP(S, mi, 40);
  for (const B of W.branches) { const span = ((B.i1 - B.i0) % N + N) % N, r = ((mi - B.i0) % N + N) % N; if (r > span + 30 && N - r > 30) continue;
    const guess = k.P === B ? k.idx : clamp(Math.round(Math.min(r, span) / Math.max(1, span) * (B.N - 1)), 0, B.N - 1); tryP(B, guess, 60); }
  if (bestP !== k.P || bi !== k.idx) { k.P = bestP; k.idx = bi; finishLocate(k, bestP, bi); } }

/* ================= v13 : compteur d'images et ping (Réglages > Afficher FPS et ping) ================= */
(function perfHud() {
  let frames = 0, last = performance.now(); const el = $('#h-perf');
  const loop = () => { frames++; const now = performance.now();
    if (now - last >= 500) { const fps = Math.round(frames * 1000 / (now - last)); frames = 0; last = now;
      if (el) { const on = !!SAVE.showPerf; el.hidden = !on; if (on) { let p = '';
        if (Net && Net.peer && G.race && G.race.online) { if (Net.host) { let mx = 0; if (Net.pings) for (const v of Net.pings.values()) mx = Math.max(mx, v); p = ' · hôte' + (mx ? ' (invités ' + mx + ' ms)' : ''); } else p = ' · ping ' + (Net.ping != null ? Net.ping + ' ms' : '…'); }
        el.textContent = fps + ' i/s' + p; el.className = fps < 25 ? 'bad' : fps < 45 ? 'mid' : ''; } } }
    requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();

/* ================= v13 : choix de la musique (solo : écran des circuits ; en ligne : l'hôte choisit pour tous) ================= */
const MUSIC_OPTS = [['auto', 'Auto (selon le circuit)'], ['pop', 'Pop'], ['funk', 'Funk'], ['house', 'House'], ['chill', 'Chill'], ['rock', 'Rock'], ['latin', 'Latino'], ['spooky', 'Frisson'], ['space', 'Espace'], ['off', 'Ta musique (Spotify…)']];
const MUSIC_OFF_HINT = 'Lance Spotify ou ta musique avant la course : le jeu coupe sa musique et garde les bruitages.';
(function musicUI() {
  const sel = $('#mus-sel'); if (!sel) return;
  for (const [v, n] of MUSIC_OPTS) { const o = document.createElement('option'); o.value = v; o.textContent = n; sel.appendChild(o); }
  sel.value = SAVE.musicPick || 'auto';
  sel.onchange = () => { SAVE.musicPick = sel.value; store(); AudioSys.sfx('click'); if (sel.value === 'off') toast(MUSIC_OFF_HINT, 4500); };
})();

/* ================= v13 : plusieurs ambiances dans un même tour (zones) ================= */
// def.zones = [[début, fin, biome]] en fractions du tour. Chaque zone : sol, décor, ciel/brouillard et conduite propres.
const BIOMES = {
  neige: { name: 'Banquise', ground: 'snow', env: 'snow', fog: '#e8f4ff', sky: ['#9fc8ff', '#f4fbff'], decor: 'pines', hint: 'ça glisse !' },
  desert: { name: 'Désert', ground: 'sand', env: 'sand', fog: '#ffe4b8', sky: ['#ffb05a', '#fff0d0'], decor: 'cactus', hint: 'le sable freine' },
  foret: { name: 'Forêt profonde', ground: 'moss', env: null, fog: '#cfe8c8', sky: ['#6ab0e8', '#e6f4e0'], decor: 'trees' },
  lune: { name: 'Cratères lunaires', ground: 'moon', env: 'space', fog: '#2a2846', sky: ['#06051a', '#2a2450'], decor: 'rocks', hint: 'gravité faible' },
  volcan: { name: 'Coulée de lave', ground: 'ash', env: null, fog: '#5a2a20', sky: ['#3a1010', '#ff8a4a'], decor: 'embers' },
  fleurs: { name: 'Champ de fleurs', ground: 'lavender', env: null, fog: '#f0e4ff', sky: ['#8ab8ff', '#ffe8f4'], decor: 'flowers' },
  plage: { name: 'Plage', ground: 'sand', env: 'sand', fog: '#d8f4ff', sky: ['#2aa8ff', '#c8f4ff'], decor: 'palms', hint: 'le sable freine' },
  ville: { name: 'Quartier néon', ground: 'concrete', env: null, fog: '#2a1a40', sky: ['#0a0820', '#3a1a5a'], decor: 'blocks' },
};
function buildZones(W) {
  const def = W.def, S = W.S, N = S.N, th = W.th; W.zones = []; if (!def.zones || !def.zones.length) return; S.zoneOf = new Uint8Array(N);
  const flatGround = !th.terrain && !th.floating && !th.noGround, onTerrain = !!th.terrain && !th.floating, indoor = ['mall', 'pinball', 'house'].includes(th.decor);
  const gy = (th.groundY != null ? th.groundY : -.08) + .05;
  // positions occupées par la piste (pour ne pas poser de décor dessus)
  const occ = []; for (let i = 0; i < N; i += 4) occ.push(S.px[i], S.pz[i]); for (const B of W.branches) for (let j = 0; j < B.N; j += 4) occ.push(B.px[j], B.pz[j]);
  const free = (x, z, r) => { const r2 = (W.wallD + r) ** 2; for (let q = 0; q < occ.length; q += 2) if ((occ[q] - x) ** 2 + (occ[q + 1] - z) ** 2 < r2) return false; return true; };
  def.zones.forEach(([a, b, bio], zi) => {
    const Z = BIOMES[bio]; if (!Z) return; const i0 = Math.floor(a * N), i1 = Math.floor(b * N), n = ((i1 - i0) % N + N) % N; W.zones.push(Object.assign({ i0, i1 }, Z));
    for (let q = 0; q <= n; q++) S.zoneOf[(i0 + q) % N] = zi + 1;
    // bande de sol de la zone de chaque côté, qui se fond dans le sol d'origine (bords transparents)
    if ((flatGround || onTerrain) && !indoor) { let tex = null; try { tex = groundTex(Z.ground); tex.repeat.set(1, 1); } catch (e) { tex = null; }
      if (tex) { const pos = [], uv = [], col = [], idx = []; const offs = onTerrain ? [W.wallD + 7.5, W.wallD + 18, W.wallD + 32, W.wallD + 50, W.wallD + 72, W.wallD + 100] : [W.wallD + .5, W.wallD + 30, W.wallD + 75, W.wallD + 120]; const C = offs.length * 2; let rows = 0;
        for (let q = 0; q <= n; q += 2) { const i = (i0 + q) % N, edge = Math.min(1, q / 40, (n - q) / 40);
          for (const sd of [-1, 1]) for (let c = 0; c < offs.length; c++) { const o = sd * offs[c], X = S.px[i] + S.rx[i] * o, Zz = S.pz[i] + S.rz[i] * o; pos.push(X, onTerrain ? hy(W, X, Zz) + .35 : gy, Zz); uv.push(X / 26, -Zz / 26);
            const al = (c === offs.length - 1 ? 0 : c === offs.length - 2 ? .55 : 1) * edge; col.push(1, 1, 1, al); }
          if (rows) for (let sdI = 0; sdI < 2; sdI++) for (let c = 0; c < offs.length - 1; c++) { const A = (rows - 1) * C + sdI * offs.length + c, B2 = A + 1, Cc = A + C, D = Cc + 1; if (sdI === 0) idx.push(A, Cc, B2, B2, Cc, D); else idx.push(A, B2, Cc, B2, D, Cc); }
          rows++; }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 4)); g.setIndex(idx); g.computeVertexNormals();
        const m = new T.Mesh(g, new T.MeshLambertMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: T.DoubleSide })); m.renderOrder = 1; W.scene.add(m); } }
    // décor propre à la zone
    const pts = [], q8 = qual().decor; for (let q = 0; q <= n; q += 3) { if (Math.random() > .55 * q8) continue; const i = (i0 + q) % N, sd = Math.random() < .5 ? -1 : 1, d = W.wallD + rand(8, 90), x = S.px[i] + S.rx[i] * sd * d, z = S.pz[i] + S.rz[i] * sd * d; if (!free(x, z, 5)) continue; pts.push({ x, z, y: flatGround ? gy : th.floating ? null : hy(W, x, z), s: rand(.8, 1.6), r: rand(0, TAU) }); }
    if (!th.floating) zoneDecor(W, Z.decor, pts.filter((p) => p.y != null));
  });
}
function zoneDecor(W, kind, pts) { const sc = W.scene; if (!pts.length) return;
  if (kind === 'pines') instanced(sc, [{ geo: decorGeo('ptrunk'), mat: lam('#5b4030'), off: tr(0, 1, 0) }, { geo: decorGeo('pine1'), mat: lam('#ffffff'), off: tr(0, 3.6, 0), colors: ['#2f6a4a', '#3a7a52'] }, { geo: decorGeo('pine2'), mat: lam('#ffffff'), off: tr(0, 5.5, 0), colors: ['#e8f2ff'] }], pts);
  else if (kind === 'cactus') instanced(sc, [{ geo: decorGeo('cactus'), mat: lam('#ffffff'), colors: ['#4a9a4a', '#5aae5a', '#3e8a40'] }], pts);
  else if (kind === 'trees') instanced(sc, [{ geo: decorGeo('trunk'), mat: lam('#5a3e28'), off: tr(0, 1.4, 0) }, { geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, 4.2, 0), colors: ['#2f7a34', '#3a8a3c', '#26662c'] }], pts);
  else if (kind === 'rocks') instanced(sc, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#8a8aa0', '#a8a8b8', '#6e6e86'] }], pts.map((p) => Object.assign(p, { s: p.s * 1.8 })));
  else if (kind === 'embers') { instanced(sc, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#2a2228', '#3a2e30'] }], pts);
    const g = []; for (const p of pts) if (Math.random() < .5) g.push(p.x, p.y + 1.2, p.z); const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(g, 3)); sc.add(new T.Points(gg, new T.PointsMaterial({ color: '#ff6a1a', size: 6, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .6 }))); }
  else if (kind === 'flowers') instanced(sc, [{ geo: decorGeo('flower'), mat: lam('#ffffff'), off: tr(0, 0, 0), colors: ['#ff6fb5', '#ffc531', '#a87dff', '#ff4f7a', '#fffdf7'] }], pts.flatMap((p) => [p, { x: p.x + rand(-4, 4), z: p.z + rand(-4, 4), y: p.y, s: p.s, r: rand(0, TAU) }, { x: p.x + rand(-4, 4), z: p.z + rand(-4, 4), y: p.y, s: p.s, r: rand(0, TAU) }]));
  else if (kind === 'palms') instanced(sc, palmParts('#8a6a4a', ['#3fae4a', '#4fbe56', '#2f9a3e']), pts);
  else if (kind === 'blocks') { const m = new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#7a3aff', emissiveIntensity: .35, roughness: .5 });
    instanced(sc, [{ geo: new T.BoxGeometry(10, 1, 10), mat: m, off: new T.Matrix4().makeScale(1, 24, 1).premultiply(tr(0, 12, 0)), colors: ['#2a2a4a', '#3a2a5a', '#1a2a4a'] }], pts.filter((p) => Math.random() < .5)); }
}
// ambiance et conduite selon la zone où l'on roule ; annonce à l'entrée d'une zone
function zoneAt(k) { const W = G.W, S = W && W.S; if (!S || !S.zoneOf) return null; const i = (k.P || S) === S ? k.idx : (k.mainIdx || 0); const z = S.zoneOf[clamp(i, 0, S.N - 1)]; return z ? W.zones[z - 1] : null; }
function zoneEnv(k) { if (k.P && k.P.def && k.P.def.water) return ENVS.water; const z = zoneAt(k); return z && z.env ? ENVS[z.env] : G.W.env; }
function updateZones(W, dt) { if (!W.zones || !W.zones.length || !G.race || !G.race.player) return; const P = G.race.player, z = zoneAt(P);
  if (!W.zoneBase) { const u = W.sky && W.sky.material && W.sky.material.uniforms; W.zoneBase = { fog: W.scene.fog ? W.scene.fog.color.clone() : null, top: u && u.top ? u.top.value.clone() : null, bottom: u && u.bottom ? u.bottom.value.clone() : null }; }
  if (z !== W.zoneCur) { W.zoneCur = z; if (z && G.race.state === 'race') { banner(z.name + (z.hint ? ' : ' + z.hint : ''), 1.6); } }
  const B0 = W.zoneBase, f = 1 - Math.exp(-dt * 1.4), mixc = (base, hex) => base.clone().lerp(new T.Color(hex), .7);
  if (W.scene.fog && B0.fog) W.scene.fog.color.lerp(z ? mixc(B0.fog, z.fog) : B0.fog, f);
  const u = W.sky && W.sky.material && W.sky.material.uniforms; if (u && u.top && B0.top) { u.top.value.lerp(z ? mixc(B0.top, z.sky[0]) : B0.top, f); u.bottom.value.lerp(z ? mixc(B0.bottom, z.sky[1]) : B0.bottom, f); }
}
// passage sous l'eau : rideau de cascade à l'entrée, bulles dans le tube, conduite « sous l'eau »
const FALL_TEX = canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(220,245,255,.9)'); g.addColorStop(1, 'rgba(120,200,255,.55)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,' + (.25 + Math.random() * .5) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 20 + Math.random() * 60); } });
function aquaExtras(W, B, j0, j1) { const sc = W.scene; W.anim = W.anim || [];
  const j = clamp(j0, 0, B.N - 1), wd = (B.wallD || W.wallD) * 2 + 2, t = FALL_TEX.clone(); t.needsUpdate = true; t.repeat.set(3, 1);
  const m = new T.Mesh(new T.PlaneGeometry(wd, 14), new T.MeshBasicMaterial({ map: t, transparent: true, opacity: .8, depthWrite: false, side: T.DoubleSide }));
  m.position.set(B.px[j], B.py[j] + 7, B.pz[j]); m.rotation.y = B.hd[j]; sc.add(m);
  W.anim.push((dt) => { t.offset.y += dt * 1.6; });
  const pos = []; for (let q = j0; q <= j1; q += 2) { const i = clamp(q, 0, B.N - 1); for (let r = 0; r < 3; r++) { const o = rand(-B.hw, B.hw); pos.push(B.px[i] + B.rx[i] * o, B.py[i] + rand(.5, 7), B.pz[i] + B.rz[i] * o); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); const pm = new T.Points(g, new T.PointsMaterial({ color: '#dff6ff', size: .9, map: DOT_TEX, transparent: true, depthWrite: false, opacity: .8 })); sc.add(pm);
  W.anim.push((dt) => { const a = g.attributes.position; for (let q = 1; q < a.count * 3; q += 3) { a.array[q] += dt * 1.5; } if ((W.clock || 0) % 4 < dt) for (let q = 1; q < a.count * 3; q += 3) a.array[q] -= 6; a.needsUpdate = true; }); }

/* ================= v13 : code d'accès donné par le chef de partie ================= */
const WK_PK = (() => { const b = atob('03cqxEXIAS3R0Dkv5aNhLxa57hrAecBnXq0L87F9gGI='); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; })();
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
  if (!j || typeof j.s !== 'number') return null; return { text: m[0], s: j.s, r: (j.r || []).map(String), b: (j.b || []).map(String) }; }

// liste du chef : codes annulés et joueurs bloqués (transmise de téléphone en téléphone)
const CHEF = { s: 0, r: new Set(), b: new Set() };
function chefListLoad() { const L = SAVE.chefList ? wkListParse(SAVE.chefList, WK_PK) : null; CHEF.s = L ? L.s : 0; CHEF.r = new Set(L ? L.r : []); CHEF.b = new Set(L ? L.b : []); CHEF.u = L ? L.u : 0; if (typeof updForced === 'function') updForced(CHEF.u); }
function chefListApply(text, quiet) { const L = wkListParse(text, WK_PK); if (!L || L.s <= CHEF.s) return false; SAVE.chefList = L.text; store(); chefListLoad(); if (!quiet) toast('Liste du chef mise à jour.', 2500); setTimeout(() => { accessTick(); if (Net.host && typeof hostKickBanned === 'function') { hostBroadcastLobby(); hostKickBanned(); } }, 0); return true; }
// toutes les minutes : le serveur donne la dernière liste du chef (et note quel code ce jeu utilise)
async function accessSync() { if (typeof acctCall !== 'function') return; const r = await acctCall('state', { code: SAVE.access || '', fid: frMyId(), name: SAVE.name || '', pseudo: SAVE.acct ? SAVE.acct.u : '' }); if (r && r.cl) chefListApply(r.cl, true); accessTick(); }
const chefBanned = () => !!((SAVE.fid && CHEF.b.has(SAVE.fid)) || (SAVE.fidOld || []).some((x) => CHEF.b.has(x)) || (SAVE.acct && CHEF.b.has('@' + String(SAVE.acct.u).toLowerCase())));
chefListLoad();
function accessCheck(code) {
  let p = null; for (const c of wkParseAll(code)) { let ok = false; try { ok = typeof nacl !== 'undefined' && nacl.sign.detached.verify(c.msg, c.sig, WK_PK); } catch (e) { ok = false; } if (ok) { p = c; break; } }
  if (!p) return { ok: false, why: 'Code incorrect.' };
  if (chefBanned()) return { ok: false, why: 'Le chef t\'a bloqué.', exp: p.exp };
  if (CHEF.r.has(wkCodeId(p))) return { ok: false, why: 'Ce code a été annulé par le chef. Demande-lui un nouveau code.', exp: p.exp };
  const now = Date.now(), seen = Math.max(now, SAVE.accSeen || 0);
  if (now < (SAVE.accSeen || 0) - 10 * 60e3) return { ok: false, why: 'L\'heure du téléphone a été reculée : remets la bonne heure.', exp: p.exp };
  if (seen >= p.exp) return { ok: false, why: 'Code expiré le ' + new Date(p.exp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + '. Demande un nouveau code au chef.', exp: p.exp };
  return { ok: true, exp: p.exp };
}
const Gate = { el: null };
function gateText(exp) { return 'Code valable jusqu\'au ' + new Date(exp).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.'; }
function gateShow(why) {
  if (!Gate.el) { const d = document.createElement('div'); d.id = 'gate';
    d.innerHTML = '<div class="gate-box"><h2>Wild Kart</h2><p>Entre le code d\'accès donné par le chef de partie.</p><textarea id="gate-in" rows="3" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="WK…"></textarea><p class="gate-msg" id="gate-msg"></p><p class="gate-fid">Ton identifiant ami : <b id="gate-fid"></b><br>Un ami qui a déjà le code peut te l\'envoyer depuis l\'écran Amis.</p><button class="btn ghost" id="gate-close"><span>Fermer</span></button> <button class="btn ghost" id="gate-acct"><span>J\'ai un compte</span></button> <button class="btn red" id="gate-ok"><span>Valider</span></button></div>';
    document.body.appendChild(d); Gate.el = d;
    const go = () => { const v = $('#gate-in').value; const ca = chefActivate(v); if (ca === true) { gateHide(); chefButtons(); toast('Mode chef activé 👑 (bouton « Mode chef » dans le menu).', 4500); return; } if (typeof ca === 'string') { $('#gate-msg').textContent = ca; return; } const gotList = chefListApply(v, true); if (gotList && !/WK[0-9A-Z\s-]{100,}/i.test(v.replace(/WKL\.[A-Za-z0-9_.-]+/g, ''))) { $('#gate-msg').textContent = 'Liste du chef mise à jour.'; if (SAVE.access && accessCheck(SAVE.access).ok) gateHide(); return; } const r = accessCheck(v); if (r.ok) { SAVE.access = v.trim(); SAVE.accSeen = Math.max(Date.now(), SAVE.accSeen || 0); store(); gateHide(); toast(gateText(r.exp), 4000); } else { $('#gate-msg').textContent = r.why; } };
    $('#gate-acct').onclick = () => acctOpen(SAVE.acct ? null : 'co'); $('#gate-ok').onclick = go; $('#gate-close').onclick = () => { if (SAVE.access && accessCheck(SAVE.access).ok) gateHide(); }; $('#gate-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } }); }
  { const cl = $('#gate-close'); if (cl) cl.hidden = !(SAVE.access && accessCheck(SAVE.access).ok); }
  $('#gate-msg').textContent = why || ''; { const f = $('#gate-fid'); if (f && typeof frMyId === 'function') f.textContent = frMyId(); } Gate.el.hidden = false; G.locked = true; }
function gateHide() { if (Gate.el) Gate.el.hidden = true; G.locked = false; accessInfo(); }
function accessInfo() { const el = $('#set-acc'); if (!el) return; const r = SAVE.access ? accessCheck(SAVE.access) : null; el.textContent = (r && r.ok ? gateText(r.exp) : 'Pas de code valide.') + (CHEF.s ? ' Liste du chef du ' + new Date(CHEF.s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + '.' : ''); }
function accessTick() { // vérifie le code au démarrage, puis chaque minute (jamais en pleine course)
  if (SAVE.access) { const now = Date.now(); if (now > (SAVE.accSeen || 0)) { SAVE.accSeen = now; store(); } }
  const r = SAVE.access ? accessCheck(SAVE.access) : { ok: false, why: '' };
  // code annulé, expiré ou joueur bloqué : on sort tout de suite (même en pleine course ou en ligne)
  if (!r.ok) { if (!(Gate.el && !Gate.el.hidden)) { try { if (Net.peer) { netReset(); renderOnline(); } if (G.race && G.race.state !== 'attract') toMenu(); } catch (e) { /* rien */ } } gateShow(r.why); }
  else if (Gate.el && !Gate.el.hidden) gateHide();
}
setTimeout(function accessInit() {
  const m = /[#&?]code=([^&]+)/.exec(location.hash || '') || /[?&]code=([^&]+)/.exec(location.search || '');
  let linkWhy = ''; if (m) { const v = decodeURIComponent(m[1]), r = accessCheck(v); if (r.ok) { SAVE.access = v; store(); } else linkWhy = r.why; try { history.replaceState(null, '', location.pathname); } catch (e) { /* rien */ } }
  accessTick(); if (linkWhy && Gate.el && !Gate.el.hidden) $('#gate-msg').textContent = linkWhy; setInterval(accessTick, 60e3); setTimeout(accessSync, 1500); setInterval(accessSync, 60e3); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') accessSync(); });
  const ch = $('#set-acc-change'); if (ch) ch.onclick = () => { AudioSys.sfx('click'); gateShow(''); };
  accessInfo();
}, 0);

/* ================= v13 : amis et groupes (par le serveur : marche en 4G, Wi-Fi différents, appli ou site) ================= */
// Chaque téléphone a un identifiant ami « NOM-1234 ». On ajoute un ami avec son identifiant, puis on peut lui envoyer
// l'invitation à sa partie en ligne et le code d'accès. Les messages attendent sur le serveur jusqu'à ce que l'ami ouvre le jeu.
// Groupe : code « G-XXXXXX ». Public : n'importe qui ayant le code le rejoint. Privé : il faut aussi le mot de passe.
const FR = { peer: null, open: false, status: new Map(), inbox: [], beacons: new Map(), tries: 0 };
const frSlug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
function frMyId() { if (!SAVE.fid) { const n = frSlug(SAVE.name) || 'JOUEUR'; SAVE.fid = (n === 'TOI' ? 'JOUEUR' : n) + '-' + String(Math.floor(1000 + Math.random() * 9000)); store(); } return SAVE.fid; }
function frNorm(id) { const m = /^\s*([^\d\s-][^-]*?)\s*[-#\s]\s*(\d{4})\s*$/.exec(String(id || '')); return m ? frSlug(m[1]) + '-' + m[2] : null; }
const frPeerId = (fid) => 'wkf-' + fid.toLowerCase();
const frList = () => (SAVE.friends = Array.isArray(SAVE.friends) ? SAVE.friends : []);
const grList = () => (SAVE.groups = Array.isArray(SAVE.groups) ? SAVE.groups : []);
function frMe() { return { id: frMyId(), name: String(SAVE.name || 'Joueur').slice(0, 12) }; }
// ce que fait le joueur (vu par le chef dans « En direct »)
function frStatus() { try { const R = G.race, live = R && R.state !== 'attract', P = R && R.player, tr = live && TRACKS[R.ti] ? TRACKS[R.ti].name : '';
  const race = live ? { tr, lap: P ? Math.max(1, Math.min(P.lap, LAPS)) : 0, laps: LAPS, pl: P ? P.place || 0 : 0, fin: R.state === 'finished' || !!R.resultsShown } : null;
  if (Net.peer && Net.code) return Object.assign({ s: live && R.online ? 'course' : 'salon', code: Net.code, host: !!Net.host, n: (Net.players || []).filter((p) => !p.away).length }, live && R.online ? race : {});
  if (live) return Object.assign({ s: 'solo' }, race); return { s: G.locked ? 'bloque' : 'menu' }; } catch (e) { return { s: 'menu' }; } }
const frStatusV = () => Object.assign(frStatus(), { v: window.TK_VER || '', app: !!window.TK_APP });
function frAddFriend(id, name) { if (!id || id === frMyId()) return false; const L = frList(); const f = L.find((x) => x.id === id); if (f) { if (name) f.name = name; store(); return false; } L.push({ id, name: name || id.split('-')[0] }); store(); return true; }
// ---------- présence et messages : le jeu passe au serveur toutes les 20 secondes ----------
function frStart() { if (FR.timer) return; let n = 0; FR.timer = setInterval(() => { if (document.visibilityState !== 'visible') return; const racing = G.race && G.race.state !== 'attract'; n++; if (UI.screen === 'chef' && CHU.tab === 'direct') frPoll(); else if (racing ? n % 9 === 0 : n % 3 === 0) frPoll(); }, 5000); frPoll();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') frPoll(); }); }
function frRestart() { FR.since = 0; frPoll(); }
const frIds = () => { const ids = new Set(frList().map((f) => f.id)); for (const g of grList()) for (const m of g.members) ids.add(m.id); ids.delete(frMyId()); return [...ids]; };
async function frPoll() { if (FR.busy || typeof acctCall !== 'function') return; FR.busy = true;
  try { const r = await acctCall('fpoll', { me: Object.assign(frMe(), { st: frStatusV(), pu: SAVE.acct ? SAVE.acct.u : '' }), since: FR.since || 0, ack: FR.since || 0, ids: frIds(), groups: grList().map((g) => g.code) });
    if (!r.ok) { FR.open = false; frRender(); return; } FR.open = true;
    for (const [id, t] of Object.entries(r.online || {})) FR.status.set(id, !!t && r.now - t < 90e3);
    for (const [code, g] of Object.entries(r.groups || {})) { if (g) grMerge(g, true); else { const lg = grFind(code); if (lg && lg.owner === frMyId()) acctCall('gsave', { group: lg, me: frMe() }); } }   // ancien groupe (d'avant le serveur) : son créateur le remet en ligne
    for (const m of r.msgs || []) { FR.since = Math.max(FR.since || 0, m.at); try { frOnData(null, m); } catch (e) { /* rien */ } }
    frRender(); } finally { FR.busy = false; } }
// ---------- changer son identifiant ami (s'il est libre) ----------
function frRename(name, num, cb) {
  const base = frSlug(name), old = frMyId(), n = /^\d{4}$/.test(String(num || '').trim()) ? String(num).trim() : old.split('-')[1];
  if (base.length < 2) return cb('Au moins 2 lettres ou chiffres.'); const nid = base + '-' + n; if (nid === old) return cb('C\'est déjà ton identifiant.');
  if (frList().some((f) => f.id === nid)) return cb('Pris : c\'est l\'identifiant d\'un de tes amis.');
  // personne d'autre n'a pris cet identifiant (compte ou joueur vu ces 60 derniers jours)
  acctCall('fid', { fid: nid }).then(async (r) => { if (!r.ok) return cb(r.e || 'Pas de connexion, réessaie.'); if (r.free === false) return cb('Déjà pris par un autre joueur. Essaie un autre nom ou un autre numéro.');
    if (SAVE.acct) { const q = await acctCall('fid', { fid: nid, pseudo: SAVE.acct.u, tok: SAVE.acct.tok }); if (!q.ok || !q.free) return cb(q.e || 'Déjà pris par un autre joueur.'); }
    const ids = frIds(); SAVE.fidOld = [...new Set((SAVE.fidOld || []).concat([old]))].slice(-10); SAVE.fid = nid;
    for (const g of grList()) { for (const m of g.members) if (m.id === old) m.id = nid; if (g.owner === old) g.owner = nid; acctCall('gren', { code: g.code, old, me: frMe() }); } store();
    frSendMany(ids, { t: 'rename', old }); frPoll(); cb(null, nid); });
}
// envoi d'un message (gardé sur le serveur jusqu'à ce que l'ami ouvre le jeu) ; cb(ok, enLigne)
function frSendMany(ids, msg, cb) { ids = ids.filter((x) => x && x !== frMyId()); if (!ids.length) { cb && cb(false, {}); return; }
  acctCall('fsend', { from: frMe(), to: ids, msg: Object.assign({ cl: SAVE.chefList || '' }, msg) }).then((r) => { if (r.ok) for (const [id, on] of Object.entries(r.online || {})) FR.status.set(id, on); cb && cb(!!r.ok, r.online || {}); frRender(); }); }
function frSend(fid, msg, cb) { if (msg && msg.t === 'ping') { cb && cb(true); return; } frSendMany([fid], msg, (ok, on) => cb && cb(ok, !!on[fid])); }
function frOnData(c, d) {
  if (!d || typeof d !== 'object' || !d.from || typeof d.from.id !== 'string') return; const who = String(d.from.name || d.from.id).slice(0, 12), fid = frNorm(d.from.id) || d.from.id;
  if (d.cl) chefListApply(d.cl, true);
  FR.status.set(fid, true); { const f = frList().find((x) => x.id === fid); if (f && who && f.name !== who) { f.name = who; store(); } }
  // le chef demande « que fais-tu ? » (demande signée par sa clé) : on répond avec ce qu'on fait
  if (d.t === 'stq') { try { const ts = +d.ts; if (Math.abs(Date.now() - ts) < 5 * 60e3 && nacl.sign.detached.verify(new TextEncoder().encode('stq.' + ts), wkB64uDec(String(d.sig || '')), WK_PK)) frSend(fid, { t: 'stv', st: frStatusV(), pu: SAVE.acct ? SAVE.acct.u : '' }); } catch (e) { /* rien */ } return; }
  if (d.t === 'stv') { if (typeof chefLiveIn === 'function') chefLiveIn(fid, who, d); return; }
  if (d.t === 'rename') { const o = frNorm(d.old); if (o && o !== fid) { const L = frList(), f = L.find((x) => x.id === o); if (f) { if (L.some((x) => x.id === fid)) SAVE.friends = L.filter((x) => x !== f); else { f.id = fid; f.name = who; } }
      for (const g of grList()) { for (const m of g.members) if (m.id === o) m.id = fid; if (g.owner === o) g.owner = fid; } store();
      if (typeof isChef === 'function' && isChef() && chefState().b.includes(o) && !chefState().b.includes(fid)) { chefState().b.push(fid); store(); chefPublish(); }
      if (f) toast(who + ' a un nouvel identifiant : ' + fid, 3500); frRender(); } return; }
  if (d.t === 'hi') { if (frAddFriend(fid, who)) toast(who + ' t\'a ajouté en ami.', 3500); frRender(); }
  else if (d.t === 'inv' && /^[A-Z]{4}$/.test(String(d.code || ''))) frNotify(who + ' t\'invite dans sa partie en ligne (' + d.code + ').', 'Rejoindre', () => { show('online'); $('#on-code').value = d.code; netJoin(d.code); });
  else if (d.t === 'acc' && typeof d.code === 'string') { const r = accessCheck(d.code);
    if (r.ok) { SAVE.access = d.code.trim(); SAVE.accSeen = Math.max(Date.now(), SAVE.accSeen || 0); store(); gateHide(); toast(who + ' t\'a envoyé un code d\'accès. ' + gateText(r.exp), 5000); }
    else toast(who + ' t\'a envoyé un code d\'accès qui ne marche pas : ' + r.why, 5000); }
  else if (d.t === 'gsync' && d.group) grMerge(d.group);
  else if (d.t === 'ginv' && /^G-[A-Z0-9]{6}$/.test(String(d.code || '')) && !grFind(d.code)) frNotify(who + ' t\'invite dans le groupe « ' + String(d.gname || d.code).slice(0, 24) + ' ».', 'Accepter', () => grJoin(d.code, '', (why) => { if (why) toast(why, 3000); else { toast('Bienvenue dans le groupe !', 2500); frSendMany(((grFind(d.code) || {}).members || []).map((m) => m.id), { t: 'hi' }); } }));
  else if (d.t === 'gplay' && /^[A-Z]{4}$/.test(String(d.code || ''))) grPlayIn(d, who);
}
// notification avec un bouton (invitation)
function frNotify(text, label, fn) { let el = $('#fr-note'); if (!el) { el = document.createElement('div'); el.id = 'fr-note'; document.body.appendChild(el); }
  el.innerHTML = '<p></p><div class="row"><button class="btn sm ghost" id="fr-note-no"><span>Plus tard</span></button><button class="btn sm red" id="fr-note-yes"><span></span></button></div>';
  el.querySelector('p').textContent = text; el.querySelector('#fr-note-yes span').textContent = label; el.hidden = false; AudioSys.sfx('beep'); vibrate([30, 40, 30]);
  el.querySelector('#fr-note-no').onclick = () => { el.hidden = true; }; el.querySelector('#fr-note-yes').onclick = () => { el.hidden = true; fn(); }; clearTimeout(frNotify.h); frNotify.h = setTimeout(() => { el.hidden = true; }, 25000); }
// ---------- groupes ----------
function grCode() { const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; let s = 'G-'; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function grFind(code) { return grList().find((g) => g.code === code); }
function grMerge(g0, fromServer) { if (!g0 || !/^G-[A-Z0-9]{6}$/.test(g0.code)) return; let g = grFind(g0.code); const me = frMyId();
  if (!g) { if (!(g0.members || []).some((m) => m.id === me)) return; g = { code: g0.code, name: String(g0.name || 'Groupe').slice(0, 24), public: !!g0.public, pass: '', owner: g0.owner, members: [] }; grList().push(g); toast('Tu fais partie du groupe « ' + g.name + ' ».', 3500); }
  const before = g.members.map((m) => m.id).join(','); g.members = (g0.members || []).filter((m) => m && typeof m.id === 'string').map((m) => ({ id: m.id, name: String(m.name || m.id).slice(0, 12) }));
  g.name = String(g0.name || g.name).slice(0, 24); g.public = !!g0.public; g.owner = g0.owner;
  if (fromServer && before && before !== g.members.map((m) => m.id).join(',')) { const nw = g.members.filter((m) => !before.split(',').includes(m.id) && m.id !== me); for (const m of nw) toast(m.name + ' a rejoint « ' + g.name + ' ».', 3000); }
  store(); frRender(); }
function grBeacon() { /* plus besoin : les groupes sont sur le serveur */ }
function grJoin(code, pass, cb) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.startsWith('G')) code = code.slice(1); code = 'G-' + code.slice(0, 6);
  if (!/^G-[A-Z0-9]{6}$/.test(code)) { cb('Le code de groupe ressemble à G-ABC123.'); return; }
  acctCall('gjoin', { code, pass, me: frMe() }).then((r) => { if (!r.ok) { cb(r.e || 'Pas de connexion, réessaie.'); return; } grMerge(r.group); for (const m of r.group.members) frAddFriend(m.id, m.name); frSendMany(r.group.members.map((m) => m.id), { t: 'hi' }); cb(''); }); }
// le chef du groupe lance une partie : tous les membres la rejoignent (tout de suite s'ils sont dans les menus)
function grPlay(g) { const send = () => { frSendMany(g.members.map((m) => m.id), { t: 'gplay', code: Net.code, group: g.code, gname: g.name }, (ok) => toast(ok ? 'Partie lancée : le groupe arrive !' : 'Pas de connexion au serveur.', 3000)); };
  if (Net.peer && Net.host && Net.id) { send(); show('online'); return; }
  if (Net.peer && !Net.host) { toast('Quitte d\'abord la partie où tu es.', 2500); return; }
  show('online'); netCreate(); let n = 0; const t = setInterval(() => { if (Net.host && Net.id && Net.code) { clearInterval(t); send(); } else if (++n > 40) { clearInterval(t); toast('Impossible de créer la partie.', 3000); } }, 300); }
function grPlayIn(d, who) { const g = grFind(d.group), label = g ? '« ' + g.name + ' »' : 'ton groupe';
  const join = () => { if (Net.peer) netReset(); show('online'); $('#on-code').value = d.code; netJoin(d.code); };
  const busy = (G.race && G.race.state !== 'attract') || Net.peer || G.locked;
  if (!busy) { toast(who + ' lance une partie pour ' + label + ' : tu le rejoins !', 3000); join(); }
  else frNotify(who + ' lance une partie pour ' + label + ' (' + d.code + ').', 'Rejoindre', join); }
// ---------- écran Amis ----------
const FRU = { tab: 'amis', open: null };
function frRender() { const root = $('#fr-root'); if (!root || UI.screen !== 'friends') return; const me = frMyId(), L = frList(), Gs = grList(), inParty = !!(Net.peer && Net.code), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const st = (id) => FR.status.has(id) ? (FR.status.get(id) ? '<b class="on">en ligne</b>' : '<b class="off">hors ligne</b>') : '<b class="off">…</b>';
  let h = '<header class="sh-head"><button class="back" data-go="frback" aria-label="Retour">←</button><h2>Amis et groupes</h2></header>';
  h += '<div class="group"><h3>Ton identifiant ami</h3><div class="set-row"><span><b class="fr-me">' + esc(me) + '</b><small>Donne-le à tes amis pour qu\'ils t\'ajoutent. ' + (FR.open ? 'Connecté.' : 'Connexion au serveur…') + '</small></span><button class="btn sm" id="fr-copy"><span>Copier</span></button><button class="btn sm ghost" id="fr-ren"><span>Changer</span></button></div>'
    + (FRU.ren ? '<div class="fr-add"><input id="fr-rn" placeholder="Nouveau nom" maxlength="10" autocapitalize="characters" value="' + esc(me.split('-')[0]) + '"><input id="fr-rd" class="fr-num" placeholder="1234" maxlength="4" inputmode="numeric" value="' + esc(me.split('-')[1]) + '"><button class="btn sm red" id="fr-rok"><span>Vérifier</span></button></div><p class="hint" id="fr-rmsg">Tes amis et groupes sont prévenus tout seuls.</p>' : '') + '<div class="set-row"><small>' + (SAVE.acct ? 'Compte : ' + esc(SAVE.acct.u) : 'Pas de compte : crée-le pour tout retrouver sur un autre téléphone.') + '</small><button class="btn sm ghost" id="fr-acct"><span>' + (SAVE.acct ? 'Mon compte' : 'Créer un compte') + '</span></button></div></div>';
  h += '<div class="seg fr-tabs"><button data-t="amis" aria-pressed="' + (FRU.tab === 'amis') + '">Amis (' + L.length + ')</button><button data-t="groupes" aria-pressed="' + (FRU.tab === 'groupes') + '">Groupes (' + Gs.length + ')</button></div>';
  if (FRU.tab === 'amis') {
    h += '<div class="group"><h3>Ajouter un ami</h3><div class="fr-add"><input id="fr-new" placeholder="Identifiant (ex. LEA-4821)" autocomplete="off" autocapitalize="characters"><button class="btn sm red" id="fr-add"><span>Ajouter</span></button></div><p class="hint" id="fr-msg"></p></div>';
    h += '<div class="group"><h3>Mes amis</h3>' + (L.length ? '' : '<p class="hint">Aucun ami pour l\'instant.</p>');
    for (const f of L) h += '<div class="fr-row"><span><b>' + esc(f.name) + '</b> <small>' + esc(f.id) + ' · ' + st(f.id) + '</small></span><span class="fr-acts"><button class="btn sm" data-inv="' + esc(f.id) + '"' + (inParty ? '' : ' disabled') + '><span>Inviter</span></button><button class="btn sm ghost" data-acc="' + esc(f.id) + '"><span>Envoyer le code</span></button><button class="link" data-del="' + esc(f.id) + '">Retirer</button></span></div>';
    h += (inParty ? '' : '<p class="hint">« Inviter » marche quand tu as créé une partie en ligne.</p>') + '</div>';
  } else {
    h += '<div class="group"><h3>Créer un groupe</h3><div class="fr-add"><input id="gr-name" placeholder="Nom du groupe" maxlength="24"><button class="btn sm red" id="gr-make"><span>Créer</span></button></div><div class="seg" id="gr-kind"><button data-k="pub" aria-pressed="' + (FRU.kind !== 'priv') + '">Public</button><button data-k="priv" aria-pressed="' + (FRU.kind === 'priv') + '">Privé (mot de passe)</button></div>' + (FRU.kind === 'priv' ? '<input id="gr-pass" placeholder="Mot de passe du groupe" maxlength="20">' : '') + '<p class="hint">Public : n\'importe qui ayant le code rejoint. Privé : il faut aussi le mot de passe.</p></div>';
    h += '<div class="group"><h3>Rejoindre un groupe</h3><div class="fr-add"><input id="gr-code" placeholder="Code (ex. G-ABC123)" autocapitalize="characters"><input id="gr-jpass" placeholder="Mot de passe (si privé)"><button class="btn sm red" id="gr-join"><span>Rejoindre</span></button></div><p class="hint" id="gr-msg"></p></div>';
    for (const g of Gs) { const opened = FRU.open === g.code;
      h += '<div class="group"><div class="fr-row"><span><b>' + esc(g.name) + '</b> <small>' + esc(g.code) + ' · ' + (g.public ? 'public' : 'privé') + ' · ' + g.members.length + ' membre' + (g.members.length > 1 ? 's' : '') + '</small></span><span class="fr-acts"><button class="btn sm" data-gopen="' + esc(g.code) + '"><span>' + (opened ? 'Fermer' : 'Ouvrir') + '</span></button></span></div>';
      if (opened) { h += '<p class="hint">Code du groupe : <b>' + esc(g.code) + '</b>' + (!g.public && g.owner === me ? ' · mot de passe : <b>' + esc(g.pass) + '</b>' : '') + '</p>';
        for (const m of g.members) h += '<div class="fr-row"><span>' + esc(m.name) + ' <small>' + esc(m.id) + (m.id === me ? ' · toi' : ' · ' + st(m.id)) + '</small></span></div>';
        const out2 = L.filter((f) => !g.members.some((m) => m.id === f.id));
        h += '<p class="hint"><b>Inviter des amis dans le groupe</b>' + (out2.length ? '' : ' : tous tes amis y sont déjà (ajoute des amis dans l\'onglet Amis).') + '</p>';
        for (const f of out2) h += '<div class="fr-row"><span>' + esc(f.name) + ' <small>' + esc(f.id) + ' · ' + st(f.id) + '</small></span><span class="fr-acts"><button class="btn sm" data-ginvf="' + esc(g.code) + '|' + esc(f.id) + '"><span>Inviter</span></button></span></div>';
        h += g.owner === me ? '<div class="row"><button class="btn red" data-gplay="' + esc(g.code) + '"><span>Lancer une partie du groupe</span></button></div><p class="hint">Tous les membres rejoignent ta partie ; tu choisis le circuit et les réglages.</p>' : '<p class="hint">Quand le chef du groupe lance une partie, tu la rejoins tout seul.</p>';
        h += '<div class="row"><button class="btn sm" data-ginv="' + esc(g.code) + '"' + (inParty ? '' : ' disabled') + '><span>Inviter le groupe à ma partie</span></button><button class="btn sm ghost" data-gacc="' + esc(g.code) + '"><span>Envoyer le code d\'accès au groupe</span></button><button class="link" data-gquit="' + esc(g.code) + '">Quitter le groupe</button></div>'; }
      h += '</div>'; }
  }
  root.innerHTML = h; frWire(); }
function frCheckAll() { frPoll(); }
function frWire() { const q = (s) => $('#fr-root ' + s), qa = (s) => [...document.querySelectorAll('#fr-root ' + s)];
  const cp = q('#fr-copy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(frMyId()); toast('Identifiant copié.', 1500); } catch (e) { toast(frMyId(), 3000); } };
  const rn = q('#fr-ren'); if (rn) rn.onclick = () => { FRU.ren = !FRU.ren; frRender(); };
  const ac = q('#fr-acct'); if (ac) ac.onclick = () => acctOpen();
  const rok = q('#fr-rok'); if (rok) rok.onclick = () => { const m = q('#fr-rmsg'); m.textContent = 'Vérification…'; rok.disabled = true;
    frRename(q('#fr-rn').value, q('#fr-rd').value, (e, nid) => { if (e) { const mm = $('#fr-rmsg'); if (mm) mm.textContent = e; const b = $('#fr-rok'); if (b) b.disabled = false; return; } FRU.ren = false; frRender(); toast('Nouvel identifiant : ' + nid, 3000); }); };
  qa('.fr-tabs button').forEach((b) => (b.onclick = () => { FRU.tab = b.dataset.t; frRender(); }));
  const add = q('#fr-add'); if (add) add.onclick = () => { const id = frNorm(q('#fr-new').value), msg = q('#fr-msg'); if (!id) { msg.textContent = 'L\'identifiant ressemble à LEA-4821.'; return; } if (id === frMyId()) { msg.textContent = 'C\'est ton propre identifiant.'; return; }
    frAddFriend(id, id.split('-')[0]); msg.textContent = 'Ajouté ! On le prévient…'; frSend(id, { t: 'hi' }, (ok) => { frRender(); toast(ok ? 'Ami ajouté, il est prévenu (dès qu\'il ouvre le jeu).' : 'Ami ajouté, mais pas de connexion au serveur.', 4000); }); };
  qa('[data-del]').forEach((b) => (b.onclick = () => { SAVE.friends = frList().filter((f) => f.id !== b.dataset.del); store(); frRender(); }));
  const accCode = () => SAVE.access && accessCheck(SAVE.access).ok ? SAVE.access : null;
  const codeFor = () => (typeof isChef === 'function' && isChef() ? chefMakeCode(Date.now() + 365 * 86400e3) : accCode());   // chef : un code à part pour chaque joueur
  qa('[data-inv]').forEach((b) => (b.onclick = () => frSend(b.dataset.inv, { t: 'inv', code: Net.code }, (ok, on) => toast(!ok ? 'Pas de connexion au serveur.' : on ? 'Invitation envoyée.' : 'Invitation envoyée (il la verra en ouvrant le jeu).', 2500))));
  qa('[data-acc]').forEach((b) => (b.onclick = () => { const c = codeFor(); if (!c) { toast('Tu n\'as pas de code valide à envoyer.', 2500); return; } frSend(b.dataset.acc, { t: 'acc', code: c }, (ok, on) => toast(!ok ? 'Pas de connexion au serveur.' : on ? 'Code d\'accès envoyé.' : 'Code envoyé : il le recevra en ouvrant le jeu.', 2500)); }));
  qa('#gr-kind button').forEach((b) => (b.onclick = () => { FRU.kind = b.dataset.k; frRender(); }));
  const mk = q('#gr-make'); if (mk) mk.onclick = () => { const name = (q('#gr-name').value || '').trim().slice(0, 24) || 'Mon groupe', priv = FRU.kind === 'priv', pass = priv ? (q('#gr-pass') && q('#gr-pass').value.trim()) || '' : '';
    if (priv && pass.length < 3) { toast('Choisis un mot de passe d\'au moins 3 caractères.', 2500); return; } const g = { code: grCode(), name, public: !priv, pass, owner: frMyId(), members: [frMe()] }; acctCall('gsave', { group: g, me: frMe() }).then((r) => { if (!r.ok) { toast(r.e || 'Pas de connexion au serveur.', 3000); return; } grList().push(g); store(); FRU.open = g.code; frRender(); toast('Groupe créé : ' + g.code, 3000); }); };
  const jn = q('#gr-join'); if (jn) jn.onclick = () => { const m = q('#gr-msg'); m.textContent = 'Connexion au groupe…'; grJoin(q('#gr-code').value, q('#gr-jpass').value, (why) => { const m2 = q('#gr-msg'); if (why) { if (m2) m2.textContent = why; } else { frRender(); toast('Bienvenue dans le groupe !', 2500); } }); };
  qa('[data-gopen]').forEach((b) => (b.onclick = () => { FRU.open = FRU.open === b.dataset.gopen ? null : b.dataset.gopen; frRender(); if (FRU.open) frCheckAll(); }));
  qa('[data-ginvf]').forEach((b) => (b.onclick = () => { const [code, fid] = b.dataset.ginvf.split('|'), g = grFind(code); b.disabled = true;
    acctCall('ginv', { code, me: frMe(), to: [fid] }).then((r) => { if (!r.ok) { toast(r.e || 'Pas de connexion au serveur.', 2500); b.disabled = false; return; } frSendMany([fid], { t: 'ginv', code, gname: g ? g.name : code }, (ok, on) => toast(on[fid] ? 'Invitation envoyée.' : 'Invitation envoyée (il la verra en ouvrant le jeu).', 2500)); }); }));
  qa('[data-gplay]').forEach((b) => (b.onclick = () => grPlay(grFind(b.dataset.gplay))));
  qa('[data-ginv]').forEach((b) => (b.onclick = () => { const g = grFind(b.dataset.ginv); const ids = g.members.map((m) => m.id).filter((x) => x !== frMyId()); if (!ids.length) { toast('Personne d\'autre dans le groupe.', 2000); return; }
    frSendMany(ids, { t: 'inv', code: Net.code }, (ok, on) => toast(ok ? 'Invitation envoyée à ' + ids.length + ' (' + Object.values(on).filter(Boolean).length + ' en ligne).' : 'Pas de connexion au serveur.', 3000)); }));
  qa('[data-gacc]').forEach((b) => (b.onclick = () => { if (!accCode() && !(typeof isChef === 'function' && isChef())) { toast('Tu n\'as pas de code valide à envoyer.', 2500); return; } const g = grFind(b.dataset.gacc); const ids = g.members.map((m) => m.id).filter((x) => x !== frMyId()); if (!ids.length) { toast('Personne d\'autre dans le groupe.', 2000); return; }
    if (typeof isChef === 'function' && isChef()) { let n = 0; for (const id of ids) frSend(id, { t: 'acc', code: codeFor() }, (ok) => { if (ok && ++n === ids.length) toast('Un code personnel envoyé à chacun des ' + n + ' membres.', 3000); }); return; }
    frSendMany(ids, { t: 'acc', code: accCode() }, (ok) => toast(ok ? 'Code envoyé aux ' + ids.length + ' membres.' : 'Pas de connexion au serveur.', 3000)); }));
  qa('[data-gquit]').forEach((b) => (b.onclick = () => { acctCall('gleave', { code: b.dataset.gquit, me: frMe() }); SAVE.groups = grList().filter((g) => g.code !== b.dataset.gquit); store(); FRU.open = null; frRender(); }));
}
setTimeout(() => { frMyId(); frStart(); const gi = $('#gate-fid'); if (gi) gi.textContent = frMyId(); }, 0);

/* ================= v13 : mode chef dans le jeu (seulement sur le téléphone du chef) ================= */
// Le chef colle une fois sa « clé du chef » (WKCHEF…, dans le zip du chef). Son jeu peut alors créer des codes,
// les annuler, bloquer des joueurs (même en pleine partie en ligne) ; la liste est signée et transmise toute seule.
function chefSk() { if (!SAVE.chefKey) return null; const sk = wkB64uDec(SAVE.chefKey); if (!sk || sk.length !== 64) return null;
  try { const kp = nacl.sign.keyPair.fromSecretKey(sk); return wkHex(kp.publicKey) === wkHex(WK_PK) ? sk : null; } catch (e) { return null; } }
const isChef = () => !!chefSk();
function chefState() { const c = SAVE.chefState && typeof SAVE.chefState === 'object' ? SAVE.chefState : { r: [...CHEF.r], b: [...CHEF.b] }; c.r = Array.isArray(c.r) ? c.r : []; c.b = Array.isArray(c.b) ? c.b : []; c.codes = Array.isArray(c.codes) ? c.codes : []; SAVE.chefState = c; return c; }
function chefMakeCode(expMs) { const sk = chefSk(); if (!sk) return null; const exp = Math.floor(expMs / 1000); let r; try { r = nacl.randomBytes(3); } catch (e) { r = new Uint8Array([Math.random() * 256, Math.random() * 256, Math.random() * 256]); }
  const msg = new Uint8Array([1, (exp >>> 24) & 255, (exp >>> 16) & 255, (exp >>> 8) & 255, exp & 255, r[0], r[1], r[2]]); const sig = nacl.sign.detached(msg, sk); const all = new Uint8Array(72); all.set(msg); all.set(sig, 8);
  const code = 'WK' + wkB32enc(all); const c = chefState(); c.codes.unshift({ code, exp: expMs, at: Date.now() }); c.codes = c.codes.slice(0, 60); store();
  acctCall('codeadd', Object.assign({ code }, chefAuth('codeadd'))); return code; }
// preuve « c'est le chef » pour le serveur
function chefAuth(a) { const sk = chefSk(), ts = Date.now(); return sk ? { ts, sig: wkB64u(nacl.sign.detached(new TextEncoder().encode(a + '.' + ts), sk)) } : {}; }
async function chefLoadCodes() { CHU.load = true; chefRender(); const r = await acctCall('codes', chefAuth('codes')); CHU.load = false; if (r.ok) { CHU.srv = r.codes || []; CHU.srvErr = ''; if (CHU.tab === 'direct') chefAsk(); } else CHU.srvErr = r.e || 'Serveur indisponible.'; chefRender(); }
// signe la liste (codes annulés + joueurs bloqués), l'applique ici et la diffuse
function chefPublish() { const sk = chefSk(); if (!sk) return; const c = chefState(); const s = Math.max(Date.now(), (CHEF.s || 0) + 1);
  const body = new TextEncoder().encode(JSON.stringify({ s, r: c.r, b: c.b, u: c.u || 0 })); const t = 'WKL.' + wkB64u(body) + '.' + wkB64u(nacl.sign.detached(body, sk));
  chefListApply(t, true); store(); acctCall('clset', { cl: t });
  if (Net.peer && Net.host) { hostBroadcastLobby(); hostKickBanned(); } else if (Net.hc && Net.hc.open) { try { Net.hc.send({ t: 'cl', cl: t }); } catch (e) { /* rien */ } }
  for (const f of frList()) frSend(f.id, { t: 'ping' }); for (const g of grList()) for (const m of g.members) if (m.id !== frMyId()) frSend(m.id, { t: 'ping' }); }
// l'hôte (chef ou non) sort tout de suite de la partie les joueurs bloqués
function hostKickBanned() { if (!Net.host) return; for (const p of Net.players.slice()) { if (p.host || !((p.fid && CHEF.b.has(p.fid)) || (p.pu && CHEF.b.has('@' + p.pu)))) continue; const c = Net.conns.get(p.pid);
    try { c && c.send({ t: 'banned' }); } catch (e) { /* rien */ } setTimeout(() => { try { c && c.close(); } catch (e) { /* rien */ } }, 300); p.away = Date.now(); hostDrop(p.id); toast(p.name + ' a été bloqué par le chef.', 3000); } }
function chefActivate(text) { const m = /WKCHEF\.([A-Za-z0-9_-]+)/.exec(String(text || '').replace(/\s+/g, '')); if (!m) return false; const old = SAVE.chefKey; SAVE.chefKey = m[1];
  if (!chefSk()) { SAVE.chefKey = old; return 'Clé du chef incorrecte.'; }
  if (!(SAVE.access && accessCheck(SAVE.access).ok)) { SAVE.access = chefMakeCode(Date.now() + 3650 * 86400e3); SAVE.accSeen = Date.now(); }
  store(); return true; }
// ---------- écran du chef ----------
const CHU = { hours: 12, last: '', srv: null, srvErr: '', load: false, all: false, tab: 'direct', devs: false, players: new Map(), live: null, liveAt: 0 };
// « En direct » : le chef demande à chaque joueur connu ce qu'il fait (par la messagerie des amis), les jeux ouverts répondent
const LIVE = new Map();
function chefLiveIn(fid, who, d) { if (!isChef()) return; LIVE.set(fid, { fid, n: who, t: Date.now(), st: d.st || {}, pu: d.pu || '' }); if (UI.screen === 'chef' && CHU.tab === 'direct') chefRender(); }
function chefAsk() { const ids = new Set(), now = Date.now(); chefPlayers(); for (const e of CHU.players.values()) if (!e.me && (now - e.t < 7 * 86400e3 || !e.t)) for (const f of e.fids) ids.add(f);
  for (const f of frList()) ids.add(f.id); for (const g of grList()) for (const m of g.members) ids.add(m.id); ids.delete(frMyId());
  const L = [...ids]; for (let i = 0; i < L.length; i += 40) frSendMany(L.slice(i, i + 40), Object.assign({ t: 'stq' }, chefAuth('stq'))); CHU.asked = now; }
async function chefLoadLive() { if (!CHU.asked || Date.now() - CHU.asked > 14000) chefAsk(); const r = await acctCall('live', chefAuth('live'));
  if (r.ok) for (const x of r.live || []) if (x.st) LIVE.set(x.fid, Object.assign({}, LIVE.get(x.fid) || {}, x, { t: Date.now() - Math.max(0, (r.now || 0) - x.t) })); CHU.liveAt = Date.now(); chefRender(); }
setInterval(() => { if (UI.screen === 'chef' && CHU.tab === 'direct' && document.visibilityState === 'visible') chefLoadLive(); }, 10000);
// un vrai joueur = un compte (ou un nom choisi) ; on regroupe tous ses appareils (appli, Chrome, ancien site…)
const chefDefName = (n) => !n || /^(toi|joueur|hôte|hote)$/i.test(String(n).trim());
function chefPlayers() { const map = new Map(), byFid = new Map(), me = frMyId(), myAcc = SAVE.acct ? SAVE.acct.u.toLowerCase() : '';
  const get = (key) => { let e = map.get(key); if (!e) map.set(key, (e = { key, acc: '', names: new Set(), fids: new Set(), codes: new Set(), codeT: {}, t: 0 })); return e; };
  const add = (fid, u, codeId) => { if (!fid) return; let e = u.p ? get('@' + u.p.toLowerCase()) : byFid.get(fid) || get('f:' + fid); if (u.p) e.acc = u.p;
    if (!chefDefName(u.n)) e.names.add(String(u.n)); e.fids.add(fid); byFid.set(fid, e); if (codeId) { e.codes.add(codeId); e.codeT[codeId] = Math.max(e.codeT[codeId] || 0, u.t || 0); } e.t = Math.max(e.t, u.t || 0); };
  for (const x of CHU.srv || []) for (const [fid, u] of Object.entries(x.users || {})) if (u.p) add(fid, u, x.id);   // d'abord les comptes
  for (const x of CHU.srv || []) for (const [fid, u] of Object.entries(x.users || {})) if (!u.p) add(fid, u, x.id);
  for (const p of Net.players || []) if (p.fid) add(p.fid, { n: p.name, t: Date.now() }, null);
  for (const f of frList()) add(f.id, { n: f.name, t: 0 }, null);
  for (const g of grList()) for (const m of g.members) add(m.id, { n: m.name, t: 0 }, null);
  // deux entrées avec le même nom (ou le nom = pseudo d'un compte) = la même personne
  const byName = new Map(); for (const e of map.values()) if (e.acc) { byName.set(e.acc.toLowerCase(), e); for (const n of e.names) if (!byName.has(n.toLowerCase())) byName.set(n.toLowerCase(), e); }
  for (const e of [...map.values()]) { if (e.acc || !e.names.size) continue; const n = [...e.names][0].toLowerCase(), o = byName.get(n);
    if (!o) { byName.set(n, e); continue; } for (const f of e.fids) o.fids.add(f); for (const c of e.codes) { o.codes.add(c); o.codeT[c] = Math.max(o.codeT[c] || 0, e.codeT[c] || 0); } e.names.forEach((x) => o.names.add(x)); o.t = Math.max(o.t, e.t); map.delete(e.key); }
  const c = chefState(); CHU.players = map;
  return [...map.values()].map((e) => Object.assign(e, { cur: Object.keys(e.codeT).sort((x, y) => e.codeT[y] - e.codeT[x])[0] || '', name: e.acc || [...e.names][0] || [...e.fids][0], me: e.fids.has(me) || (!!myAcc && e.acc.toLowerCase() === myAcc), real: !!e.acc || e.names.size > 0,
    banned: [...e.fids].some((f) => c.b.includes(f)) || (!!e.acc && c.b.includes('@' + e.acc.toLowerCase())) })).sort((x, y) => (y.real - x.real) || (y.t - x.t)); }
function chefRender() { const root = $('#chef-root'); if (!root || UI.screen !== 'chef') return; const c = chefState(), esc = (s) => String(s).replace(/[&<>"]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[x]);
  const fmt = (t) => (t ? new Date(t).toLocaleString('fr-FR', Object.assign({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }, new Date(t).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})) : '—');
  const DUR = [['1 h', 1], ['3 h', 3], ['Ce soir', 12], ['1 jour', 24], ['3 jours', 72], ['1 semaine', 168], ['1 mois', 720], ['1 an', 8760]];
  // un joueur n'est attribué qu'au code qu'il utilise MAINTENANT (le dernier vu), pas à ses anciens codes
  const players = chefPlayers(), codeNames = new Map(); for (const e of players) { const id = e.cur; if (!id) continue; if (!codeNames.has(id)) codeNames.set(id, []); codeNames.get(id).push(e); }
  const T = [['direct', 'En direct'], ['joueurs', 'Joueurs'], ['codes', 'Codes'], ['outils', 'Outils']];
  let h = '<header class="sh-head"><button class="back" data-go="chefback" aria-label="Retour">←</button><h2>Mode chef 👑</h2></header>';
  h += '<div class="seg fr-tabs" id="ch-tabs">' + T.map(([k, n]) => '<button data-t="' + k + '" aria-pressed="' + (CHU.tab === k) + '">' + n + '</button>').join('') + '</div>';
  h += '<div class="row"><button class="btn sm ghost" id="ch-reload"><span>' + (CHU.load ? 'Chargement…' : 'Actualiser') + '</span></button></div>' + (CHU.srvErr ? '<p class="hint">' + esc(CHU.srvErr) + '</p>' : '');
  const btnBan = (e) => '<button class="btn sm ' + (e.banned ? 'ghost' : 'red') + '" data-pban="' + esc(e.key) + '"><span>' + (e.banned ? 'Débloquer' : 'Bloquer') + '</span></button>';
  if (CHU.tab === 'direct') {
    const byFid = new Map(); for (const e of players) for (const f of e.fids) byFid.set(f, e);
    const L = [...LIVE.values()].filter((x) => x.fid !== frMyId() && Date.now() - x.t < 100e3).sort((a2, b2) => b2.t - a2.t), seen = new Set(), rows = [];
    for (const x of L) { const e = byFid.get(x.fid), who = x.pu || (e && e.real ? e.name : '') || (chefDefName(x.n) ? '' : x.n); const key = who ? who.toLowerCase() : 'f:' + x.fid; if (seen.has(key)) continue; seen.add(key); rows.push({ x, who: who || x.fid, anon: !who, e }); }
    const S = (st) => { st = st || { s: 'menu' }; const race = st.tr ? ' · ' + esc(st.tr) + (st.fin ? ' · arrivé' : ' · tour ' + st.lap + '/' + st.laps + (st.pl ? ' · ' + ordFr(st.pl) : '')) : '';
      return st.s === 'course' ? '🏁 En course en ligne' + race + ' · partie ' + esc(st.code) + (st.host ? ' (hôte)' : '') + ' · ' + st.n + ' joueur' + (st.n > 1 ? 's' : '')
        : st.s === 'salon' ? '👥 Dans le salon en ligne · partie ' + esc(st.code) + (st.host ? ' (hôte)' : '') + ' · ' + st.n + ' joueur' + (st.n > 1 ? 's' : '')
        : st.s === 'solo' ? '🤖 Seul contre les bots' + race : st.s === 'bloque' ? '🔒 Bloqué sur l\'écran du code' : '🏠 Dans les menus'; };
    h += '<div class="group"><h3>Connectés maintenant (' + rows.length + ')</h3>' + (rows.length ? '' : '<p class="hint">' + (CHU.asked && Date.now() - CHU.asked < 30000 ? 'Je demande aux joueurs ce qu\'ils font… (réponse en moins de 30 secondes)' : 'Personne d\'autre n\'a le jeu ouvert en ce moment.') + '</p>');
    for (const { x, who, anon, e } of rows) { const st = x.st || {}, ago = Math.max(0, Math.round((Date.now() - x.t) / 1000)), online = st.code && (st.s === 'course' || st.s === 'salon'), inIt = Net.peer && Net.code === st.code;
      h += '<div class="fr-row ch-live"><span><b>' + esc(who) + '</b>' + (anon ? ' <small>(appareil sans nom)</small>' : '') + (e && e.banned ? ' <b class="off">bloqué</b>' : '') + '<br><small>' + S(st) + (st.v ? ' · ' + (st.app ? 'appli' : 'site') + ' v.' + esc(st.v) + (st.v !== (UPD.remote || window.TK_VER) ? ' <b class="off">⚠️ ancienne version</b>' : '') : ' · <b class="off">⚠️ ancienne version</b>') + ' · il y a ' + (ago < 60 ? ago + ' s' : Math.round(ago / 60) + ' min') + '</small></span><span class="fr-acts">'
        + (inIt ? '<small>tu y es</small>' : online ? (st.s === 'course' ? '<button class="btn sm" data-cwatch="' + esc(st.code) + '"><span>Regarder</span></button>' : '') + '<button class="btn sm red" data-cjoin="' + esc(st.code) + '"><span>Rejoindre</span></button>' : st.s === 'solo' ? '<small>partie solo</small>' : '') + '</span></div>'; }
    h += '<p class="hint">Les joueurs avec une très vieille version n\'apparaissent pas du tout : demande-leur de fermer puis rouvrir le jeu (version dans Réglages, tout en bas). Mis à jour toutes les 10 secondes. « Regarder » : tu suis la course en cours, puis tu joues la suivante. Les parties solo (contre les bots) sont sur le téléphone du joueur : on ne peut pas les rejoindre.</p></div>';
  } else if (CHU.tab === 'joueurs') {
    const real = players.filter((e) => e.real && !e.me), mine = players.filter((e) => e.me), devs = players.filter((e) => !e.real && !e.me);
    h += '<div class="group"><h3>Joueurs (' + real.length + ')</h3>' + (real.length ? '' : '<p class="hint">Aucun joueur pour l\'instant.</p>');
    for (const e of real) { const codes = (e.cur ? [e.cur] : []).map((id) => { const x = (CHU.srv || []).find((y) => y.id === id); return x ? (c.r.includes(id) ? 'code annulé' : x.exp > Date.now() ? 'code jusqu\'au ' + fmt(x.exp) : 'code expiré') : ''; }).filter(Boolean);
      h += '<div class="fr-row"><span><b>' + esc(e.name) + '</b>' + (e.banned ? ' <b class="off">bloqué</b>' : '') + '<br><small>' + (e.acc ? 'compte ' + esc(e.acc) + ' · ' : 'sans compte · ') + e.fids.size + ' appareil' + (e.fids.size > 1 ? 's' : '') + ' · vu ' + fmt(e.t) + (codes.length ? ' · ' + esc(codes[0]) : '') + '</small></span><span class="fr-acts">' + btnBan(e) + '</span></div>'; }
    h += '</div>';
    if (mine.length) h += '<div class="group"><h3>Toi</h3><p class="hint">' + mine.reduce((n, e) => n + e.fids.size, 0) + ' appareil(s) à toi (appli, Chrome…). Rien à faire.</p></div>';
    h += '<div class="group"><h3>Appareils sans nom (' + devs.length + ')</h3><p class="hint">Anciens appareils ou joueurs qui n\'ont pas encore choisi de nom ni de compte.</p><div class="row"><button class="btn sm ghost" id="ch-devs"><span>' + (CHU.devs ? 'Cacher' : 'Afficher') + '</span></button></div>';
    if (CHU.devs) for (const e of devs) h += '<div class="fr-row"><span><small>' + esc([...e.fids].join(', ')) + ' · vu ' + fmt(e.t) + (e.banned ? ' · <b class="off">bloqué</b>' : '') + '</small></span><span class="fr-acts">' + btnBan(e) + '</span></div>';
    h += '</div><div class="group"><h3>Bloquer par identifiant</h3><div class="fr-add"><input id="ch-fid" placeholder="Identifiant (ex. LEA-4821)" autocapitalize="characters"><button class="btn sm red" id="ch-banid"><span>Bloquer</span></button></div></div>';
  } else if (CHU.tab === 'codes') {
    const all = new Map(); for (const x of c.codes) { const p = wkParseAll(x.code)[0]; if (p) all.set(wkCodeId(p), { id: wkCodeId(p), exp: x.exp, code: x.code, at: x.at, hrs: Math.max(1, Math.round((x.exp - x.at) / 3600e3)) }); }
    for (const x of CHU.srv || []) { const e = all.get(x.id) || { id: x.id, exp: x.exp, hrs: 0 }; e.at = e.at || x.chef || x.first || 0; const us = Object.values(x.users || {}); e.ever = us.length > 0; e.last = us.reduce((m, u) => Math.max(m, u.t || 0), 0); all.set(x.id, e); }
    const myId = (() => { const p0 = SAVE.access && wkParseAll(SAVE.access)[0]; return p0 ? wkCodeId(p0) : ''; })(), myIds = new Set([myId]); for (const e of players) if (e.me && e.cur) myIds.add(e.cur);
    const list = [...all.values()].filter((e) => CHU.all || (e.exp > Date.now() && !c.r.includes(e.id))).sort((a2, b2) => b2.exp - a2.exp);
    const used = list.filter((e) => (codeNames.get(e.id) || []).length || myIds.has(e.id)), unused = list.filter((e) => !used.includes(e));
    // les codes inutilisés depuis plus de 2 h (pas ceux que tu viens de créer pour quelqu'un)
    const old = unused.filter((e) => !e.ever && e.exp > Date.now() && !c.r.includes(e.id) && Date.now() - (e.at || 0) > 2 * 3600e3);
    const row = (e) => { const off = c.r.includes(e.id), live = e.exp > Date.now() && !off, who = codeNames.get(e.id) || [], realW = who.filter((x) => x.real), anon = who.length - realW.length;
      return '<div class="ch-codebox"><div class="fr-row"><span><b class="' + (live ? 'on' : 'off') + '">' + (off ? 'annulé' : e.exp > Date.now() ? 'valable' : 'expiré') + '</b>' + (myIds.has(e.id) ? ' <small>(ton code' + (e.id === myId ? '' : ', autre appareil') + ')</small>' : '') + ' <small>jusqu\'au ' + fmt(e.exp) + (e.code ? ' · ' + esc(e.code.slice(0, 8)) + '…' : '') + '</small><br><small>' + (who.length ? 'Attribué à : ' + [realW.length ? '<b>' + esc(realW.map((x) => x.name + (x.me ? ' (toi)' : '')).join(', ')) + '</b>' : '', anon ? anon + ' appareil' + (anon > 1 ? 's' : '') + ' sans nom' : ''].filter(Boolean).join(' + ') : myIds.has(e.id) ? 'Ton propre code' : e.ever ? 'Plus utilisé depuis le ' + fmt(e.last) : 'Jamais utilisé') + (e.at ? ' · créé le ' + fmt(e.at) : '') + '</small></span>'
        + '<span class="fr-acts"><button class="btn sm ' + (off ? 'ghost' : 'red') + '" data-rev="' + esc(e.id) + '"><span>' + (off ? 'Rétablir' : 'Annuler') + '</span></button>' + (e.code ? '<button class="btn sm ghost" data-copy="' + esc(e.code) + '"><span>Copier</span></button>' : '') + (e.hrs ? '<button class="btn sm ghost" data-redo="' + e.hrs + '"><span>Recréer</span></button>' : '') + '</span></div></div>'; };
    h += '<div class="group"><h3>Codes utilisés (' + used.length + ')</h3><div class="row"><button class="btn sm ghost" id="ch-all"><span>' + (CHU.all ? 'Cacher annulés et expirés' : 'Voir aussi annulés et expirés') + '</span></button></div>' + (used.length ? '' : '<p class="hint">Aucun code utilisé.</p>') + used.map(row).join('') + '</div>';
    h += '<div class="group"><h3>Codes inutilisés (' + unused.length + ')</h3><p class="hint">Personne ne s\'en sert en ce moment. Attention : un joueur qui n\'a pas encore mis à jour son jeu n\'apparaît pas. Le bouton rouge n\'annule que les codes <b>jamais utilisés</b> (et créés il y a plus de 2 h). Une erreur ? « Voir aussi annulés et expirés » > Rétablir.</p><div class="row"><button class="btn sm ghost" id="ch-unused"><span>' + (CHU.unused ? 'Cacher' : 'Afficher') + '</span></button>'
      + (old.length ? '<button class="btn sm red" id="ch-clean"><span>' + (CHU.cleanAsk ? 'Sûr ? Touche encore pour annuler les ' + old.length : 'Annuler les ' + old.length + ' codes jamais utilisés') + '</span></button>' : '') + '</div>' + (CHU.unused ? unused.map(row).join('') : '');
    CHU.oldIds = old.map((e) => e.id);
    h += '<div class="fr-add"><input id="ch-paste" placeholder="Annuler un autre code : colle-le ici"><button class="btn sm ghost" id="ch-revp"><span>Annuler</span></button></div></div>';
  } else {
    h += '<div class="group"><h3>Créer un code</h3><div class="chips" id="ch-dur">' + DUR.map(([n, v]) => '<button data-h="' + v + '" aria-pressed="' + (CHU.hours === v) + '">' + n + '</button>').join('') + '</div>';
    h += '<div class="fr-add"><input id="ch-hrs" type="number" min="1" placeholder="ou nombre d\'heures"><button class="btn sm red" id="ch-make"><span>Créer le code</span></button></div>';
    if (CHU.last) h += '<textarea id="ch-code" rows="3" readonly class="ch-code">' + esc(CHU.last) + '</textarea><div class="row"><button class="btn sm" id="ch-share"><span>Partager</span></button><button class="btn sm ghost" id="ch-copy"><span>Copier</span></button><button class="btn sm ghost" id="ch-friends"><span>Envoyer à mes amis et groupes</span></button></div>';
    h += '</div>';
    h += '<div class="group"><h3>Mot de passe oublié d\'un joueur</h3><p class="hint">Mets son pseudo de compte : tu obtiens un code (valable 24 h, une seule fois). Il le met dans Compte > « Oublié ? ».</p><div class="fr-add"><input id="ch-ru" placeholder="Pseudo du joueur" autocapitalize="off"><button class="btn sm red" id="ch-rmake"><span>Créer le code</span></button></div>' + (CHU.reset ? '<textarea rows="3" readonly class="ch-code" id="ch-rcode">' + esc(CHU.reset) + '</textarea><div class="row"><button class="btn sm" id="ch-rshare"><span>Partager</span></button></div>' : '') + '</div>';
    h += '<div class="group"><h3>Mise à jour du jeu</h3><p class="hint">Version de ton jeu : ' + esc(window.TK_VER || '?') + (UPD.remote ? ' · sur le site : ' + esc(UPD.remote) + (UPD.remote !== window.TK_VER ? ' (nouvelle !)' : ' (à jour)') : '') + '</p><div class="row"><button class="btn sm red" id="ch-upd"><span>Mettre à jour tout le monde</span></button></div></div>';
    h += '<div class="group"><h3>Ta clé du chef</h3><p class="hint">Pour activer le Mode chef sur un autre appareil : copie-la, puis colle-la là-bas dans Réglages > Changer de code. Ne la donne à personne.</p><div class="row"><button class="btn sm ghost" id="ch-key"><span>Copier ma clé du chef</span></button></div></div>';
  }
  h += '<p class="hint">Annuler un code ou bloquer un joueur marche sur tous ses appareils, en moins d\'une minute, même en pleine course.</p>';
  root.innerHTML = h; chefWire(); }
function chefWire() { const qa = (s) => [...document.querySelectorAll('#chef-root ' + s)], q = (s) => $('#chef-root ' + s) || { set onclick(f) { /* absent de cet onglet */ }, value: '' };
  qa('#ch-tabs button').forEach((b) => (b.onclick = () => { CHU.tab = b.dataset.t; chefRender(); if (CHU.tab === 'direct') chefLoadLive(); }));
  const goParty = (code, watch) => { if (Net.peer) netReset(); show('online'); $('#on-code').value = code; netJoin(code); toast(watch ? 'Connexion… tu vas regarder la course en cours.' : 'Connexion à la partie ' + code + '…', 3000); };
  qa('[data-cjoin]').forEach((b) => (b.onclick = () => goParty(b.dataset.cjoin, false)));
  qa('[data-cwatch]').forEach((b) => (b.onclick = () => goParty(b.dataset.cwatch, true)));
  q('#ch-devs').onclick = () => { CHU.devs = !CHU.devs; chefRender(); };
  qa('[data-pban]').forEach((b) => (b.onclick = () => { const e = CHU.players.get(b.dataset.pban); if (!e) return; const c = chefState(), keys = [...e.fids].concat(e.acc ? ['@' + e.acc.toLowerCase()] : []);
    const banned = keys.some((k) => c.b.includes(k)); c.b = banned ? c.b.filter((x) => !keys.includes(x)) : [...new Set(c.b.concat(keys))]; store(); chefPublish(); chefRender(); toast(e.name + (banned ? ' débloqué.' : ' bloqué sur tous ses appareils.'), 2500); }));
  qa('#ch-dur button').forEach((b) => (b.onclick = () => { CHU.hours = +b.dataset.h; chefRender(); }));
  q('#ch-make').onclick = () => { const hh = +q('#ch-hrs').value || CHU.hours; CHU.last = chefMakeCode(Date.now() + hh * 3600e3) || ''; chefRender(); toast('Code créé, valable ' + (hh < 48 ? hh + ' h' : Math.round(hh / 24) + ' jours') + '.', 2500); };
  const msg = () => 'Code Wild Kart, valable jusqu\'au ' + new Date(wkParseAll(CHU.last)[0].exp).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) + ' :\n' + CHU.last + (location.protocol === 'https:' && !window.TK_APP ? '\n\nOu ouvre directement : ' + location.origin + location.pathname + '#code=' + CHU.last : '') + (SAVE.chefList ? '\n\nListe du chef : ' + SAVE.chefList : '');
  const sh = q('#ch-share'); if (sh) sh.onclick = async () => { if (navigator.share) { try { await navigator.share({ title: 'Code Wild Kart', text: msg() }); } catch (e) { /* annulé */ } } else { try { await navigator.clipboard.writeText(msg()); toast('Message copié.', 1500); } catch (e) { /* rien */ } } };
  const cp = q('#ch-copy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(CHU.last); toast('Code copié.', 1500); } catch (e) { toast('Copie impossible : appui long sur le code.', 2500); } };
  const sf = q('#ch-friends'); if (sf) sf.onclick = () => { const ids = new Set(frList().map((f) => f.id)); for (const g of grList()) for (const m of g.members) if (m.id !== frMyId()) ids.add(m.id); let n = 0, left = ids.size; if (!left) { toast('Pas encore d\'amis ni de groupe.', 2000); return; }
    for (const id of ids) frSend(id, { t: 'acc', code: CHU.last }, (ok) => { if (ok) n++; if (--left === 0) toast('Code envoyé à ' + n + ' joueur' + (n > 1 ? 's' : '') + ' en ligne.', 3000); }); };
  q('#ch-rmake').onclick = () => { const u = q('#ch-ru').value.trim(); if (!/^[A-Za-z0-9_-]{3,16}$/.test(u)) { toast('Pseudo : 3 à 16 lettres ou chiffres.', 2000); return; } const sk = chefSk(); if (!sk) return;
    const body = new TextEncoder().encode(JSON.stringify({ u: u.toLowerCase(), e: Date.now() + 24 * 3600e3, n: wkHex(nacl.randomBytes(4)) })); CHU.reset = 'WKR.' + wkB64u(body) + '.' + wkB64u(nacl.sign.detached(body, sk)); CHU.resetU = u; chefRender(); };
  const rs = q('#ch-rshare'); if (rs) rs.onclick = async () => { const t = 'Wild Kart : code pour changer ton mot de passe (compte ' + CHU.resetU + ', valable 24 h). Ouvre Compte > « Oublié ? » et colle :\n' + CHU.reset; if (navigator.share) { try { await navigator.share({ text: t }); } catch (e) { /* annulé */ } } else { try { await navigator.clipboard.writeText(t); toast('Copié.', 1500); } catch (e) { /* rien */ } } };
  q('#ch-key').onclick = async () => { try { await navigator.clipboard.writeText('WKCHEF.' + SAVE.chefKey); toast('Clé du chef copiée.', 2000); } catch (e) { toast('Copie impossible.', 2000); } };
  q('#ch-upd').onclick = () => { chefState().u = Date.now(); store(); chefPublish(); toast('Mise à jour envoyée à tous les jeux.', 3000); updCheck(true); };
  const ban = (fid) => { const c = chefState(); c.b = c.b.includes(fid) ? c.b.filter((x) => x !== fid) : c.b.concat([fid]); store(); chefPublish(); chefRender(); };
  qa('[data-ban]').forEach((b) => (b.onclick = () => ban(b.dataset.ban)));
  q('#ch-banid').onclick = () => { const id = frNorm(q('#ch-fid').value); if (!id) { toast('L\'identifiant ressemble à LEA-4821.', 2000); return; } if (id === frMyId()) { toast('C\'est toi !', 1500); return; } if (!chefState().b.includes(id)) ban(id); };
  const rev = (id) => { if (!id) return; const c = chefState(); c.r = c.r.includes(id) ? c.r.filter((x) => x !== id) : c.r.concat([id]); store(); chefPublish(); chefRender(); };
  qa('[data-rev]').forEach((b) => (b.onclick = () => rev(b.dataset.rev)));
  q('#ch-all').onclick = () => { CHU.all = !CHU.all; chefRender(); };
  q('#ch-unused').onclick = () => { CHU.unused = !CHU.unused; chefRender(); };
  q('#ch-clean').onclick = () => { if (!CHU.cleanAsk) { CHU.cleanAsk = true; chefRender(); setTimeout(() => { CHU.cleanAsk = false; chefRender(); }, 5000); return; } CHU.cleanAsk = false; const c = chefState(), n = (CHU.oldIds || []).length; c.r = [...new Set(c.r.concat(CHU.oldIds || []))]; store(); chefPublish(); chefRender(); toast(n + ' codes inutilisés annulés.', 2500); }; q('#ch-reload').onclick = () => { chefLoadCodes(); chefLoadLive(); };
  qa('[data-copy]').forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast('Code copié.', 1500); } catch (e) { toast('Copie impossible.', 1500); } }));
  qa('[data-redo]').forEach((b) => (b.onclick = () => { const hh = +b.dataset.redo; CHU.last = chefMakeCode(Date.now() + hh * 3600e3) || ''; chefRender(); }));
  q('#ch-revp').onclick = () => { const v = q('#ch-paste').value; let p = null; for (const c of wkParseAll(v)) { try { if (nacl.sign.detached.verify(c.msg, c.sig, WK_PK)) { p = c; break; } } catch (e) { /* rien */ } } if (!p) { toast('Ce n\'est pas un code valable.', 2000); return; } const id = wkCodeId(p); if (!chefState().r.includes(id)) rev(id); toast('Code annulé.', 1500); };
}
function chefButtons() { const on = isChef(); document.querySelectorAll('.chef-only').forEach((e) => (e.hidden = !on)); }

/* ================= v13 : compte (pseudo + mot de passe) : on retrouve tout sur n'importe quel téléphone ================= */
// Le compte garde : identifiant ami, amis, groupes, code d'accès, kart, réglages de jeu, records. Sauvegarde automatique.
const WK_API = window.TK_API || 'https://wild-kart-serveur.uncreeper5431.workers.dev/api/compte';   // serveur gratuit (Cloudflare) ; il reprend tout seul les comptes de l'ancien serveur Netlify
// tout est dans le compte (kart, réglages, calibrage, records…) sauf : la clé du chef (secrète), ce qui sert à revenir dans une partie
// en cours sur CET appareil, et les graphismes (qui dépendent de la puissance de chaque téléphone)
const ACC_SKIP = new Set(['acct', 'chefKey', 'uid', 'lastCode', 'lastCodeAt', 'quality', 'fps', 'accSeen', 'updSeen', 'v']);
const ACU = { tab: 'creer', busy: false, msg: '', rec: '', timer: 0, lastUp: 0, open: false };
async function acctCall(a, body) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = setTimeout(() => ctl && ctl.abort(), 15000);
  try { const r = await fetch(WK_API, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(Object.assign({ a }, body)), signal: ctl ? ctl.signal : undefined, keepalive: a === 'save' });
    let j = {}; try { j = await r.json(); } catch (e) { /* rien */ } if (!r.ok && !j.e) j.e = 'Serveur des comptes indisponible (' + r.status + ').'; j.status = r.status; return j; }
  catch (e) { return { e: 'Pas de connexion au serveur des comptes (' + (e && e.name === 'AbortError' ? 'trop lent' : 'réseau') + ').' }; } finally { clearTimeout(tm); } }
function acctPack() { const o = {}; for (const k in SAVE) if (!ACC_SKIP.has(k)) o[k] = SAVE[k]; return o; }
// date du dernier changement de chaque réglage (pour garder le plus récent entre deux appareils)
const ACT = { snap: null };
function acctTrack() { const ts = (SAVE._ts = SAVE._ts && typeof SAVE._ts === 'object' ? SAVE._ts : {}), now = Date.now(); if (!ACT.snap) { ACT.snap = {}; for (const k in SAVE) if (k !== '_ts') ACT.snap[k] = JSON.stringify(SAVE[k]); return; }
  for (const k in SAVE) { if (k === '_ts' || ACC_SKIP.has(k)) continue; const j = JSON.stringify(SAVE[k]); if (ACT.snap[k] !== j) { ACT.snap[k] = j; if (!ACU.applying) ts[k] = now; } } }
// fusion compte + appareil : pour chaque réglage le plus récent ; amis, groupes et records additionnés (on ne perd jamais rien)
function acctMerge(sv, lo) { sv = sv || {}; const st = sv._ts || {}, lt = lo._ts || {}, out = {}, ts = {};
  const keys = new Set([...Object.keys(sv), ...Object.keys(lo)].filter((k) => !ACC_SKIP.has(k) && k !== '_ts'));
  for (const k of keys) { const inS = k in sv, inL = k in lo; out[k] = !inS ? lo[k] : !inL ? sv[k] : (lt[k] || 0) > (st[k] || 0) ? lo[k] : sv[k]; ts[k] = Math.max(st[k] || 0, lt[k] || 0); }
  const uni = (a, b, key) => { const r = Array.isArray(a) ? a.slice() : []; for (const x of Array.isArray(b) ? b : []) if (x && !r.some((y) => y && y[key] === x[key])) r.push(x); return r; };
  out.friends = uni(sv.friends, lo.friends, 'id'); out.groups = uni(sv.groups, lo.groups, 'code'); out.fidOld = [...new Set((sv.fidOld || []).concat(lo.fidOld || []))].slice(-10);
  const mn = (a, b2) => (a && b2 ? Math.min(a, b2) : a || b2 || undefined), rec = Object.assign({}, sv.records || {});
  for (const [k, v] of Object.entries(lo.records || {})) { const o = rec[k] || {}; rec[k] = Object.assign({}, v, o, { lap: mn(o.lap, v && v.lap), race: mn(o.race, v && v.race) }); } out.records = rec;
  if (!(out.access && accessCheck(out.access).ok)) { const alt = [sv.access, lo.access].find((x) => x && accessCheck(x).ok); if (alt) out.access = alt; }
  out._ts = ts; return out; }
// applique le compte sur cet appareil (sans relancer le jeu)
function acctApply(r) { const before = JSON.stringify(acctPack()), m = acctMerge(r.save, SAVE); ACU.applying = true;
  for (const k of Object.keys(SAVE)) if (!ACC_SKIP.has(k)) delete SAVE[k]; for (const k in DEFAULT_SAVE) if (!ACC_SKIP.has(k) && !(k in m)) SAVE[k] = DEFAULT_SAVE[k];
  Object.assign(SAVE, m); if (r.fid) SAVE.fid = r.fid; SAVE.friends = (SAVE.friends || []).filter((f) => f.id !== SAVE.fid);
  SAVE.acct = { u: r.pseudo || (SAVE.acct && SAVE.acct.u), tok: r.tok || (SAVE.acct && SAVE.acct.tok), at: r.at || Date.now() }; store(); ACT.snap = null; acctTrack(); ACU.applying = false;
  const changed = before !== JSON.stringify(acctPack()); if (changed) acctRefreshUI();
  if (JSON.stringify(acctPack()) !== JSON.stringify(Object.assign({}, r.save || {}, { fid: SAVE.fid }))) { ACU.timer = 0; setTimeout(() => { if (SAVE.acct) acctUpload(); }, 2500); }
  return changed; }
// réaffiche ce qui dépend des réglages (son, kart, nom…)
function acctRefreshUI() { try { AudioSys.setVolumes(); } catch (e) { /* rien */ } try { if (UI.screen === 'settings') syncSettings(); } catch (e) { /* rien */ } try { refreshGarageKart(); } catch (e) { /* rien */ }
  try { const n = $('#g-pseudo'); if (n && document.activeElement !== n) n.value = SAVE.name || ''; const t = $('#g-name'); if (t) t.textContent = SAVE.name || 'Toi'; } catch (e) { /* rien */ } try { if (G.race && G.race.state === 'attract' && G.karts[4]) { /* le kart de la démo change à la prochaine course */ } } catch (e) { /* rien */ } }
// les autres appareils du même compte : on récupère leurs changements toutes les 30 secondes (jamais en pleine course)
async function acctPull(quiet) { if (!SAVE.acct || ACU.pulling) return; if (G.race && G.race.state !== 'attract') return; ACU.pulling = true;
  try { const r = await acctCall('load', { pseudo: SAVE.acct.u, tok: SAVE.acct.tok }); if (!SAVE.acct) return;
    if (r.ok && r.at > (SAVE.acct.at || 0)) { r.tok = SAVE.acct.tok; r.pseudo = SAVE.acct.u; const fidWas = SAVE.fid; const ch = acctApply(r); if (fidWas !== SAVE.fid) frRestart(); if (ch && !quiet) toast('Mis à jour depuis ton autre appareil.', 2000); if (SAVE.access && accessCheck(SAVE.access).ok && G.locked) gateHide(); }
    else if (r.status === 401) { SAVE.acct = null; store(); toast('Reconnecte-toi à ton compte (Réglages > Compte).', 4000); } acctInfo(); } finally { ACU.pulling = false; } }
setInterval(() => { if (document.visibilityState === 'visible') acctPull(); }, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') acctPull(); });
// sauvegarde automatique (quelques secondes après un changement)
function acctDirty() { if (!SAVE.acct || ACU.applying) return; clearTimeout(ACU.timer); ACU.timer = setTimeout(acctUpload, Math.max(4000, 20000 - (Date.now() - ACU.lastUp))); }
async function acctUpload() { if (!SAVE.acct) return; clearTimeout(ACU.timer); ACU.lastUp = Date.now(); const r = await acctCall('save', { pseudo: SAVE.acct.u, tok: SAVE.acct.tok, save: acctPack() });
  if (r.ok) { SAVE.acct.at = r.at; ACU.applying = true; store(); ACU.applying = false; acctInfo(); } else if (r.status === 401) { toast('Ton compte s\'est déconnecté : reconnecte-toi (Réglages > Compte).', 5000); SAVE.acct = null; store(); acctInfo(); } return r; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && SAVE.acct && ACU.timer) acctUpload(); });
function acctInfo() { const t = SAVE.acct ? 'Connecté : ' + SAVE.acct.u + (SAVE.acct.at ? ' · sauvegardé ' + new Date(SAVE.acct.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '') : 'Pas de compte sur ce téléphone.';
  const el = $('#set-acct'); if (el) el.textContent = t; }
// ---------- fenêtre du compte (par-dessus tout, même l'écran du code) ----------
function acctOpen(tab) { ACU.open = true; if (tab) ACU.tab = tab; ACU.msg = ''; let d = $('#acct'); if (!d) { d = document.createElement('div'); d.id = 'acct'; document.body.appendChild(d); } d.hidden = false; acctRender(); }
function acctClose() { ACU.open = false; ACU.rec = ''; const d = $('#acct'); if (d) d.hidden = true; acctInfo(); }
function acctRender() { const d = $('#acct'); if (!d || !ACU.open) return; const esc = (s) => String(s).replace(/[&<>"]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[x]);
  const inp = (id, ph, type) => '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + ph + '" autocomplete="off" autocapitalize="off" spellcheck="false">';
  let h = '<div class="gate-box acct-box"><h2>Mon compte</h2>';
  if (ACU.rec) h += '<p><b>Compte prêt !</b> Garde ce code de secours (fais une capture d\'écran). Il sert si tu oublies ton mot de passe :</p><p class="acct-rec">' + esc(ACU.rec) + '</p><button class="btn red" id="ac-ok"><span>C\'est noté</span></button>';
  else if (SAVE.acct) h += '<p>Connecté : <b>' + esc(SAVE.acct.u) + '</b><br><small>Identifiant ami ' + esc(frMyId()) + '. Tout se sauvegarde tout seul.</small></p><div class="acct-row"><button class="btn sm" id="ac-save"><span>Sauvegarder maintenant</span></button><button class="btn sm ghost" id="ac-out"><span>Se déconnecter</span></button></div>'
    + '<details><summary>Changer de mot de passe</summary>' + inp('ac-old', 'Mot de passe actuel', 'password') + inp('ac-new', 'Nouveau mot de passe', 'password') + '<button class="btn sm" id="ac-pass"><span>Changer</span></button></details>';
  else {
    h += '<div class="seg acct-tabs"><button data-t="creer" aria-pressed="' + (ACU.tab === 'creer') + '">Créer</button><button data-t="co" aria-pressed="' + (ACU.tab === 'co') + '">Se connecter</button><button data-t="perdu" aria-pressed="' + (ACU.tab === 'perdu') + '">Oublié ?</button></div>';
    if (ACU.tab === 'creer') h += '<p><small>Garde tes amis, ton code d\'accès, ton kart et tes records, même si tu changes de téléphone.</small></p>' + inp('ac-u', 'Pseudo (ex. Lea_92)') + inp('ac-p', 'Mot de passe (4 caractères ou plus)', 'password') + '<button class="btn red" id="ac-go"><span>Créer mon compte</span></button>';
    else if (ACU.tab === 'co') h += '<p><small>Les données de ce téléphone seront remplacées par celles de ton compte.</small></p>' + inp('ac-u', 'Pseudo') + inp('ac-p', 'Mot de passe', 'password') + '<button class="btn red" id="ac-go"><span>Se connecter</span></button>';
    else h += '<p><small>Mets ton code de secours, ou un code de réinitialisation demandé au chef.</small></p>' + inp('ac-u', 'Pseudo') + inp('ac-c', 'Code de secours ou code du chef') + inp('ac-p', 'Nouveau mot de passe', 'password') + '<button class="btn red" id="ac-go"><span>Réinitialiser</span></button>';
  }
  h += '<p class="gate-msg" id="ac-msg">' + esc(ACU.busy ? 'Un instant…' : ACU.msg) + '</p>' + (ACU.rec ? '' : '<button class="btn ghost" id="ac-close"><span>Fermer</span></button>') + '</div>';
  d.innerHTML = h; acctWire(); }
function acctWire() { const q = (s) => $('#acct ' + s), v = (s) => (q(s) ? q(s).value : '').trim();
  document.querySelectorAll('#acct .acct-tabs button').forEach((b) => (b.onclick = () => { ACU.tab = b.dataset.t; ACU.msg = ''; acctRender(); }));
  const cl = q('#ac-close'); if (cl) cl.onclick = acctClose;
  const ok = q('#ac-ok'); if (ok) ok.onclick = () => { ACU.rec = ''; location.reload(); };
  const busy = async (fn) => { if (ACU.busy) return; ACU.busy = true; acctRender(); let r; try { r = await fn(); } finally { ACU.busy = false; } if (r && r.e) ACU.msg = r.e; acctRender(); return r; };
  const go = q('#ac-go'); if (go) go.onclick = () => { const u = v('#ac-u'), p = q('#ac-p').value, cd = v('#ac-c'); busy(async () => {
    if (ACU.tab === 'creer') { const r = await acctCall('create', { pseudo: u, pass: p, fid: frMyId(), save: acctPack() }); if (r.ok) { const old = SAVE.fid; acctApply(r); ACU.rec = r.rec; if (old !== r.fid) frRestart(); toast('Compte créé.', 2500); acctRender(); } return r; }
    if (ACU.tab === 'co') { const r = await acctCall('login', { pseudo: u, pass: p }); if (r.ok) { const fidWas = SAVE.fid; acctApply(r); if (fidWas !== SAVE.fid) frRestart(); acctUpload(); toast('Connecté ! Tout est récupéré.', 2500); if (SAVE.access && accessCheck(SAVE.access).ok && G.locked) gateHide(); acctClose(); } return r; }
    const r = await acctCall('reset', { pseudo: u, code: cd, pass: p }); if (r.ok) { acctApply(r); ACU.rec = r.rec; acctRender(); } return r; }); };
  const sv = q('#ac-save'); if (sv) sv.onclick = () => busy(async () => { const r = await acctUpload(); if (r && r.ok) { ACU.msg = 'Sauvegardé.'; acctRender(); } return r; });
  const out = q('#ac-out'); if (out) out.onclick = () => busy(async () => { await acctUpload(); await acctCall('logout', { pseudo: SAVE.acct.u, tok: SAVE.acct.tok }); SAVE.acct = null; store(); ACU.msg = 'Déconnecté. Tes données restent sur ce téléphone.'; acctRender(); });
  const pw = q('#ac-pass'); if (pw) pw.onclick = () => { const po = q('#ac-old').value, pn = q('#ac-new').value; busy(async () => { const r = await acctCall('pass', { pseudo: SAVE.acct.u, tok: SAVE.acct.tok, old: po, pass: pn }); if (r.ok) { SAVE.acct.tok = r.tok; store(); ACU.msg = 'Mot de passe changé.'; acctRender(); } return r; }); };
}
// au lancement : on récupère la dernière sauvegarde du compte (si un autre téléphone a joué entre-temps)
setTimeout(async () => { acctInfo(); const o = $('#set-acct-open'); if (o) o.onclick = () => { AudioSys.sfx('click'); acctOpen(); };
  acctPull(true);
  acctInfo(); }, 400);

setTimeout(() => { try { acctTrack(); } catch (e) { /* rien */ } }, 0);   // photo de départ des réglages

/* ================= v13 : mises à jour sans réinstaller ================= */
// Le jeu regarde régulièrement s'il existe une nouvelle version sur le site. Si oui : bouton « Mettre à jour ».
// Le chef peut aussi « Mettre à jour tout le monde » : chaque jeu se met à jour tout seul après sa course.
const UPD = { remote: '', forced: false, el: null };
// données apportées par l'appli la première fois (elle ouvre le site avec #import=…)
(function updImport() { const m = /#import=([^&]+)/.exec(location.hash || ''); if (!m) return; try { history.replaceState(null, '', location.pathname); } catch (e) { /* rien */ }
  try { const txt = decodeURIComponent(escape(atob(decodeURIComponent(m[1])))); const d = JSON.parse(txt); const cur = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
    if (d && typeof d === 'object' && !cur.fid && !cur.access) { localStorage.setItem(KEY, JSON.stringify(d)); location.reload(); } } catch (e) { /* rien */ } })();
try { if (/[?&]maj=/.test(location.search)) history.replaceState(null, '', location.pathname + (window.TK_APP ? '?app=1' : '')); } catch (e) { /* rien */ }
const racingNow = () => !!(G.race && ['race', 'countdown', 'intro'].includes(G.race.state) && !G.race.resultsShown);
async function updCheck(quietIfSame) { if (BUILD !== 'pwa' || !window.TK_VER || location.hostname === 'localhost' && window.TK_APP) return;
  try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return; const j = await r.json(); UPD.remote = String(j.v || ''); } catch (e) { return; }
  if (UI.screen === 'chef') chefRender(); updVerText();
  if (UPD.remote && UPD.remote !== window.TK_VER) { if (UPD.forced) updWhenFree(); else updBanner(); } }
function updBanner() { if (UPD.el) { UPD.el.hidden = false; return; } const b = document.createElement('button'); b.id = 'upd-btn'; b.className = 'btn red sm'; b.innerHTML = '<span>Nouvelle version : mettre à jour</span>';
  b.onclick = () => { if (racingNow()) { toast('Après la course !', 1500); return; } updApply(); }; document.body.appendChild(b); UPD.el = b; }
function updWhenFree() { if (racingNow()) { setTimeout(updWhenFree, 5000); return; } toast('Mise à jour du jeu…', 2000); setTimeout(updApply, 1200); }
async function updApply() { try { if (typeof acctUpload === 'function' && SAVE.acct) await acctUpload(); } catch (e) { /* rien */ }
  // on vide l'ancienne copie du jeu, puis on recharge la page toute fraîche (adresse unique : rien ne vient d'une ancienne copie)
  try { if (window.caches) { for (const k of await caches.keys()) await caches.delete(k); } } catch (e) { /* rien */ }
  try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* rien */ }
  const app = window.TK_APP ? 'app=1&' : ''; location.replace(location.pathname + '?' + app + 'maj=' + Date.now()); }
// le chef a demandé une mise à jour pour tous
function updForced(u) { if (!u || u <= (SAVE.updSeen || 0)) return; const first = !SAVE.updSeen; SAVE.updSeen = u; store(); if (first && !UPD.remote) { /* première liste vue : on vérifie quand même */ } UPD.forced = true; setTimeout(() => updCheck(), 500); }
setTimeout(() => { updCheck(); setInterval(updCheck, 5 * 60e3); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updCheck(); }); }, 5000);

// numéro de version visible dans Réglages (pour savoir si on est à jour)
function updVerText() { const el = $('#set-ver'); if (!el || !window.TK_VER) return; const d = new Date(); el.textContent = 'Wild Kart · version ' + window.TK_VER + (UPD.remote ? (UPD.remote === window.TK_VER ? ' · à jour ✓' : ' · nouvelle version disponible') : ''); }
setTimeout(updVerText, 500);

/* ================= v13 : mise en relation par le serveur Wild Kart (remplace le service PeerJS, souvent en panne) ================= */
// Les téléphones s'échangent leur « adresse » WebRTC par le serveur (2 petits messages), puis jouent en direct entre eux.
// Même façon de s'en servir que PeerJS : new WKPeer(id), peer.connect(id), on('open' | 'connection' | 'data' | 'close' | 'error').
class WKEmit { constructor() { this._h = {}; } on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; } emit(e, ...a) { for (const f of (this._h[e] || []).slice()) { try { f(...a); } catch (x) { console.error(x); } } } }
const wkRand = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (b) => (b % 36).toString(36)).join(''); };
// adresses STUN + relais TURN (Cloudflare, donné par notre serveur) : le relais sert quand les deux téléphones sont sur des réseaux différents
const WKICE = { list: null, at: 0, p: null };
function wkIceLoad() { if (WKICE.p && Date.now() - WKICE.at < 5 * 3600e3) return WKICE.p; WKICE.at = Date.now();
  WKICE.p = acctCall('ice', {}).then((r) => { if (r && r.ok && Array.isArray(r.iceServers) && r.iceServers.length) WKICE.list = r.iceServers; }).catch(() => {}); return WKICE.p; }
const wkIceReady = () => Promise.race([wkIceLoad(), new Promise((r) => setTimeout(r, 3000))]);
const wkIce = () => { const base = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }], pj = window.peerjs && peerjs.util && peerjs.util.defaultConfig;
  return { iceServers: (WKICE.list || []).concat(base, pj ? (pj.iceServers || []).filter((x) => String(x.urls).includes('turn')) : []) }; };
setTimeout(wkIceLoad, 2000);
const wkIceDone = (pc) => new Promise((res) => { if (pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, 3500); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); });
class WKConn extends WKEmit {
  constructor(owner, remote, cid, pc) { super(); this._o = owner; this.peer = remote; this.cid = cid; this.open = false; this._dead = false; if (pc) this.setPc(pc); }
  setPc(pc) { this.pc = pc; if (this._dead) { try { pc.close(); } catch (e) { /* rien */ } return; }
    pc.onconnectionstatechange = () => { const s = pc.connectionState; if (s === 'failed' || s === 'closed') this._closed(); else if (s === 'disconnected') setTimeout(() => { if (pc.connectionState === 'disconnected') this._closed(); }, 6000); }; }
  _bind(ch) { this.ch = ch; ch.onopen = () => { this.open = true; this._o._loop(); this.emit('open'); }; ch.onmessage = (ev) => { let d; try { d = JSON.parse(ev.data); } catch (e) { return; } this.emit('data', d); };
    ch.onclose = () => this._closed(); ch.onerror = () => { if (!this.open) this.emit('error', { type: 'webrtc' }); }; }
  send(d) { if (this.open && this.ch && this.ch.readyState === 'open') this.ch.send(JSON.stringify(d)); }
  close() { this._closed(); }
  _closed() { if (this._dead) return; this._dead = true; this.open = false; try { this.ch && this.ch.close(); } catch (e) { /* rien */ } try { this.pc && this.pc.close(); } catch (e) { /* rien */ } this._o._conns.delete(this.cid); this.emit('close'); }
}
class WKPeer extends WKEmit {
  constructor(id) { super(); this.host = typeof id === 'string'; this.id = this.host ? id : 'wkp-' + wkRand(12); this.open = false; this.destroyed = false; this.disconnected = false; this._conns = new Map(); this._fails = 0; setTimeout(() => this._reg(), 0); }
  async _reg() { const r = await acctCall('sigreg', { id: this.id }); if (this.destroyed) return;
    if (!r.ok) { this.emit('error', { type: r.code === 'unavailable-id' ? 'unavailable-id' : 'server-error' }); return; }
    this.open = true; this.emit('open', this.id); this._loop(); if (this.host) { this._chk = setInterval(() => this._check(), 15000); setTimeout(() => this._check(), 1500); } }
  async _check() { if (this.destroyed) { clearInterval(this._chk); return; } const r = await acctCall('sigsend', { id: this.id, msg: { k: 'ping' } }); if (this.destroyed) return;
    if (r.ok) { this.visible = Date.now(); } else if (r.code === 'peer-unavailable') { const g = await acctCall('sigreg', { id: this.id }); this.visible = g.ok ? Date.now() : 0; } else this.visible = 0;
    this.emit('visible', !!this.visible); }
  // l'hôte écoute toujours (nouveaux joueurs, retours) ; un invité seulement pendant qu'il se connecte
  _loop() { if (this.destroyed || !this.open) return; clearTimeout(this._t); const pending = [...this._conns.values()].some((c) => !c.open);
    if (!this.host && !pending) return; this._t = setTimeout(() => this._poll(), pending ? 700 : document.visibilityState === 'visible' ? 3000 : 8000); }
  async _poll() { if (this.destroyed) return; const r = await acctCall('sigpoll', { id: this.id }); if (this.destroyed) return;
    if (!r.ok) { if (++this._fails >= 5 && !this.disconnected) { this.disconnected = true; this.emit('disconnected'); } }
    else { this._fails = 0; this.disconnected = false; for (const m of r.msgs || []) this._onSig(m); }
    this._loop(); }
  reconnect() { this.disconnected = false; this._fails = 0; this._poll(); }
  destroy() { if (this.destroyed) return; this.destroyed = true; clearTimeout(this._t); clearInterval(this._chk); for (const c of [...this._conns.values()]) c.close(); acctCall('sigdel', { id: this.id }); this.emit('close'); }
  connect(remote) { const cid = wkRand(10), c = new WKConn(this, remote, cid, null); this._conns.set(cid, c);
    (async () => { try { await wkIceReady(); if (c._dead) return; const pc = new RTCPeerConnection(wkIce()); c.setPc(pc); c._bind(pc.createDataChannel('wk', { ordered: true })); await pc.setLocalDescription(await pc.createOffer()); await wkIceDone(pc); if (c._dead) return;
        const r = await acctCall('sigsend', { id: remote, msg: { k: 'offer', from: this.id, cid, sdp: pc.localDescription.sdp } });
        if (!r.ok) { if (r.code === 'peer-unavailable') this.emit('error', { type: 'peer-unavailable' }); c.emit('error', { type: r.code || 'server-error' }); c._closed(); return; }
        this._loop(); this._poll(); } catch (e) { c.emit('error', { type: 'webrtc' }); c._closed(); } })();
    setTimeout(() => { if (!c.open && !c._dead) { c.emit('error', { type: 'timeout' }); c._closed(); } }, 30000); return c; }
  async _onSig(m) {
    if (m.k === 'ping') return;
    if (m.k === 'offer') { if (this._conns.has(m.cid)) return; const c = new WKConn(this, m.from, m.cid, null); this._conns.set(m.cid, c); this.emit('connection', c);
      try { await wkIceReady(); const pc = new RTCPeerConnection(wkIce()); c.setPc(pc); pc.ondatachannel = (ev) => c._bind(ev.channel); await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp }); await pc.setLocalDescription(await pc.createAnswer()); await wkIceDone(pc);
        const r = await acctCall('sigsend', { id: m.from, msg: { k: 'answer', from: this.id, cid: m.cid, sdp: pc.localDescription.sdp } }); if (!r.ok) c._closed(); } catch (e) { c._closed(); } }
    else if (m.k === 'answer') { const c = this._conns.get(m.cid); if (c && !c._dead && !c._ans) { c._ans = true; try { await c.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }); } catch (e) { c._closed(); } } }
  }
}
// tests : window.TK_PEER_OPTS → ancien service PeerJS
const netPeer = (id) => (window.TK_PEER_OPTS ? (id ? new Peer(id, PEER_OPTS()) : new Peer(PEER_OPTS())) : new WKPeer(id));

// spectateur : on lance la course chez soi avec un kart invisible déjà « arrivé », et on suit les autres
function netWatch(d) { const st = d.start; const m = Object.assign({}, st, { delay: (st.delay || 7000) - (d.elapsed || 0), roster: st.roster.concat([{ id: Net.id, cfg: Object.assign({}, myCfg(), { name: SAVE.name || 'Spectateur' }), slot: 7, ai: false }]) });
  netStartRace(m); const R = G.race; if (!R) return; const k = R.player; if (k) { k.spect = true; k.finished = true; k.finishTime = 0; k.item = null; if (k.mesh && k.mesh.g) k.mesh.g.visible = false; }
  R.state = 'finished'; R.watching = true; R.resultsShown = true; show(null);
  setTimeout(() => { if (G.race === R) { specStart(); toast('Tu regardes la course. Tu joueras la suivante.', 3500); } }, 700); }
/* ================= Entrées ================= */
const Input = { keys: {}, pad: { left: false, right: false, drift: false, item: false }, itemEdge: false, tiltAngle: 0, tiltSeen: false, tiltSteer: 0, digSteer: 0, useTilt: false, listening: false };
function screenAngle() { let a = 0; if (screen.orientation && typeof screen.orientation.angle === 'number') a = screen.orientation.angle; else if (typeof window.orientation === 'number') a = window.orientation; return ((a % 360) + 360) % 360; }
function onOrient(e) {
  if (e.beta == null || e.gamma == null) return; Input.tiltSeen = true;
  const b = e.beta * DEG, g = e.gamma * DEG; const ux = -Math.sin(g) * Math.cos(b), uy = Math.sin(b);
  const a = screenAngle(); let sx, sy;
  if (a === 90) { sx = -uy; sy = ux; } else if (a === 270) { sx = uy; sy = -ux; } else if (a === 180) { sx = -ux; sy = -uy; } else { sx = ux; sy = uy; }
  if (sx * sx + sy * sy < .02) return;
  Input.tiltAngle = Math.atan2(-sx, sy) * RAD;
}
function listenMotion() { if (!Input.listening) { window.addEventListener('deviceorientation', onOrient); Input.listening = true; } }
function ensureMotion() {
  let perm = null;
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try { perm = DeviceOrientationEvent.requestPermission(); } catch (e) { return Promise.resolve(false); }
  }
  return Promise.resolve(perm).then((r) => {
    if (r && r !== 'granted') return false; listenMotion();
    return new Promise((res) => { if (Input.tiltSeen) return res(true); let n = 0; const iv = setInterval(() => { if (Input.tiltSeen || ++n > 15) { clearInterval(iv); res(Input.tiltSeen); } }, 100); });
  }).catch(() => false);
}
function tiltRel() { let rel = angDiffDeg(SAVE.calib, Input.tiltAngle); if (SAVE.invert) rel = -rel; return rel; }
function updateSteerInput_old(dt) {
  const k = Input.keys, p = Input.pad;
  const l = k.ArrowLeft || k.KeyA || k.KeyQ || p.left, r = k.ArrowRight || k.KeyD || p.right;
  const target = (r ? 1 : 0) - (l ? 1 : 0);
  const rate = target === 0 ? 9 : (Math.sign(target) !== Math.sign(Input.digSteer) ? 12 : 5.5);
  Input.digSteer += clamp(target - Input.digSteer, -rate * dt, rate * dt);
  if (Input.useTilt) {
    const rel = tiltRel(), maxA = 26 / SAVE.sens, dz = 1.5; let s = 0;
    if (Math.abs(rel) > dz) s = Math.sign(rel) * Math.pow(clamp((Math.abs(rel) - dz) / (maxA - dz), 0, 1), 1.2);
    Input.tiltSteer += (s - Input.tiltSteer) * (1 - Math.exp(-dt * 20));
  } else Input.tiltSteer = 0;
  const steer = clamp(Input.tiltSteer + Input.digSteer, -1, 1);
  const drift = !!(k.Space || k.ShiftLeft || k.ShiftRight || k.ArrowDown || k.KeyS || p.drift);
  return { steer, drift };
}
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  Input.keys[e.code] = true;
  if (['KeyE', 'KeyX', 'Enter', 'ControlLeft'].includes(e.code) && !e.repeat) Input.itemEdge = true;
  if ((e.code === 'Escape' || e.code === 'KeyP') && G.race && ['race', 'countdown', 'intro'].includes(G.race.state)) togglePause();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
window.addEventListener('blur', () => { Input.keys = {}; });
$$('#pad .pbtn').forEach((b) => {
  const k = b.dataset.k; const ids = new Set(); if (k === 'gas' || k === 'drift') return;
  const down = (e) => { e.preventDefault(); ids.add(e.pointerId); try { b.setPointerCapture(e.pointerId); } catch (_) {} Input.pad[k] = true; b.classList.add('on'); if (k === 'item') Input.itemEdge = true; };
  const up = (e) => { ids.delete(e.pointerId); if (!ids.size) { Input.pad[k] = false; b.classList.remove('on'); } };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
});

(function wireGasDrift() {
  const btn = { gas: $('#pad .p-gas'), drift: $('#pad .p-drift') }, own = new Map();
  const sync = () => { for (const k of ['gas', 'drift']) { const on = [...own.values()].includes(k); Input.pad[k] = on; if (btn[k]) btn[k].classList.toggle('on', on); } };
  const keyAt = (e, cur) => { const el = document.elementFromPoint(e.clientX, e.clientY); const b = el && el.closest ? el.closest('.p-gas,.p-drift') : null; return b && getComputedStyle(b).display !== 'none' ? b.dataset.k : cur; };
  for (const k of ['gas', 'drift']) { const b = btn[k]; if (!b) continue;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (_) { /* rien */ } own.set(e.pointerId, k); sync(); });
    b.addEventListener('pointermove', (e) => { if (!own.has(e.pointerId)) return; const nk = keyAt(e, own.get(e.pointerId)); if (nk !== own.get(e.pointerId)) { own.set(e.pointerId, nk); sync(); } });
    const up = (e) => { if (own.delete(e.pointerId)) sync(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up); b.addEventListener('contextmenu', (e) => e.preventDefault()); }
})();
function padClass() { return padMode() + (SAVE.throttle === 'manual' && padMode() !== 'kbd' ? ' manual' : ''); }
/* ================= v7 : joystick tactile + entrées ================= */
Input.stick = { active: false, id: null, bx: 0, by: 0, x: 0, y: 0 };
Input.stickSteer = 0;
const STICK_R = 62;
function stickEls() { return { zone: $('#stick-zone'), base: $('#stick'), knob: $('#stick i') }; }
function stickPlace(bx, by, kx, ky, active) {
  const { base, knob } = stickEls(); if (!base) return;
  base.style.transform = 'translate(' + (bx - STICK_R) + 'px,' + (by - STICK_R) + 'px)';
  knob.style.transform = 'translate(' + kx + 'px,' + ky + 'px)';
  base.classList.toggle('on', !!active);
}
function stickRest() {
  const { zone } = stickEls(); if (!zone) return; const r = zone.getBoundingClientRect();
  Input.stick.rx = Math.min(r.width * .45, 150); Input.stick.ry = r.height - Math.max(110, r.height * .28);
  stickPlace(Input.stick.rx, Input.stick.ry, 0, 0, false);
}
(function wireStick() {
  const { zone } = stickEls(); if (!zone) return; const st = Input.stick;
  const local = (e) => { const r = zone.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (st.active) return; const [x, y, r] = local(e);
    st.active = true; st.id = e.pointerId; st.bx = clamp(x, STICK_R * .7, r.width - STICK_R * .7); st.by = clamp(y, STICK_R * .7, r.height - STICK_R * .7); st.x = 0; st.y = 0;
    try { zone.setPointerCapture(e.pointerId); } catch (_) { /* rien */ }
    stickPlace(st.bx, st.by, 0, 0, true);
  });
  zone.addEventListener('pointermove', (e) => {
    if (!st.active || e.pointerId !== st.id) return; e.preventDefault(); const [x, y] = local(e);
    let dx = x - st.bx, dy = y - st.by; const d = Math.hypot(dx, dy);
    if (d > STICK_R) { const ex = (d - STICK_R) / d; st.bx += dx * ex; st.by += dy * ex; dx = x - st.bx; dy = y - st.by; }
    st.x = clamp(dx / STICK_R, -1, 1); st.y = clamp(dy / STICK_R, -1, 1); stickPlace(st.bx, st.by, dx, dy, true);
  });
  const up = (e) => { if (e.pointerId !== st.id) return; st.active = false; st.id = null; st.x = 0; st.y = 0; stickRest(); };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
  zone.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => { if (!st.active) stickRest(); });
})();
function updateSteerInput(dt) {
  const k = Input.keys, p = Input.pad;
  const l = k.ArrowLeft || k.KeyA || k.KeyQ || p.left, r = k.ArrowRight || k.KeyD || p.right;
  const target = (r ? 1 : 0) - (l ? 1 : 0);
  const rate = target === 0 ? 10 : (Math.sign(target) !== Math.sign(Input.digSteer) ? 13 : 6.5);
  Input.digSteer += clamp(target - Input.digSteer, -rate * dt, rate * dt);
  if (Input.useTilt) {
    const rel = tiltRel(), maxA = 26 / SAVE.sens, dz = 1.5; let s = 0;
    if (Math.abs(rel) > dz) s = Math.sign(rel) * Math.pow(clamp((Math.abs(rel) - dz) / (maxA - dz), 0, 1), 1.2);
    Input.tiltSteer += (s - Input.tiltSteer) * (1 - Math.exp(-dt * 20));
  } else Input.tiltSteer = 0;
  const st = Input.stick; let ss = 0;
  if (st.active) { const ax = Math.abs(st.x), dz = .09; if (ax > dz) ss = Math.sign(st.x) * Math.pow((ax - dz) / (1 - dz), 1.15) * clamp(SAVE.sens, .5, 2) ** .35; }
  Input.stickSteer += (clamp(ss, -1, 1) - Input.stickSteer) * (1 - Math.exp(-dt * 28));
  const steer = clamp(Input.tiltSteer + Input.digSteer + Input.stickSteer, -1, 1);
  const drift = !!(k.Space || k.ShiftLeft || k.ShiftRight || p.drift);
  const gas = !!(k.ArrowUp || k.KeyW || k.KeyZ || p.gas);
  const brake = !!(k.ArrowDown || k.KeyS || p.brake || (st.active && st.y > .68 && Math.abs(st.x) < .6));
  return { steer, drift, brake, gas };
}
function padMode() { return Input.useTilt ? 'tilt' : (!isTouch ? 'kbd' : SAVE.control === 'touch' ? 'touch' : 'stick'); }

/* ================= Course ================= */
const G = { W: null, race: null, karts: [], hazards: [], rockets: [], autopilot: false, paused: false, allowPortrait: false };
const UI = { screen: 'title', mode: 'quick', track: (SAVE.track || 0) < TRACKS.length ? SAVE.track || 0 : 0, gp: null, afterCalib: null };

function makeKart(cfg, isPlayer, ccIdx) {
  const st = statsFor(cfg.body, cfg.wheels, cfg.glider), cc = CC[ccIdx];
  const k = { cfg, isPlayer, name: cfg.name, st, maxSpeed: cc.v * (.9 + .2 * st.speed), accel: 15 + 22 * st.accel, turn: 1.8 + .9 * st.handling,
    weight: .6 + .8 * st.weight, offFactor: .46 + .42 * st.off, x: 0, z: 0, y: 0, h: 0, vh: 0, speed: 0, idx: 0, lap: 0, halfway: false, prog: 0, lat: 0, groundY: 0,
    drift: 0, driftT: 0, driftLock: false, boost: 0, spin: 0, spinAng: 0, shield: 0, item: null, roll: 0, hop: 0, bumpCd: 0, wallCd: 0, off: false,
    finished: false, finishTime: 0, lapStart: 0, lapTimes: [], bestLap: Infinity, place: 1, wrongT: 0, sparkT: 0,
    ai: { lane: rand(-.3, .3), laneGoal: rand(-.35, .35), laneT: rand(1, 4), skill: rand(.965, 1.02), itemT: 0, drifty: Math.random() < .55 },
    mesh: kartMesh(cfg) };
  return k;
}
function placeOnGrid(k, slot) {
  const S = G.W.S; const row = Math.floor(slot / 2); const i = (S.N - 7 - row * 6 + S.N) % S.N; const lat = (slot % 2 ? 1 : -1) * G.W.hw * .4;
  k.P = S; k.idx = i; k.x = S.px[i] + S.rx[i] * lat; k.z = S.pz[i] + S.rz[i] * lat; k.h = k.vh = S.hd[i]; k.y = k.groundY = S.py[i]; k.lat = lat; k.prog = i - S.N;
}

function setWorld(ti) {
  LAPS = TRACKS[ti].sections ? 1 : RACE_OPTS.laps || TRACKS[ti].laps || 3;
  if (G.W) disposeWorld(G.W);
  G.W = buildWorld(ti); G.hazards = []; G.rockets = []; G.karts = [];
}

const BOT_LV = [
  { name: 'Facile', skill: .87, spd: .955, drift: .15, avoid: .4, item: .45, err: .5, rubA: 1.6, rubB: .4 },
  { name: 'Normal', skill: .97, spd: 1, drift: .5, avoid: .82, item: .8, err: .15, rubA: 1, rubB: 1 },
  { name: 'Difficile', skill: 1.01, spd: 1.012, drift: .85, avoid: 1, item: 1.05, err: .03, rubA: .65, rubB: 1.35 },
  { name: 'Expert', skill: 1.04, spd: 1.035, drift: 1, avoid: 1, item: 1.35, err: 0, rubA: .4, rubB: 1.7 }];
function applyBotLevel(lv) {
  lv = clamp(lv | 0, 0, 3); const L = BOT_LV[lv]; if (G.race) G.race.botLvl = lv;
  for (const k of G.karts) { if (k.isPlayer || !k.isAI) continue; const ai = k.ai;
    ai.skill *= L.skill; k.maxSpeed *= L.spd; ai.drifty = Math.random() < L.drift; ai.avoid = L.avoid; ai.itemRate = L.item; ai.err = L.err; ai.rubA = L.rubA; ai.rubB = L.rubB; ai.seed = Math.floor(Math.random() * 100); }
}
function startRace(ti, ccIdx, who, roster) {
  G.police = null; Secret.last = -99;
  if (!roster) { RACE_OPTS.laps = SAVE.laps || 0; RACE_OPTS.obst = SAVE.obst !== false; RACE_OPTS.seed = (Math.random() * 4294967295) >>> 0; RACE_OPTS.music = SAVE.musicPick || 'auto'; }
  setWorld(ti); G.netKarts = new Map();
  if (roster) {
    for (const e of roster) { const isP = e.id === Net.id; const k = makeKart(cleanCfg(e.cfg), isP, ccIdx); k.netId = e.id; k.isAI = !!e.ai; k.isRemote = !isP && !(Net.host && e.ai);
      placeOnGrid(k, e.slot); G.W.scene.add(k.mesh.g); G.karts.push(k); G.netKarts.set(e.id, k); }
  } else {
    const cfgP = Object.assign(myCfg(), who ? { name: who.name, color: who.color } : {});
    const rivals = RIVALS.slice(); const playerSlot = 4; let r = 0;
    for (let slot = 0; slot < 8; slot++) { const isP = slot === playerSlot; const k = makeKart(isP ? cfgP : rivals[r++], isP, ccIdx); k.isAI = !isP; placeOnGrid(k, slot); G.W.scene.add(k.mesh.g); G.karts.push(k); }
  }
  trapBack();
  G.race = { state: 'intro', t: 0, timer: 0, cc: ccIdx, player: G.karts.find((k) => k.isPlayer), order: [], countN: 4, lastPlace: 0, bannerT: 0, finalShown: false, ti, online: !!roster, pt: (UI.mode === 'party' && UI.party) || (roster && Net.settings.party) ? { hits: 0, gives: 0, wrong: 0, wf: false } : null };
  $('#p-restart').hidden = !!roster;
  G.race.player.ai.skill = 1;
  applyBotLevel(roster ? (Net.botLvl != null ? Net.botLvl : 1) : (SAVE.botLvl != null ? SAVE.botLvl : 1));
  G.paused = false; camSnap = true;
  showHud(true); show(null); showHints();
  AudioSys.init(); AudioSys.startMusic(musicSpec(TRACKS[ti]));
  requestWake();
}
function startAttract(ti) {
  RACE_OPTS.laps = 0; RACE_OPTS.obst = true;
  setWorld(ti);
  for (let slot = 0; slot < 8; slot++) {
    const cfg = slot === 4 ? myCfg() : RIVALS[slot > 4 ? slot - 1 : slot];
    const k = makeKart(cfg, false, 1); placeOnGrid(k, slot); k.speed = 0; G.W.scene.add(k.mesh.g); G.karts.push(k);
  }
  G.race = { state: 'attract', t: 0, timer: 0, cc: 1, player: null, order: [], camK: 4, camMode: 0, camT: 0, ti };
  camSnap = true; showHud(false);
  setTimeout(() => musPrewarm(ti, 'auto'), 1500);
}
// calcule à l'avance la musique du prochain circuit (menus, salon en ligne)
function musPrewarm(ti, mp) { if (!TRACKS[ti] || (G.race && G.race.state !== 'attract')) return; const o = RACE_OPTS.music; RACE_OPTS.music = mp || 'auto'; let sp = null; try { sp = musicSpec(TRACKS[ti]); } finally { RACE_OPTS.music = o; } AudioSys.prewarmMusic(sp); }
function musPrewarmOnline() { const S = Net.settings || {}; if (!Net.inRace && S.track >= 0) musPrewarm(S.track, S.music); }

/* ================= v6 : chemins multiples + relief ================= */
function finishPath(P, closed) {
  const N = P.N; P.closed = closed;
  for (const k of ['fx', 'fz', 'rx', 'rz', 'hd', 'slope', 'curv']) P[k] = new Float32Array(N);
  const at = (i) => (closed ? ((i % N) + N) % N : clamp(i, 0, N - 1));
  for (let i = 0; i < N; i++) {
    const n = at(i + 1), p = at(i - 1); let dx = P.px[n] - P.px[p], dz = P.pz[n] - P.pz[p]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    P.fx[i] = dx; P.fz[i] = dz; P.rx[i] = -dz; P.rz[i] = dx; P.hd[i] = Math.atan2(dx, dz); P.slope[i] = (P.py[n] - P.py[p]) / ((n - p || 1) * P.seg);
  }
  for (let i = 0; i < N; i++) P.curv[i] = angDiff(P.hd[at(i - 3)], P.hd[at(i + 3)]) / 6;
  if (!P.glide) { P.glide = new Uint8Array(N); P.glideT = new Float32Array(N); }
}
const inWin = (i, w) => w && i >= w[0] && i <= w[1];
function buildBranches(W) {
  const S = W.S, N = S.N, def = W.def; W.branches = [];
  (def.branches || []).forEach((b, id) => {
    const i0 = Math.round(b.from * N) % N, i1 = Math.round(b.to * N) % N;
    const P = (i) => { const j = ((i % N) + N) % N; return new T.Vector3(S.px[j], S.py[j], S.pz[j]); };
    const m0 = b.mid[0]; const side = b.side || Math.sign((m0[0] - S.px[i0]) * S.rx[i0] + (m0[1] - S.pz[i0]) * S.rz[i0]) || 1;
    const off = (i, o) => { const j = ((i % N) + N) % N; return new T.Vector3(S.px[j] + S.rx[j] * side * o, S.py[j], S.pz[j] + S.rz[j] * side * o); };
    const cps = [P(i0 - 24), P(i0), off(i0 + 16, 9), ...b.mid.map((m) => new T.Vector3(m[0], m[2] != null ? m[2] : S.py[i0], m[1])), off(i1 - 16, 9), P(i1), P(i1 + 24)];
    const curve = new T.CatmullRomCurve3(cps, false, 'centripetal'); const L = curve.getLength(); const pts = curve.getSpacedPoints(Math.round(L / 2));
    let s0 = 0, s1 = pts.length - 1, d0 = 1e9, d1 = 1e9; const A = P(i0), Bv = P(i1);
    pts.forEach((q, i) => { const a = q.distanceToSquared(A), c = q.distanceToSquared(Bv); if (a < d0) { d0 = a; s0 = i; } if (c < d1) { d1 = c; s1 = i; } });
    const seg = pts.slice(s0, s1 + 1), M = seg.length;
    const B = { id, N: M, seg: L / (pts.length - 1), px: new Float32Array(M), py: new Float32Array(M), pz: new Float32Array(M), i0, i1, side, hw: (b.width || 16) / 2, def: b, name: b.name || '', offroad: !!b.offroad, narrow: !!b.narrow };
    seg.forEach((q, j) => { B.px[j] = q.x; B.py[j] = q.y; B.pz[j] = q.z; });
    finishPath(B, false);
    B.wallD = B.hw + W.curbW + 3; B.lim = B.wallD - 1.3;
    // zones où les deux routes se touchent encore : murs ouverts
    const need = W.wallD + B.wallD + 1; let mi = i0;
    const sep = (j) => { let best = 1e9; for (let o = -40; o <= 40; o++) { const i = ((mi + o) % N + N) % N; const d = (S.px[i] - B.px[j]) ** 2 + (S.pz[i] - B.pz[j]) ** 2; if (d < best) { best = d; mi = i; } } return Math.sqrt(best); };
    let jA = 0; mi = i0; while (jA < M - 1 && sep(jA) < need) jA++; const mA = mi;
    let jB = M - 1; mi = i1; while (jB > jA && sep(jB) < need) jB--; const mB = mi;
    B.jA = jA; B.jB = jB; B.winA = [i0 - 3, mA + 6]; B.winB = [mB - 6, i1 + 3];
    W.branches.push(B);
  });
}
// côté ouvert d'un mur à cet endroit (0 si aucun)
function openSide(P, i) {
  const W = G.W;
  if (P === W.S) { for (const B of W.branches) if (inWin(i, B.winA) || inWin(i, B.winB)) return B.side; return 0; }
  return (i <= P.jA + 3 || i >= P.jB - 3) ? -P.side : 0;
}
function nearestOn(P, x, z, from, span, pen = 0) {
  let best = from, bd = Infinity, bs = Infinity;
  for (let o = -span; o <= span; o++) { let i = from + o; if (P.closed) i = ((i % P.N) + P.N) % P.N; else if (i < 0 || i >= P.N) continue; const d = (x - P.px[i]) ** 2 + (z - P.pz[i]) ** 2; const sc = d + (o < 0 ? pen * o * o : 0); if (sc < bs) { bs = sc; bd = d; best = i; } }
  return [best, bd];
}
function trackLocate(k) {
  const W = G.W, S = W.S, N = S.N; const P = k.P || S; k.P = P;
  const [best, bd] = nearestOn(P, k.x, k.z, clamp(k.idx, 0, P.N - 1), 14, .06);
  if (P === S) {
    for (const B of W.branches) if (best >= B.i0 - 4 && best <= B.winA[1] + 8) {
      const [bj, bbd] = nearestOn(B, k.x, k.z, clamp(best - B.i0, 0, B.N - 1), 30);
      if (bbd + 2 < bd && bj < B.jB) { k.P = B; k.idx = bj; finishLocate(k, B, bj); return; }
    }
  } else if (best >= P.jB - 2 || best <= P.jA + 2) {
    const mi = best >= P.jB - 2 ? P.i1 - (P.N - 1 - best) : P.i0 + best;
    const [mb, mbd] = nearestOn(S, k.x, k.z, ((mi % N) + N) % N, 30);
    if (mbd + 2 < bd || best >= P.N - 2) { k.P = S; k.idx = mb; finishLocate(k, S, mb); return; }
  }
  const prev = k.idx; k.idx = best;
  if (P === S) {
    if (prev > N * .75 && best < N * .25) { if (k.lap === 0 || k.halfway) { k.lap++; k.halfway = false; onLap(k); } }
    else if (prev < N * .25 && best > N * .75) { k.lap--; k.halfway = true; }
    if (best > N * .4 && best < N * .6) k.halfway = true;
  }
  finishLocate(k, P, best);
}
function finishLocate(k, P, best) {
  const S = G.W.S;
  const ex = k.x - P.px[best], ez = k.z - P.pz[best];
  k.lat = ex * P.rx[best] + ez * P.rz[best];
  const along = ex * P.fx[best] + ez * P.fz[best]; k.along = along;
  let j = along >= 0 ? best + 1 : best - 1; j = P.closed ? (j + P.N) % P.N : clamp(j, 0, P.N - 1);
  k.groundY = lerp(P.py[best], P.py[j], Math.min(1, Math.abs(along) / P.seg));
  if (P === S) { k.mainIdx = best; k.prog = (k.lap - 1) * S.N + best + along / S.seg; }
  else { const mi = P.map ? branchMainProg(P, best, along) : P.i0 + clamp((best + along / P.seg) / (P.N - 1), 0, 1) * (P.i1 - P.i0); k.mainIdx = Math.round(mi) % S.N; k.prog = (k.lap - 1) * S.N + mi; if (k.mainIdx > S.N * .4 && k.mainIdx < S.N * .6) k.halfway = true; }
}
// point situé n échantillons devant le kart, en suivant éventuellement un embranchement
function aheadOn(k, n, wantB) {
  const S = G.W.S; const P = k.P || S; const i = k.idx + n;
  if (P !== S) { if (i < P.N) return [P, i]; return [S, (P.i1 + (i - P.N + 1)) % S.N]; }
  if (wantB && k.idx <= wantB.i0 + 3 && i >= wantB.i0) { const j = i - wantB.i0; if (j < wantB.N) return [wantB, j]; return [S, (wantB.i1 + j - wantB.N + 1) % S.N]; }
  return [S, ((i % S.N) + S.N) % S.N];
}
function aiBranch(k) {
  const W = G.W, S = W.S; if ((k.P || S) !== S || !W.branches.length) return null; const ai = k.ai; ai.br = ai.br || {};
  for (const B of W.branches) { const d = B.i0 - k.idx; if (d >= -3 && d < 70) {
    if (B.offroad) { if (d < 30) { const has = ['turbo', 'triple', 'etoile'].includes(k.item) || k.boost > .5 || k.star > 0; ai.br[B.id] = { lap: k.lap, take: has }; if (has) return B; } continue; }
    if (B.gate && B.gate.st) { if (!B.gate.st.mainOpen) return B; if (!B.gate.st.brOpen || B.gate.st.warnBr) continue; }
    const c = ai.br[B.id]; if (!c || c.lap !== k.lap) ai.br[B.id] = { lap: k.lap, take: Math.random() < (B.def.ai != null ? B.def.ai : .45) }; if (ai.br[B.id].take) return B; } }
  return null;
}

/* ---- relief ---- */
function nearAllFn(W, cell = 24) {
  const grid = new Map(); const K = (a, b) => (a + 4096) * 8192 + (b + 4096);
  const add = (x, z, h, gap) => { const key = K(Math.floor(x / cell), Math.floor(z / cell)); let l = grid.get(key); if (!l) grid.set(key, (l = [])); l.push(x, z, h, gap); };
  const S = W.S; for (let i = 0; i < S.N; i += 2) add(S.px[i], S.pz[i], S.py[i], S.glide[i]);
  for (const B of W.branches) for (let j = 0; j < B.N; j += 2) add(B.px[j], B.pz[j], B.py[j], 0);
  const out = { d: 0, h: 0, gap: 0 };
  return (x, z, r) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell), rc = Math.ceil(r / cell); let best = Infinity, bh = 0, bg = 0;
    for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) { const l = grid.get(K(cx + a, cz + b)); if (!l) continue; for (let q = 0; q < l.length; q += 4) { const d = (l[q] - x) ** 2 + (l[q + 1] - z) ** 2; if (d < best) { best = d; bh = l[q + 2]; bg = l[q + 3]; } } }
    out.d = Math.sqrt(best); out.h = bh; out.gap = bg; return out;
  };
}
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TERRAIN_TINT = { lavender: '#e8e2a0', autumn: '#ffc890', tropic: '#fff0c0', antique: '#f0e0b0', grass: '#e2ea86', jungle: '#a8dc7a', moss: '#9ccf98', snow: '#c4d4ff', sand: '#f4d098', redsand: '#f0a070', sakura: '#eaf2a0', savanna: '#f6dc96', rock: '#d0d8b8', moon: '#c8c8dc', ash: '#b08a7a', candy: '#ffd6f2', graveyard: '#a8b4a0', seabed: '#b0f0dc', cloud: '#dfe8ff', concrete: '#c8c8d2' };
const TERRAIN_ROCK = { lavender: '#a89c88', autumn: '#8a7060', tropic: '#c8b088', antique: '#c8c0b0', grass: '#8a8a7c', jungle: '#6e705c', moss: '#5c6a5c', snow: '#a2acc4', sand: '#c49a64', redsand: '#a04a2c', sakura: '#8a8478', savanna: '#a88a5a', rock: '#8a8a84', moon: '#7a7a86', ash: '#3a3034', candy: '#e0a0c8', graveyard: '#4a4a52', seabed: '#5a8a8a', cloud: '#c8d0e8', concrete: '#6a6a74' };
function buildTerrain(W, ext, cx, cz) {
  const { th, scene } = W; const tr = th.terrain; if (!tr) return;
  const size = 2 * (ext + 520), segs = { high: 180, medium: 150, low: 110 }[SAVE.quality] || 150, step = size / segs, R1 = segs + 1;
  const nL = fbm(3, 5, tr.seed || 17), nR = tileNoise(16, (tr.seed || 17) + 5);
  const x0 = cx - size / 2, z0 = cz - size / 2, flat = W.wallD + step * 1.7, blend = tr.blend || 64, reach = flat + blend + 4, drop = tr.drop || 22;
  // distance à la route la plus proche (projection des échantillons sur la grille)
  const D = new Float32Array(R1 * R1).fill(1e9), HB = new Float32Array(R1 * R1), GP = new Uint8Array(R1 * R1), HM = new Float32Array(R1 * R1).fill(1e9), F2 = (flat + 8) ** 2;
  const splat = (x, z, h, gap) => { const ix0 = Math.max(0, Math.floor((x - reach - x0) / step)), ix1 = Math.min(segs, Math.ceil((x + reach - x0) / step)), iz0 = Math.max(0, Math.floor((z - reach - z0) / step)), iz1 = Math.min(segs, Math.ceil((z + reach - z0) / step));
    for (let iz = iz0; iz <= iz1; iz++) { const dz = z0 + iz * step - z; for (let ix = ix0; ix <= ix1; ix++) { const dx = x0 + ix * step - x, d = dx * dx + dz * dz, q = iz * R1 + ix; if (d < D[q]) { D[q] = d; HB[q] = h; GP[q] = gap; } if (!gap && d < F2 && h < HM[q]) HM[q] = h; } } };
  const S = W.S; for (let i = 0; i < S.N; i += 2) splat(S.px[i], S.pz[i], S.py[i], S.glide[i]);
  for (const B of W.branches) for (let j = 0; j < B.N; j += 2) splat(B.px[j], B.pz[j], B.py[j], 0);
  const H = new Float32Array(R1 * R1); let minH = Infinity;
  for (let iz = 0; iz <= segs; iz++) for (let ix = 0; ix <= segs; ix++) {
    const q = iz * R1 + ix, x = x0 + ix * step, z = z0 + iz * step, u = ix / segs, v = iz / segs;
    const far = Math.hypot(x - cx, z - cz) / (ext + 120);
    const hn = (nL(u, v) - .38) * tr.h + Math.max(0, far - .9) * tr.h * .9 + (tr.ridges ? Math.abs(nR(u, v) - .5) * tr.h * .5 : 0);
    let h = hn; const d = Math.sqrt(D[q]);
    if (d < reach) { const base = GP[q] ? HB[q] - drop : Math.min(HB[q], HM[q]) - 1.2; const t = smoothstep(flat, flat + blend, d); h = lerp(base, GP[q] ? Math.min(hn, base + 6) : hn, t); }
    h = Math.max(h, tr.min != null ? tr.min : -60); H[q] = h; if (h < minH) minH = h;
  }
  const pos = new Float32Array(R1 * R1 * 3), uv = new Float32Array(R1 * R1 * 2), idx = new Uint32Array(segs * segs * 6); let ii = 0;
  let col = null; if (tr.colors) col = new Float32Array(R1 * R1 * 3); const c = new T.Color(), c2 = new T.Color();
  for (let iz = 0; iz <= segs; iz++) for (let ix = 0; ix <= segs; ix++) {
    const q = iz * R1 + ix, x = x0 + ix * step, z = z0 + iz * step, h = H[q];
    pos[q * 3] = x; pos[q * 3 + 1] = h; pos[q * 3 + 2] = z; uv[q * 2] = x / 40; uv[q * 2 + 1] = -z / 40;
    if (col) { const L = tr.colors; let k = 0; while (k < L.length - 1 && h > L[k + 1][0]) k++; const a = L[k], b = L[Math.min(k + 1, L.length - 1)]; const t = b[0] === a[0] ? 0 : clamp((h - a[0]) / (b[0] - a[0]), 0, 1); c.set(a[1]); c2.set(b[1]); c.lerp(c2, t); col[q * 3] = c.r; col[q * 3 + 1] = c.g; col[q * 3 + 2] = c.b; }
    if (ix < segs && iz < segs) { const a = q, b = q + 1, d = q + R1, e = d + 1; idx[ii++] = a; idx[ii++] = d; idx[ii++] = b; idx[ii++] = b; idx[ii++] = d; idx[ii++] = e; }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); if (col) g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.setIndex(new T.BufferAttribute(idx, 1)); g.computeVertexNormals();
  { const nrm = g.attributes.normal, n = R1 * R1, C = col || new Float32Array(n * 3).fill(1), pn = fbm(2, 4, (tr.seed || 17) + 33), pn2 = fbm(6, 3, (tr.seed || 17) + 71);
    const tint = new T.Color(TERRAIN_TINT[th.ground] || '#e8e4c8'), rk = new T.Color(TERRAIN_ROCK[th.ground] || '#a8a296'); let h0 = Infinity, h1 = -Infinity; for (let q = 0; q < n; q++) { h0 = Math.min(h0, H[q]); h1 = Math.max(h1, H[q]); }
    for (let q = 0; q < n; q++) { const ix = q % R1, iz = (q / R1) | 0, u = ix / segs, v = iz / segs; const pv = pn(u, v), pv2 = pn2(u, v), ny = nrm.getY(q), steep = smoothstep(.95, .74, ny) * .8, hh = clamp((H[q] - h0) / (h1 - h0 + 1e-6), 0, 1);
      const pt = smoothstep(.44, .7, pv) * .6, L = (.84 + .24 * Math.sqrt(hh)) * (.93 + .14 * pv2);
      for (let c3 = 0; c3 < 3; c3++) { let x = C[q * 3 + c3]; const tc = c3 === 0 ? tint.r : c3 === 1 ? tint.g : tint.b, rc = c3 === 0 ? rk.r : c3 === 1 ? rk.g : rk.b; x = lerp(x, x * tc, pt); x = lerp(x, rc, steep); C[q * 3 + c3] = x * L; } }
    if (!col) { col = C; g.setAttribute('color', new T.BufferAttribute(C, 3)); } }
  const tex = groundTex(th.ground); const mat = new T.MeshLambertMaterial({ map: tex, vertexColors: !!col });
  if (tr.caustics) { const ct = canvasTex(256, 256, (x, w) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(160,240,255,.55)'; x.lineWidth = 3; for (let i = 0; i < 26; i++) { x.beginPath(); const px = Math.random() * w, py = Math.random() * w, rx = rand(14, 40), ry = rand(10, 30), ro = rand(0, 3); for (const ox of [-w, 0, w]) for (const oy of [-w, 0, w]) { x.moveTo(px + ox + rx, py + oy); x.ellipse(px + ox, py + oy, rx, ry, ro, 0, TAU); } x.stroke(); } }); ct.repeat.set(.5, .5); mat.emissiveMap = ct; mat.emissive = new T.Color('#5fd8ff'); mat.emissiveIntensity = .5; W.caustic = ct; }
  const mesh = new T.Mesh(g, mat); mesh.receiveShadow = true; scene.add(mesh); W.terrain = mesh;
  W.hAt = (x, z) => { const fx = (x - x0) / step, fz = (z - z0) / step; if (fx < 0 || fz < 0 || fx >= segs || fz >= segs) return minH; const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, q = iz * R1 + ix;
    const a = H[q], b = H[q + 1], d = H[q + R1], e = H[q + R1 + 1]; return lerp(lerp(a, b, tx), lerp(d, e, tx), tz); };
  W.terrainMin = minH;
}

/* ---- géométrie d'un embranchement ---- */
function buildBranchGeo(W, B, mats) {
  const { scene, curbW, th } = W, hw = B.hw, wD = B.wallD;
  const nearMain = (j) => j <= B.jA + 2 || j >= B.jB - 2;
  const openS = -B.side; const pre = (j) => j < B.noseA || j > B.noseB;
  scene.add(new T.Mesh(bandGeo(B, [{ o: -wD, y: .07 }, { o: -hw - curbW + .05, y: .07 }], { world: true, skip: (j) => openS < 0 && pre(j) }), mats.shoulder));
  scene.add(new T.Mesh(bandGeo(B, [{ o: hw + curbW - .05, y: .07 }, { o: wD, y: .07 }], { world: true, skip: (j) => openS > 0 && pre(j) }), mats.shoulder));
  const OFF = B.offroad;
  scene.add(new T.Mesh(bandGeo(B, [{ o: -hw - (OFF ? curbW : 0), y: .115 }, { o: hw + (OFF ? curbW : 0), y: .115 }], OFF ? { world: true } : { vScale: 24 }), OFF ? mats.dirt : mats.road));
  if (!OFF) { scene.add(new T.Mesh(bandGeo(B, [{ o: -hw - curbW, y: .09 }, { o: -hw - curbW * .5, y: .21 }, { o: -hw, y: .12 }], { vScale: 6, skip: (j) => openS < 0 && pre(j) }), mats.curb));
  scene.add(new T.Mesh(bandGeo(B, [{ o: hw, y: .12 }, { o: hw + curbW * .5, y: .21 }, { o: hw + curbW, y: .09 }], { vScale: 6, skip: (j) => openS > 0 && pre(j) }), mats.curb)); }
  for (const sgn of [-1, 1]) {
    const d = sgn * wD, sk = (j) => sgn === openS && nearMain(j);
    scene.add(new T.Mesh(bandGeo(B, [{ o: d, y: .07 }, { o: d, y: OFF ? .62 : 1.12 }], { vScale: 8, skip: sk }), OFF ? mats.fence : mats.wall));
    scene.add(new T.Mesh(tubeAlong(B, d, OFF ? .68 : 1.2, OFF ? .1 : .14, 8, 2, sk), OFF ? mats.fenceRail : mats.rail));
    if (th.terrain) scene.add(new T.Mesh(sgn > 0 ? bandGeo(B, [{ o: d, y: .07 }, { o: d + 7, y: -5 }], { world: true, skip: sk }) : bandGeo(B, [{ o: d - 7, y: -5 }, { o: d, y: .07 }], { world: true, skip: sk }), mats.shoulder));
    else scene.add(new T.Mesh(bandGeo(B, [th.skirtDepth ? { o: d, y: -th.skirtDepth } : { o: d, y: th.groundY != null ? th.groundY : -1, abs: true }, { o: d, y: .07 }], { vScale: 10, skip: sk }), mats.skirt));
  }
  // boîtes à mi-parcours + turbo
  const jm = Math.floor(B.N * .5);
  if (!OFF) for (const f of [-.45, 0, .45]) { const x = B.px[jm] + B.rx[jm] * f * hw, z = B.pz[jm] + B.rz[jm] * f * hw; W.addBox(x, z, B.py[jm]); }
  if (B.def.boost) { const jb = Math.floor(B.N * .3); scene.add(new T.Mesh(quadAt(B, jb, 0, 2.6, 4.5, .16), mats.pad)); W.pads.push({ i: jb, lat: 0, P: B }); }
  if (B.def.tunnel) tunnelOn(W, B, [[B.jA + 6, B.jB - 6]], B.def.tunnel);
  // panneau d'embranchement
  const si = Math.max(0, B.i0 - 30) % W.S.N, S = W.S, dd = B.side * (W.wallD + 1.4);
  const sign = new T.Mesh(new T.PlaneGeometry(5, 1.8), new T.MeshBasicMaterial({ map: branchSignTex(B.def.label || (B.def.tunnel ? 'RACCOURCI' : 'AUTRE ROUTE'), B.side), side: T.DoubleSide })); if (OFF) sign.material.color.set('#ffd9a0');
  sign.position.set(S.px[si] + S.rx[si] * dd, S.py[si] + 3.2, S.pz[si] + S.rz[si] * dd); sign.rotation.y = S.hd[si] + Math.PI; scene.add(sign);
  const post = new T.Mesh(new T.CylinderGeometry(.1, .1, 3.2, 8), stdMat('#e9ecf4', .3, .7)); post.position.set(sign.position.x, S.py[si] + 1.4, sign.position.z); scene.add(post);
}
function branchSignTex(label, side) {
  return canvasTex(320, 116, (x, w, h) => { x.fillStyle = '#17143a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffc531'; x.fillRect(6, 6, w - 12, h - 12); x.fillStyle = '#17143a';
    let fs = 38; do { x.font = '900 ' + fs + 'px "Arial Black",Impact,sans-serif'; fs -= 2; } while (x.measureText(label).width > w - 80 && fs > 14); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, w / 2 + (side > 0 ? -22 : 22), h / 2 + 2);
    const ax = side > 0 ? w - 34 : 34; x.beginPath(); x.moveTo(ax + (side > 0 ? 20 : -20), h / 2); x.lineTo(ax - (side > 0 ? 6 : -6), h / 2 - 24); x.lineTo(ax - (side > 0 ? 6 : -6), h / 2 + 24); x.closePath(); x.fill(); }, false);
}
// tunnel le long d'un chemin entre des indices
function tunnelOn(W, P, ranges, style) {
  const { scene } = W; const base = { wood: [[92, 58, 34], [140, 96, 58]], rock: [[70, 66, 80], [110, 104, 120]], ship: [[80, 52, 30], [124, 84, 50]], candy: [[255, 150, 190], [255, 220, 235]], stone: [[60, 58, 74], [96, 92, 112]], fun: [[110, 40, 150], [190, 90, 220]], aqua: [[30, 120, 190], [110, 210, 255]], metal: [[70, 80, 100], [130, 140, 165]] }[style] || [[70, 66, 80], [110, 104, 120]];
  const tex = pixelTex(128, 128, (u, v) => { const n = Math.sin(u * TAU * 6 + Math.sin(v * TAU * 2) * 2) * .5 + .5; return mulc(mix3(base[0], base[1], n), .9 + Math.random() * .1); }); tex.repeat.set(1, 6);
  const mat = new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide }); if (style === 'aqua') { mat.transparent = true; mat.opacity = .42; mat.depthWrite = false; } const r = (P.wallD || W.wallD) + .8, segs = 18; const lights = [];
  for (const [i0, i1] of ranges) {
    const pos = [], uv = [], idx = []; let rows = 0;
    for (let k = i0; k <= i1; k += 2) { const i = P.closed ? k % P.N : clamp(k, 0, P.N - 1);
      for (let s = 0; s <= segs; s++) { const t = s / segs * Math.PI, c = Math.cos(t) * r, h = Math.sin(t) * r * .62 + .06; pos.push(P.px[i] + P.rx[i] * c, P.py[i] + h, P.pz[i] + P.rz[i] * c); uv.push(s / segs, (k - i0) / 40); }
      if (k > i0) for (let s = 0; s < segs; s++) { const p0 = (rows - 1) * (segs + 1) + s, p1 = p0 + 1, q0 = rows * (segs + 1) + s, q1 = q0 + 1; idx.push(p0, q0, p1, p1, q0, q1); }
      rows++; if ((k - i0) % 12 === 0) lights.push(P.px[i], P.py[i] + r * .62 - .4, P.pz[i]); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    scene.add(new T.Mesh(g, mat));
    for (const k of [i0, i1]) { const i = P.closed ? k % P.N : clamp(k, 0, P.N - 1); const p = new T.Mesh(new T.TorusGeometry(r, .9, 10, 30, Math.PI), stdMat('#' + base[0].map((v) => Math.round(v * .7).toString(16).padStart(2, '0')).join(''), .7, .1)); p.scale.set(1, .62, 1); p.position.set(P.px[i], P.py[i] + .06, P.pz[i]); p.rotation.y = P.hd[i]; scene.add(p); }
  }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lights, 3));
  scene.add(new T.Points(lg, new T.PointsMaterial({ color: style === 'candy' ? '#ff9ad5' : style === 'rock' || style === 'stone' ? '#bde4ff' : '#ffd27a', size: 4, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
}


/* ---- v6 : mondes Récif, Col des Aigles, Bonbons, Château ---- */
function placeY(W, list, dy = 0) { for (const p of list) { if (W.hAt) p.y = W.hAt(p.x, p.z) + dy; else p.y = dy; delete p.g; } return list; }
// bancs d'animaux animés (poissons, chauves-souris, aigles)
function addFlock(W, geo, mat, groups, per, opts) {
  groups = Math.max(1, Math.round(groups)); const n = groups * per, im = new T.InstancedMesh(geo, mat, n); im.frustumCulled = false; const c = new T.Color();
  const g = []; for (let k = 0; k < groups; k++) { const p = pick(opts.anchors); g.push({ x: p.x + rand(-30, 30), z: p.z + rand(-30, 30), y: (W.hAt ? W.hAt(p.x, p.z) : 0) + rand(opts.yMin, opts.yMax), r: rand(opts.rMin, opts.rMax), sp: rand(.25, .6) * (Math.random() < .5 ? -1 : 1), ph: rand(0, TAU) }); }
  for (let i = 0; i < n; i++) { c.set(pick(opts.colors)); im.setColorAt(i, c); }
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  W.scene.add(im); (W.flocks = W.flocks || []).push({ im, g, per, off: Array.from({ length: n }, () => [rand(-4, 4), rand(-2, 2), rand(-4, 4), rand(0, TAU)]), flap: !!opts.flap, scale: opts.scale || 1 });
}
const _fm = new T.Matrix4(), _fq = new T.Quaternion(), _fe = new T.Euler(), _fs = new T.Vector3(), _fp = new T.Vector3();
function updateFlocks(W, now) {
  if (!W.flocks) return;
  for (const f of W.flocks) {
    for (let k = 0; k < f.g.length; k++) { const gr = f.g[k], a = now * gr.sp + gr.ph;
      for (let j = 0; j < f.per; j++) { const i = k * f.per + j, o = f.off[i]; const aa = a + j * .08;
        _fp.set(gr.x + Math.cos(aa) * (gr.r + o[0]), gr.y + o[1] + Math.sin(now * 1.5 + o[3]) * .6, gr.z + Math.sin(aa) * (gr.r + o[2]));
        _fe.set(0, -aa + (gr.sp > 0 ? 0 : Math.PI), 0); _fq.setFromEuler(_fe); if (f.flap) _fs.set(f.scale, f.scale * Math.sin(now * 9 + o[3]) * 2.2, f.scale); else _fs.setScalar(f.scale);
        _fm.compose(_fp, _fq, _fs); f.im.setMatrixAt(i, _fm); } }
    f.im.instanceMatrix.needsUpdate = true;
  }
}
function fishGeo() { if (DECOR.fish) return DECOR.fish; const b = new T.SphereGeometry(.5, 10, 8); b.scale(.45, .55, 1.1); const t = new T.ConeGeometry(.45, .7, 4); t.rotateX(-Math.PI / 2); t.translate(0, 0, -.8); t.scale(.2, 1, 1);
  const g = mergeGeos([b, t]); g.userData.keep = true; DECOR.fish = g; return g; }
function wingGeo(span) { const g = new T.BufferGeometry(); const s = span; g.setAttribute('position', new T.Float32BufferAttribute([0, 0, .4, -s, .3, -.3, 0, 0, -.5, 0, 0, .4, s, .3, -.3, 0, 0, -.5], 3)); g.computeVertexNormals(); return g; }
function anchorsOf(W, n) { const S = W.S, out = []; for (let k = 0; k < n; k++) { const i = Math.floor(rand(0, S.N)); const s = Math.random() < .5 ? -1 : 1, d = s * (W.wallD + rand(20, 70)); out.push({ x: S.px[i] + S.rx[i] * d, z: S.pz[i] + S.rz[i] * d }); } return out; }

function buildReef(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const corals = ['#ff6f91', '#ff9a3a', '#a87dff', '#ffd23a', '#3ee0c0', '#ff4f7a'];
  // coraux en branches
  const br = []; for (let k = 0; k < 7; k++) { const g = new T.CapsuleGeometry(.35, 2.2, 4, 8); g.translate(0, 1.4, 0); g.applyMatrix4(trs(rand(-.6, .6), 0, rand(-.6, .6), rand(-.7, .7), 0, rand(-.7, .7))); br.push(g); }
  const coral = mergeGeos(br);
  instanced(scene, [{ geo: coral, mat: lam('#ffffff'), colors: corals }], placeY(W, scatter(240 * q, 3, 220, .8, 2.2), -.2));
  const bulb = new T.SphereGeometry(1, 14, 10); bulb.scale(1, .7, 1);
  instanced(scene, [{ geo: bulb, mat: lam('#ffffff'), off: tr(0, .4, 0), colors: corals }], placeY(W, scatter(160 * q, 2, 200, .6, 2), -.2));
  // algues hautes
  const kelp = new T.CapsuleGeometry(.25, 9, 4, 6); kelp.translate(0, 4.6, 0); kelp.scale(1, 1, .3);
  instanced(scene, [{ geo: kelp, mat: lam('#ffffff', { side: T.DoubleSide }), colors: ['#2f9a5a', '#3bb06a', '#268a4a'] }, { geo: kelp, mat: lam('#ffffff'), off: trs(.6, -1, .3, 0, 1.2, .15, .8), colors: ['#2f9a5a', '#3bb06a'] }], placeY(W, scatter(260 * q, 4, 200, .7, 1.6), -.3));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#5a6a7a', '#4a5868', '#6a7888'] }], placeY(W, scatter(110 * q, 3, 240, .6, 2.6)));
  // coquillages géants
  const shell = new T.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2); shell.scale(1.4, .7, 1.1);
  instanced(scene, [{ geo: shell, mat: stdMat('#f1d7e8', .35, .3), off: tr(0, .1, 0) }, { geo: new T.SphereGeometry(.35, 12, 10), mat: new T.MeshBasicMaterial({ color: '#fff8e8' }), off: tr(0, .5, .2) }], placeY(W, scatter(18, 6, 160, 1.5, 3)));
  // épave
  const ship = new T.Group(); const hull = new T.Mesh(rbox(10, 6, 34, 2.2), stdMat('#5a3c24', .9, 0)); hull.position.y = 2; hull.rotation.z = .35; ship.add(hull);
  const mast = new T.Mesh(new T.CylinderGeometry(.4, .5, 22, 8), stdMat('#4a3020', .9, 0)); mast.position.set(1, 10, 2); mast.rotation.z = .5; ship.add(mast);
  const sp = scatter(1, 30, 200, 1, 1)[0]; if (sp) { ship.position.set(sp.x, W.hAt ? W.hAt(sp.x, sp.z) : 0, sp.z); ship.rotation.y = rand(0, TAU); scene.add(ship); }
  // poissons et méduses
  const fm = new T.MeshLambertMaterial({ color: '#ffffff', emissive: '#224466', emissiveIntensity: .3 });
  addFlock(W, fishGeo(), fm, 10 * q + 4, 9, { anchors: anchorsOf(W, 30), yMin: 4, yMax: 16, rMin: 8, rMax: 22, colors: ['#ffc531', '#ff6f91', '#38b6ff', '#fffdf7', '#ff8a3a'] });
  const jel = new T.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI / 2); jel.scale(1, .8, 1);
  addFlock(W, jel, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }), 5, 4, { anchors: anchorsOf(W, 12), yMin: 10, yMax: 26, rMin: 4, rMax: 9, colors: ['#ff9ad5', '#9ff3ff', '#c8a8ff'], scale: 1.6 });
  // rayons de lumière depuis la surface
  const rayT = canvasTex(32, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(190,240,255,.5)'); g.addColorStop(1, 'rgba(190,240,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false);
  const rays = []; for (let k = 0; k < 14; k++) { const m = new T.Mesh(new T.PlaneGeometry(rand(10, 22), 140), new T.MeshBasicMaterial({ map: rayT, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
    const a = anchorsOf(W, 1)[0]; m.position.set(a.x, 70, a.z); m.rotation.set(0, rand(0, TAU), rand(-.25, .25)); scene.add(m); rays.push(m); }
  W.rays = rays;
  // bulles
  const n = 320, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-60, 60); }
  const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const bp = new T.Points(bg, new T.PointsMaterial({ color: '#cff4ff', size: .4, map: DOT_TEX, transparent: true, depthWrite: false, opacity: .8 })); bp.frustumCulled = false; scene.add(bp);
  W.embers = { p: bp, pos, n };
  instanced(scene, [{ geo: decorGeo('mountain'), mat: lam('#1e4a6a') }], ring(18, 280, 460).map((p) => { const r = rand(90, 170); return Object.assign(p, { sx: r, sy: rand(60, 130), sz: r, y: -20 }); }));
}
function buildAlpine(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const pg = ['#2f6b52', '#2a5f4a', '#357a5c'];
  instanced(scene, [{ geo: decorGeo('ptrunk'), mat: lam('#5b4030'), off: tr(0, 1, 0) }, { geo: decorGeo('pine1'), mat: lam('#ffffff'), off: tr(0, 3.6, 0), colors: pg }, { geo: decorGeo('pine2'), mat: lam('#ffffff'), off: tr(0, 5.5, 0), colors: pg }, { geo: decorGeo('pine3'), mat: lam('#ffffff'), off: tr(0, 7.3, 0), colors: pg }],
    placeY(W, scatter(380 * q, 5, 260, .8, 1.7), -.2));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#8a8c94', '#7a7c84', '#9a9ca4'] }], placeY(W, scatter(160 * q, 3, 240, .7, 3)));
  instanced(scene, [{ geo: decorGeo('flower'), mat: lam('#ffffff'), off: tr(0, .3, 0), colors: ['#fffdf7', '#ffc531', '#a87dff', '#ff6fb5'] }], placeY(W, scatter(240 * q, 1.5, 80, .8, 1.2)));
  // chalets
  const roof = new T.CylinderGeometry(.01, 4.8, 3, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, .8);
  instanced(scene, [{ geo: new T.BoxGeometry(6, 4, 5), mat: lam('#ffffff'), off: tr(0, 2, 0), colors: ['#a0703f', '#8a5c34', '#b07a48'] }, { geo: roof, mat: lam('#ffffff'), off: tr(0, 5.5, 0), colors: ['#8a2a2a', '#5a3a2a'] },
    { geo: new T.BoxGeometry(1.2, 1.2, .2), mat: new T.MeshBasicMaterial({ color: '#ffd27a' }), off: tr(1.4, 2.2, 2.55) }], placeY(W, scatter(18, 14, 160, 1, 1.3), -.1));
  // aigles
  addFlock(W, wingGeo(2.6), lam('#ffffff', { side: T.DoubleSide }), 6, 3, { anchors: anchorsOf(W, 12), yMin: 40, yMax: 80, rMin: 30, rMax: 60, colors: ['#3a2a20', '#4a3626'], flap: true, scale: 1.2 });
  addClouds(W, ext, cx, cz, 14);
}
function buildCandy(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const pastel = ['#ff6fb5', '#ffc531', '#38b6ff', '#3ee08f', '#a87dff', '#ff8a3a'];
  // sucettes géantes
  const swirl = canvasTex(128, 128, (x, w) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#fffdf7' : '#ff4f7a'; x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 64, i * TAU / 12, (i + 1) * TAU / 12); x.fill(); } x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(46, 46, 18, 0, TAU); x.fill(); }, false);
  const disc = new T.CylinderGeometry(3, 3, .8, 32); disc.rotateX(Math.PI / 2);
  instanced(scene, [{ geo: new T.CylinderGeometry(.25, .25, 9, 8), mat: lam('#fffdf7'), off: tr(0, 4.5, 0) }, { geo: disc, mat: new T.MeshStandardMaterial({ map: swirl, roughness: .2, metalness: .1 }), off: tr(0, 10, 0) }], placeY(W, scatter(60 * q, 5, 220, .8, 1.6)));
  // sucres d'orge
  const stripe = canvasTex(32, 128, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fffdf7' : '#e2342a'; x.beginPath(); x.moveTo(0, i * 16); x.lineTo(w, i * 16 - 10); x.lineTo(w, i * 16 + 6); x.lineTo(0, i * 16 + 16); x.fill(); } });
  stripe.repeat.set(1, 3); const caneM = new T.MeshStandardMaterial({ map: stripe, roughness: .25 });
  const hook = new T.TorusGeometry(1.4, .4, 10, 20, Math.PI); hook.translate(1.4, 0, 0);
  instanced(scene, [{ geo: new T.CylinderGeometry(.4, .4, 10, 12), mat: caneM, off: tr(0, 5, 0) }, { geo: hook, mat: caneM, off: tr(0, 10, 0) }], placeY(W, scatter(50 * q, 5, 200, .7, 1.4)));
  // boules de gomme et donuts
  const gum = new T.SphereGeometry(1, 18, 10, 0, TAU, 0, Math.PI / 2);
  instanced(scene, [{ geo: gum, mat: stdMat('#ffffff', .15, .1), colors: pastel }], placeY(W, scatter(200 * q, 2, 200, 1, 3.2), -.1));
  const donut = new T.TorusGeometry(2.4, 1.1, 14, 24); donut.rotateX(Math.PI / 2);
  instanced(scene, [{ geo: donut, mat: lam('#d99a5a'), off: tr(0, 1.1, 0) }, { geo: new T.TorusGeometry(2.4, 1.15, 10, 24, Math.PI * 2), mat: lam('#ffffff'), off: trs(0, 1.45, 0, Math.PI / 2, 0, 0, 1), colors: ['#ff6fb5', '#fffdf7', '#7a4a2a', '#a87dff'] }], placeY(W, scatter(30 * q, 4, 200, .8, 1.5)));
  // collines de crème au loin
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#ffd6e8', '#d8f0ff', '#fff2c8'] }], ring(26, 260, 430).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(50, 110), sz: rand(90, 170) })));
  // rivière de chocolat sous le planeur
  const choc = pixelTex(128, 128, (u, v) => { const k = .8 + Math.sin((u * 3 + v) * TAU) * .1 + Math.random() * .06; return mulc([110, 60, 30], k); }); choc.repeat.set(6, 6); W.waterTex = choc;
  for (const [a, b] of W.def.glide || []) { const i = Math.floor((a + b) / 2 * W.S.N) % W.S.N; const rv = new T.Mesh(new T.PlaneGeometry(70, 240), new T.MeshStandardMaterial({ map: choc, roughness: .2, metalness: .2 })); rv.rotation.x = -Math.PI / 2; rv.rotation.z = -W.S.hd[i] + Math.PI / 2; rv.position.set(W.S.px[i], W.S.py[i] - ((W.th.terrain && W.th.terrain.drop) || 20) + 2, W.S.pz[i]); scene.add(rv); }
  addClouds(W, ext, cx, cz, 12);
}
function buildHaunted(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W;
  // arbres morts tordus
  const br = [new T.CylinderGeometry(.4, .8, 9, 7)]; br[0].translate(0, 4.5, 0);
  for (let k = 0; k < 5; k++) { const g = new T.CylinderGeometry(.12, .3, 4, 6); g.translate(0, 2, 0); g.applyMatrix4(trs(0, 5 + k * .8, 0, rand(-1.1, 1.1), rand(0, TAU), rand(-1.1, 1.1))); br.push(g); }
  instanced(scene, [{ geo: mergeGeos(br), mat: lam('#ffffff'), colors: ['#3a2e2a', '#2e2420', '#46383a'] }], placeY(W, scatter(150 * q, 5, 240, .8, 1.5), -.2));
  // tombes
  instanced(scene, [{ geo: rbox(1.2, 1.8, .35, .4), mat: lam('#ffffff'), off: tr(0, .8, 0), colors: ['#6a6a7a', '#5a5a68', '#7a7a88'] }], placeY(W, scatter(180 * q, 3, 140, .8, 1.3), -.2));
  // citrouilles lumineuses
  const pump = new T.SphereGeometry(1, 16, 12); pump.scale(1, .75, 1);
  instanced(scene, [{ geo: pump, mat: new T.MeshLambertMaterial({ color: '#ff7a1a', emissive: '#ff5a00', emissiveIntensity: .6 }), off: tr(0, .7, 0) }, { geo: new T.CylinderGeometry(.1, .14, .5, 6), mat: lam('#3a6a2a'), off: tr(0, 1.6, 0) }], placeY(W, scatter(70 * q, 2, 100, .7, 1.4)));
  // château au loin (tours + remparts)
  const ca = anchorsOf(W, 1)[0], dir = Math.atan2(ca.x - cx, ca.z - cz), r = ext * .2 + 120; const castle = new T.Group();
  const stone = stdMat('#4a4658', .9, 0), roofM = stdMat('#2a1f3a', .7, .1);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, tw = new T.Mesh(new T.CylinderGeometry(5, 5.5, 34, 14), stone); tw.position.set(Math.cos(a) * 26, 17, Math.sin(a) * 26); castle.add(tw);
    const cone = new T.Mesh(new T.ConeGeometry(6.5, 14, 14), roofM); cone.position.set(tw.position.x, 41, tw.position.z); castle.add(cone);
    const wl = new T.Mesh(new T.BoxGeometry(28, 18, 3), stone); const a2 = a + Math.PI / 6; wl.position.set(Math.cos(a2) * 23, 9, Math.sin(a2) * 23); wl.rotation.y = -a2 + Math.PI / 2; castle.add(wl); }
  const keep = new T.Mesh(new T.CylinderGeometry(9, 10, 52, 16), stone); keep.position.y = 26; castle.add(keep); const kc = new T.Mesh(new T.ConeGeometry(11, 20, 16), roofM); kc.position.y = 62; castle.add(kc);
  const win = new T.Mesh(new T.BoxGeometry(2, 3, .5), new T.MeshBasicMaterial({ color: '#ffe07a' })); win.position.set(0, 44, 9.6); castle.add(win);
  castle.position.set(cx + Math.sin(dir) * (ext + 200), W.hAt ? W.hAt(cx + Math.sin(dir) * (ext + 200), cz + Math.cos(dir) * (ext + 200)) : 0, cz + Math.cos(dir) * (ext + 200)); scene.add(castle);
  // chauves-souris + fantômes
  addFlock(W, wingGeo(1.2), lam('#ffffff', { side: T.DoubleSide }), 8, 6, { anchors: anchorsOf(W, 16), yMin: 10, yMax: 30, rMin: 6, rMax: 16, colors: ['#2a2038', '#3a2a48'], flap: true });
  const ghost = new T.CapsuleGeometry(.8, 1.2, 6, 12);
  addFlock(W, ghost, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .4, blending: T.AdditiveBlending, depthWrite: false }), 5, 2, { anchors: anchorsOf(W, 10), yMin: 3, yMax: 8, rMin: 10, rMax: 20, colors: ['#c8f0ff', '#e8d8ff'] });
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#1e1a2a', '#241e30'] }], ring(24, 260, 430).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(40, 100), sz: rand(90, 170) })));
  addStars(W, 400, .25, .6);
  const moatM = new T.MeshStandardMaterial({ color: '#2a5a3a', roughness: .15, metalness: .3, emissive: '#1a4a2a', emissiveIntensity: .4 });
  for (const [a, b] of W.def.glide || []) { const i = Math.floor((a + b) / 2 * W.S.N) % W.S.N; const mo = new T.Mesh(new T.PlaneGeometry(70, 240), moatM); mo.rotation.x = -Math.PI / 2; mo.rotation.z = -W.S.hd[i] + Math.PI / 2; mo.position.set(W.S.px[i], W.S.py[i] - ((W.th.terrain && W.th.terrain.drop) || 20) + 2, W.S.pz[i]); W.scene.add(mo); }
  const moon = new T.Mesh(new T.SphereGeometry(70, 24, 16), new T.MeshBasicMaterial({ color: '#fff4c8', fog: false })); moon.position.set(500, 520, -900); W.sky.add(moon);
}


function onLap(k) {
  const R = G.race; if (!R || R.state === 'attract') return;
  if (k.lap === 1) { k.lapStart = 0; return; }
  if (k.lap > LAPS + 1 || k.finished) return;
  const lt = R.t - k.lapStart; k.lapTimes.push(lt); k.bestLap = Math.min(k.bestLap, lt); k.lapStart = R.t;
  if (k.lap === LAPS + 1) {
    k.finished = true; k.finishTime = R.t; R.order.push(k);
    if (R.online && !k.isRemote) netEmit({ t: 'fin', id: k.netId, time: k.finishTime, best: isFinite(k.bestLap) ? k.bestLap : 0, hits: k.isPlayer && R.pt ? R.pt.hits : 0 });
    if (k.isPlayer) playerFinished();
  } else if (k.isPlayer) {
    if (k.lap === LAPS) { banner('Dernier tour !', 2.2); AudioSys.sfx('final'); } else { banner('Tour ' + k.lap + '/' + LAPS, 1.6); AudioSys.sfx('lap'); }
  }
}

/* ---- physique ---- */
/* ================= v7/v9 : physique (dérapage, planeur, dos d'âne, obstacles) ================= */
const DRIFT_TIERS = [0, .7, 1.45, 2.35];               // secondes de charge : bleu, orange, violet
const DRIFT_BOOST = [0, .6, 1.0, 1.45];
const DRIFT_COLORS = ['#fff7d6', '#38b6ff', '#ff8a1e', '#d36bff'];
function startDrift(k, dir) {
  k.drift = dir; k.driftT = 0; k.driftTier = 0; k.hop = .22; k.driftArm = 0;
  if (k.isPlayer) AudioSys.tone(220, .08, 'triangle', .06);
}
function endDrift(k, give) {
  const tier = k.driftTier || 0; k.drift = 0; k.driftT = 0; k.driftTier = 0;
  if (!give || k.spin > 0 || !tier) return;
  k.boost = Math.max(k.boost, DRIFT_BOOST[tier]); k.boostTier = tier; k.driftCd = 1;
  if (k.isPlayer) { AudioSys.sfx(tier >= 2 ? 'boost' : 'mini'); vibrate(tier >= 3 ? [20, 30, 40] : 25); }
}
// compatibilité avec l'ancien code
function releaseDrift(k, stillHeld) { endDrift(k, true); if (stillHeld) k.driftLock = true; }

function kartPhysics(k, inp, dt) { if (k.spect) return;
  const W = G.W, S = W.S;
  if (k.fallT > 0) { fallStep(k, dt); if (k.fallT <= 0) trackLocate(k); return; }
  if (cageStep(k, dt)) return;
  itemStatus11(k, inp, dt);
  let steer = inp.steer;
  const ox0 = k.x, oz0 = k.z;
  if (k.spin > 0) { k.spin -= dt; steer = 0; k.speed *= Math.pow(.2, dt); k.spinAng += dt * 13; if (k.drift) endDrift(k, false); }
  else k.spinAng = lerp(k.spinAng, Math.round(k.spinAng / TAU) * TAU, 1 - Math.exp(-dt * 10));
  const P0 = k.P || S, j0 = clamp(k.idx, 0, P0.N - 1), os0 = openSide(P0, j0);
  k.off = !k.air && (P0.offroad || (Math.abs(k.lat) > (P0.hw || W.hw) + W.curbW * .5 && !(os0 && Math.sign(k.lat) === os0)));
  const EV = zoneEnv(k); let vmax = k.maxSpeed * (k.off && k.boost <= 0 && k.star <= 0 ? k.offFactor * (EV && EV.offK || 1) : 1) * (EV ? EV.vmax : 1);
  if (k.boost > 0) { k.boost -= dt; vmax = k.maxSpeed * 1.36; if (k.speed < vmax) k.speed = Math.min(vmax, k.speed + 95 * dt); }
  if (k.star > 0) { k.star -= dt; vmax = Math.max(vmax, k.maxSpeed * 1.22); if (k.speed < vmax) k.speed += 40 * dt; }
  if (k.magnet > 0) { k.magnet -= dt; vmax = Math.max(vmax, k.maxSpeed * 1.28); if (k.speed < vmax) k.speed += 45 * dt; }
  if (k.shrink > 0) { k.shrink -= dt; vmax *= .72; }
  if (k.ghost > 0) k.ghost -= dt;
  if (!k.air) k.speed -= P0.slope[j0] * 14 * dt;
  if (k.spin <= 0) {
    if (inp.brake && !k.air) {
      // frein, puis marche arrière si on reste appuyé à l'arrêt (pratique pour se dégager)
      if (k.speed > .5) { k.speed -= 50 * dt; k.revT = 0; } else { k.revT = (k.revT || 0) + dt; k.speed = k.revT > .35 && G.race && G.race.state === 'race' ? Math.max(-14, k.speed - 26 * dt) : Math.max(0, k.speed - 50 * dt); }
    }
    else if (inp.throttle > 0) { k.revT = 0; if (k.speed < -.6) k.speed = Math.min(0, k.speed + 60 * dt); else if (k.speed < vmax) k.speed += (k.accel * (EV ? EV.accel : 1) * (1 - Math.max(0, k.speed) / vmax) + 4) * dt * inp.throttle + Math.max(0, -k.speed); else k.speed -= (k.speed - vmax) * 1.6 * dt; }
    else { k.speed *= Math.pow(.72, dt); if (Math.abs(k.speed) < .3) k.speed = 0; }
    if (k.speed > vmax && k.boost <= 0) k.speed = Math.max(vmax, k.speed - 30 * dt);
  }
  // ---- dérapage ----
  const pressed = inp.drift && !k.prevDrift; k.prevDrift = inp.drift;
  if (!inp.drift) k.driftLock = false;
  const canDrift = !k.air && k.spin <= 0 && k.speed > k.maxSpeed * .36;
  let steerEff = steer;
  if (k.drift) {
    if (!inp.drift) endDrift(k, true);
    else if (!canDrift && !(k.air === 'jump' && k.spin <= 0)) { endDrift(k, k.air ? true : false); k.driftLock = true; }
    else {
      const a = clamp(steer * k.drift, -1, 1);
      k.driftA = a;
      // intérieur : virage serré ; neutre : arc moyen ; contre-braquage : le kart part vraiment de l'autre côté
      steerEff = k.drift * (a >= 0 ? .55 + .62 * a : .55 + 1.25 * a);
      // contre-braquage maintenu : le drift bascule de l'autre côté (on garde le turbo déjà chargé)
      if (a < -.55) k.ctrT = (k.ctrT || 0) + dt; else k.ctrT = 0;
      if (k.ctrT > .2 && k.isPlayer) { const nd = -k.drift, keep = k.driftT * .5; endDrift(k, false); startDrift(k, nd); k.driftT = keep; k.ctrT = 0; k.driftA = 1; steerEff = nd * .9; }   // changer de côté ne donne plus de turbo
      k.driftT += dt * (1 + .5 * Math.max(0, a) + (k.isPlayer ? 0 : .1)) * (k.wallT > 0 || k.driftCd > 0 ? 0 : 1);   // pas de charge contre un mur ni juste après un turbo
      let tier = 0; for (let t = 1; t < DRIFT_TIERS.length; t++) if (k.driftT >= DRIFT_TIERS[t]) tier = t;
      if (tier > k.driftTier) { k.driftTier = tier; if (k.isPlayer) { AudioSys.tone([0, 880, 1100, 1320][tier], .09, 'square', .07); vibrate(12); } }
    }
  } else if (inp.drift && canDrift && !k.driftLock) {
    if (Math.abs(steer) > .18) startDrift(k, Math.sign(steer));
    else if (pressed) { k.hop = .22; k.driftArm = .4; }
    else if (k.driftArm > 0) { k.driftArm -= dt; }
  }
  if (k.driftArm > 0 && !k.drift) k.driftArm -= dt;
  // ---- direction ----
  const sp = Math.abs(k.speed); const ts = clamp(sp / 8, 0, 1) * (1 - .22 * clamp(sp / k.maxSpeed, 0, 1.3));
  const airF = k.air === 'glide' ? .75 * (1 + ((k.st && k.st.air) || .35) * .6 - .21) : k.air ? .45 : 1;
  k.h -= steerEff * k.turn * (EV ? EV.turn : 1) * (k.drift ? 1.32 : 1) * ts * dt * airF * (k.speed < 0 ? -1 : 1);
  const ice = (W.def.grip || 1) * (EV ? EV.grip : 1) * (W.wx ? W.wx.grip : 1); const grip = k.air ? 3 : (k.drift ? 5.6 : (k.off ? 6.5 : 11)) * (k.off ? 1 : ice);
  k.vh += angDiff(k.vh, k.h) * (1 - Math.exp(-grip * dt));
  const ws = S.wscale && P0 === S ? S.wscale[j0] : 1; // zones anti-gravité : la piste dépliée est plus courte
  k.x += Math.sin(k.vh) * k.speed * dt * ws; k.z += Math.cos(k.vh) * k.speed * dt * ws;
  { const wd = envWind(W, k); if (wd && P0 === S) { k.x += S.rx[j0] * wd * dt; k.z += S.rz[j0] * wd * dt; } }
  trackLocate(k);
  { const P1 = k.P || S, lim1 = P1.lim || W.lim; if (Math.abs(k.lat) > lim1 + 8 && !(P1.glide && P1.glide[k.idx])) relocateAny(k); }
  // ---- murs (en l'air au-dessus d'un ravin : plus de liberté, retour doux vers la route) ----
  const P = k.P || S, i = k.idx, lim = P.lim || W.lim, os = openSide(P, i), overGap = !!(P.glide && P.glide[i]);
  const limH = overGap ? lim * 1.5 : lim;
  if (overGap && Math.abs(k.lat) > lim && P.glideT[i] > .6) { const s = Math.sign(k.lat), pull = (Math.abs(k.lat) - lim) * Math.min(1, dt * 3.5); k.x -= P.rx[i] * s * pull; k.z -= P.rz[i] * s * pull; k.lat -= s * pull; }
  // embranchement : passage libre tant que les routes se chevauchent, puis muret de séparation (P.gore)
  const gl = os && P.gore && Math.sign(k.lat) === os ? P.gore[i] : 0, limW = gl > 0 ? Math.max(lim, gl) : limH;
  const eo = edgeOpen(P, i, k.lat);
  if (eo && !k.air && !overGap && Math.abs(k.lat) > (P.hw || W.hw) + W.curbW + 1) { startFall(k); return; }
  gateBlock(k, W);
  if (!eo && Math.abs(k.lat) > limW && !(os && !gl && Math.sign(k.lat) === os && Math.abs(k.lat) < lim + 40)) {
    const s = Math.sign(k.lat), push = Math.min(Math.abs(k.lat) - limW, 3); k.wallT = .6; k.x -= P.rx[i] * s * push; k.z -= P.rz[i] * s * push; k.lat -= s * push;
    const vx = Math.sin(k.vh), vz = Math.cos(k.vh); const vl = (vx * P.rx[i] + vz * P.rz[i]) * s;
    if (vl > 0) {
      const nx = vx - P.rx[i] * s * vl * 1.15, nz = vz - P.rz[i] * s * vl * 1.15; k.vh = Math.atan2(nx, nz); k.h += angDiff(k.h, k.vh) * .55;
      k.speed *= 1 - (.12 * vl + .45 * vl * vl); if (k.drift && vl > .12) { endDrift(k, false); k.driftLock = true; }
      if (k.isPlayer && vl > .15 && k.wallCd <= 0) { AudioSys.sfx('wall'); vibrate(30); k.wallCd = .4; }
    }
  }
  k.wallCd -= dt; k.bumpCd -= dt; k.wallT = (k.wallT || 0) - dt; k.driftCd = (k.driftCd || 0) - dt;
  // ---- vol ----
  airPhysics(k, P, overGap, inp, pressed, dt);
  if (k.hop > 0) k.hop -= dt;
  if (k.shield > 0) k.shield -= dt;
  if (k.trickT > 0) k.trickT -= dt;
  if (k.squash > 0) k.squash -= dt;
  // ---- plaques turbo, tremplins, obstacles ----
  if (!k.air) {
    for (const p of W.pads) { if ((p.P || S) !== P) continue; let di = Math.abs(k.idx - p.i); if (P.closed) di = Math.min(di, P.N - di); if (di <= 2 && Math.abs(k.lat - p.lat) < 2.9) { if (k.boost < .9 && k.isPlayer) AudioSys.sfx('boost'); k.boost = Math.max(k.boost, 1.1); } }
    kickerLaunch(k, W);
    if (P === S && k.speed > 30) for (const b of W.bumps || []) { const di = k.idx - b.crest; if (di >= 0 && di <= 2) { launchJump(k, b); break; } }
  }
  if (k.bubble > 0) { const u = clamp((1.7 - k.bubble) / .35, 0, 1) * clamp(k.bubble / .25, 0, 1); k.y = Math.max(k.y, k.groundY + 2.2 * u); }
  obstacleHits(k, dt, ox0, oz0);
}
function launchJump(k, r) {
  // petit saut au sommet d'un dos d'âne (pas d'obligation de figure)
  k.air = 'jump'; k.vy = 2.6 + Math.max(0, k.speed - 30) * .11 + (k.boost > 0 ? 1.2 : 0); k.airH = Math.max(k.airH || 0, .15); k.trickOK = true; k.trick = false;
  if (k.isPlayer) AudioSys.tone(260, .18, 'triangle', .06, 1.6);
  else if (Math.random() < .5) k.aiTrickAt = rand(.05, .2);
}
function airPhysics(k, P, overGap, inp, pressed, dt) {
  const W = G.W, hop = !!W.def.hop;
  if (overGap && !k.air) {
    k.air = hop ? 'hop' : 'glide'; k.vy = hop ? 10.5 : 11.5; k.airH = Math.max(k.airH || 0, .2); k.trickOK = true; k.trick = false;
    if (k.drift) endDrift(k, true);
    if (k.isPlayer) { AudioSys.sfx('glide'); banner(W.def.hopLabel || (hop ? 'Saut lunaire !' : 'Planeur !'), 1.1); }
    else if (Math.random() < .6) k.aiTrickAt = rand(.1, .35);
  }
  if (!k.air) { k.airH = 0; k.vy = 0; k.y = lerp(k.y, k.groundY, 1 - Math.exp(-dt * 22)); return; }
  k.airT = (k.airT || 0) + dt;
  // figure : DRIFT pendant le saut
  const wantTrick = k.isPlayer && !G.autopilot ? pressed : (k.aiTrickAt != null && k.airT >= k.aiTrickAt);
  if (k.trickOK && !k.trick && wantTrick && k.airT < 1.2) { k.trick = true; k.trickT = .45; k.trickDir = Math.random() < .5 ? -1 : 1; k.aiTrickAt = null; if (k.isPlayer) { AudioSys.tone(660, .12, 'square', .08, 1.8); vibrate(15); } }
  let g;
  if (k.air === 'glide') g = overGap ? 9 : 30; else if (k.air === 'hop') g = overGap ? 7 : 22; else g = 24;
  k.vy -= g * dt * ((zoneEnv(k) || {}).grav || 1);
  if (k.air === 'glide' && overGap && k.vy < -2.3) k.vy += (-2.3 - k.vy) * (1 - Math.exp(-dt * 5));   // le planeur freine la chute
  k.airH += k.vy * dt;
  if ((k.air === 'glide' || k.air === 'hop') && overGap) {
    { const gv = k.maxSpeed * .97 * (1.021 - ((k.st && k.st.air) || .35) * .06); if (k.speed < gv) k.speed += (gv - k.speed) * Math.min(1, dt * 2.5); }
    if (k.airH < 1.4) { k.airH = 1.4; if (k.vy < 0) k.vy = 0; }
  }
  if (k.airH <= 0 && !overGap) {
    // atterrissage
    const hard = k.vy < -9; k.air = false; k.airH = 0; k.vy = 0; k.airT = 0; k.squash = hard ? .3 : .2; k.hop = .12;
    if (k.trick) { k.boost = Math.max(k.boost, .85); if (k.isPlayer) { AudioSys.sfx('mini'); banner('Figure réussie !', .9); } }
    k.trick = false; k.trickOK = false;
    if (k.isPlayer) { AudioSys.sfx('land'); vibrate(hard ? 35 : 20); }
  }
  k.y = k.groundY + Math.max(0, k.airH);
}

/* ---- obstacles et tremplins ---- */
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const OBST_THEME = {
  prairie: { pillar: 'rock', roll: 'barrel', walk: 'sheep', kinds: ['pillars', 'rollers', 'walkers'] },
  desert: { pillar: 'cactus', roll: 'boulder', walk: 'crab', kinds: ['pillars', 'rollers'] },
  snow: { pillar: 'snowman', roll: 'snowball', walk: 'penguin', kinds: ['rollers', 'pillars'] },
  city: { pillar: 'cones', crush: 'piston', kinds: ['crushers', 'pillars'] },
  beach: { pillar: 'sandcastle', roll: 'boulder', walk: 'crab', kinds: ['walkers', 'pillars'] },
  canyon: { pillar: 'rock', roll: 'boulder', kinds: ['pillars', 'rollers', 'pillars'] },
  sky: { pillar: 'crystal', crush: 'stone', kinds: ['pillars', 'crushers'] },
  volcano: { pillar: 'darkrock', crush: 'geyser', roll: 'boulder', kinds: ['crushers', 'pillars', 'rollers'] },
  forest: { pillar: 'stump', roll: 'boulder', walk: 'sheep', kinds: ['pillars', 'rollers'] },
  moon: { pillar: 'crystal', walk: 'rover', roll: 'boulder', kinds: ['walkers', 'pillars', 'rollers'] },
  glacier: { pillar: 'icepillar', walk: 'penguin', roll: 'snowball', kinds: ['walkers', 'pillars', 'rollers'] },
  jungle: { pillar: 'totem', roll: 'boulder', kinds: ['rollers', 'pillars', 'rollers'] },
  reef: { pillar: 'coral', walk: 'crab', roll: 'urchin', kinds: ['walkers', 'pillars', 'rollers'] },
  alpine: { pillar: 'rock', roll: 'snowball', walk: 'sheep', kinds: ['rollers', 'pillars', 'walkers'] },
  candy: { pillar: 'gumdrop', roll: 'gumball', kinds: ['pillars', 'rollers', 'pillars'] },
  haunted: { pillar: 'tomb', crush: 'thwomp', walk: 'ghost', kinds: ['crushers', 'pillars', 'walkers'] },
};
function planObstacles(W) {
  const S = W.S, N = S.N, def = W.def, th = W.th; const rng = seeded(seedHash(def.id + ':obst', RACE_OPTS.seed || 1));
  const cfg = Object.assign({}, OBST_THEME[th.decor] || OBST_THEME.prairie, def.obst || {}); W.obst = []; W.ramps = [];
  const blocked = new Uint8Array(N); const block = (i, r) => { for (let o = -r; o <= r; o++) blocked[((i + o) % N + N) % N] = 1; };
  block(0, Math.round(N * .07)); for (let i = 0; i < N; i++) if (S.glide[i]) block(i, 26);
  for (const B of W.branches) { block(B.i0, 36); block(B.i1, 30); }
  for (const p of W.pads) if (!p.P) block(p.i, 12); for (const t of def.items) block(Math.floor(t * N), 14);
  for (const [a, b] of def.tunnels || []) for (let i = Math.floor(a * N); i <= Math.floor(b * N); i++) block(i % N, 6);
  const straight = (i, r) => { let c = 0; for (let o = -r; o <= r; o += 2) c += Math.abs(S.curv[((i + o) % N + N) % N]); return c; };
  const pickSpot = (r, maxC) => { for (let tries = 0; tries < 900; tries++) { const i = Math.floor(N * (.1 + rng() * .8)); let ok = true; for (let o = -r; o <= r; o++) if (blocked[((i + o) % N + N) % N]) { ok = false; break; } if (ok && straight(i, 14) < maxC) return i; } return -1; };
  for (const b of W.bumps || []) block(b.i, 40);
  for (const kk of W.kickers || []) block(kk.i, 30);
  if (S.wz) for (let i = 0; i < N; i++) if (S.wz[i]) block(i, 12);
  // zones d'obstacles
  const zones = def.obstZones || clamp(Math.round(S.L / 520), 2, 4);
  for (let z = 0; z < zones; z++) {
    const kind = cfg.kinds[z % cfg.kinds.length]; let i = pickSpot(22, kind === 'pillars' || kind === 'walkers' ? .6 : .4); if (i < 0) i = pickSpot(14, .8); if (i < 0) continue; block(i, 55);
    const hw = W.hw;
    if (kind === 'pillars') {
      if (rng() < .5) W.obst.push({ kind: 'pillar', style: cfg.pillar, P: S, i, lat: 0, r: 3.1 });
      else { const s = rng() < .5 ? -1 : 1; W.obst.push({ kind: 'pillar', style: cfg.pillar, P: S, i, lat: s * hw * .45, r: 2.6 }, { kind: 'pillar', style: cfg.pillar, P: S, i: i + 16, lat: -s * hw * .45, r: 2.6 }); }
    } else if (kind === 'rollers' && cfg.roll) {
      const n = rng() < .5 ? 1 : 2; for (let q = 0; q < n; q++) W.obst.push({ kind: 'roller', style: cfg.roll, P: S, i: i + q * 18, lat: 0, r: 1.9, amp: hw * .82, per: 4.2 + rng() * 1.6, ph: rng() * TAU });
    } else if (kind === 'crushers' && cfg.crush) {
      for (const l of [-.5, .5]) W.obst.push({ kind: 'crusher', style: cfg.crush, P: S, i: i + (l > 0 ? 14 : 0), lat: l * hw, r: 2.4, per: 3.2, ph: l > 0 ? Math.PI : 0 });
    } else if (kind === 'jets') {
      const n = 2 + Math.floor(rng() * 2), st = cfg.jet || 'lava'; for (let q = 0; q < n; q++) W.obst.push({ kind: 'jet', style: st, P: S, i: i + q * 9, lat: (q % 2 ? 1 : -1) * hw * (.15 + rng() * .45), r: 2.1, per: 3.4, ph: q * 1.7 + rng() });
    } else if (kind === 'bumpers') {
      const pat = rng() < .5 ? [[-.5, 0], [.5, 0], [0, 10]] : [[0, 0], [-.6, 12], [.6, 12]]; for (const [l, di] of pat) W.obst.push({ kind: 'pillar', style: 'bumper', P: S, i: i + di, lat: l * hw, r: 1.9 });
    } else if (kind === 'traffic') {
      const n = 2 + Math.floor(rng() * 2); for (let q = 0; q < n; q++) { const lane = (q % 2 ? 1 : -1) * hw * .5; W.obst.push({ kind: 'traffic', style: cfg.car || (q % 3 ? 'car' : 'bus'), P: S, i: 0, i0: 0, span: S.L, speed: 15 + rng() * 9, ph: q / n + rng() * .05, lat0: lane, lat: lane, r: 2.4, dir: 1 }); }
    } else if (kind === 'balls') {
      const span = Math.min(S.L * .2, 420), i0 = i; for (let q = 0; q < 2; q++) W.obst.push({ kind: 'ball', style: cfg.ball || 'metal', P: S, i: i0, i0, span, speed: 20 + rng() * 6, ph: q * .5, lat0: (q ? .3 : -.3) * hw, lat: 0, sway: hw * .35, r: 3.4, dir: -1 });
    } else if (cfg.walk) {
      for (let q = 0; q < 2; q++) W.obst.push({ kind: 'walker', style: cfg.walk, P: S, i: i + q * 12, lat: 0, r: 1.05, amp: hw * .72, per: 4.5 + rng() * 3, ph: rng() * TAU });
    }
  }
  // chemin étroit : un obstacle mobile au milieu
  for (const B of W.branches) if (B.def.narrow) { const j = Math.floor(B.N * .55); if (cfg.roll) W.obst.push({ kind: 'roller', style: cfg.roll, P: B, i: j, lat: 0, r: 1.7, amp: B.hw * .8, per: 3.6, ph: rng() * TAU });
    else if (cfg.crush) W.obst.push({ kind: 'crusher', style: cfg.crush, P: B, i: j, lat: 0, r: 2.4, per: 2.6, ph: 0 }); }
  for (const o of W.obst) { if (o.kind === 'traffic' || o.kind === 'ball') { obstState11(o, 0); continue; } o.i = clamp(o.i, 0, o.P.N - 1); o.x = o.P.px[o.i] + o.P.rx[o.i] * o.lat; o.z = o.P.pz[o.i] + o.P.rz[o.i] * o.lat; o.y = o.P.py[o.i]; o.down = false; }
}
// position animée (horloge commune de la course)
function obstState(o, t) {
  if (obstState11(o, t)) return;
  if (o.kind === 'roller' || o.kind === 'walker') { const l = Math.sin(t * TAU / o.per + o.ph) * o.amp; o.curLat = l; o.x = o.P.px[o.i] + o.P.rx[o.i] * (o.lat + l); o.z = o.P.pz[o.i] + o.P.rz[o.i] * (o.lat + l); }
  else if (o.kind === 'crusher') { const c = ((t / o.per + o.ph / TAU) % 1 + 1) % 1; o.h = c < .45 ? 7 : c < .53 ? 7 * (1 - (c - .45) / .08) : c < .7 ? 0 : 7 * Math.min(1, (c - .7) / .2); o.down = o.h < 1.6; }
}
function obstacleHits(k, dt, ax, az) {
  const W = G.W; if (!W.obst || k.isRemote) return; if (ax == null) { ax = k.x; az = k.z; }
  for (const o of W.obst) {
    if (o.kind === 'crusher' && !o.down) continue;
    if (o.kind === 'jet') { if ((k.x - o.x) ** 2 + (k.z - o.z) ** 2 < (o.r + .9) ** 2 && Math.abs(k.y - o.y) < 4) obstHit11(k, o); continue; }
    const R = o.r + 1.1, bx = k.x, bz = k.z; if ((bx - o.x) ** 2 + (bz - o.z) ** 2 > (R + 4) ** 2 && (ax - o.x) ** 2 + (az - o.z) ** 2 > (R + 4) ** 2) continue;
    if (Math.abs(k.y - o.y) > (o.kind === 'pillar' ? 5 : 3)) continue;
    // point d'entrée du segment (position avant → après) dans le cercle de l'obstacle
    const dx = bx - ax, dz = bz - az, fx = ax - o.x, fz = az - o.z; const A = dx * dx + dz * dz, Bq = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - R * R;
    let t = null;
    if (C <= 0) t = 0; else if (A > 1e-9) { const disc = Bq * Bq - 4 * A * C; if (disc >= 0) { const t1 = (-Bq - Math.sqrt(disc)) / (2 * A); if (t1 >= 0 && t1 <= 1) t = t1; } }
    if (t === null) continue;
    let cx = ax + dx * t, cz = az + dz * t; let nx = cx - o.x, nz = cz - o.z; let nl = Math.hypot(nx, nz);
    if (nl < 1e-4) { nx = -Math.sin(k.vh); nz = -Math.cos(k.vh); nl = 1; } nx /= nl; nz /= nl;
    k.x = o.x + nx * (R + .02); k.z = o.z + nz * (R + .02);
    const vx = Math.sin(k.vh) * Math.sign(k.speed || 1), vz = Math.cos(k.vh) * Math.sign(k.speed || 1), vn = vx * nx + vz * nz;
    if (o.kind === 'pillar' && o.style === 'bumper') { obstHit11(k, o, R, nx, nz, vn); continue; }
    if (vn < 0) {
      const tx = vx - nx * vn, tz = vz - nz * vn, tl = Math.hypot(tx, tz);
      k.speed *= Math.max(0, 1 - .9 * (-vn) * (-vn) - .15 * (-vn));                 // de face : on est bloqué net
      if (tl > .15) { const nh = Math.atan2(tx * Math.sign(k.speed || 1), tz * Math.sign(k.speed || 1)); k.vh = nh; k.h += angDiff(k.h, nh) * .4; }
      if (k.drift && -vn > .4) { endDrift(k, false); k.driftLock = true; }
    }
    if (o.kind === 'pillar' || (o.kind === 'crusher' && o.style !== 'geyser')) { if (k.isPlayer && k.bumpCd <= 0) { AudioSys.sfx('wall'); vibrate(30); k.bumpCd = .4; } }
    if (o.kind !== 'pillar' && k.star <= 0) { hitKart(k, null); if (k.isPlayer && k.spin > 0) banner('Aïe !', .8, true); }
  }
}
// dos d'âne : bosses arrondies intégrées à la route (remplacent les tremplins)
function planBumps(W) {
  const S = W.S, N = S.N, def = W.def; const rng = seeded([...def.id].reduce((h, c) => (h * 37 + c.charCodeAt(0)) >>> 0, 23)); W.bumps = [];
  const blocked = new Uint8Array(N); const block = (i, r) => { for (let o = -r; o <= r; o++) blocked[((i + o) % N + N) % N] = 1; };
  block(0, Math.round(N * .08)); for (let i = 0; i < N; i++) if (S.glide[i]) block(i, 34);
  for (const B of W.branches) { block(B.i0, 45); block(B.i1, 40); } for (const [t] of def.boosts) block(Math.floor(t * N), 16);
  for (const z of def.warp || []) for (let i = Math.floor(z.from * N) - 20; i <= Math.floor(z.to * N) + 20; i++) block(((i % N) + N) % N, 0); for (const t of def.tricks || []) block(Math.floor(t * N), 30); for (const t of def.items) block(Math.floor(t * N), 16);
  for (const [a, b] of def.tunnels || []) for (let i = Math.floor(a * N) - 8; i <= Math.floor(b * N) + 8; i++) block(((i % N) + N) % N, 0);
  const straight = (i) => { let c = 0; for (let o = -16; o <= 16; o += 2) c += Math.abs(S.curv[((i + o) % N + N) % N]); return c; };
  const n = S.L > 1800 ? 3 : 2, half = 9, h = 1.7;
  for (let q = 0; q < n; q++) {
    let pickI = -1; for (let tries = 0; tries < 900 && pickI < 0; tries++) { const i = Math.floor(N * (.1 + rng() * .8)); let ok = true; for (let o = -half - 6; o <= half + 6; o++) if (blocked[((i + o) % N + N) % N]) { ok = false; break; } if (ok && straight(i) < .3) pickI = i; }
    if (pickI < 0) break; block(pickI, 70);
    for (let o = -half; o <= half; o++) { const j = ((pickI + o) % N + N) % N; S.py[j] += h * (1 + Math.cos(Math.PI * o / half)) / 2; }
    for (let o = -half - 2; o <= half + 2; o++) { const j = ((pickI + o) % N + N) % N, nn = (j + 1) % N, p = (j - 1 + N) % N; S.slope[j] = (S.py[nn] - S.py[p]) / (2 * S.seg); }
    W.bumps.push({ i: pickI, crest: (pickI + 1) % N });
  }
}
const BUMP_TEX = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#17143a' : '#ffc531'; x.beginPath(); x.moveTo(i * 20 - 10, h); x.lineTo(i * 20 + 10, 0); x.lineTo(i * 20 + 30, 0); x.lineTo(i * 20 + 10, h); x.fill(); } });
function updateObstacles(t) { const W = G.W; if (!W.obst) return; for (const o of W.obst) { obstState(o, t); if (o.mesh) obstVisual(o, t); } }
function obstVisual(o, t) {
  const m = o.mesh; if (obstVisual11(o, t)) return;
  if (o.kind === 'roller') { m.position.set(o.x, o.y + o.r, o.z); const v = Math.cos(t * TAU / o.per + o.ph) * o.amp * TAU / o.per; m.userData.spin = (m.userData.spin || 0) + v / 60 / o.r; if (m.userData.inner) m.userData.inner.rotation.z = -m.userData.spin; }
  else if (o.kind === 'walker') { const bob = Math.abs(Math.sin(t * 9 + o.ph)) * .25; m.position.set(o.x, o.y + bob + (o.style === 'ghost' ? 1.2 + Math.sin(t * 2 + o.ph) * .4 : 0), o.z); const dir = Math.cos(t * TAU / o.per + o.ph); m.rotation.y = o.P.hd[o.i] + (dir > 0 ? -Math.PI / 2 : Math.PI / 2); }
  else if (o.kind === 'crusher') {
    const f = 1 - o.h / 7;
    if (m.userData.blk) m.userData.blk.position.y = o.h;
    if (m.userData.glow) m.userData.glow.material.opacity = .12 + .7 * f;
    if (m.userData.col) { const sc = Math.max(.04, f); m.userData.col.scale.y = sc; m.userData.col.position.y = 3.5 * sc; m.userData.col.visible = sc > .06; }
  }
}

/* ================= v8 : quatre grands mondes (Sakura, Safari, Fête foraine, Espace) ================= */
function addTick(W, f) { (W.tick = W.tick || []).push(f); }
function stripeTex(a, b, n = 8, vertical = true) { return canvasTex(128, 128, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; if (vertical) x.fillRect(i * w / n, 0, w / n + 1, h); else x.fillRect(0, i * h / n, w, h / n + 1); } }); }
function glowPoints(W, list, color, size = 5, op = .85) { if (!list.length) return null; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(list, 3)); const p = new T.Points(g, new T.PointsMaterial({ color, size, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: op })); W.scene.add(p); return p; }
function nearBranchWin(W, i, pad = 20) { return W.branches.some((B) => (i >= B.winA[0] - pad && i <= B.winA[1] + pad) || (i >= B.winB[0] - pad && i <= B.winB[1] + pad)); }
function gapCenters(W) { const S = W.S, out = []; for (const [a, b] of W.def.glide || []) { const i = Math.floor((a + b) / 2 * S.N) % S.N; out.push(i); } return out; }
function hy(W, x, z, dy = 0) { return (W.hAt ? W.hAt(x, z) : 0) + dy; }

/* ---------- Vallée Sakura ---------- */
function buildSakura(W, ext, cx, cz, scatter, ring, q) {
  const { scene, S } = W; const pinks = ['#ffb7d0', '#ff9cc0', '#ffd0e0', '#ffc0d8', '#ffe3ee'];
  const trunk = new T.CylinderGeometry(.35, .6, 4.6, 9); trunk.translate(0, 2.3, 0); trunk.applyMatrix4(trs(0, 0, 0, 0, 0, .12));
  instanced(scene, [{ geo: trunk, mat: lam('#5a3a32') }, { geo: decorGeo('crown'), mat: lam('#ffffff'), off: trs(.4, 6, 0, 0, 0, 0, 1.05), colors: pinks }, { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: tr(-1.4, 5.2, .9), colors: pinks.slice().reverse() }, { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: tr(1.6, 4.9, -1), colors: pinks }],
    scatter(330 * q, 5, 280, .8, 1.5));
  // bambouseraies
  const bam = new T.CylinderGeometry(.14, .16, 12, 7); bam.translate(0, 6, 0); const bparts = [];
  for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, r = .9 + (k % 3) * .5; bparts.push({ geo: bam, mat: lam('#ffffff'), off: trs(Math.cos(a) * r, 0, Math.sin(a) * r, rand(-.08, .08), 0, rand(-.08, .08), rand(.8, 1.15)), colors: ['#6aa84f', '#7cbf5a', '#5a9a40'] }); }
  instanced(scene, bparts, scatter(60 * q, 6, 200, .9, 1.3));
  instanced(scene, [{ geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, .7, 0), colors: ['#4f9a42', '#5fae4a'] }], scatter(140 * q, 3, 150, .7, 1.3));
  // lanternes de pierre le long de la route
  const lp = [], lg = [];
  for (let i = 0; i < S.N; i += 34) { if (S.glide[i] || nearBranchWin(W, i, 10)) continue; const sg = (i / 34) % 2 ? 1 : -1, d = sg * (W.wallD + 1.8); const x = S.px[i] + S.rx[i] * d, z = S.pz[i] + S.rz[i] * d; lp.push({ x, z, y: S.py[i], s: 1, r: S.hd[i] }); lg.push(x, S.py[i] + 2.35, z); }
  const stone = lam('#b8b4a8');
  instanced(scene, [{ geo: new T.CylinderGeometry(.55, .7, .4, 8), mat: stone, off: tr(0, .2, 0) }, { geo: new T.CylinderGeometry(.18, .22, 1.4, 8), mat: stone, off: tr(0, 1.1, 0) }, { geo: new T.BoxGeometry(.9, .7, .9), mat: new T.MeshLambertMaterial({ color: '#fff0c8', emissive: '#ffb050', emissiveIntensity: .6 }), off: tr(0, 2.15, 0) },
    { geo: new T.ConeGeometry(.9, .6, 4), mat: stone, off: trs(0, 2.8, 0, 0, Math.PI / 4, 0) }], lp);
  glowPoints(W, lg, '#ffc070', 4, .7);
  // portiques torii au-dessus de la route
  const red = stdMat('#e2342a', .5, .05), blk = stdMat('#1b1840', .5, .1); const tg = [];
  for (const [a, b] of W.def.torii || []) for (let i = Math.floor(a * S.N); i <= Math.floor(b * S.N); i += 13) { const j = i % S.N; if (S.glide[j] || nearBranchWin(W, j, 6)) continue; tg.push(j); }
  for (const j of tg) { const g = new T.Group(); g.position.set(S.px[j], S.py[j], S.pz[j]); g.rotation.y = S.hd[j]; const span = W.wallD + 1.2;
    for (const s of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.45, .55, 9, 12), red); p.position.set(s * span, 4.5, 0); g.add(p); const bs = new T.Mesh(new T.CylinderGeometry(.62, .62, .5, 12), blk); bs.position.set(s * span, .25, 0); g.add(bs); }
    const top = new T.Mesh(rbox(span * 2 + 4, .7, 1.1, .2), blk); top.position.y = 9.2; g.add(top); const top2 = new T.Mesh(rbox(span * 2 + 3, .6, .9, .15), red); top2.position.y = 8.5; g.add(top2);
    const nuki = new T.Mesh(rbox(span * 2 + 1, .5, .6, .12), red); nuki.position.y = 7.1; g.add(nuki); scene.add(g); }
  // pagode sur la colline + maisons
  const pag = scatter(1, 34, 140, 1, 1)[0];
  if (pag) { const g = new T.Group(); const wall = lam('#f4ead8'), roofM = stdMat('#3a2a44', .6, .2), wood = lam('#a0402a');
    for (let k = 0; k < 5; k++) { const w = 9 - k * 1.4; const b = new T.Mesh(new T.BoxGeometry(w, 2.6, w), k % 2 ? wall : wood); b.position.y = 1.3 + k * 3.4; g.add(b); const r = new T.Mesh(new T.ConeGeometry(w * .95, 1.6, 4, 1), roofM); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 1); r.position.y = 3.2 + k * 3.4; g.add(r); }
    const sp = new T.Mesh(new T.CylinderGeometry(.12, .2, 4, 8), stdMat('#ffc531', .3, .8)); sp.position.y = 19.5; g.add(sp);
    g.position.set(pag.x, hy(W, pag.x, pag.z, -.2), pag.z); g.scale.setScalar(1.6); g.rotation.y = rand(0, TAU); scene.add(g); }
  const roof = new T.ConeGeometry(4.6, 2.2, 4); roof.rotateY(Math.PI / 4);
  instanced(scene, [{ geo: new T.BoxGeometry(6, 3, 5), mat: lam('#ffffff'), off: tr(0, 1.5, 0), colors: ['#f4ead8', '#efe0c8'] }, { geo: roof, mat: lam('#ffffff'), off: tr(0, 4.1, 0), colors: ['#3a2a44', '#4a3050'] }, { geo: new T.BoxGeometry(1.2, 1.4, .1), mat: lam('#a0402a'), off: tr(0, .7, 2.55) }],
    scatter(16, 18, 180, 1, 1.2));
  // mont enneigé au loin (façon volcan japonais)
  const fuji = new T.Mesh(decorGeo('mountain'), lam('#ffffff', { vertexColors: true })); const fa = rand(0, TAU); fuji.position.set(cx + Math.cos(fa) * (ext + 650), -40, cz + Math.sin(fa) * (ext + 650)); fuji.scale.set(420, 330, 420); scene.add(fuji);
  instanced(scene, [{ geo: decorGeo('mountain'), mat: lam('#ffffff', { vertexColors: true }) }], ring(16, 320, 520).map((p) => { const r = rand(90, 160); return Object.assign(p, { sx: r, sy: rand(90, 170), sz: r }); }));
  // cascade + rivière sous le planeur
  const wt = waterTex(); W.waterTex = wt;
  for (const i of gapCenters(W)) { const base = S.py[i] - ((W.th.terrain && W.th.terrain.drop) || 22);
    const river = new T.Mesh(new T.PlaneGeometry(60, 260), new T.MeshStandardMaterial({ map: wt, roughness: .1, metalness: .15, transparent: true, opacity: .92 })); river.rotation.x = -Math.PI / 2; river.rotation.z = -S.hd[i] + Math.PI / 2; river.position.set(S.px[i], base + 2, S.pz[i]); scene.add(river);
    const fall = new T.Mesh(new T.PlaneGeometry(26, 34), new T.MeshBasicMaterial({ map: wt, transparent: true, opacity: .85, side: T.DoubleSide })); const d = 48; fall.position.set(S.px[i] + S.rx[i] * d, base + 17, S.pz[i] + S.rz[i] * d); fall.rotation.y = S.hd[i] + Math.PI / 2; scene.add(fall);
    addTick(W, (dt) => { if (W.parts && Math.random() < .5) W.parts.emit(fall.position.x + rand(-10, 10), base + 2.5, fall.position.z + rand(-3, 3), rand(-2, 2), rand(2, 5), rand(-2, 2), '#e8faff', .8, .6); }); }
  // pétales qui tombent
  const n = 380, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-60, 60); }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const pp = new T.Points(pg, new T.PointsMaterial({ color: '#ffc0d8', size: .32, map: DOT_TEX, transparent: true, depthWrite: false, opacity: .95 })); pp.frustumCulled = false; scene.add(pp);
  addTick(W, (dt, now) => { for (let i = 0; i < n; i++) { pos[i * 3 + 1] -= dt * 2.2; pos[i * 3] += Math.sin(now * 1.3 + i) * dt * 1.8; pos[i * 3 + 2] += Math.cos(now + i * .7) * dt * .9; if (pos[i * 3 + 1] < -2) pos[i * 3 + 1] += 40; } pg.attributes.position.needsUpdate = true; pp.position.set(camera.position.x, camera.position.y - 14, camera.position.z); });
  addFlock(W, wingGeo(.9), lam('#ffffff', { side: T.DoubleSide }), 5, 5, { anchors: anchorsOf(W, 10), yMin: 20, yMax: 40, rMin: 18, rMax: 34, colors: ['#fffdf7', '#e8e4f0'], flap: true });
  addClouds(W, ext, cx, cz, 12);
}

/* ---------- Safari Doré ---------- */
function buildSafari(W, ext, cx, cz, scatter, ring, q) {
  const { scene, S } = W; const olive = ['#7a8f3a', '#8aa048', '#6a7f30'];
  // acacias
  const at = new T.CylinderGeometry(.22, .4, 6, 7); at.translate(0, 3, 0); at.applyMatrix4(trs(0, 0, 0, 0, 0, .18));
  const crown = new T.SphereGeometry(1, 14, 8); crown.scale(4.2, .7, 3.6);
  instanced(scene, [{ geo: at, mat: lam('#5a3e2a') }, { geo: crown, mat: lam('#ffffff'), off: tr(1, 6.4, 0), colors: olive }, { geo: crown, mat: lam('#ffffff'), off: trs(-.6, 5.6, .8, 0, .6, 0, .6), colors: olive }], scatter(280 * q, 5, 300, .8, 1.5));
  // baobabs
  const bt = new T.CylinderGeometry(1.4, 2.3, 9, 12); bt.translate(0, 4.5, 0); const parts = [{ geo: bt, mat: lam('#9a7a62') }];
  for (let k = 0; k < 5; k++) { const br = new T.CylinderGeometry(.18, .35, 3, 6); br.translate(0, 1.5, 0); parts.push({ geo: br, mat: lam('#9a7a62'), off: trs(Math.cos(k * 1.3) * .8, 8.6, Math.sin(k * 1.3) * .8, Math.cos(k * 1.3) * .7, 0, Math.sin(k * 1.3) * .7) }); }
  parts.push({ geo: decorGeo('bush'), mat: lam('#6a8a3a'), off: trs(0, 10.5, 0, 0, 0, 0, 1.2) });
  instanced(scene, parts, scatter(34 * q, 10, 260, .9, 1.4));
  // hautes herbes dorées
  const tuft = new T.ConeGeometry(.5, 1.6, 5); tuft.translate(0, .8, 0);
  instanced(scene, [{ geo: tuft, mat: lam('#ffffff'), colors: ['#e0b860', '#d0a048', '#f0c870'] }, { geo: tuft, mat: lam('#ffffff'), off: trs(.5, 0, .3, .2, 0, .25, .8), colors: ['#d8b058', '#c89a40'] }], scatter(1000 * q, 2, 170, .7, 1.5));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .9, 0), colors: ['#b8865a', '#a07650', '#c89a6a'] }], scatter(60 * q, 6, 240, 1.4, 4.5));
  // animaux
  const yel = lam('#e8b048'), spot = lam('#8a4a20'), grey = lam('#8a8a92'), wht = new T.MeshLambertMaterial({ map: stripeTex('#f4f2ea', '#1b1b22', 12) }), dk = lam('#1b1b22');
  const giraffe = () => { const g = new T.Group(); const b = new T.Mesh(new T.CapsuleGeometry(.75, 1.6, 6, 10), yel); b.rotation.z = Math.PI / 2; b.position.y = 3.2; g.add(b);
    const n = new T.Mesh(new T.CylinderGeometry(.25, .4, 3.6, 8), yel); n.position.set(1.2, 5, 0); n.rotation.z = -.35; g.add(n); const h = new T.Mesh(new T.CapsuleGeometry(.3, .6, 4, 8), yel); h.rotation.z = Math.PI / 2; h.position.set(1.95, 6.9, 0); g.add(h);
    for (const [x, z] of [[-.8, .35], [-.8, -.35], [.8, .35], [.8, -.35]]) { const l = new T.Mesh(new T.CylinderGeometry(.13, .15, 2.6, 6), yel); l.position.set(x, 1.3, z); g.add(l); }
    for (let k = 0; k < 7; k++) { const s2 = new T.Mesh(new T.SphereGeometry(.22, 6, 5), spot); s2.position.set(rand(-1.1, 1.1), 3.2 + rand(-.4, .5), rand(-.55, .55)); s2.scale.z = .4; g.add(s2); } return g; };
  const elephant = () => { const g = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(1, 16, 12), grey); b.scale.set(2.2, 1.5, 1.4); b.position.y = 3; g.add(b); const h = new T.Mesh(new T.SphereGeometry(.9, 14, 10), grey); h.position.set(2.2, 3.6, 0); g.add(h);
    for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(.9, 10, 8), grey); e.scale.set(.2, 1, .9); e.position.set(2, 3.7, s * .9); g.add(e); const t = new T.Mesh(new T.ConeGeometry(.12, .9, 6), lam('#f4f0e0')); t.rotation.z = -1.2; t.position.set(2.9, 3, s * .4); g.add(t); }
    const tr2 = new T.Mesh(new T.CylinderGeometry(.12, .3, 2.2, 8), grey); tr2.position.set(2.9, 2.5, 0); tr2.rotation.z = .3; g.add(tr2);
    for (const [x, z] of [[-1.2, .7], [-1.2, -.7], [1.2, .7], [1.2, -.7]]) { const l = new T.Mesh(new T.CylinderGeometry(.42, .45, 2, 8), grey); l.position.set(x, 1, z); g.add(l); } return g; };
  const zebra = () => { const g = new T.Group(); const b = new T.Mesh(new T.CapsuleGeometry(.6, 1.4, 6, 10), wht); b.rotation.z = Math.PI / 2; b.position.y = 1.8; g.add(b); const n = new T.Mesh(new T.CylinderGeometry(.22, .35, 1.3, 8), wht); n.position.set(1.15, 2.6, 0); n.rotation.z = -.6; g.add(n);
    const h = new T.Mesh(new T.CapsuleGeometry(.24, .6, 4, 8), wht); h.rotation.z = Math.PI / 2 + .5; h.position.set(1.65, 3.1, 0); g.add(h); for (const [x, z] of [[-.7, .3], [-.7, -.3], [.7, .3], [.7, -.3]]) { const l = new T.Mesh(new T.CylinderGeometry(.11, .13, 1.4, 6), wht); l.position.set(x, .7, z); g.add(l); }
    const m = new T.Mesh(new T.BoxGeometry(.9, .25, .1), dk); m.position.set(1.1, 3, 0); m.rotation.z = -.6; g.add(m); return g; };
  const herds = scatter(22, 10, 120, 1, 1);
  herds.forEach((p, k) => { const kind = k % 3, n = kind === 1 ? 3 : 4 + (k % 3); const r0 = rand(0, TAU);
    for (let m = 0; m < n; m++) { const a = kind === 0 ? giraffe() : kind === 1 ? elephant() : zebra(); const x = p.x + rand(-9, 9), z = p.z + rand(-9, 9); a.position.set(x, hy(W, x, z, -.1), z); a.rotation.y = r0 + rand(-.5, .5); const sc = kind === 1 ? rand(.9, 1.2) : rand(.85, 1.1); a.scale.setScalar(sc); scene.add(a);
      const ph = rand(0, TAU); addTick(W, (dt, now) => { a.position.y = hy(W, x, z, -.1) + Math.abs(Math.sin(now * 1.6 + ph)) * .05; }); } });
  // rivières avec hippopotames sous les planeurs
  const wt = waterTex(); W.waterTex = wt;
  for (const i of gapCenters(W)) { const base = S.py[i] - ((W.th.terrain && W.th.terrain.drop) || 22) + 1.8;
    const river = new T.Mesh(new T.PlaneGeometry(70, 280), new T.MeshStandardMaterial({ map: wt, roughness: .1, metalness: .15, transparent: true, opacity: .92 })); river.rotation.x = -Math.PI / 2; river.rotation.z = -S.hd[i] + Math.PI / 2; river.position.set(S.px[i], base, S.pz[i]); scene.add(river);
    for (let k = 0; k < 4; k++) { const hp = new T.Mesh(new T.SphereGeometry(1.6, 14, 8, 0, TAU, 0, Math.PI / 2), lam('#7a6a78')); hp.scale.set(1.4, .7, 1); const o = rand(-30, 30); hp.position.set(S.px[i] + S.fx[i] * o + rand(-15, 15), base - .2, S.pz[i] + S.fz[i] * o + rand(-15, 15)); scene.add(hp); } }
  // grand soleil couchant + plateaux lointains
  const sun = new T.Mesh(new T.SphereGeometry(120, 24, 16), new T.MeshBasicMaterial({ color: '#ffb050', fog: false })); sun.position.set(-1000, 140, 800); W.sky.add(sun);
  const halo = new T.Sprite(new T.SpriteMaterial({ map: DOT_TEX, color: '#ff7a3a', transparent: true, opacity: .55, depthWrite: false, fog: false, blending: T.AdditiveBlending })); halo.scale.setScalar(700); halo.position.copy(sun.position); W.sky.add(halo);
  instanced(scene, [{ geo: decorGeo('mesa'), mat: lam('#ffffff'), colors: ['#a0583a', '#8a4a3a', '#b0684a'] }], ring(22, 300, 520).map((p) => { const r = rand(60, 120); return Object.assign(p, { sx: r, sy: rand(40, 90), sz: r }); }));
  addFlock(W, wingGeo(1.6), lam('#ffffff', { side: T.DoubleSide }), 6, 7, { anchors: anchorsOf(W, 12), yMin: 30, yMax: 60, rMin: 30, rMax: 60, colors: ['#2a2020', '#3a2a22'], flap: true });
  addClouds(W, ext, cx, cz, 8);
}

/* ---------- Fête foraine ---------- */
function buildFair(W, ext, cx, cz, scatter, ring, q) {
  const { scene, S } = W; const neon = ['#ff4f7a', '#ffc531', '#38b6ff', '#3ee08f', '#a87dff', '#ff8a3a'];
  const metal = stdMat('#e9ecf4', .25, .8), dark = stdMat('#22213a', .5, .3);
  // grande roue
  const fw = scatter(1, 40, 120, 1, 1)[0];
  if (fw) { const g = new T.Group(); g.position.set(fw.x, hy(W, fw.x, fw.z, -.1), fw.z); g.rotation.y = rand(0, TAU); scene.add(g); const R = 30;
    for (const s of [-1, 1]) { for (const t of [-1, 1]) { const leg = new T.Mesh(new T.CylinderGeometry(.5, .7, R + 6, 8), metal); leg.position.set(t * 9, (R + 6) / 2, s * 3); leg.rotation.z = -t * .28; g.add(leg); } }
    const wheel = new T.Group(); wheel.position.y = R + 4; g.add(wheel);
    for (const s of [-1, 1]) { const rim = new T.Mesh(new T.TorusGeometry(R, .45, 8, 64), metal); rim.position.z = s * 2.4; wheel.add(rim); }
    const lights = []; const cabs = [];
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; const sp = new T.Mesh(new T.CylinderGeometry(.2, .2, R, 6), metal); sp.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp);
      const cab = new T.Group(); const box = new T.Mesh(rbox(3.2, 2.6, 3, .4), stdMat(neon[k % neon.length], .4, .2)); box.position.y = -1.6; cab.add(box); const roofc = new T.Mesh(new T.ConeGeometry(2.2, 1, 6), stdMat('#fffdf7', .4, .1)); roofc.position.y = .1; cab.add(roofc); cab.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); wheel.add(cab); cabs.push(cab);
      for (let m = 0; m < 3; m++) { const b = a + m / 3 * TAU / 16; lights.push(Math.cos(b) * (R + .6), Math.sin(b) * (R + .6), 2.6); } }
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lights, 3)); const lp = new T.Points(lg, new T.PointsMaterial({ color: '#ffe07a', size: 3, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); wheel.add(lp);
    const hub = new T.Mesh(new T.CylinderGeometry(2, 2, 6, 16), dark); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    addTick(W, (dt, now) => { wheel.rotation.z += dt * .12; for (const c of cabs) c.rotation.z = -wheel.rotation.z; lp.material.color.setHSL((now * .1) % 1, .9, .7); }); }
  // carrousels
  const strip = stripeTex('#ff4f7a', '#fffdf7', 12);
  for (const p of scatter(3, 22, 150, 1, 1)) { const g = new T.Group(); g.position.set(p.x, hy(W, p.x, p.z, -.1), p.z); scene.add(g);
    const base = new T.Mesh(new T.CylinderGeometry(9, 9.5, 1, 32), stdMat('#ffc531', .4, .3)); base.position.y = .5; g.add(base);
    const roofC = new T.Mesh(new T.ConeGeometry(10.5, 4, 32, 1, true), new T.MeshLambertMaterial({ map: strip, side: T.DoubleSide })); roofC.position.y = 9; g.add(roofC);
    const pole = new T.Mesh(new T.CylinderGeometry(.8, .8, 9, 12), metal); pole.position.y = 5; g.add(pole);
    const rot = new T.Group(); g.add(rot);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const r = 6.5; const pl = new T.Mesh(new T.CylinderGeometry(.1, .1, 6.5, 6), stdMat('#ffc531', .3, .8)); pl.position.set(Math.cos(a) * r, 4, Math.sin(a) * r); rot.add(pl);
      const horse = new T.Mesh(new T.CapsuleGeometry(.5, 1.4, 4, 8), stdMat(neon[k % neon.length], .4, .2)); horse.rotation.z = Math.PI / 2; horse.rotation.y = -a; horse.position.set(Math.cos(a) * r, 3, Math.sin(a) * r); rot.add(horse); horse.userData.ph = k; }
    const lights = []; for (let k = 0; k < 32; k++) { const a = k / 32 * TAU; lights.push(Math.cos(a) * 10.5, 7.2, Math.sin(a) * 10.5); } const lp = glowPoints(W, [], '#fff'); void lp;
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lights, 3)); g.add(new T.Points(lg, new T.PointsMaterial({ color: '#fff3b0', size: 2.5, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
    addTick(W, (dt, now) => { rot.rotation.y += dt * .7; rot.children.forEach((c) => { if (c.userData.ph != null) c.position.y = 3 + Math.sin(now * 3 + c.userData.ph) * .6; }); }); }
  // chapiteaux de cirque
  const tentT = stripeTex('#e2342a', '#fffdf7', 16);
  instanced(scene, [{ geo: new T.CylinderGeometry(1, 1, 1, 24, 1, true), mat: new T.MeshLambertMaterial({ map: tentT, side: T.DoubleSide }), off: trs(0, 3, 0, 0, 0, 0, 1).multiply(new T.Matrix4().makeScale(9, 6, 9)) },
    { geo: new T.ConeGeometry(1, 1, 24), mat: new T.MeshLambertMaterial({ map: tentT }), off: tr(0, 9, 0).multiply(new T.Matrix4().makeScale(10, 6, 10)) }, { geo: new T.CylinderGeometry(.12, .12, 4, 6), mat: metal, off: tr(0, 13.5, 0) },
    { geo: new T.PlaneGeometry(1.6, 1), mat: new T.MeshBasicMaterial({ color: '#ffc531', side: T.DoubleSide }), off: tr(.8, 15, 0) }], scatter(6, 22, 200, .9, 1.4));
  // stands avec auvents rayés
  const aw = stripeTex('#38b6ff', '#fffdf7', 8);
  instanced(scene, [{ geo: new T.BoxGeometry(6, 3, 4), mat: lam('#ffffff'), off: tr(0, 1.5, 0), colors: ['#ffd0e0', '#d0f0ff', '#fff0c0'] }, { geo: new T.BoxGeometry(6.6, .3, 5.2), mat: new T.MeshLambertMaterial({ map: aw }), off: trs(0, 3.6, .4, .25, 0, 0) },
    { geo: new T.SphereGeometry(.35, 10, 8), mat: new T.MeshBasicMaterial({ color: '#ffe07a' }), off: tr(0, 3.3, 2.6) }], scatter(24 * q + 6, 8, 120, 1, 1.1));
  // montagnes russes : boucle de rails sur pilotis + wagon qui roule
  const cp = scatter(1, 30, 160, 1, 1)[0];
  if (cp) { const pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; const r = 26 + (k % 2) * 10; pts.push(new T.Vector3(cp.x + Math.cos(a) * r, 0, cp.z + Math.sin(a) * r)); }
    pts.forEach((p, k) => { p.y = hy(W, p.x, p.z) + 8 + (k % 3) * 7; }); const curve = new T.CatmullRomCurve3(pts, true, 'centripetal');
    for (const s of [-1, 1]) { const tube = new T.TubeGeometry(curve, 200, .25, 6, true); tube.translate(0, s * .0, 0); const m = new T.Mesh(tube, stdMat(s > 0 ? '#ff4f3a' : '#ffc531', .3, .6)); m.position.y = s * .6; scene.add(m); }
    for (let k = 0; k < 40; k++) { const p = curve.getPointAt(k / 40); const h = p.y - hy(W, p.x, p.z); const sp = new T.Mesh(new T.CylinderGeometry(.25, .35, h, 6), metal); sp.position.set(p.x, p.y - h / 2, p.z); scene.add(sp); }
    const cart = new T.Group(); for (let k = 0; k < 3; k++) { const c = new T.Mesh(rbox(2, 1.2, 2.4, .3), stdMat(neon[k], .4, .2)); c.position.z = -k * 2.8; cart.add(c); } scene.add(cart); let u = 0;
    addTick(W, (dt) => { u = (u + dt * .045) % 1; const p = curve.getPointAt(u), p2 = curve.getPointAt((u + .005) % 1); cart.position.copy(p).y += 1.2; cart.lookAt(p2.x, p2.y + 1.2, p2.z); }); }
  // guirlandes lumineuses le long de la piste
  const gl = [[], [], []]; for (let i = 0; i < S.N; i += 5) { if (S.glide[i]) continue; for (const sg of [-1, 1]) { const d = sg * (W.wallD + .2); gl[(i / 5) % 3 | 0].push(S.px[i] + S.rx[i] * d, S.py[i] + 1.8, S.pz[i] + S.rz[i] * d); } }
  const glp = gl.map((l, k) => glowPoints(W, l, ['#ff4f7a', '#ffc531', '#38b6ff'][k], 3.2, .9));
  addTick(W, (dt, now) => { glp.forEach((p, k) => { if (p) p.material.opacity = .45 + .55 * (Math.floor(now * 3) % 3 === k ? 1 : .3); }); });
  // ballons
  const bal = new T.SphereGeometry(1, 12, 10); bal.scale(1, 1.2, 1);
  instanced(scene, [{ geo: bal, mat: stdMat('#ffffff', .2, .05), off: tr(0, 9, 0), colors: neon }, { geo: new T.CylinderGeometry(.02, .02, 8, 4), mat: lam('#fffdf7'), off: tr(0, 4, 0) }], scatter(60 * q, 3, 150, .7, 1.2));
  // feux d'artifice
  let fwT = 1;
  addTick(W, (dt) => { fwT -= dt; if (fwT > 0 || !W.parts) return; fwT = rand(.6, 1.8); const a = rand(0, TAU), r = rand(80, 160), x = camera.position.x + Math.cos(a) * r, z = camera.position.z + Math.sin(a) * r, y = camera.position.y + rand(50, 90); const col = pick(neon);
    for (let k = 0; k < 46; k++) { const t = rand(0, TAU), e = rand(-1, 1), sp = rand(12, 18); W.parts.emit(x, y, z, Math.cos(t) * Math.sqrt(1 - e * e) * sp, e * sp, Math.sin(t) * Math.sqrt(1 - e * e) * sp, col, 1.4, .25); } });
  // lac sous le planeur
  const wt = waterTex(); W.waterTex = wt;
  for (const i of gapCenters(W)) { const base = S.py[i] - ((W.th.terrain && W.th.terrain.drop) || 20) + 1.8; const lake = new T.Mesh(new T.CircleGeometry(70, 40), new T.MeshStandardMaterial({ map: wt, color: '#a0c8ff', roughness: .1, metalness: .2, transparent: true, opacity: .9 })); lake.rotation.x = -Math.PI / 2; lake.position.set(S.px[i], base, S.pz[i]); scene.add(lake); }
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#1e1a3a', '#241e44'] }], ring(22, 280, 460).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(40, 90), sz: rand(90, 170) })));
  addStars(W, 500, .2, .7);
}

/* ---------- Anneau Stellaire (espace) ---------- */
function buildSpace(W, ext, cx, cz, scatter, ring, q) {
  const { scene, S } = W;
  addStars(W, 1400, -.9, .95);
  // nébuleuses
  for (const [col, x, y, z, s] of [['#a040ff', -900, 300, -700, 1100], ['#ff4fa8', 800, 200, -900, 900], ['#2ee6ff', 300, -300, 1000, 1000], ['#4a6aff', -700, -200, 700, 900]]) {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: DOT_TEX, color: col, transparent: true, opacity: .35, depthWrite: false, fog: false, blending: T.AdditiveBlending })); sp.position.set(x, y, z); sp.scale.setScalar(s); W.sky.add(sp); }
  // planètes
  const bands = canvasTex(256, 128, (x, w, h) => { const cols = ['#e8a060', '#c8784a', '#f0c890', '#b0603a', '#e09868', '#f4d8b0']; for (let i = 0; i < 16; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(0, i * h / 16, w, h / 16 + 1); } }, false);
  const pl = new T.Mesh(new T.SphereGeometry(260, 48, 32), new T.MeshBasicMaterial({ map: bands, fog: false })); pl.position.set(700, 250, -1000); pl.rotation.z = .3; W.sky.add(pl);
  const ringT = canvasTex(256, 16, (x, w) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,220,180,0)'); g.addColorStop(.3, 'rgba(255,220,180,.7)'); g.addColorStop(.6, 'rgba(200,160,120,.4)'); g.addColorStop(1, 'rgba(255,220,180,0)'); x.fillStyle = g; x.fillRect(0, 0, w, 16); }, false);
  const rg = new T.RingGeometry(330, 520, 96, 1); const uv = rg.attributes.uv, pos = rg.attributes.position; for (let i = 0; i < uv.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 330) / 190, .5); }
  const rm = new T.Mesh(rg, new T.MeshBasicMaterial({ map: ringT, transparent: true, side: T.DoubleSide, depthWrite: false, fog: false })); rm.position.copy(pl.position); rm.rotation.set(1.2, .2, .3); W.sky.add(rm);
  const blue = canvasTex(256, 256, (x, w) => { x.fillStyle = '#2a5ad6'; x.fillRect(0, 0, w, w); x.fillStyle = '#3ec0e0'; for (let i = 0; i < 20; i++) { x.beginPath(); x.ellipse(Math.random() * w, Math.random() * w, rand(10, 60), rand(6, 20), rand(0, 3), 0, TAU); x.fill(); } }, false);
  const p2 = new T.Mesh(new T.SphereGeometry(120, 32, 24), new T.MeshBasicMaterial({ map: blue, fog: false })); p2.position.set(-800, -150, 600); W.sky.add(p2);
  const moon = new T.Mesh(new T.SphereGeometry(40, 24, 16), new T.MeshBasicMaterial({ color: '#c8c8d8', fog: false })); moon.position.set(-500, 400, -800); W.sky.add(moon);
  // champ d'astéroïdes autour et sous la piste
  const ast = scatter(240 * q, 14, 360, 1, 1).map((p) => Object.assign(p, { y: rand(-90, 70) + (S.py[0] || 40), s: rand(1.5, 9), g: 0 }));
  const field = new T.Group(); scene.add(field);
  instanced(field, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), colors: ['#5a5468', '#6a6478', '#4a4458', '#7a6a5a'] }], ast);
  // station orbitale
  const st = scatter(1, 60, 200, 1, 1)[0];
  if (st) { const g = new T.Group(); g.position.set(st.x, (S.py[0] || 40) + 30, st.z); scene.add(g); const body = stdMat('#d8dce8', .3, .7), panelT = canvasTex(64, 64, (x, w) => { x.fillStyle = '#1a3a8a'; x.fillRect(0, 0, w, w); x.strokeStyle = '#6a9aff'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16, w); x.stroke(); x.beginPath(); x.moveTo(0, i * 16); x.lineTo(w, i * 16); x.stroke(); } });
    const core = new T.Mesh(new T.SphereGeometry(8, 24, 16), body); g.add(core); const rot = new T.Group(); g.add(rot);
    const tor = new T.Mesh(new T.TorusGeometry(26, 2.6, 12, 64), body); tor.rotation.x = Math.PI / 2; rot.add(tor);
    for (let k = 0; k < 4; k++) { const sp = new T.Mesh(new T.CylinderGeometry(.8, .8, 26, 8), body); sp.rotation.z = Math.PI / 2; sp.rotation.y = k * Math.PI / 4; rot.add(sp); }
    for (const s of [-1, 1]) { const arm = new T.Mesh(new T.CylinderGeometry(.6, .6, 30, 8), body); arm.position.y = s * 15; g.add(arm); const pn = new T.Mesh(new T.BoxGeometry(24, .3, 8), new T.MeshStandardMaterial({ map: panelT, roughness: .3, metalness: .5 })); pn.position.y = s * 30; g.add(pn); }
    const lights = []; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; lights.push(Math.cos(a) * 26, 0, Math.sin(a) * 26); } const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lights, 3)); rot.add(new T.Points(lg, new T.PointsMaterial({ color: '#2ee6ff', size: 4, map: DOT_TEX, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
    addTick(W, (dt) => { rot.rotation.y += dt * .25; g.rotation.y += dt * .03; }); }
  // balises lumineuses le long de la piste
  const posts = [], glow = { c: [], m: [] };
  for (let i = 0; i < S.N; i += 24) { if (S.glide[i] || nearBranchWin(W, i, 8)) continue; for (const sg of [-1, 1]) { const d = sg * (W.wallD + .8); const x = S.px[i] + S.rx[i] * d, z = S.pz[i] + S.rz[i] * d; posts.push({ x, z, y: S.py[i], s: 1, r: 0 }); (sg < 0 ? glow.c : glow.m).push(x, S.py[i] + 4.2, z); } }
  instanced(scene, [{ geo: new T.CylinderGeometry(.12, .18, 4, 8), mat: stdMat('#3a3a5a', .3, .8), off: tr(0, 2, 0) }, { geo: new T.OctahedronGeometry(.45, 0), mat: new T.MeshBasicMaterial({ color: '#ffffff' }), off: tr(0, 4.2, 0), colors: ['#2ee6ff', '#ff2fa8'] }], posts);
  glowPoints(W, glow.c, '#2ee6ff', 6); glowPoints(W, glow.m, '#ff2fa8', 6);
  // poussière d'étoiles qui défile
  addFireflies(W, '#bfe0ff', 260);
  addTick(W, (dt) => { field.rotation.y += dt * .004; });
}

/* ---------- textures de sol ---------- */
function groundTex8(kind) {
  if (kind === 'sakura') { const t = groundTex('grass'); const x = t.image.getContext('2d'); for (let i = 0; i < 900; i++) { x.fillStyle = pick(['rgba(255,190,215,.8)', 'rgba(255,220,235,.7)', 'rgba(255,160,200,.6)']); x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 512, rand(1.5, 3.5), rand(1, 2), rand(0, 3), 0, TAU); x.fill(); } t.needsUpdate = true; return t; }
  if (kind === 'savanna') { const nL = fbm(3, 4, 431), nF = tileNoise(128, 441); const a = rgb('#c8a050'), b = rgb('#e8c878'), c = rgb('#a88a40');
    return pixelTex(512, 512, (u, v) => { let col = mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)); col = mix3(col, c, clamp((nF(u, v) - .6) * 2, 0, 1) * .4); return mulc(col, .92 + nF(u, v) * .12); },
      (x, w, h) => { x.lineWidth = 1.3; for (let i = 0; i < 3000; i++) { const px = Math.random() * w, py = Math.random() * h, l = 3 + Math.random() * 7, dx = rand(-1.6, 1.6); x.strokeStyle = Math.random() < .5 ? 'rgba(150,110,40,.3)' : 'rgba(255,230,150,.3)'; wrapDraw(w, h, px, py, 10, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + dx, Y - l); x.stroke(); }); } }); }
  if (kind === 'fair') { const nL = fbm(3, 4, 451), nF = tileNoise(128, 461); const a = rgb('#1e3a2a'), b = rgb('#2a4a36');
    return pixelTex(512, 512, (u, v) => mulc(mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)), .9 + nF(u, v) * .16),
      (x, w, h) => { for (let i = 0; i < 900; i++) { x.fillStyle = pick(['#ff4f7a', '#ffc531', '#38b6ff', '#3ee08f', '#a87dff', '#fffdf7']); x.globalAlpha = .7; x.fillRect(Math.random() * w, Math.random() * h, rand(2, 4), rand(1.5, 3)); } x.globalAlpha = 1; }); }
  if (kind === 'space') { const nL = fbm(3, 4, 471); return pixelTex(256, 256, (u, v) => mulc([30, 20, 60], .6 + nL(u, v) * .8), (x, w, h) => { for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,255,255,' + rand(.3, .9) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1, 1); } }); }
  return null;
}

/* ---------- obstacles de ces mondes ---------- */
Object.assign(OBST_THEME, {
  sakura: { pillar: 'lantern', roll: 'daruma', walk: 'deer', kinds: ['rollers', 'pillars', 'walkers', 'pillars'] },
  safari: { pillar: 'termite', roll: 'boulder', walk: 'zebra', kinds: ['walkers', 'pillars', 'rollers', 'walkers'] },
  fair: { pillar: 'balloons', roll: 'beachball', walk: 'bumper', crush: 'piston', kinds: ['walkers', 'rollers', 'crushers', 'pillars'] },
  space: { pillar: 'crystal', roll: 'asteroid', walk: 'rover', crush: 'piston', kinds: ['rollers', 'crushers', 'pillars', 'walkers'] },
});
function obstMesh8(o, W) {
  const st = o.style, R = o.r, L = (c) => lam(c), S2 = (c, r = .45, m = .1) => stdMat(c, r, m);
  const g = new T.Group(); const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  if (o.kind === 'pillar' && st === 'lantern') { const s = L('#b8b4a8'); add(new T.CylinderGeometry(R * .9, R, R * .5, 8), s, 0, R * .25); add(new T.CylinderGeometry(R * .3, R * .35, R * 1.8, 8), s, 0, R * 1.4); add(new T.BoxGeometry(R * 1.5, R * 1.1, R * 1.5), new T.MeshLambertMaterial({ color: '#fff0c8', emissive: '#ffa040', emissiveIntensity: .7 }), 0, R * 2.8); add(new T.ConeGeometry(R * 1.4, R * .9, 4), s, 0, R * 3.8, 0, 0, Math.PI / 4); }
  else if (o.kind === 'pillar' && st === 'termite') { const m = add(new T.ConeGeometry(R, R * 3.4, 10, 3), L('#b0704a'), 0, R * 1.7); wobble(m.geometry, .12, 1.5, 4, true); m.geometry.computeVertexNormals(); add(new T.ConeGeometry(R * .45, R * 2, 8), L('#a0603a'), R * .7, R * 1, R * .3); }
  else if (o.kind === 'pillar' && st === 'balloons') { add(new T.CylinderGeometry(R * .6, R * .7, R * .8, 12), S2('#9aa0b0', .3, .7), 0, R * .4); for (let k = 0; k < 9; k++) { const c = pick(['#ff4f7a', '#ffc531', '#38b6ff', '#3ee08f', '#a87dff']); const a = k / 9 * TAU, r = k ? R * .55 : 0; add(new T.SphereGeometry(R * .42, 12, 10), S2(c, .2, .05), Math.cos(a) * r, R * 3 + (k % 3) * R * .4, Math.sin(a) * r).scale.y = 1.2; add(new T.CylinderGeometry(.02, .02, R * 2.6, 4), L('#fffdf7'), Math.cos(a) * r * .5, R * 1.9, Math.sin(a) * r * .5); } }
  else if (o.kind === 'roller' && (st === 'daruma' || st === 'beachball' || st === 'asteroid')) {
    const inner = new T.Group(); g.add(inner); g.userData.inner = inner; const ai = (geo, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; inner.add(m); return m; };
    if (st === 'daruma') { ai(new T.SphereGeometry(R, 22, 16), S2('#e2342a', .3, .05)); ai(new T.SphereGeometry(R * .55, 16, 12), L('#fff4e0'), 0, R * .25, R * .62).scale.z = .45; for (const s of [-1, 1]) ai(new T.SphereGeometry(R * .12, 10, 8), L('#17143a'), s * R * .22, R * .35, R * .9); ai(new T.TorusGeometry(R * .7, R * .06, 6, 24), stdMat('#ffc531', .3, .8), 0, -R * .2, 0).rotation.x = Math.PI / 2; }
    else if (st === 'beachball') { for (let k = 0; k < 6; k++) { const s = new T.SphereGeometry(R, 20, 14, k / 6 * TAU, TAU / 6); ai(s, S2(['#ff4f3a', '#ffc531', '#38b6ff', '#fffdf7', '#3ee08f', '#ff6fb5'][k], .25, .05)); } }
    else { const m = ai(smooth(wobble(new T.IcosahedronGeometry(R, 2), .22, 1.5, 7), 60), L('#5a5468')); void m; for (let k = 0; k < 5; k++) ai(new T.CircleGeometry(R * rand(.15, .3), 12), L('#3a3448'), 0, 0, 0); }
    g.rotation.y = o.P.hd[o.i];
  }
  else if (o.kind === 'walker' && st === 'deer') { const c = L('#b07a48'); add(new T.CapsuleGeometry(.45, 1.1, 6, 10), c, 0, 1.4, 0, 0, 0, Math.PI / 2); add(new T.CylinderGeometry(.16, .22, .9, 8), c, .7, 2.0, 0, 0, 0, -.5); add(new T.CapsuleGeometry(.2, .4, 4, 8), c, 1.0, 2.4, 0, 0, 0, Math.PI / 2);
    for (const [x, z] of [[-.5, .25], [-.5, -.25], [.5, .25], [.5, -.25]]) add(new T.CylinderGeometry(.07, .08, 1, 6), c, x, .5, z); for (let k = 0; k < 6; k++) add(new T.SphereGeometry(.09, 6, 5), L('#fff4e0'), rand(-.5, .5), 1.65, rand(-.3, .3)); for (const s of [-1, 1]) add(new T.CylinderGeometry(.03, .03, .6, 4), L('#5a3a22'), 1.05, 2.9, s * .15, s * .4, 0, 0); }
  else if (o.kind === 'walker' && st === 'zebra') { const w = new T.MeshLambertMaterial({ map: stripeTex('#f4f2ea', '#1b1b22', 10) }); add(new T.CapsuleGeometry(.5, 1.2, 6, 10), w, 0, 1.4, 0, 0, 0, Math.PI / 2); add(new T.CylinderGeometry(.18, .28, 1, 8), w, .9, 2.0, 0, 0, 0, -.6); add(new T.CapsuleGeometry(.2, .5, 4, 8), w, 1.3, 2.4, 0, 0, 0, Math.PI / 2 + .5);
    for (const [x, z] of [[-.6, .25], [-.6, -.25], [.6, .25], [.6, -.25]]) add(new T.CylinderGeometry(.09, .1, 1.1, 6), w, x, .55, z); }
  else if (o.kind === 'walker' && st === 'bumper') { const c = pick(['#ff4f7a', '#38b6ff', '#ffc531', '#3ee08f']); add(rbox(2.2, .8, 2.8, .35), S2(c, .3, .2), 0, .6); add(new T.TorusGeometry(1.25, .25, 8, 24), L('#22213a'), 0, .35, 0, Math.PI / 2); add(new T.CylinderGeometry(.04, .04, 3, 6), S2('#e9ecf4', .2, .9), 0, 2.2, -.9); add(new T.SphereGeometry(.4, 12, 10), L('#ffe0c0'), 0, 1.4, .1); }
  else return obstMesh(o, W);
  if (o.kind === 'pillar') { g.position.set(o.x, o.y, o.z); g.rotation.y = o.P.hd[o.i]; }
  return g;
}

function bumpSign() {
  if (!bumpSign.tex) bumpSign.tex = canvasTex(128, 112, (x, w, h) => { x.clearRect(0, 0, w, h); x.lineJoin = 'round'; x.fillStyle = '#ffffff'; x.strokeStyle = '#e8312a'; x.lineWidth = 12;
    x.beginPath(); x.moveTo(64, 10); x.lineTo(120, 104); x.lineTo(8, 104); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#17143a'; x.beginPath(); x.moveTo(30, 88); x.quadraticCurveTo(64, 40, 98, 88); x.closePath(); x.fill(); }, false);
  const g = new T.Group(); const pole = new T.Mesh(new T.CylinderGeometry(.12, .12, 3.2, 8), stdMat('#c8ccd8', .4, .6)); pole.position.y = 1.6; g.add(pole);
  const m = new T.Mesh(new T.PlaneGeometry(2, 1.75), new T.MeshBasicMaterial({ map: bumpSign.tex, transparent: true, side: T.DoubleSide, alphaTest: .4 })); m.position.y = 3.6; g.add(m); return g;
}
const GRASS9 = { lavender: ['#6aa84a', '#7cb854', '#5a9840'], autumn: ['#c8a040', '#b08a38', '#d8b450', '#8a9a3a'], antique: ['#a8a860', '#98985a', '#b8b070'], grass: ['#5fb046', '#74c04e', '#4e9a3c', '#8fcf58'], jungle: ['#3f9a3c', '#57b04a', '#2f8034'], moss: ['#3d7a52', '#4f8f5e', '#2e6a46'], sakura: ['#7ab85a', '#8cc862', '#a0d070'], savanna: ['#d8b860', '#c8a450', '#e4c878'], rock: ['#7a9a5a', '#8aaa62', '#6a8a50'], graveyard: ['#4a5a44', '#5a6a4c'], candy: ['#ff9ad0', '#9ae6b4', '#fff19a'] };
function buildGrass9(W) {
  const cols = GRASS9[W.th.ground]; if (!cols || W.th.underwater) return; const q = qual().decor; if (q < .3) return;
  if (!buildGrass9.tex) buildGrass9.tex = canvasTex(64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const bx = 6 + i * 6.5 + Math.random() * 3, top = 6 + Math.random() * 18, lean = (Math.random() - .5) * 16; x.fillStyle = 'rgba(255,255,255,' + (.8 + Math.random() * .2) + ')'; x.beginPath(); x.moveTo(bx - 3, h); x.quadraticCurveTo(bx + lean * .3, h * .5, bx + lean, top); x.quadraticCurveTo(bx + lean * .3 + 2, h * .55, bx + 3, h); x.fill(); } }, false);
  if (!buildGrass9.geo) { const a = new T.PlaneGeometry(1.8, 1.1); a.translate(0, .5, 0); const b = a.clone(); b.rotateY(Math.PI / 2); const c = a.clone(); c.rotateY(Math.PI / 4); const g = mergeGeos([a, b, c]); const p = g.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = .62 + .5 * clamp(p.getY(i) / 1.05, 0, 1); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; } g.setAttribute('color', new T.BufferAttribute(col, 3)); g.userData.keep = true; buildGrass9.geo = g; }
  const S = W.S, near = W.nearAll, out = [], n = Math.round(1700 * q); let guard = 0;
  while (out.length < n && guard++ < n * 8) { const i = Math.floor(Math.random() * S.N), sg = Math.random() < .5 ? -1 : 1, off = W.wallD + 1.2 + Math.pow(Math.random(), 1.7) * 55, j = (i + Math.floor(rand(-3, 3)) + S.N) % S.N;
    const x = S.px[j] + S.rx[j] * sg * off + rand(-2, 2), z = S.pz[j] + S.rz[j] * sg * off + rand(-2, 2); if (S.glide[j]) continue; if (near && near(x, z, 60).d < W.wallD + .8) continue; if (W.waterX != null && x > W.waterX - 8) continue;
    out.push({ x, z, y: W.hAt ? 0 : (W.th.groundY != null ? W.th.groundY : -.08), s: rand(.7, 1.35), r: rand(0, TAU), g: 1 }); }
  const mat = new T.MeshLambertMaterial({ map: buildGrass9.tex, alphaTest: .45, side: T.DoubleSide, vertexColors: true });
  instanced(W.scene, [{ geo: buildGrass9.geo, mat, colors: cols }], out);
}
/* ================= v10 : Coupe Horizon (Lavande, Automne, Lagon, Ruines antiques) ================= */
function groundTex10(kind) {
  const dots = (t, cols, n, rx = [1.5, 3.5], ry = [1, 2.2]) => { const x = t.image.getContext('2d'); for (let i = 0; i < n; i++) { x.fillStyle = pick(cols); x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 512, rand(rx[0], rx[1]), rand(ry[0], ry[1]), rand(0, 3), 0, TAU); x.fill(); } t.needsUpdate = true; return t; };
  if (kind === 'lavender') return dots(groundTex('grass'), ['rgba(150,110,230,.75)', 'rgba(180,140,240,.6)', 'rgba(255,230,120,.6)', 'rgba(255,255,255,.5)'], 700);
  if (kind === 'autumn') { const nL = fbm(3, 4, 611), nF = tileNoise(128, 621); const a = rgb('#8a8a3a'), b = rgb('#b8943e'), c = rgb('#6a7a32');
    return pixelTex(512, 512, (u, v) => { let col = mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)); col = mix3(col, c, clamp((nF(u, v) - .6) * 2, 0, 1) * .4); return mulc(col, .92 + nF(u, v) * .12); },
      (x, w, h) => { for (let i = 0; i < 1600; i++) { x.fillStyle = pick(['rgba(230,90,30,.8)', 'rgba(245,160,40,.8)', 'rgba(200,50,30,.7)', 'rgba(250,200,70,.75)', 'rgba(140,80,40,.6)']); const px = Math.random() * w, py = Math.random() * h, r = rand(2, 4.5), a2 = rand(0, 3);
        wrapDraw(w, h, px, py, 6, (X, Y) => { x.beginPath(); x.ellipse(X, Y, r, r * .55, a2, 0, TAU); x.fill(); }); } }); }
  if (kind === 'tropic') { const nL = fbm(3, 4, 631), nF = tileNoise(128, 641); const a = rgb('#f2dfae'), b = rgb('#fff0cc'), c = rgb('#e2c690');
    return pixelTex(512, 512, (u, v) => { let col = mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)); col = mix3(col, c, clamp((nF(u, v) - .55) * 2, 0, 1) * .5); return mulc(col, .95 + nF(u, v) * .08); },
      (x, w, h) => { for (let i = 0; i < 260; i++) { x.fillStyle = pick(['rgba(255,180,190,.8)', 'rgba(255,255,255,.85)', 'rgba(200,170,130,.6)']); x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, rand(1.5, 3), rand(1, 2), rand(0, 3), 0, TAU); x.fill(); } }); }
  if (kind === 'antique') { const nL = fbm(3, 4, 651), nF = tileNoise(128, 661); const a = rgb('#a8a060'), b = rgb('#c8b878'), c = rgb('#d8ccb0');
    return pixelTex(512, 512, (u, v) => { let col = mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1)); col = mix3(col, c, clamp((nF(u, v) - .62) * 2.4, 0, 1) * .6); return mulc(col, .93 + nF(u, v) * .12); },
      (x, w, h) => { x.lineWidth = 1.2; for (let i = 0; i < 2000; i++) { const px = Math.random() * w, py = Math.random() * h, l = 3 + Math.random() * 6, dx = rand(-1.5, 1.5); x.strokeStyle = Math.random() < .5 ? 'rgba(110,100,50,.3)' : 'rgba(240,230,170,.3)'; wrapDraw(w, h, px, py, 10, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + dx, Y - l); x.stroke(); }); } }); }
  return null;
}
Object.assign(OBST_THEME, {
  provence: { pillar: 'rock', roll: 'barrel', walk: 'sheep', kinds: ['walkers', 'pillars', 'rollers'] },
  autumn: { pillar: 'stump', roll: 'pumpkin', walk: 'deer', kinds: ['rollers', 'pillars', 'walkers'] },
  tropic: { pillar: 'sandcastle', roll: 'coconut', walk: 'crab', kinds: ['walkers', 'pillars', 'rollers'] },
  antique: { pillar: 'column', roll: 'boulder', walk: 'sheep', kinds: ['pillars', 'rollers', 'walkers'] },
});
function obstMesh10(o, W) {
  const st = o.style, R = o.r; const g = new T.Group();
  if (o.kind === 'roller' && (st === 'pumpkin' || st === 'coconut')) {
    const inner = new T.Group(); g.add(inner); g.userData.inner = inner; const ai = (geo, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; inner.add(m); return m; };
    if (st === 'pumpkin') { const pm = stdMat('#f07a1a', .45, .05); for (let k = 0; k < 8; k++) { const s = ai(new T.SphereGeometry(R * .62, 14, 12), pm, Math.cos(k / 8 * TAU) * R * .42, 0, Math.sin(k / 8 * TAU) * R * .42); s.scale.set(1, 1.25, 1); } ai(new T.CylinderGeometry(R * .1, R * .14, R * .5, 8), lam('#4a6a2a'), 0, R * .9, 0); }
    else { ai(smooth(wobble(new T.IcosahedronGeometry(R, 2), .08, 2, 5), 60), lam('#6a4528')); for (let k = 0; k < 3; k++) ai(new T.CircleGeometry(R * .14, 10), lam('#2a1a10'), Math.cos(k * 2.1) * R * .3, R * .25, R * .93); }
    g.rotation.y = o.P.hd[o.i]; return g;
  }
  if (o.kind === 'pillar' && st === 'column') {
    const mar = stdMat('#efe8da', .7, .02), add = (geo, y, rx = 0, rz = 0, x = 0) => { const m = new T.Mesh(geo, mar); m.position.set(x, y, 0); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
    add(new T.BoxGeometry(R * 2.3, R * .4, R * 2.3), R * .2); const h = R * rand(2.6, 4.2); const sh = new T.CylinderGeometry(R * .72, R * .8, h, 16, 1); add(sh, R * .4 + h / 2);
    const top = add(new T.CylinderGeometry(R * .9, R * .74, R * .5, 16), R * .4 + h + R * .1); top.rotation.z = rand(-.15, .15);
    const frag = add(new T.CylinderGeometry(R * .7, R * .7, R * 1.6, 14), R * .6, 0, Math.PI / 2, R * 1.4); frag.rotation.y = rand(-.6, .6);
    g.position.set(o.x, o.y, o.z); g.rotation.y = o.P.hd[o.i]; return g;
  }
  return obstMesh8(o, W);
}
// petits utilitaires de placement
function farFromRoad(W, x, z, d) { return !W.nearAll || W.nearAll(x, z, d + 10).d > W.wallD + d; }
function fieldRows(W, n, opts) {
  // rangées (lavande, tournesols, vignes) : n champs, chacun en rangées parallèles
  const out = [], S = W.S; let guard = 0;
  while (out.length < opts.max && guard++ < n * 40) {
    if (out.length && guard > n * 40) break;
    const i = Math.floor(Math.random() * S.N), sg = Math.random() < .5 ? -1 : 1, off = W.wallD + rand(opts.dMin, opts.dMax);
    const cx = S.px[i] + S.rx[i] * sg * off, cz = S.pz[i] + S.rz[i] * sg * off, a = S.hd[i] + rand(-.3, .3) + (Math.random() < .5 ? 0 : Math.PI / 2);
    const rows = Math.floor(rand(opts.rows[0], opts.rows[1])), len = rand(opts.len[0], opts.len[1]), fx = Math.sin(a), fz = Math.cos(a), rx = -fz, rz = fx;
    for (let r = 0; r < rows; r++) for (let t = -len / 2; t <= len / 2; t += opts.step) {
      const x = cx + rx * (r - rows / 2) * opts.gap + fx * t, z = cz + rz * (r - rows / 2) * opts.gap + fz * t;
      if (!farFromRoad(W, x, z, 3)) continue; if (W.waterX != null && x > W.waterX - 8) continue; out.push({ x, z, y: -.1, s: rand(.85, 1.15), r: a + rand(-.2, .2), g: 1 }); if (out.length >= opts.max) break; }
    if (--n <= 0) break;
  }
  return out;
}
function riverUnderGlide(W) {
  const { S, scene } = W, wt = waterTex(); W.waterTex = wt;
  for (const i of gapCenters(W)) { const base = S.py[i] - ((W.th.terrain && W.th.terrain.drop) || 22);
    const river = new T.Mesh(new T.PlaneGeometry(56, 300), new T.MeshStandardMaterial({ map: wt, color: '#9fe6ff', roughness: .1, metalness: .15, transparent: true, opacity: .92 })); river.rotation.x = -Math.PI / 2; river.rotation.z = -S.hd[i] + Math.PI / 2; river.position.set(S.px[i], base + 2.2, S.pz[i]); scene.add(river); }
}
function cypressParts() { const c = new T.CapsuleGeometry(.9, 6.5, 6, 12); c.scale(1, 1, 1); return [{ geo: decorGeo('ptrunk'), mat: lam('#5a4030'), off: tr(0, .8, 0) }, { geo: c, mat: lam('#ffffff'), off: tr(0, 5, 0), colors: ['#2f5a34', '#3a6a3c', '#28502e'] }]; }
function oliveParts(cols) { const t = new T.CylinderGeometry(.35, .55, 3.2, 8); t.translate(0, 1.6, 0); t.applyMatrix4(trs(0, 0, 0, 0, 0, .18)); return [{ geo: t, mat: lam('#6a5a48') }, { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: trs(.5, 4, 0, 0, 0, 0, 1.15), colors: cols }, { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: trs(-.9, 3.5, .6, 0, 0, 0, .85), colors: cols.slice().reverse() }]; }
function houseParts(wall, roof, shutter) {
  const r = new T.CylinderGeometry(0, 4.6, 2.2, 4, 1); r.rotateY(Math.PI / 4); r.scale(1.15, 1, .9);
  return [{ geo: new T.BoxGeometry(7, 3.6, 5.4), mat: lam('#ffffff'), off: tr(0, 1.8, 0), colors: wall }, { geo: r, mat: lam('#ffffff'), off: tr(0, 4.7, 0), colors: roof },
    { geo: new T.BoxGeometry(1.1, 1.3, .12), mat: lam(shutter), off: tr(-1.8, 2.2, 2.75) }, { geo: new T.BoxGeometry(1.1, 1.3, .12), mat: lam(shutter), off: tr(1.8, 2.2, 2.75) }, { geo: new T.BoxGeometry(1.2, 2, .12), mat: lam('#6a4a30'), off: tr(0, 1, 2.75) }];
}
function fallingLeaves(W, cols, n = 260, speed = 1.8) {
  const { scene } = W;
  for (const col of cols) { const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-60, 60); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); const p = new T.Points(g, new T.PointsMaterial({ color: col, size: .42, map: DOT_TEX, transparent: true, depthWrite: false, opacity: .95 })); p.frustumCulled = false; scene.add(p);
    addTick(W, (dt, now) => { for (let i = 0; i < n; i++) { pos[i * 3 + 1] -= dt * speed; pos[i * 3] += Math.sin(now * 1.1 + i) * dt * 2.2; pos[i * 3 + 2] += Math.cos(now * .8 + i * .7) * dt * 1.2; if (pos[i * 3 + 1] < -2) pos[i * 3 + 1] += 40; } g.attributes.position.needsUpdate = true; p.position.set(camera.position.x, camera.position.y - 14, camera.position.z); }); }
}

/* ---------- Champs de Lavande ---------- */
function buildProvence(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W;
  // champs de lavande en rangées
  const lav = fieldRows(W, Math.round(22 * q + 6), { max: Math.round(3400 * q + 600), dMin: 4, dMax: 90, rows: [8, 14], len: [30, 64], step: 1.6, gap: 2.9 });
  const lb = decorGeo('bush');
  instanced(scene, [{ geo: lb, mat: lam('#ffffff'), off: trs(0, .5, 0, 0, 0, 0, .78), colors: ['#8a5cd6', '#9b6be0', '#7a4cc8', '#a47de8', '#8e62dc'] }], lav);
  // tournesols
  const sun = fieldRows(W, Math.round(5 * q + 2), { max: Math.round(700 * q + 150), dMin: 10, dMax: 150, rows: [5, 9], len: [20, 40], step: 2, gap: 2.4 });
  const stem = new T.CylinderGeometry(.07, .09, 2.4, 6); stem.translate(0, 1.2, 0); const disc = new T.CylinderGeometry(.55, .55, .12, 12); disc.rotateX(Math.PI / 2 - .3); const ctr = new T.CylinderGeometry(.26, .26, .16, 10); ctr.rotateX(Math.PI / 2 - .3);
  instanced(scene, [{ geo: stem, mat: lam('#4a7a2a') }, { geo: disc, mat: lam('#ffc81a'), off: tr(0, 2.5, .08) }, { geo: ctr, mat: lam('#5a3a1a'), off: tr(0, 2.52, .14) }], sun);
  instanced(scene, cypressParts(), scatter(110 * q + 20, 5, 220, .8, 1.3));
  instanced(scene, oliveParts(['#8a9a6a', '#7a8a5a', '#9aaa78']), scatter(150 * q + 20, 5, 240, .8, 1.3));
  instanced(scene, houseParts(['#f0e0c0', '#ead6b0', '#f4e6cc'], ['#c8643a', '#b8553a', '#d0703e'], '#4a7ab0'), scatter(12, 22, 200, 1, 1.2));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .4, 0), colors: ['#c8bca8', '#b8ac98'] }], scatter(50 * q, 3, 180, .5, 1.3));
  const hills = ring(24, 260, 420).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(40, 90), sz: rand(90, 170) }));
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#7a9a5a', '#8aa868', '#9a8acb'] }], hills);
  riverUnderGlide(W);
  addFlock(W, wingGeo(.35), lam('#ffffff', { side: T.DoubleSide }), 6, 6, { anchors: anchorsOf(W, 12), yMin: 3, yMax: 8, rMin: 6, rMax: 14, colors: ['#ffe66a', '#fffdf7', '#c8a8ff'], flap: true });
  addClouds(W, ext, cx, cz, 12);
}

/* ---------- Forêt d'Automne ---------- */
function buildAutumn(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const fall = ['#e8542a', '#f08a24', '#f6c23a', '#c8341e', '#d86a1e', '#b8b83a', '#f4a83a'];
  instanced(scene, [{ geo: decorGeo('trunk'), mat: lam('#5a3a28'), off: tr(0, 2.2, 0) }, { geo: decorGeo('crown'), mat: lam('#ffffff'), off: tr(0, 6.2, 0), colors: fall }, { geo: decorGeo('crown2'), mat: lam('#ffffff'), off: tr(1.4, 5, .7), colors: fall.slice().reverse() }], scatter(380 * q + 40, 5, 280, .8, 1.5));
  instanced(scene, [{ geo: decorGeo('ptrunk'), mat: lam('#4a3020'), off: tr(0, 1, 0) }, { geo: decorGeo('pine1'), mat: lam('#ffffff'), off: tr(0, 3.6, 0), colors: ['#2f5a3a', '#3a6a40'] }, { geo: decorGeo('pine2'), mat: lam('#ffffff'), off: tr(0, 5.6, 0), colors: ['#3a6a40', '#2f5a3a'] }, { geo: decorGeo('pine3'), mat: lam('#ffffff'), off: tr(0, 7.3, 0), colors: ['#2f5a3a'] }], scatter(60 * q + 10, 6, 260, 1, 1.6));
  instanced(scene, [{ geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, .6, 0), colors: ['#c8541e', '#b8a03a', '#d8782a'] }], scatter(120 * q, 3, 150, .6, 1.2));
  // citrouilles et bottes de foin près de la route
  const pk = new T.SphereGeometry(.8, 14, 10); pk.scale(1, .72, 1);
  instanced(scene, [{ geo: pk, mat: lam('#ffffff'), off: tr(0, .55, 0), colors: ['#f07a1a', '#e86a14', '#f89a2a'] }, { geo: new T.CylinderGeometry(.07, .1, .4, 6), mat: lam('#4a6a2a'), off: tr(0, 1.2, 0) }], scatter(140 * q + 20, 1.5, 40, .7, 1.4));
  const hay = new T.CylinderGeometry(1.1, 1.1, 1.6, 16); hay.rotateZ(Math.PI / 2);
  instanced(scene, [{ geo: hay, mat: lam('#ffffff'), off: tr(0, 1.1, 0), colors: ['#e2c060', '#d8b450', '#ecca6a'] }], scatter(70 * q + 10, 3, 120, .9, 1.2));
  // granges rouges
  instanced(scene, houseParts(['#b8342a', '#a82e26', '#c23c2e'], ['#4a3a34', '#3a2e2a'], '#fff2d8'), scatter(9, 20, 200, 1.2, 1.5));
  // champignons
  instanced(scene, [{ geo: new T.CylinderGeometry(.18, .22, .6, 8), mat: lam('#fff2d8'), off: tr(0, .3, 0) }, { geo: new T.SphereGeometry(.5, 12, 8, 0, TAU, 0, Math.PI / 2), mat: lam('#ffffff'), off: tr(0, .55, 0), colors: ['#d8342a', '#c8a070'] }], scatter(80 * q, 2, 90, .7, 1.5));
  const hills = ring(24, 260, 420).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(45, 100), sz: rand(90, 170) }));
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#c8782a', '#b8902e', '#a8622a', '#8a8a34'] }], hills);
  fallingLeaves(W, ['#f08a24', '#d8452a', '#f6c23a'], Math.round(150 * q + 40));
  addFlock(W, wingGeo(.9), lam('#ffffff', { side: T.DoubleSide }), 4, 6, { anchors: anchorsOf(W, 8), yMin: 25, yMax: 45, rMin: 20, rMax: 36, colors: ['#4a4040', '#3a3434'], flap: true });
  addClouds(W, ext, cx, cz, 10);
}

/* ---------- Lagon Tropical ---------- */
function buildTropic(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const wt = waterTex(); W.waterTex = wt; const WY = -.5;
  const sea = new T.Mesh(new T.PlaneGeometry(5000, 5000), new T.MeshStandardMaterial({ map: wt, color: '#5ff0e0', roughness: .08, metalness: .2, transparent: true, opacity: .86 })); sea.rotation.x = -Math.PI / 2; sea.position.set(cx, WY, cz); scene.add(sea);
  const deep = new T.Mesh(new T.PlaneGeometry(5000, 5000), lam('#0f8aa8')); deep.rotation.x = -Math.PI / 2; deep.position.set(cx, WY - 5, cz); scene.add(deep);
  const dry = (list, m = WY + .7) => list.filter((p) => !W.hAt || W.hAt(p.x, p.z) > m);
  instanced(scene, palmParts('#8a6a4a', ['#3fae4a', '#4fbe56', '#2f9a3e', '#5acb60']), dry(scatter(240 * q + 30, 4, 240, .8, 1.35)));
  instanced(scene, [{ geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, .6, 0), colors: ['#3a9a40', '#ff6fa8', '#4aae48'] }], dry(scatter(140 * q, 3, 160, .6, 1.2)));
  // cabanes sur pilotis dans l'eau
  const huts = []; let guard = 0;
  while (huts.length < 16 && guard++ < 4000) { const a = rand(0, TAU), r = rand(30, ext + 160), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (W.hAt && W.hAt(x, z) > WY - 1.5) continue; if (!farFromRoad(W, x, z, 18)) continue; if (huts.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 400)) continue; huts.push({ x, z, y: WY, s: rand(.9, 1.2), r: rand(0, TAU) }); }
  const post = new T.CylinderGeometry(.18, .2, 4.5, 6); const roof = new T.ConeGeometry(4.4, 2.8, 4); roof.rotateY(Math.PI / 4);
  const hp = [[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z]) => ({ geo: post, mat: lam('#7a5a3a'), off: tr(x, -.5, z) }));
  instanced(scene, hp.concat([{ geo: new T.BoxGeometry(5.6, .3, 5.6), mat: lam('#a07a50'), off: tr(0, 1.8, 0) }, { geo: new T.BoxGeometry(4.4, 2.4, 4.4), mat: lam('#ffffff'), off: tr(0, 3.1, 0), colors: ['#e8d0a0', '#f0dcb0'] }, { geo: roof, mat: lam('#ffffff'), off: tr(0, 5.6, 0), colors: ['#d8b060', '#c8a050'] }]), huts);
  // pontons vers les cabanes
  instanced(scene, [{ geo: new T.BoxGeometry(1.4, .2, 10), mat: lam('#a07a50'), off: tr(0, 1.8, 7.5) }], huts);
  // voiliers
  const boats = []; guard = 0;
  while (boats.length < 8 && guard++ < 3000) { const a = rand(0, TAU), r = rand(60, ext + 260), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (W.hAt && W.hAt(x, z) > WY - 2) continue; if (!farFromRoad(W, x, z, 30)) continue; boats.push({ x, z, y: WY, s: rand(.9, 1.3), r: rand(0, TAU) }); }
  const hull = new T.CapsuleGeometry(1.1, 4.5, 4, 10); hull.rotateX(Math.PI / 2); hull.scale(1, .5, 1); const sail = new T.ConeGeometry(2.2, 7, 3); sail.scale(.15, 1, 1);
  instanced(scene, [{ geo: hull, mat: lam('#ffffff'), off: tr(0, .3, 0) }, { geo: new T.CylinderGeometry(.08, .08, 8, 5), mat: lam('#5a4a3a'), off: tr(0, 4.3, 0) }, { geo: sail, mat: lam('#ffffff'), off: tr(0, 4.6, -.9), colors: ['#fffdf7', '#ff6f5a', '#38b6ff'] }], boats);
  addTick(W, (dt, now) => { sea.position.y = WY + Math.sin(now * .6) * .08; });
  // parasols près de la route
  const um = dry(scatter(40 * q, 2, 30, .9, 1.1)); const top = new T.ConeGeometry(2, .8, 10); const pole = new T.CylinderGeometry(.06, .06, 2.6, 5);
  instanced(scene, [{ geo: pole, mat: lam('#f4f2ea'), off: tr(0, 1.3, 0) }, { geo: top, mat: lam('#ffffff'), off: tr(0, 2.7, 0), colors: ['#ff4f3a', '#ffc531', '#38b6ff', '#3ee08f'] }], um);
  addFlock(W, wingGeo(1), lam('#ffffff', { side: T.DoubleSide }), 5, 5, { anchors: anchorsOf(W, 10), yMin: 18, yMax: 34, rMin: 16, rMax: 30, colors: ['#ffffff', '#f0f0f0'], flap: true });
  addClouds(W, ext, cx, cz, 10);
}

/* ---------- Ruines Antiques ---------- */
function buildAntique(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const marble = ['#f2ede2', '#e8e0d0', '#f6f2ea'];
  // mer sur un côté
  let maxX = -Infinity; for (let i = 0; i < W.S.N; i++) maxX = Math.max(maxX, W.S.px[i]); for (const B of W.branches) for (let j = 0; j < B.N; j++) maxX = Math.max(maxX, B.px[j]);
  W.waterX = maxX + 70; const wt = waterTex(); W.waterTex = wt;
  const sea = new T.Mesh(new T.PlaneGeometry(3000, 4000), new T.MeshStandardMaterial({ map: wt, color: '#3a8ae0', roughness: .1, metalness: .2 })); sea.rotation.x = -Math.PI / 2; sea.position.set(W.waterX + 1500, (W.terrainMin || -20) + 6, cz); scene.add(sea);
  // temples
  const temples = scatter(4, 26, 170, 1, 1);
  for (const t of temples) { const g = new T.Group(), M = stdMat('#efe8da', .7, .02), y0 = hy(W, t.x, t.z, -.3); const w = rand(14, 20), d = w * 1.6, ruined = Math.random() < .6;
    for (let s = 0; s < 3; s++) { const b = new T.Mesh(new T.BoxGeometry(w + 3 - s * 1.2, .7, d + 3 - s * 1.2), M); b.position.y = .35 + s * .7; b.receiveShadow = true; g.add(b); }
    const col = new T.CylinderGeometry(.8, .9, 9, 14); const nx = 4, nz = 7;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) { if (a > 0 && a < nx - 1 && b > 0 && b < nz - 1) continue; if (ruined && Math.random() < .3) continue;
      const h = ruined && Math.random() < .35 ? rand(2, 7) : 9; const c = new T.Mesh(col, M); c.scale.y = h / 9; c.position.set(-w / 2 + 1.4 + a * (w - 2.8) / (nx - 1), 2.1 + h / 2, -d / 2 + 1.4 + b * (d - 2.8) / (nz - 1)); c.castShadow = true; g.add(c); }
    if (!ruined) { const top = new T.Mesh(new T.BoxGeometry(w, 1.4, d), M); top.position.y = 11.3; g.add(top); const ped = new T.Mesh(new T.CylinderGeometry(w * .62, w * .62, d, 3, 1), M); ped.rotation.x = Math.PI / 2; ped.rotation.z = Math.PI / 2; ped.scale.set(1, 1, .32); ped.position.y = 13.2; g.add(ped); }
    else for (let k = 0; k < 3; k++) { const c = new T.Mesh(col, M); c.rotation.z = Math.PI / 2; c.rotation.y = rand(0, TAU); c.position.set(rand(-w, w), 1, rand(-d / 2, d / 2) + d * .7); g.add(c); }
    g.position.set(t.x, y0, t.z); g.rotation.y = t.r; scene.add(g); }
  // colonnes isolées et fragments
  const colG = new T.CylinderGeometry(.7, .8, 1, 12); colG.translate(0, .5, 0);
  const cps = scatter(70 * q + 10, 3, 160, 1, 1);
  instanced(scene, [{ geo: new T.BoxGeometry(2, .5, 2), mat: lam('#ffffff'), off: tr(0, .25, 0), colors: marble }], cps);
  instanced(scene, [{ geo: colG, mat: lam('#ffffff'), colors: marble, off: trs(0, .5, 0) }], cps.map((p) => Object.assign({}, p, { sx: 1, sz: 1, sy: rand(1.5, 6) })));
  // amphithéâtre
  const am = scatter(1, 40, 180, 1, 1)[0];
  if (am) { const seats = [], y0 = hy(W, am.x, am.z, -.5); for (let k = 0; k < 9; k++) { const r = 16 + k * 3; for (let a = 0; a <= 20; a++) { const ang = am.r + Math.PI * (a / 20); seats.push({ x: am.x + Math.cos(ang) * r, z: am.z + Math.sin(ang) * r, y: y0 + k * 1.1, s: 1, r: -ang }); } }
    instanced(scene, [{ geo: new T.BoxGeometry(5, 1.1 * 2, 3), mat: lam('#ffffff'), off: tr(0, 0, 0), colors: ['#e8dcc8', '#dcd0b8'] }], seats); }
  instanced(scene, oliveParts(['#8a9a6a', '#7a8a5a', '#9aaa78']), scatter(170 * q + 20, 5, 240, .8, 1.3));
  instanced(scene, cypressParts(), scatter(90 * q + 10, 5, 220, .8, 1.3));
  instanced(scene, [{ geo: decorGeo('rock'), mat: lam('#ffffff'), off: tr(0, .4, 0), colors: ['#d8d0c0', '#c8bea8'] }], scatter(60 * q, 3, 200, .6, 1.6));
  instanced(scene, [{ geo: decorGeo('drybush'), mat: lam('#ffffff'), off: tr(0, .5, 0), colors: ['#8a8a48', '#a09a58'] }], scatter(110 * q, 2, 140, .6, 1.2));
  const hills = ring(22, 260, 420).filter((p) => p.x < W.waterX).map((p) => Object.assign(p, { sx: rand(90, 170), sy: rand(45, 100), sz: rand(90, 170) }));
  instanced(scene, [{ geo: decorGeo('hill'), mat: lam('#ffffff'), colors: ['#a8a060', '#98905a', '#b8ac70'] }], hills);
  addFlock(W, wingGeo(1), lam('#ffffff', { side: T.DoubleSide }), 4, 5, { anchors: anchorsOf(W, 8), yMin: 22, yMax: 40, rMin: 18, rMax: 34, colors: ['#ffffff', '#e8e8e8'], flap: true });
  addClouds(W, ext, cx, cz, 10);
}

/* ================= v11 : embranchements sans trou (nez de séparation) ================= */
// Avant : entre la route et un raccourci, murs et vibreurs étaient ouverts sur toute la fenêtre → zone en « V »
// où l'on roulait au-dessus du vide. Maintenant : tant que les deux routes se chevauchent, passage libre ;
// dès qu'elles se séparent, un muret de séparation (« nez ») suit la bissectrice jusqu'aux murs normaux.
function computeGore(W) {
  const S = W.S, N = S.N, hw = W.hw; S.gore = new Float32Array(N); S.openPre = new Uint8Array(N); W.gores = [];
  for (const B of W.branches) {
    const s = B.side; B.gore = new Float32Array(B.N); B.noseA = 0; B.noseB = B.N - 1;
    const map = new Int32Array(B.N), dl = new Float32Array(B.N);
    let guess = B.i0;
    for (let j = 0; j < B.N; j++) { const [mi] = nearestOn(S, B.px[j], B.pz[j], j === 0 ? B.i0 : guess, j === 0 ? 30 : 12); guess = mi; map[j] = mi;
      dl[j] = ((B.px[j] - S.px[mi]) * S.rx[mi] + (B.pz[j] - S.pz[mi]) * S.rz[mi]) * s; }
    const sep = (j) => dl[j] - B.hw > hw + .8;
    B.dl = dl; B.map = map; const out = (j) => dl[j] + B.hw > hw + .05;
    let cA = 0; while (cA < B.N - 1 && !out(cA)) cA++; let cB = B.N - 1; while (cB > 0 && !out(cB)) cB--; B.crossA = cA; B.crossB = cB;
    // côté départ
    let nA = 0; while (nA < B.jA + 4 && !sep(nA)) nA++; B.noseA = nA;
    let nB = B.N - 1; while (nB > B.jB - 4 && !sep(nB)) nB--; B.noseB = nB;
    const fill = (j0, j1, step) => {
      const pts = []; let lastMi = -1, lastG = 0;
      for (let j = j0; step > 0 ? j <= j1 : j >= j1; j += step) {
        const mi = map[j], gM = (hw + dl[j] - B.hw) / 2, gB = dl[j] - gM;
        B.gore[j] = gB - 1.15;
        if (lastMi >= 0) { const n = ((mi - lastMi) % N + N) % N; const k2 = n > N / 2 ? 0 : n; for (let q = 1; q <= k2; q++) { const ii = (lastMi + q) % N; S.gore[ii] = Math.max(S.gore[ii], lerp(lastG, gM, q / k2) - 1.15); } }
        else S.gore[mi] = Math.max(S.gore[mi], gM - 1.15);
        lastMi = mi; lastG = gM;
        { const os = -s; pts.push([B.px[j] + B.rx[j] * os * gB, lerp(S.py[mi], B.py[j], .5), B.pz[j] + B.rz[j] * os * gB]); }
      }
      return pts;
    };
    W.gores.push({ B, pts: fill(nA, Math.min(B.N - 1, B.jA + 4), 1), nose: 'A' });
    W.gores.push({ B, pts: fill(nB, Math.max(0, B.jB - 4), -1).reverse(), nose: 'B' });
    // zone de chevauchement (avant le nez) : vibreurs de la route principale retirés
    { const st = map[cA], span = ((map[nA] - st) % N + N) % N; for (let q = 0; q <= (span > N / 2 ? 0 : span); q++) S.openPre[(st + q) % N] = 1; }
    { const en = map[cB], span = ((en - map[nB]) % N + N) % N; for (let q = 0; q <= (span > N / 2 ? 0 : span); q++) S.openPre[(map[nB] + q) % N] = 1; }
  }
}
const GORE_TEX = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#17143a' : '#ffc531'; x.beginPath(); x.moveTo(i * 24 - 12, h); x.lineTo(i * 24 + 12, 0); x.lineTo(i * 24 + 36, 0); x.lineTo(i * 24 + 12, h); x.fill(); } x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(0, 0, w, 6); });
function buildGores(W, mats) {
  const { scene, S, hw } = W;
  const gm = new T.MeshStandardMaterial({ map: GORE_TEX, roughness: .5, side: T.DoubleSide });
  for (const G2 of W.gores) {
    const p = G2.pts; if (p.length < 2) continue; const off = G2.B.offroad;
    const pos = [], uv = [], idx = []; let L = 0;
    for (let k = 0; k < p.length; k++) { if (k) L += Math.hypot(p[k][0] - p[k - 1][0], p[k][2] - p[k - 1][2]);
      pos.push(p[k][0], p[k][1] + .05, p[k][2], p[k][0], p[k][1] + (off ? .65 : 1.15), p[k][2]); uv.push(L / 6, 0, L / 6, 1);
      if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    scene.add(new T.Mesh(g, off ? mats.fence : mats.wall));
    // sol entre les deux routes, à hauteur de route, jusqu'au muret
    // + coussin d'absorption jaune et noir au nez
    const n = G2.nose === 'A' ? p[0] : p[p.length - 1];
    const cush = new T.Mesh(new T.CylinderGeometry(1.1, 1.2, 1.4, 16), gm); cush.position.set(n[0], n[1] + .7, n[2]); scene.add(cush);
    const cap = new T.Mesh(new T.SphereGeometry(1.1, 16, 8, 0, TAU, 0, Math.PI / 2), stdMat('#ffc531', .4, .1)); cap.position.set(n[0], n[1] + 1.4, n[2]); scene.add(cap);
  }
}

// chemin de terre lisible : deux ornières, cailloux, bords herbeux qui se fondent
const DIRT_TEX = (() => { const nL = fbm(4, 4, 711), nF = tileNoise(64, 721); const a = rgb('#8a6440'), b = rgb('#a87c50'), c = rgb('#6a4a2e'), g = rgb('#5a8a3a');
  return pixelTex(256, 512, (u, v) => { let col = mix3(a, b, clamp((nL(u, v) - .3) * 1.8, 0, 1));
    for (const r of [.3, .7]) { const d = Math.abs(u - r); if (d < .07) col = mix3(col, c, (1 - d / .07) * .6); }
    const e = Math.min(u, 1 - u); if (e < .12) col = mix3(g, col, smoothstep(.02, .12, e + (nF(u, v) - .5) * .06));
    return mulc(col, .9 + nF(u, v) * .16); },
    (x, w, h) => { for (let i = 0; i < 260; i++) { x.fillStyle = pick(['rgba(200,190,170,.8)', 'rgba(120,100,80,.7)', 'rgba(230,220,200,.6)']); x.beginPath(); x.ellipse(w * rand(.12, .88), Math.random() * h, rand(1, 2.6), rand(.8, 2), rand(0, 3), 0, TAU); x.fill(); } }); })();
SHARED.add(DIRT_TEX);
// bande d'un embranchement découpée au bord de la route principale (pas de surfaces superposées)
function branchBand(B, hwMain, cols, y, uvMode) {
  // cols : [far, near] décalages "naturels" (unités : côté opposé à la route principale = négatif)
  const N = B.N, openS = -B.side, pos = [], uv = [], idx = []; let k = 0, open = false, v = 0;
  for (let j = 0; j < N; j++) {
    const lim = B.dl[j] - hwMain; // distance (côté route principale) du bord principal au centre du raccourci
    let far = cols[0], near = Math.min(cols[1], lim);
    const inMouth = j < B.noseA || j > B.noseB; if (!inMouth) near = cols[1];
    const ok = near - far > .05;
    if (j) v += B.seg;
    if (!ok) { open = false; continue; }
    for (const [o, u] of [[far, 0], [near, 1]]) { const oo = o * openS, x = B.px[j] + B.rx[j] * oo, z = B.pz[j] + B.rz[j] * oo; pos.push(x, B.py[j] + y, z); uv.push(uvMode === 'world' ? x / 40 : (o - cols[0]) / (cols[1] - cols[0]), uvMode === 'world' ? -z / 40 : v / (uvMode || 24)); }
    if (open) { const a2 = (k - 1) * 2; idx.push(a2, a2 + 2, a2 + 1, a2 + 1, a2 + 2, a2 + 3); }
    open = true; k++;
  }
  // orientation : la face doit regarder vers le haut quel que soit le côté du raccourci
  if (idx.length >= 3) { const P = (q) => [pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]]; let ny = 0; for (let t = 0; t < idx.length; t += 3) { const A = P(idx[t]), B2 = P(idx[t + 1]), C = P(idx[t + 2]); ny += (B2[2] - A[2]) * (C[0] - A[0]) - (B2[0] - A[0]) * (C[2] - A[2]); }
    if (ny < 0) for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function buildBranchGeo2(W, B, mats) {
  if (B.def.open && !B.nowall) { B.nowall = new Uint8Array(B.N); for (let j = Math.max(0, B.noseA + 6); j <= Math.min(B.N - 1, B.noseB - 6); j++) B.nowall[j] = 3; }
  const { scene, curbW, th } = W, hw = B.hw, wD = B.wallD, S = W.S, H = W.hw; const OFF = B.offroad;
  const nearMain = (j) => j <= B.jA + 2 || j >= B.jB - 2, mouth = (j) => j < B.noseA || j > B.noseB, outside = (j) => j >= B.crossA && j <= B.crossB;
  const openS = -B.side; // côté qui fait face à la route principale (repère du raccourci)
  // accotements : côté extérieur seulement hors de la route principale ; côté intérieur après le nez
  const shN = openS > 0 ? [{ o: hw + curbW - .05, y: .07 }, { o: wD, y: .07 }] : [{ o: -wD, y: .07 }, { o: -hw - curbW + .05, y: .07 }];
  const shF = openS > 0 ? [{ o: -wD, y: .07 }, { o: -hw - curbW + .05, y: .07 }] : [{ o: hw + curbW - .05, y: .07 }, { o: wD, y: .07 }];
  scene.add(new T.Mesh(bandGeo(B, shN, { world: true, skip: (j) => mouth(j) }), mats.shoulder));
  scene.add(new T.Mesh(bandGeo(B, shF, { world: true, skip: (j) => !outside(j) || B.dl[j] + hw + curbW < H + curbW + 1 }), mats.shoulder));
  // chaussée découpée au bord de la route principale
  const roadMat = OFF ? mats.path : mats.road; if (W.roles) W.roles.set(roadMat, 'road');
  scene.add(new T.Mesh(branchBand(B, H, [-(hw + (OFF ? curbW : 0)), hw + (OFF ? curbW : 0)], OFF ? .112 : .115, OFF ? 16 : 24), roadMat));
  if (!OFF) {
    const cf = openS > 0 ? [{ o: -hw - curbW, y: .09 }, { o: -hw - curbW * .5, y: .21 }, { o: -hw, y: .12 }] : [{ o: hw, y: .12 }, { o: hw + curbW * .5, y: .21 }, { o: hw + curbW, y: .09 }];
    const cn = openS > 0 ? [{ o: hw, y: .12 }, { o: hw + curbW * .5, y: .21 }, { o: hw + curbW, y: .09 }] : [{ o: -hw - curbW, y: .09 }, { o: -hw - curbW * .5, y: .21 }, { o: -hw, y: .12 }];
    scene.add(new T.Mesh(bandGeo(B, cf, { vScale: 6, skip: (j) => !outside(j) }), mats.curb));
    scene.add(new T.Mesh(bandGeo(B, cn, { vScale: 6, skip: (j) => mouth(j) }), mats.curb));
  }
  for (const sgn of [-1, 1]) {
    const d = sgn * wD, inner = sgn === openS, sk0 = (j) => inner ? nearMain(j) : !outside(j) || B.dl[j] + wD < W.wallD, sk = (j) => sk0(j) || !!(B.nowall && B.nowall[j]);
    scene.add(new T.Mesh(bandGeo(B, [{ o: d, y: .07 }, { o: d, y: OFF ? .62 : 1.12 }], { vScale: 8, skip: sk }), OFF ? mats.fence : mats.wall));
    scene.add(new T.Mesh(tubeAlong(B, d, OFF ? .68 : 1.2, OFF ? .1 : .14, 8, 2, sk), OFF ? mats.fenceRail : mats.rail));
    if (OFF) { const posts = []; for (let j = 0; j < B.N; j += 2) { if (sk(j)) continue; posts.push({ x: B.px[j] + B.rx[j] * d, z: B.pz[j] + B.rz[j] * d, y: B.py[j], s: 1, r: B.hd[j] }); }
      const pg = new T.CylinderGeometry(.11, .13, 1.05, 6); pg.translate(0, .5, 0); instanced(scene, [{ geo: pg, mat: mats.fenceRail }], posts); }
    if (th.terrain) scene.add(new T.Mesh(sgn > 0 ? bandGeo(B, [{ o: d, y: .07 }, { o: d + 7, y: -5 }], { world: true, skip: sk0 }) : bandGeo(B, [{ o: d - 7, y: -5 }, { o: d, y: .07 }], { world: true, skip: sk0 }), mats.shoulder));
    else scene.add(new T.Mesh(bandGeo(B, [th.skirtDepth ? { o: d, y: -th.skirtDepth } : { o: d, y: th.groundY != null ? th.groundY : -1, abs: true }, { o: d, y: .07 }], { vScale: 10, skip: sk0 }), mats.skirt));
  }
  const jm = Math.floor(B.N * .5);
  if (!OFF) for (const f of [-.45, 0, .45]) { const x = B.px[jm] + B.rx[jm] * f * hw, z = B.pz[jm] + B.rz[jm] * f * hw; W.addBox(x, z, B.py[jm]); }
  if (B.def.boost) { const jb = Math.floor(B.N * .3); scene.add(new T.Mesh(quadAt(B, jb, 0, 2.6, 4.5, .16), mats.pad)); W.pads.push({ i: jb, lat: 0, P: B }); }
  if (B.def.tunnel) tunnelOn(W, B, [[B.jA + 6, B.jB - 6]], B.def.tunnel); if (B.def.tunnel === 'aqua') aquaExtras(W, B, B.jA + 6, B.jB - 6);
  // panneau sur deux pieds, posé au sol, bien à l'écart de la route
  if (B.def.secret) return;
  const si = ((B.i0 - 34) % S.N + S.N) % S.N, dd = B.side * (W.wallD + 2.2), gy = S.py[si];
  const sx = S.px[si] + S.rx[si] * dd, sz = S.pz[si] + S.rz[si] * dd, by = Math.max(gy, CUR_HAT ? CUR_HAT(sx, sz) : gy);
  const sign = new T.Mesh(new T.PlaneGeometry(5, 1.8), new T.MeshBasicMaterial({ map: branchSignTex(B.def.label || (B.def.tunnel ? 'RACCOURCI' : 'AUTRE ROUTE'), B.side), side: T.DoubleSide })); if (OFF) sign.material.color.set('#ffd9a0');
  sign.position.set(sx, by + 3.2, sz); sign.rotation.y = S.hd[si] + Math.PI; scene.add(sign);
  for (const o of [-2.1, 2.1]) { const post = new T.Mesh(new T.CylinderGeometry(.1, .1, 4.2, 8), stdMat('#e9ecf4', .3, .7)); post.position.set(sx + S.fx[si] * 0 + Math.cos(S.hd[si]) * o, by + 1.6, sz - Math.sin(S.hd[si]) * o); scene.add(post); }
}
// plaques turbo, boîtes et dos d'âne : jamais dans une jonction
function clearOfJunctions(W, t) { const S = W.S, N = S.N; let i = Math.floor(t * N); for (let k = 0; k < 80; k++) { const bad = W.branches.some((B) => inWin(i, [B.winA[0] - 10, B.winA[1] + 10]) || inWin(i, [B.winB[0] - 10, B.winB[1] + 10])); if (!bad) return i / N; i = (i + 3) % N; } return t; }

/* ================= v11 : moteur étendu ================= */
// ---------- anti-gravité : la piste se tord (inclinaisons, murs, loopings) ----------
// La physique reste sur la piste « dépliée » (2D) ; le rendu replie la piste selon un repère local par échantillon.
// def.warp : [{ from, to, type: 'loop', r } | { from, to, type: 'wall' | 'bank', angle (degrés), side: 1|-1, lift }]
function buildWarp(S, def, hw) {
  const N = S.N; if (!def.warp || !def.warp.length) return;
  const wo = new Float32Array(N * 3), wr = new Float32Array(N * 3), wu = new Float32Array(N * 3), wf = new Float32Array(N * 3), roll = new Float32Array(N); S.wz = new Uint8Array(N); S.wscale = new Float32Array(N).fill(1); S.ag = new Uint8Array(N);
  for (let i = 0; i < N; i++) { wo[i * 3] = S.px[i]; wo[i * 3 + 1] = S.py[i]; wo[i * 3 + 2] = S.pz[i]; }
  for (const z of def.warp) {
    const i0 = Math.floor(z.from * N), i1 = Math.floor(z.to * N), n = Math.max(2, i1 - i0); z.i0 = i0; z.i1 = i1;
    if (z.type === 'loop') {
      const F0 = [S.fx[i0 % N], 0, S.fz[i0 % N]], r = z.r || 18;
      for (let q = 0; q <= n; q++) { const i = (i0 + q) % N, th = TAU * q / n, dy = r * (1 - Math.cos(th)), df = r * Math.sin(th);
        wo[i * 3] += F0[0] * df; wo[i * 3 + 1] += dy; wo[i * 3 + 2] += F0[2] * df; S.wz[i] = 1; S.ag[i] = 1; }
    } else if (z.type === 'spiral') {
      // tire-bouchon : la route fait un tour complet sur elle-même (on roule la tête en bas au milieu)
      const turns = z.turns || 1, sd = z.side || 1, R0 = hw * .6 + 3;
      for (let q = 0; q <= n; q++) { const i = (i0 + q) % N, u = q / n, e = smoothstep(0, 1, u), a = TAU * turns * e * sd;
        roll[i] = a; wo[i * 3 + 1] += Math.max((1 - Math.cos(a)) * R0, Math.abs(Math.sin(a)) * hw + .5 * Math.min(1, u * 8, (1 - u) * 8)) + (z.rise || 0) * Math.sin(Math.PI * u); S.wz[i] = 1; S.ag[i] = 1; }
    } else {
      const A = (z.angle || 60) * DEG * (z.side || 1), lift = z.lift != null ? z.lift : 1;
      for (let q = 0; q <= n; q++) { const i = (i0 + q) % N, u = q / n, ramp = u < .25 ? smoothstep(0, .25, u) : u > .75 ? 1 - smoothstep(.75, 1, u) : 1;
        roll[i] = A * ramp; wo[i * 3 + 1] += Math.abs(Math.sin(roll[i])) * hw * lift + (z.rise || 0) * ramp; S.wz[i] = 1; if (Math.abs(A) > 40 * DEG) S.ag[i] = 1; }
    }
  }
  // repères : tangente par différences finies, droite = horizontale orthogonalisée, puis roulis
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N, p = (i - 1 + N) % N; let fx = wo[n * 3] - wo[p * 3], fy = wo[n * 3 + 1] - wo[p * 3 + 1], fz = wo[n * 3 + 2] - wo[p * 3 + 2]; const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    let rx = S.rx[i], ry = 0, rz = S.rz[i]; const d = rx * fx + ry * fy + rz * fz; rx -= fx * d; ry -= fy * d; rz -= fz * d; const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    if (roll[i]) { const c = Math.cos(roll[i]), s = Math.sin(roll[i]); const nrx = rx * c + ux * s, nry = ry * c + uy * s, nrz = rz * c + uz * s; ux = ux * c - rx * s; uy = uy * c - ry * s; uz = uz * c - rz * s; rx = nrx; ry = nry; rz = nrz; }
    wr[i * 3] = rx; wr[i * 3 + 1] = ry; wr[i * 3 + 2] = rz; wu[i * 3] = ux; wu[i * 3 + 1] = uy; wu[i * 3 + 2] = uz; wf[i * 3] = fx; wf[i * 3 + 1] = fy; wf[i * 3 + 2] = fz;
    if (S.wz[i]) { const vis = fl, phys = Math.hypot(S.px[n] - S.px[p], S.pz[n] - S.pz[p], S.py[n] - S.py[p]) || vis; S.wscale[i] = clamp(phys / vis, .15, 1); }
  }
  // lissage léger de l'échelle de vitesse
  const sc = S.wscale.slice(); for (let i = 0; i < N; i++) { let a = 0; for (let o = -3; o <= 3; o++) a += sc[((i + o) % N + N) % N]; S.wscale[i] = a / 7; }
  Object.assign(S, { wo, wr, wu, wf });
}
const _wv = new T.Vector3(), _wm = new T.Matrix4(), _wq = new T.Quaternion(), _we = new T.Euler(), _wx = new T.Vector3(), _wy = new T.Vector3(), _wzv = new T.Vector3();
function warpAt(S, i, lat, h, out) { const k = i * 3; out.set(S.wo[k] + S.wr[k] * lat + S.wu[k] * h, S.wo[k + 1] + S.wr[k + 1] * lat + S.wu[k + 1] * h, S.wo[k + 2] + S.wr[k + 2] * lat + S.wu[k + 2] * h); return out; }
function warpFrameQuat(S, i, yawRel, extraRoll, out) {
  const k = i * 3; _wy.set(S.wu[k], S.wu[k + 1], S.wu[k + 2]); _wzv.set(S.wf[k], S.wf[k + 1], S.wf[k + 2]); _wx.crossVectors(_wy, _wzv).normalize();
  _wm.makeBasis(_wx, _wy, _wzv); out.setFromRotationMatrix(_wm); _we.set(0, yawRel, extraRoll || 0); _wq.setFromEuler(_we); return out.multiply(_wq);
}
function inWarp(k) { const S = G.W && G.W.S; return !!(S && S.wz && (k.P || S) === S && S.wz[clamp(k.idx, 0, S.N - 1)]); }
// objet posé (flaque, mine, fusée) dans une zone tordue : on le replie aussi
function warpObject(m, x, y, z) {
  const S = G.W && G.W.S; if (!S || !S.wz) return; let best = -1, bd = 1e9;
  for (let i = 0; i < S.N; i += 2) { if (!S.wz[i]) continue; const d = (x - S.px[i]) ** 2 + (z - S.pz[i]) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best < 0 || bd > (G.W.wallD + 2) ** 2) return; const lat = (x - S.px[best]) * S.rx[best] + (z - S.pz[best]) * S.rz[best];
  warpAt(S, best, lat, y - S.py[best], m.position); warpFrameQuat(S, best, 0, 0, m.quaternion);
}
function warpNoDecor(W) { const S = W.S; if (!S.wz) return; for (let i = 0; i < S.N; i += 6) if (S.wz[i]) { const k = i * 3; W.noDecor.push({ x: S.wo[k], z: S.wo[k + 2], r: W.wallD + 14 }); W.noDecor.push({ x: S.px[i], z: S.pz[i], r: W.wallD + 8 }); } }
// bandes lumineuses bleues le long des zones anti-gravité
function buildWarpGlow(W) {
  const S = W.S; if (!S.ag) return; const m = new T.MeshBasicMaterial({ color: '#5ff2ff', transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  for (const sg of [-1, 1]) W.scene.add(new T.Mesh(bandGeo(S, sg > 0 ? [{ o: W.hw - 1.1, y: .13 }, { o: W.hw - .5, y: .13 }] : [{ o: -W.hw + .5, y: .13 }, { o: -W.hw + 1.1, y: .13 }], { skip: (i) => !S.ag[i] || !S.ag[(i + 1) % S.N] }), m));
  const dash = new T.MeshBasicMaterial({ color: '#b8f8ff', transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  W.scene.add(new T.Mesh(bandGeo(S, [{ o: -.35, y: .13 }, { o: .35, y: .13 }], { skip: (i) => !S.ag[i] || (i >> 2) % 2 === 0 }), dash));
}

// ---------- graine de course : placements aléatoires (identiques pour tous en ligne) ----------
function seedHash(str, seed) { let h = (seed >>> 0) ^ 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function itemPlan(W) {
  // pour chaque emplacement prévu : petit décalage + motif de boîtes tirés au sort
  const S = W.S, N = S.N, rng = seeded(seedHash(W.def.id + ':items', RACE_OPTS.seed || 1)), out = [];
  const PAT = [[[-.55, 0], [-.18, 0], [.18, 0], [.55, 0]], [[-.62, 0], [-.21, 0], [.21, 0], [.62, 0]], [[-.5, 0], [0, 0], [.5, 0], [-.25, 5], [.25, 5]], [[-.6, 0], [-.2, 4], [.2, 0], [.6, 4]], [[-.3, 0], [.3, 0], [0, 6], [-.65, 6], [.65, 6]]];
  const bad = (i) => (S.wz && S.wz[i]) || S.glide[i] || W.branches.some((B) => inWin(i, [B.winA[0] - 10, B.winA[1] + 10]) || inWin(i, [B.winB[0] - 10, B.winB[1] + 10])) || (W.bumps || []).some((b) => Math.abs(b.i - i) < 14);
  for (const t0 of W.def.items) { let i = Math.floor(((t0 + (rng() - .5) * .05) % 1 + 1) % 1 * N); for (let k = 0; k < 90 && bad(i); k++) i = (i + 3) % N; out.push({ i, pat: PAT[Math.floor(rng() * PAT.length)] }); }
  return out;
}

// ---------- environnement : chaque milieu change la conduite ----------
const ENVS = {
  ice: { name: 'Glace', grip: .5, turn: .9, accel: .9, vmax: 1, grav: 1 },
  snow: { name: 'Neige', grip: .72, turn: .95, accel: .95, vmax: .99, grav: 1 },
  sand: { name: 'Sable', grip: .85, turn: 1, accel: .9, vmax: .98, grav: 1, offK: .9 },
  water: { name: 'Sous l\'eau', grip: .8, turn: .86, accel: .8, vmax: .9, grav: .42, drag: true },
  wind: { name: 'Vent', grip: 1, turn: 1, accel: 1, vmax: 1, grav: 1, wind: 5.5 },
  space: { name: 'Gravité faible', grip: .9, turn: 1, accel: 1, vmax: 1.02, grav: .55 },
  lava: { name: 'Chaleur', grip: .95, turn: 1, accel: 1, vmax: 1, grav: 1 },
};
function envFor(def) { const th = def.theme; if (th.env) return ENVS[th.env] || null;
  if (th.underwater) return ENVS.water; if (def.grip && def.grip < .8) return ENVS.ice; if (th.ground === 'snow') return ENVS.snow; if (th.ground === 'sand' || th.ground === 'redsand') return ENVS.sand; if (th.decor === 'sky') return ENVS.wind; if (th.decor === 'space' || th.decor === 'moon') return ENVS.space; if (th.decor === 'volcano') return ENVS.lava; return null; }
function envWind(W, k) { const e = W.env; if (!e || !e.wind || k.air === 'glide') return 0; const t = W.clock || 0; const g = Math.sin(t * .35) * Math.sin(t * .9 + 1.3); return g > .45 ? (g - .45) * e.wind * 2.2 : 0; }

// ---------- pièges supplémentaires ----------
// jet : colonne de feu/vapeur qui s'allume par intervalles (prévenu par une lueur) ; bumper : rebond élastique ;
// traffic : véhicule qui roule dans une voie ; ball : énorme bille qui dévale la piste en sens inverse
function obstState11(o, t) {
  if (o.kind === 'jet') { const c = ((t / o.per + o.ph / TAU) % 1 + 1) % 1; o.warn = c > .4 && c < .55; o.down = c >= .55 && c < .82; o.c = c; return true; }
  if (o.kind === 'traffic' || o.kind === 'ball') {
    const P = o.P, span = o.span, sp = o.speed, s = ((t * sp + o.ph * span) % span + span) % span, dir = o.dir || 1; o.fade = clamp(Math.min(s, span - s) / 14, 0, 1);
    const fi = o.i0 + (dir > 0 ? s : span - s) / P.seg; let i = Math.floor(fi); const N = P.N; i = ((i % N) + N) % N; o.i = i;
    const lat = o.lat0 + (o.kind === 'ball' ? Math.sin(t * 1.3 + o.ph * 7) * o.sway : 0); o.lat = lat; o.curLat = 0;
    o.x = P.px[i] + P.rx[i] * lat; o.z = P.pz[i] + P.rz[i] * lat; o.y = P.py[i]; o.h = P.hd[i] + (dir > 0 ? 0 : Math.PI); return true;
  }
  return false;
}
function obstVisual11(o, t) {
  const m = o.mesh;
  if (o.kind === 'jet') { const f = m.userData; const on = o.down ? 1 : 0; if (f.flame) { f.flame.scale.set(1, on ? 1 + Math.sin(t * 40) * .08 : .02, 1); f.flame.visible = on > 0; }
    if (f.glow) f.glow.material.opacity = o.warn ? .35 + .35 * Math.abs(Math.sin(t * 18)) : on ? .9 : .12; return true; }
  if (o.kind === 'traffic' || o.kind === 'ball') { m.position.set(o.x, o.y + (o.kind === 'ball' ? o.r * o.fade : 0), o.z); m.rotation.y = o.h; m.visible = !(o.P.glide && o.P.glide[o.i]) && (o.kind !== 'ball' || o.fade > .05); if (o.kind === 'ball') m.scale.setScalar(Math.max(.05, o.fade)); if (o.kind === 'ball' && m.userData.inner) m.userData.inner.rotation.x += o.speed / o.r / 60 * (o.dir > 0 ? 1 : -1); return true; }
  return false;
}
function obstMesh11(o, W) {
  const g = new T.Group(), R = o.r;
  if (o.kind === 'jet') { const lava = o.style !== 'steam';
    const base = new T.Mesh(new T.CylinderGeometry(R * .9, R, .5, 16), stdMat('#3a3440', .5, .6)); base.position.y = .25; g.add(base);
    const glow = new T.Mesh(new T.CircleGeometry(R * .8, 20), new T.MeshBasicMaterial({ color: lava ? '#ff6a1a' : '#bfefff', transparent: true, opacity: .2 })); glow.rotation.x = -Math.PI / 2; glow.position.y = .52; g.add(glow);
    const fl = new T.Mesh(new T.ConeGeometry(R * .9, 9, 14, 1, true), new T.MeshBasicMaterial({ color: lava ? '#ffb02a' : '#e8fbff', transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); fl.geometry.translate(0, -4.5, 0); fl.rotation.x = Math.PI; fl.position.y = .5; g.add(fl);
    g.userData.flame = fl; g.userData.glow = glow; g.position.set(o.x, o.y, o.z); return g; }
  if (o.kind === 'pillar' && o.style === 'bumper') {
    const b = new T.Mesh(new T.CylinderGeometry(R, R * 1.05, 1.6, 28), stdMat('#ff3a8a', .25, .3)); b.position.y = .8; g.add(b);
    const ring = new T.Mesh(new T.TorusGeometry(R * 1.02, .22, 10, 32), stdMat('#ffc531', .2, .6)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.0; g.add(ring);
    const cap = new T.Mesh(new T.SphereGeometry(R * .7, 20, 10, 0, TAU, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff7ab8', emissiveIntensity: .7 })); cap.position.y = 1.6; g.add(cap); g.userData.cap = cap;
    g.position.set(o.x, o.y, o.z); return g; }
  if (o.kind === 'traffic') {
    if (o.style === 'cart') { const c = cartMesh(); g.add(c); return g; }
    const c = o.color || pick(['#38b6ff', '#ff4f3a', '#ffc531', '#3ee08f', '#fffdf7']); const bus = o.style === 'bus' || o.style === 'cart';
    const L = bus ? 9 : 4.6, Wd = 2.4, H = bus ? 3.2 : 1.5;
    const body = new T.Mesh(rbox(Wd, H, L, .35), stdMat(c, .35, .3)); body.position.y = .5 + H / 2; g.add(body);
    if (!bus) { const cab = new T.Mesh(rbox(Wd * .86, 1.1, L * .5, .3), new T.MeshStandardMaterial({ color: '#9fd4ff', roughness: .1, metalness: .4 })); cab.position.set(0, .5 + H + .45, -.2); g.add(cab); }
    else { const win = new T.Mesh(rbox(Wd + .04, .9, L * .86, .1), new T.MeshStandardMaterial({ color: '#9fd4ff', roughness: .1, metalness: .4 })); win.position.y = .5 + H * .7; g.add(win); }
    for (const [x, z] of [[-1.1, L * .32], [1.1, L * .32], [-1.1, -L * .32], [1.1, -L * .32]]) { const w = new T.Mesh(new T.CylinderGeometry(.5, .5, .4, 14), lam('#22213a')); w.rotation.z = Math.PI / 2; w.position.set(x, .5, z); g.add(w); }
    for (const sx of [-.7, .7]) { const l = new T.Mesh(new T.SphereGeometry(.18, 8, 6), new T.MeshBasicMaterial({ color: '#fff6c8' })); l.position.set(sx, .9, L / 2 + .02); g.add(l); }
    return g; }
  if (o.kind === 'ball') {
    const inner = new T.Group(); g.add(inner); g.userData.inner = inner;
    const m = new T.Mesh(new T.SphereGeometry(R, 32, 22), new T.MeshStandardMaterial({ color: o.style === 'lava' ? '#5a2a1a' : '#d8dce8', roughness: o.style === 'lava' ? .8 : .08, metalness: o.style === 'lava' ? .1 : 1, emissive: o.style === 'lava' ? '#ff5a10' : '#000000', emissiveIntensity: o.style === 'lava' ? .6 : 0 }));
    m.castShadow = true; inner.add(m); return g; }
  return null;
}
// collisions de ces pièges ; retourne true si géré
function obstHit11(k, o, R, nx, nz, vn) {
  if (o.kind === 'jet') { if (o.down && k.star <= 0 && k.spin <= 0) { hitKart(k, null); if (k.isPlayer) banner('Ça brûle !', .8, true); } return 'nosolid'; }
  if (o.kind === 'pillar' && o.style === 'bumper') { if (vn < 0) { const vx = Math.sin(k.vh), vz = Math.cos(k.vh), d = vx * nx + vz * nz; k.vh = Math.atan2(vx - 2 * d * nx, vz - 2 * d * nz); k.h += angDiff(k.h, k.vh) * .7; k.speed = Math.max(k.speed * .85, 26); k.boost = Math.max(k.boost, .25);
      if (k.isPlayer) { AudioSys.sfx('bumper'); vibrate(25); } if (o.mesh && o.mesh.userData.cap) { o.mesh.userData.cap.material.emissiveIntensity = 2.5; setTimeout(() => o.mesh && (o.mesh.userData.cap.material.emissiveIntensity = .7), 140); } }
    return 'done'; }
  if (o.kind === 'traffic' || o.kind === 'ball') { if (k.star <= 0) hitKart(k, null); else return 'nosolid'; return 'solid'; }
  return null;
}

// ---------- tremplins à figures et rampes de planeur ----------
// def.tricks : [t, ...] fractions ; la route monte en douceur puis casse net : petit envol, figure possible
function planKickers(W) {
  const S = W.S, N = S.N, def = W.def; W.kickers = [];
  const raise = (i0, n, h) => { for (let q = 0; q < n; q++) { const j = ((i0 + q) % N + N) % N, u = (q + 1) / n; S.py[j] += h * Math.pow(u, 1.6); } };
  for (const t of def.tricks || []) { const i = Math.floor(t * N); raise(i - 7, 7, 1.2); W.kickers.push({ i, lip: (i) % N, trick: true }); }
  // lèvre de rampe avant chaque gouffre de planeur
  for (const [a] of def.glide || []) { const i0 = Math.floor(a * N); raise(i0 - 8, 8, 1.4); W.kickers.push({ i: i0, lip: i0, glide: true }); }
  for (const kk of W.kickers) for (let o = -9; o <= 2; o++) { const j = ((kk.i + o) % N + N) % N, n = (j + 1) % N, p = (j - 1 + N) % N; S.slope[j] = (S.py[n] - S.py[p]) / (2 * S.seg); }
}
const KICK_TEX = canvasTex(256, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a8cff'); g.addColorStop(1, '#1a4ad8'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#ffc531'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(20 + i * 60, h * .8); x.lineTo(50 + i * 60, h * .25); x.lineTo(80 + i * 60, h * .8); x.lineTo(65 + i * 60, h * .8); x.lineTo(50 + i * 60, h * .48); x.lineTo(35 + i * 60, h * .8); x.fill(); } x.fillStyle = '#fffdf7'; x.fillRect(0, 0, w, 8); });
function buildKickers(W) {
  const S = W.S; if (!W.kickers || !W.kickers.length) return; const mat = new T.MeshStandardMaterial({ map: KICK_TEX, roughness: .45, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const kk of W.kickers) { const near = (i) => { const d = ((kk.i - i) % S.N + S.N) % S.N; return d <= 7 && d >= 0; };
    W.scene.add(new T.Mesh(bandGeo(S, [{ o: -W.hw + .4, y: .125 }, { o: W.hw - .4, y: .125 }], { vScale: 14, skip: (i) => !near(i) || !near((i + 1) % S.N) }), mat)); }
}
function kickerLaunch(k, W) {
  const S = W.S; if (!W.kickers || (k.P || S) !== S || k.air || k.speed < 18) return;
  for (const kk of W.kickers) { if (!kk.trick) continue; const di = k.idx - kk.lip; if (di >= 0 && di <= 2) { k.air = 'jump'; k.vy = 6.5 + Math.max(0, k.speed - 30) * .05 + (k.boost > 0 ? 1 : 0); k.airH = Math.max(k.airH || 0, .3); k.trickOK = true; k.trick = false; if (k.drift) endDrift(k, true);
      if (k.isPlayer) AudioSys.sfx('ramp'); else if (Math.random() < .7) k.aiTrickAt = rand(.08, .3); return; } }
}

// ---------- circuits « en sections » : un seul long trajet découpé en 3 ----------
function sectionOf(k) { const S = G.W.S; if (!(k.lap >= 1)) return 1; return clamp(Math.floor(clamp(k.idx, 0, S.N - 1) / S.N * 3) + 1, 1, 3); }

// ---------- rendu des karts et caméra dans les zones tordues ----------
const _wa = new T.Vector3(), _wb = new T.Vector3(), _qa = new T.Quaternion(), _qb = new T.Quaternion();
function warpSeg(k) { const S = G.W.S, N = S.N, i = clamp(k.idx, 0, N - 1), a = k.along || 0; let j = a >= 0 ? (i + 1) % N : (i - 1 + N) % N; const t = clamp(Math.abs(a) / (S.seg || 2), 0, 1); return [i, j, t]; }
function warpAtK(k, lat, h, out) { const S = G.W.S, [i, j, t] = warpSeg(k); warpAt(S, i, lat, h, _wa); warpAt(S, j, lat, h, _wb); return out.copy(_wa).lerp(_wb, t); }
const _wp = new T.Vector3(), _wf2 = new T.Vector3(), _wu2 = new T.Vector3(), _camUp = new T.Vector3(0, 1, 0);
function warpKartPose(k, M) {
  // remplace position/orientation du kart par celles de la piste repliée ; renvoie true si appliqué
  if (!inWarp(k)) return false; const S = G.W.S, [i, j, t] = warpSeg(k), h = Math.max(0, k.y - k.groundY);
  warpAtK(k, k.lat, h + .1, M.g.position);
  const yaw = angDiff(S.hd[i], k.h) + k.spinAng + (k.driftVis || 0), rl = k.trickT > 0 ? (k.trickDir || 1) * (1 - k.trickT / .45) * TAU : 0;
  warpFrameQuat(S, i, yaw, rl, _qa); warpFrameQuat(S, j, yaw, rl, _qb); M.g.quaternion.copy(_qa).slerp(_qb, t);
  return true;
}
function warpDir(k, outF, outU) { const S = G.W.S, [i0, i1, t] = warpSeg(k), a = i0 * 3, b = i1 * 3, d = angDiff(S.hd[i0], k.vh), L = (A, o) => A[a + o] + (A[b + o] - A[a + o]) * t;
  outU.set(L(S.wu, 0), L(S.wu, 1), L(S.wu, 2)).normalize(); outF.set(L(S.wf, 0), L(S.wf, 1), L(S.wf, 2)).normalize().multiplyScalar(Math.cos(d)).addScaledVector(_wx.set(L(S.wr, 0), L(S.wr, 1), L(S.wr, 2)).normalize(), -Math.sin(d)).normalize(); }
function warpCamera(k, dt, portrait) {
  if (!inWarp(k)) { _camUp.lerp(_wu2.set(0, 1, 0), 1 - Math.exp(-dt * 4)); camera.up.copy(_camUp); return false; }
  warpAtK(k, k.lat, Math.max(0, k.y - k.groundY) + 1.4, _wp); warpDir(k, _wf2, _wu2);
  const dist = portrait ? 10.5 : 8.8, hgt = portrait ? 3.6 : 2.8;
  tmpV.copy(_wp).addScaledVector(_wf2, -dist).addScaledVector(_wu2, hgt);
  if (camSnap) camera.position.copy(tmpV); else camera.position.lerp(tmpV, 1 - Math.exp(-dt * 10));
  _camUp.lerp(_wu2, 1 - Math.exp(-dt * 6)).normalize(); camera.up.copy(_camUp);
  lookV.copy(_wp).addScaledVector(_wf2, 6); camera.lookAt(lookV); camH.v = k.vh; camSnap = false; return true;
}
// percuter un adversaire en anti-gravité : petit turbo pour les deux
function agBump(A, B) { const S = G.W.S; if (!S.ag) return false; const a = inWarp(A) && S.ag[clamp(A.idx, 0, S.N - 1)], b = inWarp(B) && S.ag[clamp(B.idx, 0, S.N - 1)]; if (!a || !b) return false;
  for (const k of [A, B]) if (!k.isRemote) { k.boost = Math.max(k.boost, .5); k.boostTier = 1; } if (A.isPlayer || B.isPlayer) AudioSys.sfx('agbump'); return true; }

// ---------- bords sans barrière : on peut tomber (drone de dépannage) ----------
// def.edges : [[from, to, side]] (side : -1 gauche, 1 droite, 0 les deux)
function buildEdges(S, def) { if (!def.edges || !def.edges.length) return; const N = S.N; S.nowall = new Uint8Array(N);
  for (const [a, b, sd] of def.edges) { const i0 = Math.floor(a * N), i1 = Math.floor(b * N); for (let i = i0; i <= i1 + (i1 < i0 ? N : 0); i++) S.nowall[i % N] |= sd === 0 ? 3 : sd < 0 ? 1 : 2; } }
function edgeOpen(P, i, lat) { return !!(P && P.nowall && (P.nowall[clamp(i, 0, P.N - 1)] & (lat < 0 ? 1 : 2))); }
function startFall(k) { k.fallT = .9; k.fallVy = 2; if (k.drift) endDrift(k, false); k.boost = 0; if (k.isPlayer) { banner(G.W.th.lava ? 'Grillé !' : G.W.th.underwater ? 'Plouf !' : 'Chute !', 1.2, true); AudioSys.sfx('fall'); vibrate([30, 40, 30]); } }
function fallStep(k, dt) {
  k.fallT -= dt; k.fallVy -= 26 * dt; k.y += k.fallVy * dt; k.x += Math.sin(k.vh) * k.speed * dt * .6; k.z += Math.cos(k.vh) * k.speed * dt * .6; k.speed *= Math.pow(.4, dt);
  if (k.fallT > 0) return;
  const S = G.W.S, N = S.N, PB = k.P && k.P !== S ? k.P : null;
  if (PB) { // tombé d'un chemin sans rebords : on est reposé sur ce même chemin, un peu devant
    const j = clamp(k.idx + 2, 0, PB.N - 1); k.idx = j; k.x = PB.px[j]; k.z = PB.pz[j]; k.y = k.groundY = PB.py[j] + 3; k.h = k.vh = PB.hd[j]; k.speed = k.maxSpeed * .35;
    k.lat = 0; k.fallT = 0; k.ghost = Math.max(k.ghost || 0, 1.6); k.droneT = 1.4; k.air = 'jump'; k.vy = 0; if (k.isPlayer) AudioSys.sfx('drone'); return; }
  const bad = (j) => S.glide[j] || (S.wz && S.wz[j]); let i = Math.min(clamp(k.idx, 0, N - 1) + 2, N - 1);
  // on repose le kart là où il est tombé (un peu devant), jamais loin en arrière : on cherche la case libre la plus proche, en avant d'abord
  if (bad(i)) { let f = i, b2 = i, nf = 0, nb = 0; while (bad(f) && nf < 400 && f < N - 1) { f++; nf++; } if (bad(f)) nf = 1e9; while (bad(b2) && nb < 400) { b2 = (b2 - 1 + N) % N; nb++; } i = nf <= nb * 2 ? f : b2; }
  k.P = S; k.idx = i; k.x = S.px[i]; k.z = S.pz[i]; k.y = k.groundY = S.py[i] + 3; k.h = k.vh = S.hd[i]; k.speed = k.maxSpeed * .35; k.lat = 0; k.fallT = 0; k.ghost = Math.max(k.ghost || 0, 1.6); k.droneT = 1.4; k.air = 'jump'; k.vy = 0;
  if (k.isPlayer) AudioSys.sfx('drone');
}
// drone de dépannage (visuel)
function droneMesh() { const g = new T.Group(); const body = new T.Mesh(rbox(1.6, .4, 1.6, .2), stdMat('#ffc531', .3, .4)); g.add(body);
  for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) { const r = new T.Mesh(new T.CylinderGeometry(.6, .6, .05, 14), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .45 })); r.position.set(x, .25, z); g.add(r); const arm = new T.Mesh(new T.BoxGeometry(.12, .12, 1.4), lam('#17143a')); arm.position.set(x / 2, .1, z / 2); arm.rotation.y = Math.atan2(x, z); g.add(arm); }
  const l = new T.Mesh(new T.SphereGeometry(.15, 8, 6), new T.MeshBasicMaterial({ color: '#ff3a3a' })); l.position.y = -.25; g.add(l);
  for (const s of [-1, 1]) { const c = new T.Mesh(new T.CylinderGeometry(.03, .03, 2.2, 4), lam('#17143a')); c.position.set(s * .5, -1.2, 0); g.add(c); } return g; }

// ---------- routes qui s'ouvrent et se ferment (barrières annoncées) ----------
// def.gates : [{ branch, period, phase, mode: 'alt' | 'branch' }] ; 'alt' : soit la route principale, soit le raccourci (jamais les deux fermés)
function planGates(W) {
  const def = W.def; W.gates = []; if (!def.gates) return; const rng = seeded(seedHash(def.id + ':gates', RACE_OPTS.seed || 1));
  for (const gd of def.gates) { const B = W.branches[gd.branch || 0]; if (!B) continue; const g = Object.assign({ B, period: 24, mode: 'alt' }, gd); g.phase = (gd.phase != null ? gd.phase : rng()) * g.period;
    g.mainI = (B.map[Math.min(B.N - 1, B.noseA + 4)] + 4) % W.S.N; g.brJ = Math.min(B.N - 1, B.noseA + 6); B.gate = g; W.gates.push(g); }
}
function gateState(g, t) { const c = (((t + g.phase) / g.period) % 1 + 1) % 1; // 0-.45 : raccourci ouvert ; .5-.95 : route principale ouverte ; transitions = les deux ouverts
  const brOpen = c < .5 || c > .97, mainOpen = g.mode !== 'alt' || (c > .47); const warnBr = c > .38 && c < .5, warnMain = g.mode === 'alt' && c > .88 && c <= .97; return { brOpen, mainOpen, warnBr, warnMain }; }
function updateGates(W, t) { for (const g of W.gates || []) { const st = gateState(g, t); const ch = g.st && (g.st.brOpen !== st.brOpen || g.st.mainOpen !== st.mainOpen); g.st = st;
    if ((st.warnBr || st.warnMain) && !g.warned) { const P = G.race && G.race.player, S0 = W.S; const ahead = P && ((P.P || S0) === S0 ? ((g.mainI - P.idx) % S0.N + S0.N) % S0.N * S0.seg < 280 : P.P === g.B && P.idx < g.brJ); if (P && !P.finished && ahead) { g.warned = true; banner(st.warnMain ? 'La route se ferme : prends l\'autre chemin !' : 'Le raccourci se ferme !', 2.2, true); AudioSys.sfx('alarm'); } }
    if (!st.warnBr && !st.warnMain) g.warned = false;
    for (const [m, open, warn] of [[g.meshMain, st.mainOpen, st.warnMain], [g.meshBr, st.brOpen, st.warnBr]]) { if (!m) continue; const tgt = open ? 0 : 1; m.userData.v = lerp(m.userData.v || 0, tgt, .08); m.scale.y = Math.max(.02, m.userData.v); m.visible = m.userData.v > .03 || warn;
      m.material.opacity = (warn ? .45 + .4 * Math.abs(Math.sin(t * 10)) : .75); m.material.color.set(warn ? '#ff8a1e' : '#ff3a8a'); }
    if (ch && G.race && G.race.player) AudioSys.sfx('gate'); } }
function gateBlock(k, W) {
  for (const g of W.gates || []) { const st = g.st || gateState(g, W.clock || 0), B = g.B, S = W.S;
    if (!st.mainOpen && (k.P || S) === S) { const d = ((g.mainI - k.idx) % S.N + S.N) % S.N; if (d <= 1 && d >= 0 && !(B && k.lat * B.side > W.hw * .2 && B.map && k.idx < g.mainI)) bounceBack(k, S, g.mainI - 3); }
    if (!st.brOpen && k.P === B && k.idx >= g.brJ - 1 && k.idx <= g.brJ + 1) bounceBack(k, B, g.brJ - 3);
  }
}
function bounceBack(k, P, i) { i = P.closed === false ? clamp(i, 0, P.N - 1) : ((i % P.N) + P.N) % P.N; k.x = P.px[i] + P.rx[i] * k.lat; k.z = P.pz[i] + P.rz[i] * k.lat; k.speed = -Math.min(8, Math.abs(k.speed) * .2); if (k.drift) endDrift(k, false); if (k.isPlayer && k.bumpCd <= 0) { AudioSys.sfx('wall'); vibrate(40); k.bumpCd = .4; } }
const GATE_TEX = canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = -2; i < 8; i++) { x.beginPath(); x.moveTo(i * 20, h); x.lineTo(i * 20 + 10, h); x.lineTo(i * 20 + 30, 0); x.lineTo(i * 20 + 20, 0); x.fill(); } });
function buildGates(W) {
  for (const g of W.gates || []) { const mk = (P, i, hw) => { const m = new T.Mesh(new T.PlaneGeometry(hw * 2 + 3, 3.2), new T.MeshBasicMaterial({ map: GATE_TEX, color: '#ff3a8a', transparent: true, opacity: .75, side: T.DoubleSide, depthWrite: false }));
      m.geometry.translate(0, 1.6, 0); m.position.set(P.px[i], P.py[i] + .1, P.pz[i]); m.rotation.y = P.hd[i] + Math.PI / 2 * 0; m.rotation.y = Math.atan2(P.rx[i], P.rz[i]) + Math.PI / 2; m.userData.v = 0; W.scene.add(m);
      for (const s of [-1, 1]) { const post = new T.Mesh(new T.CylinderGeometry(.35, .4, 4, 10), stdMat('#2a2a3a', .4, .6)); post.position.set(P.px[i] + P.rx[i] * s * (hw + 1.6), P.py[i] + 2, P.pz[i] + P.rz[i] * s * (hw + 1.6)); W.scene.add(post);
        const lamp = new T.Mesh(new T.SphereGeometry(.4, 10, 8), new T.MeshBasicMaterial({ color: '#ff8a1e' })); lamp.position.set(post.position.x, P.py[i] + 4.3, post.position.z); W.scene.add(lamp); }
      return m; };
    g.meshMain = g.mode === 'alt' ? mk(W.S, g.mainI, W.hw) : null; g.meshBr = mk(g.B, g.brJ, g.B.hw); }
}
// météo changeante (pluie, neige, brouillard) : modifie l'adhérence, annoncée avant
const WEATHERS = [{ id: 'sun', name: 'Grand soleil', grip: 1, fog: 1 }, { id: 'rain', name: 'Averse', grip: .82, fog: .6 }, { id: 'snow', name: 'Neige', grip: .7, fog: .55 }, { id: 'fog', name: 'Brouillard', grip: .95, fog: .3 }];
function planWeather(W) { if (!W.def.weather) return; const rng = seeded(seedHash(W.def.id + ':wx', RACE_OPTS.seed || 1)); const seq = []; for (let k = 0; k < 12; k++) seq.push(k === 0 ? 0 : 1 + Math.floor(rng() * 3)); W.wx = { seq, period: W.def.weather.period || 35, cur: -1, fogN: W.scene.fog.near, fogF: W.scene.fog.far, grip: 1 };
  const n = 900, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-50, 50); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-50, 50); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); const p = new T.Points(g, new T.PointsMaterial({ color: '#cfe8ff', size: .25, transparent: true, opacity: 0, depthWrite: false })); p.frustumCulled = false; W.scene.add(p); W.wx.pts = p; W.wx.pos = pos; }
function updateWeather(W, t, dt) { const X = W.wx; if (!X) return; const k = Math.floor(t / X.period), wi = X.seq[((k % X.seq.length) + X.seq.length) % X.seq.length], w = WEATHERS[wi], nxt = WEATHERS[X.seq[((k + 1) % X.seq.length + X.seq.length) % X.seq.length]];
  if (t % X.period > X.period - 3.2 && X.ann !== k && G.race && G.race.player && nxt.id !== w.id) { X.ann = k; banner('Météo : ' + nxt.name.toLowerCase() + ' dans 3 s !', 2, true); }
  X.grip = lerp(X.grip, w.grip, 1 - Math.exp(-dt * .8)); const f = lerp(W.scene.fog.far / X.fogF, w.fog, 1 - Math.exp(-dt * .6)); W.scene.fog.far = X.fogF * f; W.scene.fog.near = X.fogN * Math.min(1, f + .2);
  const m = X.pts.material, on = w.id === 'rain' || w.id === 'snow'; m.opacity = lerp(m.opacity, on ? (w.id === 'rain' ? .55 : .9) : 0, 1 - Math.exp(-dt * 1.5)); m.size = w.id === 'snow' ? .45 : .22; m.color.set(w.id === 'snow' ? '#ffffff' : '#bcd8ff');
  const sp = w.id === 'rain' ? 34 : 4, P = X.pos; for (let i = 0; i < P.length; i += 3) { P[i + 1] -= sp * dt; if (w.id === 'snow') P[i] += Math.sin(t + i) * dt; if (P[i + 1] < 0) P[i + 1] += 40; } X.pts.geometry.attributes.position.needsUpdate = true; X.pts.position.set(camera.position.x, camera.position.y - 12, camera.position.z); }

/* ---------- Centre Commercial des Soldes ---------- */
function groundTexMall() { const nM = fbm(6, 3, 811); return pixelTex(512, 512, (u, v) => { const tu = (u * 4) % 1, tv = (v * 4) % 1, g = tu < .02 || tv < .02; const chk = (Math.floor(u * 4) + Math.floor(v * 4)) % 2;
  const base = chk ? [238, 232, 222] : [214, 206, 196]; const m = nM(u, v); return g ? [170, 160, 150] : mulc(base, .94 + m * .1); }); }
const SHOP_NAMES = ['SOLDES -70%', 'CAFÉ CRÈME', 'JOUETS', 'MODE', 'CHAUSSURES', 'GLACES', 'MUSIQUE', 'SPORT', 'BONBONS', 'PIZZA', 'LIBRAIRIE', 'PARFUMS', 'JEUX VIDÉO', 'FLEURS', 'BIJOUX', 'CRÊPES'];
function shopSignTex(txt, c1, c2) { return canvasTex(256, 64, (x, w, h) => { x.fillStyle = c1; x.fillRect(0, 0, w, h); x.fillStyle = c2; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 2); x.strokeStyle = c2; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8); }, false); }
function buildMall(W, ext, cx, cz, scatter, ring, q) {
  const { scene } = W; const cols = [['#ff4f7a', '#fffdf7'], ['#2ec4c0', '#17143a'], ['#ffc531', '#17143a'], ['#7c4dff', '#fffdf7'], ['#3ee08f', '#17143a'], ['#ff8a1e', '#fffdf7']];
  // boutiques en couronne
  const n = 26, R0 = ext + 70;
  for (let k = 0; k < n; k++) { const a = k / n * TAU, x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0, c = cols[k % cols.length];
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = -a - Math.PI / 2;
    const body = new T.Mesh(new T.BoxGeometry(34, 18, 14), lam('#f4efe8')); body.position.y = 9; g.add(body);
    const glass = new T.Mesh(new T.PlaneGeometry(28, 9), new T.MeshStandardMaterial({ color: '#9fd4ff', roughness: .05, metalness: .5, emissive: '#3a5a7a', emissiveIntensity: .3 })); glass.position.set(0, 5, 7.05); g.add(glass);
    const aw = new T.Mesh(new T.BoxGeometry(32, .6, 4), lam(c[0])); aw.position.set(0, 10.6, 8.6); aw.rotation.x = .25; g.add(aw);
    const sign = new T.Mesh(new T.PlaneGeometry(22, 5.5), new T.MeshBasicMaterial({ map: shopSignTex(SHOP_NAMES[k % SHOP_NAMES.length], c[0], c[1]) })); sign.position.set(0, 14.5, 7.06); g.add(sign);
    scene.add(g); }
  // étage supérieur (mezzanine) + piliers + verrière
  const pil = []; for (let k = 0; k < 40; k++) { const a = k / 40 * TAU, r = ext + 40 + (k % 2) * 8; pil.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, y: 0, s: 1, r: 0 }); }
  instanced(scene, [{ geo: new T.CylinderGeometry(1.4, 1.6, 46, 16), mat: stdMat('#f2eee8', .4, .1), off: tr(0, 23, 0) }, { geo: new T.CylinderGeometry(2.2, 2.2, 1.2, 16), mat: stdMat('#c8b88a', .3, .6), off: tr(0, .6, 0) }], pil);
  const beams = []; for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI; beams.push({ x: cx, z: cz, y: 46, s: 1, r: a }); }
  instanced(scene, [{ geo: new T.BoxGeometry((ext + 60) * 2, 1, 1.2), mat: stdMat('#e8ecf4', .3, .7) }], beams);
  const ringB = new T.Mesh(new T.TorusGeometry(ext + 46, .9, 8, 96), stdMat('#e8ecf4', .3, .7)); ringB.rotation.x = Math.PI / 2; ringB.position.set(cx, 46, cz); scene.add(ringB);
  // jardinières, fontaines, bancs, kiosques
  instanced(scene, palmParts('#8a6a4a', ['#3fae4a', '#4fbe56', '#2f9a3e']).map((p) => p), scatter(40 * q + 10, 6, 120, .7, 1).map((p) => Object.assign(p, { y: .9 })));
  const pl = scatter(40 * q + 10, 6, 120, 1, 1); instanced(scene, [{ geo: new T.CylinderGeometry(2.2, 2, 1.2, 16), mat: lam('#d8d0c4'), off: tr(0, .6, 0) }, { geo: decorGeo('bush'), mat: lam('#ffffff'), off: tr(0, 1.6, 0), colors: ['#3a9a40', '#4aae48', '#ff6fa8'] }], pl);
  for (const f of scatter(4, 14, 120, 1, 1)) { const g = new T.Group(); const bowl = new T.Mesh(new T.CylinderGeometry(7, 7.5, 1.2, 28), lam('#e8e0d4')); bowl.position.y = .6; g.add(bowl);
    const water = new T.Mesh(new T.CircleGeometry(6.5, 28), new T.MeshStandardMaterial({ map: waterTex(), color: '#7fd8ff', roughness: .05, metalness: .3 })); water.rotation.x = -Math.PI / 2; water.position.y = 1.1; g.add(water);
    const jet = new T.Mesh(new T.ConeGeometry(.8, 6, 12, 1, true), new T.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: .6, side: T.DoubleSide })); jet.position.y = 4; g.add(jet); g.position.set(f.x, hy(W, f.x, f.z), f.z); scene.add(g); }
  const bench = scatter(50 * q, 3, 60, 1, 1); instanced(scene, [{ geo: new T.BoxGeometry(4, .3, 1.2), mat: lam('#a87a4a'), off: tr(0, .9, 0) }, { geo: new T.BoxGeometry(4, 1, .2), mat: lam('#a87a4a'), off: tr(0, 1.4, -.5) }, { geo: new T.BoxGeometry(.2, .9, 1), mat: lam('#5a5a6a'), off: tr(-1.7, .45, 0) }, { geo: new T.BoxGeometry(.2, .9, 1), mat: lam('#5a5a6a'), off: tr(1.7, .45, 0) }], bench);
  // clients
  const ppl = scatter(160 * q + 30, 2.5, 70, .9, 1.1); const shirts = ['#ff4f3a', '#38b6ff', '#ffc531', '#3ee08f', '#7c4dff', '#ff6fb5', '#fffdf7', '#2b2b3a'];
  instanced(scene, [{ geo: new T.CapsuleGeometry(.35, .8, 4, 8), mat: lam('#ffffff'), off: tr(0, .9, 0), colors: shirts }, { geo: new T.SphereGeometry(.28, 10, 8), mat: lam('#ffffff'), off: tr(0, 1.75, 0), colors: SKINS }], ppl);
  // banderoles « SOLDES »
  const ban = shopSignTex('SOLDES', '#ff2a4a', '#fffdf7'); const S = W.S;
  for (let i = 0; i < S.N; i += Math.floor(S.N / 6)) { if (S.glide[i] || (S.wz && S.wz[i])) continue; for (const fl of [0, Math.PI]) { const m = new T.Mesh(new T.PlaneGeometry(W.wallD * 2, 5), new T.MeshBasicMaterial({ map: ban })); m.position.set(S.px[i] + S.fx[i] * (fl ? -.05 : .05), S.py[i] + 13, S.pz[i] + S.fz[i] * (fl ? -.05 : .05)); m.rotation.y = S.hd[i] + fl + Math.PI; scene.add(m); }
    for (const sg of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.25, .25, 15, 8), stdMat('#d8dce8', .3, .7)); p.position.set(S.px[i] + S.rx[i] * sg * W.wallD, S.py[i] + 7.5, S.pz[i] + S.rz[i] * sg * W.wallD); scene.add(p); } }
}
// chariot de courses géant (pour le trafic du centre commercial)
function cartMesh() { const g = new T.Group(), wire = stdMat('#c8ccd8', .25, .9), red = stdMat('#ff3a4a', .4, .2);
  const frame = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), wire); m.position.set(x, y, z); g.add(m); };
  frame(2.6, .12, 4, 0, 1.2, 0); for (const sx of [-1.3, 1.3]) frame(.12, 1.8, 4, sx, 2.1, 0); frame(2.6, 1.8, .12, 0, 2.1, 2); frame(2.6, 1.8, .12, 0, 2.1, -2);
  for (let k = -3; k <= 3; k++) frame(.06, 1.8, 4, k * .37, 2.1, 0);
  const handle = new T.Mesh(new T.CylinderGeometry(.12, .12, 2.8, 10), red); handle.rotation.z = Math.PI / 2; handle.position.set(0, 3.3, -2.3); g.add(handle);
  for (const [x, z] of [[-1.1, 1.6], [1.1, 1.6], [-1.1, -1.6], [1.1, -1.6]]) { const w = new T.Mesh(new T.CylinderGeometry(.35, .35, .3, 12), lam('#22213a')); w.rotation.z = Math.PI / 2; w.position.set(x, .35, z); g.add(w); }
  return g; }
// ponts : tablier, poutres et piliers là où la piste passe au-dessus d'elle-même
function computeBridges(W) { const S = W.S, N = S.N, R = W.wallD * 2 + 6; S.bridge = new Uint8Array(N); let any = false;
  for (let i = 0; i < N; i += 1) for (let j = 0; j < N; j += 2) { const d = Math.abs(i - j); if (Math.min(d, N - d) < 40) continue; if (S.py[i] - S.py[j] < 6) continue; if ((S.px[i] - S.px[j]) ** 2 + (S.pz[i] - S.pz[j]) ** 2 < R * R) { S.bridge[i] = 1; any = true; break; } }
  if (any) { const b = S.bridge.slice(); for (let i = 0; i < N; i++) if (b[i]) for (let o = -14; o <= 14; o++) S.bridge[((i + o) % N + N) % N] = 1; } return any; }
function buildBridges(W) { const S = W.S; if (!S.bridge) return; const N = S.N; const deck = stdMat('#6a6878', .6, .2);
  W.scene.add(new T.Mesh(bandGeo(S, [{ o: -W.wallD, y: -1.6 }, { o: W.wallD, y: -1.6 }], { skip: (i) => !S.bridge[i] || !S.bridge[(i + 1) % N] }), deck));
  for (const sg of [-1, 1]) W.scene.add(new T.Mesh(bandGeo(S, sg > 0 ? [{ o: W.wallD, y: .06 }, { o: W.wallD, y: -1.6 }] : [{ o: -W.wallD, y: -1.6 }, { o: -W.wallD, y: .06 }], { skip: (i) => !S.bridge[i] || !S.bridge[(i + 1) % N] }), deck));
  const pil = []; for (let i = 0; i < N; i += 12) { if (!S.bridge[i]) continue; for (const sg of [-1, 1]) { const x = S.px[i] + S.rx[i] * sg * (W.wallD - 3), z = S.pz[i] + S.rz[i] * sg * (W.wallD - 3);
      let lowOk = true; for (let j = 0; j < N; j += 2) { if (Math.abs(S.py[j] - S.py[i]) < 5) continue; if ((S.px[j] - x) ** 2 + (S.pz[j] - z) ** 2 < (W.wallD + 2) ** 2) { lowOk = false; break; } } if (!lowOk) continue;
      const g0 = W.hAt ? W.hAt(x, z) : (W.th.groundY != null ? W.th.groundY : 0), h = S.py[i] - 1.6 - g0; if (h < 2) continue; pil.push({ x, z, y: g0, s: 1, sy: h, sx: 1, sz: 1, r: S.hd[i] }); } }
  const pg = new T.BoxGeometry(2.4, 1, 2.4); pg.translate(0, .5, 0); instanced(W.scene, [{ geo: pg, mat: stdMat('#8a8898', .6, .1) }], pil); }

function hitKart(k, src) {
  if (k.spin > 0 || k.star > 0 || k.ghost > 0) return;
  if (k.shield > 0) { k.shield = 0; if (k.isPlayer || (src && src.isPlayer)) AudioSys.sfx('shield'); return; }
  k.spin = 1.15; k.speed *= .3; k.boost = 0; if (k.drift) endDrift(k, false);
  for (let n = 0; n < 14; n++) G.W.parts.emit(k.x, k.y + 1.2, k.z, rand(-6, 6), rand(3, 8), rand(-6, 6), pick(['#ffc531', '#fffdf7', '#ff4f3a']), .7);
  if (k.isPlayer) { AudioSys.sfx('hit'); vibrate([60, 40, 80]); }
  else if (src && src.isPlayer) AudioSys.sfx('hit');
  const pt = G.race && G.race.pt; if (pt && G.race.state === 'race') {
    if (k.isPlayer) { pt.hits++; if (pt.hits <= 3) banner('+1 ' + unitWord(1), 1.4, true); }
    else if (src && src.isPlayer) { pt.gives++; if (pt.gives <= 3) banner('Touché ! Distribue 1', 1.4); }
  }
}
function collideKarts() {
  const ks = G.karts, R = 1.55;
  for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) {
    const A = ks[a], B = ks[b]; if (A.isRemote && B.isRemote) continue; if (A.ghost > 0 || B.ghost > 0) continue;
    const dx = B.x - A.x, dz = B.z - A.z; const d2 = dx * dx + dz * dz; if (d2 > 4 * R * R || d2 < 1e-6 || Math.abs(A.y - B.y) > 2.2) continue;
    if (A.star > 0 && B.star <= 0 && !B.isRemote) hitKart(B, A); if (B.star > 0 && A.star <= 0 && !A.isRemote) hitKart(A, B);
    const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ov = Math.min(2 * R - d, .5);
    let wa = B.weight / (A.weight + B.weight), wb = 1 - wa; if (A.isRemote) { wa = 0; wb = 1; } else if (B.isRemote) { wa = 1; wb = 0; }
    sidePush(A, -nx * ov * wa, -nz * ov * wa); sidePush(B, nx * ov * wb, nz * ov * wb);
    if (A.bumpCd <= 0 && B.bumpCd <= 0) { if (!agBump(A, B) && (A.isPlayer || B.isPlayer)) AudioSys.sfx('bump'); if (A.isPlayer || B.isPlayer) vibrate(20); A.bumpCd = B.bumpCd = .35; }
  }
}
// contact : on écarte sur le côté uniquement, sans freiner ni accélérer
function sidePush(k, px, pz) { if (k.isRemote || (!px && !pz)) return; const fx = Math.sin(k.h), fz = Math.cos(k.h), al = px * fx + pz * fz; k.x += px - fx * al * .92; k.z += pz - fz * al * .92; }
/* ---- objets ---- */
const ICONS = {
  turbo: '<svg viewBox="0 0 48 48"><path d="M6 10h12l12 14-12 14H6l12-14z" fill="#ff4f3a" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><path d="M20 10h10l12 14-12 14H20l12-14z" fill="#ffc531" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/></svg>',
  triple: '<svg viewBox="0 0 48 48"><g stroke="#17143a" stroke-width="2.5" stroke-linejoin="round"><path d="M4 8h8l8 9-8 9H4l8-9z" fill="#ff4f3a"/><path d="M16 14h8l8 9-8 9h-8l8-9z" fill="#ffc531"/><path d="M28 20h8l8 9-8 9h-8l8-9z" fill="#3ee08f"/></g></svg>',
  oil: '<svg viewBox="0 0 48 48"><path d="M24 5C18 15 11 22 11 31a13 13 0 0 0 26 0c0-9-7-16-13-26z" fill="#2b2b3a" stroke="#17143a" stroke-width="3"/><path d="M17 30a7 7 0 0 0 7 7" stroke="#7c4dff" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  mine: '<svg viewBox="0 0 48 48"><g stroke="#17143a" stroke-width="3" stroke-linecap="round"><path d="M24 4v8M24 36v8M4 24h8M36 24h8M10 10l6 6M32 32l6 6M38 10l-6 6M16 32l-6 6"/><circle cx="24" cy="24" r="12" fill="#3a3550"/></g><circle cx="24" cy="24" r="4" fill="#ff4f3a"/></svg>',
  shield: '<svg viewBox="0 0 48 48"><path d="M24 5l16 6v12c0 10-7 17-16 20C15 40 8 33 8 23V11z" fill="#38b6ff" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><path d="M24 11v27" stroke="#fffdf7" stroke-width="3"/></svg>',
  rocket: '<svg viewBox="0 0 48 48"><path d="M10 24c6-8 13-11 22-11l10 11-10 11c-9 0-16-3-22-11z" fill="#ff4f3a" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><circle cx="28" cy="24" r="4" fill="#fffdf7" stroke="#17143a" stroke-width="2.5"/><path d="M10 24L4 16v16z" fill="#ffc531" stroke="#17143a" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  boule: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="#38b6ff" stroke="#17143a" stroke-width="3"/><path d="M9 20c10 4 20 4 30 0" stroke="#fffdf7" stroke-width="4" fill="none"/><circle cx="18" cy="15" r="3" fill="#fffdf7"/></svg>',
  eclair: '<svg viewBox="0 0 48 48"><path d="M28 3L9 27h13l-4 18 21-26H25z" fill="#ffc531" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/></svg>',
  aimant: '<svg viewBox="0 0 48 48"><path d="M10 8h10v16a4 4 0 0 0 8 0V8h10v16a14 14 0 0 1-28 0z" fill="#ff4f3a" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><path d="M10 8h10v7H10zM28 8h10v7H28z" fill="#e9ecf4" stroke="#17143a" stroke-width="3"/></svg>',
  fantome: '<svg viewBox="0 0 48 48"><path d="M10 42V22a14 14 0 0 1 28 0v20l-5-4-4 4-5-4-5 4-4-4z" fill="#f4f2ff" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><circle cx="19" cy="22" r="3" fill="#17143a"/><circle cx="29" cy="22" r="3" fill="#17143a"/></svg>',
  etoile: '<svg viewBox="0 0 48 48"><path d="M24 4l6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2z" fill="#ffc531" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><circle cx="19" cy="22" r="2" fill="#17143a"/><circle cx="29" cy="22" r="2" fill="#17143a"/></svg>',
};
const ITEM_KEYS = Object.keys(ICONS);
/* ================= v11 : objets par rareté + nouveaux objets ================= */
Object.assign(ICONS, {
  bulle: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="#bfefff" fill-opacity=".55" stroke="#17143a" stroke-width="3"/><circle cx="18" cy="17" r="5" fill="#fff"/><circle cx="31" cy="31" r="3" fill="#ff9ad5"/><circle cx="37" cy="12" r="4" fill="#bfefff" stroke="#17143a" stroke-width="2"/></svg>',
  confettis: '<svg viewBox="0 0 48 48"><path d="M8 40l10-26 16 16z" fill="#ffc531" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><path d="M12 30l6 6" stroke="#ff4f3a" stroke-width="3"/><g stroke="#17143a" stroke-width="1.5"><rect x="30" y="6" width="5" height="5" fill="#ff4f7a" transform="rotate(20 32 8)"/><rect x="38" y="16" width="5" height="5" fill="#3ee08f"/><rect x="24" y="4" width="4" height="4" fill="#38b6ff"/><circle cx="42" cy="30" r="2.6" fill="#a87dff"/><circle cx="36" cy="22" r="2" fill="#ffc531"/></g></svg>',
  ressort: '<svg viewBox="0 0 48 48"><g fill="none" stroke="#17143a" stroke-width="5" stroke-linecap="round"><path d="M12 40h24M14 33c10-3 20 0 20 0M14 26c10-3 20 0 20 0M14 19c10-3 20 0 20 0"/></g><g fill="none" stroke="#3ee08f" stroke-width="2.6" stroke-linecap="round"><path d="M14 33c10-3 20 0 20 0M14 26c10-3 20 0 20 0M14 19c10-3 20 0 20 0"/></g><rect x="10" y="8" width="28" height="7" rx="3" fill="#ffc531" stroke="#17143a" stroke-width="3"/></svg>',
  disco: '<svg viewBox="0 0 48 48"><path d="M24 2v8" stroke="#17143a" stroke-width="3"/><circle cx="24" cy="26" r="15" fill="#c8ccd8" stroke="#17143a" stroke-width="3"/><g fill="#fff"><rect x="15" y="17" width="5" height="5"/><rect x="25" y="20" width="5" height="5"/><rect x="19" y="28" width="5" height="5"/><rect x="29" y="30" width="4" height="4"/></g><g fill="#a87dff"><rect x="21" y="16" width="4" height="4"/><rect x="14" y="25" width="4" height="4"/><rect x="27" y="25" width="4" height="4"/></g></svg>',
  colle: '<svg viewBox="0 0 48 48"><path d="M14 14h20l-3 26H17z" fill="#fff3c4" stroke="#17143a" stroke-width="3" stroke-linejoin="round"/><path d="M13 10h22v6H13z" fill="#ff8a1e" stroke="#17143a" stroke-width="3"/><path d="M18 22c3 3 9 3 12 0v6c-3 3-9 3-12 0z" fill="#ffc531"/><circle cx="20" cy="34" r="2" fill="#ffc531"/></svg>',
  aspirateur: '<svg viewBox="0 0 48 48"><rect x="6" y="22" width="22" height="16" rx="6" fill="#a87dff" stroke="#17143a" stroke-width="3"/><circle cx="12" cy="39" r="4" fill="#2b2b3a" stroke="#17143a" stroke-width="2"/><circle cx="24" cy="39" r="4" fill="#2b2b3a" stroke="#17143a" stroke-width="2"/><path d="M26 26c6-10 12-14 16-14" fill="none" stroke="#17143a" stroke-width="4" stroke-linecap="round"/><path d="M38 8l6 4-4 6" fill="#38b6ff" stroke="#17143a" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  ventilo: '<svg viewBox="0 0 48 48"><circle cx="24" cy="22" r="16" fill="#bfefff" stroke="#17143a" stroke-width="3"/><g fill="#38b6ff" stroke="#17143a" stroke-width="2"><path d="M24 22c-2-8 2-12 6-10s0 8-6 10z"/><path d="M24 22c8-1 11 4 8 7s-7-2-8-7z"/><path d="M24 22c-5 6-11 5-11 1s6-4 11-1z"/></g><circle cx="24" cy="22" r="3" fill="#ffc531" stroke="#17143a" stroke-width="2"/><path d="M18 38h12l2 6H16z" fill="#2b2b3a"/></svg>',
  grappin: '<svg viewBox="0 0 48 48"><path d="M8 40C14 30 22 22 30 14" fill="none" stroke="#c8ccd8" stroke-width="3" stroke-dasharray="3 3"/><g stroke="#17143a" stroke-width="3" fill="#ffc531" stroke-linejoin="round"><path d="M30 14l6-8 2 9z"/><path d="M30 14l10 2-6 6z"/><path d="M30 14l-2-10 7 4z"/></g><circle cx="8" cy="40" r="4" fill="#ff4f3a" stroke="#17143a" stroke-width="2.5"/></svg>',
});
const RARITY = { turbo: 'c', oil: 'c', boule: 'c', shield: 'c', colle: 'c', triple: 'u', mine: 'u', aimant: 'u', fantome: 'u', ressort: 'u', bulle: 'u', aspirateur: 'u', ventilo: 'u', rocket: 'r', confettis: 'r', disco: 'r', grappin: 'r', etoile: 'v', eclair: 'v' };
const RARITY_NAME = { c: 'Commun', u: 'Peu commun', r: 'Rare', v: 'Très rare' };
ITEM_KEYS.length = 0; ITEM_KEYS.push(...Object.keys(RARITY));
// r = 0 : en tête, r = 1 : loin derrière ; chaque rareté a un poids qui dépend de r, réparti entre ses objets
function itemOdds11(k, place) {
  // rareté ET place : en tête surtout des objets communs, derrière plus de rares et très rares (r = 0 : 1er, r = 1 : dernier)
  const n = (G.karts && G.karts.length) || 8, p = place || (k && k.place) || 1, r = n > 1 ? clamp((p - 1) / (n - 1), 0, 1) : 0;
  const tier = { c: 52 - 30 * r, u: 30 + 4 * r, r: 14 + 16 * r, v: 4 + 10 * r };
  const count = {}; for (const it in RARITY) count[RARITY[it]] = (count[RARITY[it]] || 0) + 1;
  const w = {}; for (const it in RARITY) w[it] = tier[RARITY[it]] / count[RARITY[it]];
  // objets pour se défendre plutôt devant, objets pour remonter plutôt derrière
  for (const it of ['shield', 'oil', 'boule', 'mine', 'colle', 'bulle']) if (w[it] != null) w[it] *= 1.35 - .6 * r;
  for (const it of ['turbo', 'rocket', 'etoile', 'grappin', 'ventilo', 'ressort', 'aimant']) if (w[it] != null) w[it] *= .7 + .8 * r;
  // variété : presque jamais deux fois de suite le même objet
  const hist = (k && k.lastItems) || []; hist.forEach((it, i) => { if (w[it] != null) w[it] *= [.12, .45, .75, .9][i] || 1; });
  return w;
}
function rollItem11(place, k) {
  const w = itemOdds11(k, place); let tot = 0; for (const n in w) tot += w[n]; if (tot <= 0) return 'boule';
  let x = Math.random() * tot, out = 'boule'; for (const n in w) { x -= w[n]; if (x <= 0) { out = n; break; } }
  if (k) { k.seenItems = k.seenItems || new Set(); k.seenItems.add(out); } return out;
}
// ---------- effets des nouveaux objets ----------
function useItem11(k, it, online) { if (k.spect) return;
  if (it === 'ressort') { k.air = 'jump'; k.vy = 15; k.airH = Math.max(k.airH || 0, .5); k.trickOK = true; k.trick = false; k.boost = Math.max(k.boost, 1.1); if (k.drift) endDrift(k, true); if (k.isPlayer) AudioSys.sfx('spring'); return true; }
  if (it === 'bulle') { let target = null, best = 1e9; for (const o of G.karts) { if (o === k || o.finished) continue; const g = o.prog - k.prog; if (g > 0 && g < best && g * G.W.S.seg < 160) { best = g; target = o; } }
    if (!target) { for (const o of G.karts) { if (o === k || o.finished) continue; const g = Math.abs(o.prog - k.prog); if (g < best) { best = g; target = o; } } }
    if (target) { bubbleKart(target, k); if (online) netEmit({ e: 'bulle', o: k.netId, tg: target.netId }); } if (k.isPlayer) AudioSys.sfx('bubble'); return true; }
  if (it === 'colle') { const x = k.x - Math.sin(k.h) * 3.4, z = k.z - Math.cos(k.h) * 3.4, id = online ? netNewId() : null; spawnOil(x, z, k.groundY, k, id, 'colle'); if (id) netEmit({ e: 'oil', kind: 'colle', id, x: r2(x), z: r2(z), y: r2(k.groundY), o: k.netId }); if (k.isPlayer) AudioSys.sfx('oil'); return true; }
  if (it === 'aspirateur') { let tg = null, best = 1e9; for (const o of G.karts) { if (o === k || o.finished) continue; const g = o.prog - k.prog; if (g > 0 && g < best && g * G.W.S.seg < 220) { best = g; tg = o; } }
    let got = tg && !tg.isRemote && tg.item && tg.item !== 'aspirateur' ? tg.item : null; if (tg && !tg.isRemote && tg.item) { tg.item = null; tg.uses = 0; if (tg.isPlayer) banner('On t\'a aspiré ton objet !', 1.4, true); }
    if (tg && tg.isRemote && online) netEmit({ e: 'vol', o: k.netId, tg: tg.netId });
    if (!got) got = pick(['triple', 'rocket', 'bulle', 'ressort', 'aimant']); k.item = got; if (got === 'triple') k.uses = 3; k.lastItems = [got].concat(k.lastItems || []).slice(0, 4);
    if (k.isPlayer) { AudioSys.sfx('got'); banner('Aspiré : ' + (ITEM_FR[got] || got), 1.3); } return true; }
  if (it === 'ventilo') { ventiloGust(k, k.x, k.z, k.h); if (online) netEmit({ e: 'ventilo', o: k.netId, x: r2(k.x), z: r2(k.z), h: r3(k.h) }); return true; }
  if (it === 'grappin') { let tg = null, best = 1e9; for (const o of G.karts) { if (o === k || o.finished) continue; const g = o.prog - k.prog; if (g > 0 && g < best && g * G.W.S.seg < 260) { best = g; tg = o; } }
    k.grapT = 2.4; k.grapTg = tg; k.boost = Math.max(k.boost, .6); if (k.isPlayer) { AudioSys.sfx('spring'); banner(tg ? 'Grappin sur ' + tg.name + ' !' : 'Grappin !', 1.2); } return true; }
  if (it === 'confettis') { confettiBlast(k, k.prog); if (online) netEmit({ e: 'confettis', o: k.netId, p: r2(k.prog) }); return true; }
  if (it === 'disco') { discoWave(k, k.x, k.z); if (online) netEmit({ e: 'disco', o: k.netId, x: r2(k.x), z: r2(k.z) }); return true; }
  return false;
}
function bubbleKart(o, src) { if (o.isRemote || o.star > 0 || o.ghost > 0) return; if (o.shield > 0) { o.shield = 0; return; } o.bubble = 1.7; if (o.drift) endDrift(o, false); if (o.isPlayer) { banner('Dans une bulle !', 1.3, true); vibrate([20, 40, 20]); AudioSys.sfx('bubble'); } }
function confettiBlast(src, p) { let n = 0; for (const o of G.karts) { if (o === src || o.isRemote || o.prog <= p || o.finished || (o.prog - p) * G.W.S.seg > 160) continue; if (o.shield > 0 || o.star > 0) continue; o.blind = 2; n++; if (o.isPlayer) { showConfetti(); banner('Confettis !', 1.2, true); } }
  G.lastConfetti = G.race ? G.race.t : 0; AudioSys.sfx('confetti'); if (src && src.isPlayer) banner('Confettis : ' + n + ' aveuglé' + (n > 1 ? 's' : ''), 1.3); }
function discoWave(src, x, z) {
  const R2 = 15 * 15; for (const o of G.karts) { if (o === src || o.isRemote || o.finished) continue; if ((o.x - x) ** 2 + (o.z - z) ** 2 > R2) continue; if (o.star > 0 || o.ghost > 0) continue; if (o.shield > 0) { o.shield = 0; continue; } hitKart(o, src); }
  for (const h of G.hazards.slice()) if ((h.x - x) ** 2 + (h.z - z) ** 2 < R2 && h.mesh) { disposeObj(h.mesh); h.life = 0; }
  for (const r of G.rockets) if ((r.x - x) ** 2 + (r.z - z) ** 2 < R2) r.life = 0;
  if (G.W && G.W.parts) for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; G.W.parts.emit(x + Math.cos(a) * 2, (src ? src.y : 0) + 1.2, z + Math.sin(a) * 2, Math.cos(a) * 18, rand(1, 3), Math.sin(a) * 18, pick(['#ff4f7a', '#ffc531', '#38b6ff', '#a87dff', '#fffdf7']), .5, 0); }
  AudioSys.sfx('disco');
}
function showConfetti() { let el = $('#confetti'); if (!el) { el = document.createElement('div'); el.id = 'confetti'; document.body.appendChild(el); }
  el.innerHTML = ''; for (let i = 0; i < 26; i++) { const s = document.createElement('i'); s.style.left = rand(0, 100) + '%'; s.style.background = pick(['#ff4f7a', '#ffc531', '#38b6ff', '#3ee08f', '#a87dff', '#fffdf7']); s.style.animationDelay = rand(0, .4) + 's'; s.style.animationDuration = rand(1.2, 1.9) + 's'; s.style.opacity = '.75'; s.style.transform = 'rotate(' + rand(0, 360) + 'deg)'; el.appendChild(s); }
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); clearTimeout(showConfetti.h); showConfetti.h = setTimeout(() => el.classList.remove('on'), 2300); }
// physique : bulle (on flotte, on ralentit, pas de direction) et confettis (direction qui tremble)
function itemStatus11(k, inp, dt) {
  if (k.bubble > 0) { k.bubble -= dt; k.speed *= Math.pow(.25, dt); inp.steer = 0; inp.drift = false; k.y = Math.max(k.y, k.groundY + 1.8 * Math.sin(Math.min(1, (1.7 - k.bubble) / .4) * Math.PI / 2) * (k.bubble > .2 ? 1 : k.bubble / .2)); }
  if (k.blind > 0) { k.blind -= dt; if (!k.isPlayer) inp.steer = clamp(inp.steer + Math.sin(G.W.clock * 7 + (k.ai ? k.ai.seed || 0 : 0)) * .35, -1, 1); }
  if (k.glue > 0) { k.glue -= dt; const cap = k.maxSpeed * .5; if (k.speed > cap) k.speed = lerp(k.speed, cap, 1 - Math.exp(-dt * 8)); inp.drift = false; }
  if (k.grapT > 0) { k.grapT -= dt; const tg = k.grapTg; const v = k.maxSpeed * 1.32; if (k.speed < v) k.speed = Math.min(v, k.speed + 70 * dt); if (tg && (tg.finished || tg.prog <= k.prog + 2)) k.grapT = 0; if (k.grapT <= 0) k.grapTg = null; }
}
const ITEM_FR = { turbo: 'Turbo', oil: 'Flaque', boule: 'Boule', shield: 'Bouclier', colle: 'Pot de colle', triple: 'Triple turbo', mine: 'Mine', aimant: 'Aimant', fantome: 'Fantôme', ressort: 'Ressort', bulle: 'Bulle', aspirateur: 'Aspirateur', ventilo: 'Ventilo', rocket: 'Fusée', confettis: 'Confettis', disco: 'Boule disco', grappin: 'Grappin', etoile: 'Étoile', eclair: 'Éclair' };
function glueKart(k) { if (k.star > 0 || k.ghost > 0) return; if (k.shield > 0) { k.shield = 0; return; } k.glue = 1.6; if (k.drift) endDrift(k, false); if (k.isPlayer) { banner('Collé !', 1, true); vibrate(40); AudioSys.sfx('bubble'); } }
// rafale latérale : pousse et ralentit les karts proches devant et sur les côtés
function ventiloGust(src, x, z, h) { const fx = Math.sin(h), fz = Math.cos(h);
  for (const o of G.karts) { if (o === src || o.isRemote || o.finished) continue; const dx = o.x - x, dz = o.z - z, d2 = dx * dx + dz * dz; if (d2 > 30 * 30) continue; if (dx * fx + dz * fz < -6) continue; if (o.star > 0 || o.ghost > 0) continue; if (o.shield > 0) { o.shield = 0; continue; }
    const P = o.P || G.W.S, j = clamp(o.idx, 0, P.N - 1), side = Math.sign((dx * P.rx[j] + dz * P.rz[j]) || 1); o.x += P.rx[j] * side * 4.5; o.z += P.rz[j] * side * 4.5; o.speed *= .72; if (o.drift) endDrift(o, false); if (o.isPlayer) { banner('Coup de vent !', 1, true); vibrate(30); } }
  if (G.W && G.W.parts) for (let i = 0; i < 26; i++) G.W.parts.emit(x + fx * 3, (src ? src.y : 0) + 1, z + fz * 3, fx * rand(20, 30) + rand(-6, 6), rand(0, 2), fz * rand(20, 30) + rand(-6, 6), '#dff6ff', .45, 0);
  AudioSys.sfx('confetti'); }
// IA : quand utiliser les nouveaux objets
function aiUse11(k, ahead, behind, ai) {
  switch (k.item) {
    case 'ressort': return G.W.obst.some((o) => o.P === k.P && ((o.i - k.idx + o.P.N) % o.P.N) < 18) || ai.itemT < -4;
    case 'bulle': return ahead(80) || ai.itemT < -5;
    case 'confettis': return k.place > 2 || ai.itemT < -6;
    case 'colle': return behind(30) || ai.itemT < -3;
    case 'aspirateur': return G.karts.some((o) => o !== k && !o.finished && o.item && o.prog > k.prog && (o.prog - k.prog) * G.W.S.seg < 200) || ai.itemT < -6;
    case 'ventilo': return G.karts.some((o) => o !== k && !o.finished && (o.x - k.x) ** 2 + (o.z - k.z) ** 2 < 400) || ai.itemT < -6;
    case 'grappin': return ahead(110) || ai.itemT < -4;
    case 'disco': return G.karts.some((o) => o !== k && (o.x - k.x) ** 2 + (o.z - k.z) ** 2 < 140) || G.rockets.some((r) => r.target === k) || ai.itemT < -7;
  }
  return null;
}

const ITEM_W = (r) => ({ turbo: 1 + 1.6 * r, triple: .2 + 1.8 * r, oil: 2.6 - 1.8 * r, mine: 1.8 - r, shield: 2 - .8 * r, rocket: .3 + 2.4 * r, boule: 1.4,
  eclair: .02 + 1.3 * r * r * r, aimant: .2 + 1.8 * r, fantome: .9, etoile: .03 + 1.6 * r * r });
function rollItem_old(place, k) {
  const r = clamp((place - 1) / 7, 0, 1), w = ITEM_W(r);
  if (k && k.lastItems) for (const it of k.lastItems) if (w[it]) w[it] *= .15;
  let tot = 0; for (const n in w) tot += w[n]; let x = Math.random() * tot; for (const n in w) { x -= w[n]; if (x <= 0) return n; } return 'turbo';
}
function updateBoxes(dt) {
  const W = G.W, now = performance.now() / 1000;
  if (W.boxMat) W.boxMat.color.setHSL((now * .12) % 1, .75, .68);
  for (const b of W.boxes) {
    if (!b.active) { b.t -= dt; if (b.t <= 0) { b.active = true; b.mesh.visible = true; } }
    if (b.mesh.visible) { const sc = b.active ? Math.min(1, b.mesh.scale.x + dt * 3) : 0; b.mesh.scale.setScalar(Math.max(.01, sc)); b.shell.rotation.y += dt * 1.4; b.shell.rotation.x += dt * .6; b.mesh.position.y = b.y + 1.5 + Math.sin(now * 2.5 + b.phase) * .25; }
    if (!b.active) continue;
    for (const k of G.karts) {
      if (k.isRemote) continue;
      if ((k.x - b.x) ** 2 + (k.z - b.z) ** 2 < 5.3 && Math.abs(k.y - b.y) < 3) {
        b.active = false; b.t = 3; b.mesh.scale.setScalar(.01); b.mesh.visible = false;
        for (let n = 0; n < 12; n++) W.parts.emit(b.x, b.y + 1.5, b.z, rand(-5, 5), rand(2, 7), rand(-5, 5), pick(['#38b6ff', '#7c4dff', '#ff6fb5', '#ffc531']), .6);
        if (!k.item && k.roll <= 0) { k.roll = k.isPlayer ? ROLL_TIME : .3; if (k.isPlayer) AudioSys.sfx('box'); }
        break;
      }
    }
  }
}
const rocketGeo = (() => { const g = new T.ConeGeometry(.35, 1.4, 10); g.rotateX(Math.PI / 2); return g; })();
function useItem(k) {
  const it = k.item; if (!it || k.spin > 0) return; const R = G.race, online = !!(R && R.online);
  if ((it === 'oil' || it === 'mine') && k.air) return;
  if (it === 'triple') { k.uses = (k.uses || 3) - 1; if (k.uses <= 0) k.item = null; k.boost = Math.max(k.boost, 1.15); if (k.isPlayer) AudioSys.sfx('boost'); return; }
  k.item = null;
  if (useItem11(k, it, online)) return;
  if (it === 'turbo') { k.boost = Math.max(k.boost, 1.5); if (k.isPlayer) AudioSys.sfx('boost'); }
  else if (it === 'shield') { k.shield = 9; if (k.isPlayer) AudioSys.sfx('shield'); }
  else if (it === 'oil' || it === 'mine') {
    const x = k.x - Math.sin(k.h) * 3.4, z = k.z - Math.cos(k.h) * 3.4; const id = online ? netNewId() : null;
    spawnOil(x, z, k.groundY, k, id, it); if (id) netEmit({ e: 'oil', kind: it, id, x: r2(x), z: r2(z), y: r2(k.groundY), o: k.netId });
    if (k.isPlayer) AudioSys.sfx('oil');
  } else if (it === 'rocket' || it === 'boule') {
    let target = null; let bestGap = Infinity;
    if (it === 'rocket') for (const o of G.karts) { if (o === k || o.finished) continue; const gap = o.prog - k.prog; if (gap > 0 && gap < bestGap) { bestGap = gap; target = o; } }
    const x = k.x + Math.sin(k.h) * 2.6, z = k.z + Math.cos(k.h) * 2.6, sp = it === 'boule' ? Math.max(72, k.speed + 18) : Math.max(78, k.speed + 30); const id = online ? netNewId() : null;
    spawnRocket(x, z, k.y, k.h, sp, k, target, id, it); if (id) netEmit({ e: 'rocket', kind: it, id, x: r2(x), z: r2(z), y: r2(k.y), h: r3(k.h), sp: r2(sp), o: k.netId, tg: target ? target.netId : null });
    if (k.isPlayer || (target && target.isPlayer)) AudioSys.sfx('rocket');
  } else if (it === 'eclair') { zap(k, k.prog); if (online) netEmit({ e: 'zap', o: k.netId, p: r2(k.prog) }); }
  else if (it === 'aimant') { k.magnet = 3; if (k.isPlayer) { AudioSys.sfx('mini'); banner('Aimant !', 1); } }
  else if (it === 'fantome') { k.ghost = 4.5; if (k.isPlayer) { AudioSys.sfx('shield'); banner('Fantôme !', 1); } }
  else if (it === 'etoile') { k.star = 6; if (k.isPlayer) { AudioSys.sfx('star'); banner('Étoile !', 1); } }
}
function zap(src, p) {
  let n = 0;
  for (const o of G.karts) {
    if (o === src || o.isRemote || o.prog <= p || o.finished) continue; if (o.star > 0 || o.ghost > 0) continue; if (o.shield > 0) { o.shield = 0; continue; }
    o.shrink = 3.2; o.speed *= .6; n++; if (o.isPlayer) { banner('Éclair !', 1.2, true); vibrate([30, 30, 60]); flashScreen(); }
  }
  G.lastEclair = G.race ? G.race.t : 0; AudioSys.sfx('zap'); if (src && src.isPlayer) banner('Éclair : ' + n + ' touché' + (n > 1 ? 's' : ''), 1.4);
}
function flashScreen() { const f = $('#flash'); if (!f) return; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
const MINE_GEO = (() => { const list = [new T.SphereGeometry(.62, 16, 12)]; for (let k = 0; k < 10; k++) { const c = new T.ConeGeometry(.12, .45, 8); const a = k / 10 * TAU, e = k % 2 ? .5 : -.2; c.translate(0, .72, 0);
  c.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(Math.cos(a) * (1.2 + e), 0, Math.sin(a) * (1.2 + e)))); list.push(c); } const g = mergeGeos(list); g.userData.keep = true; return g; })();
function spawnOil(x, z, y, owner, id, kind = 'oil') {
  let m;
  if (kind === 'mine') { m = new T.Group(); const body = new T.Mesh(MINE_GEO, stdMat('#3a3550', .4, .6)); body.position.y = .6; m.add(body);
    const light = new T.Mesh(new T.SphereGeometry(.18, 10, 8), new T.MeshBasicMaterial({ color: '#ff2a2a' })); light.position.y = 1.25; m.add(light); m.userData.light = light; m.position.set(x, y + .1, z); }
  else if (kind === 'colle') { m = new T.Group(); const pool = new T.Mesh(new T.CircleGeometry(2.1, 24), new T.MeshStandardMaterial({ color: '#ffe9a0', roughness: .25, metalness: .1, emissive: '#7a5a10', emissiveIntensity: .25, polygonOffset: true, polygonOffsetFactor: -3 })); pool.rotation.x = -Math.PI / 2; m.add(pool);
    for (let q = 0; q < 6; q++) { const bb = new T.Mesh(new T.SphereGeometry(rand(.18, .32), 10, 8), stdMat('#fff6d0', .2, .1)); bb.position.set(rand(-1.3, 1.3), .08, rand(-1.3, 1.3)); m.add(bb); } m.position.set(x, y + .16, z); }
  else { m = new T.Mesh(new T.CircleGeometry(1.9, 24), new T.MeshStandardMaterial({ color: '#1a1828', roughness: .1, metalness: .5, emissive: '#3b1f7a', emissiveIntensity: .35, transparent: true, opacity: .95, polygonOffset: true, polygonOffsetFactor: -3 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + .16, z); }
  G.W.scene.add(m); warpObject(m, x, y + .16, z); G.hazards.push({ x, z, y, life: kind === 'mine' ? 30 : 25, mesh: m, owner, age: 0, id, kind });
}
function disposeObj(o) { G.W.scene.remove(o); o.traverse((c) => { if (c.geometry && !c.geometry.userData.keep && c.geometry !== rocketGeo) c.geometry.dispose(); if (c.material && ![...matCache.values()].includes(c.material)) c.material.dispose(); }); }
function spawnRocket(x, z, y, h, sp, owner, target, id, kind = 'rocket') {
  const S = G.W.S, N = S.N; let best = owner ? owner.idx : 0, bd = Infinity;
  for (let o = -40; o <= 40; o++) { const i = ((owner ? owner.idx : 0) + o + N) % N; const d = (x - S.px[i]) ** 2 + (z - S.pz[i]) ** 2; if (d < bd) { bd = d; best = i; } }
  const g = new T.Group();
  if (kind === 'boule') { const b = new T.Mesh(new T.SphereGeometry(.6, 18, 14), stdMat('#38b6ff', .25, .3)); g.add(b); const ring = new T.Mesh(new T.TorusGeometry(.6, .1, 8, 24), stdMat('#fffdf7', .3, .2)); ring.rotation.x = Math.PI / 2; g.add(ring); g.userData.spin = b; }
  else { g.add(new T.Mesh(rocketGeo, stdMat('#ff4f3a', .3, .3))); const fl = new T.Mesh(new T.SphereGeometry(.35, 8, 6), new T.MeshBasicMaterial({ color: '#ffc531' })); fl.position.z = -.8; g.add(fl); }
  G.W.scene.add(g);
  G.rockets.push({ x, z, y, h, idx: best, lat: (x - S.px[best]) * S.rx[best] + (z - S.pz[best]) * S.rz[best], speed: sp, target, owner, life: kind === 'boule' ? 6 : 7, age: 0, mesh: g, id, kind });
}
function removeById(id) {
  if (!id) return;
  for (let n = G.hazards.length - 1; n >= 0; n--) if (G.hazards[n].id === id) { disposeObj(G.hazards[n].mesh); G.hazards.splice(n, 1); }
  for (let n = G.rockets.length - 1; n >= 0; n--) if (G.rockets[n].id === id) { const r = G.rockets[n]; for (let m = 0; m < 12; m++) G.W.parts.emit(r.x, r.y + 1, r.z, rand(-6, 6), rand(2, 8), rand(-6, 6), pick(['#ff4f3a', '#ffc531']), .6); disposeObj(r.mesh); G.rockets.splice(n, 1); }
}
function netHitReport(k, src, id) {
  if (!G.race || !G.race.online) return;
  if (id) netEmit({ e: 'gone', id }); if (src && src.netId && src !== k) netEmit({ e: 'hit', v: k.netId, src: src.netId });
}
function updateItems(dt) {
  const W = G.W, S = W.S, N = S.N, now = performance.now() / 1000;
  for (const k of G.karts) {
    if (k.isRemote) continue;
    if (k.roll > 0) { k.roll -= dt; if (k.roll <= 0) { k.item = rollItem11(k.place, k); k.lastItems = [k.item].concat(k.lastItems || []).slice(0, 4); if (k.item === 'triple') k.uses = 3; k.ai.itemT = rand(.6, 2.5); if (k.isPlayer) AudioSys.sfx('got'); } }
  }
  for (let n = G.hazards.length - 1; n >= 0; n--) {
    const h = G.hazards[n]; h.life -= dt; h.age += dt; let gone = h.life <= 0; const rad2 = h.kind === 'mine' ? 7 : 4.6;
    if (h.kind === 'mine' && h.mesh.userData.light) h.mesh.userData.light.visible = Math.floor(now * 4) % 2 === 0;
    if (!gone) for (const k of G.karts) { if (k.isRemote || (h.owner === k && h.age < 1)) continue; if ((k.x - h.x) ** 2 + (k.z - h.z) ** 2 < rad2 && Math.abs(k.y - h.y) < 2) {
      if (h.kind === 'colle') { glueKart(k); netHitReport(k, null, h.id); } else { hitKart(k, h.owner); netHitReport(k, h.owner, h.id); } gone = true;
      if (h.kind === 'mine') for (let m = 0; m < 24; m++) W.parts.emit(h.x, h.y + 1, h.z, rand(-9, 9), rand(3, 12), rand(-9, 9), pick(['#ff4f3a', '#ffc531', '#2b2b3a']), .8);
      break; } }
    if (gone) { disposeObj(h.mesh); G.hazards.splice(n, 1); }
  }
  for (let n = G.rockets.length - 1; n >= 0; n--) {
    const r = G.rockets[n]; r.life -= dt; r.age += dt; let gone = r.life <= 0; const tg = r.target;
    if (r.kind === 'boule') {
      r.x += Math.sin(r.h) * r.speed * dt; r.z += Math.cos(r.h) * r.speed * dt;
      if (r.mesh.userData.spin) r.mesh.userData.spin.rotation.x += dt * 12;
    } else {
      let tx, tz;
      if (tg && !tg.finished && (tg.x - r.x) ** 2 + (tg.z - r.z) ** 2 < 55 * 55) { tx = tg.x; tz = tg.z; }
      else { const ti = (r.idx + 12) % N; const lat = tg ? clamp(tg.lat, -W.hw, W.hw) * .6 : r.lat; tx = S.px[ti] + S.rx[ti] * lat; tz = S.pz[ti] + S.rz[ti] * lat; }
      const th = Math.atan2(tx - r.x, tz - r.z); r.h += clamp(angDiff(r.h, th), -4 * dt, 4 * dt);
      r.x += Math.sin(r.h) * r.speed * dt; r.z += Math.cos(r.h) * r.speed * dt;
    }
    let best = r.idx, bd = Infinity; for (let o = -6; o <= 10; o++) { const i = (r.idx + o + N) % N; const d = (r.x - S.px[i]) ** 2 + (r.z - S.pz[i]) ** 2; if (d < bd) { bd = d; best = i; } } r.idx = best;
    r.lat = (r.x - S.px[best]) * S.rx[best] + (r.z - S.pz[best]) * S.rz[best];
    if (Math.abs(r.lat) > W.lim && !(tg && tg.P && tg.P !== S) && !openSide(S, best)) {
      const s = Math.sign(r.lat); r.x -= S.rx[best] * s * (Math.abs(r.lat) - W.lim); r.z -= S.rz[best] * s * (Math.abs(r.lat) - W.lim);
      if (r.kind === 'boule') { const dx = Math.sin(r.h), dz = Math.cos(r.h), dl = (dx * S.rx[best] + dz * S.rz[best]); if (dl * s > 0) { r.h = Math.atan2(dx - 2 * dl * S.rx[best], dz - 2 * dl * S.rz[best]); AudioSys.sfx('bump'); } }
    }
    r.y = lerp(r.y, S.py[best] + (S.glide && S.glide[best] ? 3 : 0), .3); r.mesh.position.set(r.x, r.y + (r.kind === 'boule' ? .6 : 1), r.z); r.mesh.rotation.y = r.h; if (S.wz && S.wz[best]) warpObject(r.mesh, r.x, r.y + 1, r.z);
    if (r.kind !== 'boule' && Math.random() < .8) W.parts.emit(r.x - Math.sin(r.h) * 1, r.y + 1, r.z - Math.cos(r.h) * 1, rand(-1, 1), rand(0, 1), rand(-1, 1), '#ff9a2e', .35, 0);
    if (!gone) for (const k of G.karts) { if (k.isRemote || (k === r.owner && r.age < (r.kind === 'boule' ? .8 : .6))) continue; if ((k.x - r.x) ** 2 + (k.z - r.z) ** 2 < 6.2 && Math.abs(k.y - r.y) < 3) { hitKart(k, r.owner); netHitReport(k, r.owner, r.id); gone = true; break; } }
    if (gone) { for (let m = 0; m < 16; m++) W.parts.emit(r.x, r.y + 1, r.z, rand(-7, 7), rand(2, 9), rand(-7, 7), pick(['#ff4f3a', '#ffc531', '#fffdf7']), .7); disposeObj(r.mesh); G.rockets.splice(n, 1); }
  }
}

/* ================= v7 : tirage d'objets équitable ================= */
// r = 0 : en tête, r = 1 : loin derrière (mélange place + écart réel avec le premier)
function itemOdds(k) {
  const ks = G.karts.filter((o) => !o.finished), n = Math.max(2, G.karts.length); let lead = -Infinity; for (const o of ks) lead = Math.max(lead, o.prog);
  const place = k ? k.place : 4; const pf = clamp((place - 1) / (n - 1), 0, 1);
  const gap = k && isFinite(lead) ? Math.max(0, (lead - k.prog) * G.W.S.seg) : 0, df = clamp(gap / 650, 0, 1);
  const r = clamp(pf * .55 + df * .45, 0, 1), L = (a, b) => Math.max(0, a + (b - a) * r);
  const w = { oil: L(3, .2), mine: L(1.4, .1), boule: L(1.8, .8), shield: L(2.2, .4), turbo: L(.9, 2.4), triple: L(0, 2.2), rocket: L(.2, 2.4),
    fantome: L(.6, .9), aimant: L(0, 1.7), eclair: r > .62 ? (r - .62) * 4 : 0, etoile: r > .45 ? (r - .45) * 3.2 : 0 };
  if (place === 1) { w.rocket = 0; w.eclair = 0; w.etoile = 0; w.aimant = 0; w.triple = 0; w.turbo *= .5; }
  else if (place === 2 && gap < 60) { w.eclair = 0; w.etoile *= .2; }
  const R = G.race; const now = R ? R.t : 0;
  if (G.lastEclair != null && now - G.lastEclair < 25) w.eclair = 0;                 // un seul éclair toutes les 25 s
  if (G.karts.some((o) => o.star > 0)) w.etoile *= .25;
  if (k && k.lastItems) for (const it of k.lastItems) if (w[it]) w[it] *= .15;       // pas deux fois de suite le même
  return w;
}
function rollItem(place, k) {
  const w = itemOdds(k); let tot = 0; for (const n in w) tot += w[n]; if (tot <= 0) return 'boule';
  let x = Math.random() * tot; for (const n in w) { x -= w[n]; if (x <= 0) return n; } return 'boule';
}
// roulette dans le HUD : défile vite puis ralentit avant de s'arrêter
const ROLL_TIME = 1.25;
function hudRoulette(P) {
  const t = ROLL_TIME - P.roll, frac = clamp(t / ROLL_TIME, 0, 1);
  const pos = Math.floor(t * 16 - frac * frac * t * 9);
  const ic = ITEM_KEYS[((pos % ITEM_KEYS.length) + ITEM_KEYS.length) % ITEM_KEYS.length];
  if (lastItemShown !== 'r' + ic) { hud.item.innerHTML = ICONS[ic]; lastItemShown = 'r' + ic; hud.item.classList.add('roll'); AudioSys.tone(1200 + (pos % 2) * 300, .025, 'square', .035); }
}

/* ---- IA ---- */
function lineSteer(k) { const [P, ti] = aheadOn(k, 14, null); const d = angDiff(k.h, Math.atan2(P.px[ti] - k.x, P.pz[ti] - k.z)); return clamp(-d * 2.4, -1, 1); }
function aiControl(k, dt) {
  const W = G.W, S = W.S, N = S.N, ai = k.ai, R = G.race;
  ai.laneT -= dt; if (ai.laneT <= 0) { ai.laneT = rand(2, 5); ai.laneGoal = rand(-.42, .42); } ai.lane = lerp(ai.lane, ai.laneGoal, dt * .6);
  const CP = k.P || S, ci = clamp(k.idx, 0, CP.N - 1); const wb = aiBranch(k); let back = null;
  if (CP !== S && k.idx <= CP.jA && ai.br && ai.br[CP.id] && !ai.br[CP.id].take) back = k.mainIdx;
  const AH = (n) => (back != null ? [S, (back + n) % N] : aheadOn(k, n, wb));
  let cs = 0; for (let o = 4; o <= 44; o += 4) { const [p, j] = AH(o); cs += p.curv[j]; }
  const look = Math.round(6 + Math.max(0, k.speed) * .2); const [TP, ti] = AH(look); const thw = TP.hw || W.hw;
  let lat = ai.lane * thw - clamp(cs * 30, -.55, .55) * thw;
  for (const h of G.hazards) { const di = Math.round((h.x - CP.px[ci]) * CP.fx[ci] + (h.z - CP.pz[ci]) * CP.fz[ci]); if (di > 0 && di < 35) { const hl = (h.x - TP.px[ti]) * TP.rx[ti] + (h.z - TP.pz[ti]) * TP.rz[ti]; if (Math.abs(hl - lat) < 3.5) lat = hl + (hl > 0 ? -4.5 : 4.5); } }
  lat = clamp(lat, -thw * .82, thw * .82);
  let tx = TP.px[ti] + TP.rx[ti] * lat, tz = TP.pz[ti] + TP.rz[ti] * lat;
  // obstacles : on vise le côté libre au niveau de l'obstacle le plus proche
  { let av = null; const clock = G.W.clock || 0;
    for (const o of G.W.obst || []) {
      if (o.P !== CP && o.P !== TP) continue; if (ai.avoid != null && ai.avoid < 1 && ((o.i * 131 + (ai.seed || 0)) % 100) / 100 >= ai.avoid) continue; const da = (o.x - CP.px[ci]) * CP.fx[ci] + (o.z - CP.pz[ci]) * CP.fz[ci]; if (da < -3 || da > 62) continue; if ((o.x - k.x) ** 2 + (o.z - k.z) ** 2 > 72 * 72) continue; if (o.P === CP) { let di = o.i - ci; if (CP.closed !== false) di = ((di % CP.N) + CP.N * 1.5) % CP.N - CP.N * .5; if (di * CP.seg < -6 || di * CP.seg > 72) continue; } if (Math.abs(o.y - CP.py[ci]) > 6) continue;
      const tArr = Math.max(0, da) / Math.max(12, k.speed), tc = clock + tArr;
      if (o.kind === 'crusher' || o.kind === 'jet') { const c = ((tc / o.per + o.ph / TAU) % 1 + 1) % 1; if (o.kind === 'jet' ? (c < .36 || c > .86) : (c < .38 || c > .8)) continue; }
      let ol = o.lat; if (o.kind === 'roller' || o.kind === 'walker') ol += Math.sin(tc * TAU / o.per + o.ph) * o.amp;
      const clr = o.r + (o.kind === 'pillar' ? 2.4 : 3.1), P2 = o.P, room = (P2.hw || W.hw) * .86;
      const cur = (k.x - P2.px[o.i]) * P2.rx[o.i] + (k.z - P2.pz[o.i]) * P2.rz[o.i];
      if (Math.abs(cur - ol) > clr + 2 && Math.abs(lat - ol) > clr) continue;
      const l1 = ol - clr, l2 = ol + clr, ok1 = l1 >= -room, ok2 = l2 <= room;
      const want = ok1 && ok2 ? (Math.abs(l1 - cur) < Math.abs(l2 - cur) ? l1 : l2) : ok1 ? l1 : l2;
      if (!av || da < av.da) av = { o, da, want };
    }
    if (av) { const P2 = av.o.P, j = clamp(av.o.i + (av.da < 12 ? 7 : 0), 0, P2.N - 1); tx = P2.px[j] + P2.rx[j] * av.want; tz = P2.pz[j] + P2.rz[j] * av.want; } }
  const d = angDiff(k.h, Math.atan2(tx - k.x, tz - k.z)); let steer = clamp(-d * 2.6, -1, 1);
  if (ai.err) { ai.errT = (ai.errT != null ? ai.errT : rand(2, 6)) - dt; if (ai.errT < 0) { if (Math.random() < ai.err) ai.wob = rand(.5, .9); ai.errT = rand(2.5, 6); } if (ai.wob > 0) { ai.wob -= dt; steer = clamp(steer + Math.sin(ai.wob * 8 + (ai.seed || 0)) * .75, -1, 1); } }
  let mult = (k.isPlayer ? CC[R.cc].ai * 1.02 : CC[R.cc].ai) * ai.skill;
  const P = R.player;
  let ref = P; if (R.online && !k.isPlayer) { ref = null; for (const o of G.karts) if (!o.isAI && !o.finished && (!ref || o.prog > ref.prog)) ref = o; }
  if (ref && !k.isPlayer && R.state !== 'attract') { const gap = (k.prog - ref.prog) * S.seg; mult *= 1 - clamp(gap / 1400, -.08 * (ai.rubB || 1), .09 * (ai.rubA || 1)); }
  let tgt = k.maxSpeed * mult; const sharp = Math.abs(cs);
  if (sharp > .08) tgt *= clamp(1 - (sharp - .08) * 2.4 * (W.def.grip ? 1.7 : 1), .5, 1);
  let drift = false;
  if (ai.drifty && sharp > .1 && k.speed > k.maxSpeed * .55 && Math.abs(steer) > .45) drift = true;
  if (k.drift && Math.abs(steer) > .2 && sharp > .05) drift = true;
  const throttle = k.speed < tgt ? 1 : 0;
  // coincé contre un obstacle ou un mur : marche arrière puis on repart
  if (R.state === 'race' && !k.air && k.spin <= 0 && Math.abs(k.speed) < 3) ai.stuckT = (ai.stuckT || 0) + dt; else ai.stuckT = 0;
  if (ai.stuckT > 1.1) { ai.stuckT = 0; ai.backT = rand(.75, 1); ai.backS = steer > 0 ? -1 : 1; }
  if (ai.backT > 0) { ai.backT -= dt; return { steer: ai.backS, throttle: 0, drift: false, brake: true, noBrake: false }; }
  // objets
  if (k.item && CP.offroad && ['turbo', 'triple', 'etoile'].includes(k.item) && k.boost <= .1) useItem(k);
  if (k.item) {
    ai.itemT -= dt * (ai.itemRate || 1);
    if (ai.itemT <= 0) {
      const ahead = (lim) => G.karts.some((o) => o !== k && o.prog - k.prog > 3 && o.prog - k.prog < lim), behind = (lim) => G.karts.some((o) => o !== k && k.prog - o.prog > 2 && k.prog - o.prog < lim);
      let use = aiUse11(k, ahead, behind, ai) || false;
      switch (k.item) {
        case 'turbo': case 'triple': use = sharp < .05 || ai.itemT < -3; break;
        case 'shield': case 'etoile': use = true; break;
        case 'oil': case 'mine': use = !k.air && (behind(16) || ai.itemT < -6); break;
        case 'rocket': use = ahead(110); break;
        case 'boule': use = ahead(40) || ai.itemT < -5; break;
        case 'eclair': use = k.place > 3 || ai.itemT < -4; break;
        case 'aimant': use = ahead(45) || ai.itemT < -4; break;
        case 'fantome': use = G.rockets.some((r) => r.target === k) || ai.itemT < -8; break;
      }
      if (use) { useItem(k); if (k.item === 'triple') ai.itemT = rand(.6, 1.5); }
    }
  }
  return { steer, throttle, drift, noBrake: true };
}

/* ---- boucle de simulation ---- */
let camSnap = true; const camH = { v: 0 }; const tmpV = new T.Vector3(); const lookV = new T.Vector3();
function simStep(dt) {
  const R = G.race, W = G.W; if (!R || !W) return;
  R.timer += dt;
  if (R.goAt && (R.state === 'intro' || R.state === 'countdown')) {
    // en ligne : départ calé sur l'horloge, identique pour tout le monde
    const left = (R.goAt - performance.now()) / 1000;
    if (left > 3) { R.state = 'intro'; R.timer = clamp(2.4 - (left - 3) * .7, 0, 2.4); }
    else if (left > 0) { if (R.state === 'intro') { R.state = 'countdown'; R.countN = 4; } const n = Math.ceil(left); if (n !== R.countN && n >= 1 && n <= 3) { R.countN = n; countdown(String(n)); AudioSys.sfx('beep'); } R.timer = 0; }
    else { R.state = 'race'; R.timer = 0; R.t = Math.max(0, -left); countdown('GO !', true); AudioSys.sfx('go'); for (const k of G.karts) if (!k.isPlayer && !k.isRemote) k.speed = k.maxSpeed * .15 * k.ai.skill; goBoosts(R); }
  } else if (R.state === 'intro') { if (R.timer > 2.4) { R.state = 'countdown'; R.timer = 0; R.countN = 4; } }
  else if (R.state === 'countdown' && !R.goAt) {
    const n = 3 - Math.floor(R.timer);
    if (n !== R.countN && n >= 1) { R.countN = n; countdown(String(n)); AudioSys.sfx('beep'); }
    if (R.timer >= 3) { R.state = 'race'; R.timer = 0; R.t = 0; countdown('GO !', true); AudioSys.sfx('go'); for (const k of G.karts) if (!k.isPlayer && !k.isRemote) k.speed = k.maxSpeed * .15 * k.ai.skill; goBoosts(R); }
  }
  const racing = R.state === 'race' || R.state === 'finished' || R.state === 'attract';
  if (R.state === 'race' || R.state === 'finished') R.t += dt;
  const frozen = !racing;
  const pin = updateSteerInput(dt);
  if (R.player && (R.state === 'intro' || R.state === 'countdown')) { const sk = SAVE.throttle === 'manual' ? pin.gas : pin.drift; if (sk && !R.pDrift) R.pDriftAt = R.state === 'countdown' ? (R.goAt ? (R.goAt - performance.now()) / 1000 : 3 - R.timer) : 99; R.pDrift = sk; }
  for (const k of G.karts) {
    if (k.isRemote) { updateRemote(k, dt); continue; }
    let inp;
    if (frozen) inp = { steer: 0, throttle: 0, drift: false };
    else if (k.isPlayer && !G.autopilot && R.state === 'race') {
      inp = { steer: pin.steer, throttle: SAVE.throttle === 'manual' ? (pin.gas || pin.drift ? 1 : 0) : 1, drift: pin.drift, brake: pin.brake };
      if (k.magnet > 0) inp.steer = lerp(inp.steer, lineSteer(k), .65);
      if (Input.itemEdge) { useItem(k); }
    } else inp = aiControl(k, dt);
    if (frozen) { k.speed = 0; trackLocate(k); continue; }
    kartPhysics(k, inp, dt);
  }
  Input.itemEdge = false;
  W.clock = (W.clock || 0) + dt; updateObstacles(W.clock); updateGates(W, W.clock); updateWeather(W, W.clock, dt); updateChameleon(W, W.clock, dt); updateZones(W, dt); policeUpdate(dt);
  if (racing) { collideKarts(); updateItems(dt); updateBoxes(dt); }
  // classement
  const live = G.karts.filter((k) => !k.finished).sort((a, b) => b.prog - a.prog);
  const order = (R.order || []).concat(live); order.forEach((k, i) => (k.place = i + 1));
  if (R.state === 'race') {
    const P = R.player;
    const PP = P.P || W.S, pj = clamp(P.idx, 0, PP.N - 1); const dot = Math.sin(P.vh) * PP.fx[pj] + Math.cos(P.vh) * PP.fz[pj];
    if (dot < -.4 && P.speed > 4) P.wrongT += dt; else P.wrongT = 0;
    if (R.pt) { if (P.wrongT > 2 && !R.pt.wf) { R.pt.wf = true; if (R.pt.wrong < 2) { R.pt.wrong++; banner('Mauvais sens : +1', 1.6, true); } } if (P.wrongT === 0) R.pt.wf = false; }
  }
  if (R.state === 'finished') { R.timer2 = (R.timer2 || 0) + dt; if (R.timer2 > 3.5 && !R.resultsShown) showResults(); }
  if (R.spec) specTick(dt);
}
// départ turbo : DRIFT pressé dans la dernière seconde du compte à rebours
function goBoosts(R) {
  const P = R.player; if (P && R.pDriftAt != null && R.pDriftAt > .12 && R.pDriftAt < 1.05 && (SAVE.throttle !== 'manual' || R.pDrift)) { P.boost = 1.3; P.speed = P.maxSpeed * .5; banner('Départ turbo !', 1.2); AudioSys.sfx('boost'); vibrate(30); }
  for (const k of G.karts) if (!k.isPlayer && !k.isRemote && Math.random() < .35) k.boost = .9;
  const h = $('#hints'); if (h) setTimeout(() => (h.hidden = true), 2500);
}
function playerFinished() {
  const R = G.race; R.state = 'finished'; R.timer2 = 0; const P = R.player;
  banner(P.place === 1 ? 'Victoire !' : 'Arrivée : ' + P.place + (P.place === 1 ? 'er' : 'e'), 3.4); AudioSys.sfx('finish'); vibrate([40, 60, 40]);
  const rec = SAVE.records[TRACKS[R.ti].id] || {}; rec.lap = Math.min(rec.lap || Infinity, P.bestLap); rec.race = Math.min(rec.race || Infinity, P.finishTime);
  SAVE.records[TRACKS[R.ti].id] = rec; store();
}

/* ---- visuel par image ---- */
function updateVisuals(dt) {
  const R = G.race, W = G.W, S = W.S; const now = performance.now() / 1000;
  W.padTex.offset.y -= dt * 1.6; if (W.anim) for (const f of W.anim) f(dt, now);
  for (const k of G.karts) {
    const M = k.mesh; M.g.position.set(k.x, k.y + .1, k.z);
    const KP = k.P || S, kj = clamp(k.idx, 0, KP.N - 1); const tdot = Math.sin(k.h) * KP.fx[kj] + Math.cos(k.h) * KP.fz[kj];
    k.driftVis = lerp(k.driftVis || 0, (k.drift || 0) * (.26 + .16 * (k.driftA || 0)), 1 - Math.exp(-dt * 9));
    M.g.rotation.set(0, k.h + k.spinAng + k.driftVis, k.trickT > 0 ? (k.trickDir || 1) * (1 - k.trickT / .45) * TAU : 0);
    const warped = warpKartPose(k, M);
    M.tilt.rotation.x = warped ? 0 : -Math.atan(KP.slope[kj] * tdot);
    M.tilt.rotation.z = lerp(M.tilt.rotation.z, k.drift * .1 + (k.drift ? 0 : -clamp(angDiff(k.vh, k.h), -.3, .3) * .3), 1 - Math.exp(-dt * 8));
    animateGlider(k, M, dt, now);
    if (k.air) { M.tilt.rotation.z += (k.isPlayer ? -(Input.tiltSteer + Input.digSteer + Input.stickSteer) * .25 : 0); M.tilt.rotation.x -= clamp(-(k.vy || 0) * .03, -.3, .3); }
    { const q = k.squash > 0 ? Math.sin(k.squash / .3 * Math.PI) : 0; M.tilt.scale.set(1 + q * .1, 1 - q * .16, 1 + q * .1); }
    M.tilt.visible = !(k.ghost > 0 && Math.floor(now * 12) % 2 === 0);
    if (k.droneT > 0 || M.drone) { if (!M.drone) { M.drone = droneMesh(); G.W.scene.add(M.drone); } k.droneT = Math.max(0, (k.droneT || 0) - dt); M.drone.visible = k.droneT > 0; M.drone.position.set(M.g.position.x, M.g.position.y + 3.4 + (k.droneT < .4 ? (.4 - k.droneT) * 20 : 0), M.g.position.z); M.drone.rotation.y += dt * 2; }
    cageVisual(k, M, dt);
    if (k.grapT > 0 && k.grapTg) { if (!M.rope) { const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(6), 3)); M.rope = new T.Line(gg, new T.LineBasicMaterial({ color: '#ffc531' })); M.rope.frustumCulled = false; G.W.scene.add(M.rope); } const a = M.rope.geometry.attributes.position; a.setXYZ(0, k.x, k.y + 1.2, k.z); a.setXYZ(1, k.grapTg.x, k.grapTg.y + 1, k.grapTg.z); a.needsUpdate = true; M.rope.visible = true; } else if (M.rope) M.rope.visible = false;
    { const tsc = k.shrink > 0 ? .62 : 1; const cur = M.g.scale.x; M.g.scale.setScalar(lerp(cur, tsc, 1 - Math.exp(-dt * 8))); }
    if (k.star > 0 && Math.random() < .9) W.parts.emit(k.x + rand(-1.5, 1.5), k.y + rand(.3, 2), k.z + rand(-1.5, 1.5), rand(-1, 1), rand(1, 3), rand(-1, 1), pick(['#ff4f3a', '#ffc531', '#3ee08f', '#38b6ff', '#a87dff']), .45);
    if (k.magnet > 0 && Math.random() < .6) W.parts.emit(k.x + Math.sin(k.h) * 3, k.y + 1, k.z + Math.cos(k.h) * 3, Math.sin(k.h) * 8, 0, Math.cos(k.h) * 8, '#6fd8ff', .3, 0);
    M.tilt.position.y = k.hop > 0 ? Math.sin((k.hop / .22) * Math.PI) * .45 : (k.off && k.speed > 5 ? Math.sin(now * 40 + k.x) * .04 : 0);
    for (const w of M.wheels) w.m.rotation.x += k.speed / w.r * dt;
    const st = k.isPlayer && !G.autopilot ? Input.tiltSteer + Input.digSteer + Input.stickSteer : (k.drift ? k.drift * .6 : 0);
    for (const f of M.fronts) f.rotation.y = lerp(f.rotation.y, -clamp(st, -1, 1) * .45, 1 - Math.exp(-dt * 12));
    const fl = k.boost > 0 ? 1.4 + Math.random() * .6 : (k.speed > 1 ? .25 : .05);
    const tc = M.trail; for (const f of M.flames) { f.scale.z = lerp(f.scale.z, fl * (f.userData.s || 1) * .8 + .2 * fl, .5); f.material.color.set(k.boost > 0 ? tc[Math.floor(now * 12) % tc.length] : tc[0]); }
    M.shield.visible = k.shield > 0; if (k.shield > 0) M.shield.scale.setScalar(1 + Math.sin(now * 8) * .04);
    if (k.bubble > 0 && !M.bub) { M.bub = new T.Mesh(new T.SphereGeometry(2.4, 24, 16), new T.MeshStandardMaterial({ color: '#bfefff', transparent: true, opacity: .35, roughness: .05, metalness: .2, emissive: '#7fdfff', emissiveIntensity: .25, depthWrite: false })); M.bub.position.y = 1; M.g.add(M.bub); }
    if (M.bub) { M.bub.visible = k.bubble > 0; if (k.bubble > 0) M.bub.scale.setScalar(1 + Math.sin(now * 6) * .05); }
    // étincelles de dérapage
    if (k.drift && k.speed > 5) {
      const tier = k.driftTier || 0; const col = DRIFT_COLORS[tier]; const n = tier >= 2 ? 3 : tier ? 2 : 1;
      for (const sg of [-1, 1]) for (let q = 0; q < n; q++) {
        const bx = k.x - Math.sin(k.h) * 1.1 + Math.cos(k.h) * sg * 1.05, bz = k.z - Math.cos(k.h) * 1.1 - Math.sin(k.h) * sg * 1.05;
        W.parts.emit(bx, k.y + .3, bz, rand(-2, 2) - Math.sin(k.h) * 4, rand(1.5, 4), rand(-2, 2) - Math.cos(k.h) * 4, col, .28);
      }
    }
    if (k.off && Math.abs(k.speed) > 8 && Math.random() < .5) {
      const dc = { grass: '#7a6a3a', sand: '#e0b46a', concrete: '#9a98b0', redsand: '#c8643a', ash: '#4a4048', cloud: '#ffffff', moss: '#2a5a40', jungle: '#6a5a3a', moon: '#b0b0ba', seabed: '#c8d8c0', rock: '#9a9a90', candy: '#ffc8e0', graveyard: '#4a4a3a', sakura: '#ffc0d8', savanna: '#d8b068', fair: '#ffc531', space: '#8a8aff', lavender: '#b89ad8', autumn: '#d8883a', tropic: '#f0dca8', antique: '#d8c8a0' }[W.th.ground] || '#ffffff';
      W.dust.emit(k.x - Math.sin(k.h) * 1.4, k.y + .4, k.z - Math.cos(k.h) * 1.4, rand(-1.5, 1.5), rand(1, 3), rand(-1.5, 1.5), dc, .7, .3);
    }
    if (W.th.underwater && Math.abs(k.speed) > 5 && Math.random() < .3) W.parts.emit(k.x - Math.sin(k.h) * 1.8, k.y + .9, k.z - Math.cos(k.h) * 1.8, rand(-.4, .4), rand(1.5, 3), rand(-.4, .4), '#bff4ff', .9, -.25);
    if (k.boost > 0 && Math.random() < .7) W.parts.emit(k.x - Math.sin(k.h) * 2.2, k.y + .85, k.z - Math.cos(k.h) * 2.2, rand(-1, 1), rand(0, 1.5), rand(-1, 1), pick(M.trail), .3, 0);
  }
  W.parts.update(dt); W.dust.update(dt);
  if (W.flocks) updateFlocks(W, now);
  if (W.tick) for (const f of W.tick) f(dt, now);
  if (W.caustic) { W.caustic.offset.x = now * .02; W.caustic.offset.y = Math.sin(now * .3) * .1; }
  if (W.rays) for (let i = 0; i < W.rays.length; i++) W.rays[i].material.opacity = .2 + Math.sin(now * .5 + i * 1.7) * .1;
  if (W.waterTex) { W.waterTex.offset.x += dt * .012; W.waterTex.offset.y += dt * .006; if (W.foam) W.foam.material.opacity = .4 + Math.sin(now * 1.3) * .15; }
  if (W.crowd && R.state !== 'attract') W.crowd.g.position.y = G.W.S.py[(G.W.S.N - 22) % G.W.S.N] + Math.abs(Math.sin(now * 6)) * .06;
  if (W.auroras) for (let a = 0; a < W.auroras.length; a++) W.auroras[a].material.opacity = .55 + Math.sin(now * .7 + a * 2) * .35;
  if (W.embers) { const p = W.embers.pos, up = W.embers.slow ? .6 : 4; for (let i = 0; i < W.embers.n; i++) { p[i * 3 + 1] += dt * up * (W.embers.slow ? Math.sin(now + i) : 1); p[i * 3] += Math.sin(now * 2 + i) * dt * (W.embers.slow ? 2 : 1); if (p[i * 3 + 1] > 40) p[i * 3 + 1] -= 40; if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 40; } W.embers.p.geometry.attributes.position.needsUpdate = true; W.embers.p.position.set(camera.position.x, camera.position.y - 10, camera.position.z); }
  if (W.lavaGlow || W.th.lava) { LAVA_TEX.offset.x += dt * .01; LAVA_TEX.offset.y += dt * .004; }
  if (W.snow) { const p = W.snow.pos; for (let i = 0; i < W.snow.n; i++) { p[i * 3 + 1] -= dt * 6; p[i * 3] += Math.sin(now + i) * dt * .8; if (p[i * 3 + 1] < -2) p[i * 3 + 1] += 40; } W.snow.p.geometry.attributes.position.needsUpdate = true; W.snow.p.position.set(camera.position.x, camera.position.y - 15, camera.position.z); }
  updateCamera(dt);
  W.sky.position.copy(camera.position);
  const tgt = R.player || (R.state === 'attract' ? G.karts[R.camK] : null);
  for (const k of G.karts) { if (k === tgt) { k.mesh.g.visible = true; continue; } const d2 = (k.x - camera.position.x) ** 2 + (k.z - camera.position.z) ** 2 + (k.y + 1 - camera.position.y) ** 2; k.mesh.g.visible = d2 > 12; }
}
function updateCamera(dt) {
  const R = G.race; const S = G.W.S;
  let k = R.spec || R.player, mode = 'chase';
  if (R.state === 'attract') {
    R.camT += dt; if (R.camT > 7) { R.camT = 0; R.camMode = (R.camMode + 1) % 3; R.camK = (R.camK + 3) % G.karts.length; camSnap = true; }
    k = G.karts[R.camK]; mode = ['chase', 'side', 'front'][R.camMode];
  }
  if (R.state !== 'intro' && mode === 'chase' && warpCamera(k, dt, camera.aspect < 1)) return;
  const portrait = camera.aspect < 1; const fovT = (portrait ? 82 : 68) + (k.boost > 0 ? 9 : 0) + clamp(k.speed / k.maxSpeed, 0, 1.2) * 4;
  camera.fov = lerp(camera.fov, fovT, 1 - Math.exp(-dt * 4)); camera.updateProjectionMatrix();
  if (camSnap) camH.v = k.vh; camH.v += angDiff(camH.v, k.vh + (k.drift ? angDiff(k.vh, k.h) * .35 : 0)) * (1 - Math.exp(-dt * 6));
  const fx = Math.sin(camH.v), fz = Math.cos(camH.v);
  if (R.state === 'intro' && mode === 'chase') {
    const a = camH.v + Math.PI * (1 - Math.min(1, R.timer / 2.3)) ** 2 * 1.4 + .0001; const dist = 9 + (1 - Math.min(1, R.timer / 2.3)) * 9;
    tmpV.set(k.x - Math.sin(a) * dist, k.y + 3.6 + (1 - Math.min(1, R.timer / 2.3)) * 5, k.z - Math.cos(a) * dist); camera.position.copy(tmpV);
    lookV.set(k.x, k.y + 1.5, k.z); camera.lookAt(lookV); camSnap = false; return;
  }
  if (mode === 'side') { tmpV.set(k.x + Math.cos(camH.v) * 9 - fx * 3, k.y + 2.5, k.z - Math.sin(camH.v) * 9 - fz * 3); lookV.set(k.x + fx * 3, k.y + 1, k.z + fz * 3); }
  else if (mode === 'front') { tmpV.set(k.x + fx * 11, k.y + 1.6, k.z + fz * 11); lookV.set(k.x, k.y + 1.2, k.z); }
  else { const dist = (portrait ? 10.5 : 8.6) + (k.air === 'glide' ? 1.2 : 0), hgt = (portrait ? 4.4 : 3.5) + (k.air === 'glide' ? 1.5 : k.air ? 1.0 : 0); tmpV.set(k.x - fx * dist, k.y + hgt, k.z - fz * dist); lookV.set(k.x + fx * 6, k.y + 1.5, k.z + fz * 6); }
  if (camSnap) camera.position.copy(tmpV); else camera.position.lerp(tmpV, 1 - Math.exp(-dt * (mode === 'chase' ? 9 : 4)));
  camera.position.y = Math.max(camera.position.y, k.y + 1.2);
  camera.lookAt(lookV); camSnap = false;
  const sun = G.W.sun; if (sun && sun.castShadow) { sun.target.position.set(k.x, k.y, k.z); sun.position.set(k.x + 110, k.y + 160, k.z + 60); }
}

/* ================= HUD ================= */
const hud = { pos: $('#h-pos'), suf: $('#h-suf'), posbox: $('#h-posbox'), lap: $('#h-lap'), time: $('#h-time'), item: $('#h-item'), map: $('#h-map'), kmh: $('#h-kmh'), banner: $('#h-banner'), count: $('#h-count') };
let mapBg = null, mapXf = null, lastItemShown = '';
function showHud(on) { $('#hud').hidden = !on; { const lb = $('#h-lap') && $('#h-lap').previousElementSibling; if (lb && G.W) lb.textContent = G.W.def.sections ? 'SECTION' : 'TOUR'; } const pad = $('#pad'); pad.hidden = !on; pad.className = padClass(); $('#spec').hidden = true; $('#hud').classList.remove('spec'); $('#b-pause').hidden = false; if (on) requestAnimationFrame(stickRest); const sf = $('#speedfx'); if (sf) sf.classList.remove('on'); if (on) buildMapBg(); hud.count.textContent = ''; hud.banner.className = ''; }
function buildMapBg() {
  const S = G.W.S, c = hud.map, w = c.width; let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity;
  for (const P of [S].concat(G.W.branches)) for (let i = 0; i < P.N; i++) { a = Math.min(a, P.px[i]); b = Math.max(b, P.px[i]); e = Math.min(e, P.pz[i]); f = Math.max(f, P.pz[i]); }
  const sc = (w - 24) / Math.max(b - a, f - e); const ox = (w - (b - a) * sc) / 2, oz = (w - (f - e) * sc) / 2;
  mapXf = (x, z) => [ox + (b - x) * sc, oz + (f - z) * sc];
  mapBg = document.createElement('canvas'); mapBg.width = mapBg.height = w; const x = mapBg.getContext('2d');
  x.lineJoin = 'round'; x.lineCap = 'round';
  const path = () => { x.beginPath(); for (let i = 0; i <= S.N; i += 3) { const [u, v] = mapXf(S.px[i % S.N], S.pz[i % S.N]); i ? x.lineTo(u, v) : x.moveTo(u, v); } x.closePath(); };
  const bpath = (B) => { x.beginPath(); for (let j = 0; j < B.N; j += 3) { const [u, v] = mapXf(B.px[j], B.pz[j]); j ? x.lineTo(u, v) : x.moveTo(u, v); } const [u, v] = mapXf(B.px[B.N - 1], B.pz[B.N - 1]); x.lineTo(u, v); };
  path(); x.strokeStyle = '#17143a'; x.lineWidth = 14; x.stroke(); for (const B of G.W.branches) { bpath(B); x.lineWidth = 11; x.stroke(); }
  path(); x.strokeStyle = '#fffdf7'; x.lineWidth = 7; x.stroke(); for (const B of G.W.branches) { bpath(B); x.strokeStyle = '#ffc531'; x.lineWidth = 5; x.stroke(); }
  const [u0, v0] = mapXf(S.px[0], S.pz[0]); x.fillStyle = '#ff4f3a'; x.beginPath(); x.arc(u0, v0, 5, 0, TAU); x.fill();
}
function drawMap() {
  const c = hud.map, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(mapBg, 0, 0);
  const sorted = G.karts.slice().sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
  for (const k of sorted) { const [u, v] = mapXf(k.x, k.z); x.beginPath(); x.arc(u, v, k.isPlayer ? 7 : 5, 0, TAU); x.fillStyle = k.cfg.color; x.fill(); x.lineWidth = 2.5; x.strokeStyle = k.isPlayer ? '#ffc531' : '#17143a'; x.stroke(); }
}
let bannerTimer = 0, countTimer = 0, hudTick = 0; const hudCache = {};
function banner(txt, dur, warn) { hud.banner.textContent = txt; hud.banner.className = 'on' + (warn ? ' warn' : ''); bannerTimer = dur; }
function countdown(txt, go) { hud.count.textContent = txt; hud.count.className = (go ? 'go ' : '') + 'pulse'; void hud.count.offsetWidth; countTimer = go ? .9 : 1.2; }
function updateHud(dt) {
  const R = G.race, P = R.player; if (!P) return;
  hudTick += dt; const slow = hudTick >= 1 / 15; if (slow) hudTick = 0;
  const lap = G.W.def.sections ? sectionOf(P) + '/3' : clamp(P.lap, 1, LAPS) + '/' + LAPS;
  if (G.W.def.sections && R.state === 'race' && !P.finished) { const sc = sectionOf(P); if (R.lastSec && sc > R.lastSec) { banner(sc === 3 ? 'Dernière section !' : 'Section ' + sc + '/3', 1.8); AudioSys.sfx(sc === 3 ? 'final' : 'lap'); } R.lastSec = sc; }
  if (P.place !== hudCache.place) { hudCache.place = P.place; hud.pos.textContent = P.place; hud.suf.textContent = P.place === 1 ? 'er' : 'e'; hud.posbox.classList.toggle('p1', P.place === 1); }
  if (lap !== hudCache.lap) { hudCache.lap = lap; hud.lap.textContent = lap; }
  if (slow) { hud.time.textContent = fmtTime(P.finished ? P.finishTime : R.t); hud.kmh.textContent = Math.max(0, Math.round(P.speed * 2.6)); }
  let key = P.item ? P.item + (P.item === 'triple' ? P.uses : '') : (P.roll > 0 ? 'roll' : '');
  if (key === 'roll') hudRoulette(P);
  else if (key !== lastItemShown) { hud.item.dataset.rar = P.item ? RARITY[P.item] || '' : ''; const was = lastItemShown; hud.item.innerHTML = P.item ? ICONS[P.item] + (P.item === 'triple' ? '<b class="ibadge">×' + P.uses + '</b>' : '') : ''; lastItemShown = key; hud.item.classList.remove('roll'); if (P.item && was && was[0] === 'r') { hud.item.classList.remove('got'); void hud.item.offsetWidth; hud.item.classList.add('got'); } }
  { const sf = $('#speedfx'); const on = P.boost > 0 && P.speed > P.maxSpeed * 1.04; if (sf && sf.classList.contains('on') !== on) sf.classList.toggle('on', on); }
  if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) hud.banner.className = ''; }
  if (countTimer > 0) { countTimer -= dt; if (countTimer <= 0) hud.count.textContent = ''; }
  if (R.state === 'race' && P.wrongT > 1.2 && bannerTimer <= 0) { banner('Mauvais sens !', .8, true); }
  if (slow) drawMap();
  AudioSys.engine(clamp(Math.abs(P.speed) / P.maxSpeed, 0, 1.4), !G.paused && R.state !== 'intro', P.boost > 0, !!P.drift);
}

/* ================= Résultats & Grand Prix ================= */
function estimateFinish() {
  const R = G.race, S = G.W.S; const total = LAPS * S.N;
  for (const k of G.karts) if (!k.finished) { const left = Math.max(0, total - k.prog) * S.seg; k.finishTime = R.t + left / (k.maxSpeed * .85); }
  return G.karts.slice().sort((a, b) => (a.finished === b.finished ? a.finishTime - b.finishTime : a.finished ? -1 : 1));
}
/* ---- spectateur : après l'arrivée, on suit ceux qui roulent encore ---- */
function specList() { const live = G.karts.filter((k) => !k.finished).sort((a, b) => b.prog - a.prog); return live.filter((k) => !k.isAI).concat(live.filter((k) => k.isAI)); }
function canSpectate() { const R = G.race; return !!(R && R.state === 'finished' && UI.mode !== 'gp' && UI.mode !== 'party' && specList().length); }
function specStart() { const R = G.race, L = specList(); if (!R || !L.length) return; R.spec = L[0]; camSnap = true; show(null); $('#pad').hidden = true; $('#hud').classList.add('spec'); $('#spec').hidden = false; $('#b-pause').hidden = true; specUI(); }
function specShift(d) { const R = G.race, L = specList(); if (!L.length) return specEnd(); let i = L.indexOf(R.spec); i = ((i < 0 ? 0 : i + d) % L.length + L.length) % L.length; R.spec = L[i]; camSnap = true; specUI(); }
function specUI() { const k = G.race.spec; if (!k) return; $('#spec-name').textContent = k.name + (k.isAI ? ' (bot)' : ''); $('#spec-info').textContent = ordFr(k.place) + ' · tour ' + clamp(k.lap, 1, LAPS) + '/' + LAPS; }
function specEnd() { const R = G.race; if (!R) return; R.spec = null; $('#spec').hidden = true; $('#b-pause').hidden = false; $('#hud').classList.remove('spec'); showResults(); }
function specTick(dt) {
  const R = G.race; R.specT = (R.specT || 0) + dt; if (R.specT > .25) { R.specT = 0; specUI(); }
  if (R.spec.finished || !G.karts.includes(R.spec)) { const L = specList(); if (!L.length) { banner('Tout le monde est arrivé !', 1.6); setTimeout(() => { if (G.race === R && R.spec) specEnd(); }, 1600); R.spec = R.spec && G.karts.includes(R.spec) ? R.spec : R.player; R.specDone = true; return; } if (!R.specDone) { R.spec = L[0]; camSnap = true; specUI(); } }
}
$('#spec-prev').onclick = () => { AudioSys.sfx('click'); specShift(-1); };
$('#spec-next').onclick = () => { AudioSys.sfx('click'); specShift(1); };
$('#spec-res').onclick = () => { AudioSys.sfx('click'); specEnd(); };
function showResults() {
  $('#r-big').hidden = true; $('#r-table').className = '';
  if (G.race && G.race.online) return onlineResults();
  if (UI.mode === 'party' && UI.party) return partyResults();
  const R = G.race; R.resultsShown = true; const order = estimateFinish(); const P = R.player;
  const tb = $('#r-table'); tb.innerHTML = '';
  let gpLine = '';
  if (UI.mode === 'gp' && UI.gp) { order.forEach((k, i) => { UI.gp.points[k.name] = (UI.gp.points[k.name] || 0) + POINTS[i]; }); }
  order.forEach((k, i) => {
    const tr = document.createElement('tr'); if (k.isPlayer) tr.className = 'me';
    const cells = [String(i + 1), k.name, fmtTime(k.finishTime)]; if (UI.mode === 'gp') cells.push('+' + POINTS[i]);
    cells.forEach((c, j) => { const td = document.createElement('td'); td.textContent = c; if (j >= 2) td.className = 'r'; tr.appendChild(td); }); tb.appendChild(tr);
  });
  const place = order.indexOf(P) + 1;
  $('#r-title').textContent = place === 1 ? 'Victoire !' : place + (place === 1 ? 'er' : 'e') + ' place';
  const rec = SAVE.records[TRACKS[R.ti].id] || {};
  $('#r-sub').textContent = TRACKS[R.ti].name + ' · ' + CC[R.cc].name + ' · Meilleur tour ' + fmtTime(P.bestLap) + ' (record ' + fmtTime(rec.lap) + ')';
  const btns = $('#r-buttons'); btns.innerHTML = '';
  const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = '<span></span>'; b.firstChild.textContent = label; b.onclick = () => { AudioSys.sfx('click'); fn(); }; btns.appendChild(b); };
  if (UI.mode === 'gp' && UI.gp) {
    UI.gp.i++;
    if (UI.gp.i < TRACKS.length) { mk('Classement', 'ghost', showStandings); mk('Course suivante', 'red', () => launch()); }
    else mk('Classement final', 'red', showStandings);
  } else { mk('Menu', 'ghost', toMenu); if (canSpectate()) mk('Regarder la course', 'ghost', specStart); mk('Rejouer', 'red', () => launch()); }
  show('results');
}
function showStandings() {
  $('#r-big').hidden = true; $('#r-table').className = '';
  const gp = UI.gp; const list = Object.entries(gp.points).sort((a, b) => b[1] - a[1]); const tb = $('#r-table'); tb.innerHTML = '';
  list.forEach(([n, p], i) => { const tr = document.createElement('tr'); if (n === (SAVE.name || 'Toi')) tr.className = 'me'; [String(i + 1), n, p + ' pts'].forEach((c, j) => { const td = document.createElement('td'); td.textContent = c; if (j === 2) td.className = 'r'; tr.appendChild(td); }); tb.appendChild(tr); });
  const done = gp.i >= TRACKS.length; const me = list.findIndex(([n]) => n === (SAVE.name || 'Toi')) + 1;
  $('#r-title').textContent = done ? (me === 1 ? 'Coupe d\'or !' : me === 2 ? 'Coupe d\'argent' : me === 3 ? 'Coupe de bronze' : 'Grand Prix terminé') : 'Classement';
  $('#r-sub').textContent = done ? 'Tu termines ' + me + (me === 1 ? 'er' : 'e') + ' du Grand Prix ' + CC[gp.cc].name + '.' : 'Après ' + gp.i + ' course' + (gp.i > 1 ? 's' : '') + ' sur ' + TRACKS.length + '.';
  const btns = $('#r-buttons'); btns.innerHTML = '';
  const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = '<span></span>'; b.firstChild.textContent = label; b.onclick = () => { AudioSys.sfx('click'); fn(); }; btns.appendChild(b); };
  if (done) { mk('Menu', 'red', toMenu); } else { mk('Course suivante', 'red', () => launch()); }
  show('results');
}


/* ================= Mode Soirée ================= */
const PARTY_COLORS = ['#ff4f3a', '#38b6ff', '#ffc531', '#3ee08f', '#7c4dff', '#ff6fb5', '#f5f3ec', '#9be22d'];
const DARES = ['Fais un bruit de moteur pendant 10 secondes.', 'Commente la prochaine course comme à la télé.', 'Fais 10 squats.', 'Imite le pilote de ton choix.',
  'Fais la danse de la victoire du gagnant.', 'Parle sans dire « oui » ni « non » jusqu\'à ta prochaine course.', 'Fais un compliment à chaque joueur.',
  'Raconte ta pire chute, vraie ou inventée.', 'Tiens la position de la chaise pendant 20 secondes.', 'Parle avec un accent jusqu\'à la fin de la manche.',
  'Chante une chanson de ton choix pendant 15 secondes.', 'Fais le tour de la pièce en klaxonnant.'];
function partyCfg() { return Object.assign({ players: ['Joueur 1', 'Joueur 2'], track: -1, rounds: 3, type: 'sips', dose: 1, game: 'race', cats: ['soft', 'fun', 'jamais'] }, SAVE.party || {}); }
function unitWord(n) { const t = (UI.party || partyCfg()).type; return t === 'sips' ? (n > 1 ? 'gorgées' : 'gorgée') : (n > 1 ? 'points de gage' : 'point de gage'); }
function segSync(sel, v) { $$(sel + ' button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }
function renderParty() {
  const c = partyCfg(), list = $('#pt-list'); list.innerHTML = '';
  c.players.forEach((n, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pchip'; b.style.setProperty('--c', PARTY_COLORS[i % 8]);
    b.innerHTML = '<i></i><span></span><b aria-hidden="true">×</b>'; b.querySelector('span').textContent = n; b.setAttribute('aria-label', 'Retirer ' + n);
    b.onclick = () => { AudioSys.sfx('click'); c.players.splice(i, 1); SAVE.party = c; store(); renderParty(); }; list.appendChild(b);
  });
  chipsSel($('#pt-track'), [[-1, 'Hasard']].concat(TRACKS.map((t, i) => [i, t.name])), c.track, (v) => { const cc = partyCfg(); cc.track = v; SAVE.party = cc; store(); renderParty(); });
  const cats = $('#pt-cats'); cats.innerHTML = '';
  for (const k in QUIZ) { const b = document.createElement('button'); b.type = 'button'; b.textContent = QUIZ[k].name; b.setAttribute('aria-pressed', String(c.cats.includes(k)));
    b.onclick = () => { AudioSys.sfx('click'); const cc = partyCfg(); const i = cc.cats.indexOf(k); if (i >= 0) { if (cc.cats.length > 1) cc.cats.splice(i, 1); } else cc.cats.push(k); SAVE.party = cc; store(); renderParty(); }; cats.appendChild(b); }
  segSync('#pt-game', c.game); $('#pt-race-opts').hidden = c.game !== 'race'; $('#pt-quiz-opts').hidden = c.game === 'race';
  $('#pt-go').firstChild.textContent = c.game === 'quiz' ? 'Lancer les questions' : c.game === 'wheel' ? 'Lancer la roulette' : 'Lancer la soirée';
  segSync('#pt-rounds', String(c.rounds)); segSync('#pt-type', c.type); segSync('#pt-dose', String(c.dose));
  $('#pt-add').disabled = c.players.length >= 8; $('#pt-go').disabled = c.players.length < 1 && c.game === 'race';
}
for (const [sel, key, num] of [['#pt-game', 'game', 0], ['#pt-rounds', 'rounds', 1], ['#pt-type', 'type', 0], ['#pt-dose', 'dose', 1]])
  $$(sel + ' button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); const c = partyCfg(); c[key] = num ? +b.dataset.v : b.dataset.v; SAVE.party = c; store(); renderParty(); }));
function addPlayer() {
  const inp = $('#pt-name'), n = inp.value.trim().slice(0, 10); if (!n) { inp.focus(); return; }
  const c = partyCfg(); if (c.players.length >= 8) { toast('8 joueurs maximum.'); return; }
  c.players.push(n); SAVE.party = c; store(); inp.value = ''; renderParty(); AudioSys.sfx('click');
}
$('#pt-add').onclick = addPlayer;
$('#pt-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') addPlayer(); });
function pickTrack(sel, prev) { if (sel >= 0) return sel; let t; do { t = Math.floor(Math.random() * TRACKS.length); } while (t === prev && TRACKS.length > 1); return t; }
$('#pt-go').onclick = () => {
  const c = partyCfg(); if (c.game === 'quiz') { startQuiz(c); return; } if (c.game === 'wheel') { startWheel(); return; }
  if (!c.players.length) { toast('Ajoute au moins un joueur.'); return; }
  UI.mode = 'party';
  UI.party = Object.assign({}, c, { players: c.players.map((n, i) => ({ name: n, color: PARTY_COLORS[i % 8], total: 0, given: 0 })), round: 0, turn: 0, roundRes: [], roundTrack: pickTrack(c.track, -1) });
  begin();
};
function partyTurn() {
  const P = UI.party; if (!P) return; const pl = P.players[P.turn];
  $('#tn-round').textContent = 'Manche ' + (P.round + 1) + '/' + P.rounds + ' · ' + TRACKS[P.roundTrack].name + ' · Joueur ' + (P.turn + 1) + '/' + P.players.length;
  $('#tn-name').textContent = 'À toi, ' + pl.name + ' !'; $('#tn-name').style.color = pl.color === '#f5f3ec' ? 'var(--ink)' : pl.color;
  G.race = G.race && G.race.state === 'attract' ? G.race : null; if (!G.race) startAttract(P.roundTrack);
  showHud(false); show('turn');
}
$('#tn-go').onclick = () => { AudioSys.init(); AudioSys.sfx('click'); launch(); };
$('#tn-quit').onclick = () => { AudioSys.sfx('click'); toMenu(); };
function fillTable(rows, meIdx, plain) {
  const tb = $('#r-table'); tb.innerHTML = ''; tb.className = plain ? 'plain' : '';
  rows.forEach((cells, i) => { const tr = document.createElement('tr'); if (i === meIdx) tr.className = 'me'; cells.forEach((c, j) => { const td = document.createElement('td'); td.textContent = c; if (j >= 1 && j === cells.length - 1) td.className = 'r'; tr.appendChild(td); }); tb.appendChild(tr); });
}
function setButtons(list) {
  const btns = $('#r-buttons'); btns.innerHTML = '';
  for (const [label, cls, fn] of list) { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = '<span></span>'; b.firstChild.textContent = label; b.onclick = () => { AudioSys.sfx('click'); fn(); }; btns.appendChild(b); }
}
function bigLine(txt) { const el = $('#r-big'); el.hidden = !txt; el.textContent = txt || ''; }
const ordFr = (n) => n + (n === 1 ? 'er' : 'e');
function partyResults() {
  const R = G.race; R.resultsShown = true; const order = estimateFinish(); const k = R.player; const place = order.indexOf(k) + 1;
  const P = UI.party, pl = P.players[P.turn], sips = P.type === 'sips';
  const ps = [0, 0, 0, 0, 1, 2, 3, 4][place - 1], pg = [3, 1, 0, 0, 0, 0, 0, 0][place - 1];
  const hits = Math.min(3, R.pt.hits), wrong = Math.min(2, R.pt.wrong), gives = Math.min(3, R.pt.gives);
  const drink = Math.ceil((ps + hits + wrong) * P.dose), give = Math.ceil((pg + gives) * P.dose);
  pl.total += drink; pl.given += give; P.roundRes.push({ pl, time: k.finishTime, place, drink, give });
  $('#r-title').textContent = pl.name + ' : ' + ordFr(place);
  $('#r-sub').textContent = TRACKS[R.ti].name + ' · ' + fmtTime(k.finishTime) + ' · Manche ' + (P.round + 1) + '/' + P.rounds;
  const rows = [['Arrivée ' + ordFr(place), ps ? '+' + ps : '0']];
  if (hits) rows.push(['Touché ' + hits + ' fois', '+' + hits]); if (wrong) rows.push(['Mauvais sens', '+' + wrong]);
  if (pg) rows.push(['Bonus de place (à distribuer)', String(pg)]); if (gives) rows.push(['Adversaires touchés (à distribuer)', String(gives)]);
  fillTable(rows, -1, true);
  let txt = drink ? (sips ? drink + ' ' + unitWord(drink) + ' à boire' : drink + ' ' + unitWord(drink) + ' · Gage : ' + pick(DARES)) : (sips ? 'Rien à boire !' : 'Pas de gage !');
  if (give) txt += sips ? ' · ' + give + ' à distribuer' : ' · Désigne quelqu\'un pour un gage';
  bigLine(txt); vibrate(drink ? [80, 60, 80] : 30);
  const lastTurn = P.turn >= P.players.length - 1;
  setButtons([['Arrêter', 'ghost', toMenu], lastTurn ? ['Bilan de la manche', 'red', partyRoundSummary] : ['Joueur suivant', 'red', () => { P.turn++; partyTurn(); }]]);
  show('results');
}
function partyRoundSummary() {
  const P = UI.party; const res = P.roundRes.slice().sort((a, b) => a.time - b.time); let extra = '';
  if (res.length > 1) { const b = Math.ceil(2 * P.dose), slow = res[res.length - 1], fast = res[0]; slow.drink += b; slow.pl.total += b; fast.give += b; fast.pl.given += b;
    extra = slow.pl.name + ' est le plus lent : +' + b + ' ' + unitWord(b) + '. ' + fast.pl.name + ' est le plus rapide : ' + (P.type === 'sips' ? 'il en distribue ' + b + '.' : 'il choisit un gage pour quelqu\'un.'); }
  $('#r-title').textContent = 'Bilan manche ' + (P.round + 1) + '/' + P.rounds; $('#r-sub').textContent = TRACKS[P.roundTrack].name + ' · classement au temps';
  fillTable(res.map((r, i) => [String(i + 1), r.pl.name, fmtTime(r.time), '+' + r.drink]), -1);
  bigLine(extra);
  const last = P.round >= P.rounds - 1;
  setButtons([['Arrêter', 'ghost', toMenu], last ? ['Tableau final', 'red', partyFinal] : ['Manche suivante', 'red', () => { P.round++; P.turn = 0; P.roundRes = []; P.roundTrack = pickTrack(P.track, P.roundTrack); partyTurn(); }]]);
  show('results');
}
function partyFinal() {
  const P = UI.party; const list = P.players.slice().sort((a, b) => b.total - a.total); const sips = P.type === 'sips';
  $('#r-title').textContent = 'Fin de la soirée'; $('#r-sub').textContent = P.rounds + ' manche' + (P.rounds > 1 ? 's' : '') + ' · total par joueur';
  fillTable(list.map((p, i) => [String(i + 1), p.name, p.total + ' ' + (sips ? 'bues' : 'pts')]), -1);
  const top = list[0];
  bigLine(list.length > 1 && top.total > 0 ? (sips ? 'Grand perdant : ' + top.name + ' avec ' + top.total + ' ' + unitWord(top.total) + '.' : 'Gage final pour ' + top.name + ' : ' + pick(DARES)) : 'Soirée parfaite, personne n\'a rien pris.');
  setButtons([['Menu', 'ghost', toMenu], ['Rejouer', 'red', () => { for (const p of P.players) { p.total = 0; p.given = 0; } P.round = 0; P.turn = 0; P.roundRes = []; P.roundTrack = pickTrack(P.track, -1); partyTurn(); }]]);
  show('results');
}

/* ================= Questions de soirée ================= */
// [type, texte, gorgées, pénalité perso (gorgées / gages)]
// q = réponds ou bois, d = fais-le ou bois, v = vote « qui ici… », p = tu préfères (A, B), n = je n'ai jamais, a = tous ceux concernés, g = distribue, x = pénalité dans le texte
const Q_ = (k, list) => list.map((t) => [k, t]);
const QUIZ = {
  soft: { name: 'Soft', color: '#38b6ff', items: [
    ...Q_('q', ['{p}, quel est ton plus gros fou rire ?', '{p}, raconte ton pire moment de honte.', '{p}, quelle appli tu ouvres le plus ?', '{p}, quel est le dernier mensonge que tu as dit ?',
      '{p}, si tu pouvais vivre dans un film, lequel ?', '{p}, quel est ton plat préféré de tous les temps ?', '{p}, la chose la plus bizarre que tu aies mangée ?', '{p}, quel super-pouvoir tu choisirais ?',
      '{p}, ton pire job ou ta pire corvée ?', '{p}, qui dans ce groupe te connaît le mieux ?', '{p}, raconte la meilleure soirée de ta vie.', '{p}, quel est ton talent caché ?',
      '{p}, de quoi as-tu le plus peur ?', '{p}, ta pire coupe de cheveux ?', '{p}, ton plus gros caprice d\'enfant ?', '{p}, quel métier tu voulais faire petit ?',
      '{p}, quelle chanson tu as honte d\'aimer ?', '{p}, ton dessin animé préféré ?', '{p}, si tu gagnais au loto demain, première dépense ?', '{p}, la série que tu pourrais revoir dix fois ?',
      '{p}, quel est ton surnom le plus gênant ?', '{p}, quelle est ta pire habitude ?', '{p}, ta plus grosse bêtise à l\'école ?', '{p}, le pire cadeau que tu aies reçu ?',
      '{p}, tu dors avec une peluche ou un doudou ?', '{p}, qui appelles-tu en premier en cas de galère ?', '{p}, ton pire voyage ?', '{p}, la célébrité à qui on te compare ?',
      '{p}, ton emoji le plus utilisé ?', '{p}, ton rêve le plus bizarre ?', '{p}, le dernier truc qui t\'a fait pleurer de rire ?', '{p}, quelle époque tu aimerais visiter ?',
      '{p}, combien de temps tu tiens sans ton téléphone ?', '{p}, le plat que tu rates à chaque fois ?', '{p}, quel animal tu serais ?', '{p}, ta plus grosse peur irrationnelle ?',
      '{p}, la meilleure décision de ta vie ?', '{p}, ton souvenir d\'enfance préféré ?', '{p}, quel personnage de jeu vidéo tu serais ?', '{p}, le pire conseil qu\'on t\'ait donné ?']),
    ...Q_('d', ['{p}, montre la dernière photo de ta galerie.', '{p}, imite {p2} pendant 15 secondes.', '{p}, fais un compliment sincère à {p2}.', '{p}, parle avec un accent jusqu\'à ta prochaine carte.',
      '{p}, raconte une histoire en 3 phrases avec {p2} comme héros.', '{p}, fais ta meilleure imitation d\'un prof.', '{p}, dis trois qualités de {p2}.', '{p}, montre ton dernier emoji envoyé.']),
    ...Q_('v', ['Qui ici est toujours en retard ?', 'Qui ici finira célèbre ?', 'Qui ici survivrait le moins longtemps sur une île déserte ?', 'Qui ici est le plus gourmand ?',
      'Qui ici pleure devant les films ?', 'Qui ici est le meilleur ami à appeler à 3 h du matin ?', 'Qui ici a le meilleur style ?', 'Qui ici serait le meilleur parent ?',
      'Qui ici perd tout le temps ses affaires ?', 'Qui ici est le plus drôle sans le faire exprès ?', 'Qui ici serait le meilleur président ?', 'Qui ici a le rire le plus contagieux ?',
      'Qui ici dort le plus ?', 'Qui ici est le plus têtu ?', 'Qui ici ferait le meilleur prof ?', 'Qui ici est le plus mauvais perdant ?',
      'Qui ici garde le mieux un secret ?', 'Qui ici a le plus de chance ?', 'Qui ici cuisine le mieux ?', 'Qui ici est le plus maladroit ?',
      'Qui ici partirait vivre à l\'autre bout du monde ?', 'Qui ici a le plus beau sourire ?', 'Qui ici est le plus généreux ?', 'Qui ici est accro aux séries ?']),
    ['x', '{p}, raconte une blague.', 1, ['Si personne ne rit, tu bois {n}.', 'Si personne ne rit, gage.']],
    ['g', '{p}, carte cadeau : tu distribues.', 3], ['g', '{p}, c\'est ton jour de chance : distribue.', 2]] },
  fun: { name: 'Fun', color: '#ffc531', items: [
    ...Q_('d', ['{p}, fais un bruit de moteur pendant 10 secondes.', '{p}, chante un refrain de ton choix.', '{p}, fais 10 pompes ou 15 squats.', '{p}, laisse {p2} choisir ta photo de profil pour la soirée.',
      '{p}, parle comme un robot jusqu\'à la prochaine carte.', '{p}, fais ta meilleure danse de la victoire.', '{p}, échange de place avec {p2}.', '{p}, envoie un vocal de 10 secondes en chantant à qui tu veux.',
      '{p}, mime un animal, les autres doivent deviner.', '{p}, fais le commentateur sportif pendant que {p2} boit un verre d\'eau.', '{p}, fais un défilé de mode jusqu\'à la porte et retour.',
      '{p}, tiens en équilibre sur un pied jusqu\'à ta prochaine carte.', '{p}, parle en rimes jusqu\'à ta prochaine carte.', '{p}, fais un beatbox de 10 secondes.', '{p}, imite un pilote de Tilt Kart qui perd.',
      '{p}, raconte ta journée comme un documentaire animalier.', '{p}, fais un tuto maquillage sur {p2} sans maquillage, juste avec les mains.', '{p}, fais semblant d\'être un serveur et prends les commandes.',
      '{p}, dessine {p2} en 20 secondes et montre le résultat.', '{p}, fais une pub de 15 secondes pour le premier objet à ta droite.', '{p}, laisse {p2} te coiffer comme il veut.',
      '{p}, fais ton plus beau cri de Tarzan.', '{p}, parle sans bouger les lèvres pendant une minute.', '{p}, fais une déclaration solennelle à ton verre.']),
    ...Q_('v', ['Qui ici a la pire danse ?', 'Qui ici enverrait un message à son ex ce soir ?', 'Qui ici se perdrait dans son propre quartier ?', 'Qui ici rit le plus fort ?',
      'Qui ici serait le pire pilote dans la vraie vie ?', 'Qui ici passe le plus de temps sur son téléphone ?', 'Qui ici finira la soirée en premier au lit ?', 'Qui ici chanterait le plus faux au karaoké ?',
      'Qui ici mourrait en premier dans un film d\'horreur ?', 'Qui ici serait arrêté pour une bêtise ?', 'Qui ici ferait une téléréalité ?', 'Qui ici a déjà triché à ce jeu ?',
      'Qui ici dépense tout son argent en bouffe ?', 'Qui ici ferait le pire colocataire ?', 'Qui ici est le plus dramatique ?', 'Qui ici a le plus de photos ratées ?',
      'Qui ici pourrait manger n\'importe quoi ?', 'Qui ici parle le plus ?', 'Qui ici serait le premier zombie ?', 'Qui ici a la plus grosse collection de trucs inutiles ?',
      'Qui ici oublierait son propre anniversaire ?', 'Qui ici adopte dix chats ?', 'Qui ici est le roi des excuses bidon ?', 'Qui ici perdrait son téléphone ce soir ?']),
    ...Q_('a', ['Tous ceux qui portent du noir.', 'Tous ceux qui ont moins de 20 % de batterie.', 'Tous ceux qui ont déjà perdu à Tilt Kart ce soir.', 'Le plus jeune du groupe.', 'Le plus grand du groupe.',
      'Tous ceux qui ont des chaussettes dépareillées.', 'Tous ceux qui ont un frère ou une sœur.', 'Tous ceux qui ont un tatouage.', 'Tous ceux qui sont nés en été.', 'Tous ceux qui portent des lunettes.',
      'La dernière personne arrivée ce soir.', 'Tous ceux qui ont un animal.']),
    ['x', '{p} et {p2} : concours de regard. Le premier qui rit perd.', 2, ['Le perdant boit {n}.', 'Le perdant prend un gage.']],
    ['x', 'Thème : marques de voitures. {p} commence, chacun son tour. Le premier qui sèche perd.', 2, ['Le perdant boit {n}.', 'Le perdant prend un gage.']],
    ['x', 'Thème : pays d\'Europe. {p} commence, chacun son tour.', 2, ['Le premier qui sèche boit {n}.', 'Le premier qui sèche prend un gage.']],
    ['x', 'Thème : marques de céréales. {p} commence.', 2, ['Le premier qui sèche boit {n}.', 'Le premier qui sèche prend un gage.']],
    ['x', 'Thème : personnages de dessins animés. {p} commence.', 2, ['Le premier qui sèche boit {n}.', 'Le premier qui sèche prend un gage.']],
    ['x', 'Ni oui ni non : {p} pose des questions à {p2} pendant 30 secondes.', 2, ['Si {p2} craque, il boit {n}.', 'Si {p2} craque, gage.']],
    ['x', '{p} et {p2} : pierre-feuille-ciseaux en trois manches.', 2, ['Le perdant boit {n}.', 'Le perdant prend un gage.']],
    ['x', '{p} pense à un animal. Les autres ont 10 questions pour trouver.', 2, ['Si personne ne trouve, tout le monde boit {n}.', 'Si personne ne trouve, gage collectif.']],
    ['x', 'Règle : jusqu\'à la prochaine carte, interdit de dire « je ».', 1, ['Chaque erreur : {n}.', 'Chaque erreur : gage.']],
    ['x', '{p} devient le maître des questions : celui qui répond à une de ses questions boit.', 1, ['Le piégé boit {n}.', 'Le piégé prend un gage.']],
    ['g', '{p}, tu es le roi de la carte : distribue.', 3]] },
  hot: { name: 'Hot 18+', color: '#ff4f3a', items: [
    ...Q_('q', ['{p}, raconte ton plus beau baiser.', '{p}, quel est ton plus gros râteau ?', '{p}, as-tu déjà eu un crush sur quelqu\'un de ce groupe ?', '{p}, décris ton rencard idéal en trois mots.',
      '{p}, la chose la plus folle que tu aies faite par amour ?', '{p}, qu\'est-ce qui te fait craquer chez quelqu\'un ?', '{p}, l\'endroit le plus improbable où tu as embrassé quelqu\'un ?', '{p}, ton plus long célibat ?',
      '{p}, avec quelle célébrité tu dînerais en tête-à-tête ?', '{p}, déjà envoyé un message coquin à la mauvaise personne ?', '{p}, ta meilleure technique de drague ?', '{p}, ton pire premier rendez-vous ?',
      '{p}, le compliment qui t\'a le plus fait rougir ?', '{p}, plutôt bisou volé ou déclaration écrite ?', '{p}, à quel âge ton premier bisou ?', '{p}, ton plus gros coup de foudre ?',
      '{p}, qu\'est-ce qui te refroidit direct chez quelqu\'un ?', '{p}, déjà dragué quelqu\'un en étant déjà pris ?', '{p}, ta pire histoire d\'ex ?', '{p}, la chanson parfaite pour un slow ?',
      '{p}, déjà eu un crush sur l\'ex d\'un pote ?', '{p}, quel est ton parfum préféré sur quelqu\'un ?', '{p}, le texto le plus osé que tu aies envoyé (sans le montrer) ?', '{p}, une partie du corps qui te fait craquer ?',
      '{p}, combien de temps tu attends avant de répondre à un crush ?', '{p}, ton fantasme de voyage en amoureux ?', '{p}, déjà menti sur ton âge pour plaire ?', '{p}, la pire phrase de drague qu\'on t\'ait sortie ?']),
    ...Q_('d', ['{p}, fais ton regard le plus séducteur à {p2} pendant 5 secondes.', '{p}, fais une déclaration d\'amour exagérée à {p2}.', '{p}, dis un compliment coquin (mais classe) à {p2}.',
      '{p}, fais un slow imaginaire avec {p2} pendant 10 secondes.', '{p}, murmure une phrase de film romantique à l\'oreille de {p2}.', '{p}, fais un bisou sur la joue de {p2}.',
      '{p}, décris {p2} comme dans une annonce de rencontre.', '{p}, fais ta meilleure démarche de mannequin.', '{p}, donne ton meilleur conseil de séduction à {p2}.',
      '{p}, mime ton dernier rendez-vous en 20 secondes.', '{p}, laisse {p2} lire ton dernier message envoyé.', '{p}, fais un massage d\'épaules de 20 secondes à {p2}.']),
    ...Q_('v', ['Qui ici est le plus charmeur ?', 'Qui ici a le plus de succès ?', 'Qui ici se mariera en premier ?', 'Qui ici craque le plus facilement ?', 'Qui ici embrasse le mieux, à ton avis ?',
      'Qui ici a le plus d\'ex ?', 'Qui ici drague le plus en soirée ?', 'Qui ici a le plus de charme au réveil ?', 'Qui ici est le plus jaloux ?', 'Qui ici tombe amoureux en une soirée ?',
      'Qui ici a le plus de crushs secrets ?', 'Qui ici ferait le meilleur rencard ?', 'Qui ici enverrait un message à 2 h du matin ?', 'Qui ici serait le plus romantique ?',
      'Qui ici a le regard le plus séducteur ?', 'Qui ici danse le mieux un slow ?']),
    ...Q_('a', ['Tous ceux qui sont en couple.', 'Tous ceux qui sont célibataires.', 'Tous ceux qui ont embrassé quelqu\'un ce mois-ci.', 'Tous ceux qui ont une appli de rencontre.']),
    ...Q_('n', ['Je n\'ai jamais embrassé quelqu\'un de ce groupe.', 'Je n\'ai jamais eu de rencard grâce à une appli.', 'Je n\'ai jamais été jaloux de l\'ex de quelqu\'un.',
      'Je n\'ai jamais dragué quelqu\'un sans connaître son prénom.', 'Je n\'ai jamais embrassé deux personnes la même soirée.', 'Je n\'ai jamais eu un crush sur un pote de pote.',
      'Je n\'ai jamais envoyé une déclaration par message.', 'Je n\'ai jamais fait un premier rendez-vous qui a duré plus de 6 heures.', 'Je n\'ai jamais été surpris en train d\'embrasser quelqu\'un.'])] },
  jamais: { name: 'Je n\'ai jamais', color: '#3ee08f', items: [
    'raté un train ou un avion', 'fait semblant d\'être malade pour sécher', 'dormi à la belle étoile', 'stalké un ex sur les réseaux', 'pleuré devant un dessin animé',
    'oublié l\'anniversaire d\'un proche', 'eu d\'amende', 'menti sur mon CV', 'envoyé un message à la mauvaise personne', 'fait une nuit blanche à jouer',
    'cassé l\'écran de mon téléphone', 'eu un fou rire dans un moment sérieux', 'mangé un truc tombé par terre', 'fait du karting dans la vraie vie', 'gagné à un jeu à gratter',
    'fait de camping', 'été viré d\'une soirée', 'dit « je t\'aime » sans le penser', 'ghosté quelqu\'un', 'été ghosté',
    'raté une teinture ou une coupe', 'été malade en soirée', 'dansé sur une table', 'fait la bise à un inconnu par erreur', 'regardé le téléphone de quelqu\'un en cachette',
    'fait un selfie avec une célébrité', 'perdu mes clés en soirée', 'eu un crush sur un prof', 'sauté en parachute ou à l\'élastique', 'dormi plus de 14 heures d\'affilée',
    'triché à un jeu de société', 'fait de road trip', 'donné un faux prénom à quelqu\'un', 'envoyé un message à 3 h du matin que j\'ai regretté', 'chanté au karaoké',
    'oublié un prénom juste après qu\'on me l\'ait dit', 'fini une série entière en un week-end', 'pris l\'avion seul', 'fait une fugue', 'été dans une bagarre',
    'raté mon permis', 'pris un coup de soleil terrible', 'perdu un pari', 'mangé un plat entier tout seul en cachette', 'fait semblant de connaître une chanson',
    'été en retard à un examen', 'eu des points de suture', 'fait du stop', 'nagé tout nu', 'dormi chez un inconnu',
    'pleuré pour obtenir quelque chose', 'fait un tatouage que je regrette', 'commandé à manger plus de trois fois dans la même semaine', 'liké une vieille photo par erreur en stalkant',
    'fait semblant d\'être occupé pour éviter quelqu\'un', 'menti sur mon âge', 'oublié quelqu\'un en partant', 'perdu un téléphone dans les toilettes', 'chanté sous la douche à fond',
    'parlé tout seul dans la rue', 'pleuré au cinéma', 'raté une marche devant tout le monde', 'fait un câlin à un arbre', 'mangé des insectes',
    'gagné une compétition', 'joué à un jeu toute une nuit', 'fait un faux compte', 'appelé un prof « maman » ou « papa »', 'rigolé à une blague que je n\'avais pas comprise',
    'été bloqué dans un ascenseur', 'pris un fou rire au téléphone avec un inconnu', 'dormi en cours', 'oublié mes clés dans la porte', 'renversé un verre sur quelqu\'un',
    'raté une soirée à cause d\'une sieste', 'mis un vêtement à l\'envers toute une journée', 'été pris en photo à mon insu dans un moment gênant'].map((t) => ['n', 'Je n\'ai jamais ' + t + '.']) },
  prefere: { name: 'Tu préfères', color: '#a87dff', items: [
    ['voler', 'être invisible'], ['ne plus jamais manger de pizza', 'ne plus jamais manger de chocolat'], ['vivre sans musique', 'vivre sans films'], ['être riche et seul', 'pauvre et entouré'],
    ['parler toutes les langues', 'parler aux animaux'], ['avoir toujours chaud', 'avoir toujours froid'], ['revivre le passé', 'voir le futur'], ['plage', 'montagne'],
    ['chat', 'chien'], ['sucré', 'salé'], ['ne plus jamais dormir', 'ne plus jamais manger'], ['être célèbre', 'être très riche'],
    ['un jour sans téléphone', 'un jour sans manger'], ['tout savoir', 'tout pouvoir'], ['vivre à la ville', 'vivre à la campagne'], ['être un génie', 'être super beau'],
    ['un dragon apprivoisé', 'une licorne'], ['perdre tes souvenirs', 'perdre ton téléphone pour toujours'], ['chanter tout ce que tu dis', 'danser à chaque pas'], ['l\'été toute l\'année', 'l\'hiver toute l\'année'],
    ['avoir une pause bouton', 'avoir un retour arrière'], ['être le meilleur à Tilt Kart', 'être le meilleur au foot'], ['manger que des pâtes', 'manger que du riz'], ['vivre dans l\'espace', 'vivre sous l\'eau'],
    ['savoir cuisiner comme un chef', 'savoir chanter comme une star'], ['ne jamais avoir d\'embouteillage', 'ne jamais faire la queue'], ['avoir un sosie', 'avoir un jumeau'], ['partir en road trip', 'partir en croisière'],
    ['dire tout ce que tu penses', 'ne plus jamais parler'], ['un rendez-vous au resto', 'un rendez-vous au ciné'], ['être drôle', 'être intelligent'], ['une fête surprise', 'un cadeau surprise'],
    ['ne plus jamais utiliser les réseaux', 'ne plus jamais regarder de séries'], ['avoir 10 ans de plus', '5 ans de moins'], ['voyager dans le temps', 'téléporter'], ['un majordome', 'un cuisinier perso'],
    ['être le plus rapide', 'être le plus fort'], ['vivre sans internet', 'vivre sans eau chaude'], ['dormir 4 heures et être en forme', 'dormir 12 heures'], ['être un super-héros', 'un super-méchant'],
    ['tout le monde lit tes pensées', 'tout le monde voit ton historique'], ['rire sans arrêt', 'pleurer sans arrêt pendant une heure'], ['un baiser de cinéma', 'une lettre d\'amour'], ['un ex trop collant', 'un crush qui t\'ignore'],
    ['sortir avec quelqu\'un de drôle', 'avec quelqu\'un de beau'], ['un premier rendez-vous raté mais drôle', 'parfait mais ennuyeux'], ['la soirée jusqu\'au matin', 'rentrer à minuit en forme'], ['un karaoké', 'un blind test']
  ].map(([a, b]) => ['p', a, b]) },
};
const gw = (n) => (n > 1 ? 'gorgées' : 'gorgée');
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function penFor(kind, sips, custom) {
  const S = sips ? { q: 'Réponds ou bois {n}.', d: 'Fais-le ou bois {n}.', v: 'À trois, tout le monde pointe quelqu\'un. Le plus désigné boit {n}.', n: 'Ceux qui l\'ont déjà fait boivent {n}.', a: 'Les personnes concernées boivent {n}.', g: '{p} distribue {n}.', p: 'À trois : main gauche pour le premier choix, main droite pour le second. Le camp le moins nombreux boit {n}.' }
    : { q: 'Réponds ou prends un gage.', d: 'Fais-le ou prends un gage.', v: 'À trois, tout le monde pointe quelqu\'un. Le plus désigné prend un gage.', n: 'Ceux qui l\'ont déjà fait lèvent la main.', a: 'Les personnes concernées prennent un gage.', g: '{p} choisit quelqu\'un pour un gage.', p: 'À trois : main gauche ou main droite. Le camp le moins nombreux prend un gage.' };
  return kind === 'x' && custom ? custom[sips ? 0 : 1] : S[kind] || '';
}
function cardText(it) { return it[0] === 'p' ? 'Tu préfères ' + it[1] + ' ou ' + it[2] + ' ?' : it[1]; }
function startQuiz(c) {
  UI.mode = 'quiz'; const players = c.players.length ? c.players.slice() : ['Toi']; const deck = [];
  for (const cat of c.cats) if (QUIZ[cat]) for (const it of QUIZ[cat].items) deck.push([cat, it]);
  if (!deck.length) { toast('Choisis au moins une catégorie.'); return; }
  UI.quiz = { players, deck: shuffle(deck), i: 0, turn: 0, type: c.type, dose: c.dose };
  AudioSys.init(); nextCard();
}
function nextCard() {
  const Q = UI.quiz; if (!Q) return; if (Q.i >= Q.deck.length) { shuffle(Q.deck); Q.i = 0; }
  const [cat, it] = Q.deck[Q.i++]; const p = Q.players[Q.turn % Q.players.length]; Q.turn++;
  let p2 = 'ton voisin de droite'; if (Q.players.length > 1) { do { p2 = pick(Q.players); } while (p2 === p); }
  const kind = it[0], s = it[0] === 'p' ? 0 : it[2], custom = it[3]; const n = Math.max(1, Math.ceil((s || (kind === 'n' || kind === 'a' || kind === 'p' ? 1 : 2)) * Q.dose)); const sips = Q.type === 'sips';
  const fill = (t) => t.replace(/\{p\}/g, p).replace(/\{p2\}/g, p2).replace(/\{n\}/g, n + ' ' + gw(n));
  const card = $('#q-card'); card.style.setProperty('--c', QUIZ[cat].color);
  $('#q-cat').textContent = QUIZ[cat].name + (kind === 'n' || kind === 'p' || kind === 'v' || kind === 'a' ? '' : ' · ' + p); $('#q-text').textContent = fill(cardText(it)); $('#q-pen').textContent = fill(penFor(kind, sips, custom));
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  AudioSys.sfx('click'); show('card');
}
$('#q-next').onclick = nextCard;
$('#q-card').onclick = nextCard;
$('#q-card').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextCard(); } });
$('#q-quit').onclick = () => { AudioSys.sfx('click'); UI.quiz = null; UI.mode = 'quick'; show('party'); };

/* ================= v7 : grosse banque de questions + pas de répétition ================= */
const QV = (list) => list.map((t) => ['v', 'Qui ici ' + t + ' ?']);
const QP = (list) => list.map(([a, b]) => ['p', a, b]);
const QN = (list) => list.map((t) => ['n', 'Je n\'ai jamais ' + t + '.']);
QUIZ.soft.items.push(
  ...QV(['oublie toujours les anniversaires', 'parle le plus en dormant', 'a le plus de photos dans son téléphone', 'serait capable de vivre sans internet un mois', 'chante le plus faux',
    'a le meilleur sens de l\'orientation', 'se perdrait dans son propre quartier', 'adopterait dix chats', 'pleure devant les dessins animés', 'a la plus belle écriture',
    'arrive toujours les mains vides', 'apporte toujours à manger', 'a déjà raté un avion ou un train', 'prend le plus de selfies', 'est le plus accro au café',
    'ferait le meilleur guide touristique', 'mange le plus lentement', 'mange le plus vite', 'oublie ses clés le plus souvent', 'connaît toutes les paroles de chansons',
    'deviendrait youtubeur', 'gagnerait un concours de cuisine', 'serait le pire colocataire', 'serait le meilleur colocataire', 'parle le plus fort au téléphone',
    'a le plus d\'applications inutiles', 'regarde des séries jusqu\'à 4 h du matin', 'a la pire playlist', 'a la meilleure playlist', 'se réveille le plus tôt',
    'met le plus de temps à se préparer', 'a le plus de chaussures', 'pourrait survivre dans la nature', 'appellerait sa mère en premier en cas de souci', 'garde tous ses tickets de caisse',
    'est le plus nostalgique', 'a la mémoire la plus impressionnante', 'raconte les pires blagues', 'rit à ses propres blagues', 'serait le meilleur professeur de danse',
    'serait le plus nul au camping', 'a le plus voyagé', 'n\'a jamais quitté son pays', 'a le plus de cousins', 'pourrait manger des pâtes tous les jours',
    'met du ketchup partout', 'est le plus difficile à table', 'goûte à tout sans hésiter', 'a peur des araignées', 'a peur du noir',
    'parle à ses plantes', 'donne des surnoms à tout le monde', 'est le plus organisé', 'est le plus bordélique', 'fait ses courses au dernier moment',
    'connaît le plus de pays sur une carte', 'gagnerait à un quiz de culture générale', 'perdrait à un quiz de culture générale', 'aurait pu être acteur', 'ferait le meilleur détective',
    'retrouve toujours ce qui est perdu', 'casse le plus d\'objets', 'serait élu délégué de classe', 'a eu la pire coupe de cheveux au collège', 'aime le plus les animaux',
    'a déjà fait une sieste de plus de 4 heures', 'joue le plus aux jeux vidéo', 'est le plus mauvais joueur aux jeux de société', 'triche aux jeux de société', 'lit le plus de livres',
    'regarde le plus de télé-réalité', 'serait le premier à dormir en soirée', 'serait le dernier debout en soirée', 'prend les meilleures photos', 'a la voix la plus reconnaissable',
    'fait les meilleurs câlins', 'donne les meilleurs conseils', 'est le plus généreux', 'est le plus radin', 'rend toujours ce qu\'on lui prête',
    'oublie de répondre aux messages', 'répond en moins d\'une minute', 'envoie le plus de vocaux', 'met le plus d\'emojis', 'écrit des messages trop longs',
    'est le plus têtu en débat', 'change d\'avis le plus souvent', 'a le rire le plus bizarre', 'éternue le plus fort', 'a le meilleur sens du rythme',
    'pourrait gagner un concours de grimaces', 'serait le meilleur maire du village', 'tiendrait un restaurant', 'ouvrirait une boulangerie', 'deviendrait astronaute',
    'aurait le plus de chance au loto', 'économise le mieux', 'dépense tout le jour de la paie', 'collectionne des trucs bizarres', 'garde ses peluches d\'enfance',
    'est le plus frileux', 'a toujours trop chaud', 'boit le moins d\'eau', 'mange le plus de bonbons', 'fait du sport tous les jours',
    'abandonne une résolution en une semaine', 'tient toujours ses promesses', 'arrive en avance partout', 'connaît le plus de ragots', 'garde le mieux les secrets',
    'ferait le meilleur parent d\'élève', 'serait le meilleur grand-parent', 'fait le meilleur barbecue', 'conduit le plus mal', 'chante sous la douche']),
  ...QN(['pris l\'avion', 'dormi à la belle étoile', 'cassé un écran de téléphone', 'oublié l\'anniversaire d\'un proche', 'pleuré devant un film d\'animation', 'mangé un plat entier tout seul',
    'raté un train', 'dormi plus de 14 heures d\'affilée', 'chanté au karaoké', 'gagné un concours', 'été dans un journal', 'appelé un prof « maman » ou « papa »',
    'fait une chute en public', 'perdu mon téléphone', 'monté à cheval', 'fait du ski', 'vu la neige', 'parlé à une célébrité', 'eu un plâtre', 'fait un régime',
    'menti sur mon âge', 'oublié mon propre code de carte', 'dansé seul dans ma chambre', 'regardé une série en une nuit', 'teint mes cheveux', 'mangé des escargots',
    'fait un tatouage', 'fait du camping', 'gagné à un jeu à gratter', 'vomi en voiture', 'fait une fugue', 'été collé au lycée', 'eu un animal bizarre',
    'parlé tout seul dans la rue', 'traversé un pays en train', 'pris un selfie avec un inconnu', 'fait du parachute', 'cuisiné pour plus de dix personnes',
    'appelé quelqu\'un par le mauvais prénom', 'raté un examen', 'fait semblant d\'être malade', 'rigolé à un enterrement', 'eu une panne d\'essence']),
  ...QP([['ne plus jamais avoir froid', 'ne plus jamais avoir chaud'], ['parler toutes les langues', 'jouer de tous les instruments'], ['vivre à la mer', 'vivre à la montagne'],
    ['un dragon apprivoisé', 'une licorne'], ['voyager dans le passé', 'voyager dans le futur'], ['ne manger que du sucré', 'que du salé'], ['être invisible', 'savoir voler'],
    ['un chien qui parle', 'un chat qui parle'], ['vivre sans musique', 'vivre sans films'], ['toujours dire la vérité', 'toujours mentir'], ['avoir trois bras', 'trois jambes'],
    ['être célèbre', 'être riche en secret'], ['perdre ton téléphone', 'perdre ton portefeuille'], ['un été sans fin', 'un hiver sans fin'], ['la plage', 'la piscine'],
    ['dormir 4 heures par nuit sans fatigue', 'manger sans grossir'], ['pizza', 'burger'], ['crêpes', 'gaufres'], ['Noël', 'ton anniversaire'], ['le cinéma', 'une série à la maison'],
    ['vivre en ville', 'vivre à la campagne'], ['apprendre à surfer', 'apprendre à piloter un avion'], ['être le plus intelligent', 'le plus drôle'], ['des vacances à Tokyo', 'à New York'],
    ['ne plus pouvoir rire', 'ne plus pouvoir pleurer'], ['parler aux animaux', 'lire les pensées'], ['un super-pouvoir nul', 'aucun super-pouvoir'], ['chocolat', 'chips'],
    ['avoir un majordome', 'un cuisinier'], ['vivre 200 ans', 'vivre 50 ans riche'], ['un road trip', 'un hôtel de luxe'], ['ne plus jamais prendre de douche chaude', 'ne plus jamais boire de café'],
    ['être un pirate', 'être un ninja'], ['habiter dans un château', 'dans une cabane dans les arbres'], ['un petit appart en plein Paris', 'une grande maison au milieu de nulle part']])
);
QUIZ.fun.items.push(
  ...QV(['finirait en prison pour une bêtise', 'pourrait se battre avec un oie et perdre', 'mangerait un insecte pour 10 euros', 'irait chercher le pain en pyjama pour un pari', 'a déjà parlé à un animal comme à un humain',
    'serait le premier à mourir dans un film d\'horreur', 'survivrait à une invasion de zombies', 'trahirait le groupe pour une pizza', 'deviendrait une star de TikTok', 'commanderait à manger à 3 h du matin',
    'est le plus susceptible de tomber dans une piscine habillé', 'rirait à un moment pas du tout drôle', 'se fait toujours avoir par les arnaques', 'raconte des histoires trop longues', 'imite le mieux les accents',
    'serait le pire espion', 'pourrait se faire passer pour un médecin', 'oserait chanter dans le métro', 'a la danse la plus gênante', 'enverrait un message au mauvais groupe',
    'se ferait virer le premier jour', 'serait le meilleur candidat de télé-réalité', 'gagnerait à Koh-Lanta', 'abandonnerait à Koh-Lanta le premier jour', 'pourrait manger 30 nuggets',
    'ferait une sieste n\'importe où', 'se fait le plus remarquer en soirée', 'parle aux inconnus le plus facilement', 'est le plus mauvais menteur', 'est le meilleur menteur',
    'mettrait le feu à la cuisine', 'perdrait un pari stupide', 'aurait un tatouage regrettable', 'se perdrait dans un IKEA', 'achète des trucs inutiles sur internet',
    'adopterait un animal sur un coup de tête', 'réveille tout le monde en rentrant', 'prend le plus de place dans un lit', 'ronfle le plus fort', 'parle avec ses mains',
    'ferait le pire GPS humain', 'pourrait battre un enfant de 10 ans au foot', 'se ferait battre par un enfant de 10 ans au foot', 'a le pire goût vestimentaire', 'porte des chaussettes dépareillées',
    'aurait pu être magicien', 'croit aux fantômes', 'croit aux extraterrestres', 'part en vacances sans rien prévoir', 'fait ses valises la veille à minuit',
    'ferait un discours de mariage gênant', 'pleurerait au mariage de son ex', 'laisse le plus de vaisselle sale', 'vole des frites dans l\'assiette des autres', 'finit toujours les restes',
    'mettrait de l\'ananas sur la pizza', 'boit le café le plus sucré', 'ferait un concours de mangeur de piments', 'appelle encore son ex', 'stalke le plus sur les réseaux',
    'se tromperait de prénom au premier rendez-vous', 'passe le plus de temps aux toilettes avec son téléphone', 'chante faux mais très fort', 'fait des bruits bizarres en dormant', 'a déjà dormi en cours',
    'deviendrait milliardaire et perdrait tout', 'gagnerait un concours de pets', 'tient le moins bien l\'alcool', 'finit par danser sur la table', 'oublie où il a garé sa voiture',
    'ferait le meilleur méchant de film', 'serait le meilleur président d\'un pays imaginaire', 'serait le plus mauvais pilote de kart', 'est le plus mauvais perdant à ce jeu', 'triche à Wild Kart',
    'commande toujours la même chose au resto', 'demande toujours le wifi en premier', 'a le plus de tasses à la maison', 'serait le premier à pleurer en camp de survie', 'parlerait à une plante pour la faire pousser',
    'pourrait dormir debout', 'pourrait manger un citron entier', 'pourrait réciter l\'alphabet à l\'envers', 'sait faire le moonwalk', 'connaît une chorégraphie par cœur',
    'pourrait se battre contre un pigeon', 'ferait un câlin à un ours', 'irait sur Mars sans hésiter', 'deviendrait gourou d\'une secte du fromage', 'se ferait adopter par des canards',
    'serait influenceur de chaussettes', 'aurait un podcast que personne n\'écoute', 'écrirait un livre de cuisine raté', 'ouvrirait un bar karaoké', 'se marierait à Las Vegas sur un coup de tête',
    'ferait du saut à l\'élastique', 'refuserait de monter dans un manège', 'hurle dans les montagnes russes', 'fait semblant de comprendre les blagues', 'rit en retard aux blagues']),
  ...['{p}, fais ton meilleur cri de guerre.', '{p}, imite un animal jusqu\'à ce que quelqu\'un devine.', '{p}, parle comme un robot jusqu\'à ta prochaine carte.', '{p}, fais une déclaration d\'amour à ta boisson.',
    '{p}, raconte ta journée comme un commentateur sportif.', '{p}, fais 10 squats maintenant.', '{p}, invente une chanson sur {p2} en 20 secondes.', '{p}, montre ta meilleure pose de top model.',
    '{p}, échange un vêtement avec {p2} jusqu\'au prochain tour.', '{p}, appelle {p2} « Votre Majesté » jusqu\'au prochain tour.', '{p}, dis l\'alphabet en rotant… ou en chuchotant.', '{p}, fais un défilé de mode jusqu\'à la porte.',
    '{p}, mime ton dernier rêve.', '{p}, fais un compliment à chacun avec un accent marseillais.', '{p}, tiens une cuillère sur ton nez 10 secondes.', '{p}, danse comme si personne ne regardait pendant 15 secondes.',
    '{p}, imite le bruit d\'un moteur de kart pendant 10 secondes.', '{p}, fais le présentateur météo de ce soir.', '{p}, dessine {p2} les yeux fermés.', '{p}, fais rire {p2} sans le toucher en 20 secondes.',
    '{p}, parle uniquement en questions jusqu\'au prochain tour.', '{p}, fais une pub pour un objet au hasard dans la pièce.', '{p}, chante le refrain de la dernière chanson que tu as écoutée.', '{p}, fais ta meilleure imitation de {p2}.',
    '{p}, raconte une blague nulle. Si personne ne rit, recommence.', '{p}, envoie un emoji au hasard à ton dernier contact.', '{p}, fais semblant d\'être un serveur et prends la commande de tout le monde.', '{p}, fais un discours de victoire comme si tu avais gagné la course.',
    '{p}, mange quelque chose sans les mains.', '{p}, garde une grimace pendant 15 secondes.', '{p}, fais le tour de la pièce à cloche-pied.', '{p}, raconte le film Titanic en 20 secondes.'].map((t) => ['d', t])
);
QUIZ.hot.items.push(
  ...QV(['a le plus de charme', 'drague le plus mal', 'drague le mieux', 'a eu le plus de rencards ratés', 'tombe amoureux le plus vite', 'pourrait séduire n\'importe qui',
    'garde le plus de secrets sur sa vie amoureuse', 'a le plus d\'ex', 'reste ami avec ses ex', 'stalke ses ex', 'écrirait le message le plus gênant à son crush',
    'embrasse le mieux à ton avis', 'a déjà eu un crush sur quelqu\'un ici', 'rougit le plus vite', 'est le plus romantique', 'est le moins romantique',
    'ferait le premier pas', 'attendrait toujours que l\'autre fasse le premier pas', 'a les meilleures techniques de drague', 'se fait le plus draguer', 'serait le meilleur rencard',
    'a déjà envoyé un message à minuit à son ex', 'utilise le plus les applis de rencontre', 'aurait un coup de foudre en soirée', 'pourrait tomber amoureux d\'une voix', 'est le plus jaloux',
    'est le plus câlin', 'a les meilleurs bisous du groupe à ton avis', 'irait le plus loin au jeu action ou vérité', 'raconte le moins sa vie amoureuse', 'a déjà fait un rencard surprise',
    'pourrait sortir avec deux personnes en même temps', 'a le plus de prétendants', 'a le regard le plus charmeur', 'danse le plus sensuellement', 'a le sourire le plus craquant',
    'serait le plus mauvais en couple', 'formerait le couple le plus mignon', 'se marierait le premier', 'aurait le mariage le plus fou', 'oserait un slow avec quelqu\'un ici',
    'a déjà été surpris en train de s\'embrasser', 'a déjà eu un rencard catastrophe', 'pourrait écrire un roman d\'amour', 'aime le plus les bisous dans le cou', 'est le plus tactile',
    'garderait un secret d\'amour toute sa vie', 'a déjà fait semblant d\'être célibataire', 'a déjà fait semblant d\'être en couple', 'ose les tenues les plus sexy', 'a la meilleure voix au réveil',
    'aurait un crush sur son prof', 'sait le mieux masser', 'craquerait pour un accent étranger', 'flirte sans s\'en rendre compte', 'envoie les messages les plus ambigus',
    'est le plus doué pour les compliments', 'a déjà envoyé un « tu dors ? »', 'tomberait amoureux en vacances', 'garde des lettres d\'amour', 'a eu le premier bisou le plus tôt']),
  ...QN(['embrassé quelqu\'un dont je ne connaissais pas le prénom', 'envoyé un message coquin à la mauvaise personne', 'eu un crush sur un ami d\'un ami', 'fait un rendez-vous à l\'aveugle', 'dragué en boîte',
    'embrassé quelqu\'un sous la pluie', 'eu le cœur brisé', 'brisé un cœur', 'fait semblant d\'aimer un cadeau d\'un crush', 'joué à la bouteille', 'eu un rencard qui a duré plus de 12 heures',
    'écrit un poème d\'amour', 'liké une vieille photo par accident', 'dormi chez quelqu\'un dès le premier rendez-vous', 'eu un crush sur une célébrité pendant des années', 'menti sur mon nombre d\'ex',
    'dansé un slow', 'reçu un bouquet de fleurs', 'fait une déclaration publique', 'embrassé quelqu\'un pour un pari', 'dragué un serveur ou une serveuse', 'utilisé une phrase de drague nulle',
    'été en couple plus de trois ans', 'quitté quelqu\'un par message', 'été quitté par message', 'eu un crush sur quelqu\'un présent ici', 'rêvé de quelqu\'un ici']),
  ...[['un premier rendez-vous au resto', 'un pique-nique au coucher du soleil'], ['un partenaire très drôle', 'très romantique'], ['un baiser volé', 'un baiser attendu'], ['un crush secret', 'un crush public'],
    ['des mots doux', 'des petits gestes'], ['un rencard au ciné', 'un rencard au karaoké'], ['un slow', 'un rock endiablé'], ['un week-end surprise', 'une lettre écrite à la main'],
    ['sortir avec ton meilleur ami', 'avec un inconnu parfait'], ['savoir ce que ton crush pense de toi', 'ne jamais le savoir'], ['des câlins le matin', 'des câlins le soir'],
    ['un bisou sur la joue', 'un bisou dans le cou'], ['une soirée en amoureux', 'une soirée entre potes'], ['un ex qui revient', 'un crush qui disparaît']].map(([a, b]) => ['p', a, b])
);
QUIZ.jamais.items.push(...QN(['dormi dans une voiture', 'mangé un repas entier debout', 'pleuré en écoutant une chanson', 'menti pour éviter une soirée', 'quitté une soirée sans dire au revoir',
  'chanté à tue-tête en voiture', 'fait un appel vidéo en pyjama au travail', 'cassé quelque chose chez quelqu\'un sans le dire', 'oublié le prénom de quelqu\'un juste après l\'avoir entendu', 'fait une sieste au travail ou en cours',
  'mangé quelque chose tombé par terre', 'rigolé tellement fort que j\'ai pleuré', 'raté une marche devant tout le monde', 'fait semblant de connaître une chanson', 'menti sur mon CV',
  'dansé sur une table', 'perdu un pari stupide', 'fait une soirée pyjama après 20 ans', 'reçu une amende ridicule', 'fait un vol long-courrier', 'gagné un trophée',
  'eu un fou rire pendant un moment sérieux', 'pris un bain de minuit', 'fait du stop', 'été coincé dans un ascenseur', 'appelé les pompiers', 'vu un fantôme', 'fait une teinture ratée',
  'dit « je t\'aime » en premier', 'été jaloux d\'un ami', 'lu le journal intime de quelqu\'un', 'espionné le téléphone de quelqu\'un', 'pris le mauvais bus et continué quand même',
  'fait semblant d\'être occupé pour éviter quelqu\'un', 'mangé tout un paquet de biscuits d\'un coup', 'oublié un rendez-vous important', 'envoyé un message à la mauvaise personne', 'acheté un truc à 3 h du matin',
  'fait un mauvais coup à un voisin', 'dormi plus de 24 heures dans un week-end', 'gagné une bataille d\'eau', 'cassé un os', 'eu des points de suture', 'regardé un film d\'horreur seul la nuit',
  'appelé un numéro au hasard', 'participé à une émission de télé', 'chanté dans une chorale', 'fait un spectacle sur scène', 'eu plus de 1000 abonnés', 'fait un live sur un réseau social',
  'gardé un secret pendant plus de 10 ans', 'menti à mes parents sur où j\'étais', 'fait le mur', 'pris un fou rire à la messe', 'fait semblant d\'être quelqu\'un d\'autre au téléphone',
  'fait de la luge sur un plateau', 'mangé du sushi', 'goûté du fromage qui pue vraiment', 'nagé avec des dauphins', 'vu une aurore boréale', 'tenu plus de 24 heures sans téléphone',
  'eu un surnom ridicule', 'mis mes vêtements à l\'envers toute une journée', 'été en retard de plus d\'une heure', 'tapé sur la mauvaise personne dans un jeu', 'raté le dernier métro',
  'dormi dans une gare', 'fait du karting en vrai', 'eu une amende pour excès de vitesse', 'pris des cours de danse', 'pris une photo dont j\'ai honte', 'supprimé une photo par jalousie',
  'été le dernier à quitter une soirée', 'organisé une fête surprise', 'reçu une fête surprise', 'pleuré pour un jeu vidéo', 'jeté mon téléphone de rage', 'insulté un jeu de société',
  'mangé chez quelqu\'un en cachette du frigo', 'emprunté sans jamais rendre', 'fait une bêtise et accusé le chien', 'adopté un animal', 'eu peur d\'un papillon', 'parlé à mon reflet dans le miroir']));
QUIZ.prefere.items.push(...QP([['être coincé dans un ascenseur avec ton ex', 'avec ton patron'], ['chanter devant 1000 personnes', 'danser devant 1000 personnes'], ['ne jamais pouvoir t\'asseoir', 'ne jamais pouvoir t\'allonger'],
  ['avoir le hoquet toute ta vie', 'éternuer toutes les 5 minutes'], ['manger un oignon cru', 'une gousse d\'ail crue'], ['parler à l\'envers', 'marcher à l\'envers'], ['avoir des mains de bébé', 'des pieds de géant'],
  ['transpirer du ketchup', 'pleurer de la mayonnaise'], ['être un génie triste', 'un idiot heureux'], ['revivre la même journée sans fin', 'avancer de dix ans d\'un coup'], ['avoir un écureuil de compagnie', 'un perroquet qui répète tout'],
  ['ne plus jamais utiliser internet', 'ne plus jamais voyager'], ['la fin d\'une série spoilée', 'ne jamais voir la fin'], ['tout savoir sur ton futur', 'ne rien savoir'], ['être toujours en retard de 10 minutes', 'toujours en avance de 2 heures'],
  ['perdre tous tes souvenirs', 'ne plus pouvoir en créer'], ['vivre dans un jeu vidéo', 'dans un dessin animé'], ['jouer à Wild Kart en vrai', 'à cache-cache dans un château'], ['un kart qui vole', 'un kart sous-marin'],
  ['dormir dans une maison hantée', 'dans une forêt la nuit'], ['être poursuivi par 100 canards', 'par un cheval de la taille d\'un canard'], ['un doigt en plus', 'une dent en moins'], ['avoir la tête d\'un chat', 'la queue d\'un chat'],
  ['ne manger que froid', 'ne boire que chaud'], ['habiter dans un igloo', 'dans un désert'], ['ne plus pouvoir chuchoter', 'ne plus pouvoir crier'], ['un voisin batteur', 'un voisin qui chante l\'opéra'],
  ['ne parler qu\'en rimes', 'ne parler qu\'en chantant'], ['avoir des sourcils géants', 'pas de sourcils du tout'], ['un frigo toujours plein', 'un réservoir toujours plein'], ['ton histoire de recherche affichée en public', 'tes messages lus à voix haute'],
  ['dormir 20 heures par jour', 'ne jamais dormir'], ['toujours gagner aux jeux', 'toujours gagner les débats'], ['un fou rire à un enterrement', 'pleurer à un mariage'], ['tomber dans une piscine en costume', 'glisser sur une peau de banane devant ton crush'],
  ['mer de gelée', 'pluie de bonbons'], ['un téléphone sans batterie', 'un téléphone sans réseau'], ['avoir un jumeau maléfique', 'être le jumeau maléfique'], ['savoir téléporter mais aléatoirement', 'voler mais à 5 km/h'],
  ['avoir 10 enfants', 'zéro enfant'], ['un mariage énorme', 'un mariage en secret'], ['être le meilleur à un jeu que personne ne connaît', 'moyen à un jeu que tout le monde connaît'], ['changer de prénom', 'changer de pays'],
  ['manger une pizza à l\'ananas tous les jours', 'ne plus jamais manger de pizza'], ['chatouiller un lion', 'faire un câlin à un crocodile'], ['vivre dans le monde de Wild Kart', 'vivre dans un film de super-héros'],
  ['une soirée sans musique', 'une soirée sans boissons'], ['ne plus jamais pouvoir mentir', 'ne plus jamais pouvoir garder un secret'], ['te réveiller célèbre', 'te réveiller riche'], ['avoir le pouvoir de geler le temps', 'de rembobiner 10 secondes'],
  ['devenir un mème', 'devenir une chanson'], ['un dîner avec ton héros', 'un dîner avec ton toi du futur'], ['que tes pensées s\'affichent sur ton front', 'que ta voix change selon ton humeur'], ['un cri de dauphin', 'un rire de hyène'],
  ['n\'écouter qu\'une seule chanson à vie', 'ne regarder qu\'un seul film à vie'], ['vivre sans miroir', 'vivre sans photos'], ['un câlin d\'un ours', 'un bisou d\'une girafe'], ['une maison en bonbons', 'une maison en Lego'],
  ['aller en cours en pyjama', 'aller au travail en costume de mascotte'], ['être un vampire', 'être un loup-garou'], ['avoir un bouton pause', 'un bouton retour'], ['parler avec les objets', 'parler avec les plantes'],
  ['marcher sur des Lego', 'te cogner le petit orteil'], ['un week-end au ski', 'un week-end à la plage'], ['gagner une course en dernière seconde', 'gagner avec une grande avance'], ['perdre contre ton pire ennemi', 'gagner contre ton meilleur ami'],
  ['faire la vaisselle toute ta vie', 'le ménage toute ta vie'], ['un chef cuisinier à vie', 'un chauffeur à vie'], ['savoir danser parfaitement', 'savoir chanter parfaitement'], ['avoir toujours raison', 'avoir toujours de la chance'],
  ['ne plus jamais avoir de devoirs ou de réunions', 'avoir trois mois de vacances par an'], ['un chat géant', 'un éléphant nain'], ['vivre sous l\'eau', 'vivre dans les nuages'], ['dire tout ce que tu penses', 'ne plus jamais parler'],
  ['ton plat préféré tous les jours', 'un plat différent tous les jours'], ['être un personnage de jeu vidéo', 'le créateur du jeu'], ['les pieds qui sentent le fromage', 'l\'haleine qui sent l\'ail'], ['retrouver ton premier amour', 'ton meilleur ami d\'enfance'],
  ['manger des insectes une fois', 'ne plus jamais manger de chocolat'], ['une voiture de sport', 'un tour du monde'], ['être toujours trempé', 'toujours plein de sable'], ['dormir dans un hamac', 'dans un lit à eau'],
  ['être capable de rétrécir', 'de grandir à volonté'], ['un cheval', 'un jet-ski'], ['le pouvoir de parler toutes les langues des animaux', 'de toutes les langues humaines'], ['ne plus avoir de genoux', 'ne plus avoir de coudes'],
  ['un hiver à Montréal', 'un été à Séville'], ['avoir des cheveux qui changent de couleur', 'des yeux qui changent de couleur'], ['qu\'on te dise toujours la vérité', 'qu\'on te dise toujours ce que tu veux entendre'],
  ['pouvoir respirer sous l\'eau', 'pouvoir voir dans le noir'], ['un repas à 5 étoiles', 'un kebab à 3 h du matin'], ['une seule vraie amitié', 'cent copains'], ['jouer un méchant au cinéma', 'un héros dans une pub'],
  ['écrire un best-seller', 'réaliser un film culte'], ['avoir des ailes', 'une queue de sirène'], ['revivre ton enfance', 'découvrir ta vieillesse'], ['un concert privé de ton artiste préféré', 'un dîner avec lui'],
  ['tout le monde ici chante faux', 'tout le monde ici danse mal'], ['ne jamais retrouver tes chaussettes', 'ne jamais retrouver tes clés'], ['un chewing-gum collé dans les cheveux', 'du sable dans le maillot'],
  ['être le roi d\'une petite île', 'un citoyen d\'un grand empire'], ['faire un tour en montgolfière', 'un tour en sous-marin'], ['des vacances sans téléphone', 'un téléphone sans vacances'], ['la vie sans fromage', 'la vie sans pain']]));

/* ---- tirage sans répétition (mémorisé sur le téléphone de l'hôte) ---- */
const SEEN_KEY = 'wildkart.seen';
let SEEN = (() => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []); } catch (e) { return new Set(); } })();
function seenSave() { try { const arr = [...SEEN]; localStorage.setItem(SEEN_KEY, JSON.stringify(arr.slice(-6000))); } catch (e) { /* rien */ } }
function qkey(c, it) { return c + '|' + it[1] + '|' + (it[2] || ''); }
function normQ(t) { return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function qhash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const RECENT_KEY = 'wildkart.recent';
let RECENT = (() => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; } })();
function markSeen(h) { if (!h) return; SEEN.add(h); RECENT = RECENT.filter((x) => x !== h); RECENT.push(h); if (RECENT.length > 500) RECENT = RECENT.slice(-500); seenSave(); try { localStorage.setItem(RECENT_KEY, JSON.stringify(RECENT)); } catch (e) { /* rien */ } }
function freshPick(pool, keyOf) {
  if (!pool.length) return null; let fresh = pool.filter((x) => !SEEN.has(qhash(keyOf(x))));
  if (!fresh.length) {
    // tout a été vu : on recommence, mais jamais avec les plus récentes
    const keep = new Set(RECENT.slice(-Math.floor(pool.length * .6)));
    for (const x of pool) { const h = qhash(keyOf(x)); if (!keep.has(h)) SEEN.delete(h); }
    fresh = pool.filter((x) => !SEEN.has(qhash(keyOf(x)))); if (!fresh.length) fresh = pool;
  }
  const it = pick(fresh); const h = qhash(keyOf(it)); markSeen(h); freshPick.last = h; return it;
}
QUIZ.hot.items.push(
  ...QV(['enverrait un texto à son ex ce soir', 'a le plus de matchs sur les applis', 'se ferait passer pour célibataire en soirée', 'a le regard le plus craquant', 'oserait chanter une sérénade sous une fenêtre',
    'a déjà eu un coup de foudre en vacances', 'garde des messages d\'amour de ses ex', 'finirait la soirée avec quelqu\'un rencontré ici', 'fait le plus de clins d\'œil', 'tomberait pour un accent',
    'organiserait le rencard le plus fou', 'a le meilleur look de séducteur', 'est le plus jaloux en couple', 'est le plus tactile', 'ferait une déclaration en public',
    'a déjà embrassé quelqu\'un sous le gui', 'a la playlist la plus romantique', 'pourrait écrire un roman d\'amour', 'a le plus de crushs secrets', 'oublierait le prénom de son rencard',
    'flirte même sans le faire exprès', 'craquerait pour un serveur ou une serveuse', 'serait le plus fidèle', 'ferait le meilleur slow', 'a déjà fait semblant de dormir pour éviter un bisou',
    'a la voix la plus séduisante', 'enverrait des fleurs au premier rendez-vous', 'se ferait démasquer en draguant', 'a le sourire le plus charmeur', 'a déjà eu un rencard avec deux personnes le même jour',
    'mettrait le plus de temps à se préparer pour un rencard', 'serait le meilleur entremetteur', 'a déjà déclaré sa flamme par message vocal', 'pourrait séduire avec une seule phrase', 'a un faible pour les gens en uniforme',
    'finirait par épouser son ou sa meilleure amie', 'a déjà été pris en flagrant délit de bisou', 'parle le plus de sa vie amoureuse', 'en parle le moins', 'raconterait tout de son rencard le lendemain',
    'a le plus de surnoms mignons pour ses ex', 'se laisserait tenter par un rencard à l\'aveugle', 'ferait un strip-poker… mais garderait ses chaussettes', 'est le roi ou la reine des sous-entendus', 'devient tout rouge en parlant de son crush',
    'a déjà écrit une lettre d\'amour', 'ferait le premier pas ce soir', 'a les meilleures anecdotes de rencard', 'aurait le plus de prétendants dans une émission de télé-réalité', 'tomberait amoureux en une danse']),
  ...[['un premier rendez-vous au cinéma', 'un premier rendez-vous au resto'], ['un bisou sous la pluie', 'un bisou au coucher du soleil'], ['un crush timide', 'un crush qui ose tout'],
    ['recevoir une lettre d\'amour', 'recevoir une sérénade'], ['un rencard en pique-nique', 'un rencard en karaoké'], ['un slow', 'une danse endiablée'], ['qu\'on te drague avec humour', 'qu\'on te drague avec des compliments'],
    ['un week-end en amoureux à la mer', 'un week-end en amoureux à la montagne'], ['un premier message très drôle', 'un premier message très direct'], ['un massage des épaules', 'un massage des pieds'],
    ['un rencard surprise', 'un rencard que tu organises'], ['un bisou volé', 'un bisou demandé'], ['un partenaire très câlin', 'un partenaire très indépendant'], ['flirter en soirée', 'flirter par messages'],
    ['un regard intense', 'un sourire en coin'], ['un dîner aux chandelles', 'un brunch au lit'], ['une déclaration en public', 'une déclaration en tête-à-tête'], ['un tatouage du prénom de ton crush', 'une chanson écrite pour toi'],
    ['un rencard qui dure toute la nuit', 'trois petits rencards dans la semaine'], ['quelqu\'un qui cuisine pour toi', 'quelqu\'un qui danse pour toi']].map(([a, b]) => ['p', a, b])
);
function quizCount() { let n = 0; for (const k in QUIZ) n += QUIZ[k].items.length; return n; }

/* ---- roulette équilibrée : un peu de tout, jamais deux cases du même genre côte à côte ---- */
const WHEEL_KIND = { 'Bois 1': 'self', 'Bois 2': 'self', 'Bois 3': 'self', 'Toi + 1': 'self', 'Distribue 2': 'give', 'Distribue 3': 'give', 'Voisin gauche': 'give', 'Voisin droite': 'give', 'Le plus jeune': 'give', 'Lunettes': 'give', 'Dernier arrivé': 'give',
  'Tout le monde': 'all', 'Selfie': 'all', 'Double': 'all', 'Joker': 'safe', 'Verre d\'eau': 'safe', 'Compliments': 'safe', 'Échange': 'safe', 'Rejoue': 'safe',
  'Partenaire': 'rule', 'Maître du pouce': 'rule', 'Nouvelle règle': 'rule', 'Accent': 'rule', 'Pas de prénoms': 'rule', 'Question Soft': 'quest', 'Question Hot': 'quest', 'Je n\'ai jamais': 'quest', 'Tu préfères': 'quest', 'Action': 'quest' };
const WHEEL_MIX = { self: 2, give: 2, all: 1, safe: 1, chal: 2, rule: 1, quest: 1 };
function buildWheel(mode, player, others, sips, dose, allowHot) {
  if (mode === 'custom') return wheelEntries().map((e) => ({ l: e.length > 18 ? e.slice(0, 17) + '…' : e, t: player + ' : ' + e, pen: '' }));
  const pool = WHEEL_POOL.filter((w) => allowHot || w[4] !== 'hot'); const by = {};
  for (const w of pool) { const k = WHEEL_KIND[w[0]] || 'chal'; (by[k] = by[k] || []).push(w); }
  let chosen = []; for (const k in WHEEL_MIX) chosen.push(...shuffle((by[k] || []).slice()).slice(0, WHEEL_MIX[k]).map((w) => [k, w]));
  // ordre sans voisins identiques
  for (let tries = 0; tries < 40; tries++) { shuffle(chosen); let ok = true; for (let i = 0; i < chosen.length; i++) if (chosen[i][0] === chosen[(i + 1) % chosen.length][0]) { ok = false; break; } if (ok) break; }
  return chosen.map(([, w]) => {
    const n = Math.max(1, Math.ceil((w[3] || 1) * dose));
    if (w[4]) { const items = QUIZ[w[4]].items.filter((it) => it[0] !== 'v' && it[0] !== 'a' && it[0] !== 'g'); const it = freshPick(items, (x) => qkey(w[4], x)); const p2 = others.length ? pick(others) : 'ton voisin';
      const fill = (t) => t.replace(/\{p\}/g, player).replace(/\{p2\}/g, p2).replace(/\{n\}/g, n + ' ' + gw(n));
      return { l: w[0], t: fill(cardText(it)), pen: fill(penFor(it[0], sips, it[3])) }; }
    return { l: w[0], t: (sips ? w[1] : w[2]).replace(/\{p\}/g, player).replace(/\{n\}/g, n + ' ' + gw(n)), pen: '' };
  });
}

/* ---- lot 2 ---- */
QUIZ.soft.items.push(...['quelle est la chose la plus courageuse que tu aies faite ?', 'quel est ton meilleur souvenir avec quelqu\'un ici ?', 'si tu étais un plat, lequel serais-tu ?', 'quel est le dernier film qui t\'a vraiment marqué ?',
  'quel pays rêves-tu de visiter ?', 'quel est ton petit plaisir coupable ?', 'tu préfères le matin ou le soir, et pourquoi ?', 'quelle est la meilleure blague que tu connaisses ?', 'quel objet garderais-tu sur une île déserte ?',
  'qui était ton idole quand tu étais petit ?', 'quelle est ta plus grande fierté ?', 'quelle compétence aimerais-tu apprendre ?', 'quel est le plus beau cadeau que tu aies fait ?', 'quelle est ta saison préférée ?',
  'quel est ton jeu vidéo préféré de tous les temps ?', 'quelle chanson te met toujours de bonne humeur ?', 'quel est le pire film que tu aies vu ?', 'quel est ton rituel du dimanche ?', 'quelle est ta plus grande qualité ?',
  'quel est ton plus gros défaut ?', 'quelle est la dernière chose qui t\'a fait vraiment peur ?', 'quel personnage de fiction te ressemble le plus ?', 'quel est ton souvenir de vacances préféré ?', 'quel est ton dessert préféré ?',
  'tu as déjà eu un surnom ? Lequel ?', 'quel est le métier le plus bizarre que tu aimerais essayer ?', 'quelle est ta boisson préférée ?', 'quelle est ta plus grosse dépense inutile ?', 'quelle est la meilleure décision de ton année ?',
  'quel est ton record de sommeil ?', 'quel talent aimerais-tu avoir pour épater tout le monde ?', 'quelle est la chose la plus bizarre dans ta chambre ?', 'quel est ton premier souvenir ?', 'tu ferais quoi avec un million d\'euros ?',
  'quelle est ta phrase fétiche ?', 'quelle est ta pire honte au collège ?', 'quelle est la dernière fois que tu as menti ?', 'quel est le meilleur conseil que tu aies reçu ?', 'quelle célébrité inviterais-tu à dîner ?',
  'quel est ton animal préféré et pourquoi ?', 'quelle est la musique de ton enfance ?', 'qu\'est-ce qui te fait rire à coup sûr ?', 'quelle est ta plus grosse peur pour l\'avenir ?', 'qu\'est-ce que tu ne prêterais jamais ?',
  'quel est le plat que tu cuisines le mieux ?', 'quelle est la tradition familiale que tu adores ?', 'qu\'est-ce que tu aimerais changer dans le monde ?', 'quelle est ta série doudou ?', 'quel endroit te rend le plus calme ?',
  'quel serait le titre du film de ta vie ?', 'qui jouerait ton rôle dans ce film ?', 'quelle est la dernière chose que tu as recherchée sur internet ?', 'quelle appli supprimerais-tu de ta vie ?', 'quel est ton plus gros regret de shopping ?',
  'quelle est ta façon préférée de te détendre ?', 'qu\'est-ce que tu faisais le samedi quand tu avais dix ans ?', 'quel est le dernier livre que tu as lu ?', 'quelle est la plus belle chose qu\'on t\'ait dite ?', 'qui t\'a le plus influencé ?',
  'quel prof t\'a le plus marqué ?', 'quel est le pire repas de ta vie ?', 'quel est le meilleur repas de ta vie ?', 'quel est ton rêve le plus fou ?', 'si tu pouvais changer de prénom, lequel choisirais-tu ?',
  'quelle est la chose que tu fais mieux que tout le monde ici ?', 'quelle est la dernière fois que tu as pleuré ?', 'quelle est ta plus grande addiction ?', 'quel est ton emoji préféré ?', 'quelle est l\'invention dont tu ne pourrais pas te passer ?',
  'quel est le meilleur concert de ta vie ?', 'qu\'est-ce qui te met en colère à coup sûr ?', 'à quoi ressemblerait ta journée parfaite ?', 'quel super-héros serais-tu ?', 'quel est ton souvenir le plus gênant en famille ?'].map((t) => ['q', '{p}, ' + t]));
QUIZ.fun.items.push(...QV(['finirait par dormir dans la baignoire', 'pourrait gagner un concours d\'imitation de poule', 'se ferait voler son sandwich par une mouette', 'rirait pendant une audition', 'rate toujours les photos de groupe',
  'pourrait vendre de la glace à un pingouin', 'serait capable de manger une pizza entière seul', 'se perd dans les menus des restos', 'confond toujours gauche et droite', 'parle à son GPS',
  'pleure en coupant des oignons… et en regardant des pubs', 'a déjà dansé dans un supermarché', 'fait des siestes de trois heures', 'ferait un concours de regards avec un chat', 'se ferait battre par un enfant aux échecs',
  'deviendrait président par accident', 'gagnerait un concours de déguisement', 'oublierait son propre anniversaire', 'mettrait du sel à la place du sucre', 'se ferait mordre par un hamster',
  'irait en soirée en pyjama', 'ferait le meilleur pirate', 'parle aux bébés comme à des adultes', 'parle aux adultes comme à des bébés', 'appellerait son chat « mon chéri »',
  'pourrait dormir pendant un concert de métal', 'serait le premier à demander « on mange quoi ? »', 'a toujours un plan foireux', 'se fait toujours avoir à cache-cache', 'garde des chips cachées dans sa chambre',
  'deviendrait chanteur de bal', 'ferait un excellent mime', 'rate tous ses selfies', 'tombe de son lit en dormant', 'oublie ce qu\'il voulait dire au milieu de sa phrase',
  'se coince dans un pull', 'se brûle la langue à chaque repas', 'arrive toujours avec une excuse incroyable', 'serait le meilleur en apocalypse zombie', 'ferait un très mauvais braqueur de banque',
  'parle en dormant de choses bizarres', 'raconte ses rêves en détail le matin', 'fait le plus de fautes d\'orthographe', 'met des majuscules partout', 'écrit encore « mdr » en 2026',
  'rirait au mauvais moment d\'un film triste', 'a le meilleur cri de joie', 'fait le pire cri de joie', 'se lève en retard même avec cinq réveils', 'se fait le plus engueuler par sa mère',
  'adopterait une chèvre', 'parlerait à une IA comme à un ami', 'demande toujours « t\'es sûr ? »', 'gagnerait un concours de lancer de chaussettes', 'pourrait faire le tour du monde avec 10 euros',
  'garde des cartes de fidélité de magasins fermés', 'a déjà répondu « toi aussi » au serveur qui dit bon appétit', 'dit « on se fait un truc » et ne le fait jamais', 'se mettrait à pleurer pour un trophée en plastique', 'ferait un excellent grand-père ou grand-mère grincheux']),
  ...['{p}, parle comme un pirate jusqu\'au prochain tour.', '{p}, fais un câlin collectif avec tout le monde.', '{p}, chante « joyeux anniversaire » à {p2} même si ce n\'est pas son anniversaire.', '{p}, fais semblant d\'être un GPS et guide quelqu\'un jusqu\'à la cuisine.',
    '{p}, raconte une histoire d\'horreur en 30 secondes.', '{p}, imite ton prof le plus marquant.', '{p}, fais 5 pompes ou une imitation de phoque.', '{p}, invente un slogan pour {p2}.',
    '{p}, montre ton talent le plus inutile.', '{p}, parle sans dire « euh » pendant 30 secondes.', '{p}, fais un tour de magie, même raté.', '{p}, présente le JT de ce soir avec un accent anglais.',
    '{p}, fais la voix de la personne à ta gauche.', '{p}, deviens le DJ : choisis la prochaine chanson.', '{p}, fais un compliment poétique à {p2}.', '{p}, raconte ton pire réveil.',
    '{p}, fais la danse du robot pendant 10 secondes.', '{p}, dis trois mots qui te décrivent, les autres valident.', '{p}, joue un jeu de rôle : tu es un vendeur d\'aspirateurs.', '{p}, chuchote tout ce que tu dis jusqu\'au prochain tour.',
    '{p}, mime un animal en train de faire du kart.', '{p}, fais ton meilleur rire de méchant.', '{p}, propose un toast pour le groupe.', '{p}, défie {p2} au pouce-pouce.',
    '{p}, fais semblant d\'être une star qui arrive sur le tapis rouge.', '{p}, fais un haïku sur la soirée.', '{p}, montre ton fond d\'écran.', '{p}, fais un beatbox de 10 secondes.',
    '{p}, échange de place avec {p2}.', '{p}, fais ta meilleure tête de photo d\'identité.', '{p}, dis un truc gentil sur chaque personne ici.', '{p}, raconte comment tu as rencontré {p2}.',
    '{p}, invente une danse et apprends-la à {p2}.', '{p}, imite une sirène d\'ambulance.', '{p}, parle comme un présentateur de télé-achat.', '{p}, fais une déclaration à la pizza.',
    '{p}, fais un discours de remise d\'Oscar.', '{p}, fais rire tout le monde en 30 secondes.', '{p}, raconte la dernière chose qui t\'a énervé, en chanson.', '{p}, deviens le chef : donne un ordre amusant au groupe.'].map((t) => ['d', t]));
QUIZ.hot.items.push(...['quel est ton type de personne idéal ?', 'quelle est ta meilleure technique de drague ?', 'quel est le rencard le plus fou de ta vie ?', 'quelle est la chose la plus romantique qu\'on ait faite pour toi ?',
  'qu\'est-ce qui te fait craquer chez quelqu\'un ?', 'quel est ton pire râteau ?', 'à quel âge as-tu eu ton premier bisou ?', 'quel est le compliment qui te fait le plus d\'effet ?', 'tu as déjà eu un crush sur un ami ?',
  'quel serait ton rendez-vous parfait ?', 'qu\'est-ce qui est rédhibitoire pour toi en rencard ?', 'tu préfères qu\'on te drague ou draguer ?', 'quel est le message le plus gênant que tu aies envoyé à un crush ?', 'qui ici a le plus de charme selon toi ?',
  'quel est ton plus gros fantasme de voyage en amoureux ?', 'tu as déjà été amoureux de deux personnes à la fois ?', 'quelle chanson te rend romantique ?', 'tu es plutôt câlins ou bisous ?', 'quel est le moment le plus gênant de ta vie amoureuse ?',
  'tu as déjà menti pour impressionner un crush ?', 'tu as déjà été en couple en secret ?', 'quelle est la plus belle déclaration que tu aies reçue ?', 'tu crois au coup de foudre ?', 'tu as déjà dragué par message vocal ?',
  'quel est le premier détail que tu regardes chez quelqu\'un ?', 'tu as déjà eu un crush sur un prof ou un collègue ?', 'quelle est ta tenue la plus séduisante ?', 'qu\'est-ce qui te fait rougir à coup sûr ?', 'ton ex le plus marquant, en un mot ?',
  'tu as déjà embrassé quelqu\'un dans un lieu insolite ?', 'tu as déjà regretté un bisou ?', 'quel est ton pire souvenir de premier rendez-vous ?', 'tu préfères un rencard au resto ou une soirée à la maison ?', 'quelle célébrité te fait craquer ?',
  'tu es déjà tombé amoureux en vacances ?', 'tu as déjà reçu un message coquin par erreur ?', 'quelle est ta phrase de drague la plus nulle ?', 'tu as déjà fait le premier pas ? Raconte.', 'tu es plutôt jaloux ou très cool ?',
  'quel est ton plus beau souvenir amoureux ?', 'tu as déjà écrit une lettre d\'amour ?', 'tu as déjà été en couple à distance ?', 'quelle est la chose la plus folle que tu ferais par amour ?', 'tu as déjà eu un rencard avec quelqu\'un rencontré en ligne ?',
  'quel prénom te fait craquer ?', 'tu préfères les gens timides ou audacieux ?', 'quel est le geste le plus mignon pour toi ?', 'tu dors plutôt en cuillère ou chacun de son côté ?', 'quel est ton plus beau bisou ?'].map((t) => ['q', '{p}, ' + t]),
  ...['{p}, fais ton plus beau regard séducteur à {p2}.', '{p}, fais une déclaration d\'amour exagérée à {p2}.', '{p}, chuchote un compliment à l\'oreille de {p2}.', '{p}, fais un slow de 15 secondes avec {p2}.',
    '{p}, montre ta meilleure technique de drague sur {p2}.', '{p}, fais un bisou sur la joue de la personne de ton choix.', '{p}, masse les épaules de {p2} pendant 20 secondes.', '{p}, dis ce que tu trouves le plus charmant chez {p2}.',
    '{p}, fais un clin d\'œil à chaque personne ici.', '{p}, lis le dernier message que tu as envoyé à un crush (ou invente-le).', '{p}, imite ta façon de draguer en soirée.', '{p}, fais un compliment sur le style de {p2} comme un grand couturier.',
    '{p}, écris un mini poème d\'amour pour {p2}.', '{p}, danse de façon sensuelle pendant 10 secondes.', '{p}, regarde {p2} dans les yeux 15 secondes sans rire.'].map((t) => ['d', t]));
QUIZ.jamais.items.push(...QN(['mangé au lit', 'regardé le téléphone de quelqu\'un par-dessus son épaule', 'fait croire que j\'étais malade pour rester à la maison', 'pris une douche de plus d\'une heure', 'raté un examen du code',
  'chanté dans un micro devant des inconnus', 'fait une blague qui a mal tourné', 'mangé seul au restaurant', 'gagné à un jeu télévisé', 'fait une soirée qui a fini au petit-déjeuner',
  'été dans une bagarre', 'oublié quelqu\'un à une station-service', 'pleuré au travail ou en cours', 'été pris en photo à mon insu', 'fait de la plongée', 'conduit sans permis',
  'pris un bain dans une fontaine', 'fait un vœu sur une étoile filante', 'vu un éclipse', 'pris l\'avion seul', 'fait la queue plus de deux heures', 'campé sous la pluie', 'été piqué par une méduse',
  'gagné un pari', 'rendu un cadeau', 'offert un cadeau que j\'avais reçu', 'menti sur un diplôme', 'fait semblant de lire un livre pour un exposé', 'triché à un examen', 'été invité à un mariage d\'inconnus',
  'traversé la frontière à pied', 'mangé un piment très fort', 'eu une intoxication alimentaire', 'renversé un verre sur quelqu\'un', 'eu un accident de vélo', 'escaladé quelque chose d\'interdit',
  'nourri un animal sauvage', 'été chassé par un chien', 'eu peur d\'une poule', 'dormi dans un aéroport', 'raté mon arrêt de bus en dormant', 'fait un appel en me trompant de numéro et continué la conversation',
  'été pris en train de parler seul', 'dansé sous la pluie', 'fait une bataille de nourriture', 'cuisiné avec un tutoriel et tout raté', 'fait brûler des pâtes', 'été viré d\'un cours', 'joué à un jeu toute une nuit',
  'gagné une partie de Wild Kart', 'perdu toutes mes parties d\'un jeu en une soirée', 'eu le fou rire à un moment interdit', 'fait un message vocal de plus de 5 minutes', 'oublié de rendre un livre à la bibliothèque',
  'vu un film plus de dix fois', 'connu toutes les répliques d\'un film', 'pleuré pour un personnage de série', 'eu un correspondant étranger', 'appris une langue en appli', 'gardé une plante en vie plus d\'un an',
  'monté un meuble sans notice', 'perdu une vis en montant un meuble', 'appelé le service client en criant', 'fait un selfie avec un animal', 'eu un compte secret sur un réseau social', 'menti sur ma taille',
  'mangé des céréales au dîner', 'fait une sieste dans un parc', 'rêvé que je volais', 'fait un rêve prémonitoire', 'eu une chanson coincée dans la tête une semaine', 'fait un régime de plus de trois jours',
  'couru un marathon', 'abandonné une course', 'gagné une médaille sportive', 'fait du karaoké seul dans ma voiture', 'dit « moi non plus » à « bon appétit »']));
QUIZ.prefere.items.push(...QP([['un chien de la taille d\'un cheval', 'un cheval de la taille d\'un chien'], ['être maire de ta ville', 'capitaine d\'un bateau pirate'], ['ne plus jamais attendre', 'ne plus jamais te dépêcher'],
  ['savoir cuisiner comme un chef', 'savoir réparer n\'importe quoi'], ['toujours avoir faim', 'toujours avoir soif'], ['vivre dans une série comique', 'dans un film d\'action'], ['avoir un majordome robot', 'un chien qui fait le ménage'],
  ['passer une nuit au musée', 'une nuit dans un parc d\'attractions'], ['manger des frites froides', 'boire un soda sans bulles'], ['un concert dans ton salon', 'un match dans ton jardin'], ['te battre contre un kangourou', 'faire la course avec une autruche'],
  ['ne jamais rater un bus', 'ne jamais faire la queue'], ['avoir des yeux bioniques', 'des oreilles bioniques'], ['tout ton argent en pièces de 1 centime', 'en un seul billet introuvable'], ['être professeur', 'être élève pour toujours'],
  ['partir sur une île déserte avec ton pire ennemi', 'seul'], ['une glace qui ne fond jamais', 'un café toujours chaud'], ['ne plus jamais avoir de réseau', 'ne plus jamais avoir de batterie pleine'], ['gagner une course avec une banane', 'avec une étoile'],
  ['être le premier sur Mars', 'le dernier sur Terre'], ['avoir un rire contagieux', 'un bâillement contagieux'], ['être toujours trop habillé', 'jamais assez habillé'], ['un ami très sincère', 'un ami très drôle'],
  ['revoir un film pour la première fois', 'relire un livre pour la première fois'], ['pouvoir dormir partout', 'pouvoir manger de tout'], ['un vélo volant', 'une trottinette sous-marine'], ['un chapeau qui fait de la musique', 'des chaussures qui brillent'],
  ['mettre des chaussettes mouillées', 'un pull qui gratte'], ['vivre dans une bibliothèque', 'dans une salle de jeux'], ['avoir les cheveux qui poussent d\'un mètre par jour', 'qui ne poussent jamais'], ['ne parler qu\'avec des proverbes', 'qu\'avec des répliques de films'],
  ['passer une journée en tant que ton chat', 'que ton voisin'], ['être un excellent menteur', 'détecter tous les mensonges'], ['l\'été sans glace', 'l\'hiver sans chocolat chaud'], ['jouer dans un groupe de rock', 'dans une équipe de foot pro'],
  ['dormir sous la pluie', 'dormir en plein soleil'], ['pouvoir rembobiner ta journée', 'mettre ta journée en pause'], ['un trésor caché', 'une carte vers un trésor'], ['que ton ex écrive ta biographie', 'que ta mère la raconte en public'],
  ['manger une tarte au citron sans sucre', 'un café sans eau'], ['une fête tous les soirs', 'une sieste tous les après-midi'], ['parler à ta version de 10 ans', 'à ta version de 80 ans'], ['un clown à ton mariage', 'un mime à ton enterrement'],
  ['être coincé dans un manège', 'dans une file d\'attente'], ['un robot qui cuisine mal', 'un chef qui cuisine lentement'], ['jouer à Wild Kart avec des inconnus', 'perdre contre tes potes'], ['tomber dans la boue', 'tomber dans la neige'],
  ['une piscine dans ton salon', 'un toboggan dans ton escalier'], ['ne plus jamais manger de fromage', 'ne plus jamais manger de chocolat'], ['avoir le pouvoir de deviner les mots de passe', 'de deviner les cadeaux'], ['un an sans réseaux sociaux', 'un an sans séries'],
  ['un câlin d\'un inconnu', 'une poignée de main d\'un ami'], ['être une légende du karaoké', 'une légende du bowling'], ['avoir un chauffeur de taxi bavard', 'un coiffeur bavard'], ['ton plat préféré sans sel', 'ton dessert préféré sans sucre'],
  ['passer pour un génie', 'passer pour quelqu\'un de super cool'], ['être poursuivi par une abeille', 'par un pigeon'], ['un été pluvieux', 'un hiver sans neige'], ['parler très fort tout le temps', 'chuchoter tout le temps'],
  ['un costume de dinosaure pour un entretien', 'un smoking pour faire du sport'], ['dormir dans un lit trop petit', 'dans un lit trop dur'], ['manger tout avec des baguettes', 'tout avec une cuillère'], ['jouer à un jeu d\'horreur en VR', 'faire du saut en parachute'],
  ['te battre avec des oreillers', 'avec des pistolets à eau'], ['savoir faire du skate', 'du roller'], ['une maison sur l\'eau', 'une maison dans une grotte'], ['tout ton dressing en jaune', 'tout ton dressing à pois'],
  ['être star d\'un film muet', 'star d\'une comédie musicale'], ['cinq petits chats', 'un énorme chien'], ['un week-end au château', 'un week-end en yourte'], ['ne plus avoir de goût', 'ne plus avoir d\'odorat']]));
QUIZ.soft.items.push(...QV(['ferait le meilleur capitaine d\'équipe', 'serait le plus calme en cas d\'urgence', 'paniquerait le plus en cas d\'urgence', 'adore les surprises', 'déteste les surprises', 'se souvient de tous les prénoms',
  'pourrait vivre dans une tente toute l\'année', 'a le plus de plantes chez lui', 'connaît le plus de recettes', 'serait le meilleur DJ', 'a le plus de cicatrices', 'a la plus belle collection de stickers',
  'ferait le meilleur instituteur', 'a la plus grande famille', 'fait les meilleurs cadeaux', 'emballe les cadeaux le plus mal', 'fait la meilleure raclette', 'mange le plus de fromage', 'se lève la nuit pour grignoter', 'partage toujours ses frites',
  'ne partage jamais ses frites', 'a le pire sens de l\'humour', 'a le meilleur sens de l\'humour', 'part toujours à l\'aventure', 'a le plus de souvenirs de voyage', 'perd toujours au pierre-feuille-ciseaux', 'gagne toujours au pierre-feuille-ciseaux',
  'serait le plus heureux avec un chiot', 'serait le meilleur maître d\'école de sorciers', 'porte les plus belles chaussettes', 'a les plus beaux yeux', 'rit le plus souvent', 'a le plus de patience', 'en a le moins',
  'deviendrait chef d\'entreprise', 'aurait une ferme', 'vivrait à l\'étranger', 'reviendrait toujours dans sa ville natale', 'ferait un très bon voisin', 'ferait un voisin bruyant', 'organise les meilleures soirées',
  'se souvient des détails de toutes les soirées', 'oublie tout le lendemain', 'serait le roi ou la reine du bal', 'aurait été un super chevalier', 'serait le meilleur ami d\'un dragon', 'écrirait le meilleur discours', 'arriverait à faire rire un garde royal']));
// supprime les doublons (même texte dans plusieurs lots)
(() => { const seen = new Set(); for (const k in QUIZ) QUIZ[k].items = QUIZ[k].items.filter((it) => { const key = it[0] + '|' + it[1] + '|' + (it[2] || ''); if (seen.has(key)) return false; seen.add(key); return true; }); })();

/* ================= Mode en ligne (WebRTC via PeerJS) ================= */
const NET_PREFIX = 'wildkart-v7-';
/* ================= v8 : réseau robuste (on peut quitter l'appli et revenir) ================= */
if (!SAVE.uid) { SAVE.uid = 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3); store(); }
const UID = SAVE.uid;
const ALL_THEMES = ['soft', 'fun', 'hot', 'jamais', 'prefere'];
const Net = { peer: null, host: false, code: '', id: '', pid: '', conns: new Map(), uidOf: new Map(), seen: new Map(), drops: new Map(), hc: null, players: [],
  settings: { track: -1, cc: 1, bots: true, botLvl: 1, laps: 0, obst: true, pmode: 'normal', rounds: 3, party: false, dose: 1, type: 'sips', themes: ALL_THEMES.slice(), wheelMode: 'random' },
  inRace: false, states: new Map(), sendT: 0, evId: 0, leaving: false, lastHost: 0, rejoining: false, rejoinT: null, lastStart: null, lastStartAt: 0 };
function netStatus(t) { const el = $('#on-status'); if (el) el.textContent = t || ''; }
function randCode() { const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)]; return s; }
function netUsable() {
  if (BUILD !== 'pwa') { const off = $('#on-offline'); if (off) off.hidden = false; toast('Le mode en ligne marche dans l\'appli Wild Kart, pas dans cet aperçu.', 5000); return false; }
  if (typeof window.Peer !== 'function' || typeof RTCPeerConnection === 'undefined') { toast('Ce navigateur ne permet pas le jeu en ligne.', 4000); return false; }
  return true;
}
function netReset() {
  Net.leaving = true; clearTimeout(Net.rejoinT); for (const t of Net.drops.values()) clearTimeout(t);
  try { for (const c of Net.conns.values()) c.close(); } catch (e) { /* déjà fermé */ }
  try { if (Net.hc) Net.hc.close(); } catch (e) { /* déjà fermé */ }
  try { if (Net.peer) Net.peer.destroy(); } catch (e) { /* déjà détruit */ }
  Object.assign(Net, { peer: null, host: false, code: '', id: '', pid: '', hc: null, players: [], inRace: false, sendT: 0, leaving: false, rejoining: false, lastStart: null });
  Net.conns = new Map(); Net.states = new Map(); Net.uidOf = new Map(); Net.seen = new Map(); Net.drops = new Map();
}
function netFail(e) { const off = $('#on-offline'); if (off) off.hidden = false; const t = e && e.type; netStatus(t === 'hote-injoignable' ? 'Impossible de joindre l\'hôte. Vérifiez que vous avez tous les deux la même version (Réglages, tout en bas), puis réessayez.' : t === 'peer-unavailable' ? 'Aucune partie avec ce code. Vérifie le code, et que vous avez tous les deux la même version (Réglages, tout en bas).' : t === 'network' || t === 'server-error' || t === 'socket-error' ? 'Pas de connexion au serveur. Vérifie internet et réessaie.' : 'Connexion impossible (' + (t || 'erreur') + ').'); netReset(); renderOnline(); }
const PEER_OPTS = () => Object.assign({ debug: 0 }, window.TK_PEER_OPTS || {});
function prepControls() {
  if (SAVE.control === 'tilt' && isTouch) ensureMotion().then((ok) => { Input.useTilt = ok; if (ok && !SAVE.calibrated) { UI.afterCalib = () => show('online'); show('calib'); } });
  else Input.useTilt = false;
}
const present = () => Net.players.filter((p) => !p.away);
/* ---- hôte ---- */
function netCreate() {
  if (!netUsable()) return; AudioSys.init(); prepControls(); netReset(); Net.host = true; Net.code = randCode(); netStatus('Création de la partie…');
  const peer = netPeer(NET_PREFIX + Net.code); Net.peer = peer;
  peer.on('open', (id) => { Net.pid = id; Net.id = UID; Net.players = [{ id: UID, name: SAVE.name || 'Hôte', cfg: myCfg(), host: true }]; netStatus('Partie créée. Donne le code à tes potes.'); renderOnline(); });
  peer.on('visible', (ok) => { if (Net.peer !== peer || Net.inRace) return; netStatus(ok ? 'Partie ' + Net.code + ' : ✓ visible, tes potes peuvent la rejoindre.' : 'Partie ' + Net.code + ' : serveur injoignable, vérifie ta connexion…'); });
  peer.on('error', (e) => { if (e.type === 'unavailable-id' && !Net.players.length) { try { peer.destroy(); } catch (x) { /* rien */ } netCreate(); return; } if (e.type === 'peer-unavailable' || Net.players.length) return; netFail(e); });
  peer.on('connection', (conn) => {
    conn.on('open', () => { Net.conns.set(conn.peer, conn); });
    conn.on('data', (d) => hostOnData(conn, d)); conn.on('close', () => hostOnClose(conn)); conn.on('error', () => hostOnClose(conn));
  });
  peer.on('disconnected', () => { setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { /* rien */ } }, 500); });
}
function hostRelay(d, except) { for (const [id, c] of Net.conns) if (id !== except && c.open) { try { c.send(d); } catch (e) { /* connexion fermée */ } } }
function hostBroadcast(d) { hostRelay(d, null); }
function lobbyPlayers() { return Net.players.map((p) => ({ id: p.id, name: p.name, cfg: p.cfg, host: !!p.host, away: !!p.away, fid: p.fid || (p.host ? frMyId() : '') })); }
function hostBroadcastLobby() { musPrewarmOnline(); hostBroadcast({ t: 'lobby', players: lobbyPlayers(), settings: Net.settings, code: Net.code, inRace: Net.inRace, cl: SAVE.chefList || '' }); renderOnline(); }
function hostOnData(conn, d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'hello') {
    if (d.cl && chefListApply(d.cl, true)) { hostBroadcastLobby(); hostKickBanned(); }
    if ((d.fid && CHEF.b.has(String(d.fid))) || (Array.isArray(d.fo) && d.fo.some((x) => CHEF.b.has(String(x)))) || (d.pu && CHEF.b.has('@' + String(d.pu)))) { try { conn.send({ t: 'banned' }); } catch (e) { /* rien */ } setTimeout(() => conn.close(), 400); return; }
    const id = String(d.uid || conn.peer).slice(0, 40); Net.uidOf.set(conn.peer, id); Net.seen.set(id, performance.now());
    let p = Net.players.find((x) => x.id === id);
    if (p) { const was = p.away; p.away = 0; p.pid = conn.peer; p.name = String(d.name || p.name).slice(0, 10); p.cfg = cleanCfg(d.cfg); if (d.fid) p.fid = String(d.fid).slice(0, 20); clearTimeout(Net.drops.get(id)); Net.drops.delete(id); if (was) toast(p.name + ' est de retour !'); }
    else {
      if (present().length >= 8) { try { conn.send({ t: 'busy' }); } catch (e) { /* rien */ } setTimeout(() => conn.close(), 400); Net.uidOf.delete(conn.peer); return; }
      p = { id, pid: conn.peer, name: String(d.name || 'Joueur').slice(0, 10), cfg: cleanCfg(d.cfg), fid: d.fid ? String(d.fid).slice(0, 20) : '', pu: d.pu ? String(d.pu).slice(0, 16) : '' }; Net.players.push(p); AudioSys.sfx('got');
    }
    hostBroadcastLobby();
    // on le remet là où en est la partie
    try {
      if (Net.inRace && Net.lastStart && Net.lastStart.roster.some((e) => e.id === id)) conn.send({ t: 'resume', start: Net.lastStart, elapsed: performance.now() - Net.lastStartAt });
      else if (!Net.inRace && MINI.cur) conn.send(Object.assign({}, MINI.cur));
      else if (Net.inRace && Net.lastStart) conn.send({ t: 'watch', start: Net.lastStart, elapsed: performance.now() - Net.lastStartAt });
    } catch (e) { /* rien */ }
    return;
  }
  const uid = Net.uidOf.get(conn.peer); if (!uid) return; Net.seen.set(uid, performance.now());
  { const p = Net.players.find((x) => x.id === uid); if (p && p.away && p.pid === conn.peer) { p.away = 0; hostBroadcastLobby(); } }
  if (d.t === 'st' && Array.isArray(d.s)) { d.s[0] = uid; Net.states.set(uid, d.s); applyRemote(d.s); }
  else if (d.t === 'pong') { if (d.c) (Net.pings = Net.pings || new Map()).set(uid, Math.round(performance.now() - d.c)); }
  else if (d.t === 'ev') { hostRelay(d, conn.peer); onNetEvent(d); }
  else if (d.t === 'fin') { d.id = uid; hostRelay(d, conn.peer); onNetFin(d); }
  else if (d.t === 'cl') { if (chefListApply(d.cl, true)) { hostBroadcastLobby(); hostKickBanned(); } }
  else if (d.t === 'mvote') miniRecord('vote', uid, d.v);
  else if (d.t === 'mres') miniRecord('reflex', uid, +d.v);
}
function hostOnClose(conn) {
  const uid = Net.uidOf.get(conn.peer); Net.conns.delete(conn.peer); Net.uidOf.delete(conn.peer); if (!uid) return;
  const p = Net.players.find((x) => x.id === uid); if (!p || p.pid !== conn.peer || p.host) return;
  p.away = Date.now(); hostBroadcastLobby(); toast(p.name + ' s\'est absenté. Il revient tout seul en rouvrant le jeu.', 3500);
  clearTimeout(Net.drops.get(uid)); Net.drops.set(uid, setTimeout(() => hostDrop(uid), 240000));
}
function hostDrop(uid) {
  const i = Net.players.findIndex((p) => p.id === uid); Net.drops.delete(uid); if (i < 0 || !Net.players[i].away) return;
  const name = Net.players[i].name; Net.players.splice(i, 1); Net.states.delete(uid); hostBroadcast({ t: 'left', id: uid }); onNetLeft(uid); hostBroadcastLobby(); toast(name + ' a quitté la partie.');
}
/* ---- invité ---- */
function netJoin(code) {
  if (!netUsable()) return; code = (code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); if (code.length !== 4) { netStatus('Le code fait 4 lettres.'); return; }
  AudioSys.init(); prepControls(); netReset(); Net.host = false; Net.code = code; netStatus('Connexion à la partie ' + code + '…');
  netNewPeer();
}
function netNewPeer() {
  const peer = netPeer(); Net.peer = peer;
  peer.on('open', (id) => { if (Net.peer !== peer) return; Net.pid = id; Net.id = UID; clientConnect(); });
  peer.on('error', (e) => { if (Net.peer !== peer) return; if (Net.rejoining || Net.lastHost) return; netFail(e); });
  peer.on('disconnected', () => { setTimeout(() => { try { if (Net.peer === peer && !peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { /* rien */ } }, 500); });
}
function clientConnect() {
  const peer = Net.peer; if (!peer || peer.destroyed) return;
  const c = peer.connect(NET_PREFIX + Net.code, { reliable: true, serialization: 'json' }); const old = Net.hc; Net.hc = c; if (old && old !== c) { try { old.close(); } catch (e) { /* rien */ } }
  const to = setTimeout(() => { if (!c.open && Net.hc === c && !Net.rejoining && !Net.lastHost) netFail({ type: 'hote-injoignable' }); }, 28000);
  c.on('open', () => {
    if (Net.hc !== c) return; clearTimeout(to); Net.lastHost = performance.now(); c.send({ t: 'hello', name: SAVE.name || 'Joueur', cfg: myCfg(), uid: UID, fid: frMyId(), fo: SAVE.fidOld || [], pu: SAVE.acct ? String(SAVE.acct.u).toLowerCase() : '', cl: SAVE.chefList || '' });
    if (Net.rejoining) { Net.rejoining = false; clearTimeout(Net.rejoinT); toast('De retour dans la partie !', 2200); } else netStatus('Connecté !');
    SAVE.lastCode = Net.code; SAVE.lastCodeAt = Date.now(); store();
  });
  c.on('data', (d) => { if (Net.hc !== c) return; Net.lastHost = performance.now(); clientOnData(d); });
  c.on('close', () => { if (Net.hc !== c) return; if (!Net.leaving && Net.peer) netRejoin(); });
  c.on('error', () => { /* géré par la reconnexion */ });
}
// reconnexion automatique : l'appli est passée en arrière-plan, le réseau a coupé…
function netRejoin() {
  if (Net.host || !Net.code || Net.leaving || Net.rejoining) return;
  Net.rejoining = true; Net.rejoinStart = performance.now(); toast('Reconnexion à la partie…', 2500);
  const tryOnce = () => {
    if (!Net.rejoining || Net.leaving) return;
    if (performance.now() - Net.rejoinStart > 120000) { Net.rejoining = false; toast('Impossible de revenir dans la partie : l\'hôte est peut-être parti.', 5000); netReset(); toMenu(); return; }
    const p = Net.peer;
    if (!p || p.destroyed) netNewPeer();
    else if (p.disconnected) { try { p.reconnect(); } catch (e) { /* rien */ } setTimeout(() => { if (Net.rejoining && Net.peer === p && !p.disconnected) clientConnect(); else if (Net.rejoining && Net.peer === p) { try { p.destroy(); } catch (e) { /* rien */ } netNewPeer(); } }, 1500); }
    else clientConnect();
    Net.rejoinT = setTimeout(tryOnce, 5000);
  };
  tryOnce();
}
function clientOnData(d) {
  if (!d || typeof d !== 'object') return;
  switch (d.t) {
    case 'ping': if (d.r && d.r[Net.id] != null) Net.ping = d.r[Net.id]; if (Net.hc && Net.hc.open) { try { Net.hc.send({ t: 'pong', c: d.c }); } catch (e) { /* rien */ } } break;
    case 'busy': toast('La partie est pleine (8 joueurs).', 4500); netReset(); renderOnline(); break;
    case 'banned': toast('Le chef t\'a bloqué : impossible de rejoindre cette partie.', 5000); netReset(); renderOnline(); break;
    case 'lobby': if (d.cl) chefListApply(d.cl, true); Net.players = d.players || []; Net.settings = Object.assign(Net.settings, d.settings || {}); musPrewarmOnline(); if (!Net.inRace) { if (UI.screen !== 'calib' && !(UI.screen === 'mini' && MINI.cur) && UI.screen !== 'settings' && UI.screen !== 'chef') show('online'); renderOnline(); } chefRender(); break;
    case 'start': netStartRace(d); break;
    case 'watch': if (!(G.race && G.race.online && G.race.raceId === d.start.raceId)) netWatch(d); break;
    case 'resume': if (!(G.race && G.race.online && G.race.raceId === d.start.raceId)) { const m = Object.assign({}, d.start, { delay: (d.start.delay || 7000) - (d.elapsed || 0) }); netStartRace(m); } break;
    case 'sts': if (Array.isArray(d.l)) for (const s of d.l) if (s && s[0] !== Net.id) applyRemote(s); break;
    case 'ev': onNetEvent(d); break;
    case 'fin': onNetFin(d); break;
    case 'left': onNetLeft(d.id); break;
    case 'lobbyback': goLobby(); break;
    case 'mini': if (!Net.inRace) onMini(d); break;
  }
}
// battement de cœur : l'hôte envoie « ping », les invités répondent ; un invité muet est affiché absent
setInterval(() => {
  if (!Net.peer || document.hidden) return; const now = performance.now();
  if (Net.host) {
    hostBroadcast({ t: 'ping', c: now, r: Net.pings ? Object.fromEntries(Net.pings) : {} }); let ch = false;
    for (const p of Net.players) { if (p.host) continue; const last = Net.seen.get(p.id) || 0; const silent = now - last > 9000; if (silent && !p.away) { p.away = Date.now(); ch = true; } }
    if (ch) hostBroadcastLobby();
  } else if (Net.code && Net.lastHost && !Net.rejoining && now - Net.lastHost > 7000) netRejoin();
}, 1500);
// retour dans l'appli : on rattrape le temps et on vérifie la connexion
let netHiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { netHiddenAt = performance.now(); return; }
  const dur = netHiddenAt ? (performance.now() - netHiddenAt) / 1000 : 0; netHiddenAt = 0;
  if (G.race && G.race.online && (G.race.state === 'race' || G.race.state === 'finished') && dur > .2) { G.race.t += dur; if (G.W) G.W.clock = (G.W.clock || 0) + dur; }
  if (!Net.peer) return;
  try { if (Net.peer.disconnected && !Net.peer.destroyed) Net.peer.reconnect(); } catch (e) { /* rien */ }
  if (Net.host) { for (const p of Net.players) if (!p.host && !p.away) Net.seen.set(p.id, performance.now()); }
  else if (Net.code) setTimeout(() => { if (!document.hidden && !Net.rejoining && performance.now() - Net.lastHost > 2500) netRejoin(); }, 1500);
});

function netEmit(d) { d.t = d.t || 'ev'; if (!Net.peer) return; if (Net.host) hostBroadcast(d); else if (Net.hc && Net.hc.open) { try { Net.hc.send(d); } catch (e) { /* rien */ } } }
const netNewId = () => Net.id + ':' + (++Net.evId);
function hostStart() {
  if (!Net.host || !Net.players.length) return;
  const S = Net.settings, humans = present().slice(0, 8), n = humans.length, total = S.bots ? 8 : n, roster = [];
  shuffle(humans.slice()).forEach((p, i) => roster.push({ id: p.id, cfg: Object.assign({}, p.cfg, { name: p.name }), slot: total - n + i, ai: false }));
  for (let i = 0; i < total - n; i++) roster.push({ id: 'ai' + i, cfg: RIVALS[i % RIVALS.length], slot: i, ai: true });
  const ti = S.track >= 0 ? S.track : Math.floor(Math.random() * TRACKS.length);
  const msg = { t: 'start', ti, cc: S.cc, roster, party: S.party, dose: S.dose, cupRound: Net.cup && Net.cup.racing ? Net.cup.round : 0, botLvl: S.botLvl != null ? S.botLvl : 1, laps: S.laps || 0, obst: S.obst !== false, music: S.music || 'auto', seed: (Math.random() * 4294967295) >>> 0, delay: 7000, raceId: Date.now().toString(36) + Math.random().toString(36).slice(2, 5) };
  Net.lastStart = msg; Net.lastStartAt = performance.now(); hostBroadcast(msg); netStartRace(msg);
}
function netStartRace(msg) {
  const goAt = performance.now() + (msg.delay || 7000) - (Net.host ? 0 : 80); MINI.cur = null; clearTimeout(MINI.timer);
  UI.mode = 'online'; Net.inRace = true; Net.states.clear(); Net.settings.party = !!msg.party; Net.settings.dose = msg.dose || 1;
  Net.botLvl = msg.botLvl != null ? msg.botLvl : 1; Net.cupRound = msg.cupRound || 0; RACE_OPTS.laps = msg.laps || 0; RACE_OPTS.obst = msg.obst !== false; RACE_OPTS.seed = msg.seed || 1; RACE_OPTS.music = typeof msg.music === 'string' && MUSIC_OPTS.some((o) => o[0] === msg.music) ? msg.music : 'auto';
  AudioSys.init(); startRace(msg.ti, msg.cc, null, msg.roster); G.race.goAt = goAt; G.race.raceId = msg.raceId; G.race.cupRound = msg.cupRound || 0; G.W.clock = -(goAt - performance.now()) / 1000;
}
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
function packState(k) { return [k.netId, r2(k.x), r2(k.z), r2(k.y), r3(k.h), r3(k.vh), r2(k.speed), k.idx, k.lap, r2(k.prog), k.drift, k.boost > 0 ? 1 : 0, k.spin > 0 ? 1 : 0, k.shield > 0 ? 1 : 0, k.air ? (k.air === 'glide' ? 1 : k.air === 'hop' ? 2 : 3) : 0, k.star > 0 ? 1 : 0, k.ghost > 0 ? 1 : 0, k.shrink > 0 ? 1 : 0, k.P && k.P !== G.W.S ? k.P.id : -1, k.driftTier || 0, k.trickT > 0 ? 1 : 0, (k.netSeqOut = ((k.netSeqOut || 0) + 1) % 1e9)]; }
function applyRemote(s) {
  const k = G.netKarts && G.netKarts.get(s[0]); if (!k || !k.isRemote || !G.W) return;
  { const q = s[21]; if (q != null) { if (k.netSeq != null && q <= k.netSeq && q > k.netSeq - 600) return; k.netSeq = q; } }
  k.net = { x: +s[1], z: +s[2], y: +s[3], h: +s[4], vh: +s[5], sp: +s[6], t: performance.now() };
  { const pid = s[18] == null ? -1 : s[18] | 0; k.P = pid >= 0 && G.W.branches[pid] ? G.W.branches[pid] : G.W.S; }
  k.idx = clamp(s[7] | 0, 0, k.P.N - 1); k.lap = s[8] | 0; k.prog = +s[9]; k.drift = s[10] | 0; k.boost = s[11] ? .2 : 0; k.spinNet = !!s[12]; k.shield = s[13] ? 1 : 0; k.air = [false, 'glide', 'hop', 'jump'][s[14] | 0] || false; k.driftTier = s[19] | 0; if (s[20] && !(k.trickT > 0)) { k.trickT = .45; k.trickDir = 1; } k.star = s[15] ? 1 : 0; k.ghost = s[16] ? 1 : 0; k.shrink = s[17] ? 1 : 0;
  if (!k.netInit) { k.netInit = true; k.x = k.net.x; k.z = k.net.z; k.h = k.net.h; k.vh = k.net.vh; }
}
function updateRemote(k, dt) {
  const n = k.net; if (!n) return; const W = G.W, S = W.S;
  const age = Math.min(.2, (performance.now() - n.t) / 1000), px = n.x + Math.sin(n.vh) * n.sp * age, pz = n.z + Math.cos(n.vh) * n.sp * age;
  const e2 = (px - k.x) ** 2 + (pz - k.z) ** 2, f = e2 > 900 ? 1 : 1 - Math.exp(-dt * (e2 > 25 ? 14 : 9));
  k.x += (px - k.x) * f; k.z += (pz - k.z) * f; k.y += (n.y - k.y) * f; k.groundY = n.y;
  k.h += angDiff(k.h, n.h) * f; k.vh += angDiff(k.vh, n.vh) * f; k.speed = n.sp;
  if (k.trickT > 0) k.trickT -= dt;
  if (k.spinNet) k.spinAng += dt * 13; else k.spinAng = lerp(k.spinAng, Math.round(k.spinAng / TAU) * TAU, 1 - Math.exp(-dt * 10));
  const RP = k.P || S, rj = clamp(k.idx, 0, RP.N - 1); k.lat = (k.x - RP.px[rj]) * RP.rx[rj] + (k.z - RP.pz[rj]) * RP.rz[rj]; k.off = Math.abs(k.lat) > (RP.hw || W.hw) + W.curbW * .5 && !openSide(RP, rj);
}
function netSendStates() {
  const mine = G.karts.filter((k) => !k.isRemote && !k.spect).map(packState);
  if (Net.host) hostBroadcast({ t: 'sts', l: mine.concat([...Net.states.values()]) });
  else if (Net.hc && Net.hc.open && mine.length) { try { Net.hc.send({ t: 'st', s: mine[0] }); } catch (e) { /* rien */ } }
}
function onNetEvent(d) {
  const R = G.race; if (!R || !R.online || !G.netKarts) return; const K = (id) => G.netKarts.get(id) || null;
  if (d.e === 'oil') spawnOil(+d.x, +d.z, +d.y, K(d.o), d.id, d.kind || 'oil');
  else if (d.e === 'rocket') spawnRocket(+d.x, +d.z, +d.y, +d.h, +d.sp, K(d.o), K(d.tg), d.id, d.kind || 'rocket');
  else if (d.e === 'gone') removeById(d.id);
  else if (d.e === 'zap') zap(K(d.o), +d.p);
  else if (d.e === 'bulle') { const t = K(d.tg); if (t && !t.isRemote) bubbleKart(t, K(d.o)); }
  else if (d.e === 'confettis') confettiBlast(K(d.o), +d.p);
  else if (d.e === 'disco') discoWave(K(d.o), +d.x, +d.z);
  else if (d.e === 'police') policeSweep(K(d.ex));
  else if (d.e === 'vol') { const t = K(d.tg); if (t && !t.isRemote && t.item) { t.item = null; t.uses = 0; if (t.isPlayer) banner('On t\'a aspiré ton objet !', 1.4, true); } }
  else if (d.e === 'ventilo') ventiloGust(K(d.o), +d.x, +d.z, +d.h);
  else if (d.e === 'hit' && d.src === Net.id) { if (R.pt && R.state === 'race') { R.pt.gives++; if (R.pt.gives <= 3) banner('Touché ! Distribue 1', 1.4); } else banner('Touché !', 1); AudioSys.sfx('hit'); }
}
function onNetFin(d) {
  const R = G.race; if (!R || !R.online) return; const k = G.netKarts.get(d.id); if (!k || k.finished) return;
  k.finished = true; k.finishTime = +d.time; k.bestLap = +d.best || Infinity; R.order.push(k); R.order.sort((a, b) => a.finishTime - b.finishTime);
  (R.netHits = R.netHits || new Map()).set(d.id, Math.min(3, d.hits | 0));
  if (R.resultsShown) renderOnlineResults();
}
function onNetLeft(id) {
  if (!G.netKarts || !G.race || !G.race.online) return; const k = G.netKarts.get(id); if (!k) return;
  G.W.scene.remove(k.mesh.g); G.karts.splice(G.karts.indexOf(k), 1); G.netKarts.delete(id); const o = G.race.order.indexOf(k); if (o >= 0) G.race.order.splice(o, 1);
  if (G.race.resultsShown) renderOnlineResults();
}
function onlineResults() { G.race.resultsShown = true; renderOnlineResults(); show('results'); }
function renderOnlineResults() {
  const R = G.race; if (!R) return; $('#r-big').hidden = true;
  const fin = G.karts.filter((k) => k.finished && !k.spect).sort((a, b) => a.finishTime - b.finishTime), live = G.karts.filter((k) => !k.finished).sort((a, b) => b.prog - a.prog);
  const order = fin.concat(live), humans = order.filter((k) => !k.isAI), allDone = humans.every((k) => k.finished), party = Net.settings.party, dose = Net.settings.dose || 1;
  const sips = new Map();
  if (party && allDone) { const m = humans.length, base = [3, 2, 1]; humans.forEach((k, i) => { const fromLast = m - 1 - i; const b = m > 1 && i > 0 && fromLast < base.length ? base[fromLast] : 0;
    const hits = k.isPlayer ? (R.pt ? Math.min(3, R.pt.hits) : 0) : ((R.netHits && R.netHits.get(k.netId)) || 0); sips.set(k, Math.ceil((b + hits) * dose)); }); }
  const rows = order.map((k, i) => { const r = [String(i + 1), k.name + (k.isAI ? ' (bot)' : ''), k.finished ? fmtTime(k.finishTime) : 'en course…']; if (party) r.push(k.isAI ? '' : (allDone ? '+' + sips.get(k) : '…')); return r; });
  fillTable(rows, order.findIndex((k) => k.isPlayer));
  const me = order.findIndex((k) => k.isPlayer) + 1;
  $('#r-title').textContent = R.watching ? 'Course terminée' : me === 1 ? 'Victoire !' : ordFr(me) + ' place';
  $('#r-sub').textContent = TRACKS[R.ti].name + ' · ' + CC[R.cc].name + ' · ' + (allDone ? 'Résultats définitifs' : 'En attente des autres pilotes…');
  if (party && allDone && humans.length > 1) bigLine(humans[0].name + ' distribue ' + Math.ceil(3 * dose) + ' ' + gw(Math.ceil(3 * dose)) + ' · ' + humans[humans.length - 1].name + ' boit le plus.');
  const spec = canSpectate() ? [['Regarder la course', 'ghost', specStart]] : [];
  if (Net.host && Net.cup && Net.cup.racing) { if (allDone && !R.cupDone) { R.cupDone = true; setTimeout(() => { if (G.race === R && Net.cup && Net.cup.racing) hostCupVerdict(); }, 4000); } spec.push(['Verdict', 'red', hostCupVerdict]); }
  if (Net.cup && Net.cup.racing || R.cupRound) $('#r-sub').textContent = 'Manche ' + (R.cupRound || (Net.cup && Net.cup.round)) + ' · ' + (allDone ? 'verdict dans un instant…' : 'en attente des autres pilotes…');
  setButtons(Net.host ? [['Quitter', 'ghost', () => { netReset(); toMenu(); }]].concat(spec, [['Retour au salon', 'red', () => { hostBroadcast({ t: 'lobbyback' }); goLobby(); }]]) : [['Quitter', 'ghost', () => { netReset(); toMenu(); }]].concat(spec));
  if (!Net.host) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'L\'hôte relance la prochaine course.'; $('#r-buttons').prepend(p); }
}
function goLobby() {
  if (G.race) G.race.spec = null; $('#spec').hidden = true; $('#b-pause').hidden = false;
  Net.inRace = false; G.paused = false; showHud(false); AudioSys.engine(0, false); AudioSys.stopMusic();
  startAttract(G.W ? G.W.ti : 0); UI.mode = 'online'; show('online'); renderOnline();
}
function chipsSel(el, list, cur, onPick) {
  el.innerHTML = ''; for (const [v, label] of list) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', String(v === cur)); b.onclick = () => { AudioSys.sfx('click'); onPick(v); }; el.appendChild(b); }
}
function renderOnline() {
  const inLobby = !!(Net.peer && Net.id && (Net.host || (Net.hc && Net.hc.open)));
  $('#on-start').hidden = inLobby; $('#on-lobby').hidden = !inLobby; if (!inLobby) return;
  $('#on-codeval').textContent = Net.code;
  const list = $('#on-players'); list.innerHTML = '';
  for (const p of Net.players) { const b = document.createElement('span'); b.className = 'pchip'; b.style.setProperty('--c', (p.cfg && p.cfg.color) || '#ff4f3a'); b.innerHTML = '<i></i><span></span>'; b.querySelector('span').textContent = p.name + (p.host ? ' (hôte)' : '') + (p.id === Net.id ? ' · toi' : '') + (p.away ? ' · absent' : ''); if (p.away) b.style.opacity = '.55'; list.appendChild(b); }
  const S = Net.settings; $('#on-host-opts').hidden = !Net.host; $('#on-go').hidden = !Net.host;
  if (Net.host) {
    const upd = (k, v) => { S[k] = v; hostBroadcastLobby(); };
    if (UI.lastTrackSel !== S.track || !$('#on-track').children.length) { UI.lastTrackSel = S.track; renderTrackGrid($('#on-track'), S.track, (v) => upd('track', v), true); }
    chipsSel($('#on-cc'), CC.map((c, i) => [i, c.name]), S.cc, (v) => upd('cc', v));
    chipsSel($('#on-bots'), [[true, 'Avec bots'], [false, 'Sans bots']], S.bots, (v) => upd('bots', v));
    $('#on-botlvl-row').hidden = !S.bots; chipsSel($('#on-botlvl'), BOT_LV.map((l, i) => [i, l.name]), S.botLvl != null ? S.botLvl : 1, (v) => upd('botLvl', v));
    chipsSel($('#on-laps'), [[0, 'Auto'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], S.laps || 0, (v) => upd('laps', v));
    chipsSel($('#on-obst'), [[true, 'Avec'], [false, 'Sans']], S.obst !== false, (v) => upd('obst', v));
    chipsSel($('#on-music'), MUSIC_OPTS.map(([v, n]) => [v, v === 'auto' ? 'Auto' : v === 'off' ? 'Ta musique (Spotify…)' : n]), S.music || 'auto', (v) => { upd('music', v); if (v === 'off') toast('Chacun lance Spotify ou sa musique : le jeu garde les bruitages.', 4500); });
    const pm = S.pmode || (S.party ? 'soiree' : 'normal');
    chipsSel($('#on-party'), [['normal', 'Normale'], ['soiree', 'Soirée (gorgées)'], ['pari', 'Pari Pilote']], pm, (v) => { S.pmode = v; S.party = v === 'soiree'; hostBroadcastLobby(); });
    $('#on-pari-box').hidden = pm !== 'pari'; chipsSel($('#on-rounds'), [[3, '3'], [5, '5'], [8, '8']], S.rounds || 3, (v) => upd('rounds', v));
    $('#on-go').firstChild.textContent = pm === 'pari' ? 'Lancer le Pari Pilote' : 'Lancer la course';
    chipsSel($('#on-dose'), [[.5, 'Douce'], [1, 'Normale'], [1.5, 'Costaud']], S.dose, (v) => upd('dose', v));
    chipsSel($('#on-type'), [['sips', 'Gorgées'], ['dares', 'Gages']], S.type || 'sips', (v) => upd('type', v));
    renderThemeChips();
    chipsSel($('#on-wmode'), [['random', 'Cases aléatoires'], ['custom', 'Cases perso']], S.wheelMode || 'random', (v) => upd('wheelMode', v));
    $('#on-wait').textContent = present().length < 2 ? 'Partage le code. Tu peux aussi lancer seul avec les bots.' : present().length + ' joueurs prêts.' + (Net.players.length > present().length ? ' Les absents reviennent tout seuls en rouvrant le jeu.' : '');
  } else {
    $('#on-wait').textContent = 'En attente de l\'hôte… ' + (S.track >= 0 ? TRACKS[S.track].name : 'Circuit au hasard') + ' · ' + CC[S.cc].name + (S.laps ? ' · ' + S.laps + ' tour' + (S.laps > 1 ? 's' : '') : '') + (S.obst === false ? ' · sans obstacles' : '') + (S.pmode === 'pari' ? ' · Pari Pilote' : S.party ? ' · Soirée' : '');
  }
}
$('#on-create').onclick = () => { AudioSys.sfx('click'); netCreate(); };
$('#on-join').onclick = () => { AudioSys.sfx('click'); netJoin($('#on-code').value); };
$('#on-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
$('#on-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') netJoin(e.target.value); });
$('#on-go').onclick = () => { AudioSys.sfx('click'); if (Net.settings.pmode === 'pari') hostCupStart(); else { Net.cup = null; hostStart(); } };
$$('#on-minis [data-mini]').forEach((b) => (b.onclick = () => { AudioSys.init(); AudioSys.sfx('click'); hostMini(b.dataset.mini); }));
$('#on-leave').onclick = () => { AudioSys.sfx('click'); netReset(); renderOnline(); netStatus(''); };
$('#on-back').onclick = () => { AudioSys.sfx('click'); netReset(); netStatus(''); show('title'); };
$('#on-wedit').onclick = () => { AudioSys.sfx('click'); UI.weBack = 'online'; show('wedit'); };
$('#on-copy').onclick = () => { const t = Net.code; try { navigator.clipboard.writeText(t).then(() => toast('Code copié : ' + t)).catch(() => toast('Code : ' + t)); } catch (e) { toast('Code : ' + t); } };


/* ================= Roulette (roue qui tourne) ================= */
// [étiquette, texte gorgées, texte gages, gorgées de base, catégorie de question éventuelle]
const WHEEL_POOL = [
  ['Bois 1', '{p} boit {n}.', '{p} prend un petit gage.', 1], ['Bois 2', '{p} boit {n}.', '{p} prend un gage.', 2], ['Bois 3', '{p} boit {n} !', '{p} prend un gros gage.', 3],
  ['Distribue 2', '{p} distribue {n}.', '{p} choisit quelqu\'un pour un gage.', 2], ['Distribue 3', '{p} distribue {n} !', '{p} choisit deux personnes pour un gage.', 3],
  ['Tout le monde', 'Tout le monde boit {n} !', 'Gage collectif : tout le monde chante un refrain !', 1], ['Joker', 'Joker : {p} ne boit rien et peut annuler une gorgée plus tard.', 'Joker : {p} peut annuler un gage plus tard.', 0],
  ['Verre d\'eau', '{p} boit un verre d\'eau cul sec. Santé !', '{p} boit un verre d\'eau cul sec.', 0], ['Voisin gauche', 'Le voisin de gauche de {p} boit {n}.', 'Le voisin de gauche de {p} prend un gage.', 2],
  ['Voisin droite', 'Le voisin de droite de {p} boit {n}.', 'Le voisin de droite de {p} prend un gage.', 2], ['Partenaire', '{p} choisit un partenaire : il boit chaque fois que {p} boit, jusqu\'au prochain tour.', '{p} choisit un partenaire de gages jusqu\'au prochain tour.', 0],
  ['Maître du pouce', '{p} devient maître du pouce : quand il pose son pouce sur la table, le dernier à l\'imiter boit 1.', '{p} devient maître du pouce : le dernier à l\'imiter prend un gage.', 0],
  ['Nouvelle règle', '{p} invente une règle. Qui l\'oublie boit 1.', '{p} invente une règle. Qui l\'oublie prend un gage.', 0],
  ['Question Soft', '', '', 2, 'soft'], ['Question Hot', '', '', 2, 'hot'], ['Je n\'ai jamais', '', '', 1, 'jamais'], ['Tu préfères', '', '', 1, 'prefere'], ['Action', '', '', 2, 'fun'],
  ['Vérité', 'Le groupe pose une question à {p}. Réponse honnête ou {n} à boire.', 'Le groupe pose une question à {p}. Réponse honnête ou gage.', 2],
  ['Imitation', '{p} imite quelqu\'un du groupe. Si personne ne devine, {p} boit {n}.', '{p} imite quelqu\'un du groupe. Si personne ne devine, gage.', 2],
  ['Chanson', '{p} chante 10 secondes, sinon {n} à boire.', '{p} chante 10 secondes.', 2], ['Accent', '{p} parle avec un accent jusqu\'au prochain tour. Chaque oubli : 1.', '{p} parle avec un accent jusqu\'au prochain tour.', 0],
  ['Compliments', '{p} fait un compliment à chacun. Pas de gorgée !', '{p} fait un compliment à chacun.', 0], ['Pierre-feuille', '{p} défie qui il veut à pierre-feuille-ciseaux. Le perdant boit {n}.', '{p} défie qui il veut à pierre-feuille-ciseaux. Le perdant prend un gage.', 2],
  ['Regard', '{p} fixe quelqu\'un dans les yeux. Le premier qui rit boit {n}.', '{p} fixe quelqu\'un dans les yeux. Le premier qui rit prend un gage.', 2],
  ['Pas de prénoms', 'Interdit de dire un prénom jusqu\'au prochain tour. Chaque erreur : 1.', 'Interdit de dire un prénom jusqu\'au prochain tour.', 0],
  ['Le plus jeune', 'Le plus jeune du groupe boit {n}.', 'Le plus jeune du groupe prend un gage.', 2], ['Lunettes', 'Tous ceux qui portent des lunettes boivent {n}.', 'Tous ceux qui portent des lunettes prennent un gage.', 1],
  ['Rejoue', '{p} relance la roue deux fois !', '{p} relance la roue deux fois !', 0], ['Selfie', 'Selfie de groupe ! Le dernier prêt boit {n}.', 'Selfie de groupe ! Le dernier prêt prend un gage.', 1],
  ['Échange', '{p} échange sa place avec la personne de son choix.', '{p} échange sa place avec la personne de son choix.', 0], ['Dernier arrivé', 'La dernière personne arrivée ce soir boit {n}.', 'La dernière personne arrivée ce soir prend un gage.', 2],
  ['Équilibre', '{p} tient 10 secondes sur un pied, sinon {n}.', '{p} tient 10 secondes sur un pied.', 1], ['Double', 'Double ! La prochaine personne qui boit boit le double.', 'Double ! Le prochain gage compte double.', 0],
  ['Toi + 1', '{p} et la personne de son choix boivent {n}.', '{p} et la personne de son choix prennent un gage.', 1], ['Thème', '{p} lance un thème (ex. : marques de voitures). Le premier qui sèche boit {n}.', '{p} lance un thème. Le premier qui sèche prend un gage.', 2],
  ['Mime', '{p} mime un film. Si personne ne trouve en 30 s, {p} boit {n}.', '{p} mime un film en 30 secondes.', 2], ['Danse', '{p} danse 10 secondes. Refus : {n}.', '{p} danse 10 secondes.', 2],
];
const WHEEL_COLORS = ['#ff4f3a', '#ffc531', '#38b6ff', '#3ee08f', '#7c4dff', '#ff6fb5', '#ff8a3a', '#2ee6ff'];
const DEFAULT_WHEEL = ['Bois 2', 'Distribue 3', 'Tout le monde boit', 'Gage', 'Joker', 'Chante un refrain', 'Question au choix', 'Verre d\'eau'];
function wheelEntries() { return (SAVE.wheel && SAVE.wheel.length >= 2 ? SAVE.wheel : DEFAULT_WHEEL).slice(0, 16); }
// construit les cases d'un tour : { l: étiquette, t: texte final, pen }
function buildWheel_old(mode, player, others, sips, dose, allowHot) {
  if (mode === 'custom') return wheelEntries().map((e) => ({ l: e.length > 18 ? e.slice(0, 17) + '…' : e, t: player + ' : ' + e, pen: '' }));
  const pool = WHEEL_POOL.filter((w) => allowHot || w[4] !== 'hot');
  return shuffle(pool.slice()).slice(0, 10).map((w) => {
    const n = Math.max(1, Math.ceil((w[3] || 1) * dose));
    if (w[4]) { const items = QUIZ[w[4]].items.filter((it) => it[0] !== 'v' && it[0] !== 'a' && it[0] !== 'g'); const it = pick(items); const p2 = others.length ? pick(others) : 'ton voisin';
      const fill = (t) => t.replace(/\{p\}/g, player).replace(/\{p2\}/g, p2).replace(/\{n\}/g, n + ' ' + gw(n));
      return { l: w[0], t: fill(cardText(it)), pen: fill(penFor(it[0], sips, it[3])) }; }
    return { l: w[0], t: (sips ? w[1] : w[2]).replace(/\{p\}/g, player).replace(/\{n\}/g, n + ' ' + gw(n)), pen: '' };
  });
}
function drawWheel(cv, segs, ang, hi) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), css = cv.clientWidth || 280; if (cv.width !== Math.round(css * dpr)) { cv.width = cv.height = Math.round(css * dpr); }
  const x = cv.getContext('2d'), W = cv.width, c = W / 2, R = W / 2 - W * .07, n = segs.length, arc = TAU / n;
  x.clearRect(0, 0, W, W);
  x.beginPath(); x.arc(c, c + W * .012, R + W * .045, 0, TAU); x.fillStyle = 'rgba(0,0,0,.35)'; x.fill();
  x.beginPath(); x.arc(c, c, R + W * .045, 0, TAU); x.fillStyle = '#17143a'; x.fill();
  for (let i = 0; i < n; i++) {
    const a0 = ang + i * arc; x.beginPath(); x.moveTo(c, c); x.arc(c, c, R, a0, a0 + arc); x.closePath();
    x.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]; if (n % WHEEL_COLORS.length === 1 && i === n - 1) x.fillStyle = WHEEL_COLORS[2]; x.fill();
    if (i === hi) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fill(); }
    x.lineWidth = W * .006; x.strokeStyle = '#17143a'; x.stroke();
    x.save(); x.translate(c, c); x.rotate(a0 + arc / 2); x.textAlign = 'right'; x.textBaseline = 'middle';
    const fs = Math.max(W * .032, Math.min(W * .05, W * .5 / Math.max(6, segs[i].l.length))); x.font = '900 ' + fs + 'px "Bowlby One","Arial Black",sans-serif';
    x.lineWidth = fs * .28; x.strokeStyle = 'rgba(23,20,58,.85)'; x.strokeText(segs[i].l, R - W * .03, 0); x.fillStyle = '#fffdf7'; x.fillText(segs[i].l, R - W * .03, 0); x.restore();
  }
  const bulbs = 24, t = performance.now() / 300; for (let i = 0; i < bulbs; i++) { const a = i / bulbs * TAU; x.beginPath(); x.arc(c + Math.cos(a) * (R + W * .024), c + Math.sin(a) * (R + W * .024), W * .011, 0, TAU); x.fillStyle = (i + Math.floor(t)) % 2 ? '#ffe07a' : '#fffdf7'; x.fill(); }
  x.beginPath(); x.arc(c, c, W * .09, 0, TAU); x.fillStyle = '#17143a'; x.fill(); x.lineWidth = W * .012; x.strokeStyle = '#ffc531'; x.stroke();
  x.font = '900 ' + (W * .035) + 'px "Bowlby One","Arial Black",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffc531'; x.fillText('WILD', c, c);
  x.beginPath(); x.moveTo(c - W * .045, W * .005); x.lineTo(c + W * .045, W * .005); x.lineTo(c, W * .1); x.closePath(); x.fillStyle = '#ffc531'; x.fill(); x.lineWidth = W * .01; x.strokeStyle = '#17143a'; x.stroke();
}
function segAtPointer(ang, n) { const arc = TAU / n; let a = (-Math.PI / 2 - ang) % TAU; if (a < 0) a += TAU; return Math.floor(a / arc) % n; }
// anime la roue jusqu'à la case « pick » ; turns et jitter viennent de l'hôte en ligne pour que tout le monde voie la même chose
function spinWheel(cv, segs, pick, turns, jitter, onDone, state) {
  const n = segs.length, arc = TAU / n, a0 = state.ang || 0;
  let target = -Math.PI / 2 - (pick + .5 + jitter) * arc; target = a0 + turns * TAU + ((((target - a0) % TAU) + TAU) % TAU);
  const t0 = performance.now(), dur = 4800; let lastSeg = -1; state.spinning = true; state.token = (state.token || 0) + 1; const tok = state.token;
  const step = () => {
    if (state.token !== tok) return; const e = Math.min(1, (performance.now() - t0) / dur), k = 1 - Math.pow(1 - e, 4); state.ang = a0 + (target - a0) * k;
    const sIdx = segAtPointer(state.ang, n); if (sIdx !== lastSeg) { lastSeg = sIdx; if (e < .98) AudioSys.tone(900 + (sIdx % 2) * 200, .03, 'square', .05); }
    drawWheel(cv, segs, state.ang, e >= 1 ? pick : -1);
    if (e < 1) requestAnimationFrame(step); else { state.spinning = false; AudioSys.sfx('final'); vibrate([60, 40, 90]); onDone && onDone(); }
  };
  requestAnimationFrame(step);
}

/* ---- roulette hors ligne (Mode Soirée) ---- */
const WL = { state: { ang: 0 }, segs: [], turn: 0, mode: 'random' };
function wheelPlayers() { const c = partyCfg(); return c.players.length ? c.players : ['Toi']; }
function wheelPrepare() {
  const c = partyCfg(), players = wheelPlayers(), p = players[WL.turn % players.length];
  WL.mode = c.wheelMode || 'random';
  WL.segs = buildWheel(WL.mode, p, players.filter((x) => x !== p), c.type === 'sips', c.dose || 1, c.cats.includes('hot'));
  $('#wl-who').textContent = 'Au tour de ' + p; $('#wl-result').textContent = 'Fais tourner la roue !'; $('#wl-pen').textContent = '';
  segSync('#wl-mode', WL.mode); drawWheel($('#wl-canvas'), WL.segs, WL.state.ang, -1);
}
function startWheel() { UI.mode = 'wheel'; AudioSys.init(); show('wheel'); requestAnimationFrame(wheelPrepare); }
function wheelSpin() {
  if (WL.state.spinning) return; const n = WL.segs.length, pk = Math.floor(Math.random() * n);
  $('#wl-result').textContent = '…'; $('#wl-pen').textContent = '';
  spinWheel($('#wl-canvas'), WL.segs, pk, 5 + Math.floor(Math.random() * 3), rand(-.35, .35), () => {
    $('#wl-result').textContent = WL.segs[pk].t; $('#wl-pen').textContent = WL.segs[pk].pen; WL.turn++;
    setTimeout(() => { if (UI.screen === 'wheel' && !WL.state.spinning) { const c = partyCfg(), players = wheelPlayers(), p = players[WL.turn % players.length]; $('#wl-who').textContent = 'Ensuite : ' + p; WL.next = true; } }, 1500);
  }, WL.state);
}
$('#wl-spin').onclick = () => { AudioSys.init(); if (WL.next) { WL.next = false; wheelPrepare(); setTimeout(wheelSpin, 250); } else wheelSpin(); };
$('#wl-canvas').addEventListener('click', () => $('#wl-spin').click());
$('#wl-quit').onclick = () => { AudioSys.sfx('click'); WL.state.token++; WL.state.spinning = false; UI.mode = 'quick'; show('party'); };
$$('#wl-mode button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); const c = partyCfg(); c.wheelMode = b.dataset.v; SAVE.party = c; store(); WL.next = false; wheelPrepare(); }));
$('#wl-edit').onclick = () => { AudioSys.sfx('click'); UI.weBack = 'wheel'; show('wedit'); };

/* ---- éditeur des cases ---- */
function renderWedit() {
  const list = $('#we-list'); list.innerHTML = ''; const e = wheelEntries();
  e.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pchip'; b.style.setProperty('--c', WHEEL_COLORS[i % WHEEL_COLORS.length]); b.innerHTML = '<i></i><span></span><b aria-hidden="true">×</b>'; b.querySelector('span').textContent = t;
    b.onclick = () => { const w = wheelEntries().slice(); if (w.length <= 2) { toast('Il faut au moins 2 cases.'); return; } w.splice(i, 1); SAVE.wheel = w; store(); renderWedit(); }; list.appendChild(b); });
  $('#we-count').textContent = e.length + ' case' + (e.length > 1 ? 's' : '') + ' (16 maximum)';
}
function addWheelEntry() { const inp = $('#we-input'), t = inp.value.trim().slice(0, 40); if (!t) { inp.focus(); return; } const w = wheelEntries().slice(); if (w.length >= 16) { toast('16 cases maximum.'); return; } w.push(t); SAVE.wheel = w; store(); inp.value = ''; renderWedit(); AudioSys.sfx('click'); }
$('#we-add').onclick = addWheelEntry;
$('#we-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addWheelEntry(); });
$('#we-reset').onclick = () => { SAVE.wheel = DEFAULT_WHEEL.slice(); store(); renderWedit(); AudioSys.sfx('click'); };
$('#we-done').onclick = () => { AudioSys.sfx('click'); const back = UI.weBack || 'party'; if (back === 'wheel') { show('wheel'); requestAnimationFrame(wheelPrepare); } else if (back === 'mini' && Net.host) { show('online'); renderOnline(); } else show(back); };

/* ================= Mini-jeux de soirée en ligne ================= */
const MINI = { cur: null, votes: new Map(), res: new Map(), timer: null, greenAt: 0, sent: false, wheel: { ang: 0 }, wturn: 0 };
const THEMES = [['random', 'Aléatoire'], ['soft', 'Soft'], ['fun', 'Fun'], ['hot', 'Hot 18+'], ['jamais', 'Je n\'ai jamais'], ['prefere', 'Tu préfères']];
function miniSips() { return Math.max(1, Math.ceil(2 * (Net.settings.dose || 1))); }
function miniType() { return Net.settings.type || 'sips'; }
function themeCats() { const t = (Net.settings.themes || []).filter((k) => QUIZ[k]); return t.length ? t : Object.keys(QUIZ); }
function renderThemeChips() {
  const el = $('#on-cats'); if (!el) return; el.innerHTML = ''; const S = Net.settings; const cur = themeCats(); const all = cur.length === ALL_THEMES.length;
  const mk = (label, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', String(on)); b.onclick = () => { AudioSys.sfx('click'); fn(); hostBroadcastLobby(); }; el.appendChild(b); };
  mk('Tout', all, () => { S.themes = ALL_THEMES.slice(); });
  for (const [k, label] of THEMES) { if (k === 'random') continue; const on = !all && cur.includes(k); mk(label, on, () => { if (all) S.themes = [k]; else if (cur.includes(k)) { if (cur.length > 1) S.themes = cur.filter((x) => x !== k); } else S.themes = cur.concat([k]); }); }
}
function fillNames(t, p, p2, n) { return t.replace(/\{p\}/g, p).replace(/\{p2\}/g, p2).replace(/\{n\}/g, n + ' ' + gw(n)); }
function hostMini(type) {
  if (!Net.host || Net.inRace) return; clearTimeout(MINI.timer);
  const S = Net.settings, names = present().map((p) => p.name), n = miniSips(), sips = miniType() === 'sips', cats = themeCats(), dose = S.dose || 1;
  let msg;
  if (type === 'card') {
    const deck = []; for (const c of cats) if (QUIZ[c]) for (const it of QUIZ[c].items) if (it[0] !== 'v') deck.push([c, it]);
    const [cat, it] = freshPick(deck, (d) => qkey(d[0], d[1])); const qk = freshPick.last; const p = pick(names); const p2 = names.length > 1 ? pick(names.filter((x) => x !== p)) : 'ton voisin';
    const kind = it[0]; const nn = Math.max(1, Math.ceil((kind === 'p' ? 1 : it[2] || (kind === 'n' || kind === 'a' ? 1 : 2)) * dose));
    msg = { t: 'mini', type: 'card', qk, cat: QUIZ[cat].name + (['n', 'p', 'a'].includes(kind) ? '' : ' · ' + p), color: QUIZ[cat].color, text: fillNames(cardText(it), p, p2, nn), pen: fillNames(penFor(kind, sips, it[3]), p, p2, nn) };
  } else if (type === 'vote') {
    const pool = [], seenQ = new Set();
    for (const c of cats) if (QUIZ[c]) for (const it of QUIZ[c].items) {
      const key = qkey(c, it), nq = normQ(it[0] === 'p' ? it[1] + '|' + it[2] : it[1]); if (seenQ.has(nq)) continue;
      if (it[0] === 'v') { seenQ.add(nq); pool.push({ q: it[1], mode: 'who', cat: c, key }); } else if (it[0] === 'p') { seenQ.add(nq); pool.push({ q: 'Tu préfères…', a: it[1], b: it[2], mode: 'pref', cat: c, key }); }
      else if (it[0] === 'n' && c === 'jamais') { seenQ.add(nq); pool.push({ q: it[1].replace('Je n\'ai jamais ', 'Qui ici a déjà ').replace(/\.$/, ' ?'), mode: 'who', cat: c, key }); }
    }
    const v = pool.length ? freshPick(pool, (x) => x.key) : { q: 'Qui ici rit le plus fort ?', mode: 'who', cat: 'fun' }; const qk = pool.length ? freshPick.last : '';
    const opts = v.mode === 'pref' ? [{ id: 'A', name: v.a }, { id: 'B', name: v.b }] : present().map((p) => ({ id: p.id, name: p.name }));
    msg = { t: 'mini', type: 'vote', qk, q: v.q, mode: v.mode, names: opts, n, color: QUIZ[v.cat].color, cat: QUIZ[v.cat].name };
    MINI.votes = new Map(); MINI.timer = setTimeout(hostVoteEnd, 25000);
  } else if (type === 'reflex') {
    msg = { t: 'mini', type: 'reflex', delay: rand(2, 5), n }; MINI.res = new Map(); MINI.timer = setTimeout(hostReflexEnd, 11000);
  } else if (type === 'roulette') {
    const p = names[MINI.wturn++ % names.length]; const segs = buildWheel(S.wheelMode || 'random', p, names.filter((x) => x !== p), sips, dose, cats.includes('hot'));
    msg = { t: 'mini', type: 'wheel', segs, pick: Math.floor(Math.random() * segs.length), turns: 5 + Math.floor(Math.random() * 3), jitter: r2(rand(-.35, .35)), player: p };
  } else if (type === 'end') msg = { t: 'mini', type: 'end' };
  hostBroadcast(msg); onMini(msg);
}
/* ================= v10 : mode soirée « Pari Pilote » ================= */
// Chaque manche : 1) pari « qui va finir dernier ? » sur chaque téléphone, 2) course, 3) verdict :
// points selon l'arrivée, bonus aux bons parieurs, carte pour le dernier, le vainqueur désigne quelqu'un.
const CUP_PTS = [10, 7, 5, 4, 3, 2, 1, 1];
function cupSips() { return miniSips(); }
function cupCard(p, others, kinds) {
  const deck = []; const fill = (cs) => { for (const c of cs) if (QUIZ[c]) for (const it of QUIZ[c].items) if (kinds.includes(it[0])) deck.push([c, it]); };
  fill(themeCats()); if (!deck.length) fill(['soft', 'fun']); if (!deck.length) return null;
  const [cat, it] = freshPick(deck, (d) => qkey(d[0], d[1])); const qk = freshPick.last; const sips = miniType() === 'sips';
  const p2 = others.length ? pick(others) : 'ton voisin'; const nn = Math.max(1, Math.ceil((typeof it[2] === 'number' ? it[2] : 2) * (Net.settings.dose || 1)));
  return { qk, cat: QUIZ[cat].name, color: QUIZ[cat].color, text: fillNames(cardText(it), p, p2, nn), pen: fillNames(penFor(it[0], sips, it[3]), p, p2, nn) };
}
function cupStandings() { const C = Net.cup; return Object.keys(C.scores).map((id) => ({ id, name: C.names[id], total: C.scores[id] })).sort((a, b) => b.total - a.total); }
function hostCupStart() {
  if (!Net.host || Net.inRace) return;
  Net.cup = { round: 0, total: Net.settings.rounds || 3, scores: {}, names: {}, bets: new Map(), betsDone: {}, racing: false };
  for (const p of present()) { Net.cup.scores[p.id] = 0; Net.cup.names[p.id] = p.name; }
  hostCupBet();
}
function hostCupBet() {
  const C = Net.cup; if (!Net.host || !C) return; clearTimeout(MINI.timer);
  C.round++; C.bets = new Map(); C.betsDone = {};
  const humans = present(); for (const p of humans) { if (C.scores[p.id] == null) C.scores[p.id] = 0; C.names[p.id] = p.name; }
  if (humans.length < 2) { hostCupRace(); return; }
  const msg = { t: 'mini', type: 'bet', round: C.round, total: C.total, q: 'Qui va finir dernier de la course ?', names: humans.map((p) => ({ id: p.id, name: p.name })), n: cupSips(), standings: C.round > 1 ? cupStandings() : [] };
  MINI.timer = setTimeout(hostCupRace, 30000); hostBroadcast(msg); onMini(msg);
}
function hostCupRace() {
  const C = Net.cup; if (!Net.host || !C || C.racing) return; clearTimeout(MINI.timer);
  C.betsDone = Object.fromEntries(C.bets); C.racing = true; MINI.cur = null; hostStart();
}
function hostCupVerdict() {
  const C = Net.cup, R = G.race; if (!Net.host || !C || !C.racing || !R) return; C.racing = false;
  const humans = G.karts.filter((k) => !k.isAI && k.netId);
  const fin = humans.filter((k) => k.finished).sort((a, b) => a.finishTime - b.finishTime), live = humans.filter((k) => !k.finished).sort((a, b) => b.prog - a.prog);
  const order = fin.concat(live), m = order.length, last = m > 1 ? order[m - 1] : null, lastId = last && last.netId;
  const rows = order.map((k, i) => {
    const id = k.netId, bet = C.betsDone[id], bonus = m > 1 && bet && bet === lastId ? 3 : 0, pts = CUP_PTS[i] || 0;
    C.scores[id] = (C.scores[id] || 0) + pts + bonus; C.names[id] = k.name;
    return { id, name: k.name, place: i + 1, pts, bonus, total: C.scores[id], bet: bet ? (C.names[bet] || '?') : '' };
  });
  const right = rows.filter((r) => r.bonus).map((r) => r.name), wrong = rows.filter((r) => !r.bonus && C.betsDone[r.id]).map((r) => r.name);
  const names = rows.map((r) => r.name);
  const card = last ? cupCard(last.name, names.filter((x) => x !== last.name), ['q', 'd']) : null;
  const win = order[0], others = rows.filter((r) => win && r.id !== win.netId).map((r) => ({ id: r.id, name: r.name }));
  const msg = { t: 'mini', type: 'verdict', round: C.round, total: C.total, rows, last: last ? { id: lastId, name: last.name } : null, card, right, wrong,
    winner: win && others.length ? { id: win.netId, name: win.name } : null, winName: win ? win.name : '', others, n: cupSips(), sentence: null, standings: cupStandings() };
  hostBroadcast({ t: 'lobbyback' }); goLobby(); hostBroadcast(msg); onMini(msg);
}
function hostCupSentence(tid) {
  const m = MINI.cur; if (!Net.host || !m || m.type !== 'verdict' || m.sentence) return;
  const t = m.rows.find((r) => r.id === tid) || pick(m.others); if (!t) return;
  const card = cupCard(t.name, m.rows.map((r) => r.name).filter((x) => x !== t.name), ['q']);
  const msg = Object.assign({}, m, { sentence: Object.assign({ to: t.name, by: m.winner ? m.winner.name : '' }, card || { text: t.name + ', raconte ton pire souvenir de soirée.', pen: '' }) });
  hostBroadcast(msg); onMini(msg);
}
function hostCupEnd() {
  const C = Net.cup; if (!Net.host || !C) return; clearTimeout(MINI.timer);
  const rows = cupStandings(); C.done = true;
  const msg = { t: 'mini', type: 'cupend', rows, total: C.total, n: cupSips() };
  hostBroadcast(msg); onMini(msg);
}
function onCupMini(m) {
  for (const qk of [m.card && m.card.qk, m.sentence && m.sentence.qk]) if (qk && !Net.host) markSeen(qk);
  MINI.cur = m; MINI.sent = false; const card = $('#m-card'), body = $('#m-body'); body.innerHTML = ''; $('#m-pen').textContent = ''; card.classList.remove('wide'); card.classList.toggle('tall', m.type !== 'bet');
  const sips = miniType() === 'sips', nw = (n) => n + ' ' + gw(n);
  const head = (eyebrow, title, color) => { $('#m-eyebrow').textContent = eyebrow; $('#m-title').textContent = title; card.style.setProperty('--c', color); };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const block = (label, strong, small, color) => { const b = el('div', 'vblock'); if (color) b.style.setProperty('--c', color); b.appendChild(el('em', '', label)); if (strong) b.appendChild(el('strong', '', strong)); if (small) b.appendChild(el('span', '', small)); body.appendChild(b); return b; };
  const table = (rows, cols) => { const t = el('div', 'vtable'); for (const r of rows) { const line = el('div', 'vrow' + (r.id === Net.id ? ' me' : '')); for (const c of cols(r)) line.appendChild(c); t.appendChild(line); } body.appendChild(t); };
  if (m.type === 'bet') {
    head('Pari Pilote · manche ' + m.round + '/' + m.total, m.q, '#ff8a1e');
    const row = el('div', 'chips');
    for (const p of m.names) { const b = el('button', '', p.name + (p.id === Net.id ? ' (toi)' : '')); b.type = 'button';
      b.onclick = () => { if (MINI.sent) return; MINI.sent = true; AudioSys.sfx('got'); b.setAttribute('aria-pressed', 'true'); $('#m-pen').textContent = 'Pari enregistré : ' + p.name + '. La course part dès que tout le monde a parié.'; miniSend('vote', p.id); }; row.appendChild(b); }
    body.appendChild(row);
    if (m.standings && m.standings.length) table(m.standings, (r) => [el('span', '', ''), el('span', '', r.name), el('small', '', ''), el('b', '', r.total + ' pts')]);
    $('#m-pen').textContent = 'Bon pari : +3 points' + (sips ? ' et tu distribues ' + nw(m.n) : ' et tu choisis un gage') + '. Pari raté : ' + (sips ? 'tu bois 1.' : 'rien, mais pas de bonus.');
  } else if (m.type === 'verdict') {
    head('Verdict · manche ' + m.round + '/' + m.total, (m.winName || '?') + ' gagne la manche !', '#ffc531');
    table(m.rows, (r) => [el('span', '', r.place + '.'), el('span', '', r.name), el('small', '', r.bonus ? '+' + r.pts + ' +3 pari' : '+' + r.pts), el('b', '', r.total + ' pts')]);
    if (m.right.length || m.wrong.length) block('Les paris', m.right.length ? m.right.join(', ') + (m.right.length > 1 ? ' avaient vu juste !' : ' avait vu juste !') : 'Personne n\'avait vu juste.',
      (m.right.length ? (sips ? 'Chacun distribue ' + nw(m.n) + '. ' : 'Chacun choisit un gage pour quelqu\'un. ') : '') + (m.wrong.length && sips ? m.wrong.join(', ') + (m.wrong.length > 1 ? ' boivent 1.' : ' boit 1.') : ''), '#7c4dff');
    if (m.last && m.card) block('Le dernier · ' + m.last.name + ' · ' + m.card.cat, m.card.text, m.card.pen, m.card.color);
    if (m.winner) {
      if (m.sentence) block(m.sentence.by + ' a désigné ' + m.sentence.to, m.sentence.text, m.sentence.pen, m.sentence.color || '#3ee08f');
      else if (m.winner.id === Net.id) { const b = block('Ton pouvoir de vainqueur', 'Choisis qui doit répondre à une question :', '', '#3ee08f'); const pk = el('div', 'vpick');
        for (const o of m.others) { const bt = el('button', 'btn sm', null); bt.innerHTML = '<span></span>'; bt.firstChild.textContent = o.name; bt.onclick = () => { if (MINI.sent) return; MINI.sent = true; AudioSys.sfx('got'); bt.classList.add('picked'); miniSend('vote', o.id); }; pk.appendChild(bt); }
        b.appendChild(pk); }
      else block('Le pouvoir du vainqueur', m.winner.name + ' choisit qui va devoir répondre à une question…', '', '#3ee08f');
    }
    $('#m-pen').textContent = m.round >= m.total ? 'Dernière manche jouée : place au classement final !' : 'Manche suivante : nouveau pari, nouvelle course.';
    AudioSys.sfx('final');
  } else if (m.type === 'cupend') {
    const ch = m.rows[0], lo = m.rows.length > 1 ? m.rows[m.rows.length - 1] : null;
    head('Pari Pilote · classement final', ch ? '🏆 ' + ch.name + ', champion de la soirée !' : 'Fin du Pari Pilote', '#ffc531');
    table(m.rows, (r) => [el('span', '', (m.rows.indexOf(r) + 1) + '.'), el('span', '', r.name), el('small', '', ''), el('b', '', r.total + ' pts')]);
    if (ch && lo) block('Remise des prix', ch.name + (sips ? ' distribue ' + nw(m.n * 2) + '.' : ' choisit un gage pour qui il veut.'), lo.name + (sips ? ' finit dernier : il boit ' + nw(m.n * 2) + ' et porte un toast au champion.' : ' finit dernier : il fait un discours en l\'honneur du champion.'), '#ff4f3a');
    $('#m-pen').textContent = 'Merci d\'avoir joué ! Chacun boit ce qu\'il veut, même de l\'eau.';
    AudioSys.sfx('finish');
  }
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  renderMiniCtrl(); show('mini'); card.scrollTop = 0; requestAnimationFrame(() => (card.scrollTop = 0));
}

function hostVoteEnd() {
  if (!Net.host || !MINI.cur || MINI.cur.type !== 'vote') return; clearTimeout(MINI.timer); const m = MINI.cur;
  const tally = new Map(); for (const v of MINI.votes.values()) tally.set(v, (tally.get(v) || 0) + 1);
  const list = m.names.map((p) => ({ name: p.name, count: tally.get(p.id) || 0 })).sort((a, b) => b.count - a.count);
  let losers = [], tie = false;
  if (m.mode === 'pref') { if (list[0].count === list[1].count) tie = list[0].count > 0; else losers = [list[1].name]; }
  else losers = list[0] && list[0].count > 0 ? list.filter((x) => x.count === list[0].count).map((x) => x.name) : [];
  const msg = { t: 'mini', type: 'votres', q: m.q, mode: m.mode, list, losers, tie, n: m.n, color: m.color }; hostBroadcast(msg); onMini(msg);
}
function hostReflexEnd() {
  if (!Net.host || !MINI.cur || MINI.cur.type !== 'reflex') return; clearTimeout(MINI.timer);
  const list = present().map((p) => ({ name: p.name, ms: MINI.res.has(p.id) ? MINI.res.get(p.id) : 99999 })).sort((a, b) => a.ms - b.ms);
  const msg = { t: 'mini', type: 'reflexres', list, n: MINI.cur.n }; hostBroadcast(msg); onMini(msg);
}
function miniRecord(kind, id, val) {
  if (!Net.host || !MINI.cur) return;
  if (kind === 'vote' && MINI.cur.type === 'bet' && Net.cup) { Net.cup.bets.set(id, val); if (Net.cup.bets.size >= present().length) hostCupRace(); else renderMiniCtrl(); return; }
  if (kind === 'vote' && MINI.cur.type === 'verdict' && MINI.cur.winner && id === MINI.cur.winner.id && !MINI.cur.sentence) { hostCupSentence(val); return; }
  if (kind === 'vote' && MINI.cur.type === 'vote') { MINI.votes.set(id, val); if (MINI.votes.size >= present().length) hostVoteEnd(); else renderMiniCtrl(); }
  if (kind === 'reflex' && MINI.cur.type === 'reflex') { if (!MINI.res.has(id)) MINI.res.set(id, val); if (MINI.res.size >= present().length) hostReflexEnd(); }
}
function miniSend(kind, val) { if (Net.host) miniRecord(kind, Net.id, val); else if (Net.hc && Net.hc.open) { try { Net.hc.send({ t: kind === 'vote' ? 'mvote' : 'mres', v: val }); } catch (e) { /* rien */ } } }
function renderMiniCtrl() {
  const c = $('#m-ctrl'); c.innerHTML = ''; const m = MINI.cur; if (!m) return;
  const add = (label, cls, fn, parent = c) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = '<span></span>'; b.firstChild.textContent = label; b.onclick = () => { AudioSys.sfx('click'); fn(); }; parent.appendChild(b); return b; };
  if (!Net.host) { const p = document.createElement('p'); p.className = 'hint'; p.style.color = 'var(--paper)'; p.textContent = 'L\'hôte mène le jeu.'; c.appendChild(p); add('Quitter', 'ghost', () => { netReset(); toMenu(); }); return; }
  add('Salon', 'ghost', () => hostMini('end'));
  if (m.type === 'card') add('Carte suivante', 'red big', () => hostMini('card'));
  else if (m.type === 'vote') add('Terminer le vote (' + MINI.votes.size + '/' + present().length + ')', 'red', hostVoteEnd);
  else if (m.type === 'votres') add('Autre vote', 'red big', () => hostMini('vote'));
  else if (m.type === 'reflex') add('Terminer', 'red', hostReflexEnd);
  else if (m.type === 'reflexres') add('Rejouer', 'red big', () => hostMini('reflex'));
  else if (m.type === 'wheel') add('Tourner', 'red big', () => { if (!MINI.wheel.spinning) hostMini('roulette'); });
  else if (m.type === 'bet') add('Partir sans attendre (' + (Net.cup ? Net.cup.bets.size : 0) + '/' + present().length + ')', 'red', hostCupRace);
  else if (m.type === 'verdict') { if (m.winner && !m.sentence && m.others && m.others.length) add('Désigner au hasard', 'ghost', () => hostCupSentence(pick(m.others).id)); add(m.round >= m.total ? 'Classement final' : 'Manche suivante', 'red big', () => (m.round >= m.total ? hostCupEnd() : hostCupBet())); }
  else if (m.type === 'cupend') add('Rejouer le Pari', 'red big', hostCupStart);
}
function onMini(m) {
  if (m && (m.type === 'bet' || m.type === 'verdict' || m.type === 'cupend')) { onCupMini(m); return; }
  if (m && m.qk && !Net.host) markSeen(m.qk);
  if (m.type === 'end') { MINI.cur = null; MINI.wheel.token = (MINI.wheel.token || 0) + 1; clearTimeout(MINI.timer); show('online'); renderOnline(); return; }
  MINI.cur = m; MINI.sent = false; const card = $('#m-card'), body = $('#m-body'); body.innerHTML = ''; $('#m-pen').textContent = ''; card.classList.toggle('wide', m.type === 'wheel');
  const sips = miniType() === 'sips', nw = (n) => n + ' ' + gw(n);
  const setHead = (eyebrow, title, color) => { $('#m-eyebrow').textContent = eyebrow; $('#m-title').textContent = title; card.style.setProperty('--c', color); };
  if (m.type === 'card') { setHead(m.cat, m.text, m.color); $('#m-pen').textContent = m.pen; }
  else if (m.type === 'vote') {
    setHead((m.cat ? m.cat + ' · ' : '') + 'Vote sur ton téléphone', m.q, m.color || '#7c4dff');
    const row = document.createElement('div'); row.className = m.mode === 'pref' ? 'prefrow' : 'chips';
    for (const p of m.names) { const b = document.createElement('button'); b.type = 'button'; b.textContent = p.name; if (m.mode === 'pref') b.className = 'btn ' + (p.id === 'A' ? 'blue' : 'red');
      b.onclick = () => { if (MINI.sent) return; MINI.sent = true; AudioSys.sfx('got'); b.setAttribute('aria-pressed', 'true'); b.classList.add('picked'); $('#m-pen').textContent = 'Vote envoyé, on attend les autres…'; miniSend('vote', p.id); }; row.appendChild(b); }
    body.appendChild(row);
    $('#m-pen').textContent = m.mode === 'pref' ? 'Le camp le moins nombreux ' + (sips ? 'boit ' + nw(m.n) : 'prend un gage') + '.' : 'Le plus désigné ' + (sips ? 'boit ' + nw(m.n) : 'prend un gage') + '.';
  } else if (m.type === 'votres') {
    setHead('Résultat du vote', m.q, m.color || '#7c4dff'); const max = Math.max(1, m.list[0].count);
    for (const r of m.list) { const line = document.createElement('div'); line.className = 'vbar'; line.innerHTML = '<span></span><i></i><b></b>'; line.querySelector('span').textContent = r.name; line.querySelector('b').textContent = r.count; line.querySelector('i').style.width = (r.count / max * 100) + '%'; body.appendChild(line); }
    const verb = (pl) => (sips ? (pl ? ' boivent ' : ' boit ') + nw(m.n) : (pl ? ' prennent un gage' : ' prend un gage'));
    $('#m-pen').textContent = m.tie ? 'Égalité : tout le monde ' + (sips ? 'boit 1 !' : 'prend un gage !') : m.losers.length ? (m.mode === 'pref' ? 'Ceux qui ont choisi « ' + m.losers[0] + ' »' + verb(true) : m.losers.join(' et ') + verb(m.losers.length > 1)) + '.' : 'Personne n\'a voté.';
    AudioSys.sfx('final');
  } else if (m.type === 'reflex') {
    setHead('Réflexes', 'Touche la zone dès qu\'elle devient verte !', '#3ee08f');
    const z = document.createElement('button'); z.type = 'button'; z.className = 'rzone'; z.textContent = 'Attends…'; body.appendChild(z);
    MINI.greenAt = 0; const t0 = performance.now(); const delay = m.delay * 1000;
    const tick = () => { if (MINI.cur !== m) return; if (performance.now() - t0 >= delay) { MINI.greenAt = performance.now(); z.classList.add('go'); z.textContent = 'TOUCHE !'; AudioSys.sfx('beep'); } else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    z.addEventListener('pointerdown', (e) => { e.preventDefault(); if (MINI.sent) return; MINI.sent = true;
      if (!MINI.greenAt) { z.textContent = 'Trop tôt !'; z.classList.add('bad'); miniSend('reflex', 9999); AudioSys.sfx('wrong'); }
      else { const ms = Math.round(performance.now() - MINI.greenAt); z.textContent = ms + ' ms'; miniSend('reflex', ms); AudioSys.sfx('got'); } });
    $('#m-pen').textContent = 'Le plus lent ' + (sips ? 'boit ' + nw(m.n) : 'prend un gage') + ', le plus rapide ' + (sips ? 'en distribue ' + m.n : 'choisit un gage') + '.';
  } else if (m.type === 'reflexres') {
    setHead('Réflexes · résultats', m.list[0] ? m.list[0].name + ' est le plus rapide !' : '', '#3ee08f');
    m.list.forEach((r, i) => { const line = document.createElement('div'); line.className = 'rline'; line.textContent = (i + 1) + '. ' + r.name + ' · ' + (r.ms >= 99999 ? 'pas joué' : r.ms >= 9999 ? 'trop tôt' : r.ms + ' ms'); body.appendChild(line); });
    const last = m.list[m.list.length - 1]; if (last && m.list.length > 1) $('#m-pen').textContent = last.name + (sips ? ' boit ' + nw(m.n) + '. ' + m.list[0].name + ' en distribue ' + m.n + '.' : ' prend un gage.');
    AudioSys.sfx('final');
  } else if (m.type === 'wheel') {
    setHead('Roulette', 'Au tour de ' + m.player, '#ffc531');
    const cv = document.createElement('canvas'); cv.className = 'wheelcv'; body.appendChild(cv);
    requestAnimationFrame(() => { drawWheel(cv, m.segs, MINI.wheel.ang || 0, -1); spinWheel(cv, m.segs, m.pick, m.turns, m.jitter, () => { if (MINI.cur !== m) return; $('#m-title').textContent = m.segs[m.pick].t; $('#m-pen').textContent = m.segs[m.pick].pen; }, MINI.wheel); });
  }
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  renderMiniCtrl(); show('mini');
}


/* ================= Menus ================= */
const SCREENS = ['chef', 'friends', 'title', 'tracks', 'garage', 'settings', 'calib', 'pause', 'results', 'install', 'party', 'turn', 'card', 'online', 'mini', 'wheel', 'wedit'];
function show(id) {
  for (const s of SCREENS) { const el = $('#s-' + s); if (el) el.hidden = s !== id; }
  const prev = UI.screen; UI.screen = id;
  if (id === 'garage') enterGarage(); else if (prev === 'garage') leaveGarage();
  if (id === 'title') refreshTitle();
  if (id === 'tracks') buildTrackCards();
  if (id === 'settings') syncSettings();
  if (id === 'friends') { frStart(); frRender(); frCheckAll(); }
  if (id === 'chef') { frStart(); chefRender(); chefLoadCodes(); chefLoadLive(); }
  chefButtons();
  if (id === 'pause') { $('#p-note').textContent = G.race && G.race.online ? 'La course continue pendant la pause.' : ''; $('#p-tilt').hidden = SAVE.control !== 'tilt'; }
  if (id === 'online') { const off = $('#on-offline'); if (off && BUILD === 'pwa' && !Net.peer) off.hidden = true; }
  if (id === 'calib') Input.useTiltCalib = true;
  if (id === 'install') buildInstall();
  if (id === 'party') renderParty();
  if (id === 'wedit') renderWedit();
  if (id === 'online') { renderOnline(); if (!Net.peer) netStatus(''); }
  checkRotate();
}
function toast(msg, ms = 3200) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), ms); }
function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* non supporté */ } }
let wakeLock = null;
function requestWake() { try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then((w) => { wakeLock = w; w.addEventListener('release', () => (wakeLock = null)); }).catch(() => {}); } catch (e) { /* ignoré */ } }
function goFullscreen() {
  if (!isTouch || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) return;
  const el = document.documentElement; const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return; try { const p = req.call(el, { navigationUI: 'hide' }); if (p && p.then) p.then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {}); } catch (e) { /* refusé */ }
}
function refreshTitle_old() {
  const chip = $('#ctrl-chip'); const tilt = SAVE.control === 'tilt';
  chip.classList.toggle('warn', !tilt || (Input.listening && !Input.tiltSeen && isTouch));
  chip.querySelector('span').textContent = tilt ? (isTouch ? 'Direction : inclinaison' : 'Direction : clavier (sur ordinateur)') : 'Direction : boutons';
  $('#b-install').hidden = isStandalone();
  if (!G.race || G.race.state !== 'attract') startAttract(UI.track);
  AudioSys.stopMusic();
}
function isStandalone() { return matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true; }
function toMenu() { if (Net.peer) netReset(); UI.quiz = null; UI.party = null; UI.mode = 'quick'; G.race = null; G.paused = false; showHud(false); AudioSys.engine(0, false); AudioSys.stopMusic(); UI.gp = null; show('title'); }

function drawTrackThumb(c, def) {
  const S = buildSamples(def), x = c.getContext('2d'), w = c.width, h = c.height;
  const th = def.theme; const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const Wf = { S, def, curbW: 1.6, wallD: def.width / 2 + 7.1 }; try { buildBranches(Wf); } catch (err) { Wf.branches = []; }
  let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity; for (const Q of [S].concat(Wf.branches)) for (let i = 0; i < Q.N; i++) { a = Math.min(a, Q.px[i]); b = Math.max(b, Q.px[i]); e = Math.min(e, Q.pz[i]); f = Math.max(f, Q.pz[i]); }
  const sc = Math.min((w - 30) / (b - a), (h - 24) / (f - e)); const ox = (w - (b - a) * sc) / 2, oz = (h - (f - e) * sc) / 2;
  const P = (i) => [ox + (b - S.px[i]) * sc, oz + (f - S.pz[i]) * sc];
  const path = () => { x.beginPath(); for (let i = 0; i <= S.N; i += 2) { const [u, v] = P(i % S.N); i ? x.lineTo(u, v) : x.moveTo(u, v); } x.closePath(); };
  x.lineJoin = 'round'; path(); x.strokeStyle = '#17143a'; x.lineWidth = 11; x.stroke(); path(); x.strokeStyle = th.curb[0]; x.lineWidth = 7; x.stroke(); path(); x.strokeStyle = '#fffdf7'; x.lineWidth = 3; x.stroke();
  for (const B of Wf.branches) { const bp = () => { x.beginPath(); for (let j = 0; j < B.N; j += 2) { const u = ox + (b - B.px[j]) * sc, v = oz + (f - B.pz[j]) * sc; j ? x.lineTo(u, v) : x.moveTo(u, v); } }; bp(); x.strokeStyle = '#17143a'; x.lineWidth = 9; x.stroke(); bp(); x.strokeStyle = '#ffc531'; x.lineWidth = 4; x.stroke(); }
  const [u0, v0] = P(0); x.fillStyle = '#ffc531'; x.strokeStyle = '#17143a'; x.lineWidth = 3; x.beginPath(); x.arc(u0, v0, 6, 0, TAU); x.fill(); x.stroke();
}
function buildTrackCards_old() {
  const wrap = $('#track-cards'); wrap.innerHTML = ''; const gp = UI.mode === 'gp';
  $('#tracks-title').textContent = gp ? 'Grand Prix : ' + TRACKS.length + ' courses' : 'Choisis ton circuit';
  TRACKS.forEach((def, i) => {
    const b = document.createElement('button'); b.className = 'card panel' + (!gp && i === UI.track ? ' sel' : ''); b.type = 'button';
    const rec = SAVE.records[def.id] || {};
    b.innerHTML = (gp ? '<span class="num">Course ' + (i + 1) + '</span>' : '') + '<canvas width="320" height="170"></canvas><h3></h3><p></p><div class="meta"><span class="lvl"></span><span class="rec"></span></div>';
    b.querySelector('h3').textContent = def.name; b.querySelector('p').textContent = def.desc;
    b.querySelector('.lvl').innerHTML = [1, 2, 3].map((n) => '<i class="' + (n <= def.level ? 'on' : '') + '"></i>').join('');
    b.querySelector('.rec').textContent = rec.lap ? 'Record tour ' + fmtTime(rec.lap) : 'Pas encore de record';
    drawTrackThumb(b.querySelector('canvas'), def);
    b.onclick = () => { AudioSys.sfx('click'); if (gp) return; UI.track = i; SAVE.track = i; store(); $$('#track-cards .card').forEach((c, j) => c.classList.toggle('sel', j === i)); if (G.race && G.race.state === 'attract' && G.W.ti !== i) startAttract(i); };
    wrap.appendChild(b);
  });
  syncCC();
}
function syncCC() { $$('#cc-seg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.cc === SAVE.cc))); $$('#bot-seg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === (SAVE.botLvl != null ? SAVE.botLvl : 1)))); $$('#laps-seg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === (SAVE.laps || 0)))); $$('#obst-seg button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === (SAVE.obst !== false)))); }
$$('#bot-seg button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.botLvl = +b.dataset.v; store(); syncCC(); }));
$$('#laps-seg button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.laps = +b.dataset.v; store(); syncCC(); }));
$$('#obst-seg button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.obst = b.dataset.v === '1'; store(); syncCC(); }));
$$('#cc-seg button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.cc = +b.dataset.cc; store(); syncCC(); }));

function begin() {
  AudioSys.init(); AudioSys.sfx('click');
  if (UI.mode === 'gp') UI.gp = { i: 0, cc: SAVE.cc, points: {} };
  const wantTilt = SAVE.control === 'tilt' && isTouch;
  goFullscreen();
  const go = UI.mode === 'party' ? partyTurn : launch;
  if (!wantTilt) { Input.useTilt = false; go(); return; }
  ensureMotion().then((ok) => {
    Input.useTilt = ok;
    if (!ok) { toast('Inclinaison indisponible ici : les boutons tactiles prennent le relais.', 4500); go(); return; }
    if (!SAVE.calibrated) { UI.afterCalib = go; show('calib'); return; }
    go();
  });
}
function launch() { if (UI.mode === 'party' && UI.party) { const P = UI.party; startRace(P.roundTrack, SAVE.cc, P.players[P.turn]); return; } const ti = UI.mode === 'gp' && UI.gp ? UI.gp.i % TRACKS.length : UI.track; startRace(ti, UI.mode === 'gp' && UI.gp ? UI.gp.cc : SAVE.cc); }
$('#b-start').onclick = begin;

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]'); if (!b) return; AudioSys.init(); AudioSys.sfx('click'); trapBack(); const go = b.dataset.go;
  if (go === 'quick' || go === 'gp' || go === 'practice') { UI.mode = go === 'gp' ? 'gp' : 'quick'; show('tracks'); }
  else if (go === 'rejoin') { show('online'); if (SAVE.lastCode) { $('#on-code').value = SAVE.lastCode; netJoin(SAVE.lastCode); } }
  else if (go === 'chef') { if (!isChef()) return; if (UI.screen !== 'chef') CHU.back = UI.screen; show('chef'); }
  else if (go === 'chefback') show(CHU.back && CHU.back !== 'chef' ? CHU.back : 'title');
  else if (go === 'friends') { if (UI.screen !== 'friends') FRU.back = UI.screen; show('friends'); }
  else if (go === 'frback') show(FRU.back && FRU.back !== 'friends' ? FRU.back : 'title');
  else if (go === 'settings') { UI.settingsBack = UI.screen === 'pause' ? 'pause' : 'title'; show('settings'); }
  else if (go === 'calib') { UI.afterCalib = () => show('settings'); if (isTouch) ensureMotion().then(() => {}); show('calib'); }
  else show(go);
});

/* garage */
const GS = { scene: null, kart: null, rot: 0 };
function buildGarageScene() {
  const s = new T.Scene(); s.background = new T.Color('#2a2560');
  s.add(new T.HemisphereLight('#ffffff', '#2a2560', 1.6)); const d = new T.DirectionalLight('#fff3e0', 2.6); d.position.set(5, 8, 6); s.add(d);
  const r = new T.DirectionalLight('#7c4dff', 1.6); r.position.set(-6, 3, -5); s.add(r);
  const disc = new T.Mesh(new T.CylinderGeometry(3.6, 3.8, .35, 40), new T.MeshStandardMaterial({ color: '#17143a', roughness: .6 })); disc.position.y = -.18; s.add(disc);
  const ring = new T.Mesh(new T.TorusGeometry(3.7, .08, 8, 60), new T.MeshBasicMaterial({ color: '#ffc531' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0; s.add(ring);
  const floor = new T.Mesh(new T.CircleGeometry(40, 40), new T.MeshStandardMaterial({ color: '#221e52', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.36; s.add(floor);
  GS.env = makeEnv('#5a4fb0', '#2a2560', '#17143a', 3.5); s.environment = GS.env.texture;
  GS.scene = s;
}
function refreshGarageKart_old() {
  if (!GS.scene) buildGarageScene();
  if (GS.kart) { GS.scene.remove(GS.kart.g); GS.kart.g.traverse((o) => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); }); }
  GS.kart = kartMesh(myCfg()); GS.kart.shadow = null; GS.scene.add(GS.kart.g);
  $('#g-name').textContent = SAVE.name || 'Toi';
  const st = statsFor(SAVE.body, SAVE.wheels); const box = $('#g-stats'); box.innerHTML = '';
  [['Vitesse', st.speed], ['Accélération', st.accel], ['Maniabilité', st.handling], ['Poids', st.weight], ['Tout-terrain', st.off]].forEach(([n, v]) => {
    const l = document.createElement('span'); l.textContent = n; const bar = document.createElement('div'); bar.className = 'bar'; const i = document.createElement('i'); i.style.width = Math.round(15 + v * 85) + '%'; bar.appendChild(i); box.append(l, bar);
  });
}
function chipGroup(el, obj, key) {
  el.innerHTML = ''; for (const id in obj) { const b = document.createElement('button'); b.type = 'button'; b.textContent = obj[id].name; b.setAttribute('aria-pressed', String(SAVE[key] === id));
    b.onclick = () => { AudioSys.sfx('click'); SAVE[key] = id; store(); chipGroup(el, obj, key); refreshGarageKart(); }; el.appendChild(b); }
}
function swatchGroup(el, key, list = COLORS) {
  el.innerHTML = ''; for (const c of list) { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', 'Couleur ' + c); b.setAttribute('aria-pressed', String(SAVE[key] === c));
    b.onclick = () => { AudioSys.sfx('click'); SAVE[key] = c; store(); swatchGroup(el, key, list); refreshGarageKart(); }; el.appendChild(b); }
}
function enterGarage_old() { chipGroup($('#g-body'), BODIES, 'body'); chipGroup($('#g-wheels'), WHEELS, 'wheels'); chipGroup($('#g-pilot'), PILOTS, 'pilot'); chipGroup($('#g-acc'), ACCS, 'acc'); chipGroup($('#g-finish'), FINISHES, 'finish'); chipGroup($('#g-deco'), DECOS, 'deco'); chipGroup($('#g-trail'), TRAILS, 'trail'); swatchGroup($('#g-color'), 'color'); swatchGroup($('#g-helmet'), 'helmet'); swatchGroup($('#g-skin'), 'skin', SKINS); $('#g-pseudo').value = SAVE.name; refreshGarageKart(); }
function leaveGarage() { if (G.race && G.race.state === 'attract') startAttract(G.W.ti); }
$('#g-pseudo').addEventListener('input', (e) => { SAVE.name = e.target.value.trim().slice(0, 10) || 'Toi'; store(); $('#g-name').textContent = SAVE.name; });
function renderGarage_old(dt) {
  GS.rot += dt * .6; GS.kart.g.rotation.y = GS.rot;
  const portrait = camera.aspect < 1;
  camera.fov = 40; camera.updateProjectionMatrix();
  if (portrait) { camera.position.set(0, 3.2, 10.5); camera.lookAt(0, 1.6, 0); }
  else { camera.position.set(2.6, 3, 8.6); camera.lookAt(2.9, .9, 0); }
  renderer.render(GS.scene, camera);
}

/* réglages */
function syncSettings_old() {
  $$('#set-ctrl button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === SAVE.control)));
  $$('#set-q button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === SAVE.quality)));
  $('#set-sens').value = SAVE.sens; $('#set-sens-o').textContent = (+SAVE.sens).toFixed(1);
  $('#set-inv').setAttribute('aria-pressed', String(!!SAVE.invert)); $('#set-snd').setAttribute('aria-pressed', String(!!SAVE.sound)); $('#set-mus').setAttribute('aria-pressed', String(!!SAVE.music)); $('#set-perf').setAttribute('aria-pressed', String(!!SAVE.showPerf));
}
$$('#set-ctrl button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.control = b.dataset.v; store(); syncSettings(); if (SAVE.control === 'tilt' && isTouch) ensureMotion().then((ok) => { if (!ok) toast('Capteur non autorisé. Sur iPhone, ouvre le jeu dans Safari en https.'); }); }));
$$('#set-q button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.quality = b.dataset.v; store(); syncSettings(); applyQuality(); toast({ high: 'Haut : ombres et décor complet, à la prochaine course.', medium: 'Moyen : bon compromis, à la prochaine course.', low: 'Bas : le plus fluide, à la prochaine course.' }[SAVE.quality]); }));
$('#set-sens').oninput = (e) => { SAVE.sens = +e.target.value; store(); $('#set-sens-o').textContent = SAVE.sens.toFixed(1); };
for (const [id, key] of [['#set-inv', 'invert'], ['#set-snd', 'sound'], ['#set-mus', 'music'], ['#set-perf', 'showPerf']]) $(id).onclick = () => { SAVE[key] = !SAVE[key]; store(); syncSettings(); AudioSys.init(); AudioSys.setVolumes(); AudioSys.sfx('click'); };

/* calibrage */
$('#calib-ok').onclick = () => { AudioSys.sfx('click'); if (Input.tiltSeen) { SAVE.calib = Input.tiltAngle; SAVE.calibrated = true; store(); toast('Volant calibré.'); } else toast('Aucun capteur détecté : rien à calibrer.'); const f = UI.afterCalib; UI.afterCalib = null; if (f) f(); else show('title'); };
$('#calib-back').onclick = () => { AudioSys.sfx('click'); const inRace = G.race && G.race.state !== 'attract'; UI.afterCalib = null; if (inRace) show('pause'); else show('title'); };
function updateCalibUI() {
  const rel = tiltRel(); const raw = angDiffDeg(SAVE.calib, Input.tiltAngle) * (SAVE.invert ? -1 : 1);
  $('#calib-wheel').style.transform = 'rotate(' + clamp(Input.tiltSeen ? (SAVE.calibrated ? rel : Input.tiltAngle * (SAVE.invert ? -1 : 1)) : 0, -90, 90) + 'deg)';
  const v = clamp(rel / (26 / SAVE.sens), -1, 1); const bar = $('#calib-bar'); bar.style.left = (50 + Math.min(0, v) * 50) + '%'; bar.style.width = Math.abs(v) * 50 + '%';
  $('#calib-status').textContent = Input.tiltSeen ? (SAVE.calibrated ? 'Penche à droite : la barre doit partir à droite. Sinon, touche « Inverser le sens ».' : 'Capteur actif. Tiens le téléphone droit puis valide.') : (isTouch ? 'En attente du capteur… Sur iPhone, autorise l\'accès aux mouvements.' : 'Pas de capteur sur cet appareil.');
  void raw;
}

/* pause */
function togglePause() { if (!G.race || G.race.state === 'attract' || G.race.resultsShown) return; if (G.race.online) { show(UI.screen === 'pause' ? null : 'pause'); return; } G.paused = !G.paused; if (G.paused) { show('pause'); AudioSys.engine(0, false); AudioSys.stopMusic(); } else { show(null); AudioSys.startMusic(musicSpec(TRACKS[G.race.ti])); } }
$('#b-pause').onclick = () => { AudioSys.sfx('click'); togglePause(); };
$('#p-resume').onclick = () => { AudioSys.sfx('click'); togglePause(); };
$('#p-restart').onclick = () => { AudioSys.sfx('click'); G.paused = false; if (UI.mode === 'gp' && UI.gp) { /* on rejoue la même course */ } launch(); };
$('#p-quit').onclick = () => { AudioSys.sfx('click'); toMenu(); };
$('#p-inv').onclick = () => { SAVE.invert = !SAVE.invert; store(); toast(SAVE.invert ? 'Direction inversée.' : 'Direction normale.'); AudioSys.sfx('click'); };
$('#calib-inv').onclick = () => { SAVE.invert = !SAVE.invert; store(); toast(SAVE.invert ? 'Direction inversée.' : 'Direction normale.'); AudioSys.sfx('click'); };
$('#p-calib').onclick = () => { AudioSys.sfx('click'); ensureMotion().then((ok) => { if (ok) Input.useTilt = SAVE.control === 'tilt'; }); UI.afterCalib = () => show('pause'); show('calib'); };
document.addEventListener('visibilitychange', () => { if (!document.hidden && AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume(); if (document.hidden) { if (G.race && !G.race.online && ['race', 'countdown', 'intro'].includes(G.race.state) && !G.paused) togglePause(); AudioSys.engine(0, false); } });

/* installation */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
function buildInstall() {
  const el = $('#install-body'); const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let html = '<h2>Installer Wild Kart</h2>';
  if (BUILD !== 'pwa') html += '<p>Cette page sert d\'aperçu. Pour jouer en ligne et avec l\'inclinaison, installe l\'appli Wild Kart.</p>';
  else if (deferredPrompt) html += '<p>Ton navigateur peut installer le jeu directement.</p><div class="row"><button class="btn red" id="do-install"><span>Installer maintenant</span></button></div>';
  html += '<h3>Android</h3><ol><li>Récupère le fichier <b>wild-kart.apk</b> (envoyé par la personne qui a compilé le jeu).</li><li>Ouvre-le sur le téléphone et autorise l\'installation depuis cette source si Android le demande.</li><li>Touche <b>Installer</b>.</li></ol>';
  html += '<h3>iPhone</h3><ol><li>Installe l\'appli <b>TestFlight</b> depuis l\'App Store.</li><li>Ouvre le lien d\'invitation reçu par e-mail ou message.</li><li>Touche <b>Installer</b> dans TestFlight.</li></ol>';
  html += '<div class="row" style="justify-content:flex-end"><button class="btn ghost" data-go="title"><span>Retour</span></button></div>';
  el.innerHTML = html;
  const di = $('#do-install'); if (di) di.onclick = () => { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; buildInstall(); }); };
}

/* orientation */
function checkRotate() {
  const portrait = window.innerHeight > window.innerWidth * 1.05; const inRace = G.race && G.race.state !== 'attract' && !G.race.resultsShown;
  $('#rotate').hidden = !(isTouch && portrait && inRace && !G.allowPortrait);
}
$('#rot-ok').onclick = () => { G.allowPortrait = true; checkRotate(); };

/* geste « retour » du téléphone : met en pause au lieu de quitter */
let backTrapped = false;
function trapBack() { try { if (!backTrapped) { history.pushState({ tk: 1 }, ''); backTrapped = true; } } catch (e) { /* non supporté */ } }
window.addEventListener('popstate', () => {
  backTrapped = false;
  if (G.race && G.race.state !== 'attract' && !G.race.resultsShown) { trapBack(); if (!G.paused && UI.screen !== 'pause') togglePause(); }
  else if (UI.screen && UI.screen !== 'title') { trapBack(); if (UI.screen === 'card') show('party'); else if (UI.screen !== 'online' || !Net.peer) show('title'); }
});

/* ================= v7 : menus, réglages, onglets ================= */
// migration une seule fois vers les nouveaux réglages par défaut
if (!SAVE.v7) { if (isTouch) SAVE.control = 'stick'; SAVE.assist = true; SAVE.fps = 60; SAVE.glider = SAVE.glider || 'classique'; SAVE.hintsN = 0; SAVE.v7 = 1; store(); }
if (SAVE.fps !== 30 && SAVE.fps !== 60) SAVE.fps = 60;
const CUPS = [['Coupe Apéro', ['piquenique', 'coupsoleil', 'pinacolada', 'sieste']], ['Coupe Pousse-Café', ['soldes', 'neonafter', 'safaribouchon', 'barbapapa']], ['Coupe Grand Frisson', ['glissade', 'tchintchin', 'grandsaut', 'gravitezero']], ['Coupe Gueule de Bois', ['barbecue', 'flipper', 'bellemere', 'ruban']], ['Coupe After (XXL)', ['tonton', 'trainfou', 'croisiere', 'festival', 'cameleon']], ['Coupe Remix', ['plongeon', 'tirebouchon', 'cascade', 'deuxroutes']]];
function cupOrder() { const out = []; for (const [name, ids] of CUPS) { const list = ids.map((id) => TRACKS.findIndex((t) => t.id === id)).filter((i) => i >= 0); out.push([name, list]); } const seen = new Set(out.flatMap((c) => c[1])); const rest = TRACKS.map((t, i) => i).filter((i) => !seen.has(i)); if (rest.length) out.push(['Autres', rest]); return out; }
// onglets génériques
function wireTabs(box) {
  const btns = Array.from(box.querySelectorAll('button[data-t]')); const panes = Array.from(box.parentElement.querySelectorAll(':scope > .tabpane'));
  const sel = (t) => { box.parentElement.dataset.tab = t; btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === t))); panes.forEach((p) => (p.hidden = p.dataset.p !== t)); };
  btns.forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); sel(b.dataset.t); }));
}
$$('.tabs').forEach(wireTabs);
// vignettes des circuits (calculées une fois)
const THUMBS = new Map();
function trackThumb(i) {
  if (!THUMBS.has(i)) { const c = document.createElement('canvas'); c.width = 240; c.height = 120; drawTrackThumb(c, TRACKS[i]); THUMBS.set(i, c); }
  return THUMBS.get(i);
}
function thumbInto(cv, i) { cv.width = 240; cv.height = 120; cv.getContext('2d').drawImage(trackThumb(i), 0, 0); }
function renderTrackGrid(el, cur, onPick, withRandom) {
  el.innerHTML = '';
  if (withRandom) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tcard rand'; b.textContent = 'Au hasard'; b.setAttribute('aria-pressed', String(cur === -1)); b.onclick = () => { AudioSys.sfx('click'); onPick(-1); }; el.appendChild(b); }
  for (const [name, list] of cupOrder()) {
    const h = document.createElement('div'); h.className = 'cup'; h.textContent = name; el.appendChild(h);
    for (const i of list) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tcard'; b.setAttribute('aria-pressed', String(cur === i)); b.innerHTML = '<canvas></canvas><b></b>'; b.querySelector('b').textContent = TRACKS[i].name; thumbInto(b.querySelector('canvas'), i); b.onclick = () => { AudioSys.sfx('click'); onPick(i); }; el.appendChild(b); }
  }
}
function buildTrackCards() {
  const wrap = $('#track-cards'); wrap.innerHTML = '';
  $('#tracks-title').textContent = 'Entraînement : choisis ton circuit';
  for (const [name, list] of cupOrder()) {
    const h = document.createElement('div'); h.className = 'cup'; h.textContent = name; wrap.appendChild(h);
    for (const i of list) { const def = TRACKS[i];
      const b = document.createElement('button'); b.className = 'card panel' + (i === UI.track ? ' sel' : ''); b.type = 'button'; const rec = SAVE.records[def.id] || {};
      b.innerHTML = '<canvas></canvas><h3></h3><p></p><div class="meta"><span class="lvl"></span><span class="rec"></span></div>';
      b.querySelector('h3').textContent = def.name; b.querySelector('p').textContent = def.desc;
      b.querySelector('.lvl').innerHTML = [1, 2, 3].map((n) => '<i class="' + (n <= def.level ? 'on' : '') + '"></i>').join('');
      b.querySelector('.rec').textContent = rec.lap ? 'Record ' + fmtTime(rec.lap) : '';
      thumbInto(b.querySelector('canvas'), i);
      b.onclick = () => { AudioSys.sfx('click'); UI.track = i; SAVE.track = i; store(); $$('#track-cards .card').forEach((c) => c.classList.remove('sel')); b.classList.add('sel'); if (G.race && G.race.state === 'attract' && G.W.ti !== i) startAttract(i); };
      wrap.appendChild(b); }
  }
  syncCC();
}
function refreshTitle() {
  { const rb = $('#b-rejoin'); if (rb) { const ok = BUILD === 'pwa' && SAVE.lastCode && Date.now() - (SAVE.lastCodeAt || 0) < 3 * 3600e3; rb.hidden = !ok; if (ok) rb.textContent = 'Revenir dans la partie ' + SAVE.lastCode; } }
  const chip = $('#ctrl-chip'); const c = SAVE.control;
  chip.classList.toggle('warn', c === 'tilt' && Input.listening && !Input.tiltSeen && isTouch);
  chip.querySelector('span').textContent = !isTouch ? 'Commandes : clavier' : 'Commandes : ' + ({ stick: 'joystick', tilt: 'inclinaison', touch: 'boutons' }[c] || 'joystick');
  $('#b-install').hidden = isStandalone();
  if (!G.race || G.race.state !== 'attract') startAttract(UI.track);
  AudioSys.stopMusic();
}
/* ---- réglages ---- */
function syncSettings() {
  $$('#set-ctrl button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === SAVE.control)));
  $$('#set-q button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === SAVE.quality)));
  $$('#set-fps button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === SAVE.fps)));
  $('#set-sens').value = SAVE.sens; $('#set-sens-o').textContent = (+SAVE.sens).toFixed(1);
  $('#set-inv').setAttribute('aria-pressed', String(!!SAVE.invert)); $('#set-snd').setAttribute('aria-pressed', String(!!SAVE.sound)); $('#set-mus').setAttribute('aria-pressed', String(!!SAVE.music)); $('#set-perf').setAttribute('aria-pressed', String(!!SAVE.showPerf));
  $$('#set-gas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === (SAVE.throttle || 'auto'))));
  $$('.tilt-only').forEach((e) => (e.hidden = SAVE.control !== 'tilt'));
}
function applyControlMode() {
  const done = () => { const pad = $('#pad'); if (pad && !pad.hidden) pad.className = padClass(); stickRest(); syncSettings(); };
  if (SAVE.control === 'tilt' && isTouch) ensureMotion().then((ok) => { Input.useTilt = ok; if (!ok) toast('Capteur non autorisé. Sur iPhone, ouvre le jeu dans Safari en https.'); done(); });
  else { Input.useTilt = false; done(); }
}
$$('#set-ctrl button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.control = b.dataset.v; store(); applyControlMode(); }));
$$('#set-fps button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.fps = +b.dataset.v; store(); syncSettings(); toast(SAVE.fps === 30 ? '30 images/s : le téléphone chauffe moins et la batterie dure plus.' : '60 images/s : le plus fluide.'); }));
$$('#set-gas button').forEach((b) => (b.onclick = () => { AudioSys.sfx('click'); SAVE.throttle = b.dataset.v; SAVE.hintsN = 0; store(); syncSettings(); const pad = $('#pad'); if (pad && !pad.hidden) pad.className = padClass(); toast(SAVE.throttle === 'manual' ? 'Manuelle : garde GAZ appuyé pour avancer. DRIFT accélère aussi : glisse ton pouce de GAZ à DRIFT.' : 'Auto : le kart accélère tout seul.'); }));
$('#set-back').onclick = () => { AudioSys.sfx('click'); const b = UI.settingsBack || 'title'; UI.settingsBack = null; show(b); };
$('#p-settings').onclick = () => { AudioSys.sfx('click'); UI.settingsBack = 'pause'; show('settings'); };
/* ---- garage ---- */
function refreshGarageKart() {
  if (!GS.scene) buildGarageScene();
  if (GS.kart) { GS.scene.remove(GS.kart.g); GS.kart.g.traverse((o) => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); }); }
  GS.kart = kartMesh(myCfg()); GS.kart.shadow = null; GS.scene.add(GS.kart.g); GS.fake = { air: GS.showGlider ? 'glide' : false, glOpen: 0, vy: 0, x: 0, h: 0, vh: 0 };
  $('#g-name').textContent = SAVE.name || 'Toi';
  const st = statsFor(SAVE.body, SAVE.wheels, SAVE.glider); const box = $('#g-stats'); box.innerHTML = '';
  [['Vitesse', st.speed], ['Accélération', st.accel], ['Maniabilité', st.handling], ['Poids', st.weight], ['Tout-terrain', st.off], ['Planeur', st.air]].forEach(([n, v]) => {
    const l = document.createElement('span'); l.textContent = n; const bar = document.createElement('div'); bar.className = 'bar'; const i = document.createElement('i'); i.style.width = Math.round(15 + v * 85) + '%'; bar.appendChild(i); box.append(l, bar);
  });
}
function enterGarage() { chipGroup($('#g-body'), BODIES, 'body'); chipGroup($('#g-wheels'), WHEELS, 'wheels'); chipGroup($('#g-glider'), GLIDERS, 'glider'); chipGroup($('#g-pilot'), PILOTS, 'pilot'); chipGroup($('#g-acc'), ACCS, 'acc'); chipGroup($('#g-finish'), FINISHES, 'finish'); chipGroup($('#g-deco'), DECOS, 'deco'); chipGroup($('#g-trail'), TRAILS, 'trail'); swatchGroup($('#g-color'), 'color'); swatchGroup($('#g-helmet'), 'helmet'); swatchGroup($('#g-skin'), 'skin', SKINS); $('#g-pseudo').value = SAVE.name; refreshGarageKart(); }
$('#g-glide').onclick = () => { AudioSys.sfx('click'); GS.showGlider = !GS.showGlider; if (GS.fake) GS.fake.air = GS.showGlider ? 'glide' : false; $('#g-glide span').textContent = GS.showGlider ? 'Ranger le planeur' : 'Voir le planeur'; };
$$('#g-tabs button').forEach((b) => b.addEventListener('click', () => { if (b.dataset.t === 'planeur' && !GS.showGlider) $('#g-glide').click(); }));
function renderGarage(dt) {
  GS.rot += dt * .6; GS.kart.g.rotation.y = GS.rot;
  if (GS.fake) animateGlider(GS.fake, GS.kart, dt, performance.now() / 1000);
  const portrait = camera.aspect < 1;
  camera.fov = 40; camera.updateProjectionMatrix();
  const up = GS.showGlider ? 1 : 0;
  if (portrait) { camera.position.set(0, 3.4 + up, 11 + up * 2); camera.lookAt(0, 1.7 + up * .6, 0); }
  else { camera.position.set(2.8, 3.2 + up * 1.2, 9 + up * 2.4); camera.lookAt(3.1, 1.0 + up * .7, 0); }
  renderer.render(GS.scene, camera);
}
/* ---- aide au démarrage (premières courses) ---- */
function showHints() {
  const el = $('#hints'); if (!el) return; if ((SAVE.hintsN || 0) >= 4) { el.hidden = true; return; }
  SAVE.hintsN = (SAVE.hintsN || 0) + 1; store();
  const m = padMode(), man = SAVE.throttle === 'manual'; const lines = man && m !== 'kbd' ? ['Garde GAZ appuyé pour avancer (DRIFT accélère aussi)', m === 'tilt' ? 'Pouce droit : GAZ · pouce gauche : DRIFT dans les virages' : 'Glisse le pouce de GAZ vers DRIFT dans les virages', 'Appuie sur GAZ juste avant le GO : départ turbo']
    : m === 'stick' ? ['Pouce gauche : glisse pour tourner', 'DRIFT maintenu dans les virages = turbo', 'Appuie sur DRIFT juste avant le GO : départ turbo']
    : m === 'tilt' ? ['Penche le téléphone pour tourner', 'DRIFT maintenu dans les virages = turbo', 'OBJET : lance ton bonus']
    : m === 'touch' ? ['Flèches pour tourner', 'DRIFT maintenu dans les virages = turbo', 'OBJET : lance ton bonus'] : [(man ? '↑ accélérer · ' : '') + '← → tourner · Espace : drift · ↓ : frein · E : objet'];
  el.innerHTML = ''; for (const t of lines) { const s = document.createElement('span'); s.textContent = t; el.appendChild(s); } el.hidden = false; clearTimeout(showHints.h); showHints.h = setTimeout(() => (el.hidden = true), 11000);
}
/* ---- limite d'images par seconde ---- */
function fpsCap() { return SAVE.fps === 30 ? 30 : 60; }

/* ================= Boucle principale ================= */
let last = performance.now(), acc = 0; const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  if (now - last < 1000 / fpsCap() - 2.5) return;
  let dt = (now - last) / 1000; last = now; if (!(dt > 0)) dt = 0; dt = Math.min(dt, .1);
  if (UI.screen === 'calib') updateCalibUI();
  if (UI.screen === 'garage' && GS.kart) { renderGarage(dt); return; }
  if (!G.W || !G.race) return;
  const racing = !!G.race.player && G.race.state !== 'attract';
  // en menu derrière un écran plein (roulette, questions…), on rafraîchit la 3D moins souvent
  const overlay = !racing && ['mini', 'card', 'wheel', 'wedit', 'party', 'online', 'settings', 'install', 'results'].includes(UI.screen);
  if (overlay && (frameN++ % 3)) return;
  if (!G.paused) {
    acc += dt; let n = 0; while (acc >= STEP && n < 6) { simStep(STEP); acc -= STEP; n++; } if (n === 6) acc = 0;
    updateVisuals(overlay ? dt * 3 : dt);
    if (G.race.player) updateHud(dt);
    if (Net.inRace && G.race.online) { Net.sendT += dt; if (Net.sendT >= 1 / 15) { Net.sendT = 0; netSendStates(); } }
  }
  if (racing) adaptPerf(dt);
  renderer.render(G.W.scene, camera);
}
// résolution dynamique : baisse la définition si le téléphone rame, la remonte quand ça va mieux
let frameN = 0; const PERF = { avg: 1 / 60, slowT: 0, fastT: 0, scale: 1, warned: false };
function adaptPerf(dt) {
  PERF.avg += (dt - PERF.avg) * .05; const base = Math.min(window.devicePixelRatio || 1, qual().pr);
  const cap = fpsCap(); if (PERF.avg > 1.33 / cap) { PERF.slowT += dt; PERF.fastT = 0; } else if (PERF.avg < 1.05 / cap) { PERF.fastT += dt; PERF.slowT = 0; } else { PERF.slowT = 0; PERF.fastT = 0; }
  if (PERF.slowT > 1.5) {
    PERF.slowT = 0;
    if (PERF.scale > .62) { PERF.scale = Math.max(.6, PERF.scale - .12); renderer.setPixelRatio(Math.max(.75, base * PERF.scale)); }
    else if (SAVE.quality === 'high') { SAVE.quality = 'medium'; store(); applyQuality(); if (G.W.sun) G.W.sun.castShadow = false; G.W.scene.traverse((o) => { if (o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; }); for (const k of G.karts) if (k.mesh.g.children[2]) k.mesh.g.children.forEach((c) => { if (c.material && c.material.map === SHADOW_TEX) c.visible = true; }); if (!PERF.warned) { PERF.warned = true; toast('Graphismes passés en Moyen pour plus de fluidité.'); } }
  } else if (PERF.fastT > 4 && PERF.scale < 1) { PERF.fastT = 0; PERF.scale = Math.min(1, PERF.scale + .1); renderer.setPixelRatio(Math.max(.75, base * PERF.scale)); }
}

/* ================= Démarrage ================= */
applyQuality();
listenMotion();
startAttract(UI.track);
show('title');
$('#loading').hidden = true;
requestAnimationFrame((t) => { last = t; frame(t); });

// accès pour les tests automatisés
window.__TK = { store, acctPull, CHU, chefRender, musicSpec, wkStrHash, accessCheck, isChef, accessSync, updCheck, UPD, frPoll, FR, statsFor, BODIES, WHEELS, GLIDERS, policeStart, secretCheck,  gateState, OBST_THEME, rollItem: rollItem11, RARITY, AudioSys,  RACE_OPTS_REF: () => RACE_OPTS, ENVS, buildSamples, updateCamera,  openSide,  hostCupStart, hostCupVerdict, hostCupEnd, hostCupBet, RACE_OPTS,  specStart, specEnd, specShift, applyBotLevel, BOT_LV, camera, kartPhysics, trackLocate, RECENT: () => RECENT, SEEN: () => SEEN, launch, renderer, T, LEVELS7, freshPick, quizCount, buildBranches, padMode, G, UI, SAVE, Input, Net, hostMini, MINI, startWheel, PERF, useItem, applyQuality, netSendStates, startQuiz, netCreate, netJoin, hostStart, myCfg, kartMesh, TRACKS, startRace, show, simStep, updateVisuals, setAutopilot: (v) => (G.autopilot = v), render: () => renderer.render(G.W.scene, camera), showResults };
})();
