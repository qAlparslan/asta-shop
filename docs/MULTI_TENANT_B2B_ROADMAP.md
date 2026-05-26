# Çok kiracılı (multi-tenant) ve B2B — yol haritası

Bu proje tek mağaza / tek işletme varsayımlıdır. Çok kiracılı veya B2B özellikleri için tipik yaklaşım:

## Çok kiracılı (tenant)

**Hedef:** Aynı kod tabanında birden çok işletme; veri sıkı ayrım.

Önerilen evreler:

1. **Şema:** Tüm ticari kayıtlara `tenantId` (UUID) — ürün, sipariş, kupon, site ayarı, kullanıcı (veya kullanıcı–tenant ara tablosu).
2. **İstek bağlamı:** Alt alan adı (`magaza1.site.com`), header (`X-Tenant-ID`) veya kullanıcı claim’inden tenant seçimi — **bir kaynağın diğerine sızması** engellenmeli (middleware ile `WHERE tenantId = :ctx`).
3. **PayTR / SMTP:** Tenant başına anahtar veya güvenli kasa referansları.
4. **Admin:** Süper-admin vs mağaza admin rolü.

## Çoklu mağaza (tek hukuki varlık)

Depo / şube ile karıştırmayın: zaten çoklu **depo** ve stok atanması var (`inventory`). “Mağaza” farklı marka veya lokasyon ise ürünlerde `branchId`, farklı kargo politikası vb. eklenebilir — boyut daha küçüktür.

## B2B fiyat listesi

**Hedef:** Müşteri grubuna göre net fiyat kalemi veya yüzdelik marj.

1. **`CustomerSegment`** veya kullanıcıda `pricingTier`.
2. **Ürün fiyatları:** Liste fiyatı + segment bazlı `ProductPrice(tierId, price)` veya kural motoru (% indirim).
3. **Checkout:** Fiyat doğrulama sunucuda `orderPricing` benzeri merkezi hesap ile — istemciden gelen fiyata güvenilmemeli.
4. **Vergi / fatura:** TCKN yerine vergi kimlik bilgisi, e-fatura entegrasyonu (ayrı proje kalınlığı).

## Bu adımla gelen zemın

- Siparişlerde **`userId`** ve **Siparişlerim API** ile kullanıcı–sipariş ilişkisi B2B’ye hazırlanır.
- Tenant/B2B şema kodu henüz eklenmedi; yukarıdaki maddeler ayrı faz olarak planlanmalıdır.
