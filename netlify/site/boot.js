/* Wild Kart : démarrage (fichier séparé pour la politique de sécurité) */
window.TK_BUILD = 'pwa';
window.TK_VER = 'd9acb7f4';
// ouvert depuis l'appli Android / iPhone (elle charge le site pour avoir les mises à jour)
try { if (/[?&]app=1/.test(location.search)) localStorage.setItem('wk-app', '1'); if (localStorage.getItem('wk-app')) { window.TK_APP = true; document.documentElement.classList.add('app'); } } catch (e) { /* rien */ }
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
