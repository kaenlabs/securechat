<!-- path: docs/secure-chat-architecture.md -->

# SecureChat - Uçtan uca şifreli, gizlilik odaklı mesajlaşma

Bu doküman, kullanıcı adı + şifre ile çalışan, telefon numarası veya e posta istemeyen, uçtan uca şifreli, Telegram tarzı özellikleri olan fakat gizlilik seviyesi daha agresif bir mobil mesajlaşma uygulamasının teknik tasarımını anlatır.

Odak:
- Uçtan uca şifreleme (E2EE)
- Sunucu sadece köprü görevi görür
- Veritabanı sızsa bile mesaj içerikleri ve anahtarlar çözülemez
- Kullanıcılar için kaybolan mesajlar, iki taraflı silme, minimum meta veri

Örnek teknoloji varsayımı:
- Mobil: React Native
- Backend: Node.js + TypeScript + Express veya NestJS
- Veritabanı: PostgreSQL veya MongoDB
- Kimlik doğrulama: JWT veya benzeri token temelli yapı

Bu doküman Copilot ile kod yazarken rehber olacak üst seviye tasarımı içerir.

---

## 1. Hedefler ve tehdit modeli

### 1.1. Güvenlik hedefleri

- Kullanıcı giriş bilgileri (şifre) sunucuda geri döndürülemeyecek şekilde saklanır.
- Kullanıcıya ait şifreleme private key her zaman cihazda ve şifreli halde kalır.
- Sunucu, mesaj içeriğini hiçbir zaman düz metin olarak göremez.
- Veritabanı sızsa da:
  - Mesaj içerikleri okunamaz.
  - Private key ve şifreler brute force dışında çözülemez.
- Mesajlar:
  - Kullanıcı seçimine göre belirli sürede kaybolabilir.
  - İki taraftan da sil seçeneği ile hem sunucu tarafındaki kopya hem de istemci tarafı senkronize silme davranışı tetiklenir.

### 1.2. Tehdit modeli

Korunmak istediğimiz durumlar:
- Uygulama sunucusunun hacklenmesi ve veritabanı dump edilmesi
- İçerik analizi ile mesajların okunmaya çalışılması
- Üçüncü parti hizmet sağlayıcıların veriyi incelemesi

Korunma iddiası olmayan durumlar:
- Kullanıcının cihazının fiziken ele geçirilmesi ve şifresinin çözülmesi
- İşletim sisteminin tamamen compromise olmuş olması
- Devlet seviyesinde sınırsız kaynakla saldırı gibi ekstrem senaryolar

---

## 2. Kayıt ve giriş akışı

Kullanıcılar yalnızca:
- `username`
- `password`
ile kayıt olur.

Telefon numarası, e posta gibi kimlik bağlayıcı veriler tutulmaz.

### 2.1. Parola saklama

Parola asla düz metin ya da çözülebilir şekilde saklanmaz.

- Parola hash algoritması: Argon2id (veya scrypt, ama Argon2id tercih)
- Şema:
  - Kullanıcı parolayı girer.
  - Uygulama parolayı sunucuya TLS üzerinden iletir.
  - Sunucu:
    - Rastgele `salt` üretir.
    - `password_hash = Argon2id(password + salt)` hesaplar.
    - Veritabanında şu alanları saklar:
      - `user_id`
      - `username`
      - `password_hash`
      - `salt`
      - `created_at`

Login sırasında:
- Kullanıcının gönderdiği parola + veritabanındaki `salt` ile yeniden Argon2id çalıştırılır.
- Elde edilen hash ile `password_hash` karşılaştırılır.
- Başarılı olursa kullanıcıya bir `access token` verilir (JWT veya benzeri).

Veritabanı sızarsa:
- Saldırganın elinde sadece Argon2id hash ve salt olur.
- Güçlü parola politikası ve yavaş parametreler ile brute force saldırısı çok zorlaştırılır.

---

## 3. Anahtar yönetimi ve kripto katmanı

Her kullanıcı için bir şifreleme anahtar çifti bulunur.

### 3.1. Anahtar üretimi

Kayıt sırasında veya uygulama ilk açıldığında:

- İstemci cihazda:
  - Bir `publicKey` ve `privateKey` çifti üretilir (örnek: Curve25519 tabanlı).
- `publicKey`:
  - Sunucuya gönderilir ve kullanıcı profiline kaydedilir.
- `privateKey`:
  - Cihazda saklanır.
  - Doğrudan düz metin saklanmaz, paroladan türetilen bir anahtarla şifrelenir.

