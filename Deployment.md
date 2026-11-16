# TatildeBugun - Dağıtım ve Canlıya Çıkış Rehberi (Deployment.md)

Bu dokümanda projenin derleme (build), yayınlama (release), altyapı dağıtım (deployment) ve canlı ortam (production/staging) süreçleri yer alır.

---

## 1. Temel Dağıtım Kuralı
> [!IMPORTANT]
> **DAĞITIM (DEPLOYMENT) KURALI:**
> Canlı ortama (Production) veya ara ortamlara (Staging/Test) dağıtım **KESİNLİKLE otomatik olarak yapılmayacaktır**.
> Tüm dağıtım ve bulut altyapı güncellemeleri yalnızca kullanıcının **açık komutu ve onayı** ile yürütülecektir.

---

## 2. Altyapı ve Dağıtım Ortamı
- **Bulut Sağlayıcı:** Google Cloud Platform (GCP)
- **GCP Projesi:** `dernektebugun-492221`
- **Cloud Run Servisi:** `tatilde-bugun`
- **Bölge (Region):** `europe-west1`
- **Canlı Özel Alan Adı (Custom Domain):** `tatilde.bugunai.com`
- **DNS Eşlemesi (Domain Mapping):** `tatilde` ➔ `ghs.googlehosted.com.` (CNAME kaydı)
- **Veritabanı (Cloud SQL):** `Dernek-db-v2` (`34.38.207.47:5432`), PostgreSQL `tatilde-bugun`
- **E-posta Altyapısı:** Resend (`admin@bugunai.com`)

---

## 3. Dağıtım Öncesi Kontrol Listesi (Pre-Deployment Checklist)
1. [x] **Kalite Kapısı (Pre-Deploy Quality Gate):** `npx tsc --noEmit` 0 hata; `npm run build` 13.7s ile 0 hata (Tamamlandı).
2. [x] **Güvenlik Taraması:** `Security.md` ve `Access.md` kurallarına uygunluk, sıfır PII loglama (Tamamlandı).
3. [x] **Konfigürasyon & .env.example:** Canlı URL'ler (`https://tatilde.bugunai.com`) şablonlandı.
4. [x] **Veritabanı Migrasyonları & Rollback:** `places_of_interest` ve `trip_place_visits` canlı Cloud SQL'e uygulandı; `rollback_places_and_visits.sql` hazırlandı.
5. [x] **Kullanıcı Onayı:** Kullanıcının açık talebi (*"tatilde.bugunai.com adresinden çalışır hale getirelim"*) alındı.

---

## 4. Dağıtım Komutları ve Süreç Adımları

### 1. Cloud Run Dağıtımı (europe-west1):
```bash
gcloud run deploy tatilde-bugun \
  --source . \
  --project dernektebugun-492221 \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars="LIVE_ENV=true,NEXTAUTH_URL=https://tatilde.bugunai.com,NEXT_PUBLIC_APP_URL=https://tatilde.bugunai.com,NEXT_PUBLIC_APP_NAME=TatildeBugün,EMAIL_SENDER=admin@bugunai.com,DATABASE_URL=postgresql://postgres:...@34.38.207.47:5432/tatilde-bugun,AUTH_SECRET=...,RESEND_API_KEY=..."
```

### 2. Alan Adı Eşlemesi (Custom Domain Mapping):
```bash
gcloud beta run domain-mappings create \
  --service tatilde-bugun \
  --domain tatilde.bugunai.com \
  --project dernektebugun-492221 \
  --region europe-west1
```

### 3. DNS CNAME Kaydı:
DNS yönetim panelinde (Cloudflare / Registrar) şu kayıt açılır:
- **Tür:** `CNAME`
- **Ad (Name):** `tatilde`
- **Hedef (Content):** `ghs.googlehosted.com.`

---

## 5. Dağıtım Günlüğü (Deployment History)

