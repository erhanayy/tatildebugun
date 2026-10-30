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
| 2026-10-30 | `feat: tatilde.bugunai.com canli yayini, Google Trust Services SSL ve NextAuth trustHost yapilandirmasi eklendi` | `main` | Erhan Ayyıldız | Kullanıcının açık komutu doğrultusunda canlı alan adı (tatilde.bugunai.com), Google Cloud Run SSL sertifikasyonu ve güvenli oturum açma (trustHost) yapılandırmaları depoya itildi. |
| 2026-10-30 | `feat: Tatildeyim canli tur rehberi, POI katalogu, zaman damgali gezi gunlugu, beyaz-sari yildiz derecelendirmesi ve Cloud Run canli yayin hazirligi eklendi` | `main` | Erhan Ayyıldız | Canlı tur rehberi (Tatildeyim), Wikidata POI kataloğu, Wikipedia fallback motoru, zaman damgalı gezi günlüğü, çift renkli yıldız puanlama (beyaz/sarı) ve tatilde.bugunai.com canlı dağıtım hazırlıkları işlendi. |
| 2026-10-30 | `feat: KKTC egemenlik sinirlari, resmi bayrak karti, Turkce sehirleri ve cografi tersine kodlama korumasi eklendi` | `main` | Erhan Ayyıldız | Kullanıcının açık talimatı ile KKTC Yeşil Hat sınırı, resmi KKTC SVG bayrak kartı, Türkçe şehirler (Lefkoşa, Girne, Gazimağusa, Güzelyurt, İskele, Lefke) ve reverse geocoding koruması gönderildi. |
| 2026-10-30 | `feat: TatildeBugun platformu tum mimari, harita, rota, sosyal ve eslesme modulleri ile baslatildi` (`7673494`) | `main` | Erhan Ayyıldız | Kullanıcının açık onayı ile `tatildebugun` reposu oluşturuldu; tüm kod tabanı, migrasyonlar ve analiz dokümanları gönderildi. |


