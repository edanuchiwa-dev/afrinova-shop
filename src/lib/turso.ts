import { createClient, type Client } from '@libsql/client';
import { parseBeninPhone } from './phone.ts';
import { calculateServerShippingCost } from './shipping.ts';
import { sendOrderNotification } from './notifications.ts';
import { priceFor } from './bundles.ts';

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

export function isTursoEnabled(): boolean {
  const url = cleanEnvValue(process.env.TURSO_DATABASE_URL);
  return Boolean(url && url !== 'file:data/store.db');
}

export function getTursoClient(): Client {
  if (tursoClient) return tursoClient;

  const url = sanitizeUrl(process.env.TURSO_DATABASE_URL);
  const authToken = sanitizeToken(process.env.TURSO_AUTH_TOKEN);

  tursoClient = createClient({
    url,
    authToken,
  });

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
