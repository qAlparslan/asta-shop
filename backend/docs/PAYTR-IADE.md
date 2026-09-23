# PayTR — otomatik iade (İade API)

Müşteri veya admin **hazırlanıyor** siparişi iptal ettiğinde, tahsil edilmiş tutar için [PayTR İade API](https://dev.paytr.com/iade-api) çağrılır.

## Akış

1. `POST /api/orders/me/:id/cancel` veya admin `PUT /api/orders/:id` → `status: iptal-edildi`
2. Eski durum **hazirlaniyor** ise → `ensurePaytrRefundForPaidOrder`
3. PayTR `POST https://www.paytr.com/odeme/iade` başarılı → sipariş iptal + stok iadesi
4. PayTR hata → sipariş **iptal edilmez**; `orders.refundStatus=failed`, `refundLastError` dolar

**Ödeme bekleniyor:** Müşteri hesabından iptal kapalı (`POST /api/payments/cancel-pending` veya süre aşımı).

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `PAYTR_MERCHANT_ID` / `KEY` / `SALT` | — | Ödeme ile aynı |
| `PAYTR_REFUND_ON_CANCEL` | `true` | `false` ise hazırlanıyor iptali PayTR olmadan yapılmaz (502) |

## merchant_oid

Checkout ile aynı: sipariş UUID, tire olmadan (`utils/paytrMerchantOid.js`).

## reference_no

Yalnızca **alfanumerik** (A–Z, a–z, 0–9). Tire veya özel karakter PayTR tarafından reddedilir. Varsayılan: `cncl` + `merchant_oid` (ör. `cncl76f8dc6f7e7045c3bd9cda9a0b815a8b`).

## Tutar

`return_amount` **TL string**, ondalık **nokta** — örn. `3449.00` (iframe kuruş formatı değil).

## Veritabanı

`orders`: `refundStatus`, `refundedAmount`, `paytrRefundReference`, `refundLastError`, `refundedAt` — startup `ensureOrderRefundColumns`.

## Hata kodları

[PayTR hata kodları — İade](https://dev.paytr.com/hata-kodlari) (005, 007, 009, 010 vb.)

## Manuel yedek

Panelden iade + `PAYTR_REFUND_ON_CANCEL=false` ile yalnızca operasyonel iptal (önerilmez).
