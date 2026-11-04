# 🚀 Guide de Déploiement 100% Gratuit — Vercel + Turso (0 € / Aucun Abonnement)

Ce guide détaille pas-à-pas comment mettre votre boutique **Atelier Pro** en ligne gratuitement à vie avec :
1. **Turso** : Base de données SQLite persistante dans le cloud (Plan gratuit : 500 bases, 5 Go de stockage, 1 milliard de requêtes).
2. **Vercel** : Hébergement Next.js ultra rapide avec HTTPS/SSL automatique et nom de domaine gratuit (`.vercel.app`).

---

## 📋 Étape 1 : Créer votre base de données Turso Cloud (2 minutes)

La commande `turso` est déjà installée sur votre machine dans `~/.turso/turso`.

1. **Connectez-vous à Turso** (via votre compte GitHub) :
   ```bash
   ~/.turso/turso auth signup
   # (ou ~/.turso/turso auth login si vous avez déjà un compte)
   ```
   *Une page web va s'ouvrir dans votre navigateur pour valider la connexion en 1 clic.*

2. **Créez votre base de données gratuite** :
   ```bash
   ~/.turso/turso db create atelier-pro
   ```

3. **Injectez vos produits et données de la boutique dans Turso** :
   ```bash
   cd /home/killer7/Projets/ecommerce-team
   ~/.turso/turso db shell atelier-pro < turso-seed.sql
   ```

4. **Récupérez vos 2 identifiants Turso** :
   * **URL de la base** :
     ```bash
     ~/.turso/turso db show atelier-pro --url
     ```
     *(Exemple : `libsql://atelier-pro-votrecompte.turso.io`)*

   * **Token d'authentification** :
     ```bash
     ~/.turso/turso db tokens create atelier-pro
     ```
     *(Copiez la longue chaîne de caractères générée)*

---

## 🐙 Étape 2 : Publier votre code sur GitHub (1 minute)

1. Rendez-vous sur [github.com/new](https://github.com/new) et créez un nouveau dépôt (par exemple nommé `ecommerce-team`).
2. Dans votre terminal, reliez votre dépôt local et poussez le code :
   ```bash
   cd /home/killer7/Projets/ecommerce-team
   git remote add origin https://github.com/<votre-pseudo-github>/ecommerce-team.git
   git push -u origin main
   ```

---

## ⚡ Étape 3 : Déployer sur Vercel (1 minute)

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous avec votre compte GitHub (gratuit).
2. Cliquez sur le bouton **"Add New..."** puis **"Project"**.
3. Sélectionnez le dépôt `ecommerce-team` que vous venez de pousser.
4. Dans la section **Environment Variables**, ajoutez les variables suivantes :

| Clé | Valeur | Description |
| :--- | :--- | :--- |
| `TURSO_DATABASE_URL` | `libsql://atelier-pro-xxx.turso.io` | URL obtenue à l'étape 1 |
| `TURSO_AUTH_TOKEN` | `eyJ...` | Token obtenu à l'étape 1 |
| `ADMIN_PASSWORD` | `votre_mot_de_passe` | Mot de passe pour accéder à `/admin` |
| `ADMIN_SESSION_SECRET` | `secret_aleatoire_32_caracteres` | Clé pour sécuriser les cookies de session |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | `01XXXXXXXX` | Votre numéro WhatsApp de vente |
| `NTFY_TOPIC` | `mon-atelier-alertes-xxx` | Sujet pour les alertes smartphone push |

5. Cliquez sur **Deploy** !
6. En moins de 60 secondes, Vercel compile et publie votre site avec un lien public direct en HTTPS (ex: `https://ecommerce-team.vercel.app`).

---

## 🧪 Vérification

* **Vitrine** : `https://votre-boutique.vercel.app`
* **Fiche produit** : `https://votre-boutique.vercel.app/produit/montre-chronographe`
* **Administration** : `https://votre-boutique.vercel.app/admin`
* **Suivi de colis** : `https://votre-boutique.vercel.app/suivi`
