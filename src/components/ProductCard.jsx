import { Heart, Star } from 'lucide-react';

export default function ProductCard({ brand, title, rating, reviews, price, image }) {
  return (
    <article className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-card transition-shadow hover:shadow-md">
      <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-neutral-50">
        <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full border border-neutral-200 bg-white p-2 text-neutral-400 shadow-sm transition-colors hover:border-brand hover:text-brand"
          aria-label="Favorilere ekle"
        >
          <Heart className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{brand}</p>
      <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-neutral-900">
        {title}
      </h3>
      <div className="mt-2 flex items-center gap-1 text-amber-500">
        <Star className="h-4 w-4 fill-current" aria-hidden />
        <span className="text-xs font-semibold text-neutral-800">{rating}</span>
        <span className="text-xs text-neutral-500">({reviews})</span>
      </div>
      <p className="mt-3 text-lg font-bold text-neutral-900">{price}</p>
      <button
        type="button"
        className="mt-4 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
      >
        Sepete ekle
      </button>
    </article>
  );
}
