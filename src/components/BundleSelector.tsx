'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import type { Bundle } from '@/lib/bundles';

export type BundleVariant = 'pill' | 'card';

export interface BundleSelectorProps {
  bundles?: Bundle[];
  value?: string;
  onChange?: (bundle: Bundle) => void;
  variant?: BundleVariant;
  accent?: string;
  image?: string | null;
  currency?: string;
  locale?: string;
  giftSeconds?: number;
}

// Données de démo si aucune prop n'est fournie (le composant ne doit JAMAIS planter sans props)
const DEMO_BUNDLES: Bundle[] = [
  {
    id: 'x1',
    quantity: 1,
    title: 'Solo',
    badge: '1 article',
    subtitle: 'Achat unique',
    price: 15000,
    comparePrice: 15000,
  },
  {
    id: 'x2',
    quantity: 2,
    title: 'Duo',
    badge: '2 articles',
    subtitle: '-10 % d\'économie',
    price: 27000,
    comparePrice: 30000,
    tag: 'Le plus populaire',
  },
  {
    id: 'x3',
    quantity: 3,
    title: 'Famille',
    badge: '3 articles',
    subtitle: '-15 % d\'économie',
    price: 38250,
    comparePrice: 45000,
    tag: 'Meilleur choix',
  },
];

// Couleur d'accent de la charte de la boutique (vitrine premium)
const DEFAULT_BRAND_ACCENT = '#C27835';

