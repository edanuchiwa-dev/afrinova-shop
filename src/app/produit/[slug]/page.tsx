'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Truck,
  Banknote,
  ShieldCheck,
  Phone,
  MessageCircle,
  ZoomIn,
  Info,
  Sparkles,
  ArrowRight,
  Star,
  CheckCircle2,
  ThumbsUp,
  X,
  Check,
  Heart,
  MessageSquareQuote,
} from 'lucide-react';
import AnnouncementBar from '@/components/AnnouncementBar';
import ProductCard from '@/components/ProductCard';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import QuantityBreaksWidget from '@/components/QuantityBreaksWidget';
import { formatFCFA } from '@/lib/format';
import { captureUtmParams } from '@/lib/utm';
import { BENIN_CITIES, calculateServerShippingCost } from '@/lib/shipping';
import { parseBeninPhone } from '@/lib/phone';
import { trackPixelPurchase, trackPixelViewContent } from '@/lib/tracking/client-pixels';
import {
  Product,
  PRODUCT_GALLERIES,
  getProductOriginalPrice,
  getProductDiscountBadge,
} from '@/lib/catalog';
import { Review } from '@/lib/db';

const fallbackCatalog: Record<string, Product> = {
  'montre-chronographe': {
    id: 1,
    name: 'Montre Chronographe Automatique',
    slug: 'montre-chronographe',
    description: 'Boîtier en acier chirurgical 316L, mouvement automatique haute précision, verre saphir inrayable et bracelet en cuir surpiqué. Conçue pour durer une vie.',
    price: 18900,
    stock: 11,
    category: 'Montres',
    image_url: '/images/products/montre-chronographe.jpg',
  },
  'sacoche-cuir': {
    id: 2,
    name: 'Sacoche Cuir Véritable Vintage',
    slug: 'sacoche-cuir',
    description: 'Cuir pleine fleur tannage végétal, coutures renforcées au fil de lin ciré, rangements intérieurs doublés et boucle en laiton massif vieilli.',
    price: 12900,
    stock: 9,
    category: 'Maroquinerie',
    image_url: '/images/products/sacoche-cuir.jpg',
  },
  'casque-audio-sans-fil': {
    id: 3,
    name: 'Casque Audio Sans Fil Hi-Fi Réduction de Bruit',
    slug: 'casque-audio-sans-fil',
    description: 'Transducteurs 40mm au béryllium, réduction active de bruit hybride ultra-performante, coussinets à mémoire de forme et autonomie de 40 heures.',
    price: 14900,
    stock: 15,
    category: 'Audio',
    image_url: '/images/products/casque-audio.jpg',
  },
  'portefeuille-rfid': {
    id: 4,
    name: 'Portefeuille Minimaliste Anti-RFID',
    slug: 'portefeuille-rfid',
    description: 'Aluminium anodisé aérospatial et cuir véritable, mécanisme d\'éjection rapide 6 cartes et blindage anti-piratage sans contact certifié.',
    price: 4900,
    stock: 20,
    category: 'Maroquinerie',
    image_url: '/images/products/portefeuille-rfid.jpg',
  },
};

function formatReviewDate(dateStr: string): string {
  try {
    const cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const date = new Date(cleanStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 14) return 'Il y a 1 semaine';
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  } catch {
    return 'Récemment';
  }
}

function getReviewInitials(name: string): string {
  if (!name) return 'CL';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
}

