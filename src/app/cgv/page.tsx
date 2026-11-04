import Link from 'next/link';

export const metadata = {
  title: 'Conditions Générales de Vente (CGV) — AFRINOVA SHOP Bénin',
  description: 'Conditions générales de vente de la boutique AFRINOVA SHOP applicables aux achats et livraisons en République du Bénin.',
};

export default function CGVPage() {
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
              Conditions Générales de Vente
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Conditions Générales de Vente
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Régies par les lois de la République du Bénin, notamment la Loi n° 2017-20 portant Code du numérique.
            </p>
          </div>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">1. Objet et Champ d'Application</h2>
            <p>
              Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des relations contractuelles entre l'acheteur (ci-après le « Client ») et l'exploitant de la boutique en ligne <strong>AFRINOVA SHOP</strong> (ci-après le « Vendeur ») :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li><strong>Exploitant / Vendeur :</strong> [À COMPLÉTER : Raison sociale / Nom de l'exploitant]</li>
              <li><strong>RCCM :</strong> [À COMPLÉTER : Numéro RCCM Bénin] | <strong>IFU :</strong> [À COMPLÉTER : Numéro IFU DGI Bénin]</li>
              <li><strong>Siège :</strong> [À COMPLÉTER : Quartier, Ville, République du Bénin]</li>
              <li><strong>Contact :</strong> [À COMPLÉTER : +229 01 XX XX XX XX] / [À COMPLÉTER : contact@votredomaine.bj]</li>
            </ul>
            <p>
              Toute commande passée via le site implique l'adhésion entière et sans réserve du Client aux présentes conditions.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">2. Produits et Prix</h2>
            <p>
              Les produits proposés à la vente sont ceux décrits sur le site dans la limite des stocks disponibles. Les photographies et descriptifs sont présentés avec la plus grande exactitude possible.
            </p>
            <p>
              Tous les prix sont libellés en <strong>Francs CFA (FCFA / XOF)</strong> et s'entendent toutes taxes comprises (TTC). Les modalités de remise sont convenues directement avec le Client par téléphone ou WhatsApp.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">3. Processus de Commande Express</h2>
            <p>
              La boutique propose un achat express direct depuis la fiche produit. Pour valider une commande, le Client fournit :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li>Son nom complet et son numéro de téléphone béninois joignable (format national à 10 chiffres ou international +229) ;</li>
              <li>Sa commune de destination (ex : Cotonou, Abomey-Calavi, Porto-Novo, Parakou...) ;</li>
              <li>Son quartier et un point de repère précis (obligatoire pour faciliter le travail du livreur) ;</li>
              <li>Optionnellement un lien de géolocalisation GPS.</li>
            </ul>
            <p>
              La commande est enregistrée avec attribution d'un numéro unique. Une confirmation automatique par WhatsApp peut être proposée au Client.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">4. Modalités de Paiement</h2>
            <p>
              Le mode de règlement par défaut est le <strong>Paiement à la livraison (Cash on Delivery)</strong> :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li>Le Client règle le montant exact de son article en espèces ou par Mobile Money directement au livreur lors de la réception du colis.</li>
              <li>En cas d'activation du paiement digital (Mobile Money : MTN MoMo, Moov Money, Celtiis Cash), le débit est effectué via une passerelle de paiement sécurisée agréée en République du Bénin.</li>
            </ul>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">5. Livraison et Délais</h2>
            <p>
              Les livraisons sont assurées sur le territoire béninois :
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium text-slate-700">
              <li><strong>Cotonou :</strong> remise sous 24h ouvrées.</li>
              <li><strong>Abomey-Calavi & Godomey :</strong> remise sous 24h à 48h ouvrées.</li>
              <li><strong>Porto-Novo, Sèmè-Kpodji & Ouidah :</strong> remise sous 24h à 48h ouvrées.</li>
              <li><strong>Autres départements & Intérieur du pays (Parakou, etc.) :</strong> expédition sous 48h à 72h ouvrées.</li>
              <li><strong>Retrait en boutique / point relais :</strong> gratuit sous réserve de disponibilité.</li>
            </ul>
            <p>
              Le Client s'engage à demeurer joignable sur le numéro de téléphone renseigné. En cas d'injoignabilité répétée ou de refus injustifié du colis lors de la livraison, le Vendeur se réserve le droit d'annuler la commande.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">6. Vérification à la Réception, Garantie et Retours</h2>
            <p>
              Le Client est tenu de vérifier l'état apparent de l'article dès sa remise par le livreur.
            </p>
            <p>
              En cas de défectuosité avérée ou de non-conformité par rapport au modèle commandé, le Client dispose d'un délai de <strong>48 heures ouvrées</strong> à compter de la réception pour formuler une réclamation auprès de notre service après-vente par WhatsApp ou téléphone au [À COMPLÉTER : +229 01 XX XX XX XX]. L'article retourné doit être complet, dans son emballage d'origine et ne pas avoir fait l'objet d'un usage anormal.
            </p>
          </section>

          <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h2 className="text-sm sm:text-base font-black text-slate-900">7. Litiges et Droit Applicable</h2>
            <p>
              Les présentes CGV sont soumises au droit béninois. En cas de différend ou litige, les parties s'engagent à privilégier une solution amiable. À défaut d'accord amiable sous 30 jours, le litige sera porté devant les juridictions compétentes de <strong>Cotonou (Tribunal de Commerce de Cotonou, République du Bénin)</strong>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}