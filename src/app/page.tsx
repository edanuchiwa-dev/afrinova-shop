'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Truck,
  Package,
  ShieldCheck,
  MessageCircle,
  Home,
  LayoutGrid,
  Star,
  CheckCircle2,
  Sparkles,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { formatFCFA } from '@/lib/format';
import { captureUtmParams } from '@/lib/utm';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { Product } from '@/lib/catalog';
import { Review } from '@/lib/db';

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

function getInitials(name: string): string {
  if (!name) return 'CL';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
}

const fallbackReviews: Review[] = [
  { id: 1, product_id: null, rating: 5, customer_name: 'Arnaud D.', city: 'Cotonou', comment: 'Articles bien finis et conformes aux photos, livraison rapide sur Cotonou.', status: 'approuve', created_at: '2026-11-02 14:20:00', photo_url: null },
  { id: 2, product_id: null, rating: 5, customer_name: 'Boris K.', city: 'Abomey-Calavi', comment: 'Le coursier m\'a laissé ouvrir le colis pour vérifier avant de régler en espèces.', status: 'approuve', created_at: '2026-10-31 11:45:00', photo_url: null },
  { id: 3, product_id: null, rating: 5, customer_name: 'Chantal A.', city: 'Porto-Novo', comment: 'Commande reçue le lendemain à Porto-Novo dans un emballage très propre.', status: 'approuve', created_at: '2026-10-28 16:30:00', photo_url: null },
  { id: 4, product_id: null, rating: 4, customer_name: 'Hermann T.', city: 'Cotonou', comment: 'Boutique sérieuse, juste un petit retard de livraison dû aux embouteillages.', status: 'approuve', created_at: '2026-10-24 18:10:00', photo_url: null },
  { id: 5, product_id: null, rating: 5, customer_name: 'Ulrich S.', city: 'Parakou', comment: 'Expédition sécurisée jusqu\'à Parakou, colis bien protégé et intact.', status: 'approuve', created_at: '2026-10-20 09:30:00', photo_url: null },
  { id: 6, product_id: null, rating: 5, customer_name: 'Serge G.', city: 'Cotonou', comment: 'Très bonne sélection de produits, le service client WhatsApp répond vite.', status: 'approuve', created_at: '2026-10-18 17:15:00', photo_url: null },
];

// Catalogue de secours (starter) si l'API est inaccessible
const fallbackProducts: Product[] = [
  { id: 1, name: 'Montre Chronographe Automatique', slug: 'montre-chronographe', description: 'Boîtier en acier 316L, mouvement automatique haute précision, verre saphir.', price: 18900, stock: 11, category: 'Montres', image_url: '/images/products/montre-chronographe.jpg' },
  { id: 2, name: 'Sacoche Cuir Véritable Vintage', slug: 'sacoche-cuir', description: 'Cuir pleine fleur tannage végétal, coutures renforcées au fil de lin ciré.', price: 12900, stock: 9, category: 'Maroquinerie', image_url: '/images/products/sacoche-cuir.jpg' },
  { id: 3, name: 'Casque Audio Sans Fil Hi-Fi Réduction de Bruit', slug: 'casque-audio-sans-fil', description: 'Transducteurs 40mm au béryllium, réduction active de bruit hybride.', price: 14900, stock: 15, category: 'Audio', image_url: '/images/products/casque-audio.jpg' },
  { id: 4, name: 'Portefeuille Minimaliste Anti-RFID', slug: 'portefeuille-rfid', description: 'Aluminium anodisé et cuir véritable, mécanisme d\'éjection rapide 6 cartes.', price: 4900, stock: 20, category: 'Maroquinerie', image_url: '/images/products/portefeuille-rfid.jpg' },
];

