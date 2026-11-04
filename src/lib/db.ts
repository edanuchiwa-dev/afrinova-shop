import type Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { randomInt } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { calculateServerShippingCost } from './shipping.ts';
import { parseBeninPhone } from './phone.ts';

const require = createRequire(import.meta.url);

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number; // Entier en FCFA
  compare_at_price?: number | null;
  cost_per_item?: number | null;
  stock: number;
  sku?: string | null;
  barcode?: string | null;
  track_quantity?: number;
  continue_selling_out_of_stock?: number;
  category: string;
  image_url: string | null;
  media_urls?: string | null;
  weight_kg: number;
  is_physical?: number;
  vendor?: string | null;
  tags?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  variants?: string | null;
  sales_channels?: string | null;
  status: string;
  created_at: string;
};

export type OrderInput = {
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  shippingCity: string;
  neighborhood?: string;
  landmark?: string;
  locationUrl?: string;
  shippingAddress?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  carrier?: string;
  customerNotes?: string;
  paymentMethod?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
};

export type PromotionStatus = 'draft' | 'active' | 'paused' | 'ended';

export type Promotion = {
  id: number;
  product_id: number;
  name: string;
  original_price: number;
  promo_price: number;
  total_quota: number;
  consumed_quota: number;
  reserved_quota: number;
  start_date: string | null;
  end_date: string | null;
  status: PromotionStatus;
  show_remaining: number; // 1 = oui, 0 = non
  created_at: string;
};

export type OrderItemInput = {
  id: number;
  quantity: number;
  name?: string;
  price?: number;
};

let database: Database.Database | undefined;

/**
 * Exécute les migrations de schéma de façon strictement idempotente
 */
