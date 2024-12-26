// firestoreFunctions.js
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Function to add data
export const addData = async () => {
  try {
    const docRef = await addDoc(collection(db, 'yourCollectionName'), {
      name: 'Witsanu',
      message: 'Hello Firestore!',
      timestamp: new Date(),
    });
    console.log('Document written with ID: ', docRef.id);
  } catch (e) {
    console.error('Error adding document: ', e);
  }
};

// Function to fetch data
export const fetchData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'yourCollectionName'));
    querySnapshot.forEach((doc) => {
      console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
    });
  } catch (e) {
    console.error('Error fetching documents: ', e);
  }
};
