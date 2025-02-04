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
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
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
      backgroundColor: '#00B900',
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

  const handleResetPassword = async () => {
    if (!email.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setErrorMessage('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    try {
      // ค้นหาผู้ใช้จาก Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // พบผู้ใช้ในระบบ อัพเดทรหัสผ่าน
        const userDoc = querySnapshot.docs[0];
        const userRef = doc(db, 'users', userDoc.id);
        
        await updateDoc(userRef, {
          password: newPassword,
          updatedAt: new Date().getTime()
        });

        Alert.alert(
          'สำเร็จ',
          'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว',
          [{ text: 'ตกลง', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        setErrorMessage('ไม่พบบัญชีผู้ใช้นี้ในระบบ');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setErrorMessage('ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง');
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
          <Text style={styles.title}>ลืมรหัสผ่าน</Text>
          <Text style={styles.subtitle}>
            กรุณากรอกอีเมลและรหัสผ่านใหม่
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#00B900" />
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
                <Text style={styles.label}>รหัสผ่านใหม่</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="กรอกรหัสผ่านใหม่"
                    placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
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
                <Text style={styles.label}>ยืนยันรหัสผ่านใหม่</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
                    value={confirmNewPassword}
                    onChangeText={(text) => {
                      setConfirmNewPassword(text);
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'กำลังดำเนินการ...' : 'รีเซ็ตรหัสผ่าน'}
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