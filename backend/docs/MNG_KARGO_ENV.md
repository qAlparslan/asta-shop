# DHL eCommerce TR (MNG ApiZone) — `.env` değişkenleri

Sandbox portal: https://sandbox.mngkargo.com.tr  
Test API host: `https://testapi.mngkargo.com.tr`  
Production: `https://api.mngkargo.com.tr` (apizone onayı sonrası)

```env
MNG_KARGO_ENABLED=true
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

**Önemli:** IBM anahtarları ile `/token` için ayrıca **müşteri numarası + şifre** gerekir (Online Şube → Tanımlamalar → API kullanıcısı).

Akış: `createOrder` → `createbarcode` → `orders.trackingNumber` + mail.
