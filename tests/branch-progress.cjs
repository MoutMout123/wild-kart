'use strict';
// Exercises the production mapper without a renderer: valid routes can replace
// more than half a lap (two Rond-Point Explosif crossings do exactly this).
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../www/game.js'), 'utf8');
const start = source.indexOf('function branchMainProg(');
const end = source.indexOf('// si le kart', start);
const G = { W: { S: { N: 1000 } } };
const context = vm.createContext({ G, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) });
vm.runInContext(source.slice(start, end), context);
const progress = context.branchMainProg;
for (const [name, i0, i1] of [
  ['short shortcut', 150, 350],
  ['half-lap crossing', 120, 620],
  ['Rond-Point TRAVERSÉE', 300, 840],
  ['Rond-Point DIAGONALE', 440, 970],
  ['crossing the lap seam', 850, 150]
]) {
  const span = (i1 - i0 + 1000) % 1000;
  const B = { N: 101, i0, i1, seg: 2, noseA: 15, noseB: 85,
    map: Array.from({ length: 101 }, (_, q) => Math.round(i0 + span * q / 100) % 1000) };
  let last = -Infinity;
  for (let j = 0; j < B.N; j++) {
    const p = progress(B, j, 0);
    assert.ok(Number.isFinite(p) && p >= last, name + ' must advance continuously');
    if (j) assert.ok(p - last <= span / 100 + 2, name + ' must not jump');
    last = p;
  }
  assert.ok(Math.abs(progress(B, 0, 0) - i0) < .01, name + ' entry');
  assert.ok(Math.abs(progress(B, 100, 0) - (i0 + span)) < .01, name + ' exit rejoins main progress');
  assert.ok(Math.abs(progress(B, 99, 1) - (progress(B, 99, 0) + progress(B, 100, 0)) / 2) < .001,
    name + ' interpolates between samples');
  console.log('PASS', name);
}
