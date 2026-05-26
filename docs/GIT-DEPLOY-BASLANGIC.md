# Git + GitHub ile deploy (sıfırdan)

Bu rehber, projeyi zip atmadan **GitHub üzerinden** sunucuya güncellemek içindir.

---

## 0) Önemli kurallar

- **`backend/.env` asla GitHub’a gitmez** (şifreler, PayTR, SMTP). Sunucuda ayrı durur.
- **`node_modules` gitmez** — sunucuda `npm install` ile kurulur.
- İlk kurulumda sunucuya `.env` dosyasını **elle** kopyalarsınız veya zaten vardır.

---

## 1) Bilgisayarınıza Git kurun

1. https://git-scm.com/download/win  
2. Kurulumda varsayılanları kabul edin (“Git Bash” da gelir).

Kontrol (PowerShell veya Git Bash):

```bash
git --version
```

---

## 2) Git’e kim olduğunuzu söyleyin (bir kez)

```bash
git config --global user.name "Adınız Soyadınız"
git config --global user.email "github@emailiniz.com"
```

GitHub hesabınızdaki e-posta ile aynı olsun.

---

## 3) GitHub’da boş depo (repository) açın

1. https://github.com → giriş  
2. **New repository**  
3. İsim örnek: `asta-ecommerce`  
4. **Private** seçin (önerilir)  
5. “Add README” işaretlemeyin (projede zaten dosya var)  
6. **Create repository**

Sayfada `https://github.com/KULLANICI/asta-ecommerce.git` gibi bir adres görürsünüz — bunu not edin.

---

## 4) Projeyi bilgisayarda Git’e bağlayın (bir kez)

PowerShell’de proje klasörüne gidin:

```powershell
cd "C:\Users\alpar\OneDrive\Masaüstü\Site - Kopya"
```

Git yoksa başlatın:

```powershell
git init
git branch -M main
```

Tüm dosyaları ekleyin (`.gitignore` `.env` ve `node_modules`’u zaten dışlar):

```powershell
git add .
git status
```

İlk commit:

```powershell
git commit -m "İlk commit: mağaza + backend"
```

GitHub’a bağlayın (`KULLANICI` ve `REPO` kendi adınız):

```powershell
git remote add origin https://github.com/KULLANICI/REPO.git
git push -u origin main
```

İlk `push`’ta GitHub kullanıcı adı + şifre istenir.  
Şifre yerine **Personal Access Token (PAT)** kullanmanız gerekir (aşağıda).

---

## 5) GitHub şifresi yerine Token (PAT)

GitHub artık hesap şifresi ile `git push` kabul etmez.

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**  
2. **Generate new token (classic)**  
3. `repo` kutusunu işaretleyin  
4. Oluşan token’ı kopyalayın (bir daha gösterilmez)  
5. `git push` şifre sorunca **token’ı yapıştırın**

---

## 6) Sunucuda (aaPanel) — bir kez kurulum

Terminal (root veya site kullanıcısı):

```bash
# Git yoksa
apt update && apt install -y git

cd /www/wwwroot/astaticaret.com
```

Eğer klasörde eski zip dosyaları varsa, yedek alıp temiz bir clone da yapabilirsiniz:

```bash
cd /www/wwwroot
mv astaticaret.com astaticaret.com.bak-$(date +%Y%m%d)
git clone https://github.com/KULLANICI/REPO.git astaticaret.com
cd astaticaret.com
```

**`.env` sunucuda kalmalı:** Eski yedekten kopyalayın:

```bash
cp /www/wwwroot/astaticaret.com.bak-XXXX/backend/.env /www/wwwroot/astaticaret.com/backend/.env
```

Bağımlılıklar:

```bash
cd /www/wwwroot/astaticaret.com
npm install
npm run build

cd backend
npm install --production
```

PM2 (PATH için aaPanel Node):

```bash
export PATH="/www/server/nodejs/v20.15.0/bin:$PATH"
pm2 start server.js --name astaticaret-api
pm2 save
```

`~/.bashrc` içine aynı `export PATH=...` satırını ekleyin.

---

## 7) Her güncelleme (günlük iş akışı)

### Bilgisayarınızda

```powershell
cd "C:\Users\alpar\OneDrive\Masaüstü\Site - Kopya"

# Değişiklikleri kaydet
git add .
git commit -m "PayTR düzeltmesi, mail şablonları"
git push
```

İsterseniz önce frontend build (sunucuda da build edebilirsiniz):

```powershell
npm run build
git add dist
git commit -m "Production build"
git push
```

> `dist` repoda tutulabilir veya sunucuda `npm run build` — ikisinden birini seçin. Başlangıç için PC’de build + push `dist` daha basittir.

### Sunucuda

```bash
export PATH="/www/server/nodejs/v20.15.0/bin:$PATH"
cd /www/wwwroot/astaticaret.com

git pull

# Frontend (dist repoda yoksa)
npm run build

# Backend bağımlılık değiştiyse
cd backend && npm install --production && cd ..

pm2 restart astaticaret-api --update-env
```

Tek satır script: `bash scripts/deploy-on-server.sh` (projede var).

---

## 8) Sık sorular

**`git push` reddedildi**  
→ Token süresi dolmuş veya `repo` yetkisi yok; yeni PAT üretin.

**Sunucuda `git pull` şifre istiyor**  
→ Private repo için sunucuda da PAT kullanın veya SSH key tanımlayın (ileri seviye).

**`.env` yanlışlıkla commit oldu**  
→ Hemen GitHub’dan silin, şifreleri değiştirin; `.gitignore` zaten `.env` içeriyor.

**Conflict (çakışma)**  
→ Sunucuda elle dosya değiştirdiyseniz: `git stash` veya değişiklikleri yedekleyip `git pull` tekrar deneyin.

---

## 9) Özet akış

```
[PC] kod değiştir → git add → git commit → git push
         ↓
[GitHub] depo güncellenir
         ↓
[Sunucu] git pull → (build) → pm2 restart
```

Zip yok; sadece değişen dosyalar iner — çok daha hızlı.