### 3.2. Private key saklama

1. Kullanıcı parolayı girer.
2. İstemci tarafında KDF (Key Derivation Function) ile bir anahtar üretilir:
   - Örnek: Argon2id ile `password + local_salt`.
3. `privateKey`, bu anahtar ile simetrik olarak şifrelenir (örneğin AES GCM).
4. Şifreli private key, cihazın güvenli depolama alanında (Keychain, Keystore veya şifreli dosya) saklanır.

Uygulama açıldığında:
- Kullanıcı parolayı girer.
- Aynı KDF işlemi ile anahtar türetilir.
- Private key çözülür ve sadece RAM içinde kullanılır.

Bu sayede:
- Cihaz ele geçirilse bile parolaya erişilmeden private key çözülemez.

---

## 4. Veri modeli

Örnek PostgreSQL şeması (yüksek seviye):

### 4.1. Users tablosu

- `id` (uuid)
- `username` (unique)
- `password_hash`
- `salt`
- `public_key`
- `created_at`
- `updated_at`

### 4.2. Conversations tablosu

İki kullanıcı arasındaki ya da grup sohbetleri için:

- `id` (uuid)
- `type` (direct, group)
- `created_at`
- `updated_at`

Direct chat için ek:
- `user_a_id`
- `user_b_id`

Group chat için:
- Ayrı bir `conversation_members` tablosu

### 4.3. Messages tablosu

- `id` (uuid)
- `conversation_id`
- `sender_id`
- `ciphertext_message` (şifreli gövde)
- `encrypted_session_key_for_receiver` (ya da çoklu alıcılar için ayrı tablo)
- `sent_at`
- `delivered_at` (opsiyonel)
- `deleted_at` (sunucu tarafı yumuşak silme ya da hard delete)
- `expiry_seconds` (kaybolan mesaj için, null değilse süre)
- `hard_delete_at` (otomatik silme zamanı)

Not: Mesaj içerikleri asla düz metin saklanmaz.

---

## 5. Mesaj gönderme ve alma akışı

### 5.1. Mesaj gönderme

1. İstemci, alıcının `publicKey` bilgisini sunucudan alır.
2. İstemci:
   - Rastgele bir oturum anahtarı üretir (örnek: 256 bit).
   - Mesaj gövdesini bu oturum anahtarı ile simetrik olarak şifreler.
   - Oturum anahtarını alıcının `publicKey` değeri ile asimetrik olarak şifreler.
3. Sunucuya gönderilen payload:
   - `conversation_id`
   - `ciphertext_message`
   - `encrypted_session_key_for_receiver`
   - `expiry_seconds` (varsa)
4. Sunucu bu veriyi veritabanına kaydeder ve alıcıya push notification gönderir.

Sunucu topladığı şey:
- Sadece şifreli mesaj ve şifreli oturum anahtarı.

### 5.2. Mesaj alma

Alıcı cihazı:

1. Sunucudan yeni mesajları çeker.
2. `encrypted_session_key_for_receiver` alanını kendi `privateKey` ile çözer.
3. Elde edilen oturum anahtarı ile `ciphertext_message` çözümlenir.
4. Mesaj istemcide düz metin olarak gösterilir.
5. Sunucu `delivered_at` alanını günceller.

---

## 6. Kaybolan mesajlar ve iki taraftan silme

### 6.1. Kaybolan mesajlar (self destruct)

Mesaj oluştururken kullanıcı şu seçeneklerden birini seçebilir:
- Süresiz
- 10 saniye
- 1 dakika
- 1 saat
- 1 gün
- 1 hafta
gibi.

Süre kontrolü iki katmanda yapılabilir:

1. Sunucu tarafı:
   - Mesajın `expiry_seconds` alanı varsa
   - `hard_delete_at = sent_at + expiry_seconds` olarak set edilir.
   - Periyodik çalışan bir job, `hard_delete_at < now()` olan mesajları kalıcı olarak siler.

2. İstemci tarafı:
   - Mesaj açıldığında, cihaz üzerinde de süre sayacı başlar.
   - Süre dolduğunda mesaj görsel olarak listeden kaldırılır.
   - Kullanıcıdan gizlenen mesajlar için local cache de silinir.

Bu şekilde:
- Sunucu tarafında veri kalmaz.
- Kullanıcı cihazında da belirlenen süre sonunda mesajlar görünmez olur.

### 6.2. "İki taraftan da sil" özelliği

