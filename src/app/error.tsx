'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log generic error info server/telemetry side without personal data
    console.error('Application runtime error boundary triggered:', error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between antialiased">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex justify-between items-center shadow-xs">
        <Link href="/" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition">
          <span>←</span>
          <span>Retour à l&apos;accueil</span>
        </Link>
        <span className="text-sm font-black text-slate-900">AFRINOVA SHOP</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-lg space-y-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-amber-100 shadow-xs">
            ⚠️
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              Une anomalie est survenue
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 pt-2">
              Service momentanément indisponible
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Une erreur inattendue s&apos;est produite lors du chargement de la page. Notre équipe technique a été informée.
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md inline-block">
                Code référence : {error.digest}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 shadow-md transition active:scale-95"
            >
              <span>Réessayer</span>
              <span>↻</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-3 transition active:scale-95"
            >
              <span>Retour à l&apos;accueil</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100">
        © 2026 AFRINOVA SHOP. Tous droits réservés.
      </footer>
    </div>
  );
}