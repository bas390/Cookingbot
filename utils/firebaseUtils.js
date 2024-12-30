import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const fetchMessages = async (chatId, setMessages) => {
  if (!chatId) return null;

  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef, 
    where('chatId', '==', chatId), 
    orderBy('createdAt', 'desc')
  );
  
  try {
    return onSnapshot(q, (snapshot) => {
      const chatList = [];
      snapshot.forEach(doc => {
        chatList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMessages(chatList);
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return null;
  }
}; 