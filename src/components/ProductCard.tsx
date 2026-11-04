import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Clock } from 'lucide-react';
import { formatFCFA } from '@/lib/format';
import { Product, PRODUCT_GALLERIES, getProductOriginalPrice, getProductDiscountBadge } from '@/lib/catalog';

export default function ProductCard({ product }: { product: Product }) {
  const isPromo = !!product.promotion && product.promotion.remaining_quota > 0;
  const currentPrice = isPromo ? product.promotion!.promo_price : product.price;
  const originalPrice = isPromo ? product.promotion!.original_price : getProductOriginalPrice(product.price);
  const discountBadge = getProductDiscountBadge(currentPrice, originalPrice);
  const gallery = PRODUCT_GALLERIES[product.slug] || [];
  const secondaryImage = gallery[1] || null;

  return (
    <article className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl bg-white border border-[#EAE8E2] overflow-hidden hover:border-[#D7D4CC] hover:shadow-xl transition-all duration-300">
      <Link
        href={`/produit/${encodeURIComponent(product.slug)}`}
        className="block relative aspect-[4/5] bg-[#F4F3F0] overflow-hidden select-none"
      >
        {/* Image principale */}
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority={product.id <= 4}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#9C9CA4]">
            Photographie indisponible
          </div>
        )}

        {/* Seconde image au survol (Desktop) */}
        {secondaryImage && (
          <Image
            src={secondaryImage}
            alt={`${product.name} - Vue alternative`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out hidden sm:block"
            loading="lazy"
          />
        )}

        {/* Badges en superposition */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
          {isPromo && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#16171A]/90 text-white backdrop-blur-md border border-white/15 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 text-[#E5A869]" />
              Offre Atelier
            </span>
          )}

          {discountBadge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C27835]/15 text-[#9E5A1C] border border-[#C27835]/30 backdrop-blur-md shadow-xs">
              {discountBadge}
            </span>
          )}

          {/* Badge stock rare quand stock <= 5 */}
          {product.stock <= 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-stone-800/80 text-stone-300 border border-stone-700 backdrop-blur-md shadow-xs">
              Rupture temporaire
            </span>
          ) : product.stock <= 5 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-amber-50/90 text-amber-900 border border-amber-200/80 backdrop-blur-md shadow-xs">
              <Clock className="w-2.5 h-2.5 text-amber-700" />
              Plus que {product.stock} en stock
            </span>
          ) : null}
        </div>

        {/* Badge catégorie discret */}
        <span className="absolute bottom-3 right-3 bg-white/85 backdrop-blur-md text-[#54555A] text-[10px] font-medium px-2.5 py-0.5 rounded-full shadow-xs border border-black/5">
          {product.category}
        </span>
      </Link>

      {/* Détails de la carte */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-3">
        <div>
          <Link
            href={`/produit/${encodeURIComponent(product.slug)}`}
            className="group/title block"
          >
            <h3 className="font-heading font-bold text-sm sm:text-base text-[#16171A] group-hover/title:text-[#C27835] transition-colors line-clamp-1 leading-snug">
              {product.name}
            </h3>
          </Link>
          {/* Évaluation Social Proof Boutique */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center text-amber-400 text-xs">
              ★★★★★
            </div>
            <span className="text-[11px] font-extrabold text-[#16171A]">4.9</span>
            <span className="text-[10px] text-emerald-700 font-semibold">• Boutique certifiée</span>
          </div>
          {product.description && (
            <p className="mt-1 text-xs text-[#73737A] line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Prix & Bouton Commander Restructurés */}
        <div className="pt-3 border-t border-[#F3F1EC] space-y-2.5">
          {/* Ligne Prix & Réassurance : flex-col sur mobile très étroit, row dès sm */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
              <span className={`font-heading font-black text-base sm:text-lg tracking-tight whitespace-nowrap ${isPromo ? 'text-[#C27835]' : 'text-[#16171A]'}`}>
                {formatFCFA(currentPrice)}
              </span>
              <span className="text-[11px] sm:text-xs text-[#9C9CA4] line-through font-medium whitespace-nowrap">
                {formatFCFA(originalPrice)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>À la livraison</span>
            </span>
          </div>

          {/* Bouton d'action pleine largeur style Shopify Prestige */}
          <Link
            href={`/produit/${encodeURIComponent(product.slug)}`}
            className={`group/btn w-full min-h-[44px] py-2.5 px-4 rounded-xl font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border shadow-xs hover:shadow-md transition-all duration-300 active:scale-[0.98] ${
              isPromo
                ? 'bg-[#C27835] hover:bg-[#a76428] text-white border-[#C27835]'
                : 'bg-[#121316] hover:bg-[#C27835] text-white border-white/10 hover:border-[#C27835]'
            }`}
            aria-label={`Commander ${product.name}`}
          >
            <span>{isPromo ? 'Profiter de l\'offre' : 'Commander'}</span>
            <span className="transition-transform duration-200 group-hover/btn:translate-x-1 font-sans">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
