# SecureChat - Complete Installation & Testing Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Backend
```bash
cd backend
npm install
npm run dev
```

Expected output:
```
Server running on port 3000
MongoDB connected successfully
```

### Step 2: Start Mobile App
```bash
cd mobile
npm install
npm start
```

Choose your platform:
- Press `w` for web browser
- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)
- Scan QR code with Expo Go app on your phone

---

## 📱 Testing the Complete E2EE Flow

### Test Scenario: Two users sending encrypted messages

#### User 1: Alice
1. **Register**
   - Open app → Tap "Register"
   - Username: `alice`
   - Password: `password123`
   - Tap "Register"
   - ✅ Keys generated on device
   - ✅ Private key encrypted with password
   - ✅ Redirected to Home screen

2. **Check Home Screen**
   - Should see: "Logged in as: alice"
   - Empty conversation list
   - Tap 🔍 to search

3. **Search for Bob**
   - Type: `bob`
   - Tap Search
   - Should see: "No users found" (Bob doesn't exist yet)

#### User 2: Bob (Use another device/browser)
1. **Register Bob's Account**
   - Username: `bob`
   - Password: `password456`
   - ✅ Bob's keys generated

#### Back to Alice
1. **Search for Bob Again**
   - Type: `bob`
   - Tap Search
   - ✅ Should see Bob with public key: `🔑 abc12345...`

2. **Start Conversation**
   - Tap "Chat" button next to Bob
   - ✅ Conversation created
   - ✅ Redirected to Chat screen
   - Should see: "🔒 End-to-end encrypted"

3. **Send Encrypted Message**
   - Type: `Hello Bob! This is E2EE 🔐`
   - Tap Send (➤)
   - ✅ Message encrypted with session key
   - ✅ Session key encrypted with Bob's public key
   - ✅ Sent to server (server sees only ciphertext)

#### Bob's Side
1. **Check Home Screen**
   - Pull to refresh
   - ✅ Should see conversation with Alice

2. **Open Chat with Alice**
   - Tap on Alice's conversation
   - ✅ Should see Alice's message decrypted:
     `Hello Bob! This is E2EE 🔐`

3. **Reply to Alice**
   - Type: `Hi Alice! Got your encrypted message! 🎉`
   - Tap Send
   - ✅ Message encrypted for Alice

#### Back to Alice
1. **Check for Bob's Reply**
   - Wait 3 seconds (auto-refresh)
   - ✅ Should see Bob's decrypted message

### ✅ What Just Happened?
1. **Key Generation**: Both users generated Curve25519 keypairs on their devices
2. **Private Key Protection**: Private keys encrypted with Argon2id-derived password key
3. **Key Exchange**: Public keys exchanged through server
4. **Message Encryption**: 
   - Alice: plaintext → session key encryption → session key encrypted with Bob's public key
   - Server: stores only ciphertext + encrypted session key
   - Bob: decrypts session key with his private key → decrypts message
5. **Zero-Knowledge Server**: Server never sees plaintext or private keys

---

## 🔐 Architecture Verification

### Check Cryptography Implementation

**View Backend Data (MongoDB)**
```bash
mongosh
use securechat
db.messages.findOne()
```

You should see:
```json
{
  "sender": "65f...",
  "ciphertextMessage": "aG9sbG8gd29ybGQ...",  // ← Base64 ciphertext
  "encryptedSessionKey": "bXlzZXNzaW9ua2V5...", // ← Base64 encrypted key
  "sentAt": "2024-01-01T12:00:00.000Z"
}
```

**✅ Verify**: No plaintext visible!

### Check Private Key Storage (Mobile)

Private keys are stored in:
- iOS: Keychain Services
- Android: EncryptedSharedPreferences
- Format: `encrypted_private_key_{username}` → encrypted with password

**Security Check**: Even if attacker gets phone access, private key is:
1. Encrypted with user's password (not stored anywhere)
2. Requires password to decrypt
3. Password is hashed with Argon2id (slow to bruteforce)

---

## 🧪 Advanced Testing Scenarios

### Test 1: Message Deletion
```
1. Alice sends: "Test message"
2. Alice long-presses message
3. Choose "Delete for everyone"
4. ✅ Message deleted from server
5. ✅ Bob sees it disappear
```

### Test 2: Self-Destructing Messages
**Coming soon**: Set `expirySeconds` when sending
```typescript
await messagesService.sendMessage(
  conversationId,
  ciphertext,
  encryptedKey,
  3600 // Delete after 1 hour
);
```

### Test 3: Multiple Devices
**Current limitation**: Keys stored per-device
- Alice on phone A: different keys than Alice on phone B
- Solution needed: Key backup/sync (future feature)

### Test 4: Offline Message Queue
**Current behavior**: Messages require internet
- Future: Store encrypted messages locally, send when online

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check MongoDB is running
mongosh --eval "db.version()"

# Check port 3000 is free
netstat -ano | findstr :3000

# Check logs
cd backend
npm run dev
```

### Mobile app won't connect
1. **Check API URL** in `mobile/src/config/api.ts`:
   ```typescript
   BASE_URL: 'http://192.168.1.100:3000' // Use your computer's IP
   ```

2. **Find your IP**:
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

3. **Check firewall**: Allow port 3000

### Messages won't decrypt
1. **Check console**: `console.log` in ChatScreen will show errors
2. **Verify keys**: Check both users have public keys in database
3. **Test crypto functions**:
   ```typescript
   const keys = generateKeyPair();
   const { ciphertext, sessionKey } = encryptWithSessionKey('test');
   const plaintext = decryptWithSessionKey(ciphertext, sessionKey);
   console.log(plaintext); // Should be 'test'
   ```

### Registration fails
1. **Check backend logs**: Look for validation errors
2. **Try different username**: May already exist
3. **Check MongoDB**: `db.users.find()`

---

## 📊 Performance Metrics

**Expected Performance**:
- Key generation: < 100ms
- Message encryption: < 50ms
- Message decryption: < 50ms
- API latency: < 200ms (local)
- Message load: < 500ms for 50 messages

**Monitor**:
```typescript
const start = Date.now();
const encrypted = encryptWithSessionKey(text);
console.log(`Encryption took: ${Date.now() - start}ms`);
```

---

## 🎯 Next Steps

### Immediate Improvements
- [ ] WebSocket for real-time messages (no polling)
- [ ] Message read receipts
- [ ] Typing indicators
- [ ] Push notifications
- [ ] Image/file encryption
- [ ] Voice messages (encrypted)

### Security Enhancements
- [ ] Perfect forward secrecy (Double Ratchet)
- [ ] Key verification (QR code/safety numbers)
- [ ] Screenshot detection
- [ ] App lock (PIN/biometric)
- [ ] Secure file deletion

### UX Improvements
- [ ] Message reactions
- [ ] Reply to specific message
- [ ] Message search
- [ ] Dark mode
- [ ] Custom themes

---

## 📚 Technical Documentation

### Encryption Flow Diagram
```
┌─────────────┐                    ┌─────────────┐
│   Alice     │                    │     Bob     │
│             │                    │             │
│ privateKey_A│                    │ privateKey_B│
│ publicKey_A │                    │ publicKey_B │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ 1. Generate sessionKey           │
       │                                  │
       │ 2. plaintext → encrypt(sessionKey)
       │    = ciphertext                  │
       │                                  │
       │ 3. sessionKey → encrypt(publicKey_B, privateKey_A)
       │    = encryptedSessionKey         │
       │                                  │
       ├────────────┐                     │
       │            ▼                     │
       │      ┌──────────┐                │
       │      │  Server  │                │
       │      │          │                │
       │      │ Stores:  │                │
       │      │ ├ ciphertext              │
       │      │ └ encryptedSessionKey     │
       │      └────┬─────┘                │
       │           │                      │
       │           │                      │
       │           └──────────────────────┤
       │                                  │
       │                                  ▼
       │                4. decrypt(encryptedSessionKey, privateKey_B)
       │                   = sessionKey   
       │                                  │
       │                5. decrypt(ciphertext, sessionKey)
       │                   = plaintext    │
       │                                  │
       └──────────────────────────────────┘
```

### Key Storage Security
```
User Password
      ↓
  Argon2id hash (memory: 64MB, iterations: 3)
      ↓
  Encryption Key (32 bytes)
      ↓
  Encrypt Private Key (TweetNaCl secretbox)
      ↓
  Store in SecureStore
```

---

## 🆘 Support

**Check logs**:
- Backend: Console output
- Mobile: React Native debugger / Expo console

**Common issues**:
1. "Failed to connect" → Check API_CONFIG.BASE_URL
2. "Decryption failed" → Keys mismatch, check registration
3. "MongoDB connection failed" → Start MongoDB service

Happy testing! 🚀🔐

