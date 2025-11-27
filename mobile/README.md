# SecureChat Mobile

React Native (Expo) client for SecureChat - End-to-End Encrypted Messaging

## Features

- 🔐 **End-to-End Encryption** - Messages encrypted on device using Curve25519 + AES-GCM
- 🔑 **Secure Key Storage** - Private keys encrypted with user password, never leave device
- 📱 **Cross-platform** - iOS, Android, and Web support
- 🚀 **Real-time** - Fast message delivery
- 🔒 **Privacy-first** - No phone numbers, emails, or personal data required

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: React Context + Hooks
- **Crypto**: @noble/curves (Curve25519), TweetNaCl (AES-GCM)
- **Storage**: Expo SecureStore (encrypted), AsyncStorage
- **HTTP Client**: Axios

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure backend URL:
Edit `src/config/api.ts` and set your backend URL

3. Start development server:
```bash
npm start
```

4. Run on device/emulator:
```bash
npm run android  # Android
npm run ios      # iOS (macOS only)
npm run web      # Web browser
```

## Project Structure

```
src/
├── config/         # API configuration
├── crypto/         # E2EE implementation
├── contexts/       # React contexts (Auth, etc.)
├── screens/        # Screen components
├── components/     # Reusable components
├── services/       # API services
├── types/          # TypeScript types
└── utils/          # Helper functions
```

## E2EE Flow

### Registration
1. User enters username + password
2. App generates Curve25519 keypair on device
3. Public key sent to server
4. Private key encrypted with password-derived key (Argon2-like)
5. Encrypted private key stored in SecureStore

### Login
1. User enters username + password
2. Retrieve encrypted private key from SecureStore
3. Derive key from password
4. Decrypt private key (kept in memory)

### Sending Message
1. Generate random 256-bit session key
2. Encrypt message with session key (AES-GCM)
3. Get recipient's public key from server
4. Encrypt session key with recipient's public key (X25519)
5. Send both encrypted payloads to server

### Receiving Message
1. Fetch encrypted message from server
2. Decrypt session key with your private key
3. Decrypt message with session key
4. Display plaintext

## Security Notes

- Private keys NEVER sent to server
- Server only sees encrypted messages
- Keys stored encrypted in device secure storage
- Password never stored, only used for key derivation
- Perfect Forward Secrecy with session keys

## License

MIT