const promise = 'Chaque produit physique est sélectionné avec soin. Nous vérifions la qualité, nous emballons avec attention et nous expédions directement chez vous en 24 heures.';
const PROMISE_TOKENS = promise.split(' ');
const words = ['durables', 'uniques', 'garantis'];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useTypewriter(reduced: boolean) {
  const [text, setText] = useState(words[0]);
  useEffect(() => {
    if (reduced) return;
    let wordIdx = 0;
    let charIdx = words[0].length;
    let isDeleting = true;
    let timer: NodeJS.Timeout;

    const tick = () => {
      const currentWord = words[wordIdx];
      if (isDeleting) {
        charIdx--;
        setText(currentWord.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) {
          isDeleting = false;
          wordIdx = (wordIdx + 1) % words.length;
          timer = setTimeout(tick, 300);
          return;
        }
        timer = setTimeout(tick, 45);
      } else {
        charIdx++;
        setText(currentWord.slice(0, charIdx));
        if (charIdx >= currentWord.length) {
          isDeleting = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 85);
      }
    };

    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, [reduced]);
  return text;
}

function Counters({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState([24, 1500, 100]);
  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) return;
    const targets = [24, 1500, 100];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setValues([0, 0, 0]);
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - start) / 1800, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValues(targets.map((target) => Math.round(target * eased)));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div ref={ref} className="max-w-4xl mx-auto px-4 sm:px-6 my-8 sm:my-12">
      <div className="grid grid-cols-3 gap-3 sm:gap-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 text-center shadow-xs">
        <div className="p-2 sm:p-3">
          <div className="text-2xl sm:text-4xl font-black text-slate-900 tabular-nums">{values[0]}h</div>
          <div className="text-[10px] sm:text-xs font-extrabold uppercase text-emerald-600 mt-1">Heures</div>
          <div className="text-[9px] sm:text-[11px] text-slate-400 font-medium">Expédition express</div>
        </div>
        <div className="p-2 sm:p-3 border-x border-slate-100">
          <div className="text-2xl sm:text-4xl font-black text-slate-900 tabular-nums">{values[1].toLocaleString('fr-FR')}+</div>
          <div className="text-[10px] sm:text-xs font-extrabold uppercase text-blue-600 mt-1">Colis livrés</div>
          <div className="text-[9px] sm:text-[11px] text-slate-400 font-medium">France & Europe</div>
        </div>
        <div className="p-2 sm:p-3">
          <div className="text-2xl sm:text-4xl font-black text-slate-900 tabular-nums">{values[2]}%</div>
          <div className="text-[10px] sm:text-xs font-extrabold uppercase text-purple-600 mt-1">Garanti</div>
          <div className="text-[9px] sm:text-[11px] text-slate-400 font-medium">Stocks réels vérifiés</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const reduced = useReducedMotion();
  const typed = useTypewriter(reduced);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('Tous');
  const [revealed, setRevealed] = useState(true);
  const [litCount, setLitCount] = useState(PROMISE_TOKENS.length);
  const maskRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetch('/api/reviews')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.customerName.trim() || !reviewForm.comment.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewForm.rating,
          customerName: reviewForm.customerName.trim(),
          city: reviewForm.city.trim(),
          comment: reviewForm.comment.trim(),
        }),
      });
      if (res.ok) {
        setReviewSuccessMsg('Avis enregistré avec succès.');
        const newRev: Review = {
          id: Date.now(),
          product_id: null,
          rating: reviewForm.rating,
          customer_name: reviewForm.customerName.trim(),
          city: reviewForm.city.trim(),
          comment: reviewForm.comment.trim(),
          status: 'approuve',
          created_at: new Date().toISOString(),
          photo_url: null,
        };
        setReviews((prev) => [newRev, ...prev]);
        setTimeout(() => {
          setShowReviewModal(false);
          setReviewSuccessMsg('');
          setReviewForm({ customerName: '', city: 'Cotonou', rating: 5, comment: '' });
        }, 1500);
      }
    } catch {
      // Ignorer
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    captureUtmParams();
    let isMounted = true;
    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (Array.isArray(data) && data.length > 0 && isMounted) {
          setProducts(data as Product[]);
        }
      } catch {
        // Maintien du catalogue initial de secours
      }
    }
    void loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const element = maskRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { threshold: 0.05, rootMargin: '50px 0px 0px 0px' });
    observer.observe(element);
    const fallbackTimer = setTimeout(() => setRevealed(true), 1000);
    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const box = highlightRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight * 0.6)));
      setLitCount(Math.min(PROMISE_TOKENS.length, Math.floor(progress * PROMISE_TOKENS.length * 1.3)));
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('touchmove', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('touchmove', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const categories = useMemo(() => ['Tous', ...new Set(products.map((product) => product.category))], [products]);
  const visible = category === 'Tous' ? products : products.filter((product) => product.category === category);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#16171A] pb-24 md:pb-16 antialiased">
      {/* 0. ANNONCE DÉFILANTE HAUT DE PAGE */}
      <AnnouncementBar />

      {/* 1. EN-TÊTE ÉPURÉ BOUTIQUE PRESTIGE */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 1. HERO SECTION RESPONSIVE */}
        <section className="pt-4 sm:pt-8" aria-label="Bienvenue dans notre boutique">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 sm:p-10 lg:p-14 text-white shadow-xl">
            <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
              
              {/* Left Column Text & CTA */}
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-400 border border-blue-400/30">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                  Sélection Exclusive 2026
                </span>
                
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white">
                  Des objets{' '}
                  <span className="border-r-3 border-blue-400 pr-1 text-blue-400 font-black inline-block min-w-[130px] sm:min-w-[190px] animate-pulse">
                    {typed}
                  </span>
                  <br />
                  pour votre quotidien.
                </h1>

                <p className="text-xs sm:text-base text-slate-300 max-w-xl leading-relaxed">
                  Chaque pièce est expédiée directement depuis notre atelier. 
                  Commandez en 1 clic sans barrière de carte bancaire, avec suivi de livraison en temps réel.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="#catalogue"
                    className="inline-flex items-center gap-2 rounded-full bg-[#C27835] hover:bg-[#A56024] text-white px-6 py-3.5 text-xs sm:text-sm font-bold shadow-lg transition active:scale-95"
                  >
                    <span>Explorer le catalogue</span>
                    <span>↓</span>
                  </a>
                  <a
                    href={`https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '22942520869').replace(/[\s\+]/g, '')}?text=${encodeURIComponent("Bonjour AFRINOVA SHOP, j'aimerais échanger avec votre service client.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3.5 text-xs sm:text-sm font-bold transition active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                    <span>Discuter sur WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Right Column Featured Visual (Visible Mobile & Desktop) */}
              <div className="lg:col-span-5 relative flex items-center justify-center mt-4 lg:mt-0">
                <div className="relative w-full aspect-[4/3] sm:aspect-[4/3.2] rounded-3xl overflow-hidden shadow-2xl border border-white/15 group">
                  <Image
                    src="/images/hero-visuel-shopping.jpg"
                    alt="Cliente découvrant ses achats AFRINOVA SHOP Bénin"
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 40vw"
                    className="object-cover object-[center_20%] group-hover:scale-105 transition duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E11]/85 via-transparent to-[#0D0E11]/20"></div>

                  {/* Badge Flottant en haut à gauche */}
                  <div className="absolute top-4 left-4 bg-[#121316]/80 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/20 shadow-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-white tracking-wide">
                      Service Client Bénin 7j/7
                    </span>
                  </div>
                  
                  {/* Floating Glassmorphic Welcome Card en bas */}
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-[#121316]/85 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/15 shadow-xl">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-heading font-black text-white">
                        « Bienvenue chez AFRINOVA SHOP »
                      </span>
                      <span className="text-[10px] font-bold text-[#C27835] bg-[#C27835]/15 px-2 py-0.5 rounded-full border border-[#C27835]/30">
                        Cotonou & Régions
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Paiement en espèces à la livraison. Vérifiez chaque détail de votre commande avec le coursier.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>


        {/* 2. SPLIT-TEXT MASK REVEAL (Animation 2) */}
        <section id="philosophie" ref={maskRef} className="my-10 sm:my-16 text-center max-w-3xl mx-auto px-4" aria-label="Notre philosophie">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-600 border border-blue-100">
            Notre Philosophie Directe
          </span>
          <h2 className="mt-4 text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 leading-snug">
            <span className="mask-wrap">
              <span className={`mask-elem ${revealed ? 'revealed' : ''}`}>
                Des articles bien pensés,
              </span>
            </span>
            <br />
            <span className="mask-wrap">
              <span
                className={`mask-elem text-blue-600 ${revealed ? 'revealed' : ''}`}
                style={{ transitionDelay: reduced ? '0ms' : '140ms' }}
              >
                livrés sans aucun intermédiaire superflu.
              </span>
            </span>
          </h2>
        </section>


        {/* 3. WORD-BY-WORD SCROLL HIGHLIGHT (Animation 1) */}
        <section ref={highlightRef} className="max-w-4xl mx-auto my-8 sm:my-12 px-4" aria-label="Engagement direct">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs">
            <div className="mb-3 flex items-center justify-between gap-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-blue-600">✦</span>
                <span>Engagement Qualité & Circuit Court</span>
              </span>
              <span className="text-blue-600 font-extrabold">Scrollez pour allumer ↓</span>
            </div>
            <p className="text-sm sm:text-xl font-semibold leading-relaxed">
              {PROMISE_TOKENS.map((word, index) => (
                <span
                  key={index}
                  className={`word-hl ${index < litCount ? 'lit' : ''}`}
                >
                  {word}{index < PROMISE_TOKENS.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>
        </section>


        {/* 4. DYNAMIC NUMBER COUNTERS (Animation 4) */}
        <Counters reduced={reduced} />

        {/* 5. CATALOGUE & PRODUCT GRID (2 COLUMNS MOBILE, 3-4 COLUMNS DESKTOP) */}
        <section id="catalogue" className="scroll-mt-20 border-t border-slate-200/80 pt-10 sm:pt-14">
          <div className="pb-6 text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-600 border border-blue-100">
              Nos Articles Disponibles
            </span>
            <h2 className="mt-2 text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Prêts à être expédiés chez vous aujourd&apos;hui
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sélectionnez un article pour voir les détails et passer commande en 30 secondes.
            </p>
          </div>

          {/* Filtres de catégorie (scrollable mobile, centré desktop) */}
          <div className="mb-8 flex justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar py-2" aria-label="Filtrer par catégorie">
            {categories.map((cat) => {
              const count = cat === 'Tous' ? products.length : products.filter((p) => p.category === cat).length;
              const isActive = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={isActive}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#121316] text-white shadow-xs'
                      : 'border border-[#EAE8E2] bg-white text-[#54555A] hover:border-[#C27835] hover:text-[#16171A]'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#F4F3F0] text-[#73737A]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grille Produits Shopify Premium: 2 cols mobile, 3 cols tablet, 4 cols desktop */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-[#EAE8E2]">
              <p className="text-sm font-semibold text-[#73737A]">Aucun article dans cette catégorie pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* 5 BIS. AVIS CLIENTS GÉNÉRAUX DE LA VITRINE */}
        <section id="avis" className="scroll-mt-24 my-16 sm:my-24" aria-label="Avis clients vérifiés sur la boutique">
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE8E2] shadow-xs space-y-8">
            
            {/* En-tête de section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#F3F1EC] pb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835] bg-[#FBF4ED] px-3.5 py-1 rounded-full border border-[#F2DFCE] inline-block mb-2">
                  Retours d'expérience
                </span>
                <h2 className="font-heading font-black text-2xl sm:text-3xl text-[#16171A]">
                  Avis de nos clients au Bénin
                </h2>
                <p className="text-xs sm:text-sm text-[#73737A] mt-1.5">
                  Témoignages de clients ayant commandé sur notre boutique avec paiement à la réception.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Note globale */}
                <div className="flex items-center gap-2 bg-[#FAF9F6] border border-[#EAE8E2] rounded-2xl px-4 py-2">
                  <div className="flex text-amber-500 text-sm">★★★★★</div>
                  <span className="font-black text-sm text-[#16171A]">4.9 / 5</span>
                  <span className="text-[11px] text-[#73737A]">({reviews.length} avis)</span>
                </div>

                {/* Bouton Donner mon avis */}
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="bg-[#121316] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full transition shadow-xs cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Donner mon avis</span>
                </button>
              </div>
            </div>

            {/* Grille des avis généraux (1 ligne max par avis, zéro point d'exclamation) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-[#FCFBF8] border border-[#F0EEE8] flex flex-col justify-between gap-3 hover:border-[#D5D0C5] transition shadow-2xs"
                >
                  <div className="space-y-2">
                    {/* Header de la carte : Avatar + Nom + Ville + Étoiles */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 border ${getAvatarColor(rev.customer_name)}`}>
                          {getInitials(rev.customer_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-xs text-[#16171A] truncate">
                            {rev.customer_name}
                          </div>
                          <div className="text-[10px] text-[#73737A]">
                            📍 {rev.city}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Avis en 1 ligne max */}
                    <p className="text-xs text-[#2D2E32] leading-snug line-clamp-1 font-medium pl-2 border-l-2 border-[#C27835]/30">
                      {rev.comment}
                    </p>
                  </div>

                  {/* Badge de réassurance bas de carte */}
                  <div className="flex items-center justify-between text-[10px] text-[#8C8C94] pt-2 border-t border-[#F5F3ED]">
                    <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Achat vérifié</span>
                    </span>
                    <span>Remise en main propre</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bandeau de réassurance globale */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] flex flex-wrap items-center justify-between gap-3 text-xs text-[#54555A]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-[#16171A]">100% de transparence :</span>
                <span>Chaque commande est vérifiée lors de la remise avant encaissement.</span>
              </div>
              <div className="text-[11px] text-[#73737A]">
                Expéditions assurées sur tout le territoire béninois
              </div>
            </div>

          </div>
        </section>


        {/* 6. BANDEAU "COMMENT ÇA MARCHE" (3 ÉTAPES) */}
        <section id="comment-ca-marche" className="scroll-mt-24 my-20 sm:my-28" aria-label="Comment commander">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835] bg-[#FBF4ED] px-3.5 py-1 rounded-full border border-[#F2DFCE]">
              Simplicité & Sécurité
            </span>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-[#16171A] mt-3">
              Comment ça marche ?
            </h2>
            <p className="text-xs sm:text-sm text-[#73737A] mt-2">
              Commander chez AFRINOVA SHOP ne prend que 60 secondes. Zéro inscription, zéro carte bancaire.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE8E2] shadow-xs relative">
              <span className="w-10 h-10 rounded-2xl bg-[#121316] text-white font-heading font-black text-sm flex items-center justify-center mb-5">
                01
              </span>
              <h3 className="font-heading font-bold text-base text-[#16171A] mb-2">
                1. Je choisis mon article
              </h3>
              <p className="text-xs sm:text-sm text-[#54555A] leading-relaxed">
                Explorez notre collection exclusive et découvrez les caractéristiques de chaque pièce confectionnée pour durer.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE8E2] shadow-xs relative">
              <span className="w-10 h-10 rounded-2xl bg-[#C27835] text-white font-heading font-black text-sm flex items-center justify-center mb-5">
                02
              </span>
              <h3 className="font-heading font-bold text-base text-[#16171A] mb-2">
                2. Je remplis mes coordonnées
              </h3>
              <p className="text-xs sm:text-sm text-[#54555A] leading-relaxed">
                Renseignez votre numéro de téléphone et votre point de repère au Bénin pour guider notre coursier local.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE8E2] shadow-xs relative">
              <span className="w-10 h-10 rounded-2xl bg-[#121316] text-white font-heading font-black text-sm flex items-center justify-center mb-5">
                03
              </span>
              <h3 className="font-heading font-bold text-base text-[#16171A] mb-2">
                3. Je paie à la livraison
              </h3>
              <p className="text-xs sm:text-sm text-[#54555A] leading-relaxed">
                Votre colis arrive scellé sous 24h à 48h. Vous vérifiez son état avant de régler en espèces au livreur.
              </p>
            </div>
          </div>
        </section>


        {/* 7. FAQ EN ACCORDÉONS */}
        <section id="faq" className="scroll-mt-24 my-20 sm:my-28 max-w-3xl mx-auto" aria-label="Foire aux questions">
          <div className="text-center mb-10">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C27835] bg-[#FBF4ED] px-3.5 py-1 rounded-full border border-[#F2DFCE]">
              Réponses Claires
            </span>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-[#16171A] mt-3">
              Questions Fréquentes
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE8E2] shadow-xs divide-y divide-[#EAE8E2]">
            <details className="group py-4 select-none" open>
              <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm sm:text-base text-[#16171A]">
                <span>Quels sont les délais de livraison au Bénin ?</span>
                <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
              </summary>
              <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed space-y-1.5">
                <p>• <strong>Organisation directe :</strong> Dès validation de votre commande, notre équipe prend directement contact avec vous par téléphone ou WhatsApp pour valider les modalités et convenir du lieu de remise.</p>
                <p>• <strong>Cotonou :</strong> livraison express sous 24h ouvrées.</p>
                <p>• <strong>Abomey-Calavi & Godomey :</strong> livraison sous 24h à 48h.</p>
                <p>• <strong>Porto-Novo, Sèmè & Ouidah :</strong> livraison sous 24h à 48h.</p>
                <p>• <strong>Autres départements (Parakou, Natitingou, Bohicon...) :</strong> expédition sécurisée sous 48h à 72h.</p>
              </div>
            </details>

            <details className="group py-4 select-none">
              <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm sm:text-base text-[#16171A]">
                <span>Comment fonctionne le paiement à la livraison ?</span>
                <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
              </summary>
              <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed">
                Vous ne déboursez aucun centime lors de la commande sur le site. Notre coursier se déplace jusqu&apos;à votre point de repère avec le colis scellé. Vous pouvez inspecter le produit et remettre le montant exact en Francs CFA (espèces) directement en main propre.
              </div>
            </details>

            <details className="group py-4 select-none">
              <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm sm:text-base text-[#16171A]">
                <span>Que faire si le produit ne correspond pas ou présente un défaut ?</span>
                <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
              </summary>
              <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed">
                Toutes nos pièces bénéficient d&apos;une garantie d&apos;échange de 48 heures ouvrées après réception. En cas d&apos;anomalie, un simple message sur notre ligne WhatsApp officielle suffit : notre équipe prend en charge le remplacement à nos frais.
              </div>
            </details>

            <details className="group py-4 select-none">
              <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-bold text-sm sm:text-base text-[#16171A]">
                <span>Les pièces sont-elles authentiques et garanties ?</span>
                <span className="text-[#73737A] transition-transform duration-200 group-open:rotate-180">↓</span>
              </summary>
              <div className="pt-3 text-xs sm:text-sm text-[#54555A] leading-relaxed">
                Absolument. Chaque article physique proposé sur notre boutique est inspecté individuellement dans notre atelier partenaire avant d&apos;être conditionné dans un emballage antichoc renforcé.
              </div>
            </details>
          </div>
        </section>


        {/* 8. RÉASSURANCE & ENGAGEMENTS */}
        <section id="garanties" className="scroll-mt-24 rounded-3xl border border-[#EAE8E2] bg-white p-6 sm:p-10 shadow-xs mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-[#F3F1EC]">
            <div className="pt-4 md:pt-0 md:px-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] flex items-center justify-center shrink-0 text-[#C27835] shadow-xs">
                <Truck className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-sm font-heading font-black text-[#16171A]">Expédition Rapide sous 24h</h4>
                <p className="text-xs text-[#73737A] mt-0.5">Coursiers express & transporteurs régionaux avec suivi direct.</p>
              </div>
            </div>
            <div className="pt-4 md:pt-0 md:px-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] flex items-center justify-center shrink-0 text-[#C27835] shadow-xs">
                <Package className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-sm font-heading font-black text-[#16171A]">Emballage Antichoc Certifié</h4>
                <p className="text-xs text-[#73737A] mt-0.5">Protection renforcée pour garantir l&apos;intégrité de vos articles.</p>
              </div>
            </div>
            <div className="pt-4 md:pt-0 md:px-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#EAE8E2] flex items-center justify-center shrink-0 text-[#C27835] shadow-xs">
                <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-sm font-heading font-black text-[#16171A]">Paiement à la Livraison</h4>
                <p className="text-xs text-[#73737A] mt-0.5">Zéro carte bancaire requise. Vérifiez votre colis avant de régler.</p>
              </div>
            </div>
          </div>
        </section>


        {/* 9. PIED DE PAGE COMPLET SHOPIFY PRESTIGE */}
        <footer className="border-t border-[#EAE8E2] pt-14 pb-8 text-[#54555A] text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            {/* Colonne 1 : À propos */}
            <div className="space-y-3">
              <span className="font-heading font-black text-base text-[#16171A] uppercase tracking-tight block">
                AFRINOVA SHOP
              </span>
              <p className="text-xs text-[#73737A] leading-relaxed">
                Boutique en ligne exclusive et tendance au Bénin. Nous proposons des articles sélectionnés avec rigueur, expédiés directement chez vous sans intermédiaire.
              </p>
              <div className="pt-1 text-[11px] text-[#73737A]">
                Service logistique : Cotonou, Bénin.
              </div>
            </div>

            {/* Colonne 2 : Zones Livrées */}
            <div className="space-y-3">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#16171A]">
                Zones de Livraison
              </h4>
              <ul className="space-y-1.5 text-xs text-[#73737A]">
                <li>• Cotonou (24h ouvrées)</li>
                <li>• Abomey-Calavi & Godomey (24h-48h)</li>
                <li>• Porto-Novo, Sèmè & Ouidah</li>
                <li>• Parakou, Bohicon, Natitingou</li>
                <li>• Toutes les 77 communes du Bénin</li>
              </ul>
            </div>

            {/* Colonne 3 : Service Client & WhatsApp */}
            <div className="space-y-3">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#16171A]">
                Service Clientèle
              </h4>
              <p className="text-xs text-[#73737A] leading-relaxed">
                Une question sur une commande ou un article ? Nos conseillers sont à votre écoute 7j/7.
              </p>
              <a
                href={`https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '2290197000000').replace(/[\s\+]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-[#128C7E] hover:underline"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>Ligne WhatsApp : +229 01 97 00 00 00</span>
              </a>
              <p className="text-[11px] text-[#9C9CA4]">
                Horaires : 8h00 - 19h00 (Heure de Cotonou)
              </p>
            </div>

            {/* Colonne 4 : Liens Utiles & Légaux */}
            <div className="space-y-3">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-[#16171A]">
                Informations & Suivi
              </h4>
              <ul className="space-y-2 font-medium">
                <li>
                  <Link href="/suivi" className="hover:text-[#16171A] transition inline-flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#73737A]" />
                    <span>Suivre mon colis en direct</span>
                  </Link>
                </li>
                <li>
                  <Link href="/mentions-legales" className="hover:text-[#16171A] transition">
                    Mentions Légales (Code du numérique)
                  </Link>
                </li>
                <li>
                  <Link href="/cgv" className="hover:text-[#16171A] transition">
                    Conditions Générales de Vente
                  </Link>
                </li>
                <li>
                  <Link href="/confidentialite" className="hover:text-[#16171A] transition">
                    Protection des Données (APDP)
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Bas du footer */}
          <div className="pt-8 border-t border-[#EAE8E2] flex flex-col sm:flex-row justify-between items-center text-[11px] text-[#9C9CA4] gap-3">
            <div>
              © 2026 AFRINOVA SHOP. Tous droits réservés. Conformité Code du numérique béninois.
            </div>
            <a href="#" className="hover:text-[#16171A] transition font-semibold">
              Haut de page ↑
            </a>
          </div>
        </footer>

      </main>

      {/* MODAL LAISSER UN AVIS SUR LA BOUTIQUE */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#EAE8E2] space-y-5 relative">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 mb-1.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                Votre Témoignage
              </div>
              <h3 className="font-heading font-black text-xl text-[#16171A]">
                Partagez votre avis sur AFRINOVA SHOP
              </h3>
              <p className="text-xs text-[#73737A] mt-1">
                Votre retour d&apos;expérience sur la livraison, la qualité et le paiement à la remise.
              </p>
            </div>

            {reviewSuccessMsg ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5 stroke-2" />
                </div>
                <div className="font-heading font-bold text-sm text-emerald-900">
                  {reviewSuccessMsg}
                </div>
                <p className="text-xs text-emerald-700">
                  Votre avis est maintenant visible sur la vitrine.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Note en étoiles */}
                <div>
                  <label className="block text-xs font-bold text-[#16171A] mb-1.5">
                    Votre note globale
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                        className="p-1 hover:scale-110 transition cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= reviewForm.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-extrabold text-amber-600 ml-2">
                      {reviewForm.rating}/5
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#16171A] mb-1">
                      Votre prénom & initiale
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Marius A."
                      value={reviewForm.customerName}
                      onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-[#EAE8E2] focus:border-[#16171A] outline-hidden bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#16171A] mb-1">
                      Ville (Bénin)
                    </label>
                    <select
                      value={reviewForm.city}
                      onChange={(e) => setReviewForm({ ...reviewForm, city: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-[#EAE8E2] focus:border-[#16171A] outline-hidden bg-[#FAF9F6]"
                    >
                      <option value="Cotonou">Cotonou</option>
                      <option value="Abomey-Calavi">Abomey-Calavi</option>
                      <option value="Porto-Novo">Porto-Novo</option>
                      <option value="Parakou">Parakou</option>
                      <option value="Ouidah">Ouidah</option>
                      <option value="Bohicon">Bohicon</option>
                      <option value="Autre commune">Autre commune</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16171A] mb-1">
                    Votre avis en une phrase (sans point d&apos;exclamation)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    placeholder="Ex: Livraison soignée et conforme aux photos, je recommande."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value.replace(/!/g, '.') })}
                    className="w-full text-xs p-3 rounded-xl border border-[#EAE8E2] focus:border-[#16171A] outline-hidden bg-[#FAF9F6]"
                  />
                  <span className="text-[10px] text-[#73737A] mt-1 block">
                    1 ligne maximum pour rester clair et lisible.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-3 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider bg-[#16171A] hover:bg-black text-white transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{submittingReview ? 'Envoi...' : 'Publier mon avis'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BOUTON FLOTTANT WHATSAPP (6.5 BIS) */}
      <FloatingWhatsApp />

      {/* NAVIGATION BASSE MOBILE STICKY */}
      <nav aria-label="Navigation mobile" className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around border-t border-[#EAE8E2] bg-white/95 px-6 py-2 text-[10px] font-bold text-[#73737A] shadow-lg backdrop-blur-md">
        <Link href="/" className="flex flex-col items-center gap-1 text-[#C27835]">
          <Home className="w-4 h-4 stroke-[2]" />
          <span>Accueil</span>
        </Link>
        <a href="#catalogue" className="flex flex-col items-center gap-1 hover:text-[#16171A]">
          <LayoutGrid className="w-4 h-4 stroke-[2]" />
          <span>Catalogue</span>
        </a>
        <Link href="/suivi" className="flex flex-col items-center gap-1 hover:text-[#16171A]">
          <Package className="w-4 h-4 stroke-[2]" />
          <span>Suivi</span>
        </Link>
      </nav>
    </div>
  );
}
