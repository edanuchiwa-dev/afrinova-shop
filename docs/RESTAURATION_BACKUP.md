# 🔄 Guide de Restauration de la Base de Données SQLite

Ce document décrit la procédure pas-à-pas pour restaurer la base de données `data/store.db` à partir d'une sauvegarde située dans `data/backups/`.

---

## 1. Emplacement des Sauvegardes
* Les sauvegardes sont générées dans : `data/backups/store_YYYYMMDD_HHMMSS.db`.
* La rotation automatique conserve les **7 dernières sauvegardes**.

Pour lister les sauvegardes disponibles :
```bash
ls -lh data/backups/
```

---

## 2. Procédure de Restauration

### Étape 1 : Arrêter le serveur de l'application
Avant de remplacer le fichier de base de données, coupez le serveur Next.js pour éviter tout verrou SQLite actif :
```bash
# Si lancé via npm
pkill -f "next dev" || pkill -f "next start"
```

### Étape 2 : Vérifier l'intégrité de la sauvegarde
Avant de restaurer, assurez-vous que le fichier de sauvegarde sélectionné est intact :
```bash
sqlite3 data/backups/store_YYYYMMDD_HHMMSS.db "PRAGMA integrity_check;"
```
*(La commande doit afficher `ok`)*

### Étape 3 : Sauvegarder la base actuelle par sécurité
```bash
cp data/store.db data/store_avant_restauration.db
```

### Étape 4 : Remplacer la base de données
Supprimez les éventuels fichiers de journal WAL temporaires et remplacez `store.db` :
```bash
rm -f data/store.db-wal data/store.db-shm
cp data/backups/store_YYYYMMDD_HHMMSS.db data/store.db
```

### Étape 5 : Relancer le serveur
```bash
npm run dev
# ou en production : npm start
```

---

## 3. Automatisation des Sauvegardes (Cron Job recommandé)

Pour déclencher automatiquement une sauvegarde quotidienne à 3h du matin :
```bash
crontab -e
```
Ajoutez la ligne suivante :
```cron
0 3 * * * /bin/bash /home/killer7/Projets/ecommerce-team/scripts/backup-db.sh >> /home/killer7/Projets/ecommerce-team/data/backup.log 2>&1
```
