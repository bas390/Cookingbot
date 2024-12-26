import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmGQuyHNEkXUlS3QC-SoB6qEoKXodpFE",
    authDomain: "aicook-1042e.firebaseapp.com",
    projectId: "aicook-1042e",
    storageBucket: "aicook-1042e.appspot.com",
    messagingSenderId: "35903625995",
    appId: "1:35903625995:web:38d4622c0f6a3a87b95ef6",
    measurementId: "G-PQW99GKV5V"
  };
  

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    // Firebase Authentication
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        Alert.alert('สำเร็จ', 'สมัครสมาชิกเรียบร้อยแล้ว');
        navigation.replace('Login'); // ย้อนกลับไปยังหน้าล็อกอิน
      })
      .catch((error) => {
        const errorCode = error.code;
        let message = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
        if (errorCode === 'auth/email-already-in-use') {
          message = 'อีเมลนี้ถูกใช้งานแล้ว';
        } else if (errorCode === 'auth/invalid-email') {
          message = 'อีเมลไม่ถูกต้อง';
        } else if (errorCode === 'auth/weak-password') {
          message = 'รหัสผ่านอ่อนเกินไป';
        }
        setErrorMessage(message);
        console.error(error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>สมัครสมาชิก</Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="กรอก Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setErrorMessage('');
        }}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="กรอก Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setErrorMessage('');
        }}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="ยืนยัน Password"
        placeholderTextColor="#888"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setErrorMessage('');
        }}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>สมัครสมาชิก</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.backToLogin}>กลับไปหน้าล็อกอิน</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backToLogin: {
    color: '#FF5722',
    fontWeight: 'bold',
    fontSize: 14,
  },
});