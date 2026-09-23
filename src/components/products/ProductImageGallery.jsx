import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

/**
 * @param {{ images: string[]; productName: string; index: number; onIndexChange: (i: number) => void }} props
 */
export default function ProductImageGallery({ images, productName, index, onIndexChange }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const count = images.length;
  const safeIndex = count > 0 ? Math.min(Math.max(index, 0), count - 1) : 0;
  const mainSrc = count > 0 ? images[safeIndex] : '';

  const goPrev = useCallback(() => {
    if (count < 2) return;
    onIndexChange((safeIndex - 1 + count) % count);
  }, [count, safeIndex, onIndexChange]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    onIndexChange((safeIndex + 1) % count);
  }, [count, safeIndex, onIndexChange]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen, goPrev, goNext]);

  const openLightbox = () => {
    if (mainSrc) setLightboxOpen(true);
  };

  return (
    <>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-neutral-100 bg-theme-media-well p-4 sm:p-6">
        {mainSrc ? (
          <button
            type="button"
            onClick={openLightbox}
            className="group relative flex h-full w-full cursor-zoom-in items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            aria-label="Ürün görselini büyüt"
          >
            <img
              src={mainSrc}
              alt={productName}
              className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" aria-hidden />
              Büyüt
            </span>
          </button>
        ) : (
          <span className="text-sm text-neutral-400">Görsel yok</span>
        )}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-20 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            aria-label="Önceki görsel"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-2">
            {images.map((u, i) => (
              <button
                key={`${u}-${i}`}
                type="button"
                onClick={() => onIndexChange(i)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-white p-2 transition ${
                  i === safeIndex ? 'border-asta-navy ring-2 ring-asta-navy/20' : 'border-neutral-200'
                }`}
                aria-label={`Görsel ${i + 1}`}
                aria-current={i === safeIndex ? 'true' : undefined}
              >
                <img src={u} alt="" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex h-20 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            aria-label="Sonraki görsel"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      {lightboxOpen && mainSrc ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} — görsel ${safeIndex + 1} / ${count}`}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Kapat"
          >
            <X className="h-6 w-6" strokeWidth={2} />
          </button>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 sm:left-4"
                aria-label="Önceki görsel"
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25 sm:right-4"
                aria-label="Sonraki görsel"
              >
                <ChevronRight className="h-7 w-7" strokeWidth={2} />
              </button>
            </>
          ) : null}

          <div
            className="flex max-h-[85vh] max-w-[min(100%,56rem)] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={mainSrc}
              alt={productName}
              className="max-h-[78vh] w-auto max-w-full object-contain"
            />
            {count > 1 ? (
              <p className="mt-4 text-sm font-medium text-white/90">
                {safeIndex + 1} / {count}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
