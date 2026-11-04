import Link from 'next/link';

export const metadata = {
  title: 'Mentions Légales — AFRINOVA SHOP Bénin',
  description: 'Mentions légales et informations éditoriales de la boutique AFRINOVA SHOP conformément au Code du numérique béninois.',
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex justify-between items-center shadow-xs">
        <Link href="/" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition">
          <span>←</span>
          <span>Retour à la boutique</span>
        </Link>
        <span className="text-sm font-black text-slate-900">AFRINOVA SHOP</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Cadre Juridique Béninois
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Mentions Légales
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Conformément à la Loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin.
            </p>
          </div>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">1. Éditeur de la Plateforme</h2>
            <p>
              Le site et service de commerce électronique <strong>AFRINOVA SHOP</strong> est édité et exploité par :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li><strong>Raison sociale / Identité de l'exploitant :</strong> [À COMPLÉTER : Nom Commercial ou Nom de l'Entrepreneur]</li>
              <li><strong>Forme juridique :</strong> [À COMPLÉTER : Entreprise Individuelle, SARL, etc.]</li>
              <li><strong>Numéro RCCM :</strong> [À COMPLÉTER : Numéro du Registre du Commerce et du Crédit Mobilier]</li>
              <li><strong>Identifiant Fiscal Unique (IFU) :</strong> [À COMPLÉTER : Numéro IFU officiel délivré par la DGI Bénin]</li>
              <li><strong>Siège social / Adresse de l'atelier :</strong> [À COMPLÉTER : Quartier, Rue, Lot/Parcelle, Cotonou, République du Bénin]</li>
              <li><strong>Contact téléphonique / WhatsApp :</strong> [À COMPLÉTER : +229 01 XX XX XX XX]</li>
              <li><strong>Adresse électronique de contact :</strong> [À COMPLÉTER : contact@votredomaine.bj]</li>
              <li><strong>Directeur de la publication :</strong> [À COMPLÉTER : Nom et Prénom du Responsable Légal]</li>
            </ul>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">2. Hébergement Technique</h2>
            <p>
              La plateforme technique est hébergée sur une infrastructure sécurisée par :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li><strong>Prestataire d'hébergement :</strong> [À COMPLÉTER : Nom de l'hébergeur — ex: Hetzner Online GmbH / OVHcloud / Vercel Inc.]</li>
              <li><strong>Siège de l'hébergeur :</strong> [À COMPLÉTER : Adresse de l'hébergeur]</li>
              <li><strong>Site web de l'hébergeur :</strong> [À COMPLÉTER : URL de l'hébergeur]</li>
            </ul>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">3. Propriété Intellectuelle</h2>
            <p>
              Tous les éléments visuels, photographies de produits, textes, logos, icônes et architectures logicielles présents sur le site AFRINOVA SHOP sont la propriété exclusive de l'exploitant ou font l'objet d'une licence régulière d'utilisation. Toute reproduction, copie ou diffusion intégrale ou partielle non autorisée est strictement interdite conformément aux dispositions du Code de la propriété intellectuelle et du Code du numérique béninois.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">4. Service Clientèle & Réclamations</h2>
            <p>
              Pour toute question, demande d'information ou réclamation relative à une commande passée sur notre site, notre service client est joignable via notre ligne WhatsApp officielle au <strong>[À COMPLÉTER : +229 01 XX XX XX XX]</strong> ou par courriel à <strong>[À COMPLÉTER : contact@votredomaine.bj]</strong> du lundi au samedi de 8h00 à 19h00 (Heure de Cotonou, UTC+1).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
