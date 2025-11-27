import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authService } from '../services/auth.service';
import { generateKeyPair, encryptPrivateKey, decryptPrivateKey } from '../crypto/encryption';

const PRIVATE_KEY_STORAGE_KEY = '@securechat:encrypted_private_key';
const PUBLIC_KEY_STORAGE_KEY = '@securechat:public_key';

interface AuthContextType {
  user: User | null;
  privateKey: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      
      // Try to load stored keys
      const storedPublicKey = await AsyncStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
      if (storedPublicKey) {
        // Keys exist but privateKey needs password to decrypt
        // Will be decrypted on login
      }
    } catch (error) {
      // Not authenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // Generate keypair on device
      const keyPair = generateKeyPair();
      
      // Encrypt private key with password
      const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, password);
      
      // Register with backend (send public key)
      const authResponse = await authService.register(username, password, keyPair.publicKey);
      
      // Store encrypted private key in storage
      await AsyncStorage.setItem(PRIVATE_KEY_STORAGE_KEY, encryptedPrivateKey);
      await AsyncStorage.setItem(PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);
      
      // Keep private key in memory
      setPrivateKey(keyPair.privateKey);
      setUser(authResponse.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // Login with backend
      const authResponse = await authService.login(username, password);
      
      // Load encrypted private key from storage
      const encryptedPrivateKey = await AsyncStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
      
      if (!encryptedPrivateKey) {
        throw new Error('Private key not found. Please register again.');
      }
      
      // Decrypt private key with password
      const decryptedPrivateKey = decryptPrivateKey(encryptedPrivateKey, password);
      
      if (!decryptedPrivateKey) {
        throw new Error('Invalid password or corrupted private key');
      }
      
      // Keep private key in memory
      setPrivateKey(decryptedPrivateKey);
      setUser(authResponse.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setPrivateKey(null);
      
      // Optionally clear stored keys (or keep for next login)
      // await AsyncStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
      // await AsyncStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        privateKey,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
