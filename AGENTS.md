# TatildeBugun - Antigravity Proje Kuralları (AGENTS.md)

Bu dosya, TatildeBugun projesinde çalışan yapay zeka asistanının ve geliştirme araçlarının UYMASI ZORUNLU temel kurallarını içerir.

---

## 1. Analiz ve Değişiklik Takibi
- Yapılan tüm analizler, mimari kararlar ve değişiklikler [Analysis.md](file:///Users/erhanayyildiz/Desktop/Work/TatildeBugun/Analysis.md) içerisine başlıklar halinde detaylıca işlenecektir.

## 2. GitHub Gönderim Disiplini
- GitHub'a veya uzak depoya kod gönderimi (push) **ASLA otomatik olarak yapılamaz**.
- Yalnızca kullanıcının açık komutu ile gönderim yapılacak ve detaylar [github.md](file:///Users/erhanayyildiz/Desktop/Work/TatildeBugun/github.md) dosyasına kaydedilecektir.

## 3. Dağıtım (Deployment) Disiplini
- Dağıtım (Deployment) işlemleri **ASLA otomatik olarak yapılamaz**.
- Yalnızca kullanıcının açık komutu ile dağıtım yapılacak ve süreç bilgileri [Deployment.md](file:///Users/erhanayyildiz/Desktop/Work/TatildeBugun/Deployment.md) dosyasına yazılacaktır.

## 4. Onay Öncesi Kod Geliştirme Yasağı
- Yeni bir özellik veya modül geliştirilirken **hemen kodlamaya başlanmayacaktır**.
- Önce analiz, mimari ve arayüz/servis tasarımı sunulacaktır.
- Yalnızca kullanıcıdan **"Onaylıyorum, Geliştirmeyi Yapabilirsin"** komutu/onayı geldikten sonra kod yazımına geçilecektir.

## 5. Dizin İzolasyonu ve Güvenlik
- Projenin güvenlik kuralları [Security.md](file:///Users/erhanayyildiz/Desktop/Work/TatildeBugun/Security.md) dosyasında tutulacaktır.
- **KRİTİK:** Proje ana dizini (`/Users/erhanayyildiz/Desktop/Work/TatildeBugun`) **dışında yapılacak HER İŞLEM İÇİN (dosya okuma, dosya yazma, komut çalıştırma vb.) kullanıcıya açıkça sorulacak ve kesin onay alınacaktır.** Onaysız hiçbir dış işlem yapılamaz.

## 6. Geliştirme Ortamı ve Veritabanı Uyumu
- Geliştirme ortamı, kütüphane altyapısı ve mimari bir üst dizindeki `BurstaBugun` projesi ile birebir uyumlu olacaktır.
- Veritabanı da aynı şekilde Google Cloud üzerinde konumlandırılacaktır.
- *(Not: BurstaBugun dizinini incelemek için Rule 5 gereği kullanıcıdan açık izin alınacaktır).*

## 7. Erişim ve Gizli Bilgi Yönetimi
- Google, E-posta, SMS ve harici servislerin erişim bilgileri [Access.md](file:///Users/erhanayyildiz/Desktop/Work/TatildeBugun/Access.md) dosyasında yönetilecektir.
- Bu bilgiler güvenlik gerekçesiyle şifrelenmiş (AES-256 vb.) formatta korunacaktır. Plaintext veya sızdırılabilir biçimde repoya eklenemez.

## 8. Geri Alınabilir Veritabanı Değişiklikleri (Reversible Migrations)
- Veritabanı şemasında yapılan her değişiklik (tablo, kolon, indeks) mutlaka bir geri alma (down/rollback) scripti ile birlikte hazırlanacaktır.
- Veri kaybı riski taşıyan işlemlerden önce snapshot yedekleme kontrolü zorunludur.

## 9. Çevre Değişkenleri Disiplini (.env.example Zorunluluğu)
- Eklenen her yeni konfigürasyon veya API anahtarı anında `.env.example` dosyasına şablon değerle işlenecektir. Hiçbir gizli veya zorunlu değişken şablonsuz bırakılamaz.

## 10. Katı Tip Güvenliği ve Şema Doğrulama (Strict Types & Validation)
- Veri transferleri ve API iletişimleri çift taraflı tip güvenli ve runtime doğrulamalı (Zod vb.) olacaktır. Doğrulanmamış veya `any` tipi serbest veri yapıları kabul edilmez.

## 11. Loglarda Sıfır Hassas Veri Sızıntısı (Zero-PII Structured Logging)
- Google Cloud Logging ve konsol loglarında kullanıcı parolası, SMS onay kodu, kart/kimlik veya iletişim verileri asla loglanmayacak; maskeleme zorunlu olacaktır.

## 12. Dağıtım Öncesi Otomatik Kalite Kapısı (Pre-Deploy Quality Gate)
- Kullanıcıdan dağıtım komutu gelse dahi; build, linter ve birim testler başarıyla tamamlanmadan dağıtım başlatılamaz. Hata durumunda dağıtım durdurulup kullanıcıya raporlanacaktır.

