'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { Package, MessageCircle } from 'lucide-react';
import { formatFCFA } from '@/lib/format';

type TrackResult = {
  orderNumber: string;
  status: 'nouvelle' | 'en_preparation' | 'expediee' | 'livree' | 'annulee';
  carrier: string;
  trackingNumber: string | null;
  shippingCity: string;
  neighborhood: string;
  totalPrice: number;
  shippingCost: number;
  createdAt: string;
  items: Array<{ product_name: string; quantity: number; product_price: number }>;
};

const STEPS = [
  { key: 'nouvelle', label: 'Commande Reçue', desc: 'Enregistrée dans notre système' },
  { key: 'en_preparation', label: 'En Préparation', desc: 'Contrôlée et emballée en atelier' },
  { key: 'expediee', label: 'En Livraison', desc: 'Remise au coursier / transporteur' },
  { key: 'livree', label: 'Livrée', desc: 'Remise en main propre avec succès' },
];

function SuiviContent() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setError('Veuillez renseigner votre numéro de commande et votre téléphone.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Commande introuvable.');
      }

      setResult(data);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'nouvelle':
        return 0;
      case 'en_preparation':
        return 1;
      case 'expediee':
        return 2;
      case 'livree':
        return 3;
      default:
        return -1;
    }
  };

  const activeIndex = result ? getStepIndex(result.status) : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* En-tête */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 transition">
          <span>←</span>
          <span>Retour à la boutique</span>
        </Link>
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#121316] text-[#C27835] border border-[#EAE8E2] shadow-md mb-3">
          <Package className="w-7 h-7 stroke-[1.8]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Suivi de votre commande
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Consultez en temps réel l'acheminement de votre colis partout au Bénin.
        </p>
      </div>

      {/* Formulaire de recherche */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md mb-8">
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="track_num" className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                Numéro de commande *
              </label>
              <input
                id="track_num"
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ex: CMD-20261025-XXXX"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-semibold uppercase text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 shadow-2xs"
              />
            </div>
            <div>
              <label htmlFor="track_phone" className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                Téléphone mobile de commande *
              </label>
              <input
                id="track_phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ex: 01 97 00 11 22 ou 97 00 11 22"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 shadow-2xs"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:bg-slate-800 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Recherche en cours...' : 'Vérifier le statut de mon colis →'}
          </button>
        </form>
      </div>

      {/* Résultat du Suivi */}
      {result && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 animate-fade-in">
          {/* Header statut */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Commande</span>
              <div className="text-base sm:text-lg font-black text-slate-900 font-mono">{result.orderNumber}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Date</span>
              <div className="text-xs font-semibold text-slate-600">
                {new Date(result.createdAt).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Stepper visuel d'avancement */}
          {result.status === 'annulee' ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold text-center">
              ❌ Cette commande a été annulée. Contactez le service client pour toute question.
            </div>
          ) : (
            <div className="py-2">
              <div className="grid grid-cols-4 gap-2 relative">
                {STEPS.map((step, idx) => {
                  const isDone = activeIndex >= idx;
                  const isCurrent = activeIndex === idx;
                  return (
                    <div key={step.key} className="text-center flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black mb-1.5 transition ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        } ${isCurrent ? 'ring-4 ring-emerald-100 animate-pulse' : ''}`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div className={`text-[10px] sm:text-xs font-extrabold leading-tight ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </div>
                      <div className="text-[9px] text-slate-400 hidden sm:block mt-0.5">{step.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Détails du transporteur et du colis */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-medium">Mode de transport :</span>
              <span className="font-bold text-slate-900">{result.carrier}</span>
            </div>

            {result.trackingNumber && (
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Numéro de suivi coursier :</span>
                <span className="font-mono font-black text-blue-600">{result.trackingNumber}</span>
              </div>
            )}

            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-medium">Destination :</span>
              <span className="font-bold text-slate-900">{result.shippingCity} {result.neighborhood ? `(${result.neighborhood})` : ''}</span>
            </div>

            <div className="flex justify-between pt-1 text-sm font-black text-slate-900">
              <span>Montant à régler à la livraison :</span>
              <span className="text-emerald-700 text-base">{formatFCFA(result.totalPrice)}</span>
            </div>
          </div>

          {/* Articles */}
          {result.items && result.items.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <div className="text-[10px] font-extrabold uppercase text-slate-400">Contenu du colis :</div>
              {result.items.map((item, i) => (
                <div key={i} className="flex justify-between font-semibold p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span className="font-mono">{formatFCFA(item.product_price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Support */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Un renseignement sur votre livraison ?</p>
            <a
              href={`https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '2290197000000').replace(/[\s\+]/g, '')}?text=${encodeURIComponent(`Bonjour, je souhaite un renseignement sur ma commande ${result.orderNumber}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#128C7E] hover:bg-[#075E54] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs transition"
            >
              <MessageCircle className="w-4 h-4 text-white shrink-0" />
              <span>Contacter le support par WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuiviPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement...</div>}>
        <SuiviContent />
      </Suspense>
    </div>
  );
}
