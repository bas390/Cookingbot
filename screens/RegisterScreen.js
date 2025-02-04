import React, { useState } from 'react';
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
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

export default function RegisterScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      marginBottom: 10,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: isDarkMode ? '#CCCCCC' : '#666666',
      marginBottom: 30,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    inputContainer: {
      marginBottom: 20,
    },
    passwordContainer: {
      position: 'relative',
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
    },
    eyeIcon: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: [{ translateY: -12 }],
    },
    errorText: {
      color: '#FF3B30',
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
    },
    button: {
      backgroundColor: '#6de67b',
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    buttonDisabled: {
      backgroundColor: isDarkMode ? '#333333' : '#E5E5E5',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    backButton: {
      marginTop: 20,
      padding: 10,
    },
    backButtonText: {
      color: '#FF6B6B',
      fontSize: 16,
      textAlign: 'center',
    },
  });

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    try {
      // สร้างบัญชีใน Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // เพิ่มข้อมูลผู้ใช้ใน Firestore
      const usersRef = collection(db, 'users');
      await addDoc(usersRef, {
        uid: user.uid,
        email: email.trim(),
        createdAt: new Date().getTime(),
        settings: {
          theme: 'light',
          notifications: true
        }
      });

      Alert.alert(
        'สำเร็จ',
        'สมัครสมาชิกเรียบร้อยแล้ว',
        [{ text: 'ตกลง', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('Error registering:', error);
      let message = 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'อีเมลนี้ถูกใช้งานแล้ว';
          break;
        case 'auth/invalid-email':
          message = 'รูปแบบอีเมลไม่ถูกต้อง';
          break;
        case 'auth/operation-not-allowed':
          message = 'ไม่สามารถสมัครสมาชิกได้ในขณะนี้';
          break;
        case 'auth/weak-password':
          message = 'รหัสผ่านไม่ปลอดภัยเพียงพอ';
          break;
      }
      
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>สมัครสมาชิก</Text>
          <Text style={styles.subtitle}>
            กรุณากรอกข้อมูลเพื่อสมัครสมาชิก
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#6de67b" />
          ) : (
            <>
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

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

              <View style={styles.inputContainer}>
                <Text style={styles.label}>รหัสผ่าน</Text>
                <View style={styles.passwordContainer}>
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
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>ยืนยันรหัสผ่าน</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>
                  กลับไปหน้าเข้าสู่ระบบ
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}