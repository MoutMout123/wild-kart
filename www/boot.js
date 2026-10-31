/* Wild Kart (appli) : démarrage */
window.TK_BUILD = 'pwa';
window.TK_APP = true;
document.documentElement.classList.add('app');
// mises à jour sans réinstaller : si internet marche, l'appli ouvre le jeu à jour sur le site.
// La première fois, les données de ce téléphone (amis, code, kart…) sont emportées avec.
(function () {
  var SITE = 'https://moutmout123.github.io/wild-kart-public/';
  if (location.hostname !== 'localhost' || /[?&]local=1/.test(location.search)) return;
  var done = false, t = setTimeout(function () { done = true; }, 5000);
  fetch(SITE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
    if (done || !j || !j.v) return; clearTimeout(t); var data = null, first = false;
    try { data = localStorage.getItem('tiltkart.v1'); first = !localStorage.getItem('wk-migre3'); localStorage.setItem('wk-migre3', '1'); } catch (e) { /* rien */ }
    var imp = data && first ? '#import=' + encodeURIComponent(btoa(unescape(encodeURIComponent(data)))) : '';
    // Nouvelle adresse publique (même origine moutmout123.github.io que l'ancienne : les données déjà enregistrées sur le site sont conservées).
    // L'ancienne page Netlify renvoyait vers l'adresse fermée : on n'y passe plus.
    location.replace(SITE + '?app=1' + imp);
  }).catch(function () { /* pas d'internet ou site indisponible : on joue avec la version de l'appli */ });
})();
