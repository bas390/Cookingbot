import { app, auth, db, database, dbRef } from './firebaseSimplified';
import { ref, onValue, off } from 'firebase/database';
import NetInfo from '@react-native-community/netinfo';

// Helper function for getting auth (now it's directly available)
const getAuthFunc = () => {
  return auth;
};

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

export { db, auth, database, dbRef, cleanup, getAuthFunc };
export default app; 