'use client';

import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { hasTrackingConsent, initPixelsIfConsented, setTrackingConsent } from '@/lib/tracking/client-pixels';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Vérifie si un choix a déjà été enregistré
    const stored = localStorage.getItem('atelier_cookie_consent');
    if (!stored) {
      setVisible(true);
    } else if (stored === 'granted') {
      initPixelsIfConsented();
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setTrackingConsent(true);
    setVisible(false);
  };

  const handleRefuse = () => {
    setTrackingConsent(false);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-50 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-xs space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
          <Cookie className="w-5 h-5 stroke-[1.8]" />
        </div>
        <div className="space-y-1">
          <p className="font-extrabold text-sm tracking-tight">Confidentialité & Mesure d'audience</p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Nous utilisons des traceurs d'analyse et de mesure publicitaire (Meta et TikTok) uniquement avec votre accord pour mesurer la performance de nos campagnes.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={handleRefuse}
          className="px-3.5 py-1.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:bg-white/5 font-bold transition text-[11px]"
        >
          Refuser
        </button>
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-xs transition text-[11px]"
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
