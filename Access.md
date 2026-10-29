# TatildeBugun - Erişim ve Kimlik Bilgileri Yönetimi (Access.md)

Bu doküman; Google Cloud, E-posta (SMTP/SES vb.), SMS sağlayıcıları ve diğer üçüncü parti servislerin erişim anahtarlarının ve kimlik bilgilerinin güvenli biçimde yönetilmesini sağlar.

> [!WARNING]
> **GÜVENLİK VE ŞİFRELEME (ENCRYPTION) KURALI:**
> Bu dosya veya içerisindeki hassas sırlar (API anahtarları, şifreler, secret token'lar) açık metin (plaintext) olarak saklanamaz ve versiyon kontrol sistemine (GitHub) açık şekilde gönderilemez.
> Aşağıdaki şifreleme yöntemleri kullanılarak unutulmayacak ortak bir parola/keyphrase ile korunmalıdır.

---

## 1. Tavsiye Edilen Şifreleme (Encryption) Yöntemi

macOS ve tüm ortamlarda ek yazılım gerektirmeden çalışan standart **OpenSSL (AES-256-CBC + PBKDF2)** yöntemi önerilir:

### Dosyayı Şifreleme:
```bash
openssl enc -aes-256-cbc -salt -pbkdf2 -in Access.secret.json -out Access.enc -pass pass:ORTAK_GUCLU_PAROLANIZ
```

### Şifreyi Çözme:
```bash
openssl enc -d -aes-256-cbc -pbkdf2 -in Access.enc -out Access.secret.json -pass pass:ORTAK_GUCLU_PAROLANIZ
```

*(Not: `Access.enc` güvenle saklanabilirken, çözülmüş `Access.secret.json` veya açık metin anahtarlar `.gitignore` ile dışarıda tutulur.)*

---

## 2. Servis Erişim Şablonları (Gereken Bilgiler)

### A. Google Cloud Platform (GCP)
- **Project ID:**
- **Region:**
- **Service Account E-posta:**
- **Service Account Key (JSON yolu veya Secret Manager adı):**
- **Cloud SQL / Firestore Bağlantı Dizgisi:**

### B. E-posta Servisi (SMTP / SendGrid / Postmark / GCP SES)
- **Sağlayıcı:**
- **Host / Port:**
- **Kullanıcı Adı / API Key:**
- **Parola / Secret:**
- **Gönderici (From) Adresi:**

### C. SMS Servisi (Netgsm / Twilio / İletimerkezi vb.)
- **Sağlayıcı:**
- **API URL:**
- **Kullanıcı Kodu / API Key:**
- **API Secret:**
- **Başlık (Originator / Header):**

### D. Diğer Entegrasyonlar (Ödeme, Harita vb.)
- **Google Maps API Key:**
- **Ödeme Sağlayıcı API Key & Secret:**
