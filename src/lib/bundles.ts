/**
 * Configuration et règles de calcul des lots (Bundles)
 * Spécifications e-commerce Atelier Pro / AFRINOVA SHOP
 */

export type Bundle = {
  id: string;
  quantity: number;
  title: string;
  badge?: string;
  subtitle?: string;
  price: number;
  comparePrice?: number;
  tag?: string;
  freeGift?: string;
};

export type ProductLike = {
  id?: number;
  price?: number;
  name?: string;
  slug?: string;
  image_url?: string | null;
  [key: string]: unknown;
};

// Pourcentages de réduction par défaut (facilement modifiables)
export const BUNDLE_DISCOUNTS = {
  TIER_1: 0,       // 0% pour 1 article
  TIER_2: 0.10,    // -10% pour 2 articles
  TIER_3: 0.15,    // -15% pour 3 articles
};

// Configuration spécifique éventuelle par produit (slug ou id)
// Possibilité d'activer un cadeau offert (freeGift) sur certains lots
export const CUSTOM_PRODUCT_BUNDLES: Record<string, Array<Partial<Bundle>>> = {
  'montre-chronographe': [
    { id: 'x1', title: '1 article', subtitle: 'Achat unique', badge: 'Standard' },
    { id: 'x2', title: '2 articles', subtitle: 'Économisez sur deux articles', badge: '-10%', tag: 'Le plus populaire' },
    { id: 'x3', title: '3 articles', subtitle: 'Économisez sur trois articles', badge: '-15%', tag: 'Meilleur choix' },
  ],
};

/**
 * Retourne la liste des lots (Bundles) calculés pour un produit donné
 */
export function getBundles(product?: ProductLike | null): Bundle[] {
  const basePrice = Math.max(0, Math.round(Number(product?.price) || 0));

  if (basePrice <= 0) {
    // Lots de secours / démo si le produit n'a pas de prix défini
    return [
      {
        id: 'x1',
        quantity: 1,
        title: '1 article',
        badge: 'Standard',
        subtitle: 'Achat unique',
        price: 15000,
        comparePrice: 15000,
      },
      {
        id: 'x2',
        quantity: 2,
        title: '2 articles',
        badge: '-10%',
        subtitle: 'Économisez sur deux articles',
        price: 27000,
        comparePrice: 30000,
        tag: 'Le plus populaire',
      },
      {
        id: 'x3',
        quantity: 3,
        title: '3 articles',
        badge: '-15%',
        subtitle: 'Économisez sur trois articles',
        price: 38250,
        comparePrice: 45000,
        tag: 'Meilleur choix',
      },
    ];
  }

  // Calcul standard des 3 offres
  const p1 = basePrice;
  const c1 = basePrice;

  const c2 = basePrice * 2;
  const p2 = Math.round(c2 * (1 - BUNDLE_DISCOUNTS.TIER_2));

  const c3 = basePrice * 3;
  const p3 = Math.round(c3 * (1 - BUNDLE_DISCOUNTS.TIER_3));

  const slug = product?.slug ? String(product.slug) : '';
  const customConfig = slug && CUSTOM_PRODUCT_BUNDLES[slug] ? CUSTOM_PRODUCT_BUNDLES[slug] : null;

  const defaultBundles: Bundle[] = [
    {
      id: 'x1',
      quantity: 1,
      title: '1 article',
      badge: 'Standard',
      subtitle: 'Achat unique',
      price: p1,
      comparePrice: c1,
    },
    {
      id: 'x2',
      quantity: 2,
      title: '2 articles',
      badge: `-${Math.round(BUNDLE_DISCOUNTS.TIER_2 * 100)} %`,
      subtitle: 'Économisez sur deux articles',
      price: p2,
      comparePrice: c2,
      tag: 'Le plus populaire',
    },
    {
      id: 'x3',
      quantity: 3,
      title: '3 articles',
      badge: `-${Math.round(BUNDLE_DISCOUNTS.TIER_3 * 100)} %`,
      subtitle: 'Économisez sur trois articles',
      price: p3,
      comparePrice: c3,
      tag: 'Meilleur choix',
    },
  ];

  if (!customConfig) {
    return defaultBundles;
  }

  // Application des surcharges personnalisées
  return defaultBundles.map((bundle, index) => {
    const custom = customConfig[index];
    if (!custom) return bundle;
    return {
      ...bundle,
      ...custom,
      // Prix garanti recalculé si pas fixé manuellement
      price: typeof custom.price === 'number' ? custom.price : bundle.price,
      comparePrice: typeof custom.comparePrice === 'number' ? custom.comparePrice : bundle.comparePrice,
    };
  });
}

/**
 * Calcule de façon stricte et déterministe le prix serveur d'un lot pour un produit
 * Ignore tout montant venant du client.
 */
export function priceFor(product: ProductLike | null | undefined, bundleId?: string | null): number {
  const basePrice = Math.max(0, Math.round(Number(product?.price) || 0));
  if (basePrice <= 0) return 0;

  if (!bundleId) {
    return basePrice;
  }

  const bundles = getBundles(product);
  const matched = bundles.find((b) => b.id === bundleId);
  if (matched) {
    return matched.price;
  }

  // Si l'identifiant indique une quantité (ex: "x2", "x3", "2", "3")
  const matchQty = bundleId.match(/(\d+)/);
  if (matchQty) {
    const qty = parseInt(matchQty[1], 10);
    if (qty === 1) return basePrice;
    if (qty === 2) return Math.round(basePrice * 2 * (1 - BUNDLE_DISCOUNTS.TIER_2));
    if (qty === 3) return Math.round(basePrice * 3 * (1 - BUNDLE_DISCOUNTS.TIER_3));
    if (qty > 3) {
      // Au-delà de 3, appliquer la meilleure réduction
      return Math.round(basePrice * qty * (1 - BUNDLE_DISCOUNTS.TIER_3));
    }
  }

  return basePrice;
}
