/** Türk Lirası gösterimi — katalog / sepet / header ortak kullanım. */
export function formatTRY(value) {
  return `${Number(value).toLocaleString('tr-TR')} TL`;
}
