import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAmGOuyVNeEXUlS3QC-SoB6qEoKXodpFE",
  authDomain: "aicook-1042e.firebaseapp.com",
  projectId: "aicook-1042e",
  storageBucket: "aicook-1042e.appspot.com",
  messagingSenderId: "35903625995",
  appId: "1:35903625995:web:38d4622c0f6a3a87b95ef6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 