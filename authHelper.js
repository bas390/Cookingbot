import { getAuthFunc } from './firebase';

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const auth = await getAuthFunc();
    return auth.currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Helper function to get auth instance
export const getAuth = async () => {
  try {
    return await getAuthFunc();
  } catch (error) {
    console.error('Error getting auth instance:', error);
    throw error;
  }
};

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Helper function to wait for auth to be ready
export const waitForAuth = async (maxRetries = 5, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const auth = await getAuthFunc();
      return auth;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`Auth not ready, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default { getCurrentUser, getAuth, isAuthenticated, waitForAuth }; 