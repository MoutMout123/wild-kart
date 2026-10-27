const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
 const server=spawn('python3',['-m','http.server','8877','--bind','127.0.0.1'],{cwd:path.join(ROOT,'www'),stdio:'ignore'});
 let browser;
 try {
 await new Promise(r=>setTimeout(r,600));
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage();
 await page.addInitScript(()=>{const native=window.setTimeout;window.setTimeout=function(f,...a){if(typeof f==='function'&&f.name==='accessInit')return 0;return native.call(this,f,...a);};});
 await page.goto('http://127.0.0.1:8877/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__TK,{timeout:60000});
 const source=fs.readFileSync(path.join(ROOT,'www/game.js'),'utf8');
 const extract=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
 const extra=extract('function nearestOn(','function trackLocate(')+extract('function computeGore(','const GORE_TEX')+extract('function branchMainProg(','// si le kart');
 const report=await page.evaluate(extra=>{
 const K=window.__TK, G=K.G, clamp=(n,a,b)=>Math.min(b,Math.max(a,n)), lerp=(a,b,t)=>a+(b-a)*t;
 const extraFns=new Function('G','clamp','lerp',extra+';return {computeGore,branchMainProg};')(G,clamp,lerp);
 const saved=G.W, rows=[];
 try {for(const def of K.TRACKS){
 const S=K.buildSamples(def),W={S,def,hw:def.width/2,curbW:1.6,wallD:def.width/2+7.1};
 K.buildBranches(W);extraFns.computeGore(W);G.W=W;
 const branches=W.branches.map(B=>{let last=-Infinity,maxJump=0;for(let j=0;j<B.N;j++){const p=extraFns.branchMainProg(B,j,0);maxJump=Math.max(maxJump,p-last);if(p<last-.001)throw Error(def.id+' backwards');last=p;}
 const exit=extraFns.branchMainProg(B,B.N-1,0),span=(B.i1-B.i0+S.N)%S.N;
 return {label:B.def.label,samples:B.N,entry:B.i0,exit:B.i1,progressExit:exit,expectedExit:B.i0+span,exitError:Math.abs(exit-B.i0-span),finite:Array.from(B.px).every(Number.isFinite)&&Array.from(B.py).every(Number.isFinite)&&Array.from(B.pz).every(Number.isFinite),entryGap:Math.hypot(B.px[0]-S.px[B.i0],B.py[0]-S.py[B.i0],B.pz[0]-S.pz[B.i0]),exitGap:Math.hypot(B.px[B.N-1]-S.px[B.i1],B.py[B.N-1]-S.py[B.i1],B.pz[B.N-1]-S.pz[B.i1])};});
 rows.push({id:def.id,samples:S.N,branches});
 }}finally{G.W=saved;}
 return rows;
 },extra);
 const out=process.env.MAP_AUDIT_REPORT; if(out) fs.writeFileSync(out,JSON.stringify(report,null,2));
 if(report.some(t=>t.branches.some(b=>!b.finite || b.exitError>2 || b.samples<2 || b.entryGap>2 || b.exitGap>2))) process.exitCode=1;
 console.log(JSON.stringify({tracks:report.length,branches:report.reduce((n,t)=>n+t.branches.length,0),nonFinite:report.flatMap(t=>t.branches.filter(b=>!b.finite).map(b=>({id:t.id,...b}))),exitErrors:report.flatMap(t=>t.branches.filter(b=>b.exitError>8).map(b=>({id:t.id,...b}))),maxSeam:Math.max(...report.flatMap(t=>t.branches.flatMap(b=>[b.entryGap,b.exitGap])))},null,2));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
