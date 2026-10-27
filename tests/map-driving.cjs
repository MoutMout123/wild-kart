'use strict';
// Probe the real locator/checkpoints/respawn and vehicle controller, without rendering every simulation step.
// Source instrumentation only adds test exports to the served response; it never changes game.js on disk.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..'), PORT = 8893;
(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(ROOT, 'www'), stdio: 'ignore' });
  let browser;
  try {
    await new Promise(r => setTimeout(r, 600));
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
      let seed=0x574b4d50; Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      const native = window.setTimeout;
      window.setTimeout = function (f, ...a) { if (typeof f === 'function' && f.name === 'accessInit') return 0; return native.call(this, f, ...a); };
      localStorage.setItem('tiltkart.v1', JSON.stringify({ quality: 'low', sound: false, music: false, laps: 1, obst: false }));
    });
    const source = fs.readFileSync(path.join(ROOT, 'www/game.js'), 'utf8');
    await page.route('**/game.js*', route => route.fulfill({ contentType: 'application/javascript', body: source.replace('window.__TK = {', 'window.__TK = { mapTest: { makeKart, finishLocate, startFall, fallStep, airPhysics, aiControl, computeGore, buildEdges, planGates, updateGates, gateBlock, planKickers, kickerLaunch, branchMainProg },') }));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__TK, { timeout: 60000 });
    const traced = await page.evaluate(() => {
      const K = window.__TK, H = K.mapTest, G = K.G, saved = { W: G.W, race: G.race }, results = [];
      const kAt = (P, i) => ({ P, idx: i, x: P.px[i], z: P.pz[i], y: P.py[i], h: P.hd[i], vh: P.hd[i], lap: 1, halfway: false, prog: 0, maxSpeed: 55, speed: 30, isPlayer: false, boost: 0, airH: 0, ghost: 0, lapTimes: [], lapStart: 0, bestLap: Infinity, finished: false });
      try { for (const def of K.TRACKS) {
        const S = K.buildSamples(def), W = { S, def, hw: def.width / 2, curbW: 1.6, wallD: def.width / 2 + 7.1, th: def.theme || {} };
        K.buildBranches(W); H.computeGore(W); G.W = W; G.race = { state: 'race', t: 0, order: [], player: null };
        const k = kAt(S, 0); K.trackLocate(k);
        for (let i = 1; i <= S.N; i++) { const j = i % S.N; k.x = S.px[j]; k.z = S.pz[j]; K.trackLocate(k); }
        const row = { id: def.id, mainLap: k.lap, branches: [] };
        for (const B of W.branches) {
          const start = (B.i0 - 4 + S.N) % S.N, q = kAt(S, start); K.trackLocate(q);
          let entered = false, worstBack = 0, before = q.prog;
          for (let j = 0; j < B.N; j++) {
            q.x = B.px[j]; q.z = B.pz[j]; K.trackLocate(q); entered ||= q.P === B;
            worstBack = Math.max(worstBack, before - q.prog); before = q.prog;
          }
          for (let j = 1; j <= 4; j++) { const i = (B.i1 + j) % S.N; q.x = S.px[i]; q.z = S.pz[i]; K.trackLocate(q); }
          const at = Math.floor(B.N * .55), fall = kAt(B, at); H.startFall(fall); for (let i = 0; i < 61; i++) if (fall.fallT > 0) H.fallStep(fall, 1 / 60);
          const respawn = fall.P === B && fall.idx >= at && fall.idx <= at + 3 && Number.isFinite(fall.y) && fall.h === B.hd[fall.idx];
          row.branches.push({ label: B.def.label, id: B.id, entered, exited: q.P === S, exitError: Math.abs(q.mainIdx - (B.i1 + 4) % S.N), worstBack: +worstBack.toFixed(3), respawn });
        }
        results.push(row);
      }} finally { G.W = saved.W; G.race = saved.race; }
      return results;
    });
    const tracingFailures = traced.flatMap(t => [ ...(t.mainLap !== 2 ? [{ id: t.id, mainLap: t.mainLap }] : []), ...t.branches.filter(b => !b.entered || !b.exited || b.exitError > 3 || b.worstBack > 4 || !b.respawn).map(b => ({ id: t.id, ...b })) ]);
    console.log(JSON.stringify({ mode: 'locator/checkpoints/respawn', tracks: traced.length, branches: traced.reduce((n, t) => n + t.branches.length, 0), failures: tracingFailures }, null, 2));
    const targets = process.env.MAP_DRIVE_TRACKS ? process.env.MAP_DRIVE_TRACKS.split(',') : ['piquenique','soldes','glissade','grandsaut','cascade','deuxroutes'];
    const physical = [];
    for (const id of targets) {
      const row = await page.evaluate(id => {
        const K = window.__TK, H = K.mapTest, G = K.G, ti = K.TRACKS.findIndex(t => t.id === id); if (ti < 0) throw Error('Unknown track ' + id);
        K.SAVE.obst = false; K.startRace(ti, 1); const W = G.W, S = W.S, results = [], launches = [], gates = [];
        for (const g of W.gates || []) g.st = {brOpen:true,mainOpen:true,warnBr:false,warnMain:false};
        for (const B of W.branches) {
          const k = H.makeKart(K.myCfg(), false, 1), j = Math.min(B.N - 3, B.jA + 5); G.karts = [k]; Object.assign(G.race, { state: 'race', t: 0, timer: 0, player: k, order: [], resultsShown: true });
          Object.assign(k, { P: B, idx: j, x: B.px[j], z: B.pz[j], y: B.py[j], groundY: B.py[j], h: B.hd[j], vh: B.hd[j], lap: 1, speed: k.maxSpeed * .7, isAI: true });
          Object.assign(k.ai, { skill: 1, drifty: false, err: 0, avoid: 1, br: Object.fromEntries(W.branches.map(b => [b.id, { lap: 1, take: b === B }])) });
          H.finishLocate(k, B, j);
          let steps = 0, bad = false, falls = 0, air = false, lastFall = false, reached = false;
          while (steps++ < 60 * 150) {
            const inp = H.aiControl(k, 1 / 60); K.kartPhysics(k, inp, 1 / 60); G.race.t += 1 / 60;
            if (![k.x,k.y,k.z,k.speed,k.prog].every(Number.isFinite)) { bad = true; break; }
            if (k.fallT > 0 && !lastFall) falls++; lastFall = k.fallT > 0; air ||= !!k.air;
            if (k.P === S && Math.abs(k.mainIdx - B.i1) < 30) { reached = true; break; }
          }
          results.push({ label: B.def.label, length: +(B.N * B.seg).toFixed(1), reached, seconds: +(steps / 60).toFixed(2), falls, air, bad, finalPath: k.P === S ? 'main' : k.P.id, finalIndex: k.idx, finalSpeed: +k.speed.toFixed(2) });
        }
        const position = (B, j, speed) => {
          const k = H.makeKart(K.myCfg(), false, 1); G.karts = [k]; Object.assign(G.race,{state:'race',t:0,timer:0,player:k,order:[],resultsShown:true});
          Object.assign(k,{P:B,idx:j,x:B.px[j],z:B.pz[j],y:B.py[j],groundY:B.py[j],h:B.hd[j],vh:B.hd[j],lap:1,speed,isAI:true});
          Object.assign(k.ai,{skill:1,drifty:false,err:0,avoid:1,br:Object.fromEntries(W.branches.map(b=>[b.id,{lap:1,take:b===B}]))});
          H.finishLocate(k,B,j); return k;
        };
        for (const B of W.branches.filter(b=>b.def.launch)) {
          const ramps = (W.kickers || []).filter(r=>r.P===B), ramp = ramps[0];
          if (!ramp) {launches.push({label:B.def.label,exists:false});continue;}
          const slow = position(B,ramp.lip-1,ramp.minSpeed-3); let slowAir=false,slowCrossed=false;
          for(let n=0;n<180;n++){K.kartPhysics(slow,{steer:0,throttle:0,drift:false},1/60);slowAir ||= !!slow.air;if(slow.idx>=ramp.lip+3){slowCrossed=true;break;}}
          const cases=[];
          for(const boost of [false,true]){
            const k=position(B,ramp.lip-3,boost?90:Math.max(ramp.minSpeed+8,45));if(boost)k.boost=1;
            let launched=false,landed=false,below=false,peak=0,fall=false,reached=false;
            for(let n=0;n<60*40;n++){
              K.kartPhysics(k,H.aiControl(k,1/60),1/60);G.race.t+=1/60;
              if(k.air)launched=true;else if(launched)landed=true;
              peak=Math.max(peak,k.airH||0);below ||= k.y<k.groundY-.1;fall ||= k.fallT>0;
              if(k.P===S&&Math.abs(k.mainIdx-B.i1)<30){reached=true;break;}
            }
            cases.push({boost,launched,landed,below,fall,reached,peak:+peak.toFixed(2)});
          }
          launches.push({label:B.def.label,exists:ramps.length===1,lip:ramp.lip,noseA:B.noseA,noseB:B.noseB,slowAir,slowCrossed,cases});
        }
        for(const g of W.gates||[]){
          if(g.mode!=='branch')continue;
          let alwaysMain=true,warning=false,closedAt=null;
          for(let n=0;n<1000;n++){const t=n*g.period/500,st=K.gateState(g,t);alwaysMain&&=st.mainOpen;warning ||= st.warnBr;if(!st.brOpen)closedAt=t;}
          H.updateGates(W,closedAt);
          const entry=position(g.B,g.brJ-1,20);K.kartPhysics(entry,{steer:0,throttle:0,drift:false},1/60);
          const committed=position(g.B,g.brJ+5,20);K.kartPhysics(committed,{steer:0,throttle:0,drift:false},1/60);
          gates.push({label:g.B.def.label,alwaysMain,warning,closedAt,redirected:entry.P===S,committedContinues:committed.P===g.B});
          g.st={brOpen:true,mainOpen:true,warnBr:false,warnMain:false};
        }
        return { id, branches: results, launches, gates };
      }, id);
      physical.push(row); console.log(JSON.stringify({mode:'physics/AI',...row}));
    }
    const races = [];
    if (process.env.MAP_RACES === '1') for (const id of targets) {
      const race = await page.evaluate(id => {
        const K = window.__TK, G = K.G, ti = K.TRACKS.findIndex(t=>t.id===id);
        K.SAVE.laps = 1; K.SAVE.obst = true; K.startRace(ti,1); K.setAutopilot(true);
        const falling = new Set(), falls = new Map(); let steps=0,nonFinite=false;
        while(steps<60*400&&!G.karts.every(k=>k.finished)){
          K.simStep(1/60); steps++;
          for(const k of G.karts){
            if(k.fallT>0){if(!falling.has(k))falls.set(k,(falls.get(k)||0)+1);falling.add(k);}else falling.delete(k);
            if(![k.x,k.y,k.z,k.speed,k.prog].every(Number.isFinite)){nonFinite=true;break;}
          }
          if(nonFinite)break;
        }
        return {id,seed:K.RACE_OPTS.seed,obstacles:G.W.obst.length,finished:G.karts.filter(k=>k.finished).length,total:G.karts.length,steps,seconds:+(steps/60).toFixed(2),nonFinite,karts:G.karts.map(k=>({name:k.name,finished:k.finished,falls:falls.get(k)||0,place:k.place,lap:k.lap,path:k.P===G.W.S?'main':k.P.def.label,index:k.idx,speed:+k.speed.toFixed(2),time:k.finished?+k.finishTime.toFixed(2):null}))};
      },id);
      races.push(race); console.log(JSON.stringify({mode:'full-race-obstacles-on',...race}));
    }
    const failures = physical.flatMap(t => [
      ...t.branches.filter(b => !b.reached || b.bad).map(b => ({id:t.id,...b})),
      ...t.launches.filter(l=>!l.exists || l.slowAir || !l.slowCrossed || l.cases.some(c=>!c.launched||!c.landed||c.below||c.fall||!c.reached)).map(l=>({id:t.id,launch:l})),
      ...t.gates.filter(g=>!g.alwaysMain||!g.warning||g.closedAt==null||!g.redirected||!g.committedContinues).map(g=>({id:t.id,gate:g}))
    ]);
    const raceFailures = races.filter(r=>r.finished!==r.total||r.nonFinite);
    const report = { traced, tracingFailures, physical, failures, races, raceFailures, note: 'Centreline probes exercise actual locator and respawn. AI driving starts within each branch, obstacles off, no rendering or human controls; this does not certify every race situation.' };
    if (process.env.MAP_DRIVING_REPORT) fs.writeFileSync(process.env.MAP_DRIVING_REPORT, JSON.stringify(report, null, 2));
    if (tracingFailures.length || failures.length || raceFailures.length) process.exitCode = 1;
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
