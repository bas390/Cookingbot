import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

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

let app;
let db;
let auth;
let database;
let netInfoUnsubscribe;
let connectedRef;

const cleanup = () => {
  if (database && connectedRef) {
    off(connectedRef);
  }
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
  }
};

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize services
  db = getFirestore(app);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  database = getDatabase(app);

  // Add connection state listener
  connectedRef = ref(database, '.info/connected');
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      console.log('Connected to Firebase');
    } else {
      console.log('Not connected to Firebase');
    }
  }, (error) => {
    console.error('Connection monitoring error:', error);
  });

  // Check initial network state
  NetInfo.fetch().then(state => {
    console.log('Initial connection type:', state.type);
    console.log('Is initially connected?', state.isConnected);
  });

  // Add network state monitoring
  netInfoUnsubscribe = NetInfo.addEventListener(state => {
    console.log('Connection type:', state.type);
    console.log('Is connected?', state.isConnected);
  });

} catch (error) {
  console.error('Firebase initialization error:', error);
  cleanup();
}

// สร้าง references สำหรับ Realtime Database
const dbRef = {
  users: 'users',
  chats: 'chats',
  recipes: 'recipes',
  ingredients: 'ingredients',
  userPreferences: 'userPreferences',
  faqs: 'faqs'
};

// ตัวอย่างโครงสร้างข้อมูล
const recipeSchema = {
  id: 'string',
  name: 'string',
  category: 'string', // FOOD_CATEGORIES
  difficulty: 'string', // DIFFICULTY_LEVELS
  ingredients: ['string'],
  steps: ['string'],
  cookingTime: 'number',
  servings: 'number',
  allergens: ['string'],
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

const userPreferencesSchema = {
  userId: 'string',
  allergies: ['string'],
  avoidIngredients: ['string'],
  preferredCategories: ['string'],
  skillLevel: 'string',
  updatedAt: 'timestamp'
};

export { db, auth, database, dbRef, cleanup };
export default app; 