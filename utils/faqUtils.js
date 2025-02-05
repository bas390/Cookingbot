import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ฟังก์ชันค้นหาคำตอบจาก FAQ
export const findFAQAnswer = async (question) => {
  try {
    const keywords = extractKeywords(question);
    const faqRef = collection(db, 'faqs');
    const q = query(
      faqRef,
      where('keywords', 'array-contains-any', keywords)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    // เรียงลำดับตามความเกี่ยวข้อง
    const answers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      relevance: calculateRelevance(keywords, doc.data().keywords)
    })).sort((a, b) => b.relevance - a.relevance);

    return answers[0];
  } catch (error) {
    console.error('Error finding FAQ:', error);
    return null;
  }
};

// ฟังก์ชันแยกคำสำคัญ
const extractKeywords = (text) => {
  return text.toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 1);
};

// ฟังก์ชันคำนวณความเกี่ยวข้อง
const calculateRelevance = (questionKeywords, answerKeywords) => {
  const matches = questionKeywords.filter(keyword => 
    answerKeywords.includes(keyword)
  ).length;
  return matches / questionKeywords.length;
};

// ฟังก์ชันเพิ่ม FAQ ใหม่
export const addNewFAQ = async (question, answer, keywords) => {
  try {
    const faqRef = collection(db, 'faqs');
    await addDoc(faqRef, {
      question,
      answer,
      keywords,
      createdAt: new Date().getTime()
    });
    return true;
  } catch (error) {
    console.error('Error adding FAQ:', error);
    return false;
  }
};

// ฟังก์ชันอัพเดต FAQ
export const updateFAQ = async (faqId, data) => {
  try {
    const faqRef = doc(db, 'faqs', faqId);
    await updateDoc(faqRef, {
      ...data,
      updatedAt: new Date().getTime()
    });
    return true;
  } catch (error) {
    console.error('Error updating FAQ:', error);
    return false;
  }
}; 