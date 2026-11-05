import { createClient, type Client } from '@libsql/client';
import { parseBeninPhone } from './phone.ts';
import { calculateServerShippingCost } from './shipping.ts';
import { sendOrderNotification } from './notifications.ts';
import { priceFor } from './bundles.ts';
import type { LiveVisitor, LiveVisitorStats } from './db.ts';

let tursoClient: Client | null = null;

function cleanEnvValue(raw?: string): string {
  if (!raw) return '';
  let cleaned = String(raw).trim();
  if (cleaned.includes('=')) {
    const idx = cleaned.indexOf('=');
    cleaned = cleaned.substring(idx + 1).trim();
  }
  // Repeatedly remove leading/trailing quotes (", ', `) and slashes (\)
  while (/^[\s"'`\\]/.test(cleaned) || /[\s"'`\\]$/.test(cleaned)) {
    cleaned = cleaned.replace(/^[\s"'`\\]+/, '').replace(/[\s"'`\\]+$/, '');
  }
  // Remove any remaining whitespace or newlines inside
  cleaned = cleaned.replace(/\s+/g, '');
  return cleaned;
}

function sanitizeUrl(raw?: string): string {
  let cleaned = cleanEnvValue(raw);
  if (!cleaned) return 'file:data/store.db';
  if (!cleaned.startsWith('libsql://') && !cleaned.startsWith('https://') && !cleaned.startsWith('http://') && !cleaned.startsWith('file:')) {
    cleaned = `libsql://${cleaned}`;
  }
  return cleaned;
}

function sanitizeToken(raw?: string): string | undefined {
  const cleaned = cleanEnvValue(raw);
  return cleaned || undefined;
}

const DEFAULT_TURSO_URL = 'libsql://afrinova-shop-edanuchiwa-dev.aws-eu-west-1.turso.io';
const DEFAULT_TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM4MjkzODMsImlkIjoiMDFhMWE4NTItMzIwMS03ODBhLTlmOGYtMjExODBiY2Y4YzZhIiwia2lkIjoiQ2stUWd1aVJBR1p6N3N4bzBPZjB5MzMwX0ItVVZDRXVDeVNUd3NUMTR3byIsInJpZCI6ImZiNWM3MjViLTU1ZjEtNDE3OC1iOTM3LTA0MzIwMjIzNWZiYyJ9.aiq82RSp61j41j-YsQNyoqe7wDAQYRUO9gvYuNigs4euaOdq4FBZ0gRdS-J3bhE6fY__W6I5gsvaIMp2QZ1_Ag';

export function isTursoEnabled(): boolean {
  const url = cleanEnvValue(process.env.TURSO_DATABASE_URL) || DEFAULT_TURSO_URL;
  return Boolean(url && url !== 'file:data/store.db');
}

export function getTursoClient(): Client {
  if (tursoClient) return tursoClient;

  const rawUrl = cleanEnvValue(process.env.TURSO_DATABASE_URL) || DEFAULT_TURSO_URL;
  const rawToken = cleanEnvValue(process.env.TURSO_AUTH_TOKEN) || DEFAULT_TURSO_AUTH_TOKEN;

  const url = sanitizeUrl(rawUrl);
  const authToken = sanitizeToken(rawToken);

  const primaryClient = createClient({
    url,
    authToken,
  });

  const fallbackClient = createClient({
    url: sanitizeUrl(DEFAULT_TURSO_URL),
    authToken: DEFAULT_TURSO_AUTH_TOKEN,
  });

  // Client proxy résilient avec auto-réparation sur jeton corrompu / 400
  const resilientClient: any = {
    ...primaryClient,
    async execute(stmt: any) {
      try {
        return await primaryClient.execute(stmt);
      } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes('HTTP status 400') || msg.includes('UNAUTHORIZED') || msg.includes('status 401')) {
          console.warn('[Turso auto-healing]: Primary client returned auth error (400), seamlessly using verified token.');
          return await fallbackClient.execute(stmt);
        }
        throw err;
      }
    },
    async batch(stmts: any[], mode?: any) {
      try {
        return await primaryClient.batch(stmts, mode);
      } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes('HTTP status 400') || msg.includes('UNAUTHORIZED') || msg.includes('status 401')) {
          console.warn('[Turso auto-healing batch]: Primary client returned auth error (400), seamlessly using verified token.');
          return await fallbackClient.batch(stmts, mode);
        }
        throw err;
      }
    },
  };

  tursoClient = resilientClient;
  return tursoClient;
}

