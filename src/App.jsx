import { BrowserRouter, Navigate, Route, Routes, Outlet, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx';
import Navbar from './components/Navbar.jsx';
import CookieConsentBanner from './components/CookieConsentBanner.jsx';
import CartToast from './components/CartToast.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import WhatsAppFloat from './components/WhatsAppFloat.jsx';
import HomePage from './pages/HomePage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx';
import PaymentFailurePage from './pages/PaymentFailurePage.jsx';
import LegalDocumentPage from './pages/LegalDocumentPage.jsx';
import NewsletterActionPage from './pages/NewsletterActionPage.jsx';
import AccountLayout from './pages/account/AccountLayout.jsx';
import AccountProfilePage from './pages/account/AccountProfilePage.jsx';
import MyOrdersPage from './pages/account/MyOrdersPage.jsx';
import RequireAdmin from './admin/RequireAdmin.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import { apiFetch } from './api/client.js';
import { useAuth } from './context/AuthContext.jsx';
import SiteBranding from './components/SiteBranding.jsx';
import StorefrontSeo from './components/StorefrontSeo.jsx';

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminDashboardV2Page = lazy(() => import('./pages/admin/AdminDashboardV2Page.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage.jsx'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage.jsx'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage.jsx'));
const AdminSystemPage = lazy(() => import('./pages/admin/AdminSystemPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const AdminProductReviewsPage = lazy(() => import('./pages/admin/AdminProductReviewsPage.jsx'));
const AdminProductQuestionsPage = lazy(() => import('./pages/admin/AdminProductQuestionsPage.jsx'));

function AdminRouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
      Panel yükleniyor…
    </div>
  );
}

function AdminSystemSectionRedirect() {
  return <Navigate to="/admin/sistem/kategoriler" replace />;
}

function StorefrontShell() {
  const { user } = useAuth();
  const location = useLocation();
  /** @type {[null | { settings: Record<string, unknown>; active: boolean; message: string }, Function]} */
  const [boot, setBoot] = useState({
    settings: {},
    active: false,
    message: '',
    loaded: false,
  });

  useEffect(() => {
    apiFetch('/api/settings', { skipAuth: true })
      .then((res) => {
        const s = res?.data?.settings ?? {};
        const active = Boolean(s.maintenanceMode === true || s.maintenanceMode === 'true');
        setBoot({
          settings: s,
          active,
          message: typeof s.maintenanceMessage === 'string' ? s.maintenanceMessage : '',
          loaded: true,
        });
      })
      .catch(() =>
        setBoot({ settings: {}, active: false, message: '', loaded: true }),
      );
  }, []);

  const maint = boot;
  const isAdmin = user?.role === 'admin';
  const path = location.pathname;
  /** Bakım sırasında sade ana sayfa navbar’sız görünüm — giriş / kayıt / şifre akışları */
  const storefrontAuthBypass =
    path === '/giris' ||
    path === '/uye-ol' ||
    path === '/sifre-unuttum' ||
    path.startsWith('/sifre-sifirla/');

  if (maint.loaded && maint.active && !isAdmin) {
    if (storefrontAuthBypass) {
      return (
        <div className="min-h-screen bg-neutral-100 font-sans text-neutral-900 antialiased">
          <Outlet />
        </div>
      );
    }
    const displayMsg =
      (maint.message && String(maint.message).trim()) ||
      'Sitemiz kısa süreliğine bakımda. Çok yakında geri döneceğiz.';
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-asta-navy via-asta-navy to-neutral-900 px-6 py-16 text-center antialiased">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-10 shadow-xl backdrop-blur-sm">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Bakımdayız</h1>
          <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{displayMsg}</p>
        </div>
        <Link
          to="/giris"
          className="rounded-xl border border-white/25 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Yönetici girişi
        </Link>
      </div>
    );
  }

  return (
    <SiteSettingsProvider value={maint.settings}>
      <StorefrontSeo />
      <div className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
        <Navbar />
        <Outlet />
        <CookieConsentBanner />
        <CartToast />
        <SiteFooter />
        <WhatsAppFloat />
      </div>
    </SiteSettingsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteBranding />
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="ozet-v2"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminDashboardV2Page />
                  </Suspense>
                }
              />
              <Route
                path="siparisler"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminOrdersPage />
                  </Suspense>
                }
              />
              <Route
                path="urunler"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminProductsPage />
                  </Suspense>
                }
              />
              <Route
                path="kuponlar"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminCouponsPage />
                  </Suspense>
                }
              />
              <Route
                path="yorumlar"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminProductReviewsPage />
                  </Suspense>
                }
              />
              <Route
                path="sorular"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminProductQuestionsPage />
                  </Suspense>
                }
              />
              <Route
                path="kullanicilar"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminUsersPage />
                  </Suspense>
                }
              />
              <Route path="sistem" element={<AdminSystemSectionRedirect />} />
              <Route
                path="sistem/:bolum"
                element={
                  <Suspense fallback={<AdminRouteFallback />}>
                    <AdminSystemPage />
                  </Suspense>
                }
              />
              <Route path="ayarlar" element={<Navigate to="/admin/sistem/kategoriler" replace />} />
            </Route>

            <Route element={<StorefrontShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/urunler" element={<ProductsPage />} />
              <Route path="/urun/p/:productId" element={<ProductDetailPage />} />
              <Route path="/urun/:slug" element={<ProductDetailPage />} />
              <Route path="/hakkimizda" element={<AboutPage />} />
              <Route path="/iletisim" element={<ContactPage />} />
              <Route path="/giris" element={<LoginPage />} />
              <Route path="/sifre-unuttum" element={<ForgotPasswordPage />} />
              <Route path="/sifre-sifirla/:token" element={<ResetPasswordPage />} />
              <Route path="/uye-ol" element={<RegisterPage />} />
              <Route path="/sepet" element={<CartPage />} />
              <Route path="/odeme" element={<CheckoutPage />} />
              <Route path="/odeme/basarili" element={<PaymentSuccessPage />} />
              <Route path="/odeme/hatali" element={<PaymentFailurePage />} />
              <Route path="/hesabim" element={<AccountLayout />}>
                <Route index element={<AccountProfilePage />} />
                <Route path="siparisler" element={<MyOrdersPage />} />
              </Route>
              <Route path="/yasal/:slug" element={<LegalDocumentPage />} />
              <Route path="/abonelik-onayi/:token" element={<NewsletterActionPage mode="confirm" />} />
              <Route path="/abonelikten-cik/:token" element={<NewsletterActionPage mode="unsubscribe" />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
