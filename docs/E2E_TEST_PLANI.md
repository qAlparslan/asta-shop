# Uçtan Uca (E2E) ve Entegrasyon Test Planı

Proje: **Site - Kopya** — referans: `docs/TEKNIK_MIMARI_OZETI.md`

---

## 1. Test piramidi

| Katman | Araç | Kapsam |
|--------|------|--------|
| Smoke | Node `test` + Supertest | Auth’suz uçlar, 401 kablolar |
| Entegrasyon | Supertest + test MySQL | Controller + DB + mailer mock |
| E2E | Playwright / Cypress (öneri) | Vitrin + checkout + admin |
| Manuel | Health + smtp-ping | Prod SMTP / PayTR |

---

## 2. Modül bazlı kritik vakalar

### 2.1 Auth / User (`/api/auth`, `/api/users`)

**Pozitif**

- Kayıt → 201 + JWT + `users` satırı
- Giriş doğru şifre → 200 + token
- `GET /me` token ile → kullanıcı profili
- `PATCH /me` → profil güncelleme
- Şifre sıfırlama → token DB’de, mail log `passwordReset` (mock)

**Negatif**

- Kayıt: geçersiz e-posta → 400
- Kayıt: duplicate email → 400
- Giriş: yanlış şifre → 401
- `GET /me` token yok → 401
- `GET /me` süresi dolmuş token → 401
- `reset-password` geçersiz token → 400
- Admin: `PATCH /users/:id/role` customer token → 403
- Rate limit: çok fazla login → 429

### 2.2 Products (`/api/products`)

**Pozitif**

- Public liste → sadece `is_active`
- Slug ile detay → 200
- Admin create + upload görsel → `/uploads/...`
- Varyantlı sepet satırı checkout’ta fiyat doğrulama

**Negatif**

- Silinmiş ürün (paranoid) → 404
- Admin CRUD token yok → 401
- CSV import bozuk dosya → 400
- Stok 0 iken checkout → 400

### 2.3 Orders (`/api/orders`)

**Pozitif**

- `GET /orders/me` → sadece `userId` veya eşleşen email
- Admin ship → status `kargolandi`, tracking
- Admin stats filtreleri (daily/weekly/…)

**Negatif**

- `POST /orders` → **410 Gone**
- `GET /orders/me` misafir → 401
- Müşteri `GET /orders` (admin list) → 403
- Var olmayan sipariş ship → 404

### 2.4 Payments (`/api/payments`)

**Pozitif**

- `create-payment` geçerli sepet → PayTR token (mock API)
- Webhook `success` → `hazirlaniyor`, stok düşümü, EmailLog `orderConfirmation`
- Webhook duplicate → idempotent OK

**Negatif**

- Boş sepet → 400
- Hatalı HMAC webhook → red / OK politikasına göre
- Webhook `failed` → `iptal-edildi`, stok serbest
- PayTR env eksik → 500 / yapılandırma hatası
- Client `totalAmount` manipülasyonu → sunucu reddi

### 2.5 Mailer

**Pozitif**

- `POST /api/health/mail/ping` admin → SMTP verify
- `POST /api/health/mail/test` → EmailLog `healthCheck` success
- Kayıt sonrası EmailLog `welcome` (async, kısa bekleme)
- PayTR success → `orderConfirmation` + `adminNewOrder`

**Negatif**

- Mail test token yok → 401
- Geçersiz `to` → 400
- SMTP verify fail → 503, test mail gönderilmez
- `ADMIN_NOTIFICATION_EMAIL` boş + admin yok → admin sipariş maili `no-admin-recipients`
- Ethereal modda prod sanılıp “mail gitmedi” → `transportMode: ethereal`

### 2.6 Coupons, Newsletter, Campaign, Legal, Inventory

- Kupon validate: süresi dolmuş, min tutar, pasif → fail
- Newsletter: double opt-in pending → confirm token
- Kampanya: audience boş → 0 recipient
- Legal: checkout sürüm pin uyuşmazlığı → 400
- Inventory: çoklu depo tahsis yetersiz stok → 400