function runMigrations(db: Database.Database) {
  // 1. Tables de base
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Général',
      image_url TEXT,
      weight_kg REAL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      neighborhood TEXT NOT NULL DEFAULT '',
      landmark TEXT NOT NULL DEFAULT '',
      location_url TEXT DEFAULT '',
      shipping_address TEXT NOT NULL DEFAULT '',
      shipping_postal_code TEXT NOT NULL DEFAULT '',
      shipping_country TEXT NOT NULL DEFAULT 'Bénin',
      carrier TEXT NOT NULL DEFAULT 'Livraison express domicile',
      payment_method TEXT NOT NULL DEFAULT 'cod',
      total_price INTEGER NOT NULL,
      shipping_cost INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'nouvelle',
      tracking_number TEXT DEFAULT '',
      customer_notes TEXT DEFAULT '',
      utm_source TEXT DEFAULT '',
      utm_medium TEXT DEFAULT '',
      utm_campaign TEXT DEFAULT '',
      referrer TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      product_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER DEFAULT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      customer_name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Cotonou',
      comment TEXT NOT NULL,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'en_attente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS whatsapp_feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      caption TEXT,
      display_order INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'actif',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      original_price INTEGER NOT NULL,
      promo_price INTEGER NOT NULL,
      total_quota INTEGER NOT NULL,
      consumed_quota INTEGER NOT NULL DEFAULT 0,
      reserved_quota INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      show_remaining INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      path TEXT NOT NULL,
      title TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      device_type TEXT DEFAULT 'mobile',
      ip_address TEXT DEFAULT '',
      city TEXT DEFAULT 'Cotonou',
      region TEXT DEFAULT 'Littoral',
      country TEXT DEFAULT 'Bénin',
      isp TEXT DEFAULT '',
      latitude REAL DEFAULT NULL,
      longitude REAL DEFAULT NULL,
      user_agent TEXT DEFAULT '',
      browser TEXT DEFAULT '',
      ip_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_page_views_heartbeat ON page_views(last_heartbeat);
    CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
  `);

  // 2. Migration des colonnes complémentaires dans orders et order_items
  const columns = db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((c) => c.name));

  const addColumnIfNotExists = (col: string, def: string) => {
    if (!columnNames.has(col)) {
      db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${def}`);
    }
  };

  addColumnIfNotExists('neighborhood', "TEXT DEFAULT ''");
  addColumnIfNotExists('landmark', "TEXT DEFAULT ''");
  addColumnIfNotExists('location_url', "TEXT DEFAULT ''");
  addColumnIfNotExists('payment_method', "TEXT DEFAULT 'cod'");
  addColumnIfNotExists('utm_source', "TEXT DEFAULT ''");
  addColumnIfNotExists('utm_medium', "TEXT DEFAULT ''");
  addColumnIfNotExists('utm_campaign', "TEXT DEFAULT ''");
  addColumnIfNotExists('referrer', "TEXT DEFAULT ''");

  const orderItemsCols = db.prepare('PRAGMA table_info(order_items)').all() as Array<{ name: string }>;
  const orderItemsColNames = new Set(orderItemsCols.map((c) => c.name));
  if (!orderItemsColNames.has('promo_id')) {
    db.exec('ALTER TABLE order_items ADD COLUMN promo_id INTEGER DEFAULT NULL');
  }

  // 2b. Migration des colonnes Shopify avancées dans products
  const productCols = db.prepare('PRAGMA table_info(products)').all() as Array<{ name: string }>;
  const productColNames = new Set(productCols.map((c) => c.name));
  const addProductColumnIfNotExists = (col: string, def: string) => {
    if (!productColNames.has(col)) {
      db.exec(`ALTER TABLE products ADD COLUMN ${col} ${def}`);
    }
  };
  addProductColumnIfNotExists('compare_at_price', 'INTEGER DEFAULT NULL');
  addProductColumnIfNotExists('cost_per_item', 'INTEGER DEFAULT NULL');
  addProductColumnIfNotExists('sku', "TEXT DEFAULT ''");
  addProductColumnIfNotExists('barcode', "TEXT DEFAULT ''");
  addProductColumnIfNotExists('track_quantity', 'INTEGER DEFAULT 1');
  addProductColumnIfNotExists('continue_selling_out_of_stock', 'INTEGER DEFAULT 0');
  addProductColumnIfNotExists('is_physical', 'INTEGER DEFAULT 1');
  addProductColumnIfNotExists('vendor', "TEXT DEFAULT ''");
  addProductColumnIfNotExists('tags', "TEXT DEFAULT ''");
  addProductColumnIfNotExists('seo_title', "TEXT DEFAULT ''");
  addProductColumnIfNotExists('seo_description', "TEXT DEFAULT ''");
  addProductColumnIfNotExists('media_urls', "TEXT DEFAULT '[]'");
  addProductColumnIfNotExists('variants', "TEXT DEFAULT '[]'");
  addProductColumnIfNotExists('sales_channels', "TEXT DEFAULT '[\"online_store\",\"whatsapp\",\"ads\"]'");

  // 2c. Migration des colonnes IP & Géolocalisation dans page_views
  const pageViewsCols = db.prepare('PRAGMA table_info(page_views)').all() as Array<{ name: string }>;
  const pageViewsColNames = new Set(pageViewsCols.map((c) => c.name));
  const addPageViewsColumnIfNotExists = (col: string, def: string) => {
    if (!pageViewsColNames.has(col)) {
      db.exec(`ALTER TABLE page_views ADD COLUMN ${col} ${def}`);
    }
  };
  addPageViewsColumnIfNotExists('ip_address', "TEXT DEFAULT ''");
  addPageViewsColumnIfNotExists('region', "TEXT DEFAULT 'Littoral'");
  addPageViewsColumnIfNotExists('isp', "TEXT DEFAULT ''");
  addPageViewsColumnIfNotExists('latitude', "REAL DEFAULT NULL");
  addPageViewsColumnIfNotExists('longitude', "REAL DEFAULT NULL");
  addPageViewsColumnIfNotExists('user_agent', "TEXT DEFAULT ''");
  addPageViewsColumnIfNotExists('browser', "TEXT DEFAULT ''");

  // 3. Création des index de performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status);
    CREATE INDEX IF NOT EXISTS idx_promotions_product_status ON promotions(product_id, status);
    CREATE INDEX IF NOT EXISTS idx_page_views_ip ON page_views(ip_address);
  `);

  // 4. Migration monétaire
  db.exec(`
    UPDATE products SET price = CAST(ROUND(price * 100) AS INTEGER) WHERE price < 1000;
    UPDATE orders SET total_price = CAST(ROUND(total_price * 100) AS INTEGER) WHERE total_price < 1000;
    UPDATE orders SET shipping_cost = CAST(ROUND(shipping_cost * 100) AS INTEGER) WHERE shipping_cost < 1000 AND shipping_cost > 0;
    UPDATE order_items SET product_price = CAST(ROUND(product_price * 100) AS INTEGER) WHERE product_price < 1000;
  `);

  // 5. Initialisation du catalogue si vide
  const count = (db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number }).count;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO products (name, slug, description, price, stock, category, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    db.transaction(() => {
      insert.run(
        'Montre Chronographe',
        'montre-chronographe',
        'Montre chronographe élégante et robuste pour le quotidien.',
        18900,
        12,
        'Montres',
        'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'
      );
      insert.run(
        'Sacoche Cuir',
        'sacoche-cuir',
        'Sacoche en cuir pleine fleur pratique et résistante.',
        12900,
        10,
        'Maroquinerie',
        'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&q=80'
      );
      insert.run(
        'Casque Audio sans fil',
        'casque-audio-sans-fil',
        'Casque audio sans fil haute fidélité avec autonomie longue durée.',
        14900,
        15,
        'Audio',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
      );
      insert.run(
        'Portefeuille RFID',
        'portefeuille-rfid',
        'Portefeuille compact sécurisé avec protection anti-piratage RFID.',
        4900,
        20,
        'Maroquinerie',
        'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80'
      );
    })();
  }
}

export function getDb(): Database.Database {
  if (database) return database;

  const dataDir = path.join(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });
  const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'store.db');
  const DatabaseConstructor = require('better-sqlite3');
  const db = new DatabaseConstructor(dbPath);

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    database = db;
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function closeDb(): void {
  if (database) {
    database.close();
    database = undefined;
  }
}

export function getProducts(): Product[] {
  return getDb().prepare("SELECT * FROM products WHERE status = 'active' ORDER BY id").all() as Product[];
}

export function getProductBySlug(slug: string): Product | undefined {
  return getDb().prepare("SELECT * FROM products WHERE slug = ? AND status = 'active'").get(slug) as Product | undefined;
}

export function getProductById(id: number): Product | undefined {
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}

/**
 * Vérifie si une promotion est temporellement active et s'il reste du quota.
 */
export function isPromotionCurrentlyActive(promo: Promotion, now: Date = new Date()): boolean {
  if (promo.status !== 'active') return false;
  if (promo.consumed_quota >= promo.total_quota) return false;

  const nowMs = now.getTime();
  if (promo.start_date) {
    const startMs = new Date(promo.start_date).getTime();
    if (!isNaN(startMs) && nowMs < startMs) return false;
  }
  if (promo.end_date) {
    const endMs = new Date(promo.end_date).getTime();
    if (!isNaN(endMs) && nowMs > endMs) return false;
  }
  return true;
}

/**
 * Récupère la promotion active en cours pour un produit donné, ou null si aucune.
 */
export function getActivePromotionForProduct(productId: number, dbInstance?: Database.Database): Promotion | null {
  const db = dbInstance || getDb();
  const promos = db.prepare(`
    SELECT * FROM promotions 
    WHERE product_id = ? AND status = 'active'
    ORDER BY id DESC
  `).all(productId) as Promotion[];

  const now = new Date();
  for (const promo of promos) {
    if (isPromotionCurrentlyActive(promo, now)) {
      return promo;
    }
  }
  return null;
}

/**
 * Liste toutes les promotions administrables avec les détails du produit associé.
 */
export function listPromotions(productId?: number): Array<Promotion & { product_name: string; product_stock: number; product_slug: string }> {
  const db = getDb();
  let query = `
    SELECT p.*, prod.name as product_name, prod.stock as product_stock, prod.slug as product_slug
    FROM promotions p
    JOIN products prod ON p.product_id = prod.id
  `;
  const params: unknown[] = [];
  if (productId) {
    query += ' WHERE p.product_id = ?';
    params.push(productId);
  }
  query += ' ORDER BY p.id DESC';
  return db.prepare(query).all(...params) as Array<Promotion & { product_name: string; product_stock: number; product_slug: string }>;
}

/**
 * Création d'une nouvelle promotion à quota limité.
 */
export function createPromotion(data: {
  product_id: number;
  name: string;
  original_price: number;
  promo_price: number;
  total_quota: number;
  start_date?: string | null;
  end_date?: string | null;
  status?: PromotionStatus;
  show_remaining?: boolean | number;
}): Promotion {
  const db = getDb();
  return db.transaction(() => {
    const product = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?').get(data.product_id) as Product | undefined;
    if (!product) throw new Error('Produit introuvable.');

    if (!data.name || !data.name.trim()) throw new Error('Le nom de la promotion est requis.');
    if (!Number.isSafeInteger(data.promo_price) || data.promo_price <= 0) {
      throw new Error('Le prix promotionnel doit être un entier positif en FCFA.');
    }
    if (!Number.isSafeInteger(data.original_price) || data.original_price <= data.promo_price) {
      throw new Error('Le prix d\'origine doit être strictement supérieur au prix promotionnel.');
    }
    if (!Number.isSafeInteger(data.total_quota) || data.total_quota <= 0) {
      throw new Error('Le quota doit être un entier strictement positif.');
    }

    if (data.total_quota > product.stock) {
      throw new Error(`Le quota promotionnel (${data.total_quota}) ne peut pas dépasser le stock physique disponible (${product.stock}).`);
    }

    const status: PromotionStatus = data.status || 'active';
    const showRemaining = data.show_remaining === false || data.show_remaining === 0 ? 0 : 1;

    // Si on active une promotion, mettre en pause toute autre promotion active sur le même produit
    if (status === 'active') {
      const existing = db.prepare("SELECT id FROM promotions WHERE product_id = ? AND status = 'active'").all(data.product_id) as Array<{ id: number }>;
      for (const ex of existing) {
        db.prepare("UPDATE promotions SET status = 'paused' WHERE id = ?").run(ex.id);
      }
    }

    const result = db.prepare(`
      INSERT INTO promotions (
        product_id, name, original_price, promo_price, total_quota,
        consumed_quota, reserved_quota, start_date, end_date, status, show_remaining
      )
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `).run(
      data.product_id,
      data.name.trim(),
      data.original_price,
      data.promo_price,
      data.total_quota,
      data.start_date || null,
      data.end_date || null,
      status,
      showRemaining
    );

    return db.prepare('SELECT * FROM promotions WHERE id = ?').get(result.lastInsertRowid) as Promotion;
  })();
}

/**
 * Mise à jour d'une promotion existante.
 */
export function updatePromotion(
  id: number,
  data: Partial<{
    name: string;
    original_price: number;
    promo_price: number;
    total_quota: number;
    start_date: string | null;
    end_date: string | null;
    status: PromotionStatus;
    show_remaining: boolean | number;
  }>
): Promotion {
  const db = getDb();
  return db.transaction(() => {
    const promo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id) as Promotion | undefined;
    if (!promo) throw new Error('Promotion introuvable.');

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Le nom de la promotion ne peut pas être vide.');
    }

    if (data.promo_price !== undefined) {
      if (!Number.isSafeInteger(data.promo_price) || data.promo_price <= 0) {
        throw new Error('Le prix promotionnel doit être un entier positif.');
      }
    }

    if (data.original_price !== undefined) {
      const promoPrice = data.promo_price !== undefined ? data.promo_price : promo.promo_price;
      if (!Number.isSafeInteger(data.original_price) || data.original_price <= promoPrice) {
        throw new Error('Le prix d\'origine doit être supérieur au prix promotionnel.');
      }
    }

    if (data.total_quota !== undefined) {
      if (!Number.isSafeInteger(data.total_quota) || data.total_quota < promo.consumed_quota) {
        throw new Error(`Le quota total ne peut pas être inférieur au quota déjà consommé (${promo.consumed_quota}).`);
      }
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(promo.product_id) as { stock: number } | undefined;
      if (product && (data.total_quota - promo.consumed_quota) > product.stock) {
        throw new Error(`Le quota promotionnel restant (${data.total_quota - promo.consumed_quota}) ne peut pas dépasser le stock physique (${product.stock}).`);
      }
    }

    if (data.status === 'active' && promo.status !== 'active') {
      db.prepare("UPDATE promotions SET status = 'paused' WHERE product_id = ? AND id != ? AND status = 'active'").run(promo.product_id, id);
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name.trim());
    }
    if (data.original_price !== undefined) {
      fields.push('original_price = ?');
      values.push(data.original_price);
    }
    if (data.promo_price !== undefined) {
      fields.push('promo_price = ?');
      values.push(data.promo_price);
    }
    if (data.total_quota !== undefined) {
      fields.push('total_quota = ?');
      values.push(data.total_quota);
    }
    if (data.start_date !== undefined) {
      fields.push('start_date = ?');
      values.push(data.start_date || null);
    }
    if (data.end_date !== undefined) {
      fields.push('end_date = ?');
      values.push(data.end_date || null);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.show_remaining !== undefined) {
      fields.push('show_remaining = ?');
      values.push(data.show_remaining ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE promotions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return db.prepare('SELECT * FROM promotions WHERE id = ?').get(id) as Promotion;
  })();
}

/**
 * Suppression d'une promotion.
 */
export function deletePromotion(id: number): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
  return res.changes > 0;
}

/**
 * Création d'une commande en UNE transaction atomique.
 * Recalcul systématique et strict des prix, promotions actives, stocks et frais de port côté serveur.
 */
export function createOrder(
  order: OrderInput,
  items: OrderItemInput[]
): {
  success: true;
  orderNumber: string;
  totalPrice: number;
  shippingCost: number;
  normalizedPhone: string;
  subtotal: number;
  savings: number;
} {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La commande doit contenir au moins un produit.');
  }

  // Normalisation et validation stricte du numéro béninois
  const phoneCheck = parseBeninPhone(order.customerPhone);
  if (!phoneCheck.valid || !phoneCheck.normalized) {
    throw new Error(phoneCheck.message || 'Numéro de téléphone invalide.');
  }
  const normalizedPhone = phoneCheck.normalized;

  // Règle métier serveur inviolable : frais de livraison selon la commune / zone
  const shippingCost = calculateServerShippingCost(order.shippingCity, order.carrier);

  const db = getDb();
  return db.transaction(() => {
    const findProduct = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'");
    const decrement = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
    const updatePromoQuota = db.prepare(`
      UPDATE promotions
      SET consumed_quota = consumed_quota + ?
      WHERE id = ? AND (total_quota - consumed_quota) >= ?
    `);
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_email, customer_phone,
        shipping_city, neighborhood, landmark, location_url, shipping_address,
        shipping_postal_code, shipping_country, carrier, payment_method,
        total_price, shipping_cost, customer_notes,
        utm_source, utm_medium, utm_campaign, referrer
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, promo_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const quantities = new Map<number, number>();
    for (const item of items) {
      if (!Number.isSafeInteger(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Produit ou quantité invalide.');
      }
      const quantity = (quantities.get(item.id) ?? 0) + item.quantity;
      if (!Number.isSafeInteger(quantity) || quantity > 10) {
        throw new Error('Quantité par article limitée à 10.');
      }
      quantities.set(item.id, quantity);
    }

    type OrderLineItem = {
      product: Product;
      quantity: number;
      promoUnits: number;
      normalUnits: number;
      promoPrice?: number;
      promoId?: number;
      unitPrice: number;
    };

    const lines: OrderLineItem[] = [];
    let subtotalFCFA = 0;
    let totalSavings = 0;

    for (const [id, quantity] of quantities) {
      const product = findProduct.get(id) as Product | undefined;
      if (!product) throw new Error(`Produit introuvable ou indisponible : ${id}`);
      if (product.stock < quantity) throw new Error(`Stock insuffisant pour ${product.name}`);

      // Détection de promotion active pour ce produit
      const promo = getActivePromotionForProduct(id, db);
      let promoUnits = 0;
      let normalUnits = quantity;

      if (promo) {
        const remainingQuota = Math.max(0, promo.total_quota - promo.consumed_quota);
        promoUnits = Math.min(quantity, remainingQuota);
        normalUnits = quantity - promoUnits;
      }

      lines.push({
        product,
        quantity,
        promoUnits,
        normalUnits,
        promoPrice: promo?.promo_price,
        promoId: promo?.id,
        unitPrice: Math.round(product.price),
      });

      if (promoUnits > 0 && promo) {
        subtotalFCFA += promo.promo_price * promoUnits;
        totalSavings += (Math.round(product.price) - promo.promo_price) * promoUnits;
      }
      if (normalUnits > 0) {
        subtotalFCFA += Math.round(product.price) * normalUnits;
      }
    }

    const totalPrice = subtotalFCFA + shippingCost;
    if (!Number.isSafeInteger(subtotalFCFA) || !Number.isSafeInteger(totalPrice) || totalPrice <= 0) {
      throw new Error('Montant de commande invalide.');
    }

    // Numéro de commande unique
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    let orderNumber = '';
    const exists = db.prepare('SELECT 1 FROM orders WHERE order_number = ?');
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = `CMD-${datePart}-${String(randomInt(10000)).padStart(4, '0')}`;
      if (!exists.get(candidate)) {
        orderNumber = candidate;
        break;
      }
    }
    if (!orderNumber) throw new Error('Impossible de générer un numéro de commande unique.');

    const address = order.shippingAddress || (order.neighborhood ? `${order.neighborhood}${order.landmark ? `, Repère: ${order.landmark}` : ''}` : `Livraison à ${order.shippingCity}`);

    const result = insertOrder.run(
      orderNumber,
      order.customerName,
      order.customerEmail ?? null,
      normalizedPhone,
      order.shippingCity,
      order.neighborhood || '',
      order.landmark || '',
      order.locationUrl ?? '',
      address,
      order.shippingPostalCode ?? '',
      order.shippingCountry ?? 'Bénin',
      order.carrier ?? 'Livraison express domicile',
      order.paymentMethod ?? 'cod',
      totalPrice,
      shippingCost,
      order.customerNotes ?? '',
      order.utm_source ?? '',
      order.utm_medium ?? '',
      order.utm_campaign ?? '',
      order.referrer ?? ''
    );

    // Décrémentation atomique des stocks et des quotas promo
    for (const line of lines) {
      const decResult = decrement.run(line.quantity, line.product.id, line.quantity);
      if (decResult.changes !== 1) {
        throw new Error(`Stock insuffisant pour ${line.product.name}`);
      }

      // Si part promotionnelle
      if (line.promoUnits > 0 && line.promoId && line.promoPrice) {
        const promoUpdate = updatePromoQuota.run(line.promoUnits, line.promoId, line.promoUnits);
        if (promoUpdate.changes !== 1) {
          throw new Error(`Quota promotionnel insuffisant pour ${line.product.name}`);
        }
        insertItem.run(
          result.lastInsertRowid,
          line.product.id,
          line.promoUnits === line.quantity ? `${line.product.name} (Offre Promotionnelle)` : `${line.product.name} (Tarif Promo)`,
          line.promoPrice,
          line.promoUnits,
          line.promoId
        );
      }

      // Si part au tarif normal (ou commande sans promo)
      if (line.normalUnits > 0) {
        insertItem.run(
          result.lastInsertRowid,
          line.product.id,
          line.promoUnits > 0 ? `${line.product.name} (Tarif Normal)` : line.product.name,
          line.unitPrice,
          line.normalUnits,
          null
        );
      }
    }

    return {
      success: true as const,
      orderNumber,
      totalPrice,
      shippingCost,
      normalizedPhone,
      subtotal: subtotalFCFA,
      savings: totalSavings,
    };
  })();
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  nouvelle: ['en_preparation', 'expediee', 'annulee'],
  en_preparation: ['expediee', 'annulee'],
  expediee: ['livree', 'annulee'],
  livree: [],
  annulee: [],
};

export function updateOrderStatus(
  orderId: number,
  newStatus?: string,
  trackingNumber?: string
): Record<string, unknown> {
  const db = getDb();
  return db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown> | undefined;
    if (!order) {
      throw new Error('Commande introuvable.');
    }

    const currentStatus = order.status as string;

    if (newStatus && newStatus !== currentStatus) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Transition non autorisée : impossible de passer du statut "${currentStatus}" à "${newStatus}".`
        );
      }

      if (newStatus === 'annulee') {
        const items = db
          .prepare('SELECT product_id, quantity, promo_id FROM order_items WHERE order_id = ?')
          .all(orderId) as Array<{ product_id: number; quantity: number; promo_id: number | null }>;

        const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        const restorePromo = db.prepare('UPDATE promotions SET consumed_quota = MAX(0, consumed_quota - ?) WHERE id = ?');
        for (const item of items) {
          if (item.product_id) {
            restock.run(item.quantity, item.product_id);
          }
          if (item.promo_id) {
            restorePromo.run(item.quantity, item.promo_id);
          }
        }
      }
    }

    const fields: string[] = [];
    const values: (string | number)[] = [];
    if (newStatus) {
      fields.push('status = ?');
      values.push(newStatus);
    }
    if (trackingNumber !== undefined) {
      fields.push('tracking_number = ?');
      values.push(trackingNumber.trim());
    }

    if (fields.length > 0) {
      db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values, orderId);
    }

    return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>;
  })();
}

