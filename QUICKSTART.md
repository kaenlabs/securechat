# SecureChat Mobile - Quick Start Guide

## Prerequisites
- Node.js installed
- MongoDB running (for backend)
- Backend server running on http://localhost:3000

## Installation

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Mobile App Setup
```bash
cd mobile
npm install
npm start
```

### 3. Run on Device

**Option A: Physical Device**
1. Install Expo Go app on your phone
2. Scan QR code from terminal

**Option B: Emulator**
```bash
npm run android  # Android emulator
npm run ios      # iOS simulator (macOS only)
```

**Option C: Web Browser**
```bash
npm run web
```

## Testing the App

### 1. Create an Account
1. Open the app
2. Click "Register"
3. Enter username and password (min 8 chars)
4. App generates encryption keys automatically
5. Account created!

### 2. Login
1. Enter your credentials
2. App decrypts your private key with password
3. You're logged in!

### 3. View Profile
- See your username in the home screen
- Keys are securely stored on device

## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
│                 │
│  • Generates    │
│    keypair      │
│  • Encrypts/    │
│    decrypts     │
│    messages     │
│  • Stores keys  │
│    securely     │
└────────┬────────┘
         │
         │ HTTPS
         │ (encrypted messages only)
         ▼
┌─────────────────┐
│  Backend API    │
│  (Node.js)      │
│                 │
│  • Stores       │
│    encrypted    │
│    messages     │
│  • Relays data  │
│  • Never sees   │
│    plaintext    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MongoDB        │
│                 │
│  • Users        │
│  • Encrypted    │
│    messages     │
│  • Public keys  │
└─────────────────┘
```

## Security Features

✅ **Keys generated on device** - Never sent to server  
✅ **Private key encrypted** - With user password  
✅ **E2EE messages** - Server can't read content  
✅ **Secure storage** - Expo SecureStore for keys  
✅ **No metadata** - No phone numbers or emails  

## API Configuration

Edit `src/config/api.ts` to change backend URL:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://YOUR_IP:3000', // Change this for physical devices
  TIMEOUT: 10000,
};
```

**Note for physical devices**: Use your computer's local IP address instead of `localhost`.

## Troubleshooting

**Can't connect to backend:**
- Check backend is running
- For physical devices, use local IP (e.g., `http://192.168.1.100:3000`)
- Check firewall settings

**Registration fails:**
- Check backend logs
- Verify MongoDB is running
- Check network connection

**Login fails:**
- Verify username/password
- Check if account was created successfully
- Check backend is accessible

## Next Steps

To add more features:
1. User search screen
2. Start conversation
3. Chat screen with encryption
4. Message list
5. Real-time updates (WebSocket)

## Current Status

✅ Backend API ready  
✅ MongoDB configured  
✅ Crypto module complete  
✅ Auth flow implemented  
✅ Login/Register screens  
✅ Basic navigation  
⏳ Chat functionality (next)  
⏳ Message encryption flow  
⏳ Real-time messaging  

Happy coding! 🚀🔐