---

## 3. Sistem / altyapı negatif senaryolar

| Senaryo | Beklenen |
|---------|----------|
| MySQL kapalı | `GET /api/health/ready` → 503 |
| JWT_SECRET kısa (production) | Process exit |
| DB bağlantı kopukluğu mid-request | 500 + Sequelize hata |
| CORS yanlış origin | Browser block (manuel) |
| `FRONTEND_PUBLIC_URL` boş | Mail linkleri localhost uyarısı |

---

## 4. Otomasyon — Node test + Supertest (mevcut yapı)

Proje **Jest kullanmıyor**; `backend/package.json` → `"test": "node --test tests/**/*.test.js"`.

### Örnek: health modülü (CI uyumlu)

```javascript
// backend/tests/api-smoke.test.js (genişletilmiş)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildApp } = require('../expressApp');

describe('Health API', () => {
  test('GET /api/health', async () => {
    const res = await request(buildApp()).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});
```

### Örnek: auth + mail entegrasyonu (test DB gerekir)

```javascript
// backend/tests/integration/auth-mail.test.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-chars-for-jwt!!';

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildApp } = require('../../expressApp');

describe('Auth + mail (integration)', () => {
  let app;
  let adminToken;

  before(async () => {
    // Ön koşul: TEST_DATABASE_URL veya docker mysql
    app = buildApp();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'test-pass' });
    adminToken = login.body.token;
  });

  test('POST /api/health/mail/ping — admin', async () => {
    const res = await request(app)
      .post('/api/health/mail/ping')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.ok([200, 503].includes(res.status));
    assert.ok(res.body.data?.mode);
  });
});
```

### Tüm API’leri dahil etme stratejisi

1. **Klasör yapısı**

   ```
   backend/tests/
     api-smoke.test.js      # DB yok
     integration/
       auth.test.js
       products.test.js
       orders.test.js
       payments.test.js
       mailer.test.js
   ```

2. **Ortak fixture** (`tests/helpers/app.js`, `tests/helpers/seed.js`)

   - `buildApp()` tek instance
   - `before` hook: transaction + rollback veya test DB truncate
   - Mail için: `NODE_ENV=test` + Ethereal veya `nodemailer` mock transport inject (ileride `mailer` DI)

3. **CI ayrımı**

   - Job `smoke`: mevcut (MySQL yok)
   - Job `integration`: GitHub Actions service container `mysql:8`

4. **Jest’e geçiş (opsiyonel)**

   - `jest` + `supertest` aynı assert mantığı; migration maliyeti düşük
   - SSOT: test runner değişse bile **Supertest + buildApp()** kalır

---

## 5. E2E vitrin senaryoları (Playwright önerisi)

1. Ana sayfa yüklenir, hero API veya fallback
2. Ürünler → filtre → detay → sepete ekle → sepet sayısı
3. Checkout misafir: il/ilçe, kupon, yasal onay (PayTR mock/stub)
4. Giriş → hesabım siparişler
5. Admin: sipariş listesi, durum güncelle (staging)

---

## 6. Sağlık kontrolü checklist (deploy öncesi)

- [ ] `GET /api/health/ready` → 200
- [ ] `GET /api/health/detailed` → mail.verify.ok true
- [ ] `POST /api/health/mail/test` → success + EmailLog
- [ ] `node backend/scripts/smtp-ping.js` → OK
- [ ] PayTR bildirim URL erişilebilir
- [ ] `FRONTEND_PUBLIC_URL` canlı domain

---

## 7. Öncelik sırası (uygulama)

1. Smoke genişletme (tüm modüllerde 401/410)
2. Integration MySQL container + auth fixture
3. Payment webhook fixture (HMAC test vector)
4. Playwright kritik checkout path
5. Mailer mock ile order status fire-and-forget assert
