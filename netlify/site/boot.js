/* Wild Kart : démarrage (fichier séparé pour la politique de sécurité) */
window.TK_BUILD = 'pwa';
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