Kullanıcı belirli bir mesajı seçip:
- "Bu mesajı bende sil" veya
- "Bu mesajı bende ve karşı tarafta sil"

seçeneklerinden birini işaretleyebilir.

Teknik mantık:

- "Sende sil":
  - Sadece istemci local storage içinden mesaj kaldırılır.
- "Her iki tarafta sil":
  1. Sunucuya `delete_for_everyone` isteği gönderilir.
  2. Sunucu:
     - Mesajın veritabanı kaydını hard delete veya `deleted_at` ile işaretler.
     - Karşı tarafa bir "delete event" push eder.
  3. Karşı tarafın istemcisi:
     - Bu "mesaj silindi" eventini alır.
     - Kendi local cache içindeki bu mesaja ait düz metni siler.
     - İsterse "Bu mesaj silindi" placeholderı gösterebilir.

Not:
- İstemci local olarak log tutuyorsa, bu logların da senkronize davranması gerekir.
- Uygulamanın log mantığı gizlilik açısından minimal tutulmalıdır.

---

## 7. Backend API taslağı

Yüksek seviyede endpoint listesi:

### 7.1. Auth

- `POST /auth/register`
  - Input: `username`, `password`
  - Output: `access_token`, `user` bilgisi
- `POST /auth/login`
  - Input: `username`, `password`
  - Output: `access_token`, `user` bilgisi
- `GET /auth/me`
  - Token ile mevcut kullanıcıyı döner.

### 7.2. User

- `GET /users/search?query=...`
  - Kullanıcı adı arama
- `GET /users/:id`
  - Kullanıcı profili
  - Dikkat: `public_key` burada verilir.

### 7.3. Conversations

- `POST /conversations`
  - Direct veya grup sohbet oluşturma
- `GET /conversations`
  - Kullanıcının sohbet listesi
- `GET /conversations/:id`
  - Sohbet detayları

### 7.4. Messages

- `GET /conversations/:id/messages`
  - Sayfalama ile mesaj listesi
- `POST /conversations/:id/messages`
  - Şifreli mesaj gönderme
  - Input:
    - `ciphertext_message`
    - `encrypted_session_key_for_receiver`
    - `expiry_seconds` (opsiyonel)
- `DELETE /messages/:id`
  - Sende sil
- `POST /messages/:id/delete-for-everyone`
  - Hem sende hem karşı tarafta silme isteği

---

## 8. Mesh ve offline planı (gelecek sürüm)

V1 için klasik client - server modeli ile çalışılacak.

V2 için hedef:
- Cihazlar arası lokal ağ veya Bluetooth ile mesaj taşıyabilme
- Yine E2EE olacak.
- Sunucuya ulaşamasa bile, birbirine yakın cihazlar mesajı taşır.

Bu kısım için:
- Aynı şifreleme modelini koru.
- Sadece taşıma katmanını genişlet:
  - P2P bağlantı
  - Yakındaki cihazların keşfi
- Bu özellik opsiyonel bir mod olarak eklenebilir.

---

## 9. Gizlilik ve yasal notlar

- Uygulama gizliliğe saygı duyar.
- Kullanıcı verisi minimum seviyede toplanır.
- Telefon numarası, e posta gibi gerçek dünya kimlik bağlayıcı alanlar kullanılmaz.
- Yine de:
  - IP loglama
  - Güvenlik için asgari loglar
  gibi bazı veriler yasal zorunluluklar çerçevesinde bir süre tutulabilir.
- Kullanıcıya açık ve şeffaf bir gizlilik politikası gösterilir.

---

## 10. V1 için önerilen geliştirme sırası

1. Auth ve kullanıcı modeli
   - `register`, `login`
   - `username` unique kontrolü
2. İstemci tarafında key üretimi
   - `publicKey` sunucuya gönder
   - `privateKey` local şifreleme ile sakla
3. Basit tek yönlü mesaj gönderme
   - E2EE ile şifreli mesaj gönder
   - Alıcı tarafında çöz
4. Sohbet listeleri ve mesaj geçmişi
   - Konuşma bazlı listeleme
5. Kaybolan mesajlar (expiry)
   - Hem sunucu hem istemci tarafında silme
6. "İki tarafta da sil" özelliği
   - Soft delete ve event senkronizasyonu
7. UI düzeltmeleri, hata yönetimi, edge case temizliği

Bu doküman, Copilot ile backend ve mobil uygulamayı geliştirirken referans alınacak ana tasarım rehberidir.
