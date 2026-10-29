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
- **Geliştirme / Mimari Referansı:** `../BurstaBugun` projesi ile aynı altyapı mimarisi (Google Cloud SQL / Firestore / Cloud Run / App Hosting vb.)
- **Bölge (Region):** *(GCP proje detayları girildiğinde netleştirilecek)*

---

## 3. Dağıtım Öncesi Kontrol Listesi (Pre-Deployment Checklist)
1. **Kalite Kapısı (Pre-Deploy Quality Gate):** Linter, tip denetimleri (`type-check`) ve birim testler sıfır hata ile tamamlandı mı?
2. **Güvenlik Taraması:** `Security.md` kurallarına uygunluk sağlandı mı, hassas veri sızıntısı kontrolü yapıldı mı?
3. **Konfigürasyon & .env.example:** Ortam değişkenleri `.env.example` ile eksiksiz uyumlu mu?
4. **Veritabanı Migrasyonları & Rollback:** Şema değişikliklerinin geri alma (down/rollback) scripti hazır mı? Kritik işlemlerde snapshot alındı mı?
5. **Kullanıcı Onayı:** Kullanıcıdan dağıtım için açık ve net komut alındı mı?

---

## 4. Dağıtım Komutları ve Süreç Adımları
*(BurstaBugun ortamı ile uyumlu scriptler ve GCP CLI komutları buraya işlenecektir)*

```bash
# Örnek dağıtım adımları (Sadece onay alındığında çalıştırılacak)
# gcloud run deploy ... / firebase deploy ...
```

---

## 5. Dağıtım Günlüğü (Deployment History)

| Sürüm | Tarih | Ortam | Değişiklik Özeti | Durum |
| :--- | :--- | :--- | :--- | :--- |
| v0.0.1 | 2026-10-29 | Planlama | Dağıtım altyapı dokümantasyonu oluşturuldu | Hazır |
