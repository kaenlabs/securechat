# SecureChat Backend - API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### Health Check
**GET** `/health`

Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T10:00:00.000Z"
}
```

---

## Authentication

### Register
**POST** `/auth/register`

Register a new user.

**Request Body:**
```json
{
  "username": "alice",
  "password": "SecurePass123",
  "publicKey": "base64_encoded_public_key"
}
```

**Response:** `201 Created`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "alice",
    "publicKey": "base64_encoded_public_key",
    "createdAt": "2025-11-27T10:00:00.000Z"
  }
}
```

### Login
**POST** `/auth/login`

Authenticate user.

**Request Body:**
```json
{
  "username": "alice",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "alice",
    "publicKey": "base64_encoded_public_key",
    "createdAt": "2025-11-27T10:00:00.000Z"
  }
}
```

### Get Current User
**GET** `/auth/me`

Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "alice",
  "publicKey": "base64_encoded_public_key",
  "createdAt": "2025-11-27T10:00:00.000Z"
}
```

---

## Users

### Search Users
**GET** `/users/search?query=alice`

Search users by username.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `query` (string, required): Username to search

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "username": "alice",
    "publicKey": "base64_encoded_public_key",
    "createdAt": "2025-11-27T10:00:00.000Z"
  }
]
```

### Get User by ID
**GET** `/users/:id`

Get user profile (includes public key for E2EE).

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "alice",
  "publicKey": "base64_encoded_public_key",
  "createdAt": "2025-11-27T10:00:00.000Z"
}
```

---

## Conversations

### Get Conversations
**GET** `/conversations`

Get all conversations for current user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "type": "direct",
    "userAId": "uuid",
    "userBId": "uuid",
    "groupName": null,
    "createdAt": "2025-11-27T10:00:00.000Z",
    "updatedAt": "2025-11-27T10:05:00.000Z"
  }
]
```

### Create Conversation
**POST** `/conversations`

Create a new conversation (direct or group).

**Headers:** `Authorization: Bearer <token>`

**Request Body (Direct):**
```json
{
  "type": "direct",
  "otherUserId": "uuid"
}
```

**Request Body (Group):**
```json
{
  "type": "group",
  "groupName": "Team Chat",
  "memberIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "type": "direct",
  "userAId": "uuid",
  "userBId": "uuid",
  "createdAt": "2025-11-27T10:00:00.000Z",
  "updatedAt": "2025-11-27T10:00:00.000Z"
}
```

### Get Conversation Details
**GET** `/conversations/:id`

Get conversation by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "type": "direct",
  "userAId": "uuid",
  "userBId": "uuid",
  "createdAt": "2025-11-27T10:00:00.000Z",
  "updatedAt": "2025-11-27T10:00:00.000Z"
}
```

---

## Messages

### Get Messages
**GET** `/conversations/:id/messages?limit=50&offset=0`

Get messages for a conversation (paginated, newest first).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (number, optional): Default 50
- `offset` (number, optional): Default 0

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "ciphertextMessage": "encrypted_content",
    "encryptedSessionKey": "encrypted_key",
    "sentAt": "2025-11-27T10:05:00.000Z",
    "deliveredAt": null,
    "expirySeconds": 3600,
    "hardDeleteAt": "2025-11-27T11:05:00.000Z",
    "deletedAt": null
  }
]
```

### Send Message
**POST** `/conversations/:id/messages`

Send an encrypted message.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "ciphertextMessage": "encrypted_message_content",
  "encryptedSessionKey": "session_key_encrypted_with_recipient_public_key",
  "expirySeconds": 3600
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderId": "uuid",
  "ciphertextMessage": "encrypted_content",
  "encryptedSessionKey": "encrypted_key",
  "sentAt": "2025-11-27T10:05:00.000Z",
  "deliveredAt": null,
  "expirySeconds": 3600,
  "hardDeleteAt": "2025-11-27T11:05:00.000Z",
  "deletedAt": null
}
```

### Delete Message (Self)
**DELETE** `/messages/:id`

Delete message for yourself only.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

### Delete Message (Everyone)
**POST** `/messages/:id/delete-for-everyone`

Delete message for all participants (sender only).

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Message deleted for everyone"
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request**
```json
{
  "status": "error",
  "message": "Validation failed: ..."
}
```

**401 Unauthorized**
```json
{
  "status": "error",
  "message": "No token provided"
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "Access denied"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## E2EE Flow

### Message Encryption (Client-side)
1. Generate random session key (256-bit)
2. Encrypt message with session key (AES-GCM)
3. Encrypt session key with recipient's public key (Curve25519 or similar)
4. Send both encrypted payloads to server

### Message Decryption (Client-side)
1. Retrieve encrypted message and encrypted session key from server
2. Decrypt session key with your private key
3. Decrypt message with decrypted session key
4. Display plaintext message

**Server never sees plaintext messages or private keys!**
