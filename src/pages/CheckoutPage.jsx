import { useMemo, useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  MapPin,
  Package,
  ShieldCheck,
  TicketPercent,
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { formatTRY } from '../lib/formatTRY.js';
import { inputClass, inputErrorClass } from '../lib/formStyles.js';
import { fetchDistrictsByProvince, fetchProvinces } from '../lib/turkiyeApi.js';
import { apiFetch, isAbortError } from '../api/client.js';
import { computeOrderTotals } from '../lib/orderTotals.js';
import FreeShippingProgress from '../components/FreeShippingProgress.jsx';

/** Cep: `0 XXX XXX XX XX` — yazarken otomatik boşluk. */
function formatTRMobileInput(raw) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('90')) d = `0${d.slice(2)}`.slice(0, 11);
  else if (d.length > 0 && d[0] === '5') d = `0${d}`.slice(0, 11);
  else d = d.slice(0, 11);

  let out = '';
  for (let i = 0; i < d.length; i++) {
    if ([1, 4, 7, 9].includes(i)) out += ' ';
    out += d[i];
  }
  return out;
}

export default function CheckoutPage() {
  const { lines, subtotal, itemCount } = useCart();
  const hasItems = lines.length > 0;

  const [step, setStep] = useState(1);

  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(null); // { code, discountPercent }
  const [couponError, setCouponError] = useState('');

  const [invoice, setInvoice] = useState({
    wantsElectronicInvoice: false,
    invoiceTaxNumber: '',
    invoiceCompanyTitle: '',
    invoiceTaxOffice: '',
  });

  const [errors, setErrors] = useState({});

  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    provinceId: '',
    city: '',
    district: '',
    addressLine: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [provincesError, setProvincesError] = useState('');
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtsError, setDistrictsError] = useState('');

  const [settings, setSettings] = useState({});
  const [couponBusy, setCouponBusy] = useState(false);
  const [checkoutPayBusy, setCheckoutPayBusy] = useState(false);
  const [paytrIframeToken, setPaytrIframeToken] = useState('');
  const [orderSubmitError, setOrderSubmitError] = useState('');
  /** Ön bilgilendirme / mesafeli satış sürüm kodları */
  const [legalCheckout, setLegalCheckout] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    apiFetch('/api/settings', { skipAuth: true, signal: ac.signal })
      .then((res) => setSettings(res?.data?.settings || {}))
      .catch((err) => {
        if (isAbortError(err)) return;
        setSettings({});
      })
      .finally(() => {
        /* no-op */
      });
    return () => ac.abort();
  }, []);


  useEffect(() => {
    const ac = new AbortController();
    setProvincesLoading(true);
    setProvincesError('');
    fetchProvinces(ac.signal)
      .then(setProvinces)
      .catch((err) => {
        if (err.name !== 'AbortError') setProvincesError(err.message || 'İller yüklenemedi.');
      })
      .finally(() => setProvincesLoading(false));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    apiFetch('/api/legal/versions', { skipAuth: true, signal: ac.signal })
      .then((res) => setLegalCheckout(res?.data || null))
      .catch(() => setLegalCheckout(null));
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const id = address.provinceId;
    if (!id) {
      setDistricts([]);
      setDistrictsError('');
      return;
    }
    const ac = new AbortController();
    setDistrictsLoading(true);
    setDistrictsError('');
    fetchDistrictsByProvince(id, ac.signal)
      .then(setDistricts)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setDistricts([]);
          setDistrictsError(err.message || 'İlçeler yüklenemedi.');
        }
      })
      .finally(() => setDistrictsLoading(false));
    return () => ac.abort();
  }, [address.provinceId]);

  const discountPercentApplied = couponApplied?.discountPercent ?? 0;

  const totals = useMemo(
    () => computeOrderTotals(lines, discountPercentApplied, settings),
    [lines, discountPercentApplied, settings],
  );

  const shippingFeeOn = settings.shippingFeeEnabled !== false && settings.shippingFeeEnabled !== 'false';
  const freeShipOn = totals.freeShippingEnabled !== false && totals.freeShippingEnabled !== 'false';
  const freeShipThreshold = Number(totals.freeShippingThreshold) || 0;
  const showFreeShippingPanel = hasItems && shippingFeeOn && freeShipOn && freeShipThreshold > 0;
  const paysShippingCharge = totals.shipping > 0;

  const validateAddress = () => {
    const e = {};
    if (!address.firstName.trim()) e.firstName = 'Ad girin.';
    if (!address.lastName.trim()) e.lastName = 'Soyad girin.';
    if (!address.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim()))
      e.email = 'Geçerli e-posta girin.';
    const d = address.phone.replace(/\D/g, '');
    if (!d || !/^05\d{9}$/.test(d))
      e.phone = 'Geçerli cep girin (11 hane, 0 ile başlar: 0 5XX XXX XX XX).';
    if (!address.provinceId) e.province = 'İl seçin.';
    if (!address.district.trim()) e.district = 'İlçe seçin.';
    if (!address.addressLine.trim()) e.addressLine = 'Adres satırını doldurun.';
    if (invoice.wantsElectronicInvoice) {
      const vd = invoice.invoiceTaxNumber.replace(/\D/g, '');
      if (vd.length !== 10 && vd.length !== 11)
        e.invoiceTaxNumber = 'VKN (10) veya TCKN (11) hane olarak girilmelidir.';
      if (!invoice.invoiceCompanyTitle.trim() || invoice.invoiceCompanyTitle.trim().length < 2)
        e.invoiceCompanyTitle = 'Fatura ünvanı veya unvan yazın.';
      if (vd.length === 10 && !invoice.invoiceTaxOffice.trim()) {
        e.invoiceTaxOffice = 'Şirket faturasında vergi dairesi zorunludur.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildCheckoutPaymentBody = () => ({
    items: lines.map((l) => ({
      id: l.productId,
      quantity: l.quantity,
      ...(l.variantId ? { variantId: l.variantId } : {}),
    })),
    totalAmount: totals.total,
    fullName: `${address.firstName} ${address.lastName}`.trim(),
    email: address.email.trim(),
    phone: address.phone.replace(/\D/g, ''),
    address: address.addressLine.trim(),
    province: address.city,
    district: address.district,
    couponCode: couponApplied?.code || undefined,
    wantsElectronicInvoice: invoice.wantsElectronicInvoice,
    acceptedCheckoutLegal: termsAccepted === true,
    preInfoSalesVersion: legalCheckout?.preInfoSalesVersion,
    distanceSalesVersion: legalCheckout?.distanceSalesVersion,
    ...(invoice.wantsElectronicInvoice
      ? {
          invoiceTaxNumber: invoice.invoiceTaxNumber.replace(/\D/g, ''),
          invoiceCompanyTitle: invoice.invoiceCompanyTitle.trim(),
          invoiceTaxOffice: invoice.invoiceTaxOffice.trim() || undefined,
        }
      : {}),
  });

  const startHostedCheckout = async () => {
    setOrderSubmitError('');
    if (!legalCheckout?.preInfoSalesVersion || !legalCheckout?.distanceSalesVersion) {
      setOrderSubmitError('Yasal bilgiler yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.');
      return;
    }
    if (!termsAccepted) {
      setErrors({ terms: 'Devam etmek için sözleşmeyi onaylayın.' });
      return;
    }
    setPaytrIframeToken('');
    setCheckoutPayBusy(true);

    const ac = new AbortController();
    const timeoutMs = 45_000;
    const timeoutId = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await apiFetch('/api/payments/create-payment', {
        method: 'POST',
        body: buildCheckoutPaymentBody(),
        signal: ac.signal,
      });
      const data = res?.data || {};

      const pt = typeof data.paytrIframeToken === 'string' ? data.paytrIframeToken.trim() : '';
      if (!pt) {
        throw new Error('PayTR iFrame token alınamadı.');
      }
      setPaytrIframeToken(pt);
    } catch (err) {
      if (isAbortError(err)) {
        setOrderSubmitError(
          'Ödeme sunucusu yanıt vermedi (zaman aşımı). API adresi, veritabanı ve backend çalışıyor mu kontrol edin.',
        );
      } else {
        setOrderSubmitError(err?.message || 'Ödeme başlatılamadı.');
      }
    } finally {
      clearTimeout(timeoutId);
      setCheckoutPayBusy(false);
    }
  };

  useEffect(() => {
    if (!paytrIframeToken) return undefined;
    const src = 'https://www.paytr.com/js/iframeResizer.min.js';
    const attach = () => {
      try {
        if (typeof window.iFrameResize === 'function') {
          window.iFrameResize({}, '#paytriframe');
        }
      } catch {
        /* resizer yoksa bile iframe çalışır */
      }
    };
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      attach();
      return undefined;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = attach;
    document.body.appendChild(s);
    return () => {
      /* script globalde kalır; başka sayfalar da kullanıyor olabilir */
    };
  }, [paytrIframeToken]);

  const nextFromStep1 = () => {
    if (!validateAddress()) return;
    setErrors({});
    setStep(2);
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    setCouponError('');
    if (!code) {
      setCouponError('Kupon kodunu yazın.');
      return;
    }
    setCouponBusy(true);
    try {
      const res = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        skipAuth: true,
        body: { code, cartTotal: subtotal },
      });
      const pct = Number(res?.data?.discountPercent);
      if (!Number.isFinite(pct)) {
        throw new Error('Bu kupon şu an uygulanamıyor.');
      }
      setCouponApplied({ code: res?.data?.code || code, discountPercent: pct });
      setCouponInput('');
    } catch (e) {
      setCouponApplied(null);
      setCouponError(e?.message || 'Kupon doğrulanamadı.');
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponError('');
  };

  if (!hasItems) {
    return <Navigate to="/sepet" replace />;
  }

  const steps = [
    {
      num: 1,
      title: 'Teslimat ve faturalandırma bilgileri',
      icon: MapPin,
    },
    {
      num: 2,
      title: 'Sipariş özeti ve ödeme',
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="border-b border-neutral-100 bg-neutral-50/80 py-8 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Ödeme işlemi</h1>
            <p className="mt-2 text-sm text-neutral-600">Sepetinizde {itemCount} kalem ürün bulunmaktadır.</p>
          </div>
          <Link
            to="/sepet"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Sepete dön
          </Link>
        </div>

        <nav
          aria-label="Ödeme sürecinin adımları"
          className="mb-10 rounded-xl border border-neutral-200 bg-white px-4 py-6 shadow-sm sm:px-6"
        >
          <ol className="grid gap-4 sm:grid-cols-2">
            {steps.map(({ num, title, icon: Icon }) => {
              const reached = step >= num;
              const active = step === num;
              return (
                <li
                  key={num}
                  className={`rounded-xl border-2 px-4 py-4 transition-colors sm:text-center ${
                    active
                      ? 'border-brand bg-brand-muted shadow-sm'
                      : reached
                        ? 'border-neutral-200 bg-white'
                        : 'border-neutral-100 bg-neutral-50/90'
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-3 sm:flex-col sm:items-center">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        active
                          ? 'border-brand bg-brand text-white'
                          : reached
                            ? 'border-brand/40 bg-brand-muted text-brand'
                            : 'border-neutral-200 bg-white text-neutral-400'
                      }`}
                    >
                      {reached && !active ? (
                        <Check className="h-5 w-5" aria-hidden strokeWidth={2} />
                      ) : (
                        num
                      )}
                    </span>
                    <div className="min-w-0 sm:w-full">
                      <div className="mb-2 hidden justify-center sm:flex">
                        <Icon className={`h-4 w-4 ${active ? 'text-brand' : 'text-neutral-400'}`} strokeWidth={1.75} />
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Adım {num}</p>
                      <p className={`mt-0.5 text-sm font-bold ${active ? 'text-asta-navy' : 'text-neutral-900'}`}>
                        {title}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8 space-y-6">
            {/* Adım 1 */}
            {step === 1 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
                <h2 className="flex items-center gap-2 text-lg font-bold text-asta-navy">
                  <MapPin className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                  Sevkiyat adresi
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  Siparişinizin teslim edileceği adres aşağıda beyan olunacaktır. Devam edebilmek için tüm zorunlu alanların
                  doldurulması gerekmektedir.
                </p>
                {provincesError && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {provincesError}{' '}
                    <button
                      type="button"
                      className="font-semibold underline hover:no-underline"
                      onClick={() => {
                        const ac = new AbortController();
                        setProvincesLoading(true);
                        setProvincesError('');
                        fetchProvinces(ac.signal)
                          .then(setProvinces)
                          .catch((err) => {
                            if (err.name !== 'AbortError')
                              setProvincesError(err.message || 'İller yüklenemedi.');
                          })
                          .finally(() => setProvincesLoading(false));
                      }}
                    >
                      Tekrar dene
                    </button>
                  </div>
                )}
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <label htmlFor="co-fn" className="block text-sm font-medium text-neutral-700">
                      Ad <span className="text-brand">*</span>
                    </label>
                    <input
                      id="co-fn"
                      value={address.firstName}
                      onChange={(ev) =>
                        setAddress((a) => ({ ...a, firstName: ev.target.value }))
                      }
                      className={`mt-1.5 ${errors.firstName ? inputErrorClass : inputClass}`}
                    />
                    {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label htmlFor="co-ln" className="block text-sm font-medium text-neutral-700">
                      Soyad <span className="text-brand">*</span>
                    </label>
                    <input
                      id="co-ln"
                      value={address.lastName}
                      onChange={(ev) =>
                        setAddress((a) => ({ ...a, lastName: ev.target.value }))
                      }
                      className={`mt-1.5 ${errors.lastName ? inputErrorClass : inputClass}`}
                    />
                    {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="co-em" className="block text-sm font-medium text-neutral-700">
                      E-posta <span className="text-brand">*</span>
                    </label>
                    <input
                      id="co-em"
                      type="email"
                      name="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="ornek@posta.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'co-em-err' : undefined}
                      value={address.email}
                      onChange={(ev) =>
                        setAddress((a) => ({ ...a, email: ev.target.value }))
                      }
                      className={`mt-1.5 ${errors.email ? inputErrorClass : inputClass}`}
                    />
                    {errors.email && (
                      <p id="co-em-err" className="mt-1 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="co-ph" className="block text-sm font-medium text-neutral-700">
                      Cep telefonu <span className="text-brand">*</span>
                    </label>
                    <input
                      id="co-ph"
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="0 555 555 55 55"
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? 'co-ph-err' : undefined}
                      value={address.phone}
                      onChange={(ev) =>
                        setAddress((a) => ({
                          ...a,
                          phone: formatTRMobileInput(ev.target.value),
                        }))
                      }
                      className={`mt-1.5 font-sans tabular-nums ${errors.phone ? inputErrorClass : inputClass}`}
                    />
                    {errors.phone && (
                      <p id="co-ph-err" className="mt-1 text-xs text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="co-province" className="block text-sm font-medium text-neutral-700">
                      İl <span className="text-brand">*</span>
                    </label>
                    <select
                      id="co-province"
                      value={address.provinceId}
                      disabled={provincesLoading || Boolean(provincesError)}
                      onChange={(ev) => {
                        const id = ev.target.value;
                        const name = provinces.find((p) => String(p.id) === id)?.name ?? '';
                        setAddress((a) => ({ ...a, provinceId: id, city: name, district: '' }));
                        if (errors.province) setErrors((x) => ({ ...x, province: undefined }));
                        if (errors.district) setErrors((x) => ({ ...x, district: undefined }));
                      }}
                      className={`mt-1.5 ${errors.province ? inputErrorClass : inputClass}`}
                    >
                      <option value="">
                        {provincesLoading ? 'İller yükleniyor…' : 'İl seçin'}
                      </option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {errors.province && <p className="mt-1 text-xs text-red-600">{errors.province}</p>}
                  </div>
                  <div>
                    <label htmlFor="co-district" className="block text-sm font-medium text-neutral-700">
                      İlçe <span className="text-brand">*</span>
                    </label>
                    <select
                      id="co-district"
                      value={address.district}
                      disabled={
                        !address.provinceId || districtsLoading || Boolean(districtsError)
                      }
                      onChange={(ev) => {
                        setAddress((a) => ({ ...a, district: ev.target.value }));
                        if (errors.district) setErrors((x) => ({ ...x, district: undefined }));
                      }}
                      className={`mt-1.5 ${errors.district ? inputErrorClass : inputClass}`}
                    >
                      <option value="">
                        {!address.provinceId
                          ? 'Önce il seçin'
                          : districtsLoading
                            ? 'İlçeler yükleniyor…'
                            : 'İlçe seçin'}
                      </option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {districtsError && (
                      <p className="mt-1 text-xs text-amber-800">{districtsError}</p>
                    )}
                    {errors.district && (
                      <p className="mt-1 text-xs text-red-600">{errors.district}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="co-ad" className="block text-sm font-medium text-neutral-700">
                      Açık adres <span className="text-brand">*</span>
                    </label>
                    <textarea
                      id="co-ad"
                      rows={4}
                      value={address.addressLine}
                      onChange={(ev) =>
                        setAddress((a) => ({ ...a, addressLine: ev.target.value }))
                      }
                      className={`mt-1.5 resize-y min-h-[100px] ${errors.addressLine ? inputErrorClass : inputClass}`}
                      placeholder="Mahalle, sokak, bina no, daire…"
                    />
                    {errors.addressLine && (
                      <p className="mt-1 text-xs text-red-600">{errors.addressLine}</p>
                    )}
                  </div>
                </div>

                <div className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50/80 p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-asta-navy">
                    <FileText className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                    Fatura bilgisi
                  </h3>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg bg-white px-4 py-3 ring-1 ring-neutral-200/80">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-neutral-300 text-brand focus:ring-brand"
                      checked={invoice.wantsElectronicInvoice}
                      onChange={(ev) =>
                        setInvoice((i) => ({ ...i, wantsElectronicInvoice: ev.target.checked }))
                      }
                    />
                    <span className="text-sm font-medium leading-snug text-neutral-800">
                      Kurumsal / vergi kimlikli fatura istiyorum
                      <span className="block text-xs font-normal text-neutral-500">
                        İşaretlerseniz VKN/TCKN, ünvan ve gerekiyorsa vergi dairesi girmeniz gerekir.
                      </span>
                    </span>
                  </label>
                  {invoice.wantsElectronicInvoice && (
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="co-inv-tax" className="block text-sm font-medium text-neutral-700">
                          VKN / TCKN <span className="text-brand">*</span>
                        </label>
                        <input
                          id="co-inv-tax"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="10 veya 11 haneli kimlik numarası"
                          value={invoice.invoiceTaxNumber}
                          onChange={(ev) =>
                            setInvoice((inv) => ({
                              ...inv,
                              invoiceTaxNumber: ev.target.value.replace(/\D/g, '').slice(0, 11),
                            }))
                          }
                          className={`mt-1.5 tabular-nums ${errors.invoiceTaxNumber ? inputErrorClass : inputClass}`}
                        />
                        {errors.invoiceTaxNumber && (
                          <p className="mt-1 text-xs text-red-600">{errors.invoiceTaxNumber}</p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="co-inv-title" className="block text-sm font-medium text-neutral-700">
                          Ünvan / fatura üzerinde yazacak unvan{' '}
                          <span className="text-brand">*</span>
                        </label>
                        <input
                          id="co-inv-title"
                          value={invoice.invoiceCompanyTitle}
                          onChange={(ev) =>
                            setInvoice((inv) => ({ ...inv, invoiceCompanyTitle: ev.target.value }))
                          }
                          className={`mt-1.5 ${errors.invoiceCompanyTitle ? inputErrorClass : inputClass}`}
                          placeholder="Ticaret unvanı veya tam adınız"
                        />
                        {errors.invoiceCompanyTitle && (
                          <p className="mt-1 text-xs text-red-600">{errors.invoiceCompanyTitle}</p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="co-inv-office" className="block text-sm font-medium text-neutral-700">
                          Vergi dairesi{' '}
                          {invoice.invoiceTaxNumber.replace(/\D/g, '').length === 10 ? (
                            <span className="text-brand">*</span>
                          ) : (
                            <span className="text-xs font-normal text-neutral-500">(isteğe bağlı)</span>
                          )}
                        </label>
                        <input
                          id="co-inv-office"
                          value={invoice.invoiceTaxOffice}
                          onChange={(ev) =>
                            setInvoice((inv) => ({ ...inv, invoiceTaxOffice: ev.target.value }))
                          }
                          className={`mt-1.5 ${errors.invoiceTaxOffice ? inputErrorClass : inputClass}`}
                          placeholder={
                            invoice.invoiceTaxNumber.replace(/\D/g, '').length === 10
                              ? 'İlgili vergi dairesi'
                              : 'Sadece VKN için zorunludur'
                          }
                        />
                        {errors.invoiceTaxOffice && (
                          <p className="mt-1 text-xs text-red-600">{errors.invoiceTaxOffice}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Link
                    to="/sepet"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-6 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    İptal
                  </Link>
                  <button
                    type="button"
                    onClick={nextFromStep1}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-8 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
                  >
                    Ödeme adımına geç <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {/* Adım 2 — özet ve ödeme */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-asta-navy">
                    <Package className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                    Sipariş özeti ve ödemenin tamamlanması
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    Ödemeniz,{' '}
                    <strong className="font-semibold text-neutral-800">PayTR</strong>{' '}
                    tarafından sunulan güvenli ödeme ekranı üzerinden tamamlanır. Kart bilgileriniz ödeme
                    sağlayıcısı altyapısında işlenir; tarafımızca saklanmaz.
                  </p>

                  <div className="mt-8 grid gap-6 lg:grid-cols-2">  
                    <div className="rounded-lg border border-neutral-100 bg-neutral-50/90 p-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-brand">Sipariş adres özeti</p>
                      <p className="mt-3 text-sm font-semibold text-neutral-900">
                        {address.firstName} {address.lastName}
                      </p>
                      <p className="mt-2 text-sm text-neutral-600">{address.phone}</p>
                      <p className="mt-1 text-sm text-neutral-600">{address.email}</p>
                      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                        {address.addressLine}
                        <br />
                        {address.district} / {address.city}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-100 bg-neutral-50/90 p-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-brand">Ödeme tutarı</p>
                      <div className="mt-3 flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-brand" strokeWidth={1.75} />
                        <div>
                          <p className="text-sm leading-relaxed text-neutral-700">
                            Siparişe ilişkin ödenmesi gereken tutar:{' '}
                            <span className="font-bold tabular-nums text-brand">{formatTRY(totals.total)}</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg border border-dashed border-brand/30 bg-brand/5 p-4 text-sm leading-relaxed text-neutral-700">
                    <strong className="text-asta-navy">Fatura seçimi özeti</strong>
                    {invoice.wantsElectronicInvoice ? (
                      <>
                        {' — '}
                        Kurumsal: {invoice.invoiceCompanyTitle.trim() || '—'} ({invoice.invoiceTaxNumber.replace(/\D/g, '') || '…'})
                      </>
                    ) : (
                      <> — Bireysel alım; ticari kimlik bildirimi işaretlenmemiştir.</>
                    )}
                  </div>

                  <div className="mt-10 border-t border-neutral-100 pt-8">
                    <h3 className="text-base font-bold text-neutral-900">Ürünler</h3>
                    <ul className="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-100 bg-white">
                      {lines.map((line) => (
                        <li
                          key={line.lineId}
                          className="flex flex-wrap gap-4 px-4 py-4 text-sm sm:items-center"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-neutral-50">
                            <img
                              src={line.image}
                              alt={line.name}
                              className="h-full w-full object-contain p-2"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug text-asta-navy">{line.name}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                              Birim {formatTRY(line.price)} × {line.quantity}
                            </p>
                          </div>
                          <p className="w-full text-right font-bold tabular-nums text-neutral-900 sm:w-auto">
                            {formatTRY(line.price * line.quantity)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {orderSubmitError && (
                    <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                      {orderSubmitError}
                    </div>
                  )}

                  <div className="mt-8">
                    <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-4">
                      <input
                        id="co-terms"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(ev) => {
                          setTermsAccepted(ev.target.checked);
                          if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-brand accent-[#9f2133] focus:ring-brand"
                      />
                      <label htmlFor="co-terms" className="text-sm leading-relaxed text-neutral-700">
                        <span className="text-brand">*</span>{' '}
                        <Link
                          to="/yasal/on-bilgilendirme"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand hover:text-brand-hover"
                        >
                          Ön Bilgilendirme Koşulları
                        </Link>{' '}
                        ve{' '}
                        <Link
                          to="/yasal/mesafeli-satis"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand hover:text-brand-hover"
                        >
                          Mesafeli Satış Sözleşmesi
                        </Link>
                        ’ni okudum, onaylıyorum.
                      </label>
                    </div>
                    {errors.terms && (
                      <p className="mt-2 text-xs font-medium text-red-600">{errors.terms}</p>
                    )}
                  </div>

                  {paytrIframeToken ? (
                    <div className="mt-8 rounded-xl border border-brand/25 bg-neutral-50/90 p-4 sm:p-6">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand">PayTR ile ödeme</p>
                      <p className="mt-2 text-xs text-neutral-600">
                        Siparişiniz kesin olarak yalnızca ödeme sağlayıcısından bildirim geldikten sonra onaylanır;
                        işlem sonrası yönlendirme yalnızca bilgilendirme amaçlıdır.
                      </p>
                      <iframe
                        title="PayTR ödeme"
                        src={`https://www.paytr.com/odeme/guvenli/${paytrIframeToken}`}
                        id="paytriframe"
                        frameBorder="0"
                        scrolling="no"
                        className="mt-6 min-h-[520px] w-full rounded-md border border-neutral-200 bg-white"
                      />
                    </div>
                  ) : null}

                  <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setErrors({});
                        setStep(1);
                        setPaytrIframeToken('');
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 px-6 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                      Teslimat ve faturalandırma adımına geri dönün
                    </button>
                    {!paytrIframeToken ? (
                      <button
                        type="button"
                        disabled={checkoutPayBusy || !legalCheckout?.preInfoSalesVersion}
                        onClick={() => startHostedCheckout()}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-8 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-400"
                      >
                        {checkoutPayBusy
                          ? 'Hazırlanıyor…'
                          : !legalCheckout?.preInfoSalesVersion
                            ? 'Yasal metinler yükleniyor…'
                            : 'Güvenli ödeme ekranına geç'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sağ özeti — sürekli görünür */}
          <aside className="lg:col-span-4 lg:sticky lg:top-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-asta-navy">Sipariş tutar özeti</h2>

              <div className="mt-6 rounded-lg border border-brand/20 bg-brand-muted/40 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-asta-navy">
                  <TicketPercent className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  İndirim kuponu
                </h3>
                {!couponApplied ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      value={couponInput}
                      onChange={(ev) => {
                        setCouponInput(ev.target.value);
                        if (couponError) setCouponError('');
                      }}
                      placeholder="Kupon kodu"
                      className={couponError ? inputErrorClass : inputClass}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponBusy}
                      className="w-full rounded-md bg-asta-navy py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:bg-neutral-400"
                    >
                      {couponBusy ? 'Deneniyor…' : 'Uygula'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-brand/30 bg-white px-3 py-2.5">
                    <span className="text-xs font-bold text-brand">{couponApplied.code}</span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[11px] font-semibold text-neutral-600 underline underline-offset-2 hover:text-brand"
                    >
                      Kaldır
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="mt-2 text-[11px] font-medium text-red-600">{couponError}</p>
                )}
              </div>

              <dl className="mt-6 space-y-3 border-t border-neutral-100 pt-6 text-sm">
                <div className="flex justify-between gap-3 text-neutral-600">
                  <dt>Ara toplam ({itemCount} ürün)</dt>
                  <dd className="tabular-nums font-semibold text-neutral-900">{formatTRY(subtotal)}</dd>
                </div>
                {couponApplied && (
                  <div className="flex justify-between gap-3 text-brand">
                    <dt>
                      Kupon{' '}
                      <span className="ml-1 text-xs font-normal text-neutral-500">
                        ({couponApplied.code},{' '}
                        <span className="tabular-nums">%{couponApplied.discountPercent}</span>)
                      </span>
                    </dt>
                    <dd className="text-right font-semibold">
                      <span className="tabular-nums">−{formatTRY(totals.discountAmount)}</span>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 text-neutral-600">
                  <dt>Kargo</dt>
                  <dd className="text-right font-medium text-neutral-900">
                    {totals.shipping === 0 ? (
                      <span className="text-brand">Ücretsiz</span>
                    ) : (
                      <span className="tabular-nums">{formatTRY(totals.shipping)}</span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-neutral-100 pt-5">
                <div className="flex justify-between gap-4 text-base font-bold text-asta-navy">
                  <span>Ödenmesi gereken</span>
                  <span className="tabular-nums">{formatTRY(totals.total)}</span>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {showFreeShippingPanel ? (
                  <FreeShippingProgress
                    threshold={freeShipThreshold}
                    qualifiedAmount={totals.afterDisc}
                    paysShippingCharge={paysShippingCharge}
                    freeShippingEnabled={freeShipOn}
                    shippingFeeEnabled={shippingFeeOn}
                  />
                ) : null}
                <p className="text-xs leading-relaxed text-neutral-500">Gösterilen tutarlar KDV dahildir.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
