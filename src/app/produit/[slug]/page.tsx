'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, Suspense } from 'react';
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
  Check,
  ChevronDown,
  Package,
  RotateCcw,
  Clock,
  Shield,
  HelpCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import AnnouncementBar from '@/components/AnnouncementBar';
import ProductCard from '@/components/ProductCard';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import QuantityBreaksWidget from '@/components/QuantityBreaksWidget';
import BundleSelector, { type BundleVariant } from '@/components/BundleSelector';
import { getBundles, type Bundle } from '@/lib/bundles';
import { formatFCFA } from '@/lib/format';
import { captureUtmParams } from '@/lib/utm';
import { parseBeninPhone } from '@/lib/phone';
import { trackPixelPurchase, trackPixelViewContent } from '@/lib/tracking/client-pixels';
import {
  Product,
  PRODUCT_GALLERIES,
  PRODUCT_SPECS,
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

const fallbackReviews: Review[] = [
  { id: 1, product_id: null, rating: 5, customer_name: 'Arnaud D.', city: 'Cotonou', comment: 'Articles bien finis et conformes aux photos, livraison rapide sur Cotonou.', status: 'approuve', created_at: '2026-11-02 14:20:00', photo_url: null },
  { id: 2, product_id: null, rating: 5, customer_name: 'Boris K.', city: 'Abomey-Calavi', comment: 'Le coursier m\'a laissé ouvrir le colis pour vérifier avant de régler en espèces.', status: 'approuve', created_at: '2026-10-31 11:45:00', photo_url: null },
  { id: 3, product_id: null, rating: 5, customer_name: 'Chantal A.', city: 'Porto-Novo', comment: 'Commande reçue le lendemain à Porto-Novo dans un emballage très propre.', status: 'approuve', created_at: '2026-10-28 16:30:00', photo_url: null },
  { id: 4, product_id: null, rating: 5, customer_name: 'Hermann T.', city: 'Cotonou', comment: 'Boutique sérieuse, article de qualité et coursier très courtois.', status: 'approuve', created_at: '2026-10-24 18:10:00', photo_url: null },
  { id: 5, product_id: null, rating: 5, customer_name: 'Ulrich S.', city: 'Parakou', comment: 'Expédition sécurisée jusqu\'à Parakou, colis bien protégé et intact.', status: 'approuve', created_at: '2026-10-20 09:30:00', photo_url: null },
];

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

function ProductDetailView() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug || '';
  const urlBundleParam = searchParams?.get('bundle') || null;

  const [product, setProduct] = useState<Product | null>(() => fallbackCatalog[slug] || null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!fallbackCatalog[slug]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1); // 1 article présélectionné par défaut
  const [selectedBundleId, setSelectedBundleId] = useState<string>(() => {
    if (urlBundleParam) {
      return urlBundleParam.startsWith('x') ? urlBundleParam : `x${urlBundleParam}`;
    }
    return 'x1'; // Lot standard « 1 article » présélectionné par défaut
  });

  // Mise à jour si le paramètre d'URL ?bundle= change
  useEffect(() => {
    if (urlBundleParam) {
      const normalized = urlBundleParam.startsWith('x') ? urlBundleParam : `x${urlBundleParam}`;
      setSelectedBundleId(normalized);
    }
  }, [urlBundleParam]);
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    customerName: '',
    city: 'Cotonou',
    rating: 5,
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

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

  // Chargement des avis clients
  useEffect(() => {
    const productId = product?.id;
    const url = productId ? `/api/reviews?productId=${productId}` : '/api/reviews';
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});
  }, [product?.id]);

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

  // Calcul dynamique des offres de lots (Bundles)
  const bundles = useMemo(() => {
    return getBundles(product);
  }, [product]);

  const selectedBundle = useMemo(() => {
    return bundles.find((b) => b.id === selectedBundleId) || bundles[1] || bundles[0];
  }, [bundles, selectedBundleId]);

  // Synchronisation de la quantité avec le lot sélectionné
  useEffect(() => {
    if (selectedBundle) {
      setOrderQuantity(selectedBundle.quantity);
    }
  }, [selectedBundle]);

  const bundleVariant: BundleVariant = ((product?.bundle_style as any) || 'card') as BundleVariant;
  const activeAccentColor = ((product as any)?.bundle_accent_color) || qbSettings.accentColor || '#C27835';

  const currentSubtotal = useMemo(() => {
    if (!product) return 0;
    if (selectedBundle) {
      if (orderQuantity === selectedBundle.quantity) {
        return selectedBundle.price;
      }
      if (orderQuantity === 1) return product.price;
      if (orderQuantity === 2) return Math.round(product.price * 2 * 0.9);
      if (orderQuantity >= 3) return Math.round(product.price * orderQuantity * 0.85);
      return product.price * orderQuantity;
    }
    if (!isPromoActive) return product.price * orderQuantity;
    return promoUnitsInOrder * promoUnitPrice + normalUnitsInOrder * normalUnitPrice;
  }, [product, selectedBundle, isPromoActive, promoUnitsInOrder, promoUnitPrice, normalUnitsInOrder, normalUnitPrice, orderQuantity]);

  const totalSavings = useMemo(() => {
    if (!product) return 0;
    if (selectedBundle) {
      const normalTotal = Math.round(product.price) * selectedBundle.quantity;
      return Math.max(0, normalTotal - selectedBundle.price);
    }
    if (!isPromoActive || promoUnitsInOrder <= 0) return 0;
    return (regularReferencePrice - promoUnitPrice) * promoUnitsInOrder;
  }, [product, selectedBundle, isPromoActive, promoUnitsInOrder, regularReferencePrice, promoUnitPrice]);

  const currentShippingCost = 0; // Remise en main propre / livraison gérée avec le client

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

  const specs = useMemo(() => {
    return PRODUCT_SPECS[slug] || [
      { label: 'Catégorie', value: product?.category || 'Boutique' },
      { label: 'Authenticité', value: 'Sélection certifiée AFRINOVA SHOP' },
      { label: 'Contrôle qualité', value: 'Inspection visuelle et fonctionnelle avant expédition' },
      { label: 'Livraison', value: 'Partout au Bénin avec paiement à la réception' },
    ];
  }, [slug, product]);

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
          bundleId: selectedBundleId,
          quantity: orderQuantity,
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.customerName.trim() || !reviewForm.comment.trim()) return;

    setSubmittingReview(true);
    setReviewSuccessMsg('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?.id,
          customerName: reviewForm.customerName.trim(),
          city: reviewForm.city.trim() || 'Cotonou',
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim(),
        }),
      });

      if (res.ok) {
        setReviewSuccessMsg('Merci pour votre avis ! Il a été enregistré.');
        setReviewForm({ customerName: '', city: 'Cotonou', rating: 5, comment: '' });
        setTimeout(() => setShowReviewModal(false), 2000);
      }
    } catch {
      // Ignorer
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#C27835] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#73737A]">Chargement du produit...</p>
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#16171A] pb-28 sm:pb-32 md:pb-20 antialiased selection:bg-[#F2DFCE] selection:text-[#7A3E10]">
      {/* BANDEAU DÉFILANT */}
      <AnnouncementBar />

      {/* 1. EN-TÊTE ÉPURÉ & RESTRUCTURÉ (SANS GROS BOUTON REDONDANT, HAUTEUR RÉDUITE) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE8E2] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-13 sm:h-14 flex items-center justify-between">
          {/* LIEN RETOUR CATALOGUE */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#54555A] hover:text-[#16171A] transition py-1"
          >
            <span className="text-sm leading-none">←</span>
            <span className="hidden sm:inline">Retour au catalogue</span>
            <span className="sm:hidden text-[11px]">Catalogue</span>
          </Link>

          {/* LOGO AFRINOVA SHOP */}
          <Link href="/" className="flex flex-col items-center">
            <span className="font-heading font-black text-sm sm:text-base tracking-tight text-[#16171A] uppercase leading-none">
              AFRINOVA SHOP
            </span>
            <span className="text-[8px] font-bold text-[#73737A] tracking-[0.2em] uppercase mt-0.5 leading-none">
              Boutique Exclusive
            </span>
          </Link>

          {/* RÉASSURANCE DISCRÈTE (REMPLACE LE GROS BOUTON POUR ÉVITER LES RÉPÉTITIONS) */}
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Paiement à la livraison</span>
              <span className="sm:hidden">Paiement livraison</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
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
              Votre commande est bien enregistrée. Notre coursier prendra directement contact avec vous par téléphone avant son passage.
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
                  `Bonjour AFRINOVA SHOP ! Je viens de valider la commande *${orderConfirmed.orderNumber}* pour *${product.name}* (x${orderQuantity}) d'un montant de *${formatFCFA(orderConfirmed.totalPrice)}* à régler à la livraison.\nVille : ${orderConfirmed.shippingCity}.\nMerci de me contacter pour la livraison !`
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
                1 clic pour notifier immédiatement notre équipe et accélérer l&apos;expédition.
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
          <div className="space-y-12 sm:space-y-16">
            
            {/* HERO ZONE : 2 COLONNES SUR ORDINATEUR / FLUX VERTICAL FLUIDE SUR MOBILE */}
            <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start">
              
              {/* COLONNE GAUCHE (7 COLS) : GALERIE PHOTOS OPTIMISÉE */}
              <div className="lg:col-span-7 space-y-5 lg:sticky lg:top-20">
                
                {/* 2. GALERIE PHOTOS OPTIMISÉE (HAUTEUR RÉDUITE SUR MOBILE, GRAND FORMAT QUALITÉ) */}
                <div className="space-y-3">
                  <div
                    onClick={() => setIsZoomOpen(true)}
                    className="relative aspect-[4/3] sm:aspect-square lg:aspect-[4/5] max-h-[340px] sm:max-h-[460px] lg:max-h-none rounded-2xl sm:rounded-3xl overflow-hidden bg-[#F4F3F0] border border-[#EAE8E2] shadow-sm cursor-zoom-in group select-none"
                    role="button"
                    tabIndex={0}
                    aria-label="Agrandir la photo du produit"
                    onKeyDown={(e) => { if (e.key === 'Enter') setIsZoomOpen(true); }}
                  >
                    <Image
                      src={activeImage}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      priority
                      unoptimized={activeImage.startsWith('/images/')}
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-102"
                    />
                    
                    {/* Badges sur l'image */}
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex flex-col gap-1.5 z-10">
                      {isPromoActive && (
                        <span className="inline-flex items-center gap-1 bg-[#16171A]/90 text-white text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md border border-white/15 shadow-sm">
                          <Sparkles className="w-3 h-3 text-[#E5A869]" />
                          Offre Spéciale
                        </span>
                      )}
                      {discountBadge && !isPromoActive && (
                        <span className="inline-flex items-center bg-[#C27835]/15 text-[#9E5A1C] border border-[#C27835]/30 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md shadow-xs">
                          {discountBadge}
                        </span>
                      )}
                      <span className="bg-white/90 backdrop-blur-md text-[#54555A] text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs border border-black/5 self-start">
                        {product.category}
                      </span>
                    </div>

                    <span className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 transition">
                      <ZoomIn className="w-3.5 h-3.5 text-white/90" />
                      <span>Agrandir</span>
                    </span>
                  </div>

                  {/* Miniatures : affichées uniquement si le produit dispose de plusieurs photos authentiques */}
                  {gallery.length > 1 && (
                    <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1">
                      {gallery.map((imgUrl, i) => {
                        const isSelected = activeImage === imgUrl;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedImage(imgUrl)}
                            className={`relative w-16 sm:w-20 h-20 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
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

              </div>

              {/* COLONNE DROITE (5 COLS) : INFOS PRODUIT, OFFRES VOLUME & FORMULAIRE */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* CARTE PRINCIPALE : INFORMATIONS RÉORGANISÉES SELON L'ORDRE STRICT */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#EAE8E2] shadow-xs space-y-4">
                  
                  {/* 3.1 BADGE DE COLLECTION OU CATÉGORIE */}
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#C27835] bg-[#FBF4ED] px-3 py-1 rounded-full border border-[#F2DFCE] inline-block">
                      AFRINOVA SHOP • {product.category}
                    </span>
                  </div>

                  {/* 3.2 NOM DU PRODUIT */}
                  <h1 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl text-[#16171A] leading-snug">
                    {product.name}
                  </h1>

                  {/* 3.3 ÉVALUATION AVEC ÉTOILES ET NOMBRE D'AVIS */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href="#avis-clients"
                      className="inline-flex items-center gap-1.5 group hover:opacity-85 transition"
                    >
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="font-extrabold text-xs text-[#16171A]">4.9/5</span>
                      <span className="text-xs text-[#73737A] underline decoration-slate-300 underline-offset-2 group-hover:text-[#16171A]">
                        ({reviews.length} avis vérifiés)
                      </span>
                    </a>
                  </div>

                  {/* 3.4 BADGE « PAIEMENT À LA LIVRAISON » */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Paiement à la livraison au Bénin</span>
                    </span>
                  </div>

                  {/* 3.5, 3.6, 3.7 ZONE DE PRIX : PRIX PROMO PRINCIPAL, ANCIEN PRIX BARRÉ, % RÉDUCTION */}
                  <div className="pt-2 border-t border-[#F3F1EC]">
                    {isPromoActive ? (
                      <div className="p-4 rounded-2xl bg-[#FDF9F4] border border-[#F5E6D3] space-y-2">
                        <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#C27835]">
                          <span>⚡</span>
                          <span>TARIF PROMOTIONNEL EN COURS</span>
                        </div>

                        <div className="flex items-baseline gap-3 flex-wrap">
                          {/* 3.5 PRIX PROMO PRINCIPAL PARTICULIÈREMENT VISIBLE */}
                          <span className="font-heading font-black text-3xl sm:text-4xl text-[#C27835] tracking-tight tabular-nums">
                            {formatFCFA(promo.promo_price)}
                          </span>

                          {/* 3.6 ANCIEN PRIX BARRÉ */}
                          <span className="text-base sm:text-lg text-[#9C9CA4] line-through font-semibold tabular-nums">
                            {formatFCFA(regularReferencePrice)}
                          </span>

                          {/* 3.7 POURCENTAGE DE RÉDUCTION */}
                          {discountPercent > 0 && (
                            <span className="bg-[#121316] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                              -{discountPercent}%
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-emerald-800 font-bold">
                          ✓ Vous économisez {formatFCFA(regularReferencePrice - promo.promo_price)} par article
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-3 flex-wrap pt-1">
                        {/* 3.5 PRIX NORMAL */}
                        <span className="font-heading font-black text-2xl sm:text-3xl text-[#16171A] tracking-tight tabular-nums">
                          {formatFCFA(product.price)}
                        </span>

                        {/* 3.6 ANCIEN PRIX BARRÉ */}
                        {regularReferencePrice > product.price && (
                          <span className="text-base text-[#9C9CA4] line-through font-medium tabular-nums">
                            {formatFCFA(regularReferencePrice)}
                          </span>
                        )}

                        {/* 3.7 POURCENTAGE DE RÉDUCTION */}
                        {discountBadge && (
                          <span className="bg-[#121316] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                            {discountBadge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. SECTION DES OFFRES PAR QUANTITÉ (BUNDLES) */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#16171A]">
                        Offres par quantité (Volume Discounts) :
                      </span>
                      {selectedBundle?.tag && (
                        <span
                          style={{
                            color: activeAccentColor,
                            backgroundColor: `${activeAccentColor}14`,
                            borderColor: `${activeAccentColor}30`,
                          }}
                          className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                        >
                          ★ {selectedBundle.tag}
                        </span>
                      )}
                    </div>

                    <BundleSelector
                      bundles={bundles}
                      value={selectedBundleId}
                      onChange={(b) => {
                        setSelectedBundleId(b.id);
                        setOrderQuantity(b.quantity);
                      }}
                      variant={bundleVariant}
                      accent={activeAccentColor}
                      image={product.image_url}
                    />
                  </div>

                  {/* Ajusteur manuel de quantité synchronisé */}
                  <div className="pt-2 border-t border-[#F3F1EC] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#16171A] block">Quantité exacte :</span>
                      <span className="text-[10px] text-[#73737A]">Ajustable librement (+ / −)</span>
                    </div>
                    <div className="flex items-center border border-[#EAE8E2] rounded-full bg-[#FAF9F6]">
                      <button
                        type="button"
                        onClick={() => {
                          const nextQ = Math.max(1, orderQuantity - 1);
                          setOrderQuantity(nextQ);
                          if (nextQ === 1) setSelectedBundleId('x1');
                          else if (nextQ === 2) setSelectedBundleId('x2');
                          else if (nextQ === 3) setSelectedBundleId('x3');
                        }}
                        disabled={orderQuantity <= 1}
                        className="w-8 h-8 flex items-center justify-center font-bold text-[#16171A] hover:bg-white rounded-full transition disabled:opacity-30 cursor-pointer"
                        aria-label="Diminuer la quantité"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-bold text-xs text-[#16171A] tabular-nums">
                        {orderQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const maxStock = Math.min(10, product.stock || 10);
                          const nextQ = Math.min(maxStock, orderQuantity + 1);
                          setOrderQuantity(nextQ);
                          if (nextQ === 1) setSelectedBundleId('x1');
                          else if (nextQ === 2) setSelectedBundleId('x2');
                          else if (nextQ === 3) setSelectedBundleId('x3');
                        }}
                        disabled={orderQuantity >= Math.min(10, product.stock || 10)}
                        className="w-8 h-8 flex items-center justify-center font-bold text-[#16171A] hover:bg-white rounded-full transition disabled:opacity-30 cursor-pointer"
                        aria-label="Augmenter la quantité"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>

                {/* FORMULAIRE DE COMMANDE ULTRA-SIMPLIFIÉ (STRICTEMENT 3 CHAMPS) */}
                <div id="commandeDirecte" className="bg-white rounded-3xl p-5 sm:p-7 border border-[#EAE8E2] shadow-md space-y-4 scroll-mt-20">
                  
                  <div className="border-b border-[#F3F1EC] pb-3">
                    <span className="text-xs font-heading font-black uppercase tracking-wider text-[#16171A] flex items-center gap-2">
                      <span>⚡ Commande Express — Paiement à la réception</span>
                    </span>
                    <p className="text-xs text-[#73737A] mt-1">
                      Remplissez vos 3 coordonnées. Vous réglez directement lors de la remise en main propre.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-[#FDF2F0] border border-[#F8D7DA] text-[#B85D3D] text-xs rounded-2xl font-bold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleOrderSubmit} className="space-y-3.5 text-xs sm:text-sm">
                    
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
                        placeholder="ex: Jean Dossou"
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
                              <span className="text-emerald-700">✓ Format valide : {phoneValidation.formatted}</span>
                            )
                          ) : (
                            <span className="text-rose-600">{phoneValidation.message}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CHAMP 3 : VILLE / LIEU DE LIVRAISON */}
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

                    {/* RÉCAPITULATIF DE LA FORMULE BUNDLE */}
                    <div className="pt-2 border-t border-[#F3F1EC]">
                      <div className="flex items-center justify-between bg-[#FAF9F6] border border-[#EAE8E2] rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: activeAccentColor }}
                            className="text-[10px] font-black text-white px-2 py-0.5 rounded-full"
                          >
                            {selectedBundle?.badge || `${orderQuantity} art.`}
                          </span>
                          <span className="text-xs font-bold text-[#16171A]">
                            {selectedBundle?.title || `${orderQuantity} article${orderQuantity > 1 ? 's' : ''}`}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#73737A]">
                          {formatFCFA(currentSubtotal)}
                        </span>
                      </div>
                    </div>

                    {/* RÉCAPITULATIF TRANSPARENT DU TOTAL SÉLECTIONNÉ */}
                    <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#EAE8E2] space-y-2 text-xs">
                      <div className="flex justify-between text-[#73737A]">
                        <span>Quantité sélectionnée :</span>
                        <span className="font-bold text-[#16171A]">{orderQuantity} article{orderQuantity > 1 ? 's' : ''} ({selectedBundle?.title || 'Standard'})</span>
                      </div>

                      {totalSavings > 0 && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Économie réalisée :</span>
                          <span>-{formatFCFA(totalSavings)}</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-2 border-t border-[#EAE8E2] font-heading font-black text-sm text-[#16171A]">
                        <span>TOTAL À LA RÉCEPTION :</span>
                        <span className="text-[#C27835] text-base sm:text-lg">{formatFCFA(currentTotal)}</span>
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

                    {/* BOUTON D'ACTION PRINCIPAL COMMANDER */}
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
                            COMMANDER ({selectedBundle ? selectedBundle.title : `${orderQuantity} art.`}) • {formatFCFA(currentTotal)}
                          </span>
                          <span className="btn-cta-nudge text-base sm:text-lg">→</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-[#73737A] text-center font-medium">
                      🔒 Règlement sécurisé à la réception • Aucun paiement en ligne requis
                    </p>

                  </form>
                </div>

              </div>

            </div>

            {/* 6. REORGANISATION DES AUTRES SECTIONS (DANS L'ORDRE STRICT DEMANDÉ) */}
            <div className="space-y-12 sm:space-y-16 pt-4 border-t border-[#EAE8E2]">
              
              {/* 6.1 DESCRIPTION DÉTAILLÉE DU PRODUIT */}
              <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE8E2] shadow-xs space-y-4" aria-labelledby="desc-heading">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FBF4ED] text-[#C27835] flex items-center justify-center shrink-0 border border-[#F2DFCE]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835]">
                      Présentation
                    </span>
                    <h2 id="desc-heading" className="font-heading font-black text-lg sm:text-xl text-[#16171A]">
                      Description détaillée du produit
                    </h2>
                  </div>
                </div>

                <div className="text-xs sm:text-sm text-[#54555A] leading-relaxed space-y-3 pt-2">
                  <p className="text-sm sm:text-base font-medium text-[#16171A]">
                    {product.description}
                  </p>
                  <p>
                    Chaque exemplaire sélectionné par AFRINOVA SHOP répond à un cahier des charges rigoureux. Nous privilégions les matériaux nobles, les finitions précises et la longévité d&apos;utilisation pour vous offrir une expérience d&apos;usage digne des plus grands standards.
                  </p>
                  <p>
                    Que ce soit pour votre usage personnel au quotidien ou pour offrir un présent d&apos;exception à un proche, cet article allie raffinement, robustesse et élégance intemporelle.
                  </p>
                </div>
              </section>

              {/* 6.2 CARACTÉRISTIQUES TECHNIQUES */}
              <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE8E2] shadow-xs space-y-4" aria-labelledby="specs-heading">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FBF4ED] text-[#C27835] flex items-center justify-center shrink-0 border border-[#F2DFCE]">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835]">
                      Spécifications
                    </span>
                    <h2 id="specs-heading" className="font-heading font-black text-lg sm:text-xl text-[#16171A]">
                      Caractéristiques techniques
                    </h2>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="divide-y divide-[#EAE8E2] border border-[#EAE8E2] rounded-2xl overflow-hidden bg-[#FAF9F6]">
                    {specs.map((spec, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 px-4 sm:px-5 gap-1 sm:gap-4 text-xs sm:text-sm">
                        <span className="font-bold text-[#16171A] shrink-0 sm:w-1/3">
                          {spec.label}
                        </span>
                        <span className="text-[#54555A] sm:w-2/3 sm:text-right">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 6.3 INFORMATIONS DE LIVRAISON */}
              <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE8E2] shadow-xs space-y-4" aria-labelledby="delivery-heading">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FBF4ED] text-[#C27835] flex items-center justify-center shrink-0 border border-[#F2DFCE]">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835]">
                      Logistique Bénin
                    </span>
                    <h2 id="delivery-heading" className="font-heading font-black text-lg sm:text-xl text-[#16171A]">
                      Informations de livraison
                    </h2>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3.5 pt-2">
                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] space-y-1.5">
                    <div className="font-heading font-bold text-xs sm:text-sm text-[#16171A] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#C27835]" />
                      <span>Délais d&apos;expédition</span>
                    </div>
                    <p className="text-xs text-[#54555A] leading-relaxed">
                      Livraison express sous <strong>24h à Cotonou et Calavi</strong>. Expédition sous 24h à 48h vers Porto-Novo, Parakou et l&apos;ensemble des communes du Bénin.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] space-y-1.5">
                    <div className="font-heading font-bold text-xs sm:text-sm text-[#16171A] flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-[#C27835]" />
                      <span>Appel avant passage</span>
                    </div>
                    <p className="text-xs text-[#54555A] leading-relaxed">
                      Notre coursier vous contacte toujours par appel ou message avant son déplacement afin de fixer l&apos;heure et le repère idéal de rendez-vous.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] space-y-1.5">
                    <div className="font-heading font-bold text-xs sm:text-sm text-[#16171A] flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-[#C27835]" />
                      <span>Paiement en main propre</span>
                    </div>
                    <p className="text-xs text-[#54555A] leading-relaxed">
                      Aucune avance n&apos;est exigée. Vous réglez directement en espèces ou par Mobile Money lors de la réception de votre article.
                    </p>
                  </div>
                </div>
              </section>

              {/* 6.4 GARANTIES ET CONDITIONS DE RETOUR */}
              <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE8E2] shadow-xs space-y-4" aria-labelledby="warranty-heading">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FBF4ED] text-[#C27835] flex items-center justify-center shrink-0 border border-[#F2DFCE]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835]">
                      Tranquillité d&apos;Achat
                    </span>
                    <h2 id="warranty-heading" className="font-heading font-black text-lg sm:text-xl text-[#16171A]">
                      Garanties et conditions de retour
                    </h2>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
                    <h3 className="font-heading font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Contrôle libre du colis à l&apos;ouverture</span>
                    </h3>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      Vous avez le droit légitime d&apos;ouvrir votre colis en présence du livreur pour vous assurer de la parfaite conformité de la commande avant d&apos;effectuer votre paiement.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] space-y-2">
                    <h3 className="font-heading font-bold text-sm text-[#16171A] flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-[#C27835]" />
                      <span>Échange immédiat sous 48h</span>
                    </h3>
                    <p className="text-xs text-[#54555A] leading-relaxed">
                      Si l&apos;article présente la moindre anomalie constatée dans les 48 heures suivant la réception, notre service client basé à Cotonou organise un échange gratuit sans délai.
                    </p>
                  </div>
                </div>
              </section>

              {/* 6.5 AVIS CLIENTS VÉRIFIÉS */}
              <section id="avis-clients" className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE8E2] shadow-xs space-y-6" aria-labelledby="reviews-heading">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE8E2] pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-base border border-amber-200/80 shrink-0">
                      ★ 4.9
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 id="reviews-heading" className="font-heading font-black text-lg sm:text-xl text-[#16171A]">
                          Avis clients vérifiés
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Certifiés réels
                        </span>
                      </div>
                      <p className="text-xs text-[#73737A] mt-0.5">
                        Basé sur les retours d&apos;expérience de nos clients au Bénin
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="btn-secondary text-xs py-2.5 px-4 self-start sm:self-auto cursor-pointer"
                  >
                    Donner mon avis
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviews.slice(0, 6).map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-[#73737A]">
                            {formatReviewDate(rev.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-[#16171A] leading-relaxed italic font-medium">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#EAE8E2]/60 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#16171A]">
                          {rev.customer_name}
                        </span>
                        <span className="text-[#73737A]">
                          📍 {rev.city || 'Bénin'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* SECTION "VOUS AIMEREZ AUSSI" */}
            {relatedProducts.length > 0 && (
              <section className="pt-10 border-t border-[#EAE8E2]" aria-label="Articles similaires">
                <div className="flex items-center justify-between mb-6">
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

          </div>
        )}
      </main>

      {/* 7. BARRE DE COMMANDE FIXE EN BAS (STICKY BOTTOM BAR MOBILE) */}
      {!orderConfirmed && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#EAE8E2] px-4 py-2.5 z-30 shadow-xl flex items-center justify-between pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#73737A] uppercase font-bold tracking-wider">
              TOTAL À LA RÉCEPTION
            </div>
            <div className="text-base font-heading font-black text-[#16171A] tabular-nums">
              {formatFCFA(currentTotal)}
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToForm}
            className="btn-accent btn-cta-animated text-xs py-2.5 px-5 min-h-[44px] flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span className="font-heading font-black tracking-wide">Commander maintenant</span>
            <span className="btn-cta-nudge">↓</span>
          </button>
        </div>
      )}

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
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-lg transition cursor-pointer"
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

      {/* MODAL LAISSER UN AVIS */}
      {showReviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#EAE8E2] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#EAE8E2] pb-3">
              <h3 className="font-heading font-black text-base text-[#16171A]">
                Partager votre expérience
              </h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {reviewSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold text-center border border-emerald-200">
                {reviewSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#54555A] mb-1">
                    Votre note *
                  </label>
                  <div className="flex gap-1.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}
                        className="cursor-pointer hover:scale-110 transition-transform p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${s <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#54555A] mb-1">
                    Votre prénom ou nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewForm.customerName}
                    onChange={(e) => setReviewForm((f) => ({ ...f, customerName: e.target.value }))}
                    placeholder="ex: Patrick K."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C27835]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#54555A] mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewForm.city}
                    onChange={(e) => setReviewForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="ex: Cotonou, Calavi, Parakou..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C27835]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#54555A] mb-1">
                    Votre avis sur le produit *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder="Partagez votre avis sur la qualité, la finition ou la livraison..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C27835]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full btn-accent text-xs py-3 rounded-xl font-bold cursor-pointer"
                >
                  {submittingReview ? 'Envoi en cours...' : 'Envoyer mon avis'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BOUTON FLOTTANT WHATSAPP */}
      <FloatingWhatsApp productName={product.name} />
    </div>
  );
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><div className="w-8 h-8 border-3 border-[#C27835] border-t-transparent rounded-full animate-spin" /></div>}>
      <ProductDetailView />
    </Suspense>
  );
}