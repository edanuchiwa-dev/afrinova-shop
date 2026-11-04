# 📐 Architecture Technique & Conventions — E-Commerce Pro

Document de référence technique commun pour **Antigravity**, **Cline** et **Hermes**.

---

## 1. Stack Technique

* **Framework Full-Stack** : Next.js 16+ (App Router, Server Components & Client Components).
* **Langage** : TypeScript.
* **Base de données** : SQLite local avec `better-sqlite3` (fichier `data/store.db`), mode WAL activé pour les accès concurrents.
* **Style & UI** : CSS moderne pur avec variables CSS (Design System style Shopify Polaris dans `src/styles/globals.css`). Pas de Tailwind imposé.
* **Icons** : `lucide-react`.
* **Notifications** : Protocole Ntfy (`https://ntfy.sh/<topic>`) pour alertes push smartphone instantanées + Nodemailer pour emails.

---

## 2. Modèles de Données (Base SQLite)

### Table `products`
```sql
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Général',
  image_url TEXT,
  weight_kg REAL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'draft' | 'archived'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table `orders`
```sql
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL, -- Format: CMD-YYYYMMDD-XXXX
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'France',
  carrier TEXT NOT NULL DEFAULT 'Colissimo',
  total_price REAL NOT NULL,
  shipping_cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'nouvelle', -- 'nouvelle' | 'en_preparation' | 'expediee' | 'livree' | 'annulee'
  tracking_number TEXT DEFAULT '',
  customer_notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table `order_items`
```sql
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### Table `settings`
```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## 3. Contrats d'API

### `GET /api/products`
* Paramètres optionnels : `?category=...&search=...`
* Réponse : `Array<Product>`

### `POST /api/orders`
* Corps :
  ```json
  {
    "customerName": "Nom Prénom",
    "customerEmail": "email@example.com",
    "customerPhone": "0601020304",
    "shippingAddress": "10 Rue Royale",
    "shippingCity": "Paris",
    "shippingPostalCode": "75001",
    "carrier": "standard | express | relais",
    "customerNotes": "Optionnel",
    "items": [
      { "id": 1, "name": "Produit", "price": 49.90, "quantity": 1 }
    ]
  }
  ```
* Réponse : `{ "success": true, "orderNumber": "CMD-20261024-1234", "totalPrice": 54.80 }`
* Action interne : Décrémenter les stocks et déclencher l'alerte smartphone push immédiatement.

### `PATCH /api/admin/orders`
* Corps : `{ "id": 1, "status": "expediee", "tracking_number": "6A123456789" }`

---

## 4. Règles de Code & Bonnes Pratiques
* **Syntaxe SQL** : En SQLite, toujours utiliser les guillemets simples `'` pour les valeurs chaînes (ex: `WHERE status = 'active'`). Les guillemets doubles `"` désignent les colonnes.
* **Composants Client** : Ajouter impérativement `'use client';` en première ligne de tout fichier React utilisant des hooks (`useState`, `useEffect`, `useCart`).
* **Conventions de nommage** : CamelCase pour les composants React (`ProductCard.tsx`), kebab-case pour les routes et dossiers (`produit/[slug]`).
