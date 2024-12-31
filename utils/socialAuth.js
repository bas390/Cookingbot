import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { auth } from '../firebase';
import { 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';

// ตั้งค่า Google Sign In
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // จาก Google Cloud Console
});

// ล็อกอินด้วย Google
export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const credential = GoogleAuthProvider.credential(userInfo.idToken);
    return await signInWithCredential(auth, credential);
  } catch (error) {
    throw error;
  }
};

// ล็อกอินด้วย Facebook
export const signInWithFacebook = async () => {
  try {
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
    if (result.isCancelled) {
      throw new Error('User cancelled login');
    }

    const data = await AccessToken.getCurrentAccessToken();
    const credential = FacebookAuthProvider.credential(data.accessToken);
    return await signInWithCredential(auth, credential);
  } catch (error) {
    throw error;
  }
};