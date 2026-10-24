# Wild Kart

Projet de l'appli (Capacitor 8). À chaque envoi sur `main`, GitHub fabrique `wild-kart.apk`
(onglet **Releases**). Guide complet : `GUIDE-APPLI.txt`.

Une seule fois avant : Settings > Secrets and variables > Actions > New repository secret,
nom `KEYSTORE_PASSWORD`, valeur = un mot de passe à toi (garde-le).
La première fabrication crée `signing/wildkart.jks` (protégé par ce mot de passe) : ne pas le
supprimer, sinon les mises à jour ne s'installeront plus par-dessus l'ancienne version.
