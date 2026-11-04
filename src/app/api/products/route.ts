import { NextRequest, NextResponse } from 'next/server';
import { getDb, getActivePromotionForProduct, Product } from '@/lib/db';
import { isTursoEnabled, tursoGetProducts, tursoGetActivePromotion } from '@/lib/turso';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category')?.trim();
    const search = request.nextUrl.searchParams.get('search')?.trim();

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
    console.error('[API /api/products Error]:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Erreur interne lors de la récupération des produits',
        tursoEnabled: isTursoEnabled(),
      },
      { status: 500 }
    );
  }
}
