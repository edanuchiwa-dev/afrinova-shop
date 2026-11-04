import Link from 'next/link';

export const metadata = {
  title: 'Politique de Confidentialité — AFRINOVA SHOP Bénin',
  description: 'Politique de protection des données personnelles de la boutique AFRINOVA SHOP conformément aux exigences de l’APDP et du Code du numérique béninois.',
};

export default function ConfidentialitePage() {
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
              Protection des Données Personnelles
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Politique de Confidentialité
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Établie conformément aux dispositions du Livre V de la Loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin et sous l'autorité de l'APDP.
            </p>
          </div>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">1. Responsable de Traitement</h2>
            <p>
              Les données à caractère personnel collectées sur le site <strong>AFRINOVA SHOP</strong> sont traitées par le responsable de traitement :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li><strong>Responsable légal :</strong> [À COMPLÉTER : Nom Commercial / Raison Sociale]</li>
              <li><strong>RCCM / IFU :</strong> [À COMPLÉTER : Numéro RCCM et Numéro IFU Bénin]</li>
              <li><strong>Adresse :</strong> [À COMPLÉTER : Siège de l'activité, Cotonou, Bénin]</li>
              <li><strong>Contact DPO / Référent Données :</strong> [À COMPLÉTER : contact@votredomaine.bj / +229 01 XX XX XX XX]</li>
            </ul>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">2. Données Collectées et Finalités</h2>
            <p>
              Dans le cadre de l'achat express sans compte obligatoire, nous collectons strictement les données nécessaires au bon acheminement de votre colis :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li><strong>Nom et prénom :</strong> identification du destinataire.</li>
              <li><strong>Numéro de téléphone :</strong> coordination de la livraison, appels du livreur et confirmation par WhatsApp.</li>
              <li><strong>Commune, quartier et point de repère :</strong> localisation précise du lieu de livraison à domicile ou au point relais.</li>
              <li><strong>Lien GPS (optionnel) :</strong> guidage précis de nos coursiers partenaires.</li>
              <li><strong>Adresse IP et empreinte technique :</strong> prévention des commandes frauduleuses et sécurité de l'infrastructure.</li>
            </ul>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">3. Destinataires des Données</h2>
            <p>
              Vos données personnelles sont strictement confidentielles. Elles sont uniquement transmises :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li>À notre équipe interne de préparation et gestion des commandes.</li>
              <li>À nos livreurs et transporteurs partenaires au Bénin (uniquement les coordonnées indispensables à la remise du colis).</li>
            </ul>
            <p>
              Aucune donnée personnelle n'est vendue, louée ou cédée à des tiers à des fins publicitaires.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">4. Traceurs Publicitaires et Consentement</h2>
            <p>
              Notre site intègre des traceurs d'analyse et de conversion (Meta Pixel, TikTok Pixel). Conformément aux règles de protection de la vie privée, ces pixels ne sont activés <strong>qu'après obtention de votre consentement explicite</strong> via le bandeau de consentement affiché lors de votre première navigation. Vous pouvez refuser ces traceurs sans aucune incidence sur votre faculté de commander.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">5. Durée de Conservation</h2>
            <p>
              Les données relatives aux commandes sont conservées pendant la durée nécessaire à l'exécution de la livraison, au suivi du service après-vente et au respect de nos obligations comptables et fiscales en République du Bénin (jusqu'à 3 ans à compter de la commande).
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">6. Vos Droits et Recours (APDP)</h2>
            <p>
              Conformément à la législation béninoise sur la protection des données personnelles, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition concernant vos données.
            </p>
            <p>
              Pour exercer vos droits, contactez-nous à <strong>[À COMPLÉTER : contact@votredomaine.bj]</strong> ou par courrier à l'adresse de notre siège. En cas de contestation non résolue, vous avez le droit d'introduire une réclamation auprès de l'<strong>Autorité de Protection des Données Personnelles (APDP)</strong> de la République du Bénin (site web : <a href="https://apdp.bj" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">apdp.bj</a>).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}