export default function BundleSelector({
  bundles: propBundles,
  value: propValue,
  onChange,
  variant = 'card',
  accent = DEFAULT_BRAND_ACCENT,
  image = null,
  currency = 'XOF',
  locale = 'fr-FR',
  giftSeconds = 900, // 15 minutes par défaut
}: BundleSelectorProps) {
  // 1. Liste sécurisée des lots
  const bundles = useMemo(() => {
    if (Array.isArray(propBundles) && propBundles.length > 0) {
      return propBundles;
    }
    return DEMO_BUNDLES;
  }, [propBundles]);

  // Index par défaut : lot du milieu
  const middleIndex = Math.max(0, Math.floor(bundles.length / 2));
  const fallbackId = bundles[middleIndex]?.id || bundles[0]?.id || 'x2';

  // 2. Gestion de la sélection interne ou contrôlée
  const [internalValue, setInternalValue] = useState<string>(fallbackId);
  const isControlled = propValue !== undefined;
  const selectedId = isControlled ? propValue : internalValue;

  // Si propValue change
  useEffect(() => {
    if (propValue !== undefined) {
      setInternalValue(propValue);
    }
  }, [propValue]);

  // Récupérer le bundle actuellement sélectionné
  const selectedBundle = useMemo(() => {
    return bundles.find((b) => b.id === selectedId) || bundles[middleIndex] || bundles[0];
  }, [bundles, selectedId, middleIndex]);

  // Handler de sélection
  const handleSelect = useCallback(
    (bundle: Bundle) => {
      if (!isControlled) {
        setInternalValue(bundle.id);
      }
      onChange?.(bundle);
    },
    [isControlled, onChange]
  );

  // 3. Navigation clavier accessible (radiogroup)
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % bundles.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + bundles.length) % bundles.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(bundles[index]);
      return;
    } else {
      return;
    }

    const nextBundle = bundles[nextIndex];
    if (nextBundle) {
      handleSelect(nextBundle);
      buttonsRef.current[nextIndex]?.focus();
    }
  };

  // 4. Formatage monétaire via Intl.NumberFormat
  const formatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
      });
    } catch {
      return {
        format: (val: number) => `${Math.round(val).toLocaleString(locale)} FCFA`,
      };
    }
  }, [currency, locale]);

  const formatPrice = (amount: number): string => {
    // Si devise XOF ou FCFA, s'assurer d'une typographie aérée et lisible
    const formatted = formatter.format(amount);
    return formatted.replace('XOF', 'FCFA');
  };

  // 5. Gestion du cadeau et compte à rebours persistant (Étape 7)
  // Ne s'active que dans la variante "card" si le lot sélectionné possède un champ freeGift
  const [remainingTime, setRemainingTime] = useState<number>(giftSeconds);
  const hasFreeGift = Boolean(variant === 'card' && selectedBundle?.freeGift);

  useEffect(() => {
    if (!hasFreeGift || !selectedBundle) return;

    const storageKey = `bundle_gift_timer_${selectedBundle.id}`;
    let deadline: number;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        deadline = parseInt(stored, 10);
      } else {
        deadline = Date.now() + giftSeconds * 1000;
        localStorage.setItem(storageKey, String(deadline));
      }
    } catch {
      deadline = Date.now() + giftSeconds * 1000;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemainingTime(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [hasFreeGift, selectedBundle?.id, giftSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // RENDU STYLE 1 : VARIANT "PILL"
  // -------------------------------------------------------------
  if (variant === 'pill') {
    return (
      <div
        role="radiogroup"
        aria-label="Sélection des lots et offres"
        className="w-full flex flex-col gap-2.5 sm:gap-3 select-none"
      >
        {bundles.map((bundle, index) => {
          const isSelected = bundle.id === selectedBundle?.id;
          const hasDiscount = bundle.comparePrice && bundle.comparePrice > bundle.price;

          return (
            <button
              key={bundle.id}
              ref={(el) => {
                buttonsRef.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleSelect(bundle)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              style={{
                borderColor: isSelected ? accent : '#E5E7EB',
              }}
              className={`w-full min-h-[56px] py-2.5 px-4 sm:px-5 rounded-[28px] bg-white border-2 text-left flex items-center justify-between gap-3 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isSelected
                  ? 'shadow-sm'
                  : 'hover:border-[#D1D5DB] hover:bg-slate-50/50'
              }`}
            >
              {/* Gauche : Radio rond avec point plein quand sélectionné */}
              <div className="flex items-center gap-3 shrink-0">
                <div
                  style={{
                    borderColor: isSelected ? accent : '#D1D5DB',
                  }}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors bg-white shrink-0"
                >
                  {isSelected && (
                    <div
                      style={{ backgroundColor: accent }}
                      className="w-2.5 h-2.5 rounded-full transition-transform"
                    />
                  )}
                </div>

                {/* Centre : Titre en gras + pastille d'accent + sous-titre */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-black text-xs sm:text-sm text-[#16171A]">
                      {bundle.title}
                    </span>

                    {bundle.badge && (
                      <span
                        style={{ backgroundColor: accent }}
                        className="text-[10px] sm:text-[11px] font-bold text-white px-2 py-0.5 rounded-full whitespace-nowrap leading-tight"
                      >
                        {bundle.badge}
                      </span>
                    )}
                  </div>

                  {bundle.subtitle && (
                    <span className="text-[11px] sm:text-xs text-[#73737A] font-medium leading-tight mt-0.5">
                      {bundle.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Droite : Prix en gras et ancien prix barré en dessous */}
              <div className="text-right shrink-0">
                <span
                  style={{ color: isSelected ? accent : '#16171A' }}
                  className="font-heading font-black text-xs sm:text-sm block tabular-nums"
                >
                  {formatPrice(bundle.price)}
                </span>

                {hasDiscount && (
                  <span className="text-[10px] sm:text-[11px] text-[#9C9CA4] line-through block tabular-nums font-semibold leading-tight">
                    {formatPrice(bundle.comparePrice!)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDU STYLE 2 : VARIANT "CARD"
  // -------------------------------------------------------------
  return (
    <div
      role="radiogroup"
      aria-label="Sélection des lots et offres"
      className="w-full flex flex-col gap-3.5 select-none pt-1.5"
    >
      {bundles.map((bundle, index) => {
        const isSelected = bundle.id === selectedBundle?.id;
        const hasDiscount = bundle.comparePrice && bundle.comparePrice > bundle.price;
        const showGiftBar = isSelected && hasFreeGift && remainingTime > 0;

        return (
          <div
            key={bundle.id}
            className="relative"
          >
            {/* Ruban / Tag posé sur la carte en haut à droite (Style Screenshot 2) */}
            {bundle.tag && (
              <div
                style={{ backgroundColor: accent }}
                className="absolute -top-3 right-4 z-10 text-[10px] font-black uppercase tracking-wider text-white px-3 py-0.5 rounded-md shadow-xs flex items-center gap-1"
              >
                ★ {bundle.tag}
              </div>
            )}

            <button
              ref={(el) => {
                buttonsRef.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleSelect(bundle)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              style={{
                borderColor: isSelected ? accent : '#E5E7EB',
                backgroundColor: isSelected ? `${accent}0A` : '#FAF9F6', // Teinte subtile ~4% d'accent
              }}
              className={`w-full text-left rounded-2xl border-2 transition-all cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isSelected ? 'shadow-sm' : 'hover:border-[#D1D5DB] hover:bg-slate-100/60'
              }`}
            >
              <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
                
                {/* Gauche : Vignette 48px de l'image produit */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-[#EAE8E2] shrink-0 relative flex items-center justify-center">
                    {image ? (
                      <Image
                        src={image}
                        alt={bundle.title}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Lot</span>
                    )}
                  </div>

                  {/* Centre : Titre en gras + pastille arrondie + sous-titre */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-black text-xs sm:text-sm text-[#16171A]">
                        {bundle.title}
                      </span>

                      {bundle.badge && (
                        <span
                          style={{
                            backgroundColor: accent,
                            color: '#FFFFFF',
                          }}
                          className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap leading-tight shadow-2xs"
                        >
                          {bundle.badge}
                        </span>
                      )}
                    </div>

                    {bundle.subtitle && (
                      <span className="text-[11px] sm:text-xs text-[#73737A] font-medium leading-tight mt-0.5">
                        {bundle.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                {/* Droite : Prix et ancien prix barré */}
                <div className="text-right shrink-0">
                  <span
                    style={{ color: isSelected ? accent : '#16171A' }}
                    className="font-heading font-black text-xs sm:text-sm block tabular-nums"
                  >
                    {formatPrice(bundle.price)}
                  </span>

                  {hasDiscount && (
                    <span className="text-[10px] sm:text-[11px] text-[#9C9CA4] line-through block tabular-nums font-semibold leading-tight">
                      {formatPrice(bundle.comparePrice!)}
                    </span>
                  )}
                </div>

              </div>

              {/* Barre pleine couleur d'accent en bas de la carte si freeGift actif (Étape 7) */}
              {showGiftBar && (
                <div
                  style={{ backgroundColor: accent }}
                  className="w-full py-1.5 px-3 sm:px-4 text-white text-[11px] sm:text-xs font-bold flex items-center justify-between gap-2 transition-all animate-in fade-in"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>🎁 +</span>
                    {image && (
                      <div className="w-4 h-4 rounded-full overflow-hidden bg-white/20 shrink-0 relative">
                        <Image
                          src={image}
                          alt="Cadeau"
                          width={16}
                          height={16}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span className="truncate">{bundle.freeGift}</span>
                  </div>

                  <div className="shrink-0 font-mono tracking-wider text-[10px] sm:text-[11px] bg-black/20 px-2 py-0.5 rounded-full">
                    ⏱ {formatTimer(remainingTime)}
                  </div>
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
