import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../utils/secureStorage';
import { haptics } from '../utils/haptics';
import ErrorState from '../components/ErrorState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function LoginScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkLoginState = async () => {
      try {
        setIsLoading(true);
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          navigation.replace('Home');
          return;
        }

        const savedEmail = await AsyncStorage.getItem('userEmail');
        const savedPassword = await AsyncStorage.getItem('userPassword');
        
        if (savedEmail && savedPassword) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
            if (userCredential.user) {
              navigation.replace('Home');
            }
          } catch (error) {
            console.error('Auto login error:', error);
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('userPassword');
          }
        }
      } catch (error) {
        console.error('Error checking login state:', error);
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginState();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      haptics.light();

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      await AsyncStorage.setItem('userEmail', email.trim());
      await AsyncStorage.setItem('userPassword', password);

      await secureStorage.setItem('userData', {
        email: userCredential.user.email,
        uid: userCredential.user.uid
      });
      
      haptics.success();
      navigation.replace('Home');
    } catch (error) {
      haptics.error();
      console.error('Login error:', error);
      
      let message = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'อีเมลไม่ถูกต้อง';
          break;
        case 'auth/user-disabled':
          message = 'บัญชีผู้ใช้ถูกระงับ';
          break;
        case 'auth/user-not-found':
          message = 'ไม่พบบัญชีผู้ใช้นี้';
          break;
        case 'auth/wrong-password':
          message = 'รหัสผ่านไม่ถูกต้อง';
          break;
      }
      
      setErrorMessage(message);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userPassword');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 30,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      textAlign: 'center',
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    input: {
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    passwordContainer: {
      position: 'relative',
      marginBottom: 20,
    },
    eyeIcon: {
      position: 'absolute',
      right: 12,
      top: 40,
      zIndex: 1,
    },
    errorText: {
      color: '#FF3B30',
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
    },
    button: {
      backgroundColor: '#00B900',
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    registerButton: {
      backgroundColor: isDarkMode ? '#333' : '#E5E5E5',
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    registerButtonText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 16,
      fontWeight: '600',
    },
    forgotPasswordButton: {
      marginTop: 15,
      padding: 10,
    },
    forgotPasswordText: {
      color: '#FF6B6B',
      fontSize: 16,
      textAlign: 'center',
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 15,
    },
    registerText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 16,
    },
    registerLink: {
      color: '#00B900',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => setError(null)} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            <Text style={styles.title}>เข้าสู่ระบบ</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>อีเมล</Text>
              <TextInput
                style={styles.input}
                placeholder="กรอกอีเมล"
                placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.passwordContainer}>
              <Text style={styles.label}>รหัสผ่าน</Text>
              <TextInput
                style={styles.input}
                placeholder="กรอกรหัสผ่าน"
                placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMessage('');
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color={isDarkMode ? '#FFFFFF' : '#666666'}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPasswordButton} 
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>ลืมรหัสผ่าน?</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>ยังไม่มีบัญชี? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>ลงทะเบียน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}     