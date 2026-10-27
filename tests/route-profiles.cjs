'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('www/game.js', 'utf8');
const levels = JSON.parse(source.match(/^const LEVELS11 = (.+);$/m)[1]);
const ids = ['piquenique', 'soldes', 'glissade', 'grandsaut', 'cascade', 'deuxroutes'];
const TRACKS = ids.map(id => ({ id, ...structuredClone(levels[id]) }));
const before = structuredClone(TRACKS);
const a = source.indexOf('const ROUTE_UPGRADES = '), b = source.indexOf('const fmtClock', a);
assert.ok(a >= 0 && b > a, 'Curated route profiles exist');
const ctx = vm.createContext({ TRACKS });
vm.runInContext(source.slice(a, b), ctx);
const changed = TRACKS.filter((t, i) => JSON.stringify(t) !== JSON.stringify(before[i]));
assert.equal(changed.length, 6);
let launches = 0;
for (const [i, t] of TRACKS.entries()) {
  assert.deepEqual(t.pts, before[i].pts, t.id + ': main route preserved');
  assert.equal(t.branches.length, before[i].branches.length, t.id + ': existing paths retained');
  assert.deepEqual(t.branches.map(b => [b.from, b.to]), before[i].branches.map(b => [b.from, b.to]), t.id + ': joins preserved');
  assert.equal(typeof t.desc, 'string'); assert.ok(t.desc.length > 80);
  for (const B of t.branches) {
    assert.ok(B.width >= 10 && B.width <= 24, t.id + ': usable route width');
    assert.ok(B.mid.every(p => p.length === 3 && p.every(Number.isFinite)), t.id + ': finite route geometry');
    if (B.launch) {
      launches++;
      assert.equal(B.mid.length, 3, t.id + ': takeoff/landing plateau');
      assert.ok(B.launch.at >= .3 && B.launch.at <= .5);
      assert.ok(B.launch.vy >= 5 && B.launch.vy <= 7);
      assert.ok(B.launch.minSpeed >= 24 && B.launch.minSpeed <= 30);
    }
  }
}
assert.equal(launches, 3);
for (const id of ['soldes', 'cascade']) {
  const t = TRACKS.find(t => t.id === id);
  assert.ok(t.gates.length > 0);
  assert.ok(t.gates.every(g => g.mode === 'branch'), id + ': timed path never closes main road');
}
const crossroads = TRACKS.find(t => t.id === 'deuxroutes');
assert.deepEqual(crossroads.gates, before.find(t => t.id === 'deuxroutes').gates, 'Original alternating routes retained');
assert.ok(crossroads.branches[0].width > crossroads.branches[1].width);
assert.equal(crossroads.branches[1].boost, true);
assert.equal(TRACKS.find(t => t.id === 'glissade').branches[0].offroad, true, 'Snow path retains offroad character');
console.log('PASS six distinct route profiles: preserved joins/main roads, 3 ramp plateaus, 2 safe-main timed gates, width/boost choices');
