import { WhatsAppIcon } from './icons/SocialIcons.jsx';
import { sanitizeSocialUrl } from '../lib/socialLinks.js';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

/**
 * Storefront genelinde sağ alt köşede sabit duran WhatsApp iletişim butonu.
 * Adres yönetimden (Mağaza bilgileri → WhatsApp) gelir; boş ise hiç gösterilmez.
 */
export default function WhatsAppFloat() {
  const settings = useSiteSettings();
  const href = sanitizeSocialUrl(settings?.footerWhatsAppUrl);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp iletişim hattı"
      title="WhatsApp'tan yazın"
      className="group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg shadow-black/20 outline-none ring-offset-2 transition-transform hover:scale-105 hover:bg-[#1fb457] focus-visible:ring-2 focus-visible:ring-[#1fb457] sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon className="h-7 w-7 shrink-0" />
      <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  );
}
