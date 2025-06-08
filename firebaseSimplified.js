import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
console.log('🔥 Firebase App initialized');

// Initialize Firestore and Database
const db = getFirestore(app);
const database = getDatabase(app);
console.log('✅ Firestore and Database initialized');

// Initialize Auth with proper error handling
let auth;
try {
  // Try getAuth first (works if auth is already initialized)
  auth = getAuth(app);
  console.log('✅ Auth initialized with getAuth');
} catch (error) {
  try {
    // If getAuth fails, use initializeAuth with persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('✅ Auth initialized with initializeAuth and persistence');
  } catch (initError) {
    console.error('❌ Failed to initialize Auth:', initError);
    // Fallback: try getAuth again
    auth = getAuth(app);
    console.log('✅ Auth initialized with getAuth (fallback)');
  }
}

// Database references
const dbRef = {
  users: 'users',
  chats: 'chats',
  recipes: 'recipes',
  ingredients: 'ingredients',
  userPreferences: 'userPreferences',
  faqs: 'faqs'
};

console.log('🎉 All Firebase services initialized successfully');

export { app, auth, db, database, dbRef };
export default app; 