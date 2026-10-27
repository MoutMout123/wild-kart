const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const source = readFileSync(require('node:path').join(__dirname, '../www/game.js'), 'utf8');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'], headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="acct"></div><div id="fr-root"></div>');
    await page.addScriptTag({ content: `
      const SAVE = { name: 'Lea', fid: 'LEA-4821', acct: { u: 'Lea', tok: 'session' }, friends: [{ id: 'AMI-1234', name: 'Ami' }], groups: [{ code: 'G-ABC123', owner: 'LEA-4821', members: [{ id: 'LEA-4821', name: 'Lea' }] }] };
      const ACU = { open: true, msg: '', busy: false }, FRU = { tab: 'amis' }, FR = { status: new Map(), open: true }, UI = { screen: 'friends' }, Net = {};
      const $ = s => document.querySelector(s), frMyId = () => SAVE.fid, frList = () => SAVE.friends, grList = () => SAVE.groups;
      const store = () => {}, acctRefreshUI = () => {}, frKick = () => {}, acctInfo = () => {}, frIds = () => SAVE.friends.map(f => f.id), frSendMany = () => {}, frWire = () => {};
      async function acctCall(a, body) { if (a !== 'name' || body.pseudo !== 'Lea' || body.tok !== 'session') throw Error('Wrong request'); return { ok: true, name: body.name, at: 123 }; }
      function acctClose() { ACU.open = false; }
      ${source.slice(source.indexOf('async function acctSetName('), source.indexOf('function acctPack('))}
      ${source.slice(source.indexOf('function frRender('), source.indexOf('function frCheckAll('))}
      ${source.slice(source.indexOf('function acctRender('), source.indexOf('// au lancement : on récupère'))}
      acctRender(); frRender();
    ` });
    await page.locator('#ac-name').fill('Léa du Kart');
    await page.locator('#ac-rename').click();
    await page.waitForFunction(() => document.querySelector('#ac-msg').textContent.includes('Nom modifié'));
    assert.equal(await page.locator('#ac-name').inputValue(), 'Léa du Kart');
    const friendsText = await page.locator('#fr-root').innerText();
    assert.ok(friendsText.includes('Léa du Kart')); assert.ok(!friendsText.includes('Ton identifiant ami')); assert.ok(!friendsText.includes('LEA-4821'));
    assert.equal(await page.locator('#fr-new').getAttribute('placeholder'), 'Nom de ton ami');
    const state = await page.evaluate(() => JSON.parse(JSON.stringify(SAVE)));
    assert.equal(state.fid, 'LEA-4821'); assert.equal(state.acct.u, 'Lea');
    assert.deepEqual(state.friends, [{ id: 'AMI-1234', name: 'Ami' }]);
    assert.equal(state.groups[0].owner, state.fid); assert.equal(state.groups[0].members[0].id, state.fid);
    console.log('Chromium: account name edit, chosen-name friend UI and stable friend/group identities passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
