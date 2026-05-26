import { InstagramIcon, WhatsAppIcon, FacebookIcon, XSocialIcon } from './icons/SocialIcons.jsx';
import { sanitizeSocialUrl } from '../lib/socialLinks.js';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

const CONFIG = [
  { key: 'footerInstagramUrl', label: 'Instagram', Icon: InstagramIcon },
  { key: 'footerWhatsAppUrl', label: 'WhatsApp', Icon: WhatsAppIcon },
  { key: 'footerFacebookUrl', label: 'Facebook', Icon: FacebookIcon },
  { key: 'footerTwitterUrl', label: 'X', Icon: XSocialIcon },
];

/**
 * @param {{ wrapperClass?: string; linkClass?: string; iconClass?: string }} props
 */
export default function SocialLinksGroup({ wrapperClass = 'flex gap-3', linkClass = '', iconClass = 'h-5 w-5' }) {
  const settings = useSiteSettings();
  /** @type {Array<{ href: string; label: string; Icon: typeof InstagramIcon }>} */
  const items = [];
  for (const row of CONFIG) {
    const href = sanitizeSocialUrl(settings[row.key]);
    if (!href) continue;
    items.push({ key: row.key, href, label: row.label, Icon: row.Icon });
  }
  if (items.length === 0) return null;
  return (
    <div className={wrapperClass}>
      {items.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={linkClass}
        >
          <Icon className={iconClass} />
        </a>
      ))}
    </div>
  );
}
