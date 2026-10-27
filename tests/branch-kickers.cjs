'use strict';
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('www/game.js', 'utf8');
const extract = (a,b) => source.slice(source.indexOf(a), source.indexOf(b,source.indexOf(a)));
const context = vm.createContext({ clamp:(v,a,b)=>Math.min(b,Math.max(a,v)), Float32Array, Math, AudioSys:{sfx(){}}, banner(){}, endDrift(k){k.drift=false;}, rand:()=>.15 });
vm.runInContext(extract('function planKickers(W) {','const KICK_TEX')+extract('function kickerLaunch(k, W','// ---------- circuits « en sections »'),context);
const path = (N,closed) => ({N,closed,seg:2,py:new Float32Array(N),slope:new Float32Array(N)});
const S=path(500,true), B=Object.assign(path(200,false),{noseA:20,noseB:180,def:{launch:{at:.3,minSpeed:28,vy:6.5,label:'Corniche'}}});
const W={S,def:{tricks:[.8]},branches:[B]};context.planKickers(W);
const ramp=W.kickers.find(k=>k.P===B), lip=ramp.lip;
assert.ok(ramp);assert.ok(lip-7>B.noseA);assert.ok(B.noseB-lip>=30);
assert.equal(B.py[0],0);assert.equal(B.py[B.N-1],0);assert.ok(B.py[lip-1]>1.1);assert.equal(B.py[lip],0);
for(let i=lip-7;i<lip-1;i++)assert.ok(B.py[i+1]>B.py[i]);
for(const [speed,idx,oldIdx,expected] of [[27,lip,lip-1,false],[30,lip,lip-1,true],[145,lip+4,lip-2,true],[40,lip+20,lip+19,false]]){
 const k={P:B,idx,speed,air:false,isPlayer:true,airH:0,boost:0}; context.kickerLaunch(k,W,B,oldIdx);assert.equal(!!k.air,expected);if(expected){assert.ok(k.vy>0);assert.equal(k.airT,0);assert.equal(k.trickOK,true);}
}
const wrong={P:S,idx:lip,speed:50,air:false};context.kickerLaunch(wrong,W,S,lip-1);assert.ok(!wrong.air);
const flight={P:B,idx:lip,speed:50,air:'jump',vy:3};context.kickerLaunch(flight,W,B,lip-1);assert.equal(flight.vy,3);
const main={P:S,idx:400,speed:30,air:false};context.kickerLaunch(main,W,S,399);assert.equal(main.air,'jump');
const tiny=Object.assign(path(30,false),{noseA:8,noseB:20,def:{launch:{at:.3}}});const short={S,def:{},branches:[tiny]};context.planKickers(short);assert.equal(short.kickers.length,0);
console.log('PASS tremplins de branche : géométrie/hauteurs, vitesse minimale, saut et figure, franchissement rapide, voie sûre, compatibilité des tremplins existants');
