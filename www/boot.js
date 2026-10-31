/* Wild Kart (appli) : démarrage */
window.TK_BUILD = 'pwa';
window.TK_APP = true;
document.documentElement.classList.add('app');
// mises à jour sans réinstaller : si internet marche, l'appli ouvre le jeu à jour sur le site.
// La première fois, les données de ce téléphone (amis, code, kart…) sont emportées avec.
// Écran d'attente au logo officiel pendant la vérification du site : sans lui, l'ancienne version embarquée démarrait
// (ancien écran de chargement) puis la page était remplacée par le site et sa propre animation (deux chargements enchaînés).
var WKA = null;
function wkAttente(on) {
  try {
    if (on && !WKA) { WKA = document.createElement('div'); WKA.id = 'wk-attente';
      WKA.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:#01051a;display:flex;align-items:center;justify-content:center');
      WKA.innerHTML = '<img src="icon-512.png" alt="Wild Kart" style="width:min(56vh,56vw);height:auto">'; (document.body || document.documentElement).appendChild(WKA); }
    else if (!on && WKA) { WKA.parentNode.removeChild(WKA); WKA = null; }
  } catch (e) { /* rien */ }
}
// Version embarquée (repli hors ligne) : chargée seulement si le site ne répond pas. Chargée d'office, son initialisation
// (plusieurs secondes sur téléphone) bloquait la page : la réponse du site arrivait après le délai et l'appli restait sur l'ancienne version.
var wkLocal = false;
function wkJeuLocal() { if (wkLocal) return; wkLocal = true; wkAttente(false); var s = document.createElement('script'); s.src = 'game.js?v=da2663d0'; document.body.appendChild(s); }
(function () {
  var SITE = 'https://moutmout123.github.io/wild-kart-public/';
  if (location.hostname !== 'localhost' || /[?&]local=1/.test(location.search)) return wkJeuLocal();
  wkAttente(true);
  var done = false, t = setTimeout(function () { done = true; wkJeuLocal(); }, 6000);
  fetch(SITE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
    if (done || !j || !j.v) { wkJeuLocal(); return; } clearTimeout(t); var data = null, first = false;
    try { data = localStorage.getItem('tiltkart.v1'); first = !localStorage.getItem('wk-migre3'); localStorage.setItem('wk-migre3', '1'); } catch (e) { /* rien */ }
    var imp = data && first ? '#import=' + encodeURIComponent(btoa(unescape(encodeURIComponent(data)))) : '';
    // Nouvelle adresse publique (même origine moutmout123.github.io que l'ancienne : les données déjà enregistrées sur le site sont conservées).
    // L'ancienne page Netlify renvoyait vers l'adresse fermée : on n'y passe plus.
    location.replace(SITE + '?app=1' + imp);
  }).catch(function () { /* pas d'internet ou site indisponible : on joue avec la version de l'appli */ clearTimeout(t); done = true; wkJeuLocal(); });
})();