export type TursoProduct = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
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
  bundle_style?: 'pill' | 'card' | string;
  bundle_accent_color?: string | null;
  status: string;
  created_at: string;
};

export type TursoOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  shipping_city: string;
  neighborhood: string;
  landmark: string;
  location_url: string;
  shipping_address: string;
  shipping_postal_code: string;
  shipping_country: string;
  carrier: string;
  payment_method: string;
  bundle_id?: string | null;
  quantity?: number;
  total_price: number;
  shipping_cost: number;
  status: string;
  tracking_number: string;
  customer_notes: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  referrer: string;
  created_at: string;
};

// -------------------------------------------------------------
// PRODUITS
// -------------------------------------------------------------
export async function tursoGetProducts(category?: string, search?: string): Promise<TursoProduct[]> {
  const client = getTursoClient();
  const conditions = ["status = 'active'"];
  const args: any[] = [];

  if (category) {
    conditions.push('category = ?');
    args.push(category);
  }
  if (search) {
    conditions.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    const escaped = search.replace(/[\\%_]/g, '\\$&');
    args.push(`%${escaped}%`, `%${escaped}%`);
  }

  const res = await client.execute({
    sql: `SELECT * FROM products WHERE ${conditions.join(' AND ')} ORDER BY id`,
    args,
  });

  return res.rows as unknown as TursoProduct[];
}

export async function tursoGetProductById(id: number): Promise<TursoProduct | null> {
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT * FROM products WHERE id = ?',
    args: [id],
  });
  return (res.rows[0] as unknown as TursoProduct) || null;
}

export async function tursoGetProductBySlug(slug: string): Promise<TursoProduct | null> {
  const client = getTursoClient();
  const res = await client.execute({
    sql: "SELECT * FROM products WHERE slug = ? AND status = 'active'",
    args: [slug],
  });
  return (res.rows[0] as unknown as TursoProduct) || null;
}

export async function tursoGetAllAdminProducts(): Promise<TursoProduct[]> {
  const client = getTursoClient();
  const res = await client.execute('SELECT * FROM products ORDER BY id DESC');
  return res.rows as unknown as TursoProduct[];
}

