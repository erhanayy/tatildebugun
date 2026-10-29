# TatildeBugun - Güvenlik Politikaları ve Kuralları (Security.md)

Bu doküman, TatildeBugun projesinin tüm güvenlik standartlarını, kısıtlamalarını ve savunma protokollerini tanımlar.

---

## 1. Kritik Dizin Sınırı Kuralı (Workspace Isolation)
> [!CAUTION]
> **DİZİN SINIRI & AÇIK ONAY ZORUNLULUĞU:**
> Asistan veya geliştirme araçları, bu proje dizini (`/Users/erhanayyildiz/Desktop/Work/TatildeBugun`) **dışında yapacağı her türlü işlem için (dosya okuma, dosya yazma, komut çalıştırma, dizin tarama vb.) KESİNLİKLE kullanıcıya açıkça sorup BİREBİR ONAY ALMAK ZORUNDADIR**.
> Kullanıcı açık izin vermeden hiçbir dış dizine müdahale edilemez, veri okunamaz veya yazılamaz.

---

## 2. Kimlik Doğrulama ve Gizli Bilgi (Secrets) Yönetimi
1. **Plaintext Yasağı:** API anahtarları, veritabanı şifreleri, JWT gizli anahtarları, SMS veya E-posta kimlik bilgileri kaynak kodda veya açık metin olarak asla tutulamaz.
2. **Access.md Güvenliği:** Erişim bilgileri `Access.md` içerisinde yer alacaksa, kesinlikle güçlü ve unutulmayacak bir şifreleme (Encryption) yöntemi ile korunacaktır.
3. **Versiyon Kontrolüne Sızmayı Engelleme:** `.env`, `.env.local`, `Access.md` (eğer şifrelenmemişse), servis hesabı anahtarları (`*.json`, `*.pem`) daima `.gitignore` içerisinde yer alacaktır.

---

## 3. Bulut ve Veritabanı Güvenliği (Google Cloud)
- **Least Privilege (En Az Yetki İlkesi):** GCP servis hesapları (Service Accounts) yalnızca ihtiyaç duydukları rollere sahip olmalıdır.
- **Güvenli Bağlantılar:** Veritabanı ve harici API iletişimlerinde mutlaka TLS/SSL (HTTPS, WSS, Cloud SQL SSL Proxy) zorunlu kılınacaktır.
- **SQL Injection & NoSQL Injection Savunması:** Tüm sorgularda parametrik sorgular veya güvenli ORM/ODM yapıları kullanılacaktır; dinamik string birleştirmesi yapılamaz.

---

## 4. Uygulama Düzeyi Güvenlik Standartları
- **Girdi Doğrulama & Sanitasyon:** Kullanıcıdan gelen her veri (query params, body, headers) şema doğrulayıcılar (Zod vb.) ile doğrulanacaktır.
- **XSS & CSRF Koruması:** Web arayüzlerinde içerik güvenliği politikası (CSP), CORS kısıtlamaları ve güvenli çerez (SameSite, HttpOnly, Secure) standartları uygulanacaktır.
- **Rate Limiting:** Kimlik doğrulama, SMS gönderimi ve hassas endpoint'lerde kaba kuvvet (brute-force) saldırılarına karşı istek sınırlaması (rate limit) uygulanacaktır.
- **Hassas Veri Maskeleme:** Log çıktılarında kredi kartı, şifre, TC kimlik no gibi kişisel/finansal veriler asla loglanmayacaktır.
