# TatildeBugun - GitHub Süreçleri ve Gönderim Rehberi (github.md)

Bu dokümanda projenin Git/GitHub süreçleri, repository bilgileri, dal (branch) yapısı ve gönderim geçmişi kayıt altına alınır.

---

## 1. Temel Kural
> [!IMPORTANT]
> **GITHUB'A GÖNDERİM KURALI:**
> Projede kod, konfigürasyon veya dokümanlar **ASLA otomatik olarak GitHub'a itilmeyecektir (git push)**.
> GitHub'a gönderim yalnızca ve yalnızca kullanıcının **açık talimatı ve komutu** doğrultusunda gerçekleştirilecektir.

---

## 2. Depo (Repository) Bilgileri
- **GitHub Repository URL:** `https://github.com/erhanayy/tatildebugun`
- **Varsayılan Ana Dal (Default Branch):** `main`
- **Geliştirme Dalı (Dev Branch):** `develop` veya `feature/*`

---

## 3. Dal ve Commit Standartları
- **Commit Mesajı Formatı (Conventional Commits):**
  - `feat: ...` : Yeni özellik eklemeleri
  - `fix: ...` : Hata düzeltmeleri
  - `docs: ...` : Dokümantasyon güncellemeleri
  - `refactor: ...` : Kod yeniden düzenlemeleri
  - `chore: ...` : Bağımlılık ve yapılandırma işleri
- **Gönderim Öncesi Kontrol Listesi:**
  - [x] `.gitignore` dosyasının hassas dosyaları (`.env`, `Access.md`, anahtarlar, credentials, `sifreler.md` vb.) kapsadığından emin olunması
  - [x] Kodun yerel testlerden ve statik analizden başarıyla geçmesi
  - [x] Kullanıcıdan açık "GitHub'a gönder / push et" onayı alınmış olması

---

## 4. GitHub Gönderim Tarihçesi

