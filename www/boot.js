/* Wild Kart (appli) : démarrage */
window.TK_BUILD = 'pwa';
window.TK_APP = true;
document.documentElement.classList.add('app');
// mises à jour sans réinstaller : si internet marche, l'appli ouvre le jeu à jour sur le site.
// La première fois, les données de ce téléphone (amis, code, kart…) sont emportées avec.
(function () {
  var SITE = 'https://wild-kart-moutmout.netlify.app/';
  if (location.hostname !== 'localhost' || /[?&]local=1/.test(location.search)) return;
  var done = false, t = setTimeout(function () { done = true; }, 4000);
  fetch(SITE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function () {
    if (done) return; clearTimeout(t); var data = null, mig = null;
    try { data = localStorage.getItem('tiltkart.v1'); mig = localStorage.getItem('wk-migre'); localStorage.setItem('wk-migre', '1'); } catch (e) { /* rien */ }
    var imp = data && !mig ? '#import=' + encodeURIComponent(btoa(unescape(encodeURIComponent(data)))) : '';
    location.replace(SITE + '?app=1' + imp);
  }).catch(function () { /* pas d'internet : on joue avec la version de l'appli */ });
})();
