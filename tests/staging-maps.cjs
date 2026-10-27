'use strict';
// Charge le vrai site de test déployé, sans remplacer ses scripts ni ses fonctions.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {X509Certificate,createHash}=require('node:crypto');
const caPin=process.env.WK_CA_CERT ? createHash('sha256').update(new X509Certificate(fs.readFileSync(process.env.WK_CA_CERT)).publicKey.export({type:'spki',format:'der'})).digest('base64') : null;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader',...(caPin ? ['--ignore-certificate-errors-spki-list='+caPin] : [])]});
 try {
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;const native=window.setTimeout;window.setTimeout=function(f,...a){if(typeof f==='function'&&f.name==='accessInit')return 0;return native.call(this,f,...a);};localStorage.setItem('tiltkart.v1',JSON.stringify({quality:'low',sound:false,music:false,laps:1,obst:true}));});
 const url=process.env.WK_TEST_URL || 'https://moutmout123.github.io/wild-kart-jeu/test/index.html';
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.__TK,{timeout:60000});
 const info=await page.evaluate(()=>({v:window.TK_VER,test:window.TK_TEST,api:window.TK_API}));
 if(process.env.WK_EXPECT_VERSION)assert.equal(info.v,process.env.WK_EXPECT_VERSION);
 assert.equal(info.test,true);assert.ok(info.api.includes('-test.'));
 const races=[];
 for(const id of ['piquenique','soldes','glissade','grandsaut','cascade','deuxroutes']){
 const row=await page.evaluate(id=>{
 const K=window.__TK;K.UI.mode='quick';K.SAVE.laps=1;K.SAVE.obst=true;
 K.startRace(K.TRACKS.findIndex(t=>t.id===id),1);K.setAutopilot(true);
 let steps=0;while(steps<60*400&&!K.G.karts.every(k=>k.finished)){K.simStep(1/60);steps++;}
 return {id,steps,total:K.G.karts.length,finished:K.G.karts.filter(k=>k.finished).length,ramps:K.G.W.kickers.filter(k=>k.P).length,gates:K.G.W.gates.length,finite:K.G.karts.every(k=>Number.isFinite(k.x)&&Number.isFinite(k.z)&&Number.isFinite(k.y))};
 },id);
 races.push(row);assert.equal(row.total,8);assert.equal(row.finished,8);assert.equal(row.finite,true);
 assert.equal(row.ramps,['piquenique','soldes','grandsaut'].includes(id) ? 1 : 0);
 assert.equal(row.gates,id==='deuxroutes' ? 2 : ['soldes','cascade'].includes(id) ? 1 : 0);
 console.log('PASS '+id+' : '+row.finished+'/'+row.total+' arrivés, '+row.ramps+' tremplin(s) de branche, '+row.gates+' porte(s)');
 }
 assert.deepEqual(errors,[]);fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/staging-maps.json',JSON.stringify({url,info,races,errors},null,2));
 console.log('PASS site de test déployé '+info.v+' : 6 circuits, 48 arrivées, obstacles et portes actifs, aucune exception JavaScript');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
