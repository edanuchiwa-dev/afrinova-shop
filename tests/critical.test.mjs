import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Configurer une base temporaire dédiée pour les tests
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-test-'));
const testDbPath = path.join(testDir, 'test-store.db');
process.env.DATABASE_PATH = testDbPath;

const { parseBeninPhone } = await import('../src/lib/phone.ts');
const { calculateServerShippingCost } = await import('../src/lib/shipping.ts');
const {
  getDb,
  createOrder,
  updateOrderStatus,
  getProducts,
  closeDb,
  createPromotion,
  updatePromotion,
  getActivePromotionForProduct,
  listPromotions,
} = await import('../src/lib/db.ts');

describe('Suite de Tests Critiques — Atelier Pro Bénin', () => {
  before(() => {
    // Initialise la base SQLite de test
    getDb();
  });

  after(() => {
    closeDb();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. Validation et normalisation du téléphone béninois', () => {
    test('Accepte le format national 10 chiffres (préfixe 01)', () => {
      const res = parseBeninPhone('0197001122');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.normalized, '+2290197001122');
      assert.strictEqual(res.isOldFormat, false);
      assert.strictEqual(res.formatted, '+229 01 97 00 11 22');
    });

    test('Accepte le format international +229 avec 10 chiffres', () => {
      const res = parseBeninPhone('+229 01 97 00 11 22');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.normalized, '+2290197001122');
      assert.strictEqual(res.isOldFormat, false);
    });

    test('Tolère et convertit automatiquement l\'ancien format à 8 chiffres', () => {
      const res = parseBeninPhone('97001122');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.normalized, '+2290197001122');
      assert.strictEqual(res.isOldFormat, true);
      assert.match(res.message, /10 chiffres/);
    });

    test('Tolère l\'ancien format à 8 chiffres avec +229', () => {
      const res = parseBeninPhone('+22997001122');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.normalized, '+2290197001122');
      assert.strictEqual(res.isOldFormat, true);
    });

    test('Rejette les numéros non conformes (trop courts, trop longs, non numériques)', () => {
      assert.strictEqual(parseBeninPhone('12345').valid, false);
      assert.strictEqual(parseBeninPhone('01234567890123').valid, false);
      assert.strictEqual(parseBeninPhone('telephone').valid, false);
      assert.strictEqual(parseBeninPhone('').valid, false);
    });
  });

  describe('2. Calcul strict des frais de port et zones de livraison', () => {
    test('Zone Cotonou = 1 000 FCFA', () => {
      const cost = calculateServerShippingCost('Cotonou');
      assert.strictEqual(cost, 1000);
    });

    test('Zone Abomey-Calavi / Godomey = 1 500 FCFA', () => {
      assert.strictEqual(calculateServerShippingCost('Abomey-Calavi'), 1500);
      assert.strictEqual(calculateServerShippingCost('Godomey'), 1500);
    });

    test('Zone Porto-Novo / Sèmè-Kpodji / Ouidah = 2 000 FCFA', () => {
      assert.strictEqual(calculateServerShippingCost('Porto-Novo'), 2000);
      assert.strictEqual(calculateServerShippingCost('Sèmè-Kpodji'), 2000);
      assert.strictEqual(calculateServerShippingCost('Ouidah'), 2000);
    });

    test('Zone Intérieur (Parakou / Autres) = 3 000 FCFA', () => {
      assert.strictEqual(calculateServerShippingCost('Parakou'), 3000);
      assert.strictEqual(calculateServerShippingCost('Autre commune du Bénin'), 3000);
    });

    test('Retrait en point relais / boutique = 0 FCFA', () => {
      const cost = calculateServerShippingCost('Cotonou', 'Retrait en boutique / point relais (Cotonou)');
      assert.strictEqual(cost, 0);
    });
  });

  describe('3. Création atomique de commande & décrémentation de stock', () => {
    test('Crée une commande valide, calcule le total serveur et décrémente le stock', () => {
      const products = getProducts();
      const product = products[0]; // Montre Chronographe (18 900 FCFA, stock initial 12)
      const initialStock = product.stock;

      const orderResult = createOrder(
        {
          customerName: 'Kofi Mensah',
          customerPhone: '0197000001',
          shippingCity: 'Cotonou',
          neighborhood: 'Cadjehoun',
          landmark: 'Carrefour Étoile Rouge',
        },
        [{ id: product.id, quantity: 2 }]
      );

      assert.strictEqual(orderResult.success, true);
      assert.match(orderResult.orderNumber, /^CMD-\d{8}-\d{4}$/);
      assert.strictEqual(orderResult.shippingCost, 1000);
      // Total = 18 900 * 2 + 1000 = 38 800 FCFA
      assert.strictEqual(orderResult.totalPrice, 18900 * 2 + 1000);

      // Vérifier le stock en base
      const updatedProducts = getProducts();
      const updatedProduct = updatedProducts.find((p) => p.id === product.id);
      assert.strictEqual(updatedProduct.stock, initialStock - 2);
    });

    test('Empêche les stocks négatifs en cas de quantité supérieure au disponible', () => {
      const db = getDb();
      const products = getProducts();
      const product = products[1]; // Sacoche cuir
      // Mettre le stock temporairement à 2 pour tester le dépassement de stock (< max 10)
      db.prepare('UPDATE products SET stock = 2 WHERE id = ?').run(product.id);

      assert.throws(
        () => {
          createOrder(
            {
              customerName: 'Ablanvi Dossou',
              customerPhone: '0197000002',
              shippingCity: 'Abomey-Calavi',
              neighborhood: 'Zogbadjè',
              landmark: 'Entrée campus UAC',
            },
            [{ id: product.id, quantity: 3 }]
          );
        },
        /Stock insuffisant/
      );
    });

    test('Rejette les quantités nulles ou négatives', () => {
      const products = getProducts();
      const product = products[0];

      assert.throws(() => {
        createOrder(
          {
            customerName: 'Test Invalide',
            customerPhone: '0197000003',
            shippingCity: 'Cotonou',
            neighborhood: 'Haie Vive',
            landmark: 'Pharmacie Camp Guézo',
          },
          [{ id: product.id, quantity: 0 }]
        );
      }, /Produit ou quantité invalide/);
    });
  });

  describe('4. Machine à états et réintégration du stock lors d\'une annulation', () => {
    test('Transitions valides et réintégration de stock sur annulation', () => {
      const products = getProducts();
      const product = products[2]; // Casque Audio
      const stockBefore = product.stock;

      // 1. Passer la commande de 1 article
      const created = createOrder(
        {
          customerName: 'Sèna Hountondji',
          customerPhone: '0197000004',
          shippingCity: 'Porto-Novo',
          neighborhood: 'Ouando',
          landmark: 'Marché Ouando',
        },
        [{ id: product.id, quantity: 1 }]
      );

      const db = getDb();
      const order = db.prepare('SELECT id, status FROM orders WHERE order_number = ?').get(created.orderNumber);
      assert.strictEqual(order.status, 'nouvelle');

      // Stock décrémenté
      const productAfterOrder = getProducts().find((p) => p.id === product.id);
      assert.strictEqual(productAfterOrder.stock, stockBefore - 1);

      // 2. Transition autorisée nouvelle -> en_preparation
      const step1 = updateOrderStatus(order.id, 'en_preparation');
      assert.strictEqual(step1.status, 'en_preparation');

      // 3. Annulation de la commande -> Restockage automatique
      const cancelled = updateOrderStatus(order.id, 'annulee');
      assert.strictEqual(cancelled.status, 'annulee');

      // Stock doit être revenu à stockBefore
      const productAfterCancel = getProducts().find((p) => p.id === product.id);
      assert.strictEqual(productAfterCancel.stock, stockBefore);
    });

    test('Rejette les transitions non autorisées (retour en arrière ou après annulation)', () => {
      const products = getProducts();
      const product = products[3];

      const created = createOrder(
        {
          customerName: 'Bio Guerra',
          customerPhone: '0197000005',
          shippingCity: 'Parakou',
          neighborhood: 'Albarika',
          landmark: 'Mosquée Albarika',
        },
        [{ id: product.id, quantity: 1 }]
      );

      const db = getDb();
      const order = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(created.orderNumber);

      // Passage à livrée
      updateOrderStatus(order.id, 'en_preparation');
      updateOrderStatus(order.id, 'expediee');
      updateOrderStatus(order.id, 'livree');

      // Tentative de retour en arrière livree -> en_preparation ou livree -> nouvelle
      assert.throws(() => {
        updateOrderStatus(order.id, 'nouvelle');
      }, /Transition non autorisée/);

      assert.throws(() => {
        updateOrderStatus(order.id, 'annulee');
      }, /Transition non autorisée/);
    });
  });

  describe('5. Système de promotions à quota limité et refonte Checkout (20 tests obligatoires)', () => {
    let testProduct;
    let promo;

    before(() => {
      const db = getDb();
      // Création d'un produit dédié pour les tests de promotions
      const res = db.prepare(`
        INSERT INTO products (name, slug, description, price, stock, category, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        'Sac de Voyage Cuir Bénin',
        'sac-voyage-cuir-benin',
        'Pièce artisanale en cuir pleine fleur',
        6100, // Prix normal de référence: 6 100 FCFA
        40,   // Stock disponible: 40
        'Maroquinerie',
        null
      );
      testProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(res.lastInsertRowid);
    });

    // Test 1
    test('1. Commande normale sans promotion active (facturation au tarif normal)', () => {
      const orderRes = createOrder(
        {
          customerName: 'Koffi Paul',
          customerPhone: '0197000101',
          shippingCity: 'Cotonou',
        },
        [{ id: testProduct.id, quantity: 1 }]
      );
      assert.strictEqual(orderRes.success, true);
      // Prix unitaire = 6 100 FCFA, Frais port Cotonou = 1 000 FCFA -> Total = 7 100 FCFA
      assert.strictEqual(orderRes.totalPrice, 6100 + 1000);
      assert.strictEqual(orderRes.subtotal, 6100);
      assert.strictEqual(orderRes.savings, 0);
    });

    // Test 2
    test('2. Commande avec promotion active (1 unité facturée au prix promo et quota décrémenté)', () => {
      // Créer une promotion active: 4 900 FCFA au lieu de 6 100 FCFA, quota 10
      promo = createPromotion({
        product_id: testProduct.id,
        name: 'Offre Spéciale — Quantité Limitée',
        original_price: 6100,
        promo_price: 4900,
        total_quota: 10,
        status: 'active',
        show_remaining: 1,
      });

      assert.strictEqual(promo.consumed_quota, 0);
      assert.strictEqual(promo.promo_price, 4900);

      const orderRes = createOrder(
        {
          customerName: 'Ablanvi Chantal',
          customerPhone: '0197000102',
          shippingCity: 'Cotonou',
        },
        [{ id: testProduct.id, quantity: 1 }]
      );

      assert.strictEqual(orderRes.success, true);
      assert.strictEqual(orderRes.subtotal, 4900);
      assert.strictEqual(orderRes.savings, 1200);
      assert.strictEqual(orderRes.totalPrice, 4900 + 1000);

      const db = getDb();
      const updatedPromo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(promo.id);
      assert.strictEqual(updatedPromo.consumed_quota, 1);
    });

    // Test 3
    test('3. Calcul exact de la réduction en FCFA et du pourcentage d\'économie', () => {
      const montantEconomise = promo.original_price - promo.promo_price;
      assert.strictEqual(montantEconomise, 1200); // 6 100 - 4 900 = 1 200 FCFA
      const pourcentage = Math.round((montantEconomise / promo.original_price) * 100);
      assert.strictEqual(pourcentage, 20); // 1200 / 6100 = 19.67% -> 20%
    });

    // Test 4
    test('4. Quota promotionnel entièrement consommé en une commande unique', () => {
      const db = getDb();
      // Créer un produit avec un quota précis de 3
      const prodRes = db.prepare(`
        INSERT INTO products (name, slug, description, price, stock, category, status)
        VALUES ('Montre Or Bénin', 'montre-or-benin', 'Test', 10000, 10, 'Montres', 'active')
      `).run();
      const prodId = prodRes.lastInsertRowid;

      const fastPromo = createPromotion({
        product_id: prodId,
        name: 'Flash 3 pièces',
        original_price: 10000,
        promo_price: 7500,
        total_quota: 3,
        status: 'active',
      });

      const orderRes = createOrder(
        {
          customerName: 'Gaston Dossou',
          customerPhone: '0197000103',
          shippingCity: 'Godomey',
        },
        [{ id: prodId, quantity: 3 }]
      );

      assert.strictEqual(orderRes.subtotal, 7500 * 3);
      assert.strictEqual(orderRes.savings, 2500 * 3);

      const checkPromo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(fastPromo.id);
      assert.strictEqual(checkPromo.consumed_quota, 3);
      assert.strictEqual(checkPromo.total_quota - checkPromo.consumed_quota, 0);
    });

    // Test 5
    test('5. Quota promotionnel consommé progressivement sur plusieurs commandes', () => {
      const db = getDb();
      const prodRes = db.prepare(`
        INSERT INTO products (name, slug, description, price, stock, category, status)
        VALUES ('Ceinture Cuir Bénin', 'ceinture-cuir-benin', 'Test', 8000, 15, 'Maroquinerie', 'active')
      `).run();
      const prodId = prodRes.lastInsertRowid;

      const p = createPromotion({
        product_id: prodId,
        name: 'Offre Progressif',
        original_price: 8000,
        promo_price: 6000,
        total_quota: 5,
        status: 'active',
      });

      // Commande 1: 2 unités
      createOrder(
        { customerName: 'Client 1', customerPhone: '0197000104', shippingCity: 'Cotonou' },
        [{ id: prodId, quantity: 2 }]
      );
      let cur = db.prepare('SELECT * FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(cur.consumed_quota, 2);

      // Commande 2: 2 unités
      createOrder(
        { customerName: 'Client 2', customerPhone: '0197000105', shippingCity: 'Cotonou' },
        [{ id: prodId, quantity: 2 }]
      );
      cur = db.prepare('SELECT * FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(cur.consumed_quota, 4);
      assert.strictEqual(cur.total_quota - cur.consumed_quota, 1);
    });

    // Test 6
    test('6. Split déterministe quand la quantité demandée dépasse le quota restant', () => {
      const db = getDb();
      // Il reste exactement 1 unité disponible dans la promotion du test 5 (total_quota=5, consumed=4)
      const p = db.prepare("SELECT * FROM promotions WHERE name = 'Offre Progressif'").get();
      assert.strictEqual(p.total_quota - p.consumed_quota, 1);

      // Le client commande 3 unités : 1 doit être facturée au prix promo (6 000 FCFA) et 2 au prix normal (8 000 FCFA)
      const splitOrder = createOrder(
        { customerName: 'Client Split', customerPhone: '0197000106', shippingCity: 'Porto-Novo' },
        [{ id: p.product_id, quantity: 3 }]
      );

      // Subtotal = 1 * 6000 + 2 * 8000 = 22 000 FCFA
      assert.strictEqual(splitOrder.subtotal, 6000 + 8000 * 2);
      assert.strictEqual(splitOrder.savings, 2000); // 1 unité économise 2000 FCFA

      // Vérifier les lignes order_items
      const order = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(splitOrder.orderNumber);
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
      assert.strictEqual(items.length, 2);
      assert.strictEqual(items[0].quantity, 1);
      assert.strictEqual(items[0].product_price, 6000);
      assert.strictEqual(items[0].promo_id, p.id);
      assert.strictEqual(items[1].quantity, 2);
      assert.strictEqual(items[1].product_price, 8000);
      assert.strictEqual(items[1].promo_id, null);

      // Le quota est désormais entièrement consommé (5 / 5)
      const updatedP = db.prepare('SELECT * FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(updatedP.consumed_quota, 5);
    });

    // Test 7
    test('7. Bascule automatique sur le prix normal dès que le quota est épuisé', () => {
      const db = getDb();
      const p = db.prepare("SELECT * FROM promotions WHERE name = 'Offre Progressif'").get();
      assert.strictEqual(p.consumed_quota, p.total_quota);

      // Nouvelle commande : le quota étant épuisé, facturation 100% au prix normal sans promo
      const nextOrder = createOrder(
        { customerName: 'Client Suivant', customerPhone: '0197000107', shippingCity: 'Cotonou' },
        [{ id: p.product_id, quantity: 2 }]
      );

      assert.strictEqual(nextOrder.subtotal, 8000 * 2);
      assert.strictEqual(nextOrder.savings, 0);

      // Le quota consommé ne dépasse toujours pas 5
      const checkP = db.prepare('SELECT * FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(checkP.consumed_quota, 5);
    });

    // Test 8
    test('8. Promotion au statut "draft" : prix normal appliqué', () => {
      const db = getDb();
      const pRes = db.prepare(`
        INSERT INTO products (name, slug, description, price, stock, category, status)
        VALUES ('Article Draft', 'article-draft', 'Test', 6100, 10, 'Test', 'active')
      `).run();
      const draftProdId = pRes.lastInsertRowid;

      const draftPromo = createPromotion({
        product_id: draftProdId,
        name: 'Brouillon Promo',
        original_price: 6100,
        promo_price: 4000,
        total_quota: 5,
        status: 'draft',
      });

      const orderRes = createOrder(
        { customerName: 'Test Draft', customerPhone: '0197000108', shippingCity: 'Cotonou' },
        [{ id: draftProdId, quantity: 1 }]
      );

      // Prix normal (6 100 FCFA) appliqué car la promo est un brouillon
      assert.strictEqual(orderRes.subtotal, 6100);
      const checkDraft = db.prepare('SELECT consumed_quota FROM promotions WHERE id = ?').get(draftPromo.id);
      assert.strictEqual(checkDraft.consumed_quota, 0);
    });

    // Test 9
    test('9. Promotion au statut "paused" : prix normal appliqué', () => {
      const db = getDb();
      const pRes = db.prepare(`
        INSERT INTO products (name, slug, description, price, stock, category, status)
        VALUES ('Article Paused', 'article-paused', 'Test', 6100, 10, 'Test', 'active')
      `).run();
      const pausedProdId = pRes.lastInsertRowid;

      createPromotion({
        product_id: pausedProdId,
        name: 'Promo En Pause',
        original_price: 6100,
        promo_price: 4500,
        total_quota: 5,
        status: 'paused',
      });

      const orderRes = createOrder(
        { customerName: 'Test Paused', customerPhone: '0197000109', shippingCity: 'Cotonou' },
        [{ id: pausedProdId, quantity: 1 }]
      );

      assert.strictEqual(orderRes.subtotal, 6100);
    });

    // Test 10
    test('10. Promotion au statut "ended" : prix normal appliqué', () => {
      const db = getDb();
      const pRes = db.prepare(`
        INSERT INTO products (name, slug, description, price, stock, category, status)
        VALUES ('Article Ended', 'article-ended', 'Test', 6100, 10, 'Test', 'active')
      `).run();
      const endedProdId = pRes.lastInsertRowid;

      createPromotion({
        product_id: endedProdId,
        name: 'Promo Clôturée',
        original_price: 6100,
        promo_price: 4500,
        total_quota: 5,
        status: 'ended',
      });

      const orderRes = createOrder(
        { customerName: 'Test Ended', customerPhone: '0197000110', shippingCity: 'Cotonou' },
        [{ id: endedProdId, quantity: 1 }]
      );

      assert.strictEqual(orderRes.subtotal, 6100);
    });

    // Test 11
    test('11. Promotion avec date de début future : non encore active', () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const futurePromo = createPromotion({
        product_id: testProduct.id,
        name: 'Promo Future',
        original_price: 6100,
        promo_price: 4200,
        total_quota: 5,
        start_date: futureDate,
        status: 'active',
      });

      const orderRes = createOrder(
        { customerName: 'Test Future', customerPhone: '0197000111', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 1 }]
      );

      assert.strictEqual(orderRes.subtotal, 6100);
    });

    // Test 12
    test('12. Promotion avec date de fin expirée (passée) : plus active', () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
      const expiredPromo = createPromotion({
        product_id: testProduct.id,
        name: 'Promo Expirée',
        original_price: 6100,
        promo_price: 4200,
        total_quota: 5,
        end_date: pastDate,
        status: 'active',
      });

      const orderRes = createOrder(
        { customerName: 'Test Expired', customerPhone: '0197000112', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 1 }]
      );

      assert.strictEqual(orderRes.subtotal, 6100);
    });

    // Test 13
    test('13. Promotion active dans sa fenêtre temporelle : tarif appliqué', () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date(Date.now() + 86400000).toISOString();

      const validPromo = createPromotion({
        product_id: testProduct.id,
        name: 'Promo Valid Window',
        original_price: 6100,
        promo_price: 4800,
        total_quota: 5,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
      });

      const orderRes = createOrder(
        { customerName: 'Test Window', customerPhone: '0197000113', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 1 }]
      );

      assert.strictEqual(orderRes.subtotal, 4800);
      assert.strictEqual(orderRes.savings, 1300);
    });

    // Test 14
    test('14. Plafonnement strict : le quota promo ne peut pas dépasser le stock physique', () => {
      const db = getDb();
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProduct.id);

      assert.throws(() => {
        createPromotion({
          product_id: testProduct.id,
          name: 'Promo Trop Grande',
          original_price: 6100,
          promo_price: 4500,
          total_quota: product.stock + 100, // Supérieur au stock
          status: 'active',
        });
      }, /ne peut pas dépasser le stock physique/);
    });

    // Test 15
    test('15. Annulation de commande et restitution exacte du quota promotionnel', () => {
      const db = getDb();
      const p = createPromotion({
        product_id: testProduct.id,
        name: 'Promo Restitution',
        original_price: 6100,
        promo_price: 4500,
        total_quota: 5,
        status: 'active',
      });

      assert.strictEqual(p.consumed_quota, 0);

      // Commande de 1 unité
      const order = createOrder(
        { customerName: 'Test Annul', customerPhone: '0197000115', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 1 }]
      );

      let cur = db.prepare('SELECT consumed_quota FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(cur.consumed_quota, 1);

      // Annulation de la commande
      const dbOrder = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(order.orderNumber);
      updateOrderStatus(dbOrder.id, 'annulee');

      // Le quota consommé doit être revenu à 0 !
      cur = db.prepare('SELECT consumed_quota FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(cur.consumed_quota, 0);
    });

    // Test 16
    test('16. Annulation d\'une commande avec split : restitution du quota promo et du stock total', () => {
      const db = getDb();
      const p = createPromotion({
        product_id: testProduct.id,
        name: 'Promo Split Restitution',
        original_price: 6100,
        promo_price: 4500,
        total_quota: 2,
        status: 'active',
      });

      const prodBefore = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProduct.id);

      // Commande de 3 unités (2 promo + 1 normale)
      const order = createOrder(
        { customerName: 'Test Split Annul', customerPhone: '0197000116', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 3 }]
      );

      let curPromo = db.prepare('SELECT consumed_quota FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(curPromo.consumed_quota, 2);

      let curProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProduct.id);
      assert.strictEqual(curProd.stock, prodBefore.stock - 3);

      // Annulation de la commande
      const dbOrder = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(order.orderNumber);
      updateOrderStatus(dbOrder.id, 'annulee');

      // Restitution intégrale vérifiée
      curPromo = db.prepare('SELECT consumed_quota FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(curPromo.consumed_quota, 0);

      curProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(testProduct.id);
      assert.strictEqual(curProd.stock, prodBefore.stock);
    });

    // Test 17
    test('17. Atomicité SQLite et prévention de surconsommation du quota', () => {
      const db = getDb();
      const p = createPromotion({
        product_id: testProduct.id,
        name: 'Promo Atomique',
        original_price: 6100,
        promo_price: 4000,
        total_quota: 2,
        status: 'active',
      });

      // Commande 1 : 2 unités -> consomme tout le quota
      createOrder(
        { customerName: 'Atom 1', customerPhone: '0197000117', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 2 }]
      );

      // Commande 2 : 2 unités -> le quota étant à 0, elles passent en tarif normal, quota reste à 2
      const res2 = createOrder(
        { customerName: 'Atom 2', customerPhone: '0197000118', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 2 }]
      );

      assert.strictEqual(res2.subtotal, 6100 * 2);
      const cur = db.prepare('SELECT consumed_quota FROM promotions WHERE id = ?').get(p.id);
      assert.strictEqual(cur.consumed_quota, 2); // Jamais de dépassement
    });

    // Test 18
    test('18. Formulaire ultra-simplifié : commande acceptée avec UNIQUEMENT les 3 champs (nom, tél, ville)', () => {
      const order = createOrder(
        {
          customerName: 'Ablanvi Dossou',
          customerPhone: '0197000119',
          shippingCity: 'Abomey-Calavi',
          // Ni quartier, ni repère, ni adresse, ni notes
        },
        [{ id: testProduct.id, quantity: 1 }]
      );

      assert.strictEqual(order.success, true);
      assert.match(order.orderNumber, /^CMD-\d{8}-\d{4}$/);
      assert.strictEqual(order.shippingCost, 1500); // Calavi = 1500 FCFA

      const db = getDb();
      const saved = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(order.orderNumber);
      assert.strictEqual(saved.customer_name, 'Ablanvi Dossou');
      assert.strictEqual(saved.shipping_city, 'Abomey-Calavi');
    });

    // Test 19
    test('19. Tolérance et normalisation des numéros béninois avec espaces et indicatifs', () => {
      const orderWithSpaces = createOrder(
        {
          customerName: 'Sèna Bio',
          customerPhone: ' +229 01 97 00 11 22 ', // Espaces multiples et +229
          shippingCity: 'Cotonou',
        },
        [{ id: testProduct.id, quantity: 1 }]
      );

      assert.strictEqual(orderWithSpaces.normalizedPhone, '+2290197001122');
    });

    // Test 20
    test('20. Recalcul automatique et strict des frais de livraison selon la commune sélectionnée', () => {
      const orderCotonou = createOrder(
        { customerName: 'Client Cotonou', customerPhone: '0197000120', shippingCity: 'Cotonou' },
        [{ id: testProduct.id, quantity: 1 }]
      );
      assert.strictEqual(orderCotonou.shippingCost, 1000);

      const orderCalavi = createOrder(
        { customerName: 'Client Calavi', customerPhone: '0197000121', shippingCity: 'Abomey-Calavi' },
        [{ id: testProduct.id, quantity: 1 }]
      );
      assert.strictEqual(orderCalavi.shippingCost, 1500);

      const orderPorto = createOrder(
        { customerName: 'Client Porto', customerPhone: '0197000122', shippingCity: 'Porto-Novo' },
        [{ id: testProduct.id, quantity: 1 }]
      );
      assert.strictEqual(orderPorto.shippingCost, 2000);

      const orderParakou = createOrder(
        { customerName: 'Client Parakou', customerPhone: '0197000123', shippingCity: 'Parakou' },
        [{ id: testProduct.id, quantity: 1 }]
      );
      assert.strictEqual(orderParakou.shippingCost, 3000);

      const orderAutre = createOrder(
        { customerName: 'Client Autre', customerPhone: '0197000124', shippingCity: 'Autre commune du Bénin' },
        [{ id: testProduct.id, quantity: 1 }]
      );
      assert.strictEqual(orderAutre.shippingCost, 3000);
    });
  });
});
