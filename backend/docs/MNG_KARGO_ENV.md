# DHL eCommerce TR (MNG ApiZone) — `.env` değişkenleri

| Ortam | Developer portal | API host |
|--------|------------------|----------|
| Test | https://sandbox.mngkargo.com.tr | `https://testapi.mngkargo.com.tr` |
| Canlı | https://apizone.mngkargo.com.tr | `https://api.mngkargo.com.tr` |

```env
MNG_KARGO_ENABLED=true
MNG_API_ENV=sandbox
MNG_API_BASE_URL=https://testapi.mngkargo.com.tr
MNG_IBM_CLIENT_ID=          # Uygulama API Anahtarı (X-IBM-Client-Id)
MNG_IBM_CLIENT_SECRET=      # Güvenlik Dizisi (X-IBM-Client-Secret)
MNG_CUSTOMER_NUMBER=        # Online Şube müşteri numarası
MNG_CUSTOMER_PASSWORD=      # API alt kullanıcı şifresi (Identity /token)
MNG_DEFAULT_DESI=1
MNG_DEFAULT_KG=1
MNG_PACKAGING_TYPE=3
MNG_SHIPMENT_SERVICE_TYPE=1
MNG_PAYMENT_TYPE=1
MNG_DELIVERY_TYPE=1
```

**Varsayılan:** `MNG_API_ENV=sandbox` — API istekleri **her zaman** `testapi.mngkargo.com.tr` adresine gider (sunucuda yanlışlıkla canlı URL kalsa bile).

Canlıya geçmek için: `MNG_API_ENV=production`, `MNG_API_BASE_URL=https://api.mngkargo.com.tr` ve **apizone canlı** IBM anahtarları.

**Önemli:** IBM anahtarları ile `/token` için ayrıca **müşteri numarası + şifre** gerekir (Online Şube → Tanımlamalar → API kullanıcısı).

Şifrede `#` veya boşluk varsa `.env` içinde tırnak kullanın: `MNG_CUSTOMER_PASSWORD="..."`.

---

## Canlı (production) ortama geçiş

Kod değişikliği gerekmez; **sunucudaki** `backend/.env` güncellenir. Sandbox anahtarları **canlı host’ta çalışmaz** — ayrı uygulama ve anahtar gerekir.

### Ön koşullar (MNG)

1. **apizone.mngkargo.com.tr** üzerinde uygulama oluşturun / onaylatın.
2. Aynı API’lere abone olun: Identity, Standard Command, Barcode Command, CBS Info (+ ihtiyaç halinde Query).
3. **Sunucu çıkış IP** adresinizi MNG’ye bildirin (whitelist — canlıda sık zorunlu).
4. Online Şube’de **API alt kullanıcı** tanımlı olsun (canlı şifre).

### Sunucu `.env` (canlı örnek)

```env
MNG_KARGO_ENABLED=true
MNG_API_ENV=production
MNG_API_BASE_URL=https://api.mngkargo.com.tr
MNG_IBM_CLIENT_ID=<apizone CANLI uygulama anahtarı>
MNG_IBM_CLIENT_SECRET=<apizone CANLI güvenlik dizisi>
MNG_CUSTOMER_NUMBER=<Online Şube müşteri no>
MNG_CUSTOMER_PASSWORD="<API alt kullanıcı şifresi>"
```

Ardından:

```bash
pm2 restart asta-backend
cd backend && node scripts/mng-ping.js
```

`Token OK` → bağlantı ve kimlik bilgileri tamam.

### Test stratejisi (canlıda)

| Adım | Güvenli mi? |
|------|-------------|
| `node scripts/mng-ping.js` | Evet — yalnızca token |
| Portal Try → `/token` | Evet |
| Admin **DHL ile kargoya ver** | **Hayır — gerçek gönderi + ücret** |
| İlk deneme | Kendi adresinize **tek düşük tutarlı** gerçek sipariş |

Admin panelde ortam `production` ise kargoya ver bölümünde **canlı API** uyarısı görünür.

### Sandbox’tan farklar

- Tarayıcıda `https://api.mngkargo.com.tr/` → 404 normal (kök path yok).
- `fetch failed` → VPS firewall / DNS; `401` → yanlış canlı IBM anahtarı veya müşteri şifresi.
- Test ortamı sorunlu olsa bile canlı geçiş **MNG onayı + IP** olmadan genelde yine 401 veya bağlantı hatası verir.

---

Sunucuda bağlantı testi:

```bash
cd backend && node scripts/mng-ping.js
```

Akış: `createOrder` → `createbarcode` → `orders.trackingNumber` + mail.
