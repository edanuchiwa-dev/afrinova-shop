import { NextRequest, NextResponse } from 'next/server';
import { getDb, getActivePromotionForProduct, Product } from '@/lib/db';
import { isTursoEnabled, tursoGetProducts, tursoGetActivePromotion } from '@/lib/turso';

export const runtime = 'nodejs';

const DEFAULT_FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'Montre Chronographe',
    slug: 'montre-chronographe',
    description: 'Montre chronographe élégante pour le quotidien.',
    price: 18900,
    compare_at_price: null,
    cost_per_item: null,
    stock: 8,
    sku: '',
    barcode: '',
    track_quantity: 1,
    continue_selling_out_of_stock: 0,
    category: 'Montres',
    image_url: '/images/products/montre-chronographe.jpg',
    media_urls: '[]',
    weight_kg: 0.5,
    is_physical: 1,
    vendor: 'AFRINOVA',
    tags: '',
    seo_title: '',
    seo_description: '',
    variants: '[]',
    sales_channels: '["online_store","whatsapp","ads"]',
    status: 'active',
    created_at: '2026-10-24 15:00:18',
    promotion: null,
  },
  {
    id: 2,
    name: 'Sacoche Cuir',
    slug: 'sacoche-cuir',
    description: 'Sacoche en cuir pratique et résistante.',
    price: 12900,
    compare_at_price: null,
    cost_per_item: null,
    stock: 9,
    sku: '',
    barcode: '',
    track_quantity: 1,
    continue_selling_out_of_stock: 0,
    category: 'Maroquinerie',
    image_url: '/images/products/sacoche-cuir.jpg',
    media_urls: '[]',
    weight_kg: 0.5,
    is_physical: 1,
    vendor: 'AFRINOVA',
    tags: '',
    seo_title: '',
    seo_description: '',
    variants: '[]',
    sales_channels: '["online_store","whatsapp","ads"]',
    status: 'active',
    created_at: '2026-10-24 15:00:18',
    promotion: null,
  },
  {
    id: 3,
    name: 'Casque Audio sans fil',
    slug: 'casque-audio-sans-fil',
    description: 'Casque audio sans fil confortable.',
    price: 14900,
    compare_at_price: null,
    cost_per_item: null,
    stock: 14,
    sku: '',
    barcode: '',
    track_quantity: 1,
    continue_selling_out_of_stock: 0,
    category: 'Audio',
    image_url: '/images/products/casque-audio.jpg',
    media_urls: '[]',
    weight_kg: 0.5,
    is_physical: 1,
    vendor: 'AFRINOVA',
    tags: '',
    seo_title: '',
    seo_description: '',
    variants: '[]',
    sales_channels: '["online_store","whatsapp","ads"]',
    status: 'active',
    created_at: '2026-10-24 15:00:18',
    promotion: null,
  },
  {
    id: 4,
    name: 'Portefeuille RFID',
    slug: 'portefeuille-rfid',
    description: 'Portefeuille avec protection RFID.',
    price: 4900,
    compare_at_price: null,
    cost_per_item: null,
    stock: 18,
    sku: '',
    barcode: '',
    track_quantity: 1,
    continue_selling_out_of_stock: 0,
    category: 'Maroquinerie',
    image_url: '/images/products/portefeuille-rfid.jpg',
    media_urls: '[]',
    weight_kg: 0.5,
    is_physical: 1,
    vendor: 'AFRINOVA',
    tags: '',
    seo_title: '',
    seo_description: '',
    variants: '[]',
    sales_channels: '["online_store","whatsapp","ads"]',
    status: 'active',
    created_at: '2026-10-24 15:00:18',
    promotion: {
      id: 1,
      name: 'Offre Spéciale — Quantité Limitée',
      original_price: 6100,
      promo_price: 4900,
      total_quota: 12,
      consumed_quota: 2,
      remaining_quota: 10,
      show_remaining: true,
      start_date: null,
      end_date: null,
    },
  },
];

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category')?.trim();
  const search = request.nextUrl.searchParams.get('search')?.trim();

  try {
    if (isTursoEnabled()) {
      const products = await tursoGetProducts(category, search);
      const enriched = await Promise.all(
        products.map(async (prod) => {
          const promo = await tursoGetActivePromotion(prod.id);
          return {
            ...prod,
            promotion: promo
              ? {
                  id: promo.id,
                  name: promo.name,
                  original_price: promo.original_price,
                  promo_price: promo.promo_price,
                  total_quota: promo.total_quota,
                  consumed_quota: promo.consumed_quota,
                  remaining_quota: Math.max(0, promo.total_quota - promo.consumed_quota),
                  show_remaining: promo.show_remaining === 1,
                  start_date: promo.start_date,
                  end_date: promo.end_date,
                }
              : null,
          };
        })
      );
      return NextResponse.json(enriched);
    }

    const conditions = ["status = 'active'"];
    const params: string[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
      const escaped = search.replace(/[\\%_]/g, '\\$&');
      params.push(`%${escaped}%`, `%${escaped}%`);
    }

    const db = getDb();
    const products = db
      .prepare(`SELECT * FROM products WHERE ${conditions.join(' AND ')} ORDER BY id`)
      .all(...params) as Product[];

    const enriched = products.map((prod) => {
      const promo = getActivePromotionForProduct(prod.id, db);
      return {
        ...prod,
        promotion: promo
          ? {
              id: promo.id,
              name: promo.name,
              original_price: promo.original_price,
              promo_price: promo.promo_price,
              total_quota: promo.total_quota,
              consumed_quota: promo.consumed_quota,
              remaining_quota: Math.max(0, promo.total_quota - promo.consumed_quota),
              show_remaining: promo.show_remaining === 1,
              start_date: promo.start_date,
              end_date: promo.end_date,
            }
          : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('[API /api/products Error, falling back to default catalog]:', error);
    let filtered = DEFAULT_FALLBACK_PRODUCTS;
    if (category) {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
    }
    return NextResponse.json(filtered, {
      headers: {
        'x-turso-error': encodeURIComponent(String(error?.message || error)),
      },
    });
  }
}
