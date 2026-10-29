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
- **GitHub Repository URL:** *(Kullanıcı tarafından belirlendiğinde eklenecek)*
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
  - [ ] `.gitignore` dosyasının hassas dosyaları (`.env`, `Access.md`, anahtarlar, credentials vb.) kapsadığından emin olunması
  - [ ] Kodun yerel testlerden ve statik analizden başarıyla geçmesi
  - [ ] Kullanıcıdan açık "GitHub'a gönder / push et" onayı alınmış olması

---

## 4. GitHub Gönderim Tarihçesi

| Tarih | Commit Özeti | Dal (Branch) | Onaylayan | Notlar |
| :--- | :--- | :--- | :--- | :--- |
| *Henüz gönderim yapılmadı* | - | - | - | - |