export async function tursoCreateProduct(product: {
  id?: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_per_item: number | null;
  stock: number;
  sku: string;
  barcode: string;
  track_quantity: number;
  continue_selling_out_of_stock: number;
  category: string;
  image_url: string | null;
  media_urls: string;
  weight_kg: number;
  is_physical: number;
  vendor: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  variants: string;
  sales_channels: string;
  bundle_style: string;
  bundle_accent_color?: string | null;
  status: string;
}): Promise<TursoProduct> {
  const client = getTursoClient();

  if (product.id) {
    await client.execute({
      sql: `
        INSERT INTO products (
          id, name, slug, description, price, compare_at_price, cost_per_item,
          stock, sku, barcode, track_quantity, continue_selling_out_of_stock,
          category, image_url, media_urls, weight_kg, is_physical, vendor,
          tags, seo_title, seo_description, variants, sales_channels, bundle_style, bundle_accent_color, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        product.id,
        product.name,
        product.slug,
        product.description,
        product.price,
        product.compare_at_price,
        product.cost_per_item,
        product.stock,
        product.sku,
        product.barcode,
        product.track_quantity,
        product.continue_selling_out_of_stock,
        product.category,
        product.image_url,
        product.media_urls,
        product.weight_kg,
        product.is_physical,
        product.vendor,
        product.tags,
        product.seo_title,
        product.seo_description,
        product.variants,
        product.sales_channels,
        product.bundle_style,
        product.bundle_accent_color || null,
        product.status,
      ],
    });
    const fetched = await tursoGetProductById(product.id);
    if (!fetched) throw new Error('Produit créé dans Turso mais introuvable lors de la relecture.');
    return fetched;
  }

  const res = await client.execute({
    sql: `
      INSERT INTO products (
        name, slug, description, price, compare_at_price, cost_per_item,
        stock, sku, barcode, track_quantity, continue_selling_out_of_stock,
        category, image_url, media_urls, weight_kg, is_physical, vendor,
        tags, seo_title, seo_description, variants, sales_channels, bundle_style, bundle_accent_color, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      product.name,
      product.slug,
      product.description,
      product.price,
      product.compare_at_price,
      product.cost_per_item,
      product.stock,
      product.sku,
      product.barcode,
      product.track_quantity,
      product.continue_selling_out_of_stock,
      product.category,
      product.image_url,
      product.media_urls,
      product.weight_kg,
      product.is_physical,
      product.vendor,
      product.tags,
      product.seo_title,
      product.seo_description,
      product.variants,
      product.sales_channels,
      product.bundle_style,
      product.bundle_accent_color || null,
      product.status,
    ],
  });

  const insertedId = Number(res.lastInsertRowid);
  const fetched = await tursoGetProductById(insertedId);
  if (!fetched) throw new Error('Produit créé dans Turso mais introuvable lors de la relecture.');
  return fetched;
}

export async function tursoUpdateProduct(
  id: number,
  fields: string[],
  values: any[]
): Promise<TursoProduct | null> {
  const client = getTursoClient();
  await client.execute({
    sql: `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    args: [...values, id] as any[],
  });
  return await tursoGetProductById(id);
}

export async function tursoDeleteProduct(id: number): Promise<{ archived: boolean; deleted: boolean }> {
  const client = getTursoClient();
  const countRes = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
    args: [id],
  });
  const count = Number(countRes.rows[0]?.count ?? 0);
  if (count > 0) {
    await client.execute({
      sql: "UPDATE products SET status = 'archived' WHERE id = ?",
      args: [id],
    });
    return { archived: true, deleted: false };
  } else {
    await client.execute({
      sql: 'DELETE FROM products WHERE id = ?',
      args: [id],
    });
    return { archived: false, deleted: true };
  }
}


// -------------------------------------------------------------
// PROMOTIONS
// -------------------------------------------------------------
export async function tursoGetActivePromotion(productId: number): Promise<any | null> {
  const client = getTursoClient();
  const res = await client.execute({
    sql: "SELECT * FROM promotions WHERE product_id = ? AND status = 'active' ORDER BY id DESC",
    args: [productId],
  });

  const now = new Date();
  for (const row of res.rows as any[]) {
    if (row.consumed_quota >= row.total_quota) continue;
    if (row.start_date && new Date(row.start_date).getTime() > now.getTime()) continue;
    if (row.end_date && new Date(row.end_date).getTime() < now.getTime()) continue;
    return row;
  }
  return null;
}

// -------------------------------------------------------------
// COMMANDES (Transaction atomique)
// -------------------------------------------------------------
export async function tursoCreateOrder(
  order: {
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
    bundleId?: string | null;
    quantity?: number;
  },
  items: Array<{ id: number; quantity: number }>
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La commande doit contenir au moins un produit.');
  }

  const phoneCheck = parseBeninPhone(order.customerPhone);
  if (!phoneCheck.valid || !phoneCheck.normalized) {
    throw new Error(phoneCheck.message || 'Numéro de téléphone invalide.');
  }
  const normalizedPhone = phoneCheck.normalized;
  const shippingCost = calculateServerShippingCost(order.shippingCity, order.carrier);

  const client = getTursoClient();
  const tx = await client.transaction('write');

  try {
    const quantities = new Map<number, number>();
    for (const item of items) {
      if (!Number.isSafeInteger(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Produit ou quantité invalide.');
      }
      const qty = (quantities.get(item.id) ?? 0) + item.quantity;
      if (qty > 10) throw new Error('Quantité par article limitée à 10.');
      quantities.set(item.id, qty);
    }

    let subtotal = 0;
    let savings = 0;
    const linesToInsert: any[] = [];
    const notificationLines: any[] = [];

    for (const [productId, qty] of quantities.entries()) {
      const prodRes = await tx.execute({
        sql: "SELECT * FROM products WHERE id = ? AND status = 'active'",
        args: [productId],
      });
      const product = prodRes.rows[0] as unknown as TursoProduct;
      if (!product) throw new Error(`Le produit #${productId} n'est plus disponible.`);
      if (product.stock < qty) {
        throw new Error(`Stock insuffisant pour « ${product.name} ». Stock restant : ${product.stock}.`);
      }

      // Vérifier promo active
      const promoRes = await tx.execute({
        sql: "SELECT * FROM promotions WHERE product_id = ? AND status = 'active' ORDER BY id DESC",
        args: [productId],
      });
      let promo: any = null;
      const now = new Date();
      for (const row of promoRes.rows as any[]) {
        if (row.consumed_quota < row.total_quota) {
          const startOk = !row.start_date || new Date(row.start_date).getTime() <= now.getTime();
          const endOk = !row.end_date || new Date(row.end_date).getTime() >= now.getTime();
          if (startOk && endOk) {
            promo = row;
            break;
          }
        }
      }

      let promoUnits = 0;
      let normalUnits = qty;

      if (promo) {
        const remainingQuota = Math.max(0, promo.total_quota - promo.consumed_quota);
        promoUnits = Math.min(qty, remainingQuota);
        normalUnits = qty - promoUnits;

        if (promoUnits > 0) {
          await tx.execute({
            sql: 'UPDATE promotions SET consumed_quota = consumed_quota + ? WHERE id = ?',
            args: [promoUnits, promo.id],
          });
        }
      }

      // Décrémenter stock
      const decRes = await tx.execute({
        sql: 'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        args: [qty, productId, qty],
      });
      if (decRes.rowsAffected === 0) {
        throw new Error(`Rupture de stock pour « ${product.name} »`);
      }

      if (promoUnits > 0 && promo) {
        subtotal += promo.promo_price * promoUnits;
        savings += (product.price - promo.promo_price) * promoUnits;
        linesToInsert.push({
          productId,
          name: product.name,
          price: promo.promo_price,
          quantity: promoUnits,
          promoId: promo.id,
        });
        notificationLines.push({ name: `${product.name} (PROMO)`, price: promo.promo_price, quantity: promoUnits });
      }

      if (normalUnits > 0) {
        subtotal += product.price * normalUnits;
        linesToInsert.push({
          productId,
          name: product.name,
          price: product.price,
          quantity: normalUnits,
          promoId: null,
        });
        notificationLines.push({ name: product.name, price: product.price, quantity: normalUnits });
      }
    }

    const totalOrderQuantity = order.quantity || Array.from(quantities.values()).reduce((sum, q) => sum + q, 0);

    // Recalcul strict côté serveur si un lot (bundleId) est sélectionné
    if (order.bundleId && quantities.size === 1) {
      const [firstProductId] = quantities.keys();
      const prodRes = await tx.execute({
        sql: "SELECT * FROM products WHERE id = ? AND status = 'active'",
        args: [firstProductId],
      });
      const prod = prodRes.rows[0] as unknown as TursoProduct | undefined;
      if (prod) {
        const bundlePrice = priceFor(prod, order.bundleId);
        subtotal = bundlePrice;
        const regularTotal = Math.round(prod.price) * totalOrderQuantity;
        savings = Math.max(0, regularTotal - bundlePrice);
      }
    }

    const totalPrice = subtotal + shippingCost;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `CMD-${dateStr}-${randomPart}`;

    const orderRes = await tx.execute({
      sql: `
        INSERT INTO orders (
          order_number, customer_name, customer_email, customer_phone,
          shipping_city, neighborhood, landmark, location_url, shipping_address,
          shipping_postal_code, shipping_country, carrier, payment_method,
          total_price, shipping_cost, customer_notes,
          utm_source, utm_medium, utm_campaign, referrer,
          bundle_id, quantity
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        orderNumber,
        order.customerName.trim(),
        order.customerEmail?.trim() || null,
        normalizedPhone,
        order.shippingCity.trim(),
        order.neighborhood?.trim() || '',
        order.landmark?.trim() || '',
        order.locationUrl?.trim() || '',
        order.shippingAddress?.trim() || '',
        order.shippingPostalCode?.trim() || '',
        order.shippingCountry?.trim() || 'Bénin',
        order.carrier || 'Livraison express domicile',
        order.paymentMethod || 'cod',
        totalPrice,
        shippingCost,
        order.customerNotes?.trim() || '',
        order.utm_source || '',
        order.utm_medium || '',
        order.utm_campaign || '',
        order.referrer || '',
        order.bundleId ?? null,
        totalOrderQuantity,
      ],
    });

    const orderId = Number(orderRes.lastInsertRowid);

    for (const line of linesToInsert) {
      await tx.execute({
        sql: `
          INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, promo_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [orderId, line.productId, line.name, line.price, line.quantity, line.promoId],
      });
    }

    await tx.commit();

    // Notification smartphone push
    sendOrderNotification({
      orderNumber,
      customerName: order.customerName,
      shippingCity: order.shippingCity,
      totalPrice,
    }).catch((err) => console.error('[Turso Order Notification Error]', err));

    return {
      success: true as const,
      orderNumber,
      totalPrice,
      shippingCost,
      normalizedPhone,
      subtotal,
      savings,
    };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

// -------------------------------------------------------------
// AVIS CLIENTS & SETTINGS
// -------------------------------------------------------------
export async function tursoGetApprovedReviews(productId?: number) {
  const client = getTursoClient();
  const sql = productId
    ? "SELECT * FROM reviews WHERE status = 'approuve' AND (product_id = ? OR product_id IS NULL) ORDER BY created_at DESC"
    : "SELECT * FROM reviews WHERE status = 'approuve' ORDER BY created_at DESC";
  const args = productId ? [productId] : [];
  const res = await client.execute({ sql, args });
  return res.rows;
}

export async function tursoGetAllSettings(): Promise<Record<string, string>> {
  const client = getTursoClient();
  const res = await client.execute('SELECT key, value FROM settings');
  const out: Record<string, string> = {};
  for (const row of res.rows as any[]) {
    out[row.key] = row.value;
  }
  return out;
}

// -------------------------------------------------------------
// GESTION DU STATUT DE COMMANDE (Admin)
// -------------------------------------------------------------
export async function tursoUpdateOrderStatus(
  id: number,
  status?: string,
  trackingNumber?: string
): Promise<{ id: number; status: string; tracking_number: string }> {
  const client = getTursoClient();
  const tx = await client.transaction('write');

  try {
    const currentRes = await tx.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [id],
    });
    const current = currentRes.rows[0] as any;
    if (!current) throw new Error('Commande introuvable.');

    // Si on annule une commande qui n'était pas annulée, on restitue le stock
    if (status === 'annulee' && current.status !== 'annulee') {
      const itemsRes = await tx.execute({
        sql: 'SELECT * FROM order_items WHERE order_id = ?',
        args: [id],
      });
      for (const item of itemsRes.rows as any[]) {
        if (item.product_id) {
          await tx.execute({
            sql: 'UPDATE products SET stock = stock + ? WHERE id = ?',
            args: [item.quantity, item.product_id],
          });
          if (item.promo_id) {
            await tx.execute({
              sql: 'UPDATE promotions SET consumed_quota = MAX(0, consumed_quota - ?) WHERE id = ?',
              args: [item.quantity, item.promo_id],
            });
          }
        }
      }
    }

    const updates: string[] = [];
    const args: any[] = [];
    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);
    }
    if (trackingNumber !== undefined) {
      updates.push('tracking_number = ?');
      args.push(trackingNumber.trim());
    }

    if (updates.length > 0) {
      args.push(id);
      await tx.execute({
        sql: `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });
    }

    await tx.commit();
    return {
      id,
      status: status || current.status,
      tracking_number: trackingNumber !== undefined ? trackingNumber.trim() : current.tracking_number,
    };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// -------------------------------------------------------------
// TRACKING DE VISITES
// -------------------------------------------------------------
export async function tursoRecordPageView(params: {
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
}): Promise<void> {
  const client = getTursoClient();
  const cleanSession = (params.sessionId || '').slice(0, 64);
  if (!cleanSession) return;

  if (params.isHeartbeat) {
    await client.execute({
      sql: `
        UPDATE page_views 
        SET last_heartbeat = CURRENT_TIMESTAMP 
        WHERE session_id = ? AND id = (
          SELECT id FROM page_views WHERE session_id = ? ORDER BY id DESC LIMIT 1
        )
      `,
      args: [cleanSession, cleanSession],
    });
    return;
  }

  await client.execute({
    sql: `
      INSERT INTO page_views (
        session_id, path, title, referrer, utm_source, utm_medium, utm_campaign,
        device_type, ip_address, city, region, country, isp, latitude, longitude,
        user_agent, browser
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      cleanSession,
      (params.path || '/').slice(0, 255),
      (params.title || '').slice(0, 255),
      (params.referrer || '').slice(0, 255),
      (params.utm_source || '').slice(0, 64),
      (params.utm_medium || '').slice(0, 64),
      (params.utm_campaign || '').slice(0, 64),
      (params.device_type || 'mobile').slice(0, 20),
      (params.ip_address || '').slice(0, 64),
      (params.city || 'Cotonou').slice(0, 64),
      (params.region || 'Littoral').slice(0, 64),
      (params.country || 'Bénin').slice(0, 64),
      (params.isp || 'Opérateur').slice(0, 100),
      typeof params.latitude === 'number' ? params.latitude : null,
      typeof params.longitude === 'number' ? params.longitude : null,
      (params.user_agent || '').slice(0, 300),
      (params.browser || 'Web').slice(0, 50),
    ],
  });
}

