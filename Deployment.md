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
| v1.0.0 | 2026-10-30 | Production (`tatilde.bugunai.com`) | Cloud Run üzerinde canlı yayına alma, Tatildeyim modülü ve tüm platform özellikleri | Dağıtımda |
| v0.0.1 | 2026-10-29 | Planlama | Dağıtım altyapı dokümantasyonu oluşturuldu | Hazır |

