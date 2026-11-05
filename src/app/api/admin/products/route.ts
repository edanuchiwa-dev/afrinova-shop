import { NextResponse } from 'next/server';
import { getDb, getProductById } from '@/lib/db';
import {
  isTursoEnabled,
  tursoGetProductById,
  tursoGetProductBySlug,
  tursoGetAllAdminProducts,
  tursoCreateProduct,
  tursoUpdateProduct,
  tursoDeleteProduct,
} from '@/lib/turso';

export const runtime = 'nodejs';

const productStatuses = new Set(['active', 'draft', 'archived']);

function formatSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get('id');

  if (idStr) {
    const id = Number(idStr);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }
    const product = isTursoEnabled() ? await tursoGetProductById(id) : getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }
    return NextResponse.json(product);
  }

  if (isTursoEnabled()) {
    try {
      const products = await tursoGetAllAdminProducts();
      return NextResponse.json(products);
    } catch (err) {
      console.warn('[Admin Products Turso GET warning]:', err);
    }
  }

  try {
    return NextResponse.json(getDb().prepare('SELECT * FROM products ORDER BY id DESC').all());
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const {
    name,
    slug: requestedSlug,
    description,
    price,
    compare_at_price,
    cost_per_item,
    stock,
    sku,
    barcode,
    track_quantity,
    continue_selling_out_of_stock,
    category,
    image_url,
    media_urls,
    weight_kg,
    is_physical,
    vendor,
    tags,
    seo_title,
    seo_description,
    variants,
    sales_channels,
    bundle_style,
    bundle_accent_color,
    status,
  } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Le nom du produit est obligatoire.' }, { status: 400 });
  }
  const numPrice = Number(price);
  if (!Number.isFinite(numPrice) || numPrice < 0) {
    return NextResponse.json({ error: 'Prix invalide (doit être un entier positif en FCFA).' }, { status: 400 });
  }
  const numStock = Number(stock ?? 0);
  if (!Number.isInteger(numStock) || numStock < 0) {
    return NextResponse.json({ error: 'Stock invalide.' }, { status: 400 });
  }

  const cat = typeof category === 'string' && category.trim() ? category.trim() : 'Général';
  const desc = typeof description === 'string' && description.trim() ? description.trim() : null;

  // Normalisation des médias
  let parsedMediaUrls: string[] = [];
  if (Array.isArray(media_urls)) {
    parsedMediaUrls = media_urls.map(String).filter((u) => u.trim().length > 0);
  } else if (typeof media_urls === 'string' && media_urls.trim()) {
    try {
      const parsed = JSON.parse(media_urls);
      if (Array.isArray(parsed)) parsedMediaUrls = parsed.map(String);
    } catch {
      parsedMediaUrls = [media_urls.trim()];
    }
  }

  let finalImageUrl: string | null = null;
  if (typeof image_url === 'string' && image_url.trim()) {
    finalImageUrl = image_url.trim();
  } else if (parsedMediaUrls.length > 0) {
    finalImageUrl = parsedMediaUrls[0];
  }

  const numComparePrice = compare_at_price !== undefined && compare_at_price !== null && compare_at_price !== ''
    ? Math.round(Number(compare_at_price))
    : null;
  const numCostPerItem = cost_per_item !== undefined && cost_per_item !== null && cost_per_item !== ''
    ? Math.round(Number(cost_per_item))
    : null;

  const cleanSku = typeof sku === 'string' ? sku.trim() : '';
  const cleanBarcode = typeof barcode === 'string' ? barcode.trim() : '';
  const cleanTrackQty = track_quantity === false || track_quantity === 0 ? 0 : 1;
  const cleanContinueSelling = continue_selling_out_of_stock ? 1 : 0;
  const cleanWeight = typeof weight_kg === 'number' && weight_kg >= 0 ? weight_kg : 0.5;
  const cleanIsPhysical = is_physical === false || is_physical === 0 ? 0 : 1;
  const cleanVendor = typeof vendor === 'string' ? vendor.trim() : '';

  let cleanTags = '';
  if (Array.isArray(tags)) {
    cleanTags = tags.map(String).join(', ');
  } else if (typeof tags === 'string') {
    cleanTags = tags.trim();
  }

  const cleanSeoTitle = typeof seo_title === 'string' ? seo_title.trim() : '';
  const cleanSeoDesc = typeof seo_description === 'string' ? seo_description.trim() : '';

  const cleanVariants = typeof variants === 'string' ? variants : JSON.stringify(variants || []);
  const cleanSalesChannels = typeof sales_channels === 'string' ? sales_channels : JSON.stringify(sales_channels || ['online_store', 'whatsapp', 'ads']);
  const cleanBundleStyle = bundle_style === 'pill' ? 'pill' : 'card';
  const cleanBundleAccentColor = typeof bundle_accent_color === 'string' && bundle_accent_color.trim() ? bundle_accent_color.trim() : null;
  const prodStatus = typeof status === 'string' && productStatuses.has(status) ? status : 'active';

  let baseSlug = typeof requestedSlug === 'string' && requestedSlug.trim()
    ? formatSlug(requestedSlug)
    : formatSlug(name);
  if (!baseSlug) baseSlug = 'produit';

  let finalSlug = baseSlug;
  let counter = 1;

  if (isTursoEnabled()) {
    while (await tursoGetProductBySlug(finalSlug)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    try {
      const tursoCreated = await tursoCreateProduct({
        name: name.trim(),
        slug: finalSlug,
        description: desc,
        price: Math.round(numPrice),
        compare_at_price: numComparePrice,
        cost_per_item: numCostPerItem,
        stock: numStock,
        sku: cleanSku,
        barcode: cleanBarcode,
        track_quantity: cleanTrackQty,
        continue_selling_out_of_stock: cleanContinueSelling,
        category: cat,
        image_url: finalImageUrl,
        media_urls: JSON.stringify(parsedMediaUrls),
        weight_kg: cleanWeight,
        is_physical: cleanIsPhysical,
        vendor: cleanVendor,
        tags: cleanTags,
        seo_title: cleanSeoTitle,
        seo_description: cleanSeoDesc,
        variants: cleanVariants,
        sales_channels: cleanSalesChannels,
        bundle_style: cleanBundleStyle,
        bundle_accent_color: cleanBundleAccentColor,
        status: prodStatus,
      });

      // Synchronisation locale optionnelle si SQLite est accessible
      try {
        const db = getDb();
        db.prepare(`
          INSERT OR REPLACE INTO products (
            id, name, slug, description, price, compare_at_price, cost_per_item,
            stock, sku, barcode, track_quantity, continue_selling_out_of_stock,
            category, image_url, media_urls, weight_kg, is_physical, vendor,
            tags, seo_title, seo_description, variants, sales_channels, bundle_style, bundle_accent_color, status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          tursoCreated.id,
          name.trim(),
          finalSlug,
          desc,
          Math.round(numPrice),
          numComparePrice,
          numCostPerItem,
          numStock,
          cleanSku,
          cleanBarcode,
          cleanTrackQty,
          cleanContinueSelling,
          cat,
          finalImageUrl,
          JSON.stringify(parsedMediaUrls),
          cleanWeight,
          cleanIsPhysical,
          cleanVendor,
          cleanTags,
          cleanSeoTitle,
          cleanSeoDesc,
          cleanVariants,
          cleanSalesChannels,
          cleanBundleStyle,
          cleanBundleAccentColor,
          prodStatus
        );
      } catch {
        // Ignorer si filesystem read-only sur serverless
      }

      return NextResponse.json(tursoCreated, { status: 201 });
    } catch (tursoErr) {
      console.error('[Turso Create Product Error]:', tursoErr);
      return NextResponse.json({ error: 'Erreur lors de la création du produit sur Turso Cloud.' }, { status: 500 });
    }
  }

  // SQLite local si Turso non configuré
  const db = getDb();
  while (db.prepare('SELECT id FROM products WHERE slug = ?').get(finalSlug)) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  const result = db.prepare(`
    INSERT INTO products (
      name, slug, description, price, compare_at_price, cost_per_item,
      stock, sku, barcode, track_quantity, continue_selling_out_of_stock,
      category, image_url, media_urls, weight_kg, is_physical, vendor,
      tags, seo_title, seo_description, variants, sales_channels, bundle_style, bundle_accent_color, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    finalSlug,
    desc,
    Math.round(numPrice),
    numComparePrice,
    numCostPerItem,
    numStock,
    cleanSku,
    cleanBarcode,
    cleanTrackQty,
    cleanContinueSelling,
    cat,
    finalImageUrl,
    JSON.stringify(parsedMediaUrls),
    cleanWeight,
    cleanIsPhysical,
    cleanVendor,
    cleanTags,
    cleanSeoTitle,
    cleanSeoDesc,
    cleanVariants,
    cleanSalesChannels,
    cleanBundleStyle,
    cleanBundleAccentColor,
    prodStatus
  );

  const newProd = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(newProd, { status: 201 });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const {
    id,
    name,
    slug: requestedSlug,
    description,
    category,
    image_url,
    media_urls,
    stock,
    price,
    prix,
    compare_at_price,
    cost_per_item,
    sku,
    barcode,
    track_quantity,
    continue_selling_out_of_stock,
    weight_kg,
    is_physical,
    vendor,
    tags,
    seo_title,
    seo_description,
    variants,
    sales_channels,
    bundle_style,
    bundle_accent_color,
    status,
    statut,
  } = body as Record<string, unknown>;

  const newPrice = price ?? prix;
  const newStatus = status ?? statut;

  if (!Number.isSafeInteger(id) || (id as number) <= 0) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined && typeof name === 'string' && name.trim()) {
    fields.push('name = ?');
    values.push(name.trim());
  }

  if (requestedSlug !== undefined && typeof requestedSlug === 'string' && requestedSlug.trim()) {
    const formatted = formatSlug(requestedSlug);
    if (formatted) {
      fields.push('slug = ?');
      values.push(formatted);
    }
  }

  if (description !== undefined) {
    fields.push('description = ?');
    values.push(typeof description === 'string' ? description.trim() : '');
  }

  if (category !== undefined && typeof category === 'string' && category.trim()) {
    fields.push('category = ?');
    values.push(category.trim());
  }

  if (image_url !== undefined) {
    fields.push('image_url = ?');
    values.push(typeof image_url === 'string' ? image_url.trim() : null);
  }

  if (media_urls !== undefined) {
    let parsedMediaUrls: string[] = [];
    if (Array.isArray(media_urls)) {
      parsedMediaUrls = media_urls.map(String).filter((u) => u.trim().length > 0);
    } else if (typeof media_urls === 'string' && media_urls.trim()) {
      try {
        const parsed = JSON.parse(media_urls);
        if (Array.isArray(parsed)) parsedMediaUrls = parsed.map(String);
      } catch {
        parsedMediaUrls = [media_urls.trim()];
      }
    }
    fields.push('media_urls = ?');
    values.push(JSON.stringify(parsedMediaUrls));

    if (image_url === undefined && parsedMediaUrls.length > 0) {
      fields.push('image_url = ?');
      values.push(parsedMediaUrls[0]);
    }
  }

  if (stock !== undefined) {
    const numStock = Number(stock);
    if (!Number.isInteger(numStock) || numStock < 0) {
      return NextResponse.json({ error: 'Stock invalide.' }, { status: 400 });
    }
    fields.push('stock = ?');
    values.push(numStock);
  }

  if (newPrice !== undefined) {
    const numPrice = Number(newPrice);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      return NextResponse.json({ error: 'Prix invalide.' }, { status: 400 });
    }
    fields.push('price = ?');
    values.push(Math.round(numPrice));
  }

  if (compare_at_price !== undefined) {
    const numCompare = compare_at_price !== null && compare_at_price !== '' ? Math.round(Number(compare_at_price)) : null;
    fields.push('compare_at_price = ?');
    values.push(numCompare);
  }

  if (cost_per_item !== undefined) {
    const numCost = cost_per_item !== null && cost_per_item !== '' ? Math.round(Number(cost_per_item)) : null;
    fields.push('cost_per_item = ?');
    values.push(numCost);
  }

  if (sku !== undefined) {
    fields.push('sku = ?');
    values.push(typeof sku === 'string' ? sku.trim() : '');
  }

  if (barcode !== undefined) {
    fields.push('barcode = ?');
    values.push(typeof barcode === 'string' ? barcode.trim() : '');
  }

  if (track_quantity !== undefined) {
    fields.push('track_quantity = ?');
    values.push(track_quantity === false || track_quantity === 0 ? 0 : 1);
  }

  if (continue_selling_out_of_stock !== undefined) {
    fields.push('continue_selling_out_of_stock = ?');
    values.push(continue_selling_out_of_stock ? 1 : 0);
  }

  if (weight_kg !== undefined) {
    fields.push('weight_kg = ?');
    values.push(typeof weight_kg === 'number' && weight_kg >= 0 ? weight_kg : 0.5);
  }

  if (is_physical !== undefined) {
    fields.push('is_physical = ?');
    values.push(is_physical === false || is_physical === 0 ? 0 : 1);
  }

  if (vendor !== undefined) {
    fields.push('vendor = ?');
    values.push(typeof vendor === 'string' ? vendor.trim() : '');
  }

  if (tags !== undefined) {
    let cleanTags = '';
    if (Array.isArray(tags)) {
      cleanTags = tags.map(String).join(', ');
    } else if (typeof tags === 'string') {
      cleanTags = tags.trim();
    }
    fields.push('tags = ?');
    values.push(cleanTags);
  }

  if (seo_title !== undefined) {
    fields.push('seo_title = ?');
    values.push(typeof seo_title === 'string' ? seo_title.trim() : '');
  }

  if (seo_description !== undefined) {
    fields.push('seo_description = ?');
    values.push(typeof seo_description === 'string' ? seo_description.trim() : '');
  }

  if (variants !== undefined) {
    const cleanVariants = typeof variants === 'string' ? variants : JSON.stringify(variants);
    fields.push('variants = ?');
    values.push(cleanVariants);
  }

  if (sales_channels !== undefined) {
    const cleanSalesChannels = typeof sales_channels === 'string' ? sales_channels : JSON.stringify(sales_channels);
    fields.push('sales_channels = ?');
    values.push(cleanSalesChannels);
  }

  if (bundle_style !== undefined) {
    fields.push('bundle_style = ?');
    values.push(bundle_style === 'pill' ? 'pill' : 'card');
  }

  if (bundle_accent_color !== undefined) {
    fields.push('bundle_accent_color = ?');
    values.push(typeof bundle_accent_color === 'string' && bundle_accent_color.trim() ? bundle_accent_color.trim() : null);
  }

  if (newStatus !== undefined) {
    if (!productStatuses.has(newStatus as string)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    }
    fields.push('status = ?');
    values.push(newStatus as string);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'Aucun champ à modifier.' }, { status: 400 });
  }

  // Si Turso est activé
  if (isTursoEnabled()) {
    try {
      const tursoUpdated = await tursoUpdateProduct(id as number, fields, values);
      if (tursoUpdated) {
        try {
          const db = getDb();
          const localValues = [...values, id as number];
          db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...localValues);
        } catch {}
        return NextResponse.json(tursoUpdated);
      }
    } catch (tursoErr) {
      console.warn('[Turso Update Product Warning]:', tursoErr);
    }
  }

  try {
    const db = getDb();
    const localValues = [...values, id as number];
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...localValues);
    return NextResponse.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur lors de la mise à jour.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get('id');
  const id = Number(idStr);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  if (isTursoEnabled()) {
    try {
      const tursoRes = await tursoDeleteProduct(id);
      try {
        const db = getDb();
        if (tursoRes.archived) {
          db.prepare("UPDATE products SET status = 'archived' WHERE id = ?").run(id);
        } else {
          db.prepare('DELETE FROM products WHERE id = ?').run(id);
        }
      } catch {}

      if (tursoRes.archived) {
        return NextResponse.json({ success: true, archived: true, message: 'Produit archivé (présent dans des commandes existantes).' });
      } else {
        return NextResponse.json({ success: true, deleted: true, message: 'Produit supprimé définitivement.' });
      }
    } catch (tursoErr) {
      console.warn('[Turso Delete Product Warning]:', tursoErr);
    }
  }

  try {
    const db = getDb();
    const inOrders = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(id) as { count: number };
    if (inOrders && inOrders.count > 0) {
      db.prepare("UPDATE products SET status = 'archived' WHERE id = ?").run(id);
      return NextResponse.json({ success: true, archived: true, message: 'Produit archivé (présent dans des commandes existantes).' });
    } else {
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
      return NextResponse.json({ success: true, deleted: true, message: 'Produit supprimé définitivement.' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
