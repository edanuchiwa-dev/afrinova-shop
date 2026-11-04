# Mission Brief pour Hermes Agent — Lead Backend & Data ⚙️

Bonjour Hermes ! La direction visuelle et fonctionnelle a été **officiellement validée** par le client.

## Spécifications Backend Validées :
1. **Base de données SQLite (`src/lib/db.ts`)** :
   * Tables `products`, `orders`, `order_items`, `settings` (conformes à `ARCHITECTURE.md`).
   * Attention : en SQL SQLite, toujours utiliser les apostrophes simples `'` pour les chaînes de caractères (ex: `WHERE status = 'active'`).
2. **Routes API (`src/app/api/`)** :
   * `POST /api/orders` : réception de la commande directe (Option 2), décrémentation des stocks physiques dans une transaction, génération du numéro de commande `CMD-YYYYMMDD-XXXX`.
   * Déclenchement immédiat de l'alerte smartphone push via `https://ntfy.sh/<topic>`.
   * `GET /api/products` : catalogue avec filtres.
   * `PATCH /api/admin/orders` : mise à jour des statuts et numéros de suivi Colissimo.

Consulte [`TASKS_BOARD.md`](./TASKS_BOARD.md) et lance la Phase 1 et 2 !
