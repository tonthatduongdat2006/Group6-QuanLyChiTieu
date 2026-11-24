// Adapter kho bảo mật OS (Keychain iOS / Keystore Android). Trên web (chỉ để xem thử) → bộ nhớ, KHÔNG localStorage.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { SecureStorage } from './session';

const memory = new Map<string, string>();

export const secureStorage: SecureStorage =
  Platform.OS === 'web'
    ? {
        getItem: async (k) => memory.get(k) ?? null,
        setItem: async (k, v) => void memory.set(k, v),
        deleteItem: async (k) => void memory.delete(k),
      }
    : {
        getItem: (k) => SecureStore.getItemAsync(k),
        setItem: (k, v) => SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
        deleteItem: (k) => SecureStore.deleteItemAsync(k),
      };
