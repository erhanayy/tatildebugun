# 🚀 AllTripX Value-Share (Değer Paylaşımı) ve Oyunlaştırma Sistemi - Master Analiz Raporu

Bu analiz; AllTripX platformunu organik olarak büyüten, içeriği zenginleştiren, kullanıcıyı platforma kilitleyen ve elde edilen net kârın adil bir şekilde toplulukla paylaşılmasını sağlayan oyunlaştırma ve ekonomi modelinin mimari özetidir.

---

### 1. 2026 Sezonu Puanlama ve Değer Matrisi
Sistemin manipüle edilmesini (botları ve masabaşından yalan dolan pin ekleyenleri) engellemek için ana kuralımız **"Check-in Odaklı Çarpan"** prensibidir:

| Eylem / Katkı Tipi | Temel Puan | Check-in / Doğrulama Çarpanı | Nihai Puan Etkisi | Gerekçe / Strateji |
| :--- | :--- | :--- | :--- | :--- |
| **Günlük Login** | 5 Puan | Yok (1x) | **5 Puan** | Sadakat ve günlük aktiflik rozeti. |
| **Yorum / Beğeni** | 5 Puan | Yok (1x) | **5 Puan** | Topluluk etkileşimi. |
| **Pin / Rota Oluşturma** | 10 Puan | **Fiziki Check-in Yapılırsa (20x)** | **200 Puan** | Masabaşından atılan pin az puan alır; gidip deneyimleyen (check-in) voliyi vurur! |
| **B2B Satın Alma / Rezervasyon** | 100 Puan | Partner işletmeden harcama | **100+ Puan** | Platforma doğrudan nakit getiren en kritik eylem. |
| **Arkadaş Daveti (Referral)** | Değişken | Arkadaşın o yıl kazandığı puan | **%20 Pasif Gelir** | Davet ettiğin kişinin yıl boyunca kazandığı tüm puanların %20'si ekstradan senin hanene yazar. |

---

### 2. Pasif Gelir ve "Uçan Puanlar" (Referral & UI Deneyimi)
* **%20 Arkadaş Geliri:** Tek seferlik 50 puan yerine, davet ettiğin kullanıcıların aktifliğinden pasif puan kazanman sağlanır. Kullanıcı her sabah giriş yaptığında: *“Günaydın! Davet ettiğin arkadaşların dün seyahat edip pin ekledi, hanene pasif olarak +300 Puan uçtu!”* şeklinde bildirimlerle motive edilir.
* **Uçan Puanlar (Animation):** Kullanıcı bir eylem gerçekleştirdiğinde arayüzde o puanların animasyonla yukarıdaki ana cüzdana doğru uçması sağlanarak anlık dopamin tatmini yaratılır.

---

### 3. Versiyonlu Kural Motoru ve Puan Mimarisi
* **Event-Sourcing / Ledger (Defter) Deseni:** Puanlar doğrudan profilde bir sayı olarak tutulmaz. `user_points_ledger` tablosunda ham loglar olarak tutulur (`SELECT SUM` ile hesaplanır).
* **Versiyonlu Kural Motoru:** Algoritma değişimlerinde geçmiş verileri bozmamak için kurallar versiyonlanır (`effective_date` / `version`). Eski kayıtlar kendi versiyon katsayısıyla kalırken, yeni işlemler en üst versiyondan işlenir.

---

### 4. Yıl Geçiş Dengesi: Akıllı Başlangıç Puanı (Carry-Over)
* Sistemde puanlar tamamen sıfırlanmaz veya sadece yarıya bölünmez. 
* Geçmiş yıllarda eklenen pin ve rotaların "taban/başlangıç puanı" olarak yeni yıla devretmesi sağlanır. Eski oyuncu kıdem avantajını korur, ancak yıl içindeki aktif işlemlerle yeni gelenler de bu farkı kapatabilir.

---

### 5. Hukuki ve Psikolojik Olarak Güvenli Simülasyon (UI Dil)
* Asla kesin kazanç taahhüdü ("X TL alacaksınız") verilmez. Hukuki riskleri (senet/taahhüt algısı) ortadan kaldırmak için simülasyon dili kullanılır:
> 📊 **2026 Sezonu Katkı Özeti**
> * **Toplam Topladığın Puan:** 25,000 Puan
> * **Genel Havuzdaki Ağırlığın:** %0.5 (Yarım yüzde)
> * *Simülasyon (Örn: 1.000.000 TL Net Kâr Dağılımı Olursa):* **Tahmini Payın ~5,000 TL** *(Bu rakam yıl sonundaki net kâra ve toplam havuzdaki puan ağırlığına göre anlık değişir, taahhüt içermez.)*

---

### 6. Admin Moderasyon, Şikayet ve Ceza Mekanizması (Anti-Cheat & Ban Hammer)
* Küfürlü, rahatsız edici veya hileli (cheat) olduğu tespit edilen kullanıcı içerikleri ve hareketleri sistem tarafından işaretlenir (Auto-Flagging).
* Admin, yönetim paneli üzerinden ilgili profili inceleyebilir; o seneki puan/para havuzu hakkını dondurabilir, silebilir veya manuel **"Eksi Puan Cezası (Penalty Points)"** uygulayabilir. Cezalar ledger tablosuna negatif işlem olarak yansır.
