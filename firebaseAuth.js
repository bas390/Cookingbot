import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

let authInstance = null;

export const initializeFirebaseAuth = (app) => {
  if (authInstance) {
    return authInstance;
  }

  try {
    // ลองใช้ getAuth ก่อน
    authInstance = getAuth(app);
    console.log('✅ Firebase Auth: Using existing auth instance');
    return authInstance;
  } catch (error) {
    console.log('🔄 Firebase Auth: Creating new auth instance with persistence');
    
    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      console.log('✅ Firebase Auth: Successfully initialized with persistence');
      return authInstance;
    } catch (initError) {
      console.error('❌ Firebase Auth: Failed to initialize:', initError);
      
      // สุดท้าย ลองใช้ getAuth อีกครั้ง
      try {
        authInstance = getAuth(app);
        console.log('✅ Firebase Auth: Fallback to getAuth successful');
        return authInstance;
      } catch (fallbackError) {
        console.error('❌ Firebase Auth: All initialization methods failed');
        throw new Error('Unable to initialize Firebase Auth');
      }
    }
  }
};

export const getFirebaseAuth = () => {
  if (!authInstance) {
    throw new Error('Firebase Auth not initialized. Call initializeFirebaseAuth first.');
  }
  return authInstance;
};

export default { initializeFirebaseAuth, getFirebaseAuth }; 