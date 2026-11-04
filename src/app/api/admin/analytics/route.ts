import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

type OrderRow = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_price: number;
  shipping_city: string;
  carrier: string;
  status: string;
  payment_method?: string;
  utm_source: string;
  utm_campaign: string;
  created_at: string;
};

type ItemRow = {
  order_id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d'; // 'today' | '7d' | '30d' | '90d' | 'ytd'

  const db = getDb();
  const allOrders = db.prepare(`
    SELECT id, order_number, customer_name, customer_phone, total_price, shipping_city, carrier, status, payment_method, utm_source, utm_campaign, created_at 
    FROM orders 
    ORDER BY created_at ASC
  `).all() as OrderRow[];

  const allItems = db.prepare(`
    SELECT oi.order_id, oi.product_id, oi.product_name, oi.product_price, oi.quantity 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'annulee'
  `).all() as ItemRow[];

  const allProducts = db.prepare('SELECT id, name, slug, price, stock, image_url FROM products').all() as Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    stock: number;
    image_url: string | null;
  }>;

  // Calcul strict des dates
  const now = new Date();
  let daysCount = 7;
  let intervalType: 'hour' | 'day' = 'day';

  if (range === 'today') {
    daysCount = 1;
    intervalType = 'hour';
  } else if (range === '7d') {
    daysCount = 7;
    intervalType = 'day';
  } else if (range === '30d') {
    daysCount = 30;
    intervalType = 'day';
  } else if (range === '90d') {
    daysCount = 90;
    intervalType = 'day';
  } else if (range === 'ytd') {
    daysCount = 120;
    intervalType = 'day';
  }

  // Grille temporelle
  type TimePoint = {
    date: string;
    label: string;
    sales: number;
    orders: number;
    visitors: number;
    pageviews: number;
    prevSales: number;
    prevOrders: number;
    prevVisitors: number;
  };

  const points: TimePoint[] = [];
  const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  if (intervalType === 'hour') {
    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0') + 'h';
      points.push({
        date: `${h}:00`,
        label: hStr,
        sales: 0,
        orders: 0,
        visitors: 0,
        pageviews: 0,
        prevSales: 0,
        prevOrders: 0,
        prevVisitors: 0,
      });
    }
  } else {
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      points.push({
        date: iso,
        label,
        sales: 0,
        orders: 0,
        visitors: 0,
        pageviews: 0,
        prevSales: 0,
        prevOrders: 0,
        prevVisitors: 0,
      });
    }
  }

  const periodDurationMs = daysCount * 24 * 60 * 60 * 1000;
  const currentStartMs = now.getTime() - periodDurationMs;
  const prevStartMs = currentStartMs - periodDurationMs;

  let currentSales = 0;
  let currentOrdersCount = 0;
  let prevSales = 0;
  let prevOrdersCount = 0;

  const validOrders = allOrders.filter((o) => o.status !== 'annulee');

  for (const o of validOrders) {
    const oDate = new Date(o.created_at);
    const oTime = oDate.getTime();

    // Période courante
    if (oTime >= currentStartMs && oTime <= now.getTime()) {
      currentSales += o.total_price;
      currentOrdersCount += 1;

      if (intervalType === 'hour') {
        const hour = oDate.getHours();
        if (points[hour]) {
          points[hour].sales += o.total_price;
          points[hour].orders += 1;
        }
      } else {
        const iso = oDate.toISOString().slice(0, 10);
        const pt = points.find((p) => p.date === iso);
        if (pt) {
          pt.sales += o.total_price;
          pt.orders += 1;
        }
      }
    }
    // Période précédente
    else if (oTime >= prevStartMs && oTime < currentStartMs) {
      prevSales += o.total_price;
      prevOrdersCount += 1;

      if (intervalType === 'hour') {
        const hour = oDate.getHours();
        if (points[hour]) {
          points[hour].prevSales += o.total_price;
          points[hour].prevOrders += 1;
        }
      } else {
        const diffDays = Math.floor((currentStartMs - oTime) / (24 * 3600 * 1000));
        const targetIdx = points.length - 1 - diffDays;
        if (targetIdx >= 0 && targetIdx < points.length) {
          points[targetIdx].prevSales += o.total_price;
          points[targetIdx].prevOrders += 1;
        }
      }
    }
  }

  // Requête des visites (page_views)
  const allPageViews = db.prepare(`
    SELECT session_id, path, created_at 
    FROM page_views 
    ORDER BY created_at ASC
  `).all() as Array<{ session_id: string; path: string; created_at: string }>;

  const currentVisitorSessions = new Set<string>();
  const prevVisitorSessions = new Set<string>();
  let currentPageViews = 0;

  // Calcul du trafic et sessions pour la grille temporelle
  for (const pv of allPageViews) {
    const pvDate = new Date(pv.created_at);
    const pvTime = pvDate.getTime();

    if (pvTime >= currentStartMs && pvTime <= now.getTime()) {
      currentVisitorSessions.add(pv.session_id);
      currentPageViews += 1;

      if (intervalType === 'hour') {
        const hour = pvDate.getHours();
        if (points[hour]) {
          points[hour].pageviews += 1;
          points[hour].visitors += 1;
        }
      } else {
        const iso = pvDate.toISOString().slice(0, 10);
        const pt = points.find((p) => p.date === iso);
        if (pt) {
          pt.pageviews += 1;
          pt.visitors += 1;
        }
      }
    } else if (pvTime >= prevStartMs && pvTime < currentStartMs) {
      prevVisitorSessions.add(pv.session_id);

      if (intervalType === 'hour') {
        const hour = pvDate.getHours();
        if (points[hour]) {
          points[hour].prevVisitors += 1;
        }
      } else {
        const diffDays = Math.floor((currentStartMs - pvTime) / (24 * 3600 * 1000));
        const targetIdx = points.length - 1 - diffDays;
        if (targetIdx >= 0 && targetIdx < points.length) {
          points[targetIdx].prevVisitors += 1;
        }
      }
    }
  }

  const currentVisitorsCount = Math.max(currentVisitorSessions.size, currentOrdersCount);
  const prevVisitorsCount = prevVisitorSessions.size;
  const visitorsChangePercent = prevVisitorsCount > 0 ? Math.round(((currentVisitorsCount - prevVisitorsCount) / prevVisitorsCount) * 100) : (currentVisitorsCount > 0 ? 100 : 0);

  // Taux de conversion exact
  const conversionRate = currentVisitorsCount > 0 ? Number(((currentOrdersCount / currentVisitorsCount) * 100).toFixed(1)) : 0;
  const prevConversionRate = prevVisitorsCount > 0 ? Number(((prevOrdersCount / prevVisitorsCount) * 100).toFixed(1)) : 0;
  const conversionRateChange = prevConversionRate > 0 ? Number((conversionRate - prevConversionRate).toFixed(1)) : (conversionRate > 0 ? conversionRate : 0);

  // Pourcentages de variation stricts et réels
  const salesChangePercent = prevSales > 0 ? Math.round(((currentSales - prevSales) / prevSales) * 100) : (currentSales > 0 ? 100 : 0);
  const ordersChangePercent = prevOrdersCount > 0 ? Math.round(((currentOrdersCount - prevOrdersCount) / prevOrdersCount) * 100) : (currentOrdersCount > 0 ? 100 : 0);

  const currentAov = currentOrdersCount > 0 ? Math.round(currentSales / currentOrdersCount) : 0;
  const prevAov = prevOrdersCount > 0 ? Math.round(prevSales / prevOrdersCount) : 0;
  const aovChangePercent = prevAov > 0 ? Math.round(((currentAov - prevAov) / prevAov) * 100) : (currentAov > 0 ? 100 : 0);

  // Clients récurrents (calcul réel basé sur le téléphone ou nom du client)
  const customerCounts = new Map<string, number>();
  for (const o of validOrders) {
    const key = o.customer_phone || o.customer_name;
    customerCounts.set(key, (customerCounts.get(key) || 0) + 1);
  }
  const returningCount = Array.from(customerCounts.values()).filter((c) => c > 1).length;
  const totalUniqueCustomers = customerCounts.size;
  const returningCustomerRate = totalUniqueCustomers > 0 ? Math.round((returningCount / totalUniqueCustomers) * 100) : 0;

  // Meilleurs produits vendus (calculé STRICTEMENT sur order_items réels)
  const productSalesMap = new Map<string, { name: string; units: number; revenue: number; image: string | null }>();

  for (const it of allItems) {
    const existing = productSalesMap.get(it.product_name) || {
      name: it.product_name,
      units: 0,
      revenue: 0,
      image: null,
    };
    existing.units += it.quantity;
    existing.revenue += it.product_price * it.quantity;
    productSalesMap.set(it.product_name, existing);
  }

  // Association avec l'image du catalogue si disponible
  for (const prod of allProducts) {
    for (const [name, entry] of productSalesMap.entries()) {
      if (name.toLowerCase().includes(prod.name.toLowerCase()) || prod.name.toLowerCase().includes(name.toLowerCase())) {
        entry.image = prod.image_url;
      }
    }
  }

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => {
      const share = currentSales > 0 ? Math.min(100, Math.round((p.revenue / currentSales) * 100)) : 0;
      return {
        ...p,
        share,
      };
    });

  // Ventes par canal et source marketing réelle (basé STRICTEMENT sur orders.utm_source et carrier)
  const channelMap = new Map<string, { label: string; revenue: number; orders: number; color: string }>();

  for (const o of validOrders) {
    const src = (o.utm_source || '').trim().toLowerCase();
    let key = 'Direct';
    let label = 'Boutique directe & Organique';
    let color = '#2c6ecb'; // Shopify blue

    if (src.includes('facebook') || src.includes('meta') || src.includes('instagram')) {
      key = 'Facebook';
      label = 'Meta (Facebook / Instagram)';
      color = '#1877f2';
    } else if (src.includes('tiktok')) {
      key = 'TikTok';
      label = 'TikTok Ads';
      color = '#000000';
    } else if (src.includes('whatsapp')) {
      key = 'WhatsApp';
      label = 'WhatsApp Direct';
      color = '#25d366';
    } else if (src) {
      key = src;
      label = `Campagne : ${src.toUpperCase()}`;
      color = '#8c9196';
    }

    const current = channelMap.get(key) || { label, revenue: 0, orders: 0, color };
    current.revenue += o.total_price;
    current.orders += 1;
    channelMap.set(key, current);
  }

  const channelsArray = Array.from(channelMap.entries()).map(([key, item]) => {
    const totalAllChannels = validOrders.reduce((sum, o) => sum + o.total_price, 0);
    const share = totalAllChannels > 0 ? Math.round((item.revenue / totalAllChannels) * 100) : 0;
    return {
      key,
      label: item.label,
      revenue: item.revenue,
      orders: item.orders,
      color: item.color,
      share,
    };
  });

  // Ventes par destination de livraison (Villes réelles enregistrées)
  const cityMap = new Map<string, { name: string; revenue: number; count: number }>();
  for (const o of validOrders) {
    const city = o.shipping_city.trim() || 'Non spécifié';
    const cur = cityMap.get(city) || { name: city, revenue: 0, count: 0 };
    cur.revenue += o.total_price;
    cur.count += 1;
    cityMap.set(city, cur);
  }

  const totalAllSales = validOrders.reduce((sum, o) => sum + o.total_price, 0);
  const geographicArray = Array.from(cityMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      revenue: c.revenue,
      count: c.count,
      share: totalAllSales > 0 ? Math.round((c.revenue / totalAllSales) * 100) : 0,
    }));

  // Statuts réels de traitement des commandes (Fulfillment status Shopify)
  const fulfillmentStatus = {
    unfulfilled: allOrders.filter((o) => o.status === 'nouvelle' || o.status === 'en_preparation').length,
    fulfilled: allOrders.filter((o) => o.status === 'expediee' || o.status === 'livree').length,
    cancelled: allOrders.filter((o) => o.status === 'annulee').length,
    total: allOrders.length,
  };

  return NextResponse.json({
    range,
    kpis: {
      totalSales: currentSales,
      totalSalesChange: salesChangePercent,
      prevSales,
      totalOrders: currentOrdersCount,
      totalOrdersChange: ordersChangePercent,
      prevOrders: prevOrdersCount,
      aov: currentAov,
      aovChange: aovChangePercent,
      prevAov,
      returningCustomerRate,
      uniqueCustomers: totalUniqueCustomers,
      returningCustomers: returningCount,
      totalVisitors: currentVisitorsCount,
      totalVisitorsChange: visitorsChangePercent,
      prevVisitors: prevVisitorsCount,
      totalPageViews: currentPageViews,
      conversionRate,
      conversionRateChange,
      prevConversionRate,
    },
    timeSeries: points,
    topProducts,
    channels: channelsArray,
    geography: geographicArray,
    fulfillmentStatus,
  });
}
