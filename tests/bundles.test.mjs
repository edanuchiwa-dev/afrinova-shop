import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getBundles, priceFor, BUNDLE_DISCOUNTS } from '../src/lib/bundles.ts';
import { getDb, createOrder, getProducts } from '../src/lib/db.ts';

describe('Système de Bundles (Offres de lots) — Atelier Pro / AFRINOVA SHOP', () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare('UPDATE products SET stock = 50 WHERE id = 1').run();
  });

  const sampleProduct = {
    id: 1,
    name: 'Montre Chronographe',
    slug: 'montre-chronographe',
    price: 18900,
    stock: 20,
  };

  test('1. Configuration lib/bundles : getBundles génère 3 offres cohérentes', () => {
    const bundles = getBundles(sampleProduct);
    assert.equal(bundles.length, 3);

    // Lot 1 : 1 article, prix normal
    assert.equal(bundles[0].id, 'x1');
    assert.equal(bundles[0].quantity, 1);
    assert.equal(bundles[0].price, 18900);
    assert.equal(bundles[0].comparePrice, 18900);
    assert.equal(bundles[0].badge, 'Standard');

    // Lot 2 : 2 articles, -10%, Le plus populaire
    assert.equal(bundles[1].id, 'x2');
    assert.equal(bundles[1].quantity, 2);
    assert.equal(bundles[1].comparePrice, 18900 * 2);
    assert.equal(bundles[1].price, Math.round(18900 * 2 * (1 - BUNDLE_DISCOUNTS.TIER_2)));
    assert.equal(bundles[1].tag, 'Le plus populaire');

    // Lot 3 : 3 articles, -15%, Meilleur choix
    assert.equal(bundles[2].id, 'x3');
    assert.equal(bundles[2].quantity, 3);
    assert.equal(bundles[2].comparePrice, 18900 * 3);
    assert.equal(bundles[2].price, Math.round(18900 * 3 * (1 - BUNDLE_DISCOUNTS.TIER_3)));
    assert.equal(bundles[2].tag, 'Meilleur choix');
  });

  test('2. Sécurité & Robustesse : getBundles sans produit ne plante pas', () => {
    const fallbackBundles = getBundles(null);
    assert.ok(Array.isArray(fallbackBundles));
    assert.equal(fallbackBundles.length, 3);
    assert.equal(fallbackBundles[1].id, 'x2');
  });

  test('3. Calcul de prix serveur : priceFor calcule strictement les prix', () => {
    assert.equal(priceFor(sampleProduct, 'x1'), 18900);
    assert.equal(priceFor(sampleProduct, 'x2'), Math.round(18900 * 2 * 0.90)); // 34 020
    assert.equal(priceFor(sampleProduct, 'x3'), Math.round(18900 * 3 * 0.85)); // 48 195
    // Fallback si bundle inconnu mais valide
    assert.equal(priceFor(sampleProduct, null), 18900);
  });

  test('4. Migration de schéma : vérification des colonnes bundle_style et bundle_id', () => {
    const db = getDb();
    const productCols = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
    assert.ok(productCols.includes('bundle_style'), 'products doit contenir bundle_style');

    const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
    assert.ok(orderCols.includes('bundle_id'), 'orders doit contenir bundle_id');
    assert.ok(orderCols.includes('quantity'), 'orders doit contenir quantity');
    assert.ok(orderCols.includes('total_price'), 'orders doit contenir total_price');
  });

  test('5. Commande complète Lot 1 (x1) : enregistrement exact en base et calcul serveur', () => {
    const db = getDb();
    const product = getProducts()[0];
    const initialStock = product.stock;

    const res = createOrder(
      {
        customerName: 'Test Client X1',
        customerPhone: '0197112233',
        shippingCity: 'Cotonou',
        bundleId: 'x1',
        quantity: 1,
      },
      [{ id: product.id, quantity: 1 }]
    );

    assert.ok(res.success);
    const expectedSubtotal = priceFor(product, 'x1'); // 18900
    assert.equal(res.subtotal, expectedSubtotal);

    // Vérification en base
    const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(res.orderNumber);
    assert.equal(orderRow.bundle_id, 'x1');
    assert.equal(orderRow.quantity, 1);
    assert.equal(orderRow.total_price, res.totalPrice);

    // Décrémentation du stock
    const updatedProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(product.id);
    assert.equal(updatedProd.stock, initialStock - 1);
  });

  test('6. Commande complète Lot 2 (x2) : application de la remise -10% et sauvegarde bundle_id', () => {
    const db = getDb();
    const product = getProducts()[0];
    const initialStock = product.stock;

    const res = createOrder(
      {
        customerName: 'Test Client X2',
        customerPhone: '0197445566',
        shippingCity: 'Cotonou',
        bundleId: 'x2',
        quantity: 2,
      },
      [{ id: product.id, quantity: 2 }]
    );

    assert.ok(res.success);
    const expectedSubtotal = priceFor(product, 'x2'); // 34 020
    assert.equal(res.subtotal, expectedSubtotal);
    assert.equal(res.savings, (product.price * 2) - expectedSubtotal);

    const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(res.orderNumber);
    assert.equal(orderRow.bundle_id, 'x2');
    assert.equal(orderRow.quantity, 2);
    assert.equal(orderRow.total_price, res.totalPrice);

    const updatedProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(product.id);
    assert.equal(updatedProd.stock, initialStock - 2);
  });

  test('7. Commande complète Lot 3 (x3) : application de la remise -15% et sauvegarde bundle_id', () => {
    const db = getDb();
    const product = getProducts()[0];
    const initialStock = product.stock;

    const res = createOrder(
      {
        customerName: 'Test Client X3',
        customerPhone: '0197778899',
        shippingCity: 'Cotonou',
        bundleId: 'x3',
        quantity: 3,
      },
      [{ id: product.id, quantity: 3 }]
    );

    assert.ok(res.success);
    const expectedSubtotal = priceFor(product, 'x3'); // 48 195
    assert.equal(res.subtotal, expectedSubtotal);
    assert.equal(res.savings, (product.price * 3) - expectedSubtotal);

    const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(res.orderNumber);
    assert.equal(orderRow.bundle_id, 'x3');
    assert.equal(orderRow.quantity, 3);
    assert.equal(orderRow.total_price, res.totalPrice);

    const updatedProd = db.prepare('SELECT stock FROM products WHERE id = ?').get(product.id);
    assert.equal(updatedProd.stock, initialStock - 3);
  });

  test('8. Gestion des styles par produit : pill et card modifiables et persistés', () => {
    const db = getDb();
    const product = getProducts()[0];

    // Passer en style 'pill'
    db.prepare("UPDATE products SET bundle_style = 'pill' WHERE id = ?").run(product.id);
    let row = db.prepare('SELECT bundle_style FROM products WHERE id = ?').get(product.id);
    assert.equal(row.bundle_style, 'pill');

    // Revenir en style 'card'
    db.prepare("UPDATE products SET bundle_style = 'card' WHERE id = ?").run(product.id);
    row = db.prepare('SELECT bundle_style FROM products WHERE id = ?').get(product.id);
    assert.equal(row.bundle_style, 'card');
  });
});
