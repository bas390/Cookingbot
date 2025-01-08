import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

// ดึงสูตรอาหารแนะนำตามความชอบของผู้ใช้
export const getRecommendedRecipes = async (userPreferences) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    // ดึงประวัติการดูสูตรอาหาร
    const viewHistoryQuery = query(
      collection(db, 'recipeViews'),
      where('userId', '==', userId),
      limit(10)
    );
    
    const viewHistorySnapshot = await getDocs(viewHistoryQuery);
    const viewedRecipes = viewHistorySnapshot.docs.map(doc => doc.data());

    // ดึงสูตรอาหารที่คล้ายกับที่เคยดู
    const recommendedRecipes = await getSimilarRecipes(viewedRecipes);
    
    return recommendedRecipes;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
};

// ดึงสูตรอาหารยามประเภท
export const getRecipesByCategory = async (category) => {
  try {
    const categoryQuery = query(
      collection(db, 'recipes'),
      where('category', '==', category),
      limit(10)
    );
    
    const snapshot = await getDocs(categoryQuery);
    const recipes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return recipes;
  } catch (error) {
    console.error('Error getting category recipes:', error);
    return [];
  }
};

// เพิ่มฟังก์ชัน getSimilarRecipes
const getSimilarRecipes = async (viewedRecipes) => {
  try {
    if (!viewedRecipes.length) return [];

    // ดึงประเภทอาหารที่ผู้ใช้ชอบดู
    const favoriteCategories = viewedRecipes
      .map(recipe => recipe.category)
      .filter((value, index, self) => self.indexOf(value) === index);

    // ดึงสูตรอาหารที่อยู่ในประเภทที่ชอบ
    const similarRecipesQuery = query(
      collection(db, 'recipes'),
      where('category', 'in', favoriteCategories),
      limit(5)
    );

    const snapshot = await getDocs(similarRecipesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting similar recipes:', error);
    return [];
  }
}; 