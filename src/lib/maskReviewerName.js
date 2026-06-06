const MASK_STARS = '***';

/**
 * Yorumlarda tam isim yerine: A***, B*** (sabit 3 yıldız).
 * @param {unknown} name
 */
export function maskReviewerName(name) {
  const raw = String(name ?? '').trim();
  if (!raw) return `Ü${MASK_STARS}`;

  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const first = part.charAt(0).toLocaleUpperCase('tr-TR');
      return `${first}${MASK_STARS}`;
    })
    .join(' ');
}