export type Review = {
  id: number;
  product_id?: number | null;
  product_name?: string | null;
  rating: number;
  customer_name: string;
  city: string;
  comment: string;
  photo_url: string | null;
  status: 'en_attente' | 'approuve' | 'rejete';
  created_at: string;
};

export type WhatsappFeedback = {
  id: number;
  image_url: string;
  caption: string | null;
  display_order: number;
  status: string;
  created_at: string;
};

export function getApprovedReviews(productId?: number): Review[] {
  if (productId) {
    return getDb()
      .prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'approuve' ORDER BY created_at DESC")
      .all(productId) as Review[];
  }
  return getDb()
    .prepare("SELECT * FROM reviews WHERE status = 'approuve' ORDER BY created_at DESC")
    .all() as Review[];
}

export function getAllReviews(): Review[] {
  return getDb()
    .prepare('SELECT * FROM reviews ORDER BY created_at DESC')
    .all() as Review[];
}

export function getActiveWhatsappFeedbacks(): WhatsappFeedback[] {
  return getDb()
    .prepare("SELECT * FROM whatsapp_feedbacks WHERE status = 'actif' ORDER BY display_order ASC, id DESC")
    .all() as WhatsappFeedback[];
}

export function getSetting(key: string, defaultValue = ''): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// ============================================================================
// SUIVI DU TRAFIC & VISITEURS EN TEMPS RÉEL (Shopify Live View & Analytics)
// ============================================================================

