# SecureChat Backend

Backend API for SecureChat - End-to-End Encrypted Messaging Application

## Architecture

This backend follows the secure chat architecture defined in `docs/secure-chat-architecture.md`.

### Key Security Features

- **Password Storage**: Argon2id with user-specific salts
- **E2EE**: Messages are stored encrypted, server never sees plaintext
- **Key Management**: Public keys stored on server, private keys never leave client devices
- **Message Expiry**: Self-destructing messages with both server and client-side deletion
- **Minimal Metadata**: No phone numbers or emails collected

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT
- **Password Hashing**: Argon2id
- **Validation**: class-validator

## Project Structure

```
src/
├── config/          # Database, env configuration
├── entities/        # TypeORM entities
├── modules/
│   ├── auth/        # Authentication (register, login)
│   ├── users/       # User management
│   ├── conversations/  # Chat conversations
│   └── messages/    # Message handling
├── middleware/      # Auth, error handling
├── utils/          # Helpers, logger
└── main.ts         # Application entry point
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string if needed
```

3. Start MongoDB:
```bash
# MongoDB should be running on localhost:27017
# Check with: mongosh
```

4. Start development server:
```bash
npm run dev
```

MongoDB will automatically create the `securechat` database and collections on first use.

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Users
- `GET /users/search?query=username` - Search users
- `GET /users/:id` - Get user profile (includes public_key)

### Conversations
- `GET /conversations` - List user's conversations
- `POST /conversations` - Create new conversation
- `GET /conversations/:id` - Get conversation details

### Messages
- `GET /conversations/:id/messages` - List messages (paginated)
- `POST /conversations/:id/messages` - Send encrypted message
- `DELETE /messages/:id` - Delete message (self only)
- `POST /messages/:id/delete-for-everyone` - Delete for all participants

## Security Notes

- All message content is stored encrypted
- Server only handles encrypted payloads
- Client-side encryption/decryption required
- Private keys never transmitted to server
- Argon2id with secure parameters for password hashing

## Development

```bash
# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
```

## License

MIT