| Sürüm | Tarih | Ortam | Değişiklik Özeti | Durum |
| :--- | :--- | :--- | :--- | :--- |
| v2.4.1 | 2026-11-17 | Production (`alltripx.com`) | Next.js Server Action runtime fix: 'use server' direktifli search-travelers.ts içindeki PRIVACY_LEVELS nesne sabiti lib/constants/privacy.ts altına taşındı, HTTP 500 'invalid-use-server-value' hatası tamamen giderildi | Dağıtım Başlatıldı |
| v2.4.0 | 2026-11-17 | Production (`alltripx.com`) | 1) Akıllı Gezgin Arama: Boşluksuz (REPLACE) ve Türkçe karakter (TRANSLATE) toleranslı Postgres araması, currentUser.id doğrudan istemci aktarımı, 2) Profil Fotoğrafı Yükleme: HTML5 Canvas merkezden kare (1:1) kırpma ve 256x256 WebP/JPEG sıkıştırmayla DB users.avatar_url kolonunda saklama, 3) Evrensel UserAvatar: Profil kartı, üst bar, arama/radar kartları, sohbet ve bildirimlerde pürüzsüz fotoğraf & emoji render | Canlıda & Aktif (`tatilde-bugun-00021-94n`) |
| v2.3.0 | 2026-11-17 | Production (`alltripx.com`) | Tarayıcı sekme başlığı (Browser Tab / Favicon) marka entegrasyonu: Chrome'daki varsayılan gri dünya simgesi yerine AllTripX'in cyan-to-blue gradyanlı beyaz palmiye logosu vektörel SVG, PNG, ICO ve Apple Touch Icon formatlarında yayına alındı | Canlıda & Aktif (`tatilde-bugun-00020-ndv`) |
| v2.2.0 | 2026-11-16 | Production (`alltripx.com`) | Platform geneli tam çift dilli (TR / EN) yerelleştirme: 1) Explore (/feed) sekme, sayaç, rozet ve reaksiyonlar, 2) Radar (/match) viral davet, rehber tarama ve çakışma kartları, 3) On Vacation (/tatildeyim) canlı rehber kokpiti, rota akışı ve seyahat günlüğü, 4) Bildirimler (bell dropdown) göreceli zaman ve okundu aksiyonları, 5) Gezgin Sohbeti (chat-view & messages) arama ve durumlar, 6) Arkadaşını Davet Et modalı AllTripX sözlük anahtarları | Canlıda & Aktif (`tatilde-bugun-00019-2cj`) |
| v2.1.0 | 2026-11-16 | Production (`alltripx.com`) | Canlı saha test geri bildirimleri: 1) OTP doğrulama ekranına belirgin Hotmail/Outlook Spam/Junk uyarısı ve TR/EN seçici, 2) Çok dilli sözleşmeler (GDPR/KVKK, Kullanıcı Sözleşmesi, Gizlilik Politikası) tam İngilizce/Türkçe metinlerle ve hızlı dil anahtarıyla, 3) Onboarding sihirbazı z-[9995] izolasyonu (harita buton çakışması fix) ve AllTripX markalaması, 4) Harita istatistik rozetleri, rotalar, seyahatler ve tema seçicisinin useTranslation ile anlık dil değişimine bağlanması, context router.refresh() entegrasyonu | Canlıda & Aktif (`tatilde-bugun-00018-hs2`) |
| v2.0.0 | 2026-11-16 | Production (`alltripx.com`) | AllTripX.com küresel marka dönüşümü, Google Cloud Run SSL sertifikasyonu (`CertificateProvisioned: True`), `tatilde.bugunai.com` ve `www.alltripx.com` ➔ `alltripx.com` 301 kalıcı yönlendirme katmanı (`middleware.ts`), çift dilli (TR/EN) interaktif karşılama sayfası (`LandingView`), giriş & kayıt formları dil seçicisi, AllTripX Resend e-posta motoru, Gezgin Arama, Onboarding gizlilik hiyerarşisi ve 15k-20k adım standartlı Paris/Nice/Roma akıllı rota kümeleme mimarisi | Canlıda & Aktif (`tatilde-bugun-00017-hfk`) |
| v1.6.0 | 2026-11-14 | Production (`tatilde.bugunai.com`) | Gezgin Arama (🔍 5. Sekme: İsim, @nickname, e-posta), kayıt ve login anında veritabanı mükerrerlik kontrollü benzersiz @nickname motoru, ilk giriş Onboarding Sihirbazı (81 il seçimi & gizlilik tercihleri), 5 kademeli kapsayıcı paylaşım hiyerarşisi (Herkes > Arkadaş > Akraba > Aile > Gizli) ve profil iletişim görünürlük anahtarları (showFullName, showEmail, showPhone) canlıya alındı | Canlıda & Aktif (`tatilde-bugun-00016-9cv`) |
| v1.5.0 | 2026-11-10 | Production (`tatilde.bugunai.com`) | Windows Chrome/Edge ortamında bayrak emojilerinin boş/beyaz kutu (tofu) çıkması sorunu giderildi; Leaflet harita pinleri, rota durakları, seyahat çekmecesi ve telefon seçiciye tam uyumlu vektörel SVG ve yüksek çözünürlüklü FlagCDN bayrak mimarisi entegre edildi | Canlıda & Aktif (`tatilde-bugun-00015-wn6`) |
| v1.4.2 | 2026-11-09 | Production (`tatilde.bugunai.com`) | Kayıt ve şifre sıfırlama formlarına W3C `autoComplete="new-password"` ve `autoComplete="off"` tanımlanarak tarayıcıların hafızadaki eski parolayı (`071907`) otomatik doldurması engellendi | Canlıda & Aktif (`tatilde-bugun-00014-n2f`) |
| v1.4.1 | 2026-11-09 | Production (`tatilde.bugunai.com`) | Kayıt ve profil formunda telefon kodu varsayılan olarak Türkiye (+90) seçili hale getirildi; doğrulama ve şifre sıfırlama ekranlarındaki iç geliştirici/test ibareleri (`sifreler.md`) kurumsal güvenilirlik gerekçesiyle temizlendi | Canlıda & Aktif (`tatilde-bugun-00013-fk8`) |
| v1.4.0 | 2026-11-09 | Production (`tatilde.bugunai.com`) | Uluslararası tekil telefon desteği (`InternationalPhoneInput`, 16+ ülke bayrak/kod seçici, başında 0 temizleme, Postgres `users_phone_number_unique_idx`), inaktif hesapları silmeden otomatik devralma & taze OTP ile tazeleme (Auto Re-hydration) ve giriş ekranından (`/login`) inaktif hesap kurtarma akışı canlıya alındı | Canlıda & Aktif (`tatilde-bugun-00012-jdn`) |
| v1.3.2 | 2026-11-09 | Production (`tatilde.bugunai.com`) | Resend yeni doğrulanmış alan adı API anahtarı (`RESEND_API_KEY`) Cloud Run ortam değişkenlerine tanımlandı, `bildirim@tatilde.bugunai.com` üzerinden harici alıcılara doğrudan e-posta iletimi aktif edildi | Canlıda & Aktif (`tatilde-bugun-00011-w86`) |
| v1.3.1 | 2026-11-09 | Production (`tatilde.bugunai.com`) | Modüler Yönetim Merkezi (Admin Hub - `/admin`) ana menüsü eklendi, üst bar 🛡️ Kalkan ikonu `/admin` menüsüne bağlandı, Sözleşme & KVKK modül kartı entegre edildi ve `/admin/agreements` sayfasına geri dönüş breadcrumb'ı eklendi | Canlıda & Aktif (`tatilde-bugun-00010-w2g`) |
| v1.3.0 | 2026-11-09 | Production (`tatilde.bugunai.com`) | BurstaBugun tarzı tam kapsamlı KVKK ve Yasal Sözleşme Onay Altyapısı (`contracts`, `user_contracts`), zorunlu kapatılamaz onay modalı (`ContractEnforcer`), Yönetici Sözleşme Yönetim Paneli (`/admin/agreements`), `erhanayyildiz@gmail.com` Admin yetkilendirmesi, yarım kalan kayıtların sıfırdan kaydolabilmesi ve doğrulanmış `bildirim@tatilde.bugunai.com` e-posta motoru | Canlıda & Aktif (`tatilde-bugun-00009-mnw`) |
| v1.2.4 | 2026-11-05 | Production (`tatilde.bugunai.com`) | Samsung Galaxy S24 Ultra hareketli HEIC fotoğraflarındaki `GPS: NaN, NaN` onarımı (`extractCoordinate` ile rasyonel/düz/DMS formatlarından tam koordinat çözümü) | Canlıda & Aktif (`tatilde-bugun-00008-bm7`) |
| v1.2.3 | 2026-11-05 | Production (`tatilde.bugunai.com`) | `exifreader` Tier-1 hibrit motoru ile Samsung Galaxy S24 Ultra Hareketli HEIC (`.heic`) fotoğraflarındaki GPS ayrıştırma desteği, otomatik açılan teşhis kartları ve `.heic,.heif` seçici desteği | Canlıda & Aktif (`tatilde-bugun-00007-5sh`) |
| v1.2.2 | 2026-11-05 | Production (`tatilde.bugunai.com`) | `exifr.gps()` ile EXIF GPS ayrıştırma onarımı, modal içi anlık cihaz/koordinat/mesafe teşhis (Debug) modu, iOS/Android konum rehberi ve tek tıkla Roma Kolezyum örnek fotoğraf testi | Canlıda & Aktif (`tatilde-bugun-00006-h6j`) |
| v1.2.1 | 2026-11-04 | Production (`tatilde.bugunai.com`) | Mobil React Portal mimarisi (ekran donması/bulanık kalma fix), butona tıklandığında anında açılan yerel galeri seçici (UX) ve fotoğraftan tespit edilen yerler için Mavi (Sky Blue) renk kodlama, rozet ve tek tıkla onaylama sistemi | Canlıda & Aktif (`tatilde-bugun-00005-299`) |
| v1.2.0 | 2026-11-04 | Production (`tatilde.bugunai.com`) | Mekan kartları Wikimedia kapak fotoğrafları & Lightbox modalı, DB-first önbellek mimarili 1-5 günlük akıllı yürüyüş rotaları (Roma 5 gün, Bağdat 2 gün), doğrudan rotadan check-in desteği ve istemci tarafı sıfır kotalı EXIF GPS fotoğraf eşleme sihirbazı | Canlıda & Aktif (`tatilde-bugun-00004-znh`) |
| v1.1.0 | 2026-11-02 | Production (`tatilde.bugunai.com`) | Mobil-First tasarım & sıfır yatay kaydırma (Kural 13), zenginleştirilmiş Roma (46) ve Bağdat (21) mekanları, Wikipedia GeoSearch dinamik mekan motoru ve Tatildeyim sadece bugünü kapsayan aktif tatil filtrelemesi | Canlıda & Aktif (`tatilde-bugun-00003-fm5`) |
| v1.0.0 | 2026-10-30 | Production (`tatilde.bugunai.com`) | Cloud Run üzerinde canlı yayına alma (`tatilde-bugun-00002-4qs`), Google Trust Services SSL sertifikası, NextAuth trustHost yapılandırması ve Tatildeyim modülü | Canlıda & Aktif (100% Çalışır Durumda) |
| v0.0.1 | 2026-10-29 | Planlama | Dağıtım altyapı dokümantasyonu oluşturuldu | Hazır |

