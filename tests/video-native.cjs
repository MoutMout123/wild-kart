const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('www/game.js','utf8');
const fn = source.slice(source.indexOf('function videoNative()'),source.indexOf('async function videoReady('));
const Share = {share(){}}, Filesystem = {writeFile(){}};
const run = Capacitor => vm.runInNewContext(fn+';videoNative()', {window:{Capacitor}});
assert.equal(run(undefined), null);
assert.equal(run({isNativePlatform:()=>false}), null);
assert.equal(run({isNativePlatform:()=>true,isPluginAvailable:()=>false}), null);
// Native bridge injected into the hosted game exposes Plugins, without registerPlugin.
const native = run({isNativePlatform:()=>true,isPluginAvailable:()=>true,Plugins:{Share,Filesystem}});
assert.equal(native.share,Share); assert.equal(native.fs,Filesystem);
console.log('PASS partage natif : pont Capacitor injecté sans module/bundler, ancien APK et navigateur');
