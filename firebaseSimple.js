import { initializeApp } from 'firebase/app';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Realtime Database  
const database = getDatabase(app);

// Auth will be initialized lazily when needed
let auth = null;

const getAuth = async () => {
  if (auth) return auth;
  
  try {
    const { getAuth: getAuthFunc, initializeAuth, getReactNativePersistence } = await import('firebase/auth');
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    
    try {
      auth = getAuthFunc(app);
      console.log('✅ Auth initialized with getAuth');
    } catch (error) {
      console.log('🔄 Initializing auth with persistence...');
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage.default)
      });
      console.log('✅ Auth initialized with initializeAuth');
    }
    
    return auth;
  } catch (error) {
    console.error('❌ Failed to initialize auth:', error);
    throw error;
  }
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

console.log('🔥 Firebase initialized successfully');

export { app, db, database, getAuth, dbRef };
export default app; 