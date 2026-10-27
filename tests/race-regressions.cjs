const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('www/game.js', 'utf8');
function fn(name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
const P = { prog: 0, lap: 1 }, opponents = Array.from({ length: 7 }, (_, i) => ({ prog: i + 1 }));
const G = { karts: [P, ...opponents], race: { state: 'countdown', player: P, order: [] } };
const ctx = vm.createContext({ G, LAPS: 3, Map });
vm.runInContext(fn('racePS') + '\n' + fn('updateRaceOrder'), ctx);
ctx.updateRaceOrder();
assert.equal(P.place, 8);
G.race.state = 'race';
P.prog = 9;
ctx.updateRaceOrder();
assert.equal(P.place, 1);
assert.equal(G.race.ps.passes, 7, 'all seven passes count together, even at the start');
ctx.updateRaceOrder();
assert.equal(G.race.ps.passes, 7, 'unchanged ranking does not count twice');
G.race.daily = { obj: ['passes'] };
vm.runInContext(fn('dailyCheck'), ctx);
assert.equal(ctx.dailyCheck(G.race, P), true, 'six-kart challenge validates');
assert.equal(G.race.ps.worst, 1); // start counted below in a race, not during countdown
// A disappearing opponent and a spectator must never award a pass.
G.karts = [P, { prog: 20 }, { prog: 30, spect: true }];
ctx.updateRaceOrder();
assert.equal(P.place, 2);
assert.equal(G.race.ps.worst, 2);
G.karts = [P];
ctx.updateRaceOrder();
assert.equal(G.race.ps.passes, 7);
// The finish callback must see the final ranking and passes before it awards the challenge.
const O = { prog: 50 };
G.karts = [P, O];
G.race.order = [];
P.prog = 10;
ctx.updateRaceOrder();
P.prog = 60;
P.isPlayer = true;
Object.assign(ctx, { netEmit() {}, playerFinished() {
  assert.equal(P.place, 1);
  assert.equal(G.race.ps.passes, 8);
}});
vm.runInContext(fn('finishKart'), ctx);
ctx.finishKart(P);
// Reordered / repeated remote packets cannot roll an opponent back; rollover remains valid.
const K = { isRemote: true, netSeq: 900, netInit: true };
Object.assign(ctx, { performance: { now: () => 1000 }, clamp: (x, a, b) => Math.max(a, Math.min(b, x)), netBuf() {} });
G.W = { S: { N: 100 }, branches: [] };
G.netKarts = new Map([['other', K]]);
vm.runInContext(fn('applyRemote'), ctx);
const packet = Array(25).fill(0); Object.assign(packet, { 0: 'other', 1: 12, 2: 30, 18: -1, 21: 901 });
ctx.applyRemote(packet);
assert.equal(K.net.x, 12);
packet[1] = -999; packet[21] = 1;
ctx.applyRemote(packet);
assert.equal(K.net.x, 12, 'very old packet rejected');
packet[21] = 901;
ctx.applyRemote(packet);
assert.equal(K.net.x, 12, 'duplicate rejected');
K.netSeq = 999999999; packet[1] = 13; packet[21] = 0;
ctx.applyRemote(packet);
assert.equal(K.net.x, 13, 'sequence rollover accepted');
// Fixed simulation advances real elapsed time on displays whose refresh is not 60 Hz.
for (const cap of [0, 30, 60]) for (const hz of [60, 75, 90, 120, 144]) {
  let simulated = 0;
  const timing = vm.createContext({ requestAnimationFrame() {}, fpsCap: () => cap, RFR: { n: 0 },
    UI: { screen: 'game' }, GS: {}, G: { W: { scene: {} }, race: { player: P } }, REPLAY: { on: false },
    Net: { inRace: false }, simStep(dt) { simulated += dt; }, updateVisuals() {}, recTick() {}, ghostTick() {}, updateHud() {}, adaptPerf() {}, renderer: { render() {} }, camera: {} });
  vm.runInContext('let last = 0, lastTick = 0, acc = 0, frameN = 0; const STEP = 1 / 60;\n' + fn('frame'), timing);
  for (let n = 1; n <= hz * 2; n++) timing.frame(n * 1000 / hz);
  assert(Math.abs(simulated - 2) <= 3 / 60, `${cap} FPS cap, ${hz} Hz: simulation advanced ${simulated}s instead of 2s`);
}
console.log('Race regressions: passes, daily challenge, finish order, network sequence, 60–144 Hz timing OK');
