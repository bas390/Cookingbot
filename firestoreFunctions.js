// firestoreFunctions.js
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Retry utility function
const retry = async (fn, maxAttempts = 3) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Function to add data with retry
export const addData = async (collectionName, data) => {
  try {
    return await retry(async () => {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        timestamp: new Date(),
      });
      console.log('Document written with ID: ', docRef.id);
      return docRef;
    });
  } catch (error) {
    console.error('Error adding document: ', error);
    throw error;
  }
};

// Function to fetch data with retry
export const fetchData = async (collectionName) => {
  try {
    return await retry(async () => {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      return data;
    });
  } catch (error) {
    console.error('Error fetching documents: ', error);
    throw error;
  }
};

// Function to get single document with retry
export const getDocument = async (collectionName, docId) => {
  try {
    return await retry(async () => {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Document not found');
      }
    });
  } catch (error) {
    console.error('Error getting document: ', error);
    throw error;
  }
};
