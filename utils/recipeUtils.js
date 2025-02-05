import { collection, query, where, getDocs, getDoc, doc, limit, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ฟังก์ชันแยกวัตถุดิบจากข้อความ
export const extractIngredients = (text) => {
  // แยกคำด้วย "," หรือ "และ"
  const words = text.toLowerCase()
    .replace(/และ|,/g, ',')
    .split(',')
    .map(word => word.trim())
    .filter(word => word.length > 0);

  return words;
};

// ฟังก์ชันค้นหาสูตรอาหารจากวัตถุดิบ
export const findRecipesByIngredients = async (ingredients) => {
  try {
    const recipesRef = collection(db, 'recipes');
    const q = query(
      recipesRef,
      where('ingredients', 'array-contains-any', ingredients)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error finding recipes:', error);
    return [];
  }
};

// ฟังก์ชันจัดอันดับสูตรอาหารตามวัตถุดิบที่มี
export const rankRecipesByIngredients = (recipes, availableIngredients) => {
  return recipes.map(recipe => {
    const matchCount = recipe.ingredients.filter(
      ingredient => availableIngredients.includes(ingredient.toLowerCase())
    ).length;
    
    const matchPercentage = (matchCount / recipe.ingredients.length) * 100;
    
    return {
      ...recipe,
      matchPercentage,
      missingIngredients: recipe.ingredients.filter(
        ingredient => !availableIngredients.includes(ingredient.toLowerCase())
      )
    };
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);
};

// ฟังก์ชันดึงข้อมูลสูตรอาหารตามไอดี
export const getRecipeById = async (recipeId) => {
  try {
    const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
    if (recipeDoc.exists()) {
      return {
        id: recipeDoc.id,
        ...recipeDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting recipe:', error);
    return null;
  }
};

// ฟังก์ชันค้นหาสูตรอาหารที่เกี่ยวข้อง
export const findRelatedRecipes = async (category, currentRecipeId) => {
  try {
    const recipesRef = collection(db, 'recipes');
    const q = query(
      recipesRef,
      where('category', '==', category),
      where('id', '!=', currentRecipeId),
      limit(5)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error finding related recipes:', error);
    return [];
  }
};

export const addRecipe = async (recipeData) => {
  try {
    const recipesRef = collection(db, 'recipes');
    await addDoc(recipesRef, {
      ...recipeData,
      createdAt: new Date().getTime()
    });
    return true;
  } catch (error) {
    console.error('Error adding recipe:', error);
    return false;
  }
}; 