const AVATAR_PALETTES = [
  'bg-amber-100 text-amber-900 border-amber-200/80',
  'bg-emerald-100 text-emerald-900 border-emerald-200/80',
  'bg-sky-100 text-sky-900 border-sky-200/80',
  'bg-rose-100 text-rose-900 border-rose-200/80',
  'bg-violet-100 text-violet-900 border-violet-200/80',
  'bg-teal-100 text-teal-900 border-teal-200/80',
  'bg-orange-100 text-orange-900 border-orange-200/80',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';

  const [product, setProduct] = useState<Product | null>(() => fallbackCatalog[slug] || null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!fallbackCatalog[slug]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [qbSettings, setQbSettings] = useState<{
    popularTier: number;
    enabled: boolean;
    template: 'modern' | 'prestige' | 'compact';
    accentColor: string;
    customLabels: {
      tier1Label?: string;
      tier2Label?: string;
      tier3Label?: string;
      tier2Subtitle?: string;
      tier3Subtitle?: string;
      tier2Badge?: string;
      tier3Badge?: string;
    };
  }>({
    popularTier: 2,
    enabled: true,
    template: 'modern',
    accentColor: '#C27835',
    customLabels: {},
  });

  // Formulaire de commande ultra-simplifié (STRICTEMENT 3 champs obligatoires)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // États de soumission
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState<{
    orderNumber: string;
    totalPrice: number;
    shippingCost: number;
    shippingCity: string;
    phoneNotice?: string;
    promoUnits?: number;
    normalUnits?: number;
    savings?: number;
  } | null>(null);

  useEffect(() => {
    captureUtmParams();
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : []))
      .then((items: Product[]) => {
        setAllProducts(items);
        const found = items.find((p) => p.slug === slug);
        if (found) {
          setProduct(found);
          trackPixelViewContent({ id: found.id, name: found.name, price: found.price });
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        if (fallbackCatalog[slug]) {
          trackPixelViewContent({
            id: fallbackCatalog[slug].id,
            name: fallbackCatalog[slug].name,
            price: fallbackCatalog[slug].price,
          });
        }
      });
  }, [slug]);

  // Chargement des paramètres Quantity Breaks
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setQbSettings({
            popularTier: Number(data.qb_popular_tier) || 2,
            enabled: data.qb_enabled !== '0',
            template: (data.qb_template as 'modern' | 'prestige' | 'compact') || 'modern',
            accentColor: data.qb_accent_color || '#C27835',
            customLabels: {
              tier1Label: data.qb_tier1_label,
              tier2Label: data.qb_tier2_label,
              tier3Label: data.qb_tier3_label,
              tier2Subtitle: data.qb_tier2_subtitle,
              tier3Subtitle: data.qb_tier3_subtitle,
              tier2Badge: data.qb_tier2_badge,
              tier3Badge: data.qb_tier3_badge,
            },
          });
        }
      })
      .catch(() => {});
  }, []);

  // Promotion active issue de la base de données
  const promo = useMemo(() => {
    if (!product?.promotion) return null;
    if (product.promotion.remaining_quota <= 0) return null;
    return product.promotion;
  }, [product]);

  const isPromoActive = !!promo;

  // Règle de split déterministe pour multi-unités
  const remainingPromoUnits = promo ? promo.remaining_quota : 0;
  const promoUnitsInOrder = isPromoActive ? Math.min(orderQuantity, remainingPromoUnits) : 0;
  const normalUnitsInOrder = orderQuantity - promoUnitsInOrder;

  const promoUnitPrice = promo ? promo.promo_price : (product?.price || 0);
  const normalUnitPrice = product?.price || 0;
  const regularReferencePrice = promo
    ? (promo.original_price || normalUnitPrice)
    : (product ? getProductOriginalPrice(product.price) : 0);

  const discountPercent = useMemo(() => {
    if (!promo || regularReferencePrice <= promo.promo_price) return 0;
    return Math.round(((regularReferencePrice - promo.promo_price) / regularReferencePrice) * 100);
  }, [promo, regularReferencePrice]);

  const currentSubtotal = useMemo(() => {
    if (!product) return 0;
    if (!isPromoActive) return product.price * orderQuantity;
    return promoUnitsInOrder * promoUnitPrice + normalUnitsInOrder * normalUnitPrice;
  }, [product, isPromoActive, promoUnitsInOrder, promoUnitPrice, normalUnitsInOrder, normalUnitPrice, orderQuantity]);

  const totalSavings = useMemo(() => {
    if (!product || !isPromoActive || promoUnitsInOrder <= 0) return 0;
    return (regularReferencePrice - promoUnitPrice) * promoUnitsInOrder;
  }, [product, isPromoActive, promoUnitsInOrder, regularReferencePrice, promoUnitPrice]);

  const currentShippingCost = 0; // Modalités et livraison gérées directement par le marchand

  const currentTotal = useMemo(() => {
    return currentSubtotal;
  }, [currentSubtotal]);

  const discountBadge = useMemo(() => {
    if (isPromoActive && discountPercent > 0) return `-${discountPercent}%`;
    return product ? getProductDiscountBadge(product.price, regularReferencePrice) : '';
  }, [isPromoActive, discountPercent, product, regularReferencePrice]);

  const phoneValidation = useMemo(() => {
    if (!customerPhone.trim()) return null;
    return parseBeninPhone(customerPhone);
  }, [customerPhone]);

  const relatedProducts = useMemo(() => {
    const list = allProducts.length > 0 ? allProducts : Object.values(fallbackCatalog);
    return list.filter((p) => p.slug !== slug).slice(0, 3);
  }, [allProducts, slug]);

  const gallery = useMemo(() => {
    return PRODUCT_GALLERIES[slug] || (product?.image_url ? [product.image_url] : []);
  }, [slug, product]);

  const activeImage = selectedImage || gallery[0] || product?.image_url || '';

  const scrollToForm = () => {
    const el = document.getElementById('commandeDirecte');
    el?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const input = document.getElementById('customerNameInput') as HTMLInputElement | null;
      input?.focus();
    }, 450);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Veuillez renseigner votre numéro de téléphone.');
      return;
    }

    const check = parseBeninPhone(customerPhone);
    if (!check.valid) {
      setErrorMsg(check.message || 'Numéro de téléphone béninois invalide.');
      return;
    }

    if (!shippingCity.trim()) {
      setErrorMsg('Veuillez renseigner votre ville ou lieu de livraison.');
      return;
    }

    if (!product) return;

    setSubmitting(true);

    try {
      const utm = captureUtmParams();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: check.normalized || customerPhone.trim(),
          shippingCity: shippingCity.trim(),
          carrier: 'Livraison directe à convenir avec le client',
          items: [{ id: product.id, quantity: orderQuantity }],
          website: honeypot,
          utm_source: utm.utm_source,
          utm_medium: utm.utm_medium,
          utm_campaign: utm.utm_campaign,
          referrer: utm.referrer,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la validation de la commande');
      }

      const confirmedTotal = data.totalPrice || currentTotal;
      setOrderConfirmed({
        orderNumber: data.orderNumber,
        totalPrice: confirmedTotal,
        shippingCost: data.shippingCost ?? currentShippingCost,
        shippingCity,
        phoneNotice: data.phoneNotice,
        promoUnits: promoUnitsInOrder,
        normalUnits: normalUnitsInOrder,
        savings: data.savings ?? totalSavings,
      });

      trackPixelPurchase({ orderNumber: data.orderNumber, value: confirmedTotal });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#C27835] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#73737A]">Chargement de la pièce...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-[#EAE8E2] text-center max-w-md shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-[#FAF9F6] border border-[#EAE8E2] flex items-center justify-center mx-auto mb-4 text-[#73737A]">
            <ZoomIn className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-heading font-bold text-[#16171A] mb-1">Article introuvable</h2>
          <p className="text-xs text-[#73737A] mb-5">Cet article n&apos;est plus disponible dans notre boutique.</p>
          <Link href="/" className="btn-primary text-xs">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#16171A] pb-24 md:pb-16 antialiased">
      {/* BANDEAU DÉFILANT */}
      <AnnouncementBar />

      {/* EN-TÊTE DE LA FICHE PRODUIT */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE8E2] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#54555A] hover:text-[#16171A] transition">
            <span>←</span>
            <span className="hidden sm:inline">Retour au catalogue</span>
            <span className="sm:hidden">Catalogue</span>
          </Link>
          <Link href="/" className="flex flex-col items-center">
            <span className="font-heading font-black text-base sm:text-lg tracking-tight text-[#16171A] uppercase leading-none">
              Atelier Pro
            </span>
            <span className="text-[8px] font-bold text-[#73737A] tracking-[0.2em] uppercase mt-0.5 leading-none">
              Boutique Exclusive
            </span>
          </Link>
          <button
            onClick={scrollToForm}
            className="btn-accent text-xs py-2 px-4 min-h-[38px] sm:min-h-[44px]"
          >
            Commander maintenant
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12">
        {orderConfirmed ? (
          /* ÉCRAN DE CONFIRMATION DE COMMANDE */
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE8E2] shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black mb-4 border border-emerald-100">
              ✓
            </div>
            <span className="inline-block bg-emerald-50 text-emerald-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border border-emerald-200 mb-2">
              Commande Enregistrée avec Succès
            </span>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[#16171A] mb-2">
              Merci pour votre commande !
            </h1>
            <p className="text-xs sm:text-sm text-[#73737A] mb-6 max-w-md mx-auto leading-relaxed">
              Votre commande est enregistrée. Notre coursier prendra directement contact avec vous par téléphone avant son passage.
            </p>

            {orderConfirmed.phoneNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 text-left mb-6 font-semibold">
                ℹ️ {orderConfirmed.phoneNotice}
              </div>
            )}

            <div className="bg-[#FAF9F6] rounded-2xl p-5 border border-[#EAE8E2] text-left space-y-3 mb-6 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-[#EAE8E2] pb-2">
                <span className="text-[#73737A] font-medium">Numéro de commande :</span>
                <span className="font-mono font-bold text-[#16171A]">{orderConfirmed.orderNumber}</span>
              </div>
              <div className="flex justify-between border-b border-[#EAE8E2] pb-2">
                <span className="text-[#73737A] font-medium">Article commandé :</span>
                <span className="font-bold text-[#16171A] text-right">{product.name} (x{orderQuantity})</span>
              </div>
              <div className="flex justify-between border-b border-[#EAE8E2] pb-2">
                <span className="text-[#73737A] font-medium">Ville / Lieu :</span>
                <span className="font-bold text-[#16171A]">{orderConfirmed.shippingCity}</span>
              </div>
              {orderConfirmed.savings !== undefined && orderConfirmed.savings > 0 && (
                <div className="flex justify-between border-b border-[#EAE8E2] pb-2 text-emerald-700 font-bold">
                  <span>Économie réalisée :</span>
                  <span>-{formatFCFA(orderConfirmed.savings)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base">
                <span className="font-heading font-extrabold text-[#16171A]">Total à payer à la réception :</span>
                <span className="font-heading font-black text-emerald-700 text-lg">{formatFCFA(orderConfirmed.totalPrice)}</span>
              </div>
            </div>

            {/* Note rassurante logistique Bénin */}
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 text-xs text-emerald-950 text-left mb-6 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Confirmation logistique</span>
              </div>
              <p className="leading-relaxed">
                Notre équipe logistique vous appellera au <strong>{phoneValidation?.formatted || customerPhone}</strong> afin de valider l&apos;heure idéale et le lieu exact de rencontre pour la remise en main propre à {orderConfirmed.shippingCity}.
              </p>
            </div>

            {/* BOUTON CONFIRMATION WHATSAPP */}
            <div className="mb-6 space-y-2">
              <a
                href={`https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '2290197000000').replace(/[\s\+]/g, '')}?text=${encodeURIComponent(
                  `Bonjour Atelier Pro ! Je viens de valider la commande *${orderConfirmed.orderNumber}* pour *${product.name}* (x${orderQuantity}) d'un montant de *${formatFCFA(orderConfirmed.totalPrice)}* à régler à la livraison.\nVille : ${orderConfirmed.shippingCity}.\nMerci de me contacter pour la livraison !`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#128C7E] hover:bg-[#075E54] text-white font-bold text-xs sm:text-sm py-4 px-6 rounded-full shadow-md transition active:scale-[0.99] cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-white shrink-0" />
                <span>Confirmer ma commande par WhatsApp</span>
                <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
              </a>
              <p className="text-[11px] text-[#73737A]">
                1 clic pour notifier immédiatement notre atelier et accélérer l&apos;expédition.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/suivi" className="btn-secondary text-xs">
                Suivre mon colis
              </Link>
              <Link href="/" className="btn-primary text-xs">
                Retourner au catalogue
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-start">
            
            {/* COLONNE GAUCHE (7 COLONNES) : GALERIE & ACCORDÉONS */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Image Principale avec Zoom au tap */}
              <div className="space-y-3">
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-[#F4F3F0] border border-[#EAE8E2] shadow-sm cursor-zoom-in group select-none"
                  role="button"
                  tabIndex={0}
                  aria-label="Agrandir la photo de l'article"
                  onKeyDown={(e) => { if (e.key === 'Enter') setIsZoomOpen(true); }}
                >
                  <Image
                    src={activeImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    priority
                    unoptimized={activeImage.startsWith('/images/')}
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-102"
                  />
                  
                  {/* Badges sur l'image */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {isPromoActive && (
                      <span className="inline-flex items-center gap-1.5 bg-[#16171A]/90 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md border border-white/15 shadow-sm">
                        <Sparkles className="w-3 h-3 text-[#E5A869]" />
                        Offre Atelier
                      </span>
                    )}
                    {discountBadge && !isPromoActive && (
                      <span className="inline-flex items-center bg-[#C27835]/15 text-[#9E5A1C] border border-[#C27835]/30 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md shadow-xs">
                        {discountBadge}
                      </span>
                    )}
                    <span className="bg-white/85 backdrop-blur-md text-[#54555A] text-[10px] font-medium px-3 py-1 rounded-full shadow-xs border border-black/5">
                      {product.category}
                    </span>
                  </div>

                  <span className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 transition">
                    <ZoomIn className="w-3.5 h-3.5 text-white/90" />
                    <span>Agrandir</span>
                  </span>
                </div>

                {/* Galerie de miniatures */}
                {gallery.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {gallery.map((imgUrl, i) => {
                      const isSelected = activeImage === imgUrl;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedImage(imgUrl)}
                          className={`relative w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'border-[#C27835] ring-2 ring-[#C27835]/20 shadow-xs'
                              : 'border-[#EAE8E2] opacity-70 hover:opacity-100 hover:border-[#D7D4CC]'
                          }`}
                        >
                          <Image
                            src={imgUrl}
                            alt={`${product.name} - Vue ${i + 1}`}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ACCORDÉONS INFORMATIONS DÉTAILLÉES */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE8E2] shadow-xs space-y-4">
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-[#73737A]">
                  Informations détaillées & Garanties
                </h3>

                <div className="divide-y divide-[#EAE8E2]">
                  {/* Accordéon 1 : Description */}
                  <details className="group py-3.5 select-none" open>
                    <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm text-[#16171A]">
                      <span>Description de la pièce</span>
                      <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
                    </summary>
                    <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed">
                      {product.description}
                    </div>
                  </details>

                  {/* Accordéon 2 : Matériaux */}
                  <details className="group py-3.5 select-none">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm text-[#16171A]">
                      <span>Caractéristiques & Matériaux</span>
                      <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
                    </summary>
                    <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed space-y-2">
                      <p>• <strong>Sélection :</strong> Matériaux de grade supérieur, vérifiés pièce par pièce avant mise en coffret.</p>
                      <p>• <strong>Poids indicatif :</strong> 0.45 kg - 0.70 kg selon emballage de protection.</p>
                      <p>• <strong>Contrôle qualité :</strong> Inspection visuelle et fonctionnelle préalable effectuée à notre atelier.</p>
                    </div>
                  </details>

                  {/* Accordéon 3 : Expédition & Modalités de Paiement */}
                  <details className="group py-3.5 select-none">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm text-[#16171A]">
                      <span>Expédition au Bénin & Modalités de Paiement</span>
                      <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
                    </summary>
                    <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed space-y-2">
                      <p>• <strong>Délais d&apos;expédition :</strong> Remise rapide sous 24h à 48h partout au Bénin (Cotonou, Calavi, Porto-Novo, Parakou et autres communes).</p>
                      <p>• <strong>Organisation directe :</strong> Notre équipe vous contacte par téléphone ou WhatsApp pour valider votre commande et convenir du lieu et de l&apos;heure de rendez-vous.</p>
                      <p>• <strong>Paiement à la réception :</strong> Vous réglez directement en main propre lors de la remise de votre commande (en espèces ou par Mobile Money).</p>
                    </div>
                  </details>

                  {/* Accordéon 4 : Retours & Échanges */}
                  <details className="group py-3.5 select-none">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm text-[#16171A]">
                      <span>Garantie Sérénité & Échange 48h</span>
                      <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
                    </summary>
                    <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed">
                      Si l&apos;article présente le moindre défaut lors de la réception, notre service client basé à Cotonou procède à un échange immédiat sans frais sous 48 heures ouvrées.
                    </div>
                  </details>
                </div>
              </div>

              {/* NOTE & RÉASSURANCE BOUTIQUE */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE8E2] shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 font-black text-sm">
                    ★ 4.9
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-black text-sm text-[#16171A]">
                        Atelier Pro certifié par ses clients
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Avis vérifiés
                      </span>
                    </div>
                    <p className="text-xs text-[#73737A] mt-0.5">
                      Paiement à la remise en main propre et expédition sous 24h partout au Bénin.
                    </p>
                  </div>
                </div>

                <Link
                  href="/#avis"
                  className="text-xs font-bold text-[#C27835] hover:text-[#9E5A1C] hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>Consulter les avis boutique sur la vitrine</span>
                  <span>→</span>
                </Link>
              </div>

            </div>

            {/* COLONNE DROITE (5 COLONNES) : BLOC PRIX & CHECKOUT ULTRA-SIMPLIFIÉ */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
              
              {/* Carte Titre, Prix Promotionnel & Sélecteur */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE8E2] shadow-sm space-y-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835] bg-[#FBF4ED] px-3 py-1 rounded-full border border-[#F2DFCE] inline-block">
                  Atelier Pro • Édition Artisanale
                </span>

                <h1 className="font-heading font-black text-xl sm:text-2xl text-[#16171A] leading-snug">
                  {product.name}
                </h1>

                {/* SOCIAL PROOF VITRINE */}
                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  <Link
                    href="/#avis"
                    className="inline-flex items-center gap-1.5 group hover:opacity-85 transition"
                    title="Voir les avis de nos clients sur la vitrine"
                  >
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-extrabold text-xs text-[#16171A]">4.9/5</span>
                    <span className="text-xs text-[#73737A] underline decoration-slate-300 underline-offset-2 group-hover:text-[#16171A]">
                      (Avis clients sur la vitrine)
                    </span>
                  </Link>

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Paiement à la livraison</span>
                  </span>
                </div>

                {/* ZONE DE PRIX - MISE EN VALEUR PROMOTIONNELLE MAJEURE */}
                {isPromoActive ? (
                  <div className="p-4 rounded-2xl bg-[#FDF9F3] border border-[#F5E6D3] space-y-2">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#C27835]">
                      <span>⚡</span>
                      <span>PRIX SPÉCIAL — QUANTITÉ LIMITÉE</span>
                    </div>

                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-heading font-black text-3xl sm:text-4xl text-[#C27835] tracking-tight">
                        {formatFCFA(promo.promo_price)}
                      </span>
                      <span className="text-base text-[#9C9CA4] line-through font-medium">
                        {formatFCFA(regularReferencePrice)}
                      </span>
                      {discountPercent > 0 && (
                        <span className="bg-[#121316] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-emerald-800 font-bold">
                      ✓ Économie de {formatFCFA(regularReferencePrice - promo.promo_price)} par unité commandée
                    </p>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-3 pt-1">
                    <span className="font-heading font-black text-2xl sm:text-3xl text-[#16171A] tracking-tight">
                      {formatFCFA(product.price)}
                    </span>
                    <span className="text-sm text-[#9C9CA4] line-through font-medium">
                      {formatFCFA(regularReferencePrice)}
                    </span>
                    {discountBadge && (
                      <span className="bg-[#121316] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                        {discountBadge}
                      </span>
                    )}
                  </div>
                )}

                {/* WIDGET DE PROMOTION PAR QUANTITÉ (SHOPIFY QUANTITY BREAKS STYLE) */}
                {qbSettings.enabled && (
                  <QuantityBreaksWidget
                    currentQuantity={orderQuantity}
                    onSelectQuantity={(q) => setOrderQuantity(q)}
                    productPrice={product.price}
                    originalPrice={regularReferencePrice}
                    promoPrice={promo?.promo_price}
                    promoRemainingQuota={promo?.remaining_quota}
                    stock={product.stock}
                    popularTier={qbSettings.popularTier}
                    template={qbSettings.template}
                    accentColor={qbSettings.accentColor}
                    customLabels={qbSettings.customLabels}
                    onProceedToOrder={scrollToForm}
                  />
                )}

                {/* Sélecteur de Quantité Manuel Synchronisé */}
                <div className="pt-3 border-t border-[#F3F1EC] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#16171A] block">Quantité totale :</span>
                      <span className="text-[10px] text-[#73737A]">Ajustable aussi manuellement</span>
                    </div>
                    <div className="flex items-center border border-[#EAE8E2] rounded-full bg-[#FAF9F6]">
                      <button
                        type="button"
                        onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                        disabled={orderQuantity <= 1}
                        className="w-9 h-9 flex items-center justify-center font-bold text-[#16171A] hover:bg-white rounded-full transition disabled:opacity-30 cursor-pointer"
                        aria-label="Diminuer la quantité"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-bold text-xs text-[#16171A] tabular-nums">
                        {orderQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrderQuantity((q) => Math.min(Math.min(10, product.stock || 10), q + 1))}
                        disabled={orderQuantity >= Math.min(10, product.stock || 10)}
                        className="w-9 h-9 flex items-center justify-center font-bold text-[#16171A] hover:bg-white rounded-full transition disabled:opacity-30 cursor-pointer"
                        aria-label="Augmenter la quantité"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Alerte déterministe en cas de split promo / normal */}
                  {isPromoActive && orderQuantity > promo.remaining_quota && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                      <p className="font-bold flex items-center gap-1 text-amber-800">
                        <span>ℹ️</span>
                        <span>Répartition automatique du tarif :</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        • <strong>{promo.remaining_quota} unité{promo.remaining_quota > 1 ? 's' : ''}</strong> au prix promo de <strong>{formatFCFA(promo.promo_price)}</strong>
                        <br />
                        • <strong>{orderQuantity - promo.remaining_quota} unité{(orderQuantity - promo.remaining_quota) > 1 ? 's' : ''}</strong> au prix normal de <strong>{formatFCFA(product.price)}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* FORMULAIRE DE COMMANDE ULTRA-SIMPLIFIÉ (3 CHAMPS UNIQUEMENT) */}
              <div id="commandeDirecte" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE8E2] shadow-md space-y-5 scroll-mt-24">
                
                <div className="border-b border-[#F3F1EC] pb-3">
                  <span className="text-xs font-heading font-black uppercase tracking-wider text-[#16171A] flex items-center gap-2">
                    <span>⚡ Achat Express Sans Compte</span>
                  </span>
                  <p className="text-xs text-[#73737A] mt-1">
                    3 informations suffisent. Paiement à la réception de votre colis.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-[#FDF2F0] border border-[#F8D7DA] text-[#B85D3D] text-xs rounded-2xl font-bold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleOrderSubmit} className="space-y-4 text-xs sm:text-sm">
                  
                  {/* CHAMP 1 : NOM COMPLET */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#54555A] mb-1">
                      Nom complet *
                    </label>
                    <input
                      id="customerNameInput"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="ex: Ablawa Tossou"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] text-[#16171A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C27835] transition"
                    />
                  </div>

                  {/* CHAMP 2 : TÉLÉPHONE BÉNIN */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-bold text-[#54555A]">
                        Numéro de téléphone *
                      </label>
                      <span className="text-[10px] text-[#73737A] font-medium">Bénin (+229)</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="01 97 00 11 22 ou 97 00 11 22"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] text-[#16171A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C27835] transition"
                    />
                    {phoneValidation && (
                      <div className="mt-1 text-[10px] font-semibold">
                        {phoneValidation.valid ? (
                          phoneValidation.isOldFormat ? (
                            <span className="text-amber-700 inline-flex items-center gap-1">
                              <Info className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{phoneValidation.message}</span>
                            </span>
                          ) : (
                            <span className="text-emerald-700">✓ Numéro valide : {phoneValidation.formatted}</span>
                          )
                        ) : (
                          <span className="text-rose-600">{phoneValidation.message}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CHAMP 3 : VILLE / LIEU DE LIVRAISON (SAISIE LIBRE) */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#54555A] mb-1">
                      Ville / Lieu de livraison au Bénin *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      placeholder="ex: Cotonou, Calavi, Porto-Novo, Parakou..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] text-[#16171A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C27835] transition font-medium"
                    />
                  </div>

                  {/* RÉCAPITULATIF TRANSPARENT DE COMMANDE */}
                  <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#EAE8E2] space-y-2 text-xs">
                    {/* Détail des unités commandées */}
                    {isPromoActive && orderQuantity > promo.remaining_quota ? (
                      <div className="space-y-1 text-[#73737A] border-b border-[#EAE8E2] pb-2">
                        <div className="flex justify-between">
                          <span>{promo.remaining_quota}x Tarif promotionnel :</span>
                          <span className="font-bold text-[#C27835]">{formatFCFA(promo.promo_price * promo.remaining_quota)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{orderQuantity - promo.remaining_quota}x Tarif normal :</span>
                          <span className="font-bold text-[#16171A]">{formatFCFA(product.price * (orderQuantity - promo.remaining_quota))}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[#73737A]">
                        <span>Article ({orderQuantity} pièce{orderQuantity > 1 ? 's' : ''}) :</span>
                        <span className="font-bold text-[#16171A]">{formatFCFA(currentSubtotal)}</span>
                      </div>
                    )}

                    {/* Économie réalisée */}
                    {totalSavings > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Économie totale :</span>
                        <span>-{formatFCFA(totalSavings)}</span>
                      </div>
                    )}

                    {/* Total à payer à la réception */}
                    <div className="flex justify-between pt-2 border-t border-[#EAE8E2] font-heading font-black text-sm text-[#16171A]">
                      <span>Total à payer à la réception :</span>
                      <span className="text-[#C27835] text-base">{formatFCFA(currentTotal)}</span>
                    </div>
                  </div>

                  {/* Honeypot invisible */}
                  <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {/* BOUTON D'ACTION PRINCIPAL HAUTEMENT VISIBLE AVEC ANIMATION D'INCITATION */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-accent btn-cta-animated text-sm sm:text-base py-3.5 sm:py-4 px-6 min-h-[52px] shadow-lg cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    {submitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Validation en cours...</span>
                      </>
                    ) : (
                      <>
                        <span className="font-heading font-black tracking-wide">
                          Commander maintenant
                        </span>
                        <span className="btn-cta-nudge text-base sm:text-lg">→</span>
                      </>
                    )}
                  </button>

                  {/* RÉASSURANCE SOUS LE BOUTON */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#F3F1EC] text-center">
                    <div className="p-2.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2]/80 flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-white border border-[#EAE8E2] flex items-center justify-center text-[#C27835] mb-1 shadow-xs">
                        <Truck className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <h4 className="text-[10px] font-bold text-[#16171A]">Expédition 24-48h</h4>
                      <p className="text-[9px] text-[#73737A]">Partout au Bénin</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2]/80 flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-white border border-[#EAE8E2] flex items-center justify-center text-[#C27835] mb-1 shadow-xs">
                        <Banknote className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <h4 className="text-[10px] font-bold text-[#16171A]">Paiement Réception</h4>
                      <p className="text-[9px] text-[#73737A]">Espèces ou MoMo</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2]/80 flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-white border border-[#EAE8E2] flex items-center justify-center text-[#C27835] mb-1 shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5 stroke-[1.8]" />
                      </div>
                      <h4 className="text-[10px] font-bold text-[#16171A]">Garantie 48h</h4>
                      <p className="text-[9px] text-[#73737A]">Échange immédiat</p>
                    </div>
                  </div>

                </form>
              </div>

            </div>

          </div>
        )}

        {/* SECTION "VOUS AIMEREZ AUSSI" */}
        {!orderConfirmed && relatedProducts.length > 0 && (
          <section className="mt-20 pt-16 border-t border-[#EAE8E2]" aria-label="Articles similaires">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835]">
                  Recommandations
                </span>
                <h2 className="font-heading font-black text-xl sm:text-2xl text-[#16171A] mt-1">
                  Vous aimerez aussi
                </h2>
              </div>
              <Link href="/" className="text-xs font-bold text-[#54555A] hover:text-[#16171A] transition">
                Voir tout le catalogue →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* MODAL ZOOM PHOTO */}
      {isZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-xl transition"
            aria-label="Fermer le zoom"
          >
            ✕
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-[80vh]">
            <Image
              src={activeImage}
              alt={`${product.name} - Vue agrandie`}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* BOUTON FLOTTANT WHATSAPP */}
      <FloatingWhatsApp productName={product.name} />

      {/* BARRE D'ACTION COLLANTE MOBILE */}
      {!orderConfirmed && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#EAE8E2] p-3 px-4 flex justify-between items-center z-30 shadow-lg">
          <div>
            <div className="text-[10px] text-[#73737A] uppercase font-semibold">Total à la réception</div>
            <div className="text-base font-heading font-black text-[#16171A]">
              {formatFCFA(currentTotal)}
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToForm}
            className="btn-accent btn-cta-animated text-xs py-2.5 px-5 min-h-[44px] flex items-center gap-1.5"
          >
            <span className="font-heading font-black">Commander maintenant</span>
            <span className="btn-cta-nudge">↓</span>
          </button>
        </div>
      )}
    </div>
  );
}
