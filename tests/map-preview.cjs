'use strict';
// Captures de contrôle du vrai moteur, sans animation ni contenu de démonstration.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'), out=path.join(root,'artifacts/maps');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=spawn('python3',['-m','http.server','8894','--bind','127.0.0.1'],{cwd:path.join(root,'www'),stdio:'ignore'});let browser;
 try {
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1100,height:800}});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;const native=window.setTimeout;window.setTimeout=function(f,...a){if(typeof f==='function'&&f.name==='accessInit')return 0;return native.call(this,f,...a);};localStorage.setItem('tiltkart.v1',JSON.stringify({quality:'low',sound:false,music:false,obst:true}));});
 await page.goto('http://127.0.0.1:8894/index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__TK);
 for(const id of ['piquenique','soldes','glissade','grandsaut','cascade','deuxroutes']){
 const info=await page.evaluate(id=>{const K=window.__TK;K.startRace(K.TRACKS.findIndex(t=>t.id===id),1);const W=K.G.W,bb=W.bb,cam=K.camera;W.scene.fog=null;W.sky.visible=false;K.show(null);for(const el of document.querySelectorAll('#hud,#pad,#count,#hints'))el.hidden=true;cam.far=12000;cam.fov=45;cam.up.set(0,0,-1);cam.position.set(bb.cx,bb.ext*2.8+100,bb.cz);cam.lookAt(bb.cx,0,bb.cz);cam.updateProjectionMatrix();K.renderer.setPixelRatio(1);K.render();return {id,name:W.def.name,ramps:W.kickers.filter(k=>k.P).map(k=>({label:k.label,index:k.i})),gates:W.gates.length};},id);
 await page.screenshot({path:path.join(out,id+'.png')});console.log(JSON.stringify(info));
 }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
