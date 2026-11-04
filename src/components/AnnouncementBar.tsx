export default function AnnouncementBar() {
  const items = [
    'Livraison express 24h à Cotonou & Calavi',
    'Paiement en espèces à la livraison',
    'Expédition sécurisée dans tout le Bénin',
    'Colis vérifié avant paiement',
    'Service client WhatsApp officiel 7j/7',
  ];

  return (
    <div
      role="region"
      aria-label="Annonces et réassurance boutique"
      className="bg-[#121316] text-[#FAF9F6] text-[11px] font-medium tracking-wide py-1.5 overflow-hidden border-b border-[#23252A] select-none"
    >
      <div className="ticker-track flex items-center gap-8 whitespace-nowrap">
        {/* Doublon pour boucle infinie fluide */}
        {[...items, ...items, ...items].map((item, index) => (
          <div key={index} className="flex items-center gap-4 shrink-0">
            <span className="inline-block w-1 h-1 rounded-full bg-[#C27835]"></span>
            <span className="text-[#E7E5E0] uppercase tracking-wider text-[10px] sm:text-[11px] font-semibold">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
