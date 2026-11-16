-- users tablosunda telefon numaralarının SHA-256 hash'leri için fonksiyonel indeks
-- KVKK uyumlu sıfır-bilgili (zero-knowledge) rehber eşleşmelerini O(log N) hızlandırmak için kullanılır.

CREATE INDEX IF NOT EXISTS users_phone_sha256_idx 
ON users (encode(sha256(phone_number::bytea), 'hex')) 
WHERE phone_number IS NOT NULL;
