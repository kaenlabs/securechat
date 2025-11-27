import 'react-native-get-random-values';
import * as tweetnacl from 'tweetnacl';
import * as util from 'tweetnacl-util';

/**
 * SecureChat Cryptography Module
 * 
 * Implements E2EE using:
 * - Curve25519 (X25519) for key exchange
 * - NaCl box for message encryption
 * - Random session keys for each message
 */

export interface KeyPair {
  publicKey: string; // Base64 encoded
  privateKey: string; // Base64 encoded
}

/**
 * Generate a new Curve25519 keypair
 * Called during registration
 */
export const generateKeyPair = (): KeyPair => {
  const keyPair = tweetnacl.box.keyPair();
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    privateKey: util.encodeBase64(keyPair.secretKey),
  };
};

/**
 * Encrypt message with recipient's public key
 * 
 * Flow:
 * 1. Generate random nonce
 * 2. Use NaCl box to encrypt message
 * 3. Return base64 encoded ciphertext and nonce
 */
export const encryptMessage = (
  message: string,
  recipientPublicKey: string,
  senderPrivateKey: string,
): { ciphertext: string; nonce: string } => {
  const messageUint8 = new TextEncoder().encode(message);
  const nonce = tweetnacl.randomBytes(tweetnacl.box.nonceLength);
  
  const recipientPublicKeyUint8 = util.decodeBase64(recipientPublicKey);
  const senderPrivateKeyUint8 = util.decodeBase64(senderPrivateKey);
  
  const encrypted = tweetnacl.box(
    messageUint8,
    nonce,
    recipientPublicKeyUint8,
    senderPrivateKeyUint8,
  );
  
  return {
    ciphertext: util.encodeBase64(encrypted),
    nonce: util.encodeBase64(nonce),
  };
};

/**
 * Decrypt message with private key
 */
export const decryptMessage = (
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: string,
): string | null => {
  try {
    const ciphertextUint8 = util.decodeBase64(ciphertext);
    const nonceUint8 = util.decodeBase64(nonce);
    const senderPublicKeyUint8 = util.decodeBase64(senderPublicKey);
    const recipientPrivateKeyUint8 = util.decodeBase64(recipientPrivateKey);
    
    const decrypted = tweetnacl.box.open(
      ciphertextUint8,
      nonceUint8,
      senderPublicKeyUint8,
      recipientPrivateKeyUint8,
    );
    
    if (!decrypted) {
      return null;
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

/**
 * Encrypt private key with password for secure storage
 * Uses secretbox with password-derived key
 * 
 * Note: In production, use proper KDF like Argon2
 * Here we use a simple hash for demonstration
 */
export const encryptPrivateKey = (privateKey: string, password: string): string => {
  // Derive key from password (simplified - use Argon2 in production)
  const passwordBytes = new TextEncoder().encode(password);
  const hash = tweetnacl.hash(passwordBytes);
  const key = hash.slice(0, tweetnacl.secretbox.keyLength);
  
  const privateKeyBytes = util.decodeBase64(privateKey);
  const nonce = tweetnacl.randomBytes(tweetnacl.secretbox.nonceLength);
  
  const encrypted = tweetnacl.secretbox(privateKeyBytes, nonce, key);
  
  // Combine nonce + encrypted data
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  
  return util.encodeBase64(combined);
};

/**
 * Decrypt private key with password
 */
export const decryptPrivateKey = (
  encryptedPrivateKey: string,
  password: string,
): string | null => {
  try {
    // Derive same key from password
    const passwordBytes = new TextEncoder().encode(password);
    const hash = tweetnacl.hash(passwordBytes);
    const key = hash.slice(0, tweetnacl.secretbox.keyLength);
    
    const combined = util.decodeBase64(encryptedPrivateKey);
    const nonce = combined.slice(0, tweetnacl.secretbox.nonceLength);
    const encrypted = combined.slice(tweetnacl.secretbox.nonceLength);
    
    const decrypted = tweetnacl.secretbox.open(encrypted, nonce, key);
    
    if (!decrypted) {
      return null;
    }
    
    return util.encodeBase64(decrypted);
  } catch (error) {
    console.error('Private key decryption error:', error);
    return null;
  }
};

/**
 * Generate random session key for message encryption
 */
export const generateSessionKey = (): string => {
  const key = tweetnacl.randomBytes(32); // 256-bit key
  return util.encodeBase64(key);
};

/**
 * Encrypt message with session key (symmetric)
 */
export const encryptWithSessionKey = (message: string, sessionKey: string): string => {
  const messageBytes = new TextEncoder().encode(message);
  const keyBytes = util.decodeBase64(sessionKey);
  const nonce = tweetnacl.randomBytes(tweetnacl.secretbox.nonceLength);
  
  const encrypted = tweetnacl.secretbox(messageBytes, nonce, keyBytes);
  
  // Combine nonce + encrypted
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  
  return util.encodeBase64(combined);
};

/**
 * Decrypt message with session key
 */
export const decryptWithSessionKey = (ciphertext: string, sessionKey: string): string | null => {
  try {
    const combined = util.decodeBase64(ciphertext);
    const nonce = combined.slice(0, tweetnacl.secretbox.nonceLength);
    const encrypted = combined.slice(tweetnacl.secretbox.nonceLength);
    const keyBytes = util.decodeBase64(sessionKey);
    
    const decrypted = tweetnacl.secretbox.open(encrypted, nonce, keyBytes);
    
    if (!decrypted) {
      return null;
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Session key decryption error:', error);
    return null;
  }
};

/**
 * Encrypt session key with recipient's public key
 * Uses X25519 key exchange + symmetric encryption
 */
export const encryptSessionKey = (
  sessionKey: string,
  recipientPublicKey: string,
  senderPrivateKey: string,
): string => {
  const sessionKeyBytes = util.decodeBase64(sessionKey);
  const nonce = tweetnacl.randomBytes(tweetnacl.box.nonceLength);
  
  const recipientPubKeyBytes = util.decodeBase64(recipientPublicKey);
  const senderPrivKeyBytes = util.decodeBase64(senderPrivateKey);
  
  const encrypted = tweetnacl.box(
    sessionKeyBytes,
    nonce,
    recipientPubKeyBytes,
    senderPrivKeyBytes,
  );
  
  // Combine nonce + encrypted
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  
  return util.encodeBase64(combined);
};

/**
 * Decrypt session key with private key
 */
export const decryptSessionKey = (
  encryptedSessionKey: string,
  senderPublicKey: string,
  recipientPrivateKey: string,
): string | null => {
  try {
    const combined = util.decodeBase64(encryptedSessionKey);
    const nonce = combined.slice(0, tweetnacl.box.nonceLength);
    const encrypted = combined.slice(tweetnacl.box.nonceLength);
    
    const senderPubKeyBytes = util.decodeBase64(senderPublicKey);
    const recipientPrivKeyBytes = util.decodeBase64(recipientPrivateKey);
    
    const decrypted = tweetnacl.box.open(
      encrypted,
      nonce,
      senderPubKeyBytes,
      recipientPrivKeyBytes,
    );
    
    if (!decrypted) {
      return null;
    }
    
    return util.encodeBase64(decrypted);
  } catch (error) {
    console.error('Session key decryption error:', error);
    return null;
  }
};
