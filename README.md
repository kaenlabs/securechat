# 🔐 SecureChat - End-to-End Encrypted Messaging App

<div align="center">

![SecureChat](https://img.shields.io/badge/SecureChat-E2EE-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

**A privacy-focused messaging application with true end-to-end encryption**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Security](#-security) • [API](#-api-documentation)

</div>

---

## 📋 Overview

SecureChat is a modern messaging application that prioritizes user privacy and security. Unlike many messaging apps, SecureChat:

- ✅ **Generates encryption keys on your device** - Server never sees your private key
- ✅ **No phone number or email required** - Just username and password
- ✅ **Messages encrypted with NaCl** - Military-grade Curve25519 encryption
- ✅ **Server can't read your messages** - Zero-knowledge architecture
- ✅ **Self-destructing messages** - Set expiry time for automatic deletion
- ✅ **Delete for everyone** - Remove messages from all devices
- ✅ **Open source** - Audit the code yourself

## 🎯 Features

### Core Features
- 🔐 **End-to-End Encryption** using Curve25519 (X25519) key exchange
- 🔑 **Client-side key generation** with TweetNaCl
- 🛡️ **Private key encryption** using password-derived keys (Argon2id)
- 💬 **Direct messaging** between users
- 👥 **Group chats** (planned)
- ⏱️ **Self-destructing messages** with customizable expiry
- 🗑️ **Delete for everyone** functionality
- 🔍 **User search** by username

### Security Features
- Password hashing with **Argon2id** (memory: 64MB, iterations: 3, parallelism: 4)
- Secure key storage using:
  - **iOS Keychain** (iOS devices)
  - **EncryptedSharedPreferences** (Android devices)
- JWT-based authentication (7-day expiry)
- No metadata collection - no phone numbers, emails, or tracking

### Technical Features
- TypeScript for type safety
- React Native with Expo for cross-platform mobile
- Node.js backend with Express
- MongoDB for data storage
- Real-time message updates (polling - WebSocket coming soon)

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                           │
│                     (React Native)                          │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐          │
│  │   Crypto   │  │    Auth    │  │   Secure    │          │
│  │   Module   │  │  Context   │  │   Storage   │          │
│  │            │  │            │  │             │          │
│  │ • Generate │  │ • Login    │  │ • Keychain  │          │
│  │   keypair  │  │ • Register │  │ • Encrypted │          │
│  │ • Encrypt  │  │ • Logout   │  │   Prefs     │          │
│  │ • Decrypt  │  │            │  │             │          │
│  └────────────┘  └────────────┘  └─────────────┘          │
│                                                             │
│  All encryption/decryption happens here ↑                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS
                            │ (encrypted messages only)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                            │
│                    (Node.js + Express)                      │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐          │
│  │    Auth    │  │   Users    │  │  Messages   │          │
│  │  Service   │  │  Service   │  │   Service   │          │
│  │            │  │            │  │             │          │
│  │ • Hash pwd │  │ • Search   │  │ • Store     │          │
│  │   Argon2id │  │ • Get user │  │   cipher    │          │
│  │ • Issue    │  │            │  │ • Relay     │          │
│  │   JWT      │  │            │  │   encrypted │          │
│  └────────────┘  └────────────┘  └─────────────┘          │
│                                                             │
│  Server NEVER sees plaintext or private keys ↓             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       MongoDB                               │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Users Collection                                │       │
│  │ • username (unique)                             │       │
│  │ • passwordHash (Argon2id)                       │       │
│  │ • salt                                          │       │
│  │ • publicKey (Curve25519 - 32 bytes)            │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Messages Collection                             │       │
│  │ • ciphertextMessage (Base64 encrypted)          │       │
│  │ • encryptedSessionKey (Base64)                  │       │
│  │ • sender (ref to User)                          │       │
│  │ • conversation (ref)                            │       │
│  │ • sentAt, expirySeconds, hardDeleteAt           │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  NO PLAINTEXT STORED! ✅                                   │
└─────────────────────────────────────────────────────────────┘
```

### Encryption Flow

```
Alice wants to send "Hello Bob!" to Bob

1. Key Generation (one-time, during registration)
   Alice: privateKey_A + publicKey_A
   Bob:   privateKey_B + publicKey_B
   
2. Message Encryption
   a) Generate random sessionKey (32 bytes)
   b) Encrypt plaintext with sessionKey
      "Hello Bob!" → TweetNaCl.secretbox(sessionKey) → ciphertext
   
   c) Encrypt sessionKey with Bob's public key
      sessionKey → TweetNaCl.box(publicKey_B, privateKey_A) → encryptedSessionKey
   
