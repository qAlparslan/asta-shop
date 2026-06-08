import HeroSection from '../components/HeroSection.jsx';
import BestSellers from '../components/BestSellers.jsx';
import HomeTrustNewsletter from '../components/HomeTrustNewsletter.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

export default function HomePage() {
  const settings = useSiteSettings();
  const storeName = String(settings?.storeName ?? '').trim() || 'Asta Ticaret';

  return (
    <>
      <h1 className="sr-only">{storeName} — online güzellik ve bakım ürünleri mağazası</h1>
      <HeroSection />
      <BestSellers />
      <HomeTrustNewsletter />
    </>
  );
}
