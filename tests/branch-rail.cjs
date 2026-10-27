'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../www/game.js'), 'utf8');
class Geometry {
  constructor() { this.attributes = {}; }
  setAttribute(name, attribute) { this.attributes[name] = attribute; }
  setIndex(index) { this.index = index; }
}
class Attribute { constructor(array, size) { this.array = array; this.itemSize = size; } }
const context = vm.createContext({ T: { BufferGeometry: Geometry, Float32BufferAttribute: Attribute }, TAU: Math.PI * 2 });
vm.runInContext(source.slice(source.indexOf('function tubeAlong('), source.indexOf('function quadAt(')), context);
for (const n of [2, 4, 5, 8]) {
  const S = { N: n, closed: false, px: Array.from({ length: n }, (_, i) => i * 2),
    pz: Array(n).fill(0), py: Array(n).fill(0), rx: Array(n).fill(0), rz: Array(n).fill(1) };
  const geometry = context.tubeAlong(S, 0, 1, .1, 8, 2);
  const points = geometry.attributes.position.array;
  assert.equal(points[points.length - 8 * 3], S.px[n - 1], 'branch rail must reach final sample for ' + n + ' samples');
  assert.ok(geometry.index.length > 0, 'short rails still need connected faces');
  console.log('PASS rail reaches branch end:', n, 'samples');
}