| Tarih | Commit Özeti | Dal (Branch) | Onaylayan | Notlar |
| :--- | :--- | :--- | :--- | :--- |
| 2026-11-09 | `feat(agreements-auth): add KVKK agreement enforcer, admin hub, unique international phone, auto re-hydration, +90 default & autofill guard` | `main` | Erhan Ayyıldız | Kullanıcının açık komutuyla bu gece yapılan tüm geliştirmeler depoya itildi: 1) BurstaBugun tarzı tam kapsamlı KVKK ve Yasal Sözleşme Onay Altyapısı (`contracts`, `user_contracts`, zorunlu onay modalı `ContractEnforcer`, `/admin` ve `/admin/agreements`), 2) Doğrulanmış `bildirim@tatilde.bugunai.com` e-posta motoru, 3) 16+ ülke bayraklı uluslararası tekil telefon desteği (`InternationalPhoneInput`, PostgreSQL `users_phone_number_unique_idx`, varsayılan `+90 Türkiye`), 4) İnaktif hesapların otomatik devralınması (Auto Re-hydration) ve `/login` kurtarma akışı, 5) Canlı arayüzlerden iç `sifreler.md` referanslarının temizlenmesi, 6) W3C `autoComplete="new-password"` ile tarayıcı şifre doldurma (071907) engeli, 7) Geri alınabilir SQL migrasyonları ve güncel dokümanlar. |
| 2026-11-05 | `fix(photo-matcher): resolve GPS NaN issue for Samsung Galaxy S24 Ultra motion HEIC photos via extractCoordinate helper` | `main` | Erhan Ayyıldız | Kullanıcının açık komutuyla: Samsung Galaxy S24 Ultra hareketli HEIC fotoğraflarında `typeof NaN === "number"` tuzağı ve rasyonel etiket bölünmesi kaynaklı `NaN, NaN` sorunu giderildi; `extractCoordinate` derin ayrıştırıcısı ile tam Pantheon Tapınağı koordinatı (`41.89866, 12.4770`) başarıyla çözüldü. |
| 2026-11-05 | `feat(photo-matcher): integrate ExifReader for Samsung Galaxy S24 Ultra Motion Photo HEIC support and auto-diagnostic UX` | `main` | Erhan Ayyıldız | Kullanıcının açık komutuyla: Samsung Galaxy S24 Ultra hareketli HEIC fotoğraflarını kayıpsız ayrıştıran `exifreader` Tier-1 motoru entegre edildi (`exifr` Tier-2 fallback), eşleşmeyen dosyalarda otomatik açılan akıllı teşhis kartları ve genişletilmiş `.heic,.heif` seçici desteği eklendi. |
| 2026-11-05 | `fix(photo-matcher): fix exifr gps parsing, add on-screen telemetry diagnostics and colosseum sample test` | `main` | Erhan Ayyıldız | Kullanıcının açık komutuyla: exifr kütüphanesindeki `pick` kaynaklı GPS ayrıştırma hatası düzeltildi (doğrudan `exifr.gps()` ve filtresiz parse), ekranda anlık cihaz/koordinat/mesafe teşhisi gösteren Debug modu, iOS/Android mobil konum kılavuzu ve tek tıkla Roma Kolezyum örnek fotoğrafı ile canlı doğrulama butonu eklendi. |
| 2026-11-04 | `fix(mobile): use React portals for modals, instant gallery picker & blue theme for photo detected places` (`2564a65`) | `main` | Erhan Ayyıldız | Kullanıcının mobil test geri bildirimiyle: modal donma/kararma sorununu çözen React Portal mimarisi, doğrudan yerel galeri seçiciyi tetikleyen buton akışı ve fotoğraftan tespit edilen mekanlar için Mavi (Sky Blue) renk kodlama & hızlı onaylama sistemi depoya itildi. |
| 2026-11-04 | `feat: Mekan gorselleri (Wikimedia thumbnail & lightbox), DB-cached 1-5 gunluk akilli yuruyus rotalari (Roma 5 gun, Bagdat 2 gun) ve client-side EXIF GPS fotograf esleme sihirbazi` | `main` | Erhan Ayyıldız | Kullanıcının açık komutu doğrultusunda mekan kartı kapak fotoğrafları, Lightbox modalı, DB-first önbellek mimarili 1-5 günlük yürüyüş rotaları, durak bazlı check-in entegrasyonu ve istemci tarafı sıfır kotalı EXIF GPS fotoğraf eşleme sihirbazı depoya itildi. |
| 2026-11-02 | `feat: Mobil-first ve sifir yatay kaydirma (Kural 13), zenginlestirilmis Roma ve Bagdat POI katalogu, dinamik Wikipedia motoru ve Tatildeyim aktif tatil filtresi` | `main` | Erhan Ayyıldız | Kullanıcının açık komutu doğrultusunda mobil-first (sıfır yatay kaydırma) düzeni, Roma (46) ve Bağdat (21) ikonik mekanları, Wikipedia GeoSearch yarıçap düzeltmesi, Tatildeyim bugünü kapsayan aktif tatil filtrelemesi ve ana şehir başlangıç/dönüş durağını gizleme işlendi. |
| 2026-10-30 | `feat: tatilde.bugunai.com canli yayini, Google Trust Services SSL ve NextAuth trustHost yapilandirmasi eklendi` | `main` | Erhan Ayyıldız | Kullanıcının açık komutu doğrultusunda canlı alan adı (tatilde.bugunai.com), Google Cloud Run SSL sertifikasyonu ve güvenli oturum açma (trustHost) yapılandırmaları depoya itildi. |
| 2026-10-30 | `feat: Tatildeyim canli tur rehberi, POI katalogu, zaman damgali gezi gunlugu, beyaz-sari yildiz derecelendirmesi ve Cloud Run canli yayin hazirligi eklendi` | `main` | Erhan Ayyıldız | Canlı tur rehberi (Tatildeyim), Wikidata POI kataloğu, Wikipedia fallback motoru, zaman damgalı gezi günlüğü, çift renkli yıldız puanlama (beyaz/sarı) ve tatilde.bugunai.com canlı dağıtım hazırlıkları işlendi. |
| 2026-10-30 | `feat: KKTC egemenlik sinirlari, resmi bayrak karti, Turkce sehirleri ve cografi tersine kodlama korumasi eklendi` | `main` | Erhan Ayyıldız | Kullanıcının açık talimatı ile KKTC Yeşil Hat sınırı, resmi KKTC SVG bayrak kartı, Türkçe şehirler (Lefkoşa, Girne, Gazimağusa, Güzelyurt, İskele, Lefke) ve reverse geocoding koruması gönderildi. |
| 2026-10-30 | `feat: TatildeBugun platformu tum mimari, harita, rota, sosyal ve eslesme modulleri ile baslatildi` (`7673494`) | `main` | Erhan Ayyıldız | Kullanıcının açık onayı ile `tatildebugun` reposu oluşturuldu; tüm kod tabanı, migrasyonlar ve analiz dokümanları gönderildi. |


