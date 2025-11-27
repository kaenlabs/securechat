# 🚀 SecureChat - GitHub Upload & Android Test Guide

## Step 1: Create GitHub Repository

1. **Go to GitHub**: https://github.com/kaenlabs
2. **Click** "New Repository" (yeşil buton)
3. **Repository name**: `securechat` veya `securechat-e2ee`
4. **Description**: `End-to-end encrypted messaging app with React Native and Node.js`
5. **Visibility**: Public (veya Private istersen)
6. **DON'T check**: "Initialize with README" (zaten bizde var)
7. **Click** "Create repository"

## Step 2: Push to GitHub

GitHub sana komutlar gösterecek, ama bizimki hazır. Sadece şunu çalıştır:

```bash
cd c:\Users\HP\Documents\chattt

# Add remote (GitHub'dan aldığın URL'i buraya koy)
git remote add origin https://github.com/kaenlabs/securechat.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Not**: GitHub ilk kez kullanıyorsan, authentication soracak:
- **Token kullan**: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)
- **Scopes**: `repo` seçili olsun
- Token'i kaydet (bir daha göremezsin!)
- Username yerine token'i kullan

## Step 3: Setup for Android Phone Test

### A) Mobile API Configuration

Bilgisayarının local IP adresini bul:

```bash
ipconfig
```

**Wireless LAN adapter** kısmında **IPv4 Address** yaz (örn: `192.168.1.100`)

Sonra mobile uygulamayı güncelle:

```bash
cd mobile
```

`src/config/api.ts` dosyasını aç ve değiştir:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://192.168.1.100:3000',  // ← Buraya senin IP'ni yaz
  TIMEOUT: 10000,
};
```

### B) Firewall Configuration

Windows Firewall'da port 3000'i aç:

```powershell
# PowerShell'i Administrator olarak çalıştır
New-NetFirewallRule -DisplayName "SecureChat Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### C) MongoDB & Backend

MongoDB'nin çalıştığından emin ol:

```bash
# Terminal 1: MongoDB kontrolü
mongosh --eval "db.version()"

# Terminal 2: Backend'i başlat
cd backend
npm run dev
```

Backend çalışıyor mu kontrol et:
- Tarayıcıdan aç: `http://localhost:3000/auth/me` (401 dönmeli - bu normal)

### D) Mobile App - Expo Setup

```bash
cd mobile
npm start
```

**Seçenekler:**
- `a` - Android Emulator (varsa)
- QR kod - **Telefonda Expo Go** ile tara

## Step 4: Android Phone Setup

### 1. Expo Go Kurulumu
- **Play Store'dan indir**: "Expo Go"
- Aç ve giriş yap (opsiyonel)

### 2. WiFi Kontrolü
⚠️ **ÖNEMLİ**: Telefon ve bilgisayar **aynı WiFi ağında** olmalı!

```
Bilgisayar WiFi: "EvWiFi"
Telefon WiFi: "EvWiFi"  ← Aynı olmalı!
```

### 3. QR Kodu Tara
- Terminal'de QR kod görünecek
- Expo Go → "Scan QR code"
- QR'ı tara
- Uygulama telefonunda açılacak! 🎉

### 4. Test Et!

**User 1 (Telefon):**
```
1. Aç → Register
2. Username: "alice"
3. Password: "password123"
4. Register → Keys oluşturuluyor... ✅
5. Home ekranı açılacak
```

**User 2 (Browser/Emulator):**
```
1. npm start → w (web)
2. Register: "bob" / "password456"
```

**Mesajlaşma Testi:**
```
1. Alice (Telefon): Search → "bob" yaz → Chat
2. Mesaj gönder: "Hello from phone! 🔐"
3. Bob (Web): Home → Alice ile conversation görünecek
4. Aç → Şifreli mesaj çözülecek! ✅
```

## Step 5: Troubleshooting

### Telefon bağlanamıyor?

**1. IP adresini kontrol et:**
```bash
ipconfig  # Doğru IP'yi aldın mı?
```

**2. Mobile config kontrol:**
```typescript
// mobile/src/config/api.ts
BASE_URL: 'http://192.168.1.100:3000'  // localhost DEĞIL!
```

**3. Backend erişilebilir mi?**
Telefon browser'dan aç: `http://192.168.1.100:3000/auth/me`
- Eğer açılıyorsa → ✅ Backend çalışıyor
- Eğer açılmıyorsa → ❌ Firewall/IP problemi

**4. Firewall tekrar kontrol:**
```powershell
Get-NetFirewallRule -DisplayName "SecureChat Backend"
```

**5. Aynı WiFi'de mi?**
```
Telefon: Ayarlar → WiFi → Ağ adı?
Bilgisayar: ipconfig → Connection-specific DNS Suffix?
```

### Metro Bundler Hataları

```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
npm start -- --clear
```

### Keys Oluşturulmuyor?

Console'da hata var mı kontrol et:
- Expo Go → Shake phone → "Debug Remote JS"
- Chrome DevTools açılacak

## Step 6: Demo Preparation

Güzel demo için:

**1. Reset Database (temiz başlangıç):**
```bash
mongosh
use securechat
db.dropDatabase()
```

**2. Test Accounts Oluştur:**
- Alice (Telefon)
- Bob (Web/Emulator)
- Carol (İkinci telefon varsa)

**3. Demo Senaryosu:**
```
1. Alice registers (keypair generation animasyonu)
2. Bob registers
3. Alice searches Bob
4. Alice → Bob: "Hi! This is E2EE 🔐"
5. Bob receives (decryption görünür)
6. Bob replies: "Encrypted! 🎉"
7. MongoDB'de kontrol: db.messages.find() → sadece ciphertext! ✅
```

## GitHub Repository İçeriği

Repo'da şunlar olacak:
```
securechat/
├── .github/workflows/ci.yml  ← GitHub Actions CI
├── backend/                   ← Node.js API
├── mobile/                    ← React Native App
├── README.md                  ← Main documentation
├── QUICKSTART.md             ← 5-minute guide
├── TESTING_GUIDE.md          ← Comprehensive testing
└── PROJECT_SUMMARY.md        ← Achievement summary
```

## Useful Commands

```bash
# Backend status
cd backend && npm run dev

# Mobile reload
cd mobile && npm start -- --clear

# MongoDB status
mongosh --eval "db.version()"

# Check ports
netstat -ano | findstr :3000

# Git status
git status
git log --oneline

# Push updates
git add .
git commit -m "Update mobile config for Android"
git push
```

## Security Checklist Before Public Release

- [ ] Change JWT_SECRET in .env
- [ ] Use environment variables for API URLs
- [ ] Enable HTTPS for production
- [ ] Add rate limiting
- [ ] Security audit
- [ ] Add error monitoring (Sentry)

## Next Steps

1. ✅ Push to GitHub
2. ✅ Test on Android phone
3. 📱 Build APK (optional): `eas build --platform android`
4. 🍎 Test on iOS (if Mac available)
5. 🚀 Deploy backend to cloud (Heroku, Railway, DigitalOcean)
6. 📦 Publish to Play Store (optional)

---

**Need Help?**
- GitHub: https://github.com/kaenlabs/securechat/issues
- Expo Docs: https://docs.expo.dev
- React Native: https://reactnative.dev

Good luck! 🚀🔐
