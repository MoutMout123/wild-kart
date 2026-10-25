/* Wild Kart (appli) : démarrage */
window.TK_BUILD = 'pwa';
window.TK_APP = true;
document.documentElement.classList.add('app');
// mises à jour sans réinstaller : si internet marche, l'appli ouvre le jeu à jour sur le site.
// La première fois, les données de ce téléphone (amis, code, kart…) sont emportées avec.
(function () {
  var SITE = 'https://moutmout123.github.io/wild-kart-jeu/', OLD = 'https://wild-kart-moutmout.netlify.app/';
  if (location.hostname !== 'localhost' || /[?&]local=1/.test(location.search)) return;
  var gone = false;
  function go() { if (gone) return; gone = true; var data = null, first = false;
    try { data = localStorage.getItem('tiltkart.v1'); first = !localStorage.getItem('wk-migre3'); localStorage.setItem('wk-migre3', '1'); } catch (e) { /* rien */ }
    var imp = data && first ? '#import=' + encodeURIComponent(btoa(unescape(encodeURIComponent(data)))) : '';
    location.replace((first ? OLD : SITE) + '?app=1' + imp); }
  function test(cb) { var done = false, t = setTimeout(function () { if (!done) { done = true; cb(false); } }, 15000);
    fetch(SITE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { if (!done) { done = true; clearTimeout(t); cb(!!(j && j.v)); } }).catch(function () { if (!done) { done = true; clearTimeout(t); cb(false); } }); }
  // version installée = copie de secours (sans internet) : on le dit, et on passe à la version à jour dès que possible
  function banner() { if (document.getElementById('wk-local')) return; var d = document.createElement('div'); d.id = 'wk-local';
    d.style.cssText = 'position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:9999;background:#17143a;color:#fff;border:2px solid #ffc531;border-radius:12px;padding:8px 12px;font:600 14px system-ui;display:flex;gap:10px;align-items:center';
    d.innerHTML = '<span>Version hors ligne (ancienne)</span><button style="font:800 14px system-ui;background:#ff4f3a;color:#fff;border:0;border-radius:8px;padding:6px 10px">Charger la version à jour</button>';
    d.querySelector('button').onclick = function () { d.querySelector('span').textContent = 'Connexion…'; test(function (ok) { if (ok) go(); else d.querySelector('span').textContent = 'Pas d’internet pour l’instant'; }); };
    (document.body || document.documentElement).appendChild(d); }
  test(function (ok) { if (ok) return go(); window.TK_LOCAL = true; if (document.body) banner(); else window.addEventListener('DOMContentLoaded', banner);
    var tries = 0, iv = setInterval(function () { if (gone || ++tries > 20) return clearInterval(iv); test(function (ok2) { if (ok2 && !(window.__TK && __TK.G && __TK.G.race && __TK.G.race.state !== 'attract')) go(); }); }, 30000); });
})();
