/** @typedef {{ id: string; label: string; hint?: string }} SystemSection */

/** @type {SystemSection[]} */
export const SYSTEM_SECTIONS = [
  { id: 'kategoriler', label: 'Kategoriler', hint: 'Ürün grupları, mağaza kategori filtresi ve cilt tipi filtre etiketleri.' },
  {
    id: 'hero',
    label: 'Hero',
    hint: 'Ana sayfadaki kaydırmalı vitrin kartları — metin, arka plan (gradient/görsel) ve buton bağlantıları.',
  },
  { id: 'magaza-bilgileri', label: 'Mağaza bilgileri', hint: 'Mağaza adı ve iletişim.' },
  { id: 'kargo-vergi', label: 'Kargo & vergi', hint: 'Kargo ücretleri ve ücretsiz eşik.' },
  {
    id: 'bakim-modu',
    label: 'Bakım modu',
    hint: 'Yayından kaldırıp ziyaretçilere bakım mesajı gösterme.',
  },
  {
    id: 'kampanyalar',
    label: 'Kampanyalar',
    hint: 'Toplu e-posta kampanyaları — kitle seçimi, A/B ve test gönderimi (ayrı: Kuponlar menüsü).',
  },
  {
    id: 'yasal-metinler',
    label: 'Yasal metinler',
    hint:
      'KVKK, gizlilik, çerez, kullanım koşulları, ön bilgilendirme, mesafeli satış ve iade metinleri — mağaza ve onay süreçleriyle aynı kaynak.',
  },
];

export const SYSTEM_SECTION_IDS = new Set(SYSTEM_SECTIONS.map((s) => s.id));

export function sectionLabel(sectionId) {
  return SYSTEM_SECTIONS.find((s) => s.id === sectionId)?.label ?? sectionId;
}
