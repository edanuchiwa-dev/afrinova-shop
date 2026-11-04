export type ProductPromotion = {
  id: number;
  name: string;
  original_price: number;
  promo_price: number;
  total_quota: number;
  consumed_quota: number;
  remaining_quota: number;
  show_remaining: boolean;
  start_date?: string | null;
  end_date?: string | null;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  image_url: string | null;
  weight_kg?: number;
  status?: string;
  created_at?: string;
  promotion?: ProductPromotion | null;
};

export const PRODUCT_GALLERIES: Record<string, string[]> = {
  'montre-chronographe': [
    '/images/products/montre-chronographe.jpg',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1000&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1000&q=80',
  ],
  'sacoche-cuir': [
    '/images/products/sacoche-cuir.jpg',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1000&q=80',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1000&q=80',
  ],
  'casque-audio-sans-fil': [
    '/images/products/casque-audio.jpg',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1000&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1000&q=80',
  ],
  'portefeuille-rfid': [
    '/images/products/portefeuille-rfid.jpg',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&q=80',
  ],
};

// Prix d'origine conseillé pour afficher la promotion boutique
export function getProductOriginalPrice(price: number): number {
  return Math.round((price * 1.25) / 100) * 100;
}

export function getProductDiscountBadge(price: number, originalPrice: number): string {
  if (originalPrice <= price) return '';
  const percent = Math.round(((originalPrice - price) / originalPrice) * 100);
  return `-${percent}%`;
}
