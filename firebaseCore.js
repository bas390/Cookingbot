import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAmGOuyVNeEXUlSU3QC-SObo6gEoXdopFE",
  authDomain: "aicook-1042e.firebaseapp.com",
  databaseURL: "https://aicook-1042e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aicook-1042e",
  storageBucket: "aicook-1042e.firebasestorage.app",
  messagingSenderId: "35093052995",
  appId: "1:35093052995:web:38d0262ccf063a87b95ef6",
  measurementId: "G-PQW9GYK0V5"
};

// Initialize Firebase App first
let app;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('🔥 Firebase App initialized successfully');
  } else {
    app = getApp();
    console.log('🔥 Using existing Firebase App');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase App:', error);
  throw error;
}

// Initialize Firestore and Database immediately
const db = getFirestore(app);
const database = getDatabase(app);

console.log('✅ Firestore and Database initialized');

// Auth will be initialized on demand
let authInstance = null;
let authPromise = null;

const initializeAuth = async () => {
  if (authInstance) {
    return authInstance;
  }

  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    try {
      // Wait a bit to ensure Firebase App is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const { getAuth, initializeAuth, getReactNativePersistence } = await import('firebase/auth');
      const AsyncStorage = await import('@react-native-async-storage/async-storage');

      try {
        // Try getAuth first
        authInstance = getAuth(app);
        console.log('✅ Auth initialized with getAuth');
      } catch (error) {
        console.log('🔄 Trying initializeAuth with persistence...');
        
        authInstance = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage.default)
        });
        console.log('✅ Auth initialized with initializeAuth');
      }

      return authInstance;
    } catch (error) {
      console.error('❌ Failed to initialize Auth:', error);
      authPromise = null; // Reset promise so we can try again
      throw error;
    }
  })();

  return authPromise;
};

// Database references
const dbRef = {
  users: 'users',
  chats: 'chats',
  recipes: 'recipes',
  ingredients: 'ingredients',
  userPreferences: 'userPreferences',
  faqs: 'faqs'
};

export { app, db, database, initializeAuth, dbRef };
export default app; 