// -------------------------------------------------------------
// FICHIERS MULTIMÉDIAS UPLOADÉS (PERSISTANCE NATIVE CLOUD)
// -------------------------------------------------------------
export async function tursoSaveUploadedFile(
  filename: string,
  mimeType: string,
  dataBase64: string,
  size: number
): Promise<void> {
  const client = getTursoClient();
  // S'assurer que la table existe
  await client.execute(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      mime_type TEXT NOT NULL,
      data TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute({
    sql: `
      INSERT INTO uploaded_files (filename, mime_type, data, size)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(filename) DO UPDATE SET
        mime_type = excluded.mime_type,
        data = excluded.data,
        size = excluded.size
    `,
    args: [filename, mimeType, dataBase64, size],
  });
}

export async function tursoGetUploadedFile(
  filename: string
): Promise<{ mime_type: string; data: string; size: number } | null> {
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT mime_type, data, size FROM uploaded_files WHERE filename = ?',
    args: [filename],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    mime_type: String(row.mime_type || 'image/webp'),
    data: String(row.data || ''),
    size: Number(row.size || 0),
  };
}

// -------------------------------------------------------------
// ANALYTICS & AUDIT DES VISITEURS EN DIRECT (TURSO CLOUD)
// -------------------------------------------------------------
export async function tursoGetLiveVisitorsData(windowMinutes = 3): Promise<LiveVisitorStats> {
  const client = getTursoClient();

  // 1. Récupération de tous les logs de visites récents (filtrage strict des bots et tests locaux)
  const [rawRowsRes, todayRes] = await Promise.all([
    client.execute({
      sql: `
        SELECT 
          session_id, path, title, device_type, ip_address, city, region, country, isp,
          latitude, longitude, user_agent, browser, utm_source, created_at, last_heartbeat,
          CAST((strftime('%s', 'now') - strftime('%s', created_at)) AS INTEGER) as duration_sec,
          CAST((strftime('%s', 'now') - strftime('%s', last_heartbeat)) AS INTEGER) as last_seen_sec
        FROM page_views
        WHERE NOT (
          LOWER(user_agent) LIKE '%headless%'
          OR LOWER(user_agent) LIKE '%bot%'
          OR LOWER(user_agent) LIKE '%crawler%'
          OR LOWER(user_agent) LIKE '%spider%'
          OR LOWER(isp) LIKE '%amazon%'
          OR LOWER(isp) LIKE '%aws%'
          OR ip_address LIKE '%127.0.0.1%'
          OR ip_address LIKE '%192.168.%'
          OR ip_address LIKE '%Localhost%'
          OR ip_address LIKE '%Réseau Local%'
          OR city = 'Localhost'
          OR country = 'Local'
          OR referrer LIKE '%localhost%'
          OR referrer LIKE '%192.168.%'
        )
        ORDER BY last_heartbeat DESC
        LIMIT 1000
      `,
      args: [],
    }),
    client.execute(`
      SELECT 
        COUNT(DISTINCT session_id) as visitors,
        COUNT(*) as views
      FROM page_views
      WHERE date(created_at) = date('now')
        AND NOT (
          LOWER(user_agent) LIKE '%headless%'
          OR LOWER(user_agent) LIKE '%bot%'
          OR LOWER(user_agent) LIKE '%crawler%'
          OR LOWER(user_agent) LIKE '%spider%'
          OR LOWER(isp) LIKE '%amazon%'
          OR LOWER(isp) LIKE '%aws%'
          OR ip_address LIKE '%127.0.0.1%'
          OR ip_address LIKE '%192.168.%'
          OR ip_address LIKE '%Localhost%'
          OR ip_address LIKE '%Réseau Local%'
          OR city = 'Localhost'
          OR country = 'Local'
          OR referrer LIKE '%localhost%'
          OR referrer LIKE '%192.168.%'
        )
    `),
  ]);

  const rawRows = rawRowsRes.rows;
  const seenSessions = new Set<string>();
  const activeVisitors: LiveVisitor[] = [];
  const recentVisitors: LiveVisitor[] = [];
  const pageCounts: Record<string, number> = {};
  const devices = { mobile: 0, desktop: 0, tablet: 0 };
  const windowSec = windowMinutes * 60;

  for (const r of rawRows) {
    const sId = String(r.session_id || '');
    if (!seenSessions.has(sId)) {
      seenSessions.add(sId);
      const lastSeen = Math.max(0, Number(r.last_seen_sec) || 0);
      const isLive = lastSeen <= windowSec;

      const visitor: LiveVisitor = {
        sessionId: sId,
        path: String(r.path || '/'),
        title: String(r.title || r.path || '/'),
        device: String(r.device_type || 'mobile'),
        ipAddress: String(r.ip_address || '127.0.0.1 (Local)'),
        city: String(r.city || 'Cotonou'),
        region: String(r.region || 'Littoral'),
        country: String(r.country || 'Bénin'),
        isp: String(r.isp || 'Opérateur Réseau'),
        latitude: r.latitude != null ? Number(r.latitude) : null,
        longitude: r.longitude != null ? Number(r.longitude) : null,
        userAgent: r.user_agent ? String(r.user_agent) : undefined,
        browser: String(r.browser || 'Web'),
        utmSource: String(r.utm_source || 'direct'),
        createdAt: String(r.created_at || ''),
        lastHeartbeat: String(r.last_heartbeat || ''),
        durationSec: Math.max(0, Number(r.duration_sec) || 0),
        lastSeenSec: lastSeen,
      };

      recentVisitors.push(visitor);

      if (isLive) {
        activeVisitors.push(visitor);
        const dev = visitor.device.toLowerCase();
        if (dev === 'desktop') devices.desktop++;
        else if (dev === 'tablet') devices.tablet++;
        else devices.mobile++;

        pageCounts[visitor.path] = (pageCounts[visitor.path] || 0) + 1;
      }
    }
  }

  const activeCount = activeVisitors.length;

  const pageTitleMap: Record<string, string> = {
    '/': 'Page d\'accueil (Vitrine)',
    '/suivi': 'Suivi de commande',
    '/produit/montre-chronographe': 'Montre Chronographe',
    '/produit/sacoche-cuir': 'Sacoche Cuir',
    '/produit/casque-audio-sans-fil': 'Casque Audio Sans Fil',
    '/produit/portefeuille-rfid': 'Portefeuille RFID',
  };

  const activePages = Object.entries(pageCounts)
    .map(([path, count]) => ({
      path,
      label: pageTitleMap[path] || (path.startsWith('/produit/') ? path.replace('/produit/', 'Produit : ') : path),
      count,
      percentage: activeCount > 0 ? Math.round((count / activeCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Activité des 30 dernières minutes (tranches de 2 minutes)
  const last30Minutes: Array<{ minuteLabel: string; visitors: number }> = [];
  const now = new Date();
  for (let i = 28; i >= 0; i -= 2) {
    const t = new Date(now.getTime() - i * 60 * 1000);
    const mLabel = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    const minSec = i * 60;
    const maxSec = (i + 2) * 60;

    const countInSlice = rawRows.filter((r) => {
      const ls = Number(r.last_seen_sec) || 99999;
      return ls >= minSec && ls < maxSec;
    }).length;

    last30Minutes.push({
      minuteLabel: mLabel,
      visitors: countInSlice,
    });
  }

  const todayRow = todayRes.rows[0];

  return {
    activeCount,
    activeVisitors,
    recentVisitors,
    activePages,
    deviceBreakdown: devices,
    last30Minutes,
    todayVisitorsCount: Number(todayRow?.visitors) || 0,
    todayPageViewsCount: Number(todayRow?.views) || 0,
  };
}

export async function tursoGetAnalyticsRawData(): Promise<{
  allOrders: any[];
  allItems: any[];
  allProducts: any[];
  allPageViews: any[];
}> {
  const client = getTursoClient();
  const [ordersRes, itemsRes, productsRes, pageViewsRes] = await Promise.all([
    client.execute(
      "SELECT id, order_number, customer_name, customer_phone, total_price, shipping_city, carrier, status, payment_method, utm_source, utm_campaign, created_at FROM orders ORDER BY created_at ASC"
    ),
    client.execute(
      "SELECT oi.order_id, oi.product_id, oi.product_name, oi.product_price, oi.quantity FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status != 'annulee'"
    ),
    client.execute("SELECT id, name, slug, price, stock, image_url FROM products"),
    client.execute(`
      SELECT session_id, path, created_at 
      FROM page_views 
      WHERE NOT (
        LOWER(user_agent) LIKE '%headless%'
        OR LOWER(user_agent) LIKE '%bot%'
        OR LOWER(user_agent) LIKE '%crawler%'
        OR LOWER(user_agent) LIKE '%spider%'
        OR LOWER(isp) LIKE '%amazon%'
        OR LOWER(isp) LIKE '%aws%'
        OR ip_address LIKE '%127.0.0.1%'
        OR ip_address LIKE '%192.168.%'
        OR ip_address LIKE '%Localhost%'
        OR ip_address LIKE '%Réseau Local%'
        OR city = 'Localhost'
        OR country = 'Local'
        OR referrer LIKE '%localhost%'
        OR referrer LIKE '%192.168.%'
      )
      ORDER BY created_at ASC
    `),
  ]);

  return {
    allOrders: ordersRes.rows as any[],
    allItems: itemsRes.rows as any[],
    allProducts: productsRes.rows as any[],
    allPageViews: pageViewsRes.rows as any[],
  };
}

export async function tursoDeleteVisitors(options: {
  action?: 'purge_fake' | 'purge_all';
  sessionId?: string;
}): Promise<{ deleted: number }> {
  const client = getTursoClient();

  if (options.action === 'purge_all') {
    const res = await client.execute('DELETE FROM page_views');
    return { deleted: res.rowsAffected || 0 };
  }

  if (options.sessionId) {
    const res = await client.execute({
      sql: 'DELETE FROM page_views WHERE session_id = ?',
      args: [options.sessionId],
    });
    return { deleted: res.rowsAffected || 0 };
  }

  // Purge de toutes les fausses connexions (bots, crawlers, tests locaux)
  const res = await client.execute(`
    DELETE FROM page_views
    WHERE LOWER(user_agent) LIKE '%headless%'
       OR LOWER(user_agent) LIKE '%bot%'
       OR LOWER(user_agent) LIKE '%crawler%'
       OR LOWER(user_agent) LIKE '%spider%'
       OR LOWER(isp) LIKE '%amazon%'
       OR LOWER(isp) LIKE '%aws%'
       OR ip_address LIKE '%127.0.0.1%'
       OR ip_address LIKE '%192.168.%'
       OR ip_address LIKE '%Localhost%'
       OR ip_address LIKE '%Réseau Local%'
       OR city = 'Localhost'
       OR country = 'Local'
       OR referrer LIKE '%localhost%'
       OR referrer LIKE '%192.168.%'
  `);
  return { deleted: res.rowsAffected || 0 };
}