export type LiveVisitor = {
  sessionId: string;
  path: string;
  title: string;
  device: string;
  ipAddress: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  latitude?: number | null;
  longitude?: number | null;
  userAgent?: string;
  browser?: string;
  utmSource: string;
  createdAt: string;
  lastHeartbeat: string;
  durationSec: number;
  lastSeenSec: number;
};

export type LiveVisitorStats = {
  activeCount: number;
  activeVisitors: LiveVisitor[];
  recentVisitors: LiveVisitor[];
  activePages: Array<{ path: string; label: string; count: number; percentage: number }>;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  last30Minutes: Array<{ minuteLabel: string; visitors: number }>;
  todayVisitorsCount: number;
  todayPageViewsCount: number;
};

export function recordPageView(params: {
  sessionId: string;
  path: string;
  title?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: string;
  ip_address?: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  latitude?: number | null;
  longitude?: number | null;
  user_agent?: string;
  browser?: string;
  isHeartbeat?: boolean;
}): void {
  const db = getDb();
  const cleanSession = (params.sessionId || '').slice(0, 64);
  const cleanPath = (params.path || '/').slice(0, 255);
  const cleanTitle = (params.title || '').slice(0, 255);
  const cleanReferrer = (params.referrer || '').slice(0, 255);
  const cleanUtmSource = (params.utm_source || '').slice(0, 64);
  const cleanUtmMedium = (params.utm_medium || '').slice(0, 64);
  const cleanUtmCampaign = (params.utm_campaign || '').slice(0, 64);
  const cleanDevice = (params.device_type || 'mobile').slice(0, 20);
  const cleanIp = (params.ip_address || '').slice(0, 64);
  const cleanCity = (params.city || 'Cotonou').slice(0, 64);
  const cleanRegion = (params.region || 'Littoral').slice(0, 64);
  const cleanCountry = (params.country || 'Bénin').slice(0, 64);
  const cleanIsp = (params.isp || 'Opérateur Réseau').slice(0, 100);
  const cleanUa = (params.user_agent || '').slice(0, 300);
  const cleanBrowser = (params.browser || 'Web').slice(0, 50);
  const cleanLat = typeof params.latitude === 'number' ? params.latitude : null;
  const cleanLon = typeof params.longitude === 'number' ? params.longitude : null;

  if (!cleanSession) return;

  if (params.isHeartbeat) {
    db.prepare(`
      UPDATE page_views 
      SET last_heartbeat = CURRENT_TIMESTAMP 
      WHERE session_id = ? AND id = (
        SELECT id FROM page_views WHERE session_id = ? ORDER BY id DESC LIMIT 1
      )
    `).run(cleanSession, cleanSession);
  } else {
    const recent = db.prepare(`
      SELECT id FROM page_views 
      WHERE session_id = ? AND path = ? AND created_at >= datetime('now', '-2 minutes')
      ORDER BY id DESC LIMIT 1
    `).get(cleanSession, cleanPath) as { id: number } | undefined;

    if (recent) {
      db.prepare(`
        UPDATE page_views 
        SET last_heartbeat = CURRENT_TIMESTAMP,
            title = COALESCE(NULLIF(?, ''), title)
        WHERE id = ?
      `).run(cleanTitle, recent.id);
    } else {
      db.prepare(`
        INSERT INTO page_views (
          session_id, path, title, referrer, utm_source, utm_medium, utm_campaign, 
          device_type, ip_address, city, region, country, isp, latitude, longitude,
          user_agent, browser, last_heartbeat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        cleanSession, cleanPath, cleanTitle, cleanReferrer, 
        cleanUtmSource, cleanUtmMedium, cleanUtmCampaign, cleanDevice,
        cleanIp, cleanCity, cleanRegion, cleanCountry, cleanIsp, cleanLat, cleanLon,
        cleanUa, cleanBrowser
      );
    }
  }
}

export function getLiveVisitorsData(windowMinutes = 3): LiveVisitorStats {
  const db = getDb();
  
  // 1. Visiteurs actifs sur la fenêtre
  const rawRows = db.prepare(`
    SELECT 
      session_id, path, title, device_type, ip_address, city, region, country, isp,
      latitude, longitude, user_agent, browser, utm_source, created_at, last_heartbeat,
      CAST((strftime('%s', 'now') - strftime('%s', created_at)) AS INTEGER) as duration_sec,
      CAST((strftime('%s', 'now') - strftime('%s', last_heartbeat)) AS INTEGER) as last_seen_sec
    FROM page_views
    WHERE last_heartbeat >= datetime('now', '-' || ? || ' minutes')
    ORDER BY last_heartbeat DESC
  `).all(windowMinutes) as Array<{
    session_id: string;
    path: string;
    title: string;
    device_type: string;
    ip_address: string;
    city: string;
    region: string;
    country: string;
    isp: string;
    latitude: number | null;
    longitude: number | null;
    user_agent: string;
    browser: string;
    utm_source: string;
    created_at: string;
    last_heartbeat: string;
    duration_sec: number;
    last_seen_sec: number;
  }>;

  const seenSessions = new Set<string>();
  const activeVisitors: LiveVisitor[] = [];
  const pageCounts: Record<string, number> = {};
  const devices = { mobile: 0, desktop: 0, tablet: 0 };

  for (const row of rawRows) {
    if (!seenSessions.has(row.session_id)) {
      seenSessions.add(row.session_id);
      activeVisitors.push({
        sessionId: row.session_id,
        path: row.path,
        title: row.title || row.path,
        device: row.device_type || 'mobile',
        ipAddress: row.ip_address || '127.0.0.1 (Local)',
        city: row.city || 'Cotonou',
        region: row.region || 'Littoral',
        country: row.country || 'Bénin',
        isp: row.isp || 'Opérateur Réseau',
        latitude: row.latitude,
        longitude: row.longitude,
        userAgent: row.user_agent,
        browser: row.browser || 'Web',
        utmSource: row.utm_source || 'direct',
        createdAt: row.created_at,
        lastHeartbeat: row.last_heartbeat,
        durationSec: Math.max(0, row.duration_sec),
        lastSeenSec: Math.max(0, row.last_seen_sec),
      });

      const dev = (row.device_type || 'mobile').toLowerCase();
      if (dev === 'desktop') devices.desktop++;
      else if (dev === 'tablet') devices.tablet++;
      else devices.mobile++;

      pageCounts[row.path] = (pageCounts[row.path] || 0) + 1;
    }
  }

  const activeCount = activeVisitors.length;

  // 1b. Récupération des visiteurs récents (les 50 dernières sessions)
  const recentRows = db.prepare(`
    SELECT 
      session_id, path, title, device_type, ip_address, city, region, country, isp,
      latitude, longitude, user_agent, browser, utm_source, created_at, last_heartbeat,
      CAST((strftime('%s', 'now') - strftime('%s', created_at)) AS INTEGER) as duration_sec,
      CAST((strftime('%s', 'now') - strftime('%s', last_heartbeat)) AS INTEGER) as last_seen_sec
    FROM page_views
    ORDER BY last_heartbeat DESC
    LIMIT 200
  `).all() as typeof rawRows;

  const seenRecent = new Set<string>();
  const recentVisitors: LiveVisitor[] = [];
  for (const row of recentRows) {
    if (!seenRecent.has(row.session_id)) {
      seenRecent.add(row.session_id);
      recentVisitors.push({
        sessionId: row.session_id,
        path: row.path,
        title: row.title || row.path,
        device: row.device_type || 'mobile',
        ipAddress: row.ip_address || '127.0.0.1 (Local)',
        city: row.city || 'Cotonou',
        region: row.region || 'Littoral',
        country: row.country || 'Bénin',
        isp: row.isp || 'Opérateur Réseau',
        latitude: row.latitude,
        longitude: row.longitude,
        userAgent: row.user_agent,
        browser: row.browser || 'Web',
        utmSource: row.utm_source || 'direct',
        createdAt: row.created_at,
        lastHeartbeat: row.last_heartbeat,
        durationSec: Math.max(0, row.duration_sec),
        lastSeenSec: Math.max(0, row.last_seen_sec),
      });
      if (recentVisitors.length >= 50) break;
    }
  }

  const pageTitleMap: Record<string, string> = {
    '/': 'Page d\'accueil (Vitrine)',
    '/suivi': 'Suivi de commande',
    '/produit/montre-chronographe': 'Montre Chronographe',
    '/produit/sacoche-cuir': 'Sacoche Cuir',
    '/produit/casque-audio-sans-fil': 'Casque Audio Sans Fil',
    '/produit/portefeuille-rfid': 'Portefeuille RFID',
  };

  const activePages = Object.entries(pageCounts).map(([path, count]) => ({
    path,
    label: pageTitleMap[path] || (path.startsWith('/produit/') ? path.replace('/produit/', 'Produit: ') : path),
    count,
    percentage: activeCount > 0 ? Math.round((count / activeCount) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  // 2. Activité des 30 dernières minutes (tranche par tranche de 2 minutes pour mini-graphique)
  const last30Minutes: Array<{ minuteLabel: string; visitors: number }> = [];
  const now = new Date();
  for (let i = 28; i >= 0; i -= 2) {
    const t = new Date(now.getTime() - i * 60 * 1000);
    const mLabel = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    
    const cntRow = db.prepare(`
      SELECT COUNT(DISTINCT session_id) as c 
      FROM page_views 
      WHERE last_heartbeat >= datetime('now', '-' || ? || ' minutes')
        AND last_heartbeat < datetime('now', '-' || ? || ' minutes')
    `).get(i + 2, i) as { c: number };
    
    last30Minutes.push({
      minuteLabel: mLabel,
      visitors: cntRow?.c || 0,
    });
  }

  // 3. Stats globales d'aujourd'hui
  const todayRow = db.prepare(`
    SELECT 
      COUNT(DISTINCT session_id) as visitors,
      COUNT(*) as views
    FROM page_views
    WHERE date(created_at) = date('now')
  `).get() as { visitors: number; views: number } | undefined;

  return {
    activeCount,
    activeVisitors,
    recentVisitors,
    activePages,
    deviceBreakdown: devices,
    last30Minutes,
    todayVisitorsCount: todayRow?.visitors || 0,
    todayPageViewsCount: todayRow?.views || 0,
  };
}

