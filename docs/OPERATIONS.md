# Operasyon notları

## CI (GitHub Actions)

`.github/workflows/ci.yml`:

- Frontend: `npm ci` + `vite build`.
- Backend: `node --check` + `npm test` (ör. `/api/health`, `/api/legal/versions`, kimliksiz `/api/orders/me` için 401; MySQL şart değil).

Tam API + kritik iş akışlarını staging’de veya Actions’ta bir **MySQL hizmeti** ile çalıştırmak için workflow’a `services: mysql` ve sırlar (`JWT_SECRET`, `DB_*`) eklenebilir.

## Ödeme ve mimari dökümanlar

- **PayTR iFrame canlı test rehberi:** `backend/docs/PAYTR-CANLI-TEST.md`
- **Çok kiracılı ve B2B yol haritası (taslak):** `docs/MULTI_TENANT_B2B_ROADMAP.md`

## Müşteri siparişleri

Giriş yapmış kullanıcı: **`GET /api/orders/me`** (`limit`/`offset`). Checkout’ta Bearer token ile ödeme verilirse `orders.userId` dolar; önceki siparişler aynı e-posta ile eşleştirilir.

## Staging ortamı

- Prod’dan **ayrı** veritabanı ve Mümkünse ayrı `FRONTEND_PUBLIC_URL`, `BACKEND_PUBLIC_URL`, `FRONTEND_ORIGINS`.
- `NODE_ENV=staging`; ödeme (`PAYTR_*`) test mağaza bilgileri ile, `PAYTR_TEST_MODE=1` ve `PAYTR_DEBUG_ON=true` çalıştırılması önerilir.
- Yayın adresi olarak `staging.example.com` + `API staging-api.example.com` gibi tek tip isimler.

## Yedekleme

MySQL için örnek: `backend/scripts/backup-mysql.ps1` (cron veya Görev Zamanlayıcı ile uygun sıklıkta çalıştırın).

- En azından: günlük tam yedek + 7 günlük tutma.
- Production’da yedek dosyası şifreleme ve farklı bölgede saklama düşünün.

## Hata izleme (Sentry benzeri)

Kök `.env` / ortamda:

```env
SENTRY_DSN=https://...@....ingest.sentry.io/...
NODE_ENV=production
```

Paket yüklüdür (`@sentry/node`). SDK, `expressApp` yüklendiğinde `SENTRY_DSN` dolu ise `expressIntegration` ve `setupExpressErrorHandler` ile bağlanır.

## E-posta başarı izleme

- **Admin panel** › Sistem › Mail Geçmişi: seçilen güne göre özet kutuları.
- **`GET /api/email-metrics/summary?sinceDays=30`** (yalnızca admin JWT): gönderim sayıları, başarı oranı, türe göre dağılım, webhook’tan kayıtlı bounce/complaint sayıları (`email_delivery_feedback`).

## Admin panel — kasıtlı olmayan / sınırlı alanlar

Bunlar hata değil, mevcut kapsam dışında bırakılmış veya elle yönetilen süreçler:

| Alan | Durum | Genişletmek için (özet) |
|------|--------|-------------------------|
| **CRM** | Yok | Müşteri notu / etiket / segment için tablolar, admin UI ve (isteğe bağlı) kampanya-hedef eşlemesi |
| **İade–iptal** | Müşteri self-servis ve kural motoru yok | İade talebi modeli + onay akışı + PayTR iptal/iade API + otomatik durum güncelleme kuralları |
| **Çok kullanıcılı roller** | Yalnızca `admin` / `customer` | Rol ENUM genişlemesi (örn. destek), `restrictTo`, audit ve panel menü filtresi |
| **İleri raporlama** | Temel grafik ve metrikler | Olay günlüğü, sipariş/ürün tarihinde agregasyon, LTV ve cohort için ayrı analitik sorgular veya dış araç (ör. Metabase + DB salt okuma) |

Müşteri sipariş listesi Hesabım’da ve **`GET /api/orders/me`** ile mevcut; iptal talebi için ayrı uç/UI bilinçli olarak eklenmedi (sahtecilik ve ödeme mutabakatı yüzünden genelde bileşik akış gerekir).
