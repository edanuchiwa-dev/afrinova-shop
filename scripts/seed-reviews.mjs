#!/usr/bin/env node

/**
 * Script de peuplement des avis clients généraux de la vitrine (Storefront Social Proof)
 * - Avis généraux sur la boutique Atelier Pro (qualité, livraison, paiement cash, service)
 * - Format strict : 1 ligne max par avis
 * - Zéro point d'exclamation
 * - Ton sobre, authentique et humain
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'store.db');

const db = new Database(dbPath);

const generalReviews = [
  {
    product_id: null,
    rating: 5,
    customer_name: 'Arnaud D.',
    city: 'Cotonou',
    comment: 'Articles bien finis et conformes aux photos, livraison rapide sur Cotonou.',
    created_at: '2026-11-02 14:20:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Boris K.',
    city: 'Abomey-Calavi',
    comment: 'Le coursier m\'a laissé ouvrir le colis pour vérifier avant de régler en espèces.',
    created_at: '2026-10-31 11:45:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Chantal A.',
    city: 'Porto-Novo',
    comment: 'Commande reçue le lendemain à Porto-Novo dans un emballage très propre.',
    created_at: '2026-10-28 16:30:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 4,
    customer_name: 'Hermann T.',
    city: 'Cotonou',
    comment: 'Boutique sérieuse, juste un petit retard de livraison dû aux embouteillages.',
    created_at: '2026-10-24 18:10:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Ulrich S.',
    city: 'Parakou',
    comment: 'Expédition sécurisée jusqu\'à Parakou, colis bien protégé et intact.',
    created_at: '2026-10-20 09:30:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Serge G.',
    city: 'Cotonou',
    comment: 'Très bonne sélection de produits, le service client WhatsApp répond vite.',
    created_at: '2026-10-18 17:15:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Gildas A.',
    city: 'Abomey-Calavi',
    comment: 'Paiement à la livraison sans prise de tête, commande traitée en quelques heures.',
    created_at: '2026-10-14 15:40:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Gloria M.',
    city: 'Cotonou',
    comment: 'Deuxième commande chez Atelier Pro et toujours aussi satisfaite de la qualité.',
    created_at: '2026-10-10 12:20:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 4,
    customer_name: 'Wilfried B.',
    city: 'Porto-Novo',
    comment: 'Articles solides et bien présentés, commerçant courtois au téléphone.',
    created_at: '2026-10-06 10:05:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Blandine T.',
    city: 'Ouidah',
    comment: 'Livraison soignée jusqu\'à Ouidah, échange fluide avec le service commercial.',
    created_at: '2026-10-02 14:50:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Lionel K.',
    city: 'Cotonou',
    comment: 'Achat en ligne simple et sans carte bancaire, je recommande cette boutique.',
    created_at: '2026-09-28 20:30:00',
    status: 'approuve'
  },
  {
    product_id: null,
    rating: 5,
    customer_name: 'Aimé H.',
    city: 'Cotonou',
    comment: 'Qualité au rendez-vous et respect des délais annoncés.',
    created_at: '2026-09-24 15:50:00',
    status: 'approuve'
  }
];

// Purge des avis et réinsertion des avis généraux de la vitrine
db.prepare('DELETE FROM reviews').run();

const insert = db.prepare(`
  INSERT INTO reviews (product_id, rating, customer_name, city, comment, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((reviews) => {
  for (const r of reviews) {
    insert.run(r.product_id, r.rating, r.customer_name, r.city, r.comment, r.status, r.created_at);
  }
});

insertMany(generalReviews);
console.log(`[SEED-REVIEWS] ✅ ${generalReviews.length} avis généraux de vitrine insérés avec succès.`);
