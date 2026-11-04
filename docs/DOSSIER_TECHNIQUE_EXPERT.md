# 📑 Dossier Technique & Fonctionnel — E-Commerce Pro ("Shopify Personnel")

**Document de présentation pour revue d'expert**  
*Date de rédaction : 25 Octobre 2026*  
*Projet : Plateforme e-commerce sur mesure haute conversion & administration privée*  
*Dossier source : `/home/killer7/Projets/ecommerce-team`*

---

## 1. Vue d'Ensemble & Vision Produit

Ce projet a été conçu pour répondre à un besoin précis : **disposer d'un "Shopify personnel" indépendant**, sans abonnement mensuel récurrent, sans commission sur les ventes, et optimisé pour le **marketing direct** (publicités TikTok, Meta Ads, WhatsApp, influenceurs).

### Objectifs Clés
* **Zéro friction d'achat** : Remplacer le tunnel classique (Panier → Création de compte → Redirection bancaire → Validation) par un **achat express direct sur la fiche produit** (modèle *Cash on Delivery* / Paiement à la livraison ou confirmation téléphonique).
* **Vitesse & Réactivité** : Architecture Next.js compilée avec Turbopack pour un affichage instantané sur mobile.
* **Autonomie totale** : Hébergement des données en local (SQLite WAL) avec contrôle absolu des flux.
* **Système d'alertes en temps réel** : Notification smartphone push instantanée à chaque commande.

---

## 2. Architecture Technique & Choix Technologiques

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT BROWSER                        │
│   (Vitrine Mobile-First + Animations Tailwind CSS v4)       │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
               │ Fetch API                    │ SSR / RSC
               ▼                              │
