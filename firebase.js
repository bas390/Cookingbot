import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const database = getDatabase(app);

// ไม่จำเป็นต้องใช้ analytics ใน React Native
// const analytics = getAnalytics(app); 

// สร้าง references สำหรับ Realtime Database
export const dbRef = {
  users: 'users',
  chats: 'chats',
  messages: 'messages',
  userChats: 'userChats'
}; 