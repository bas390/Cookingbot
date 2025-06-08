import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { initializeFirebaseAuth } from './firebaseAuth';

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
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase App initialized');
} else {
  app = getApp();
  console.log('🔥 Firebase App already exists, using existing instance');
}

// Initialize Auth using separate auth handler
const auth = initializeFirebaseAuth(app);

// Initialize Firestore
const db = getFirestore(app);
console.log('✅ Firestore initialized');

// Initialize Realtime Database
const database = getDatabase(app);
console.log('✅ Realtime Database initialized');

// Database references
const dbRef = {
  users: 'users',
  chats: 'chats',
  recipes: 'recipes',
  ingredients: 'ingredients',
  userPreferences: 'userPreferences',
  faqs: 'faqs'
};

console.log('🎉 All Firebase services ready:', {
  app: !!app,
  auth: !!auth,
  db: !!db,
  database: !!database
});

export { app, auth, db, database, dbRef };
export default app; 