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
  bundle_style?: 'pill' | 'card' | string;
  promotion?: ProductPromotion | null;
};

export const PRODUCT_GALLERIES: Record<string, string[]> = {
  'montre-chronographe': [
    '/images/products/montre-chronographe.jpg',
  ],
  'sacoche-cuir': [
    '/images/products/sacoche-cuir.jpg',
  ],
  'casque-audio-sans-fil': [
    '/images/products/casque-audio.jpg',
  ],
  'portefeuille-rfid': [
    '/images/products/portefeuille-rfid.jpg',
  ],
};

export interface ProductSpec {
  label: string;
  value: string;
}

export const PRODUCT_SPECS: Record<string, ProductSpec[]> = {
  'montre-chronographe': [
    { label: 'Boîtier', value: 'Acier chirurgical inoxydable 316L (42 mm)' },
    { label: 'Mouvement', value: 'Mécanique automatique haute précision' },
    { label: 'Verre', value: 'Saphir inrayable avec traitement antireflet' },
    { label: 'Bracelet', value: 'Cuir véritable surpiqué avec boucle ardillon' },
    { label: 'Étanchéité', value: '5 ATM / 50 mètres (résiste à la pluie et aux éclaboussures)' },
    { label: 'Cadran', value: 'Index luminescents & compteurs chronographes' },
    { label: 'Poids', value: '118 g' },
  ],
  'sacoche-cuir': [
    { label: 'Matière', value: '100% Cuir de vachette pleine fleur tannage végétal' },
    { label: 'Fermoirs & Boucles', value: 'Laiton massif vieilli anticorrosion' },
    { label: 'Bandoulière', value: 'Ajustable et renforcée avec patte d\'épaule confort' },
    { label: 'Rangements', value: '1 compartiment central zippé + 2 poches plaquées + 1 poche arrière' },
    { label: 'Dimensions', value: '26 cm (H) x 21 cm (L) x 7 cm (P)' },
    { label: 'Compatibilité', value: 'Convient pour tablette 10 pouces, smartphone, portefeuille et clés' },
    { label: 'Poids', value: '620 g' },
  ],
  'casque-audio-sans-fil': [
    { label: 'Transducteurs', value: '40 mm dynamiques haute définition au béryllium' },
    { label: 'Réduction de bruit', value: 'ANC hybride active jusqu\'à -32 dB + Mode Transparence' },
    { label: 'Autonomie', value: 'Jusqu\'à 40 heures d\'écoute continue' },
    { label: 'Connectivité', value: 'Bluetooth 5.3 multipoint + Câble Jack 3.5 mm de secours inclus' },
    { label: 'Recharge', value: 'USB-C rapide (10 min de charge = 4h d\'écoute)' },
    { label: 'Confort', value: 'Coussinets circum-auriculaires en mousse à mémoire de forme' },
    { label: 'Poids', value: '245 g' },
  ],
  'portefeuille-rfid': [
    { label: 'Sécurité anti-vol', value: 'Blindage intégral certifié anti-piratage RFID / NFC' },
    { label: 'Capacité', value: '6 cartes dans l\'étui éjectable + 2 cartes intérieures + billets' },
    { label: 'Mécanisme', value: 'Gâchette d\'éjection rapide étagée' },
    { label: 'Matériaux', value: 'Aluminium aérospatial anodisé & Cuir véritable de finition' },
    { label: 'Dimensions', value: '10 cm x 6.5 cm x 1.5 cm (format ultra-compact)' },
    { label: 'Poids', value: '82 g' },
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
