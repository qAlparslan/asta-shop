import { ShieldCheck, Truck, Lock, Headphones } from 'lucide-react';

/** @typedef {{ id: string; presetKey: string; title: string }} HeroTrustCard */

export const ICON_MAP = {
  shield: ShieldCheck,
  truck: Truck,
  lock: Lock,
  headphones: Headphones,
};

const ICON_META = [
  { key: 'shield', label: 'Garanti' },
  { key: 'truck', label: 'Kargo' },
  { key: 'lock', label: 'Ödeme' },
  { key: 'headphones', label: 'Destek' },
];

const VARIANTS = [
  {
    suf: 'soft',
    suffixLabel: 'Yumuşak',
    cardClassName: 'bg-white shadow-card ring-1 ring-neutral-200',
    iconClassName: 'h-7 w-7 shrink-0 text-brand',
  },
  {
    suf: 'ring',
    suffixLabel: 'Çerçeve',
    cardClassName: 'border-2 border-neutral-300 bg-neutral-50/90 shadow-sm',
    iconClassName: 'h-7 w-7 shrink-0 text-asta-navy',
  },
  {
    suf: 'tint',
    suffixLabel: 'Vurgulu',
    cardClassName:
      'bg-gradient-to-br from-brand-muted via-white to-white shadow-card ring-1 ring-brand/25',
    iconClassName: 'h-7 w-7 shrink-0 text-brand',
  },
];

/**
 * Güven kartı şablonları — adminde önizleme grid’inden seçilir.
 * Anahtar: `{icon}-{soft|ring|tint}`
 */
export const TRUST_CARD_PRESETS = ICON_META.flatMap(({ key: iconKey, label: baseLabel }) =>
  VARIANTS.map((v) => ({
    key: `${iconKey}-${v.suf}`,
    label: `${baseLabel}: ${v.suffixLabel}`,
    iconKey,
    cardClassName: v.cardClassName,
    iconClassName: v.iconClassName,
  })),
);

const PRESET_KEYS = new Set(TRUST_CARD_PRESETS.map((p) => p.key));

const LEGACY_ICON_DEFAULT = /** @type {Record<string,string>} */ ({
  shield: 'shield-soft',
  truck: 'truck-soft',
  lock: 'lock-soft',
  headphones: 'headphones-soft',
});

/** @param {string} key */
export function getTrustPresetByKey(key) {
  const k = String(key || '').trim();
  return TRUST_CARD_PRESETS.find((p) => p.key === k) ?? TRUST_CARD_PRESETS[0];
}

/** Ön yüz defaults (ayar kaydı yokken) — mevcut 4 klasik kart */
export const DEFAULT_HERO_TRUST_CARDS = [
  { id: 'default-1', presetKey: 'shield-soft', title: '%100 Orijinal Ürün' },
  { id: 'default-2', presetKey: 'truck-soft', title: '750 ₺ üzeri ücretsiz kargo' },
  { id: 'default-3', presetKey: 'lock-soft', title: '256-bit SSL güvenli ödeme' },
  { id: 'default-4', presetKey: 'headphones-soft', title: '7/24 Müşteri desteği' },
];

const idRx = /^[a-zA-Z0-9_-]{4,64}$/;

/**
 * @param {unknown} raw
 * @param {number} fallbackIndex
 * @returns {HeroTrustCard | null}
 */
export function normalizeStoredTrustCard(raw, fallbackIndex) {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof (/** @type {any} */ (raw)).title === 'string' ? (/** @type {any} */ (raw)).title.trim() : '';
  if (!title || title.length > 200) return null;

  let id = typeof (/** @type {any} */ (raw)).id === 'string' ? (/** @type {any} */ (raw)).id.trim().slice(0, 64) : '';
  if (!idRx.test(id)) id = `card-${fallbackIndex}`;

  /** @type {any} */
  const r = raw;
  let presetKey = typeof r.presetKey === 'string' ? r.presetKey.trim() : '';
  if (!PRESET_KEYS.has(presetKey)) {
    const icon = typeof r.iconKey === 'string' ? r.iconKey.trim() : '';
    presetKey = LEGACY_ICON_DEFAULT[icon] || 'shield-soft';
  }

  return { id, presetKey, title };
}

/**
 * Ayar ham değeri → kart listesi; boş / geçersizse null.
 * @param {unknown} raw
 * @returns {HeroTrustCard[] | null}
 */
export function parseHeroTrustCardsSetting(raw) {
  if (raw == null || raw === '') return null;
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  let arr;
  try {
    arr = JSON.parse(str);
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  const out = [];
  for (let i = 0; i < Math.min(arr.length, 4); i++) {
    const n = normalizeStoredTrustCard(arr[i], i);
    if (n) out.push(n);
  }
  return out.length > 0 ? out : null;
}
