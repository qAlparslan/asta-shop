# E-Ticaret Mağaza — Teknik Dokümantasyon

Cilt bakım / kozmetik odaklı, tam teşekküllü bir **e‑ticaret** uygulamasıdır. Tek depoda iki ana parça vardır: **React (Vite) mağaza + yönetim arayüzü** ve **Node.js / Express REST API**. Ödeme (**PayTR iFrame**), e‑posta, kampanya/bülten, stok ve **Paraşüt** muhasebe entegrasyonu gibi modüller production kullanımına göre yapılandırılabilir.

---

## İçindekiler

1. [Genel bakış](#1-genel-bakış)
2. [Teknoloji yığını](#2-teknoloji-yığını)
3. [Klasör yapısı](#3-klasör-yapısı)
4. [Mevcut özellikler](#4-mevcut-özellikler)
5. [API yüzeyi (özet)](#5-api-yüzeyi-özet)
6. [Entegrasyonlar](#6-entegrasyonlar)
7. [Çalıştırma](#7-çalıştırma)
8. [Ortam değişkenleri](#8-ortam-değişkenleri)
9. [Eklenebilecek / geliştirilebilecek özellikler](#9-eklenebilecek--geliştirilebilecek-özellikler-yol-haritası)

---

## 1. Genel bakış

| Bileşen | Açıklama |
| -------- | --------- |
| **Ön yüz** | React 18, React Router 6, Tailwind CSS, Vite · Mağaza, sepet, ödeme akışı, kullanıcı hesabı, yasal metinler, çerez onayı |
| **Arka yüz** | Express 5, Sequelize, MySQL · JWT tabanlı kimlik doğrulama, dosya yükleme, ödeme callback’leri, e‑posta kuyruğu benzeri loglama |
| **Yönetim** | Rol tabanlı **admin paneli**: siparişler, ürünler, kuponlar, kullanıcılar, sistem ayarları (kategoriler, site, kampanya, metrik vb.) |

Tasarım dili olarak “temiz güzellik / premium mağaza” çizgisinde ilerliyor (yüzen bileşenler, hero alanı, nötr palet). Teknik yapı SPA + ayrı API ile ölçeklenebilir.

---

## 2. Teknoloji yığını

**Kök (`package.json` — frontend)**  

- React, React Router, Lucide, Recharts  
- `@vitejs/plugin-react`, Tailwind, PostCSS  
- Tip: ES modules  

**Backend (`backend/package.json`)**  

- Express, Sequelize, mysql2  
- Güvenlik: helmet, cors, express-rate-limit, bcryptjs, JWT  
- Ödeme: PayTR iFrame API (saf `crypto` + `https.request`, ek paket yok)  
- E‑posta: nodemailer  
- İzlenebilirlik: `@sentry/node`  
- İçerik güvenliği: `sanitize-html`  
- Yerel araçlar: nodemon, sequelize-cli, supertest  

---

## 3. Klasör yapısı

```
.
├── backend/                 # REST API ve iş mantığı
│   ├── config/              # DB, sequelize, yasal sürüm/merge
│   ├── controllers/
│   ├── middlewares/
│   ├── models/              # Sequelize modelleri
│   ├── routes/
│   ├── services/            # Ödeme, mail, Paraşüt, kampanya vb.
│   ├── utils/
│   ├── migrations/          # (varsa) veritabanı migrasyonları
│   ├── scripts/
│   ├── uploads/             # Yerel yükleme (görseller)
│   ├── logs/                # Örn. invoice_errors.log (gitignore’a uygun)
│   └── server.js
├── src/                     # React uygulaması
│   ├── admin/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── lib/
│   └── App.jsx
├── dist/                    # vite build çıktısı (üretim)
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 4. Mevcut özellikler

### Müşteri (storefront)

- **Ürün listeleme** ve **SEO dostu slug** ile ürün detay (`/urun/:slug`, ID ile fallback)
- **Sepet**, **checkout**, **sipariş tamamlama**
- **Ödeme sonrası** başarı / hata sayfaları
- **Üyelik**: kayıt, giriş, şifre sıfırlama
- **Hesap alanı**: profil, sipariş geçmişi
- **Yasal metinler** (`/yasal/:slug`) — backend’den sürüm/yayın politikasıyla beslenebilir
- **Çerez / rıza** bandı (`CookieConsentBanner`, ziyaretçi anahtarı ile uyumluluk)
- **Site ayarları** ile **bakım modu** — yöneticiler hariç kısıtlı görünüm
- **İletişim / hakkımızda**, **dinamik hero**, footer (bülten, sosyal linkler vb.)

### Yönetici (admin)

- **Dashboard** (özet / grafik bileşenleri — Recharts)
- **Sipariş** yönetimi
- **Ürün** ve **varyant/stok** ile ilgili operasyonlar (envanter endpoint’leri)
- **Kupon** yönetimi
- **Kullanıcı** yönetimi
- **Sistem**: kategoriler, site ayarları, kampanya, e‑posta metrikleri, ürün yorumları moderasyonu, denetim (audit), home hero vb.

### Arka uç iş kuralları (özet)

- **JWT** ile korumalı / isteğe bağlı kullanıcılı rotalar (`optionalProtect`)
- **Sipariş durumları**, stok güncelleme, kupon doğrulama
- **Bülten** ve **kampanya** (onaylı bülten, şablonlar)
- **Rıza (consent)** ve **yasal** içerik API’leri
- **Ürün yorumları**: kullanıcı tarafı + admin onayı
- **Stok uyarıları** (ürün bildirimi)
- **Çoklu depo**: `Warehouse` / `ProductWarehouseStock` ile stok katmanı
- **Denetim kayıtları** (`AdminAuditLog`)
- **E‑posta logları ve geri bildirim** webhook’u (posta sağlayıcı bounce/engage entegrasyonu için altyapı)
- **Sitemap** üretimi
- **Otomatik hatırlatma** vb. zamanlanmış e‑posta servisleri (`automatedReminders`)

---

## 5. API yüzeyi (özet)

Tipik bağlantılar `expressApp.js` içinde monte edilir:

| Prefix | İçerik |
| --------- | --------- |
| `/api/auth` | Giriş, kayıt, token |
| `/api/products`, `/api/categories` | Katalog |
| `/api/orders` | Sipariş oluşturma / listeleme |
| `/api/coupons` | Kuponlar |
| `/api/users` | Profil · admin kullanıcı işlemleri |
| `/api/settings` | Site ayarları (bakım dahil) |
| `/api/payments` | Ödeme başlatma, callback, PayTR bildirim |
| `/api/newsletter`, `/api/campaigns` | Pazarlama |
| `/api/inventory` | Stok |
| `/api/legal`, `/api/consent` | Yasal + KVK uyumu |
| `/api/home-hero` | Ana sayfa slider |
| `/api/email-metrics` | E‑posta ölçümleri |
| `/api/admin/product-reviews` | Moderasyon |
| `/api/audit-logs` | Denetim |
| `/api/integrations/parasut` | Paraşüt ping / elle fatura tetikleme (`/ping`, sipariş fatura vb.) |
| `/api/webhooks/mail-feedback` | Posta webhook |
| `/sitemap.xml` | SEO |

Sağlık kontrolü: `GET /api/health`.

---

## 6. Entegrasyonlar

| Servis | Rol |
| -------- | ----- |
| **PayTR iFrame** | Tek ödeme sağlayıcısı. `POST /api/payments/create-payment` → iframe token, `POST /api/payments/paytr-notification` → arka bildirim. Sipariş kesinleşmesi yalnızca bildirim hash doğrulamasına bağlıdır. |
| **Paraşüt v4** | OAuth2; ödeme sonrası **`invoiceService`** arka planda Paraşüt'te **yalnızca TASLAK satış faturası (estimate / proforma)** açar. Resmileştirme, tahsilat kaydı, e-arşiv ve GİB iletimi YAPILMAZ — Paraşüt panelinden elle yönetin. Anahtarlar: `PARASUT_AUTO_DRAFT`, `PARASUT_DEFAULT_PRODUCT_ID`, `PARASUT_PRICE_INCLUDES_VAT`, `PARASUT_DEFAULT_VAT_RATE`. |
| **Nodemailer** | Sipariş onayı, şifre sıfırlama, admin bildirimi, kampanya vb. |
| **Sentry** | Sunucu hata izleme (isteğe bağlı DSN ile) |

Paraşüt hataları: `backend/logs/invoice_errors.log`; kritik hatalarda yöneticilere e‑posta (`notifyAdminsOfParasutFailure`).

---

## 7. Çalıştırma

### Ön koşullar

- Node.js LTS önerilir  
- MySQL (Sequelize yapılandırması `backend/.env` ve `config/database.js`)

### Frontend

```bash
npm install
npm run dev
```

Varsayılan geliştirme API adresi `http://localhost:5000`; üretimde `VITE_API_ORIGIN` zorunludur (`src/config/api.js`).

### Backend

```bash
cd backend
npm install
# .env dosyasını doldurun (DB, güvenlik, ödeme, mail)
npm run dev
```

Üretim: `npm start` (`server.js`).

Migrasyon örnekleri: `npm run migrate` · `migrate:status` vb.

Ek script’ler:

- `verify:sanitize` — HTML sanitize doğrulama  
- `repair:indexes` — MySQL indeks onarımı  

---

## 8. Ortam değişkenleri

Gerçek değerler **`backend/.env`** içindedir (depoya **işlenmez**).

Özet başlıklar:

- **SUNUCU:** `PORT`, `NODE_ENV`, `TRUST_PROXY`, `FRONTEND_ORIGINS`
- **VERİTABANI:** host, kullanıcı, şifre, ad, Sequelize ayarları
- **AUTH / GÜVENLİK:** JWT sırrı, rate limit parametreleri
- **ÖDEME:** PayTR kimlikleri (`PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`), test/debug bayrakları, genel geri bildirim URL’leri (`BACKEND_PUBLIC_URL`, `FRONTEND_PUBLIC_URL`)
- **MAİL:** SMTP veya transactional sağlayıcı ayarları, bildirim e‑posta listesi (`ADMIN_NOTIFICATION_EMAIL`)
- **FRONTEND:** `FRONTEND_PUBLIC_URL` — sitemap ve ödeme dönüş URL’leri için referans
- **PARASUT_\*** Sadece TASLAK satış faturası için gerekli anahtarlar (`PARASUT_CLIENT_ID`, `PARASUT_CLIENT_SECRET`, `PARASUT_USERNAME`, `PARASUT_PASSWORD`, `PARASUT_COMPANY_ID`, `PARASUT_DEFAULT_PRODUCT_ID`, `PARASUT_AUTO_DRAFT`, vs.). `backend/.env` içinde açıklamalı.

Tam liste için depodaki güncel `backend/.env` şablon yorumlarına bakın.

---

## 9. Eklenebilecek / geliştirilebilecek özellikler (yol haritası)

Aşağıdaki maddeler ürün büyümesine göre sıralanabilir; bir kısmı kodda temel olarak vardır, bir kısmı sıfırdan eklenebilir.

### Mağaza & dönüşüm

- Çok dillilik (i18n): TR varsayılı, İngilizce / seçilebilir dil
- Akıllı arama / otomatik tamamlama (Meilisearch, Algolia vb.)
- Favoriler / kalıcı istek listesi (hesap bağlı veya anonim anahtar)
- Kişiye özel kuponlar ve dinamik fiyat kuralları
- Mağaza içi bildirimler (toast + merkezi “bildirim merkezi”)

### Sipariş & lojistik

- Kargo entegrasyonları (API ile takip no, SLA)
- Sipariş kısmi iptal / kısmi iade akışları
- Fatura görüntüleme müşteri panelinden (Paraşüt veya dahili PDF)
- Sipariş notları ve zaman çizelgesi (olmış olayların müşteri tarafından görülmesi)

### Ödeme & muhasebe

- Kart saklama (tokenization — PCI gereksinimi ile dikkatli tasarım)
- Taksit / banka kampanyası yönetimi
- Çoklu para birimi (TRY dışı) ve günlük kur
- **Paraşüt:** müşteriye doğrudan e‑posta atan kendi bildiriminiz (PDF indirip SMTP ile gönderim)
- E‑fatura (GİB) tam otomatik senaryoda ek doğrulama ve test ortamları

### Pazarlama & analitik

- Segment bazlı kampanya tetikleri (sipariş değeri, son ziyaret)
- GA4 / Meta Pixel ile olay bazlı takip (KVK uyumlu onay bağlantılı)
- A/B test altyapısı (özellik bayrakları ile)

### Operasyon & güvenlik

- İki adımlı admin girişi (2FA)
- Rol granularitesi (“editör”, “support”, “finance” vb.)
- Geliştirilmiş KVK özeti ve veri ihracı / silme talepleri
- Şüpheli giriş / cihaz kaydı bildirimi

### Mühendislik

- Swagger / OpenAPI otomatik üretim  
- Dockerfile + Compose ile tek komut geliştirme  
- Birim / entegrasyon test kapsamasının artırılması  
- Kuyruk (BullMQ, RabbitMQ): e‑posta ve Paraşüt işlerinin worker’a taşınması  
- Önbellekleme katmanı (Redis) sıcak ayarlar ve katalog için

---

## Lisans ve marka

Proje yapısı “Purity Skincare” / **Asta Ticaret** çizgisinde bir markalı mağaza için kullanılıyorsa ticari lisans/marka hakları size aittir. Bu dosya teknik referans olarak hazırlanmıştır.

---

Son güncelleme: Dokümantasyon, monorepo (React + Express + MySQL) ve Paraşüt/ödeme entegrasyonlu güncel mimariye göre birleştirilmiştir. Eski README’deki “yalnızca arayüz prototipi” maddeleri artık geçerliliğini yitirmiştir; gerçek backend ve özellik seti burada özetlenmektedir.
