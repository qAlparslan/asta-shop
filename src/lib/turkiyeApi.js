const BASE = 'https://api.turkiyeapi.dev/v1';

/**
 * Türkiye API — il listesi ({ id, name }).
 * @param {AbortSignal} [signal]
 */
export async function fetchProvinces(signal) {
  const res = await fetch(`${BASE}/provinces?fields=id,name`, { signal });
  if (!res.ok) throw new Error('İller yüklenemedi.');
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

/**
 * @param {string|number} provinceId
 * @param {AbortSignal} [signal]
 */
export async function fetchDistrictsByProvince(provinceId, signal) {
  const res = await fetch(
    `${BASE}/districts?provinceId=${encodeURIComponent(String(provinceId))}&fields=id,name`,
    { signal },
  );
  if (!res.ok) throw new Error('İlçeler yüklenemedi.');
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}
