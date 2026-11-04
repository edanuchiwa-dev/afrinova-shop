import Link from 'next/link';
import { Search } from 'lucide-react';

export const metadata = {
  title: 'Page introuvable (404) — AFRINOVA SHOP Bénin',
  description: 'La page demandée est introuvable ou a été déplacée.',
};

export default function NotFound() {
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
          <div className="w-16 h-16 bg-[#FAF9F6] text-[#C27835] rounded-2xl flex items-center justify-center mx-auto border border-[#EAE8E2] shadow-xs">
            <Search className="w-7 h-7 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Erreur 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 pt-2">
              Page introuvable
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              L&apos;article ou la page que vous recherchez n&apos;existe pas, a été déplacé ou n&apos;est plus disponible.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 shadow-md transition active:scale-95"
            >
              <span>Voir le catalogue</span>
              <span>→</span>
            </Link>
            <Link
              href="/suivi"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-3 transition active:scale-95"
            >
              <span>Suivre un colis</span>
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