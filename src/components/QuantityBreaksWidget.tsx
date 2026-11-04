'use client';

import React, { useMemo } from 'react';
import { Sparkles, Check, Flame, Zap, ShieldCheck, Crown, Layers, Star } from 'lucide-react';
import { formatFCFA } from '@/lib/format';

export type QbTemplate = 'modern' | 'prestige' | 'compact';

export interface QuantityTier {
  quantity: number;
  label: string;
  subtitle: string;
  badge?: string;
  isPopular: boolean;
  totalPrice: number;
  originalTotalPrice: number;
  savings: number;
  discountPercent: number;
  unitPrice: number;
  isAvailable: boolean;
}

export interface QuantityBreaksWidgetProps {
  currentQuantity: number;
  onSelectQuantity: (quantity: number) => void;
  productPrice: number;
  originalPrice: number;
  promoPrice?: number;
  promoRemainingQuota?: number;
  stock: number;
  popularTier?: number;
  template?: QbTemplate;
  accentColor?: string;
  onProceedToOrder?: () => void;
  customLabels?: {
    tier1Label?: string;
    tier2Label?: string;
    tier3Label?: string;
    tier2Subtitle?: string;
    tier3Subtitle?: string;
    tier2Badge?: string;
    tier3Badge?: string;
  };
}

