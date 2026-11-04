'use client';

export default function FloatingWhatsApp({ productName }: { productName?: string }) {
  const whatsappPhone = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '2290197000000').replace(/[\s\+]/g, '');
  const message = productName
    ? `Bonjour Atelier Pro, j'aimerais avoir des renseignements sur : ${productName}`
    : "Bonjour Atelier Pro, j'aimerais avoir des informations sur votre boutique.";

  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

  return (
    <aside aria-label="Assistance WhatsApp">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        aria-label="Contacter notre service client sur WhatsApp"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          <path d="M8 12h.01" />
          <path d="M12 12h.01" />
          <path d="M16 12h.01" />
        </svg>

        <span className="text-xs font-bold tracking-tight hidden sm:inline whitespace-nowrap">
          Assistance WhatsApp
        </span>
      </a>
    </aside>
  );
}
