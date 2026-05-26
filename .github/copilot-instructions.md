<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Purity Skincare - E-Ticaret Arayüzü Geliştirme Projesine Hoşgeldin

Bu proje, modern bir cilt bakımı markası için geliştirilmiş React.js tabanlı e-ticaret arayüzüdür.

### 🎯 Proje Özellikleri

- **Framework**: React 18.2.0 + Vite
- **Styling**: Tailwind CSS 3.3.6
- **Animations**: Framer Motion 10.16.16
- **Icons**: Lucide-React 0.294.0
- **CSS Processor**: PostCSS + Autoprefixer

### 📚 Bileşen Mimarisi

```
src/
├── components/
│   ├── Navbar.jsx          - Floating island navbar
│   ├── Hero.jsx            - Banner slider (3 slide)
│   ├── FeatureCards.jsx    - Scroll-triggered özellik kartları
│   ├── Products.jsx        - Kategori filtreleme ile ürün sekmesi
│   ├── ProductCard.jsx     - Reusable ürün kartı
│   └── Footer.jsx          - Newsletter + sosyal linkler
├── App.jsx                 - Ana container
├── index.css               - Tailwind imports
└── main.jsx                - React entry point
```

### 🎨 Tasarım Sistemi

**Renk Paleti:**
- `cream` (#FAF8F5) - Ana arka plan
- `sage` (#C7D4A8) - Başlıca CTA & vurgular
- `blush` (#F5E6E3) - Açık vurgular
- `dusty` (#D4C4C0) - İkincil tonlar
- `soft` (#E8DDD8) - Tercih edilen arkaplanlar

**Typography:**
- Font Family: Inter (Google Fonts)
- Font Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Spacing & Layout:**
- Grid: 3 sütun (lg), 2 sütun (md), 1 sütun (mobile)
- Gap: Consistent 6-8 spacing
- Container: max-w-7xl (1280px)

### ⚙️ Teknik Yönergeler

1. **State Management**: React hooks (useState, useEffect, useRef)
2. **Animations**: Framer Motion (motion.* components)
3. **Responsiveness**: Tailwind breakpoints (sm, md, lg, xl)
4. **Performance**: Lazy loading, IntersectionObserver, memoization
5. **Code Style**: Modular, functional components, kebab-case exports

### 🔄 Bileşen Geliştirme Standartları

- Her bileşen ayrı dosyada olmalı
- Props drilling yerine context + hooks tercih et
- Animation delays: index-based ve staggered
- Mobile-first responsive design
- Accessibility: proper semantic HTML, ARIA labels

### 🚀 Başlangıç

```bash
npm install      # Bağımlılıkları yükle
npm run dev      # Development sunucusunu başlat (http://localhost:3000)
npm run build    # Production build oluştur
```

### 📝 Yaygın Görevler

- **Yeni bileşen eklemek**: components/ klasörüne JSX dosyası ekle
- **Stil ayarlamak**: component'in className'ini Tailwind'le güncelle
- **Animasyon eklemek**: motion.* wrapper'ları kullan
- **Responsive yapmak**: Tailwind breakpoint prefixes (md:, lg:, etc.)

### ✅ Kod Kalitesi

- ESLint kuralları: React best practices
- Formatting: Consistent indentation (2 spaces)
- Naming: camelCase (JS), kebab-case (CSS classes)
- Comments: Karmaşık logic için açıklayıcı yorumlar

### 🐛 Debugging Tips

- React DevTools: https://react-devtools-tutorial.vercel.app/
- Framer Motion: `whileInView` props'ları console'da kontrol et
- Tailwind: Browser DevTools > Inspect > Classes
- Performance: Profiler tab'ında rerender'ları izle

---

**Sorular & Desteği:** Proje yapısı, bileşen tasarımı veya Tailwind/Framer Motion hakkında yardıma ihtiyacın varsa sor!