// Convertisseur hexadécimal vers RGBA sécurisé pour les déclinaisons de transparence
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(194, 120, 53, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return `rgba(194, 120, 53, ${alpha})`;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(194, 120, 53, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function QuantityBreaksWidget({
  currentQuantity,
  onSelectQuantity,
  productPrice,
  originalPrice,
  promoPrice,
  promoRemainingQuota = 0,
  stock,
  popularTier = 2,
  template = 'modern',
  accentColor = '#C27835',
  onProceedToOrder,
  customLabels = {},
}: QuantityBreaksWidgetProps) {
  // Calcul déterministe et strict pour chaque palier de quantité (1, 2, 3)
  const tiers: QuantityTier[] = useMemo(() => {
    const tierDefs = [
      {
        quantity: 1,
        label: customLabels.tier1Label || '1 Article',
        subtitle: 'Achat individuel standard',
        badge: undefined,
      },
      {
        quantity: 2,
        label: customLabels.tier2Label || 'Lot de 2 Articles',
        subtitle: customLabels.tier2Subtitle || 'Le Pack Duo Privilège',
        badge: customLabels.tier2Badge || 'PLUS POPULAIRE',
      },
      {
        quantity: 3,
        label: customLabels.tier3Label || 'Lot de 3 Articles',
        subtitle: customLabels.tier3Subtitle || 'Pack Famille & Cadeaux',
        badge: customLabels.tier3Badge || 'MAXIMUM D’ÉCONOMIE',
      },
    ];

    const hasPromo = typeof promoPrice === 'number' && promoPrice > 0 && promoRemainingQuota > 0;

    return tierDefs.map((def) => {
      const q = def.quantity;
      const isAvailable = stock >= q;

      let totalPrice = 0;
      if (hasPromo) {
        const promoUnits = Math.min(q, promoRemainingQuota);
        const normalUnits = Math.max(0, q - promoUnits);
        totalPrice = promoUnits * promoPrice + normalUnits * productPrice;
      } else {
        totalPrice = q * productPrice;
      }

      const originalTotalPrice = q * (originalPrice || Math.round(productPrice * 1.25));
      const savings = Math.max(0, originalTotalPrice - totalPrice);
      const discountPercent = originalTotalPrice > 0 ? Math.round((savings / originalTotalPrice) * 100) : 0;
      const unitPrice = Math.round(totalPrice / q);
      const isPopular = popularTier === q;

      return {
        quantity: q,
        label: def.label,
        subtitle: def.subtitle,
        badge: isPopular ? (customLabels.tier2Badge || 'PLUS POPULAIRE') : def.badge,
        isPopular,
        totalPrice,
        originalTotalPrice,
        savings,
        discountPercent,
        unitPrice,
        isAvailable,
      };
    });
  }, [
    productPrice,
    originalPrice,
    promoPrice,
    promoRemainingQuota,
    stock,
    popularTier,
    customLabels,
  ]);

  // Palier actuellement actif (ou correspondance exacte)
  const selectedTier = tiers.find((t) => t.quantity === currentQuantity);

  // Couleurs dynamiques calculées depuis la couleur d'accent de l'administrateur
  const colorStyles = useMemo(() => {
    return {
      accent: accentColor,
      accentBgLight: hexToRgba(accentColor, 0.07),
      accentBgMedium: hexToRgba(accentColor, 0.12),
      accentRing: hexToRgba(accentColor, 0.22),
      accentGlow: hexToRgba(accentColor, 0.3),
    };
  }, [accentColor]);

  // Bouton d'action unifié à forte conversion avec animation shimmer dynamique
  const renderCtaButton = () => {
    if (!onProceedToOrder) return null;

    return (
      <div className="pt-1 space-y-2">
        <button
          type="button"
          onClick={onProceedToOrder}
          style={{
            backgroundColor: colorStyles.accent,
            boxShadow: `0 4px 14px ${colorStyles.accentGlow}`,
          }}
          className="w-full btn-cta-animated text-white text-xs sm:text-sm py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2.5 font-heading font-black uppercase tracking-wider transition-all cursor-pointer group active:scale-[0.99]"
        >
          <Zap className="w-4 h-4 text-white group-hover:scale-110 transition-transform fill-white shrink-0" />
          <span>
            Commander cette offre ({currentQuantity} {currentQuantity > 1 ? 'articles' : 'article'})
          </span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#73737A] font-semibold text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Paiement à la livraison • Remise en main propre partout au Bénin</span>
        </div>
      </div>
    );
  };

  /* =======================================================================
   * TEMPLATE 1 : MODERN (Shopify Polaris / High-Conversion Bold Cards)
   * ======================================================================= */
  if (template === 'modern') {
    return (
      <div className="w-full space-y-3.5 my-5">
        {/* EN-TÊTE DU WIDGET */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: colorStyles.accentBgLight,
                borderColor: colorStyles.accentRing,
                color: colorStyles.accent,
              }}
            >
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-heading font-black text-xs sm:text-sm uppercase tracking-wider text-[#16171A] flex items-center gap-1.5">
                <span>Offres par Quantité</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border normal-case"
                  style={{
                    backgroundColor: colorStyles.accentBgLight,
                    borderColor: colorStyles.accentRing,
                    color: colorStyles.accent,
                  }}
                >
                  Volume Discounts
                </span>
              </h3>
              <p className="text-[11px] text-[#73737A]">
                Sélectionnez votre pack pour bénéficier du tarif dégressif garanti
              </p>
            </div>
          </div>
        </div>

        {/* LISTE DES CARTES SÉLECTIONNABLES */}
        <div role="radiogroup" aria-label="Sélectionnez une offre par quantité" className="space-y-3">
          {tiers.map((tier) => {
            const isSelected = currentQuantity === tier.quantity;

            return (
              <div
                key={tier.quantity}
                onClick={() => {
                  if (tier.isAvailable) onSelectQuantity(tier.quantity);
                }}
                role="radio"
                aria-checked={isSelected}
                aria-disabled={!tier.isAvailable}
                tabIndex={tier.isAvailable ? 0 : -1}
                onKeyDown={(e) => {
                  if ((e.key === ' ' || e.key === 'Enter') && tier.isAvailable) {
                    e.preventDefault();
                    onSelectQuantity(tier.quantity);
                  }
                }}
                style={
                  isSelected && tier.isAvailable
                    ? {
                        borderColor: colorStyles.accent,
                        boxShadow: `0 4px 18px ${colorStyles.accentGlow}, 0 0 0 2px ${colorStyles.accentRing}`,
                        background: `linear-gradient(135deg, ${colorStyles.accentBgLight} 0%, #FFFFFF 100%)`,
                      }
                    : undefined
                }
                className={`relative w-full rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer select-none text-left focus:outline-none focus-visible:ring-2 ${
                  !tier.isAvailable
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 border border-slate-200'
                    : isSelected
                    ? 'border-2 transform -translate-y-0.5'
                    : 'bg-white border border-[#EAE8E2] hover:border-[#D7D4CC] hover:bg-[#FAF9F6] shadow-xs'
                }`}
              >
                {/* BADGE « PLUS POPULAIRE » OU « MAXIMUM D'ÉCONOMIE » */}
                {tier.badge && tier.isAvailable && (
                  <div className="absolute -top-3 right-4 sm:right-6 z-10">
                    <span
                      style={
                        tier.isPopular
                          ? { backgroundColor: '#121316', borderColor: colorStyles.accent, color: '#FAF9F6' }
                          : { backgroundColor: colorStyles.accent, borderColor: 'rgba(255,255,255,0.3)', color: '#FFFFFF' }
                      }
                      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-heading font-black tracking-wider uppercase px-3 py-0.5 rounded-full shadow-xs border"
                    >
                      {tier.isPopular ? (
                        <Flame className="w-3 h-3 text-[#E5A869] fill-[#E5A869]" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-white" />
                      )}
                      <span>{tier.badge}</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  {/* BLOC GAUCHE */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      style={
                        isSelected
                          ? { borderColor: colorStyles.accent, backgroundColor: colorStyles.accent }
                          : undefined
                      }
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors ${
                        isSelected ? '' : 'border-[#D7D4CC] bg-white'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-black text-sm sm:text-base text-[#16171A] leading-tight">
                          {tier.label}
                        </span>
                        {tier.discountPercent > 0 && tier.isAvailable && (
                          <span className="bg-[#121316] text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wide">
                            -{tier.discountPercent}%
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#73737A] leading-none">
                        {tier.subtitle}
                      </p>

                      {tier.savings > 0 && tier.isAvailable && (
                        <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                          <span>Économisez {formatFCFA(tier.savings)}</span>
                        </div>
                      )}

                      {!tier.isAvailable && (
                        <span className="text-[10px] font-bold text-rose-600 block">
                          Rupture temporaire pour cette quantité
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BLOC DROIT : PRIX TOTAL FACTURÉ TRÈS VISIBLE */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-[#73737A] tracking-wider mb-0.5">
                      Prix Total
                    </div>
                    <div className="font-heading font-black text-base sm:text-xl text-[#16171A] tracking-tight tabular-nums">
                      {formatFCFA(tier.totalPrice)}
                    </div>
                    {tier.originalTotalPrice > tier.totalPrice && (
                      <div className="text-xs text-[#9C9CA4] line-through font-semibold tabular-nums">
                        {formatFCFA(tier.originalTotalPrice)}
                      </div>
                    )}
                    <div className="text-[10px] text-[#73737A] font-medium pt-0.5 hidden sm:block">
                      soit {formatFCFA(tier.unitPrice)} / pièce
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOUTON D'ACTION AJOUTER / COMMANDER AVEC ANIMATION */}
        {renderCtaButton()}
      </div>
    );
  }

  /* =======================================================================
   * TEMPLATE 2 : PRESTIGE (Luxe Artisanal / AFRINOVA SHOP)
   * ======================================================================= */
  if (template === 'prestige') {
    return (
      <div className="w-full space-y-4 my-6 p-5 sm:p-6 rounded-3xl bg-[#FCFAF7] border border-[#EFECE6] shadow-sm">
        {/* EN-TÊTE LUXE */}
        <div className="border-b border-[#ECE7DF] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colorStyles.accentBgLight, color: colorStyles.accent }}
            >
              <Crown className="w-3.5 h-3.5" />
            </span>
            <span className="font-heading font-extrabold text-xs sm:text-sm uppercase tracking-[0.15em] text-[#16171A]">
              Les Privilèges d&apos;Atelier
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#73737A]">
            Tarifs Dégressifs
          </span>
        </div>

        {/* LISTE DES CARTES LUXE */}
        <div role="radiogroup" aria-label="Offres d'atelier" className="space-y-3">
          {tiers.map((tier) => {
            const isSelected = currentQuantity === tier.quantity;

            return (
              <div
                key={tier.quantity}
                onClick={() => {
                  if (tier.isAvailable) onSelectQuantity(tier.quantity);
                }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={tier.isAvailable ? 0 : -1}
                style={
                  isSelected && tier.isAvailable
                    ? {
                        borderColor: colorStyles.accent,
                        boxShadow: `0 2px 14px ${colorStyles.accentGlow}`,
                        backgroundColor: '#FFFFFF',
                      }
                    : undefined
                }
                className={`relative w-full rounded-xl p-4 sm:p-5 transition-all duration-300 cursor-pointer select-none text-left border ${
                  !tier.isAvailable
                    ? 'opacity-40 cursor-not-allowed bg-stone-50 border-stone-200'
                    : isSelected
                    ? 'border-2'
                    : 'bg-white/80 border-[#E5E1D8] hover:border-[#D5CFC3] hover:bg-white'
                }`}
              >
                {/* BADGE PRESTIGE */}
                {tier.badge && tier.isAvailable && (
                  <div className="absolute -top-2.5 right-4 z-10">
                    <span
                      style={{
                        backgroundColor: tier.isPopular ? '#1C1917' : colorStyles.accent,
                        borderColor: colorStyles.accent,
                      }}
                      className="inline-flex items-center gap-1 text-[9px] font-heading font-bold uppercase tracking-[0.16em] text-white px-2.5 py-0.5 rounded-sm border shadow-xs"
                    >
                      <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                      <span>{tier.badge}</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Double anneau minimaliste luxe */}
                    <div
                      style={
                        isSelected
                          ? { borderColor: colorStyles.accent }
                          : { borderColor: '#D5CFC3' }
                      }
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                    >
                      {isSelected && (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: colorStyles.accent }}
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-bold text-sm sm:text-base text-[#1C1917] tracking-tight">
                          {tier.label}
                        </h4>
                        {tier.discountPercent > 0 && (
                          <span
                            style={{
                              backgroundColor: colorStyles.accentBgMedium,
                              color: colorStyles.accent,
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                          >
                            Remise de {tier.discountPercent}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#78716C] italic font-serif mt-0.5">
                        {tier.subtitle}
                      </p>
                      {tier.savings > 0 && (
                        <p className="text-[10px] font-bold text-emerald-800 mt-1">
                          Privilège client : -{formatFCFA(tier.savings)} sur cette sélection
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] uppercase tracking-wider text-[#A8A29E] block">
                      Total Facturé
                    </span>
                    <span
                      style={{ color: isSelected ? colorStyles.accent : '#1C1917' }}
                      className="font-heading font-black text-base sm:text-xl tabular-nums tracking-tight block"
                    >
                      {formatFCFA(tier.totalPrice)}
                    </span>
                    {tier.originalTotalPrice > tier.totalPrice && (
                      <span className="text-xs text-[#A8A29E] line-through tabular-nums block">
                        {formatFCFA(tier.originalTotalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOUTON D'ACTION AJOUTER / COMMANDER AVEC ANIMATION */}
        {renderCtaButton()}
      </div>
    );
  }

  /* =======================================================================
   * TEMPLATE 3 : COMPACT (Minimaliste Épuré / Clean Fast Grid)
   * ======================================================================= */
  return (
    <div className="w-full space-y-2.5 my-4">
      <div className="flex items-center justify-between text-xs pb-0.5">
        <span className="font-heading font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" style={{ color: colorStyles.accent }} />
          <span>Packs Express</span>
        </span>
        <span className="text-[11px] text-slate-500 font-medium">Prix tout compris</span>
      </div>

      <div role="radiogroup" aria-label="Packs express" className="space-y-2">
        {tiers.map((tier) => {
          const isSelected = currentQuantity === tier.quantity;

          return (
            <div
              key={tier.quantity}
              onClick={() => {
                if (tier.isAvailable) onSelectQuantity(tier.quantity);
              }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={tier.isAvailable ? 0 : -1}
              style={
                isSelected && tier.isAvailable
                  ? {
                      borderColor: colorStyles.accent,
                      backgroundColor: colorStyles.accentBgLight,
                    }
                  : undefined
              }
              className={`w-full rounded-xl p-3 sm:p-3.5 transition-all duration-150 cursor-pointer select-none text-left border flex items-center justify-between gap-3 ${
                !tier.isAvailable
                  ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                  : isSelected
                  ? 'border-2 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  style={
                    isSelected
                      ? { borderColor: colorStyles.accent, backgroundColor: colorStyles.accent }
                      : undefined
                  }
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? '' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      {tier.label}
                    </span>
                    {tier.discountPercent > 0 && (
                      <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                        -{tier.discountPercent}%
                      </span>
                    )}
                    {tier.isPopular && (
                      <span
                        style={{
                          backgroundColor: colorStyles.accent,
                          color: '#FFFFFF',
                        }}
                        className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded"
                      >
                        {tier.badge || 'POPULAIRE'}
                      </span>
                    )}
                  </div>
                  {tier.savings > 0 && (
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      Économisez {formatFCFA(tier.savings)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-heading font-black text-sm sm:text-base text-slate-900 block tabular-nums">
                  {formatFCFA(tier.totalPrice)}
                </span>
                {tier.originalTotalPrice > tier.totalPrice && (
                  <span className="text-[11px] text-slate-400 line-through block tabular-nums">
                    {formatFCFA(tier.originalTotalPrice)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BOUTON D'ACTION AJOUTER / COMMANDER AVEC ANIMATION */}
      {renderCtaButton()}
    </div>
  );
}