3. Send to Server
   POST /messages/:conversationId
   {
     ciphertextMessage: "aG9sbG8gd29ybGQ...",
     encryptedSessionKey: "bXlzZXNzaW9ua2V5..."
   }
   
4. Bob Receives
   a) Decrypt sessionKey with his private key
      encryptedSessionKey → TweetNaCl.box.open(privateKey_B, publicKey_A) → sessionKey
   
   b) Decrypt message with sessionKey
      ciphertext → TweetNaCl.secretbox.open(sessionKey) → "Hello Bob!"
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (v6+)
- npm or yarn
- Expo Go app (for mobile testing)

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/securechat.git
cd securechat

# Install backend dependencies
cd backend
npm install

# Install mobile dependencies
cd ../mobile
npm install
```

### 2. Start MongoDB

```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

### 3. Start Backend

```bash
cd backend
npm run dev
```

Expected output:
```
Server running on port 3000
MongoDB connected successfully
```

### 4. Start Mobile App

```bash
cd mobile
npm start
```

Choose your platform:
- Press `w` for web browser
- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)
- Scan QR code with Expo Go app

### 5. Test It Out!

1. **Register two accounts**:
   - Alice: `alice` / `password123`
   - Bob: `bob` / `password456`

2. **Start a conversation**:
   - Alice → Search for "bob" → Tap "Chat"

3. **Send encrypted message**:
   - Type message → Send
   - Check Bob's app to see decrypted message!

For detailed testing guide, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## 🔐 Security

### Cryptographic Primitives

| Component | Algorithm | Key Size | Purpose |
|-----------|-----------|----------|---------|
| Key Exchange | Curve25519 (X25519) | 32 bytes | Generate shared secrets |
| Message Encryption | NaCl box (XSalsa20 + Poly1305) | 32 bytes | Encrypt messages |
| Private Key Encryption | NaCl secretbox (XSalsa20 + Poly1305) | 32 bytes | Protect private keys |
| Password Hashing | Argon2id | - | Hash user passwords |
| Key Derivation | SHA-512 | 64 bytes | Derive encryption key from password |

### Security Properties

✅ **Forward Secrecy**: Session keys are ephemeral (generated per message)  
✅ **Authentication**: Messages signed with sender's private key  
✅ **Integrity**: Poly1305 MAC prevents tampering  
✅ **Confidentiality**: Only recipient can decrypt with their private key  
✅ **Deniability**: No proof of who sent a message (unlike digital signatures)  

### Threat Model

**What SecureChat protects against:**
- ✅ Server compromise (messages remain encrypted)
- ✅ Network eavesdropping (TLS + E2EE)
- ✅ Mass surveillance (no metadata collection)
- ✅ Unauthorized message access (encryption at rest)

**What SecureChat does NOT protect against:**
- ❌ Compromised client device (malware, keyloggers)
- ❌ Physical device access (use app lock!)
- ❌ Social engineering attacks
- ❌ Screenshots (use screenshot protection in production)

### Known Limitations

1. **No Perfect Forward Secrecy**: Currently uses static Curve25519 keys. Implementing Double Ratchet (Signal Protocol) would provide PFS.

2. **Key Backup**: Keys are stored per-device. If device is lost, messages can't be recovered. Future: implement secure key backup.

3. **Group Chat Encryption**: Basic implementation. For production, use MLS (Messaging Layer Security) protocol.

4. **Metadata Leakage**: Server knows who talks to whom (conversation graph). Future: implement sealed sender or anonymous routing.

## 📚 API Documentation

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "username": "alice",
  "password": "password123",
  "publicKey": "base64_encoded_public_key"
}

Response: 201 Created
{
  "accessToken": "jwt_token",
  "user": {
    "id": "65f...",
    "username": "alice",
    "publicKey": "...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "password123"
}

Response: 200 OK
{
  "accessToken": "jwt_token",
  "user": { ... }
}
```

### Users

#### Search Users
```http
GET /users/search?q=alice
Authorization: Bearer jwt_token

Response: 200 OK
[
  {
    "id": "65f...",
    "username": "alice",
    "publicKey": "...",
    "createdAt": "..."
  }
]
```

### Conversations

#### Create Conversation
```http
POST /conversations
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "type": "direct",
  "recipientId": "65f..."
}

