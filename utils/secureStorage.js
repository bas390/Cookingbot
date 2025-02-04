import AsyncStorage from '@react-native-async-storage/async-storage';

// Base64 encoding/decoding functions
const toBase64 = (str) => {
  try {
    return btoa(encodeURIComponent(str));
  } catch (error) {
    return str;
  }
};

const fromBase64 = (str) => {
  try {
    return decodeURIComponent(atob(str));
  } catch (error) {
    return str;
  }
};

// Simple encryption/decryption functions
const encrypt = (text, key) => {
  try {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return toBase64(result);
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

const decrypt = (encoded, key) => {
  try {
    const text = fromBase64(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    return encoded;
  }
};

// Simple encryption key
const ENCRYPTION_KEY = 'cookingbot-secure-storage-key-2024';

export const secureStorage = {
  setItem: async (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const encryptedValue = encrypt(stringValue, ENCRYPTION_KEY);
      await AsyncStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error('Error saving to secure storage:', error);
      // Fallback to storing without encryption
      await AsyncStorage.setItem(key, JSON.stringify(value));
    }
  },

  getItem: async (key) => {
    try {
      const encryptedValue = await AsyncStorage.getItem(key);
      if (!encryptedValue) return null;

      const decryptedValue = decrypt(encryptedValue, ENCRYPTION_KEY);
      return JSON.parse(decryptedValue);
    } catch (error) {
      console.error('Error reading from secure storage:', error);
      // Try reading without decryption
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  },

  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from secure storage:', error);
      throw error;
    }
  },

  clear: async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      throw error;
    }
  }
}; 