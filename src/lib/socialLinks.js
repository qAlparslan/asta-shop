/**
 * Dış bağlantılar için güvenli href (yalnızca http/https; javascript: reddedilir).
 * `https://` eksik ve alan içeriyorsa otomatik https eklenir.
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizeSocialUrl(raw) {
  let u = String(raw ?? '').trim();
  if (!u) return '';
  const lower = u.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return '';
  if (!/^https?:\/\//i.test(u)) {
    const rest = u.replace(/^[/\s]+/, '');
    if (!rest) return '';
    u = `https://${rest}`;
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch {
    return '';
  }
}
