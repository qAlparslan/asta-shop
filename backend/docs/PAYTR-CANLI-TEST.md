# PayTR — canlı ortamda test / doğrulama rehberi

Bu proje için ödeme, sunucuya deploy edilmiş **üretim (veya hazırlık/staging)** üzerinden denenir. Tek ödeme sağlayıcısı **PayTR iFrame**'dir; adımlar PayTR Bildirim URL'sinin doğru kaydı üzerinedir.

## 1. Deploy öncesi kontrol (.env ve altyapı)

| Kontrol | Açıklama |
|--------|-----------|
| `NODE_ENV` | Üretimde `production`. |
| `BACKEND_PUBLIC_URL` | API’nin HTTPS kök adresi (`https://siteadresiniz.tld`). Sonunda `/` olmasın; PayTR bildirimi bu köke göre oluşturulur. |
| `FRONTEND_PUBLIC_URL` | Mağazanın görünür kök adresi. PayTR’nin başarılı/başarısız **müşteri yönlendirmesi** için gerekli. |
| `FRONTEND_ORIGINS` listesi | Frontend kökleri CORS’a uygun yazılmış olsun. |
| `TRUST_PROXY=true` | Sunucu CDN, Nginx veya load balancer arkasındaysa **müşteri gerçek IP’si** `X-Forwarded-For` ile gelmelidir; PayTR token isteğinde eksik/IP hatasını önler. |

## 2. PayTR Mağaza paneli ayarları

1. **Bilgi** sayfasından `merchant_id`, `merchant_key`, `merchant_salt` → `.env` içindeki `PAYTR_*` alanlarına (boşluksuz, gizleyin/commit etmeyin).
2. **Bildirim URL** (`iframe 2. adım`):  
   `https://<BACKEND_PUBLIC_URL>/api/payments/paytr-notification`  
   Sitenizde SSL hangi düzende ise panelde HTTPS/HTTP seçimini dokümana göre uyumlu tutun.
3. Canlı ilk denemede PayTR’nin izin verdiği süre içinde **`PAYTR_TEST_MODE=1`** kullanıp gerçek kartla “test işlem” açabilirsiniz; tahsilata geçerken **`PAYTR_TEST_MODE=0`** yapın. `PAYTR_DEBUG_ON=true` ilk teşhis günleri için uygun olabilir, işler oturunca kapatın.

`.env` değiştiğinde **Node sürecini yeniden başlatın** (PM2/docker/systemd vb.).

## 3. Aktifleştirme sırası (öneri)

Riski azaltmak için:

1. Deploy + sağlık kontrolü: tarayıcı veya araç ile `GET /api/health` yanıtı `ok`.
2. PayTR sırları (`PAYTR_MERCHANT_ID/KEY/SALT`) dolu → restart.
3. Gerçek cihazdan veya masaüstü tarayıcıdan **sipariş adımları** → ödeme ekranı açılıyor mu (iframe), hata yerine işlem oluşuyor mu.

Ek güvenlik: İlk iki denemede **düşük sepet tutarı** ve bilinen bir kart ile işlem daha güvenilir.

## 4. Üretimde test senaryoları

### A — Başarılı ödeme (mutlaka doğrulanacak)

1. Yasal checkbox + ödeme adımından **geç**.
2. PayTR iframe’de ödemeyi **başarıyla tamamla**.
3. **Tarayıcı**: `FRONTEND` üzerinde başarı sayfasına yönlendirme (sipariş no gösterilir; bu ekranda onay yapılmaz, PayTR bildirimi onayları tetikler).
4. **Yönetim / veritabanı**: Sipariş durumu **“ödeme bekleniyor” değil** → **“hazırlanıyor”** (veya sizdeki süreç adılarına uygun olarak ödeme sonrası status).
5. **PayTR paneli**: İşlem satırında **Başarılı**; “Devam Ediyor” kalırsa Bildirim URL’den **`OK`** dönülmemiş veya bağlantı/SSL uyumsuzluğu vardır (panel Detay’a bakın).
6. Yan etkiler: sipariş onay e-postası, admin bildirimi, varsa Paraşüt/e-fatura kuyruk tetikleri (projenize göre kontrol listeleyin).

### B — Bildirimin tekrar gelmesi (idempotent davranış)

PayTR zaman zaman aynı işlem için bildirimi yineler. Beklenen: sipariş zaten **`hazırlandı`** kabulünde ise **tekrar stok/taşıma yapmaması**, yanıt yine **`OK`**.

*(İlk doğrulamada üst üste bildirimi zorlamak şart değil; sistem buna uyumlu yazılmıştır.)*

### C — Müşteri ödemeyi bıraktı / zaman aşımı

Sepet oluştuğu halde ödeme bitmezse sipariş “ödeme bekleniyor”da kalır; gerektiği üz süre/policy ile temizlenebilir. Bu ilk canlı doğrulamada bloklayıcı değil ama süre sonrası operasyon olarak bilinmeli.

### D — Kart reddi veya iptal

Beklenen: bildirimde **başarısız** veya uygun iptal kodu ile sipariş **iptal** ve stoğun serbest bırakılması (projenin PayTR bildirimi akışına göre kontrol).

## 5. Yaygın canlı aksaklıklar

| Belirti | Olası neden |
|---------|--------------|
| “Geçerli kullanıcı IP” / token reddi | `TRUST_PROXY` veya iletilen başlıklar yanlış; gerçek dış IP PayTR’a gitmiyor. |
| PayTR işlem **Devam Ediyor** | Bildirim URL yanlış, SSL mismatch, güvenlik duvarı `POST`; **hash uyuşmazlığında** bu uç `OK` göndermez (`400` + düz metin) — sunucu günlüğünde `hash doğrulanamadı` arayın. |
| Yönlendirme localhost veya yanlış alan | `FRONTEND_PUBLIC_URL` ile canlı alan uyumsuz. |
| 502 / zaman aşımı / token mesaj PayTR’dan | `get-token` isteği 20 sn zaman aşımına uğrayabilir; `PAYTR_DEBUG_ON=true` ile PayTR’nin döndürdüğü `reason` değerlendirilir (sonra kapalı tutun). |

---

**Özet:** Bildirim URL’de **geçerli hash** ile doğrulanan isteklerde PayTR’ye yalnızca düz metin **`OK`** dönülür; geçersiz hash veya zorunlu alan eksikliğinde **`OK` gönderilmez** (`HTTP 400`, [2. adım dok.](https://dev.paytr.com/iframe-api/iframe-api-2-adim)). Sipariş güncellemesi `total_amount` ve `PAYTR_CURRENCY` ile tutarlılık kontrollerine bağlıdır; müşteri yönlendirme sayfası bilgilendirme amaçlıdır.
