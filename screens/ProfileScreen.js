import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth, db, storage } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { LoadingState, ErrorState } from '../components/UIStates';

export default function ProfileScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      navigation.replace('Login');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setUser(userDocSnap.data());
      } else {
        // ถ้าไม่มีข้อมูลผู้ใช้ ให้สร้างข้อมูลเริ่มต้น
        const initialUserData = {
          displayName: currentUser.displayName || 'ผู้ใช้',
          photoURL: currentUser.photoURL || 'https://via.placeholder.com/150',
          email: currentUser.email,
          createdAt: new Date().getTime()
        };
        
        await updateDoc(userDocRef, initialUserData);
        setUser(initialUserData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
  };

  const handleChangeProfileImage = async () => {
    try {
      // ขออนุญาตเข้าถึงคลังรูปภาพ
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ข้อผิดพลาด', 'ต้องการสิทธิ์ในการเข้าถึงคลังรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets?.[0]?.uri) {
        setLoading(true);
        
        try {
          const uri = result.assets[0].uri;
          const response = await fetch(uri);
          const blob = await response.blob();

          // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
          const filename = `profile_${auth.currentUser.uid}_${Date.now()}.jpg`;
          const storageRef = ref(storage, `profileImages/${filename}`);
          
          // อัพโหลดไฟล์และรอจนเสร็จ
          const snapshot = await uploadBytes(storageRef, blob);
          console.log('Upload snapshot:', snapshot);
          
          // รับ URL จาก snapshot
          const downloadURL = await getDownloadURL(snapshot.ref);
          console.log('Download URL:', downloadURL);
          
          if (!downloadURL) {
            throw new Error('ไม่สามารถรับ URL ของรูปภาพได้');
          }
          
          // อัพเดท Firestore
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userDocRef, {
            photoURL: downloadURL
          });
          
          // อัพเดท state
          setUser(prev => ({ ...prev, photoURL: downloadURL }));
          Alert.alert('สำเร็จ', 'อัพโหลดรูปภาพเรียบร้อย');
        } catch (uploadError) {
          console.error('Upload error details:', uploadError);
          Alert.alert('ข้อผิดพลาด', `ไม่สามารถอัพโหลดรูปภาพได้: ${uploadError.message}`);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel'
        },
        {
          text: 'ออกจากระบบ',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.replace('Login');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleEditName = async () => {
    if (!newName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อ');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName: newName.trim()
      });

      setUser(prev => ({ ...prev, displayName: newName.trim() }));
      setIsEditingName(false);
      Alert.alert('สำเร็จ', 'แก้ไขชื่อเรียบร้อย');
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแก้ไขชื่อได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }]}>
      <View style={[
        styles.header,
        { 
          borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
          backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
        }
      ]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            โปรไฟล์
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingState />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ErrorState message={error} onRetry={loadUserProfile} />
          </View>
        ) : (
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handleChangeProfileImage}>
              <Image
                source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
                style={styles.profileImage}
              />
              <View style={styles.editImageButton}>
                <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
            {isEditingName ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={[
                    styles.nameInput,
                    { color: isDarkMode ? '#FFFFFF' : '#000000' }
                  ]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="กรอกชื่อใหม่"
                  placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
                  autoFocus
                />
                <View style={styles.editNameButtons}>
                  <TouchableOpacity 
                    style={[styles.editNameButton, styles.saveButton]} 
                    onPress={handleEditName}
                  >
                    <Text style={styles.editNameButtonText}>บันทึก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editNameButton, styles.cancelButton]}
                    onPress={() => setIsEditingName(false)}
                  >
                    <Text style={styles.editNameButtonText}>ยกเลิก</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.nameContainer}
                onPress={() => {
                  setNewName(user?.displayName || '');
                  setIsEditingName(true);
                }}
              >
                <Text style={[styles.userName, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                  {user?.displayName || 'ผู้ใช้'}
                </Text>
                <MaterialIcons 
                  name="edit" 
                  size={20} 
                  color={isDarkMode ? '#FFFFFF' : '#000000'} 
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editImageButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#00B900',
    padding: 8,
    borderRadius: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  editIcon: {
    marginLeft: 8,
  },
  editNameContainer: {
    alignItems: 'center',
    marginTop: 12,
    width: '80%',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#00B900',
    borderRadius: 8,
  },
  editNameButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  editNameButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: '#00B900',
  },
  cancelButton: {
    backgroundColor: '#FF5722',
  },
  editNameButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
}); 