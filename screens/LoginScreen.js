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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('กรุณากรอก Email และ Password');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('Home');
    } catch (error) {
      console.log('Login error:', error.code);
      
      switch (error.code) {
        case 'auth/invalid-email':
          setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง');
          break;
        case 'auth/user-not-found':
          setErrorMessage('ไม่พบบัญชีผู้ใช้นี้');
          break;
        case 'auth/wrong-password':
          setErrorMessage('รหัสผ่านไม่ถูกต้อง');
          break;
        case 'auth/too-many-requests':
          setErrorMessage('คุณลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่');
          break;
        default:
          setErrorMessage('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 30,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    spacing: {
      marginBottom: 20,
    },
    errorText: {
      color: '#FF5252',
      fontSize: 14,
      marginBottom: 10,
    },
    input: {
      width: '100%',
      height: 50,
      paddingLeft: 15,
      paddingRight: 40,
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#E5E5E5',
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    passwordContainer: {
      position: 'relative',
      width: '100%',
      marginBottom: 15,
    },
    eyeIcon: {
      position: 'absolute',
      right: 15,
      top: 13,
      height: 24,
      width: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      backgroundColor: '#00B900',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      width: '100%',
      marginBottom: 15,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    registerButton: {
      backgroundColor: '#FF5722',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      width: '100%',
    },
    registerButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>เข้าสู่ระบบ</Text>
        
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        
        <TextInput
          style={[styles.input, styles.spacing]}
          placeholder="กรอก Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMessage('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={[styles.passwordContainer, styles.spacing]}>
          <TextInput
            style={styles.input}
            placeholder="กรอก Password"
            placeholderTextColor="#888"
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
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={24}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.button, styles.spacing]} onPress={handleLogin}>
          <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>สมัครสมาชิก</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}