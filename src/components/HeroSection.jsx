import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heroSlides as staticHeroSlides } from '../data/heroSlides.js';
import { apiFetch } from '../api/client.js';
import {
  ICON_MAP,
  parseHeroTrustCardsSetting,
  DEFAULT_HERO_TRUST_CARDS,
  getTrustPresetByKey,
} from '../lib/heroTrustCards.js';
import { buildResponsiveImage, preloadImage } from '../lib/optimizeImageUrl.js';

const AUTO_MS = 6500;

/** Geriye dönük sabit içerik (src/data/heroSlides.js — image tabanlı) */
function slidesFromLegacyStatic(list) {
  return list.map((s) => ({
    id: s.id,
    title: String(s.title ?? ''),
    description: String(s.description ?? ''),
    ctaLabel: String(s.ctaLabel ?? ''),
    ctaHref: String(s.ctaHref ?? ''),
    bgType: 'image',
    bgGradient: '',
    bgImageUrl: String(s.imageSrc ?? ''),
    imageAlt: String(s.imageAlt ?? ''),
  }));
}

/** API satırı (/api/home-hero) → vitrin kartı */
function slidesFromApi(list) {
  return list.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.subtitle ?? ''),
    ctaLabel: String(row.ctaText ?? ''),
    ctaHref: String(row.ctaUrl ?? '/urunler'),
    bgType: row.bgType === 'image' ? 'image' : 'gradient',
    bgGradient: String(row.bgGradient ?? ''),
    bgImageUrl: row.bgImageUrl ? String(row.bgImageUrl) : '',
    imageAlt: row.imageAlt ? String(row.imageAlt) : String(row.title ?? ''),
  }));
}

function HeroCtaLink({ href, className, children }) {
  if (!href) return null;
  if (href.startsWith('#')) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

function SlideMedia({ slide, eager }) {
  if (slide.bgType === 'image' && slide.bgImageUrl) {
    const responsive = buildResponsiveImage(slide.bgImageUrl);
    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <img
          src={responsive.src || slide.bgImageUrl}
          srcSet={responsive.srcSet || undefined}
          sizes={responsive.sizes || undefined}
          alt={slide.imageAlt || slide.title}
          className="aspect-video w-full object-cover object-center"
          width={1024}
          height={576}
          decoding={eager ? 'sync' : 'async'}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'low'}
        />
      </div>
    );
  }

  const bg =
    slide.bgGradient?.trim() ||
    'linear-gradient(135deg, rgb(245 247 251) 0%, rgb(230 237 246) 50%, rgb(221 229 239) 100%)';

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-card">
      <div
        className="aspect-video w-full min-h-[220px]"
        style={{ background: bg }}
        aria-hidden
      />
    </div>
  );
}

function HeroTrustCard({ card }) {
  const preset = getTrustPresetByKey(card.presetKey);
  const Icon = ICON_MAP[preset.iconKey] || ICON_MAP.shield;
  const iconTone = preset.iconClassName.includes('asta-navy') ? 'text-asta-navy' : 'text-brand';
  return (
    <div className={`flex flex-col gap-2 rounded-lg p-3 ${preset.cardClassName}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`h-5 w-5 shrink-0 ${iconTone}`} strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-neutral-900">{card.title}</span>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const [slides, setSlides] = useState(() => slidesFromLegacyStatic(staticHeroSlides));
  const [trustCards, setTrustCards] = useState(DEFAULT_HERO_TRUST_CARDS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/settings', { skipAuth: true });
        if (cancelled) return;
        const parsed = parseHeroTrustCardsSetting(res?.data?.settings?.heroTrustCards);
        if (parsed && parsed.length > 0) setTrustCards(parsed);
      } catch {
        //
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/home-hero', { skipAuth: true });
        const list = res?.data?.slides;
        if (cancelled || !Array.isArray(list) || list.length === 0) return;
        setSlides(slidesFromApi(list));
      } catch {
        // API yoksa / boş DB: ilk render’daki sabit slaytlar kalır.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const containerRef = useRef(null);

  const count = slides.length;

  const go = useCallback(
    (dir) => {
      setIndex((i) => {
        if (dir === 'next') return (i + 1) % count;
        return (i - 1 + count) % count;
      });
    },
    [count],
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || count <= 1) return undefined;
    const t = window.setInterval(() => go('next'), AUTO_MS);
    return () => window.clearInterval(t);
  }, [paused, reduceMotion, count, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go('prev');
      if (e.key === 'ArrowRight') go('next');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  /** Slayt seti API ile değişince indeksi sınırla */
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count]);

  /** LCP: ilk slayt görselini önceden yükle */
  useEffect(() => {
    const first = slides[0];
    if (first?.bgType === 'image' && first.bgImageUrl) {
      preloadImage(first.bgImageUrl);
    }
  }, [slides]);

  const durationClass = reduceMotion ? 'duration-0' : 'duration-500 ease-out';

  return (
    <section
      ref={containerRef}
      className="relative border-b border-neutral-200 bg-neutral-50/80"
      aria-roledescription="carousel"
      aria-label="Öne çıkan kampanyalar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden">
        <div
          className={`flex ${durationClass} transition-transform`}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <article
              key={slide.id}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={i !== index}
              className="min-w-0 shrink-0 grow-0 basis-full"
            >
              <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-14">
                <div className="order-2 lg:order-1">
                  <h2 className="mt-0 text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl lg:text-[2.25rem] xl:text-4xl">
                    {slide.title}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
                    {slide.description}
                  </p>
                  <div className="mt-8">
                    <HeroCtaLink
                      href={slide.ctaHref}
                      className="inline-flex items-center gap-2 rounded-md bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
                    >
                      {slide.ctaLabel}
                      <span aria-hidden>→</span>
                    </HeroCtaLink>
                  </div>

                  <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-3">
                    {trustCards.slice(0, 4).map((card) => (
                      <HeroTrustCard key={`${slide.id}-${card.id}`} card={card} />
                    ))}
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <SlideMedia slide={slide} eager={i === 0} />
                </div>
              </div>
            </article>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go('prev')}
              className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white/95 p-2.5 text-neutral-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-brand sm:flex lg:left-4"
              aria-label="Önceki slayt"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go('next')}
              className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white/95 p-2.5 text-neutral-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-brand sm:flex lg:right-4"
              aria-label="Sonraki slayt"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div
          className="flex justify-center gap-2 pb-8 pt-2 lg:pb-10"
          role="tablist"
          aria-label="Slayt seçimi"
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slayt ${i + 1}: ${slide.title}`}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                i === index ? 'w-8 bg-brand' : 'w-2.5 bg-neutral-300 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
