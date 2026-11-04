'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, MessageCircle } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '2290197000000';
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent("Bonjour Atelier Pro, j'aimerais avoir des informations sur vos articles.")}`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE8E2] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            
            {/* GAUCHE : BURGER (MOBILE) & LOGO */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center w-11 h-11 -ml-2 rounded-full text-[#16171A] hover:bg-[#FAF9F6] active:scale-95 transition"
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={mobileMenuOpen}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </button>

              <Link href="/" className="group flex flex-col justify-center py-1">
                <span className="font-heading font-black text-lg sm:text-xl tracking-tight text-[#16171A] uppercase leading-none group-hover:text-[#C27835] transition-colors">
                  Atelier Pro
                </span>
                <span className="text-[9px] font-bold text-[#73737A] tracking-[0.2em] uppercase mt-1 leading-none hidden sm:block">
                  Cotonou • Boutique Exclusive
                </span>
              </Link>
            </div>

            {/* CENTRE : NAVIGATION DESKTOP */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#54555A]">
              <a href="#catalogue" className="hover:text-[#16171A] transition-colors py-2">
                Catalogue
              </a>
              <a href="#avis" className="hover:text-[#16171A] transition-colors py-2 flex items-center gap-1">
                <span>Avis clients</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              </a>
              <a href="#comment-ca-marche" className="hover:text-[#16171A] transition-colors py-2">
                Comment ça marche
              </a>
              <a href="#garanties" className="hover:text-[#16171A] transition-colors py-2">
                Garanties & Livraison
              </a>
              <a href="#faq" className="hover:text-[#16171A] transition-colors py-2">
                Questions Fréquentes
              </a>
            </nav>

            {/* DROITE : ACTIONS (SUIVI + WHATSAPP CTA) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/suivi"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-[#54555A] hover:text-[#16171A] hover:bg-[#FAF9F6] border border-transparent hover:border-[#EAE8E2] transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
                <span>Suivi Colis</span>
              </Link>

              {/* Bouton WhatsApp discret et haut de gamme */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 h-11 rounded-full text-xs font-bold text-white bg-[#128C7E] hover:bg-[#075E54] active:scale-95 shadow-xs transition"
                aria-label="Contacter l'atelier sur WhatsApp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  <path d="M8 12h.01" />
                  <path d="M12 12h.01" />
                  <path d="M16 12h.01" />
                </svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      </header>

      {/* DRAWER / MENU MOBILE SLIDE-OVER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Overlay flou */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Tiroir coulissant */}
          <div className="fixed inset-y-0 left-0 w-[85%] max-w-xs bg-[#FAF9F6] p-6 shadow-2xl flex flex-col justify-between border-r border-[#EAE8E2] animate-slide-right">
            <div>
              {/* Entête du tiroir */}
              <div className="flex items-center justify-between pb-6 border-b border-[#EAE8E2]">
                <div>
                  <span className="font-heading font-black text-lg text-[#16171A] uppercase tracking-tight block">
                    Atelier Pro
                  </span>
                  <span className="text-[10px] font-bold text-[#73737A] uppercase tracking-wider">
                    Bénin • Vente directe
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-11 h-11 flex items-center justify-center rounded-full text-[#73737A] hover:text-[#16171A] hover:bg-white transition"
                  aria-label="Fermer le menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Liens de navigation mobile */}
              <nav className="mt-6 flex flex-col gap-1 font-heading text-sm font-bold text-[#16171A]">
                <a
                  href="#catalogue"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-3 rounded-xl hover:bg-white hover:text-[#C27835] transition flex items-center justify-between"
                >
                  <span>Nos Articles Exclusifs</span>
                  <span className="text-xs text-[#C27835]">→</span>
                </a>
                <a
                  href="#avis"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-3 rounded-xl hover:bg-white hover:text-[#C27835] transition flex items-center justify-between"
                >
                  <span>Avis Clients Vérifiés</span>
                  <span className="text-xs text-amber-500 font-bold">★ 4.9/5</span>
                </a>
                <a
                  href="#comment-ca-marche"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-3 rounded-xl hover:bg-white hover:text-[#C27835] transition flex items-center justify-between"
                >
                  <span>Comment ça marche</span>
                  <span className="text-xs text-[#73737A]">3 étapes</span>
                </a>
                <a
                  href="#garanties"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-3 rounded-xl hover:bg-white hover:text-[#C27835] transition flex items-center justify-between"
                >
                  <span>Garanties & Zones livrées</span>
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-3 rounded-xl hover:bg-white hover:text-[#C27835] transition flex items-center justify-between"
                >
                  <span>Questions fréquentes</span>
                </a>
                <Link
                  href="/suivi"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-3 rounded-xl hover:bg-white hover:text-[#C27835] transition flex items-center gap-2.5 border-t border-[#EAE8E2] mt-2 pt-4"
                >
                  <Package className="w-4 h-4 text-[#73737A]" />
                  <span>Suivre ma commande</span>
                </Link>
              </nav>
            </div>

            {/* Pied du tiroir avec WhatsApp direct */}
            <div className="pt-6 border-t border-[#EAE8E2] space-y-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-full font-bold text-xs text-white bg-[#128C7E] hover:bg-[#075E54] flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Service WhatsApp direct</span>
              </a>
              <p className="text-[10px] text-center text-[#73737A]">
                Paiement à la livraison partout au Bénin.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