┌─────────────────────────────────────────────────────────────┐
│                 NEXT.JS 16 (App Router)                     │
│  ├── / (Vitrine Storytelling & Catalogue)                   │
│  ├── /produit/[slug] (Fiche Produit Option 2 & Formulaire)   │
│  ├── /admin (Dashboard KPI, Commandes, Liens Ads)           │
│  └── /api/* (Routes REST TypeScript)                        │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
        better-sqlite3                 Push HTTP POST
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   SQLite (data/store.db)     │ │     Service Ntfy.sh        │
│   Mode WAL (Transactions)    │ │ (Alertes Push Smartphone)  │
└──────────────────────────────┘ └────────────────────────────┘
```

| Composant | Technologie | Justification |
| :--- | :--- | :--- |
| **Framework Full-Stack** | **Next.js 16** (React 19, TypeScript) | Utilisation de l'App Router pour le découplage des Server Components (SEO/perfs) et Client Components (interactions). |
| **Moteur de Build** | **Turbopack** | Temps de rafraîchissement sous la seconde (< 550ms). |
| **Design System & CSS** | **Tailwind CSS v4** + CSS pur | Modernité, accessibilité, zéro surcharge CSS superflue. Support natif de `prefers-reduced-motion`. |
| **Base de Données** | **SQLite** (`better-sqlite3`) | Mode **WAL (Write-Ahead Logging)** activé pour gérer les écritures et lectures concurrentes sans verrouillage. Zéro dépendance à un serveur SGBD externe pour la phase de test et staging. |
| **Système d'Alertes** | **ntfy.sh** (Push natif) | Alertes gratuites, instantanées et chiffrables sur iPhone/Android sans abonnement tiers. |
| **Gestion des Icônes** | `lucide-react` | Bibliothèque moderne d'icônes SVG légères et cohérentes. |

---

## 3. Méthodologie : Développement Multi-Agents Collaboratif

Le projet a été développé en synergie par une équipe de 3 agents spécialisés :

1. **@Antigravity (Lead Developer & Architecte)** :
   * Conception de l'architecture générale, configuration Next.js / Tailwind CSS v4.
   * Optimisation responsive Desktop & Mobile, pipeline de compilation et intégration finale.
2. **@Hermes (Lead Backend & Data)** :
   * Modélisation de la base SQLite (`src/lib/db.ts`).
   * Implémentation des routes d'API sécurisées (`/api/products`, `/api/orders`, `/api/admin/*`).
   * Moteur d'alertes instantanées smartphone (`src/lib/notifications.ts`).
3. **@Cline (Lead Frontend UI)** :
   * Conception et intégration de la **Fiche Produit interactive Option 2** (`src/app/produit/[slug]/page.tsx`).
   * Intégration des garanties réassurance (Livraison 48h, Garantie 2 ans, Antichoc).

---

## 4. Fonctionnalités Détaillées

### A. Vitrine & Parcours Client (`/`)
* **Bannière d'accueil interactive (Hero)** :
  * Animation dynamique en **machine à écrire** des arguments clés (`durables`, `uniques`, `garantis`).
  * Adaptation automatique pour les utilisateurs sensibles au mouvement (`prefers-reduced-motion`).
* **Séquence Storytelling** :
  * Texte de réassurance qui s'illumine progressivement à l'écran.
  * **Compteurs animés** synchronisés avec l'intersection de l'écran (`IntersectionObserver`) : heures d'expédition express, clients satisfaits, satisfaction client.
* **Catalogue dynamique 2 colonnes** :
  * Affichage des produits avec badges de disponibilité en temps réel (*"En stock"*, *"Reste X ex"*).
  * Navigation instantanée vers les pages produits dédiées.

### B. Fiche Produit "Option 2" & Tunnel Express (`/produit/[slug]`)
* **Achat direct sans panier intermédiaire** :
  * Le client consulte les photos et descriptifs, et trouve **directement sous le produit** les champs de livraison :
    * Nom & Prénom
    * Numéro de téléphone (obligatoire pour confirmation)
    * Adresse complète, code postal et ville
    * Choix du mode d'acheminement (Colissimo domicile 48h, Express 24h, Point Relais)
    * Note de livraison facultative
* **Barre d'action rapide persistante (Sticky Action Bar)** :
  * Bouton d'ancrage rapide toujours visible en bas de l'écran mobile pour scroller automatiquement au formulaire en 1 tap.
* **Contrôles de sécurité côté serveur** :
  * Les prix et totaux ne sont **jamais calculés par le navigateur** du client : l'API recalcule le total depuis SQLite pour empêcher toute falsification.
  * Décrémentation atomique des stocks lors de la commande.

### C. Espace d'Administration Privé (`/admin`)
* **Tableau de bord KPI** :
  * Visualisation du chiffre d'affaires cumulé, du nombre de commandes à traiter et de l'état des stocks.
* **Gestionnaire des Commandes en direct** :
  * Consultation détaillée de chaque commande (coordonnées client, articles commandés, adresse, date/heure).
  * Mise à jour du statut en 1 clic : `Nouvelle` → `En préparation` → `Expédiée` → `Livrée` → `Annulée`.
  * Saisie et enregistrement direct du **numéro de suivi de colis (tracking)** pour le transporteur.
* **Outil Marketing Publicitaire "1-Clic"** :
  * Bouton **« Copier le lien pour la pub »** à côté de chaque article : copie directement l'URL optimisée dans le presse-papier, prête à être intégrée dans les annonces Facebook Ads, TikTok Ads ou messages WhatsApp.

### D. Système de Notification Smartphone Push
* À la validation d'une commande par un client, le serveur déclenche un webhook vers `ntfy.sh`.
* L'administrateur reçoit une **notification push instantanée avec sonnerie** sur son smartphone avec le récapitulatif :
  * Numéro de commande, nom du client, numéro de téléphone, ville et montant total.

---

## 5. Schéma de la Base de Données (SQLite)

```sql
-- Produits
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Général',
  image_url TEXT,
  weight_kg REAL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active', -- active | draft | archived
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Commandes
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,    -- Format: CMD-YYYYMMDD-XXXX
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
  status TEXT NOT NULL DEFAULT 'nouvelle', -- nouvelle | en_preparation | expediee | livree | annulee
  tracking_number TEXT DEFAULT '',
  customer_notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lignes de commandes
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

---

## 6. Points Recommandés pour la Revue d'Expert

Voici les points spécifiques à soumettre à l'expert pour orienter ses retours :

1. **Sécurisation de l'Administration** :
   * L'accès actuel à `/admin` est direct. Recommandation : ajouter un middleware d'authentification (ex. NextAuth ou Basic Auth via cookie HTTP-Only).
2. **Stratégie d'Hébergement & Production** :
   * Deux choix possibles :
     * *Option A (PaaS / Serverless)* : Déploiement Vercel ou Netlify avec migration de SQLite vers une base distante serverless (Turso / LibSQL, Supabase ou Neon Postgres).
     * *Option B (VPS / Docker)* : Déploiement sur un petit VPS (Hetzner, OVH, DigitalOcean) avec Docker, conservant SQLite local en mode WAL pour une vitesse maximale et un coût quasi nul.
3. **Évolution vers le Paiement Bancaire (si souhaité)** :
   * Si vous souhaitez ultérieurement accepter la carte bancaire en complément du paiement à la livraison, l'architecture d'API (`/api/orders`) est déjà prête à accueillir un webhook Stripe ou PayPlug.
4. **Conformité & Légal** :
   * Ajout des mentions légales, politique de confidentialité RGPD et CGV adaptées au modèle de vente.