Response: 201 Created
{
  "_id": "65f...",
  "type": "direct",
  "userA": { ... },
  "userB": { ... },
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### Get User Conversations
```http
GET /conversations
Authorization: Bearer jwt_token

Response: 200 OK
[
  {
    "_id": "65f...",
    "type": "direct",
    "userA": { ... },
    "userB": { ... }
  }
]
```

### Messages

#### Send Message
```http
POST /messages/:conversationId
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "ciphertextMessage": "base64_encrypted_message",
  "encryptedSessionKey": "base64_encrypted_session_key",
  "expirySeconds": 3600  // optional
}

Response: 201 Created
{
  "_id": "65f...",
  "conversation": "65f...",
  "sender": { ... },
  "ciphertextMessage": "...",
  "encryptedSessionKey": "...",
  "sentAt": "...",
  "expirySeconds": 3600,
  "hardDeleteAt": "..."
}
```

#### Get Messages
```http
GET /messages/:conversationId?limit=50&beforeMessageId=65f...
Authorization: Bearer jwt_token

Response: 200 OK
[
  {
    "_id": "65f...",
    "sender": { ... },
    "ciphertextMessage": "...",
    "encryptedSessionKey": "...",
    "sentAt": "..."
  }
]
```

#### Delete Message
```http
DELETE /messages/:messageId
Authorization: Bearer jwt_token

Response: 204 No Content
```

#### Delete for Everyone
```http
DELETE /messages/:messageId/delete-for-everyone
Authorization: Bearer jwt_token

Response: 204 No Content
```

## 🛠️ Development

### Project Structure

```
securechat/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── models/           # Mongoose models
│   │   ├── modules/          # Feature modules
│   │   │   ├── auth/         # Authentication
│   │   │   ├── users/        # User management
│   │   │   ├── conversations/# Conversation logic
│   │   │   └── messages/     # Message handling
│   │   ├── middleware/       # Express middleware
│   │   └── main.ts           # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/
│   ├── src/
│   │   ├── config/           # API configuration
│   │   ├── contexts/         # React contexts
│   │   ├── crypto/           # Encryption logic
│   │   ├── screens/          # UI screens
│   │   ├── services/         # API services
│   │   └── types/            # TypeScript types
│   ├── App.tsx               # Root component
│   └── package.json
│
├── QUICKSTART.md             # Quick setup guide
├── TESTING_GUIDE.md          # Comprehensive testing guide
└── README.md                 # This file
```

### Running Tests

```bash
# Backend tests (TODO)
cd backend
npm test

# Mobile tests (TODO)
cd mobile
npm test
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Mobile
cd mobile
eas build --platform android  # or ios
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check MongoDB is running
mongosh --eval "db.version()"

# Check port 3000 is free
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux
```

### Mobile app can't connect
1. Check `mobile/src/config/api.ts` has correct URL
2. For physical devices, use your computer's local IP:
   ```typescript
   BASE_URL: 'http://192.168.1.100:3000'  // Not localhost!
   ```
3. Check firewall allows port 3000

### Messages won't decrypt
1. Check both users have generated keys
2. Verify public keys match in database
3. Check console for decryption errors

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for more troubleshooting tips.

## 📈 Roadmap

### Phase 1: Core Features (Current)
- [x] End-to-end encryption
- [x] User registration/login
- [x] Direct messaging
- [x] Message deletion
- [x] Self-destructing messages

### Phase 2: Enhanced Security
- [ ] Perfect Forward Secrecy (Double Ratchet)
- [ ] Key verification (safety numbers)
- [ ] Screenshot protection
- [ ] App lock (PIN/biometric)
- [ ] Secure file deletion

### Phase 3: Features
- [ ] WebSocket for real-time messages
- [ ] Push notifications
- [ ] Image/file encryption
- [ ] Voice messages
- [ ] Video calls (WebRTC + SRTP)
- [ ] Group chats with MLS

### Phase 4: Production Ready
- [ ] Comprehensive tests
- [ ] Security audit
- [ ] Performance optimization
- [ ] iOS/Android release
- [ ] Backend scaling (Redis, load balancer)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Security Issues

If you discover a security vulnerability, please email security@securechat.example instead of using the issue tracker.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TweetNaCl.js](https://github.com/dchest/tweetnacl-js) - Cryptographic library
- [Argon2](https://github.com/P-H-C/phc-winner-argon2) - Password hashing
- [Signal Protocol](https://signal.org/docs/) - Encryption protocol inspiration
- [Matrix](https://matrix.org/) - Federation and E2EE patterns

## 📞 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: contact@securechat.example
- Website: https://securechat.example

---

<div align="center">

**Built with ❤️ and 🔐 by developers who care about privacy**

[⬆ Back to top](#-securechat---end-to-end-encrypted-messaging-app)

</div>
