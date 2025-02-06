import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FOOD_ALLERGIES, DIFFICULTY_LEVELS } from '../constants/foodCategories';
import { db, auth } from '../firebase';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { haptics } from '../utils/haptics';
import CustomPopup from '../components/CustomPopup';

const difficultyLabels = {
  beginner: 'มือใหม่',
  intermediate: 'ปานกลาง',
  chef: 'เชฟ'
};

const allergyLabels = {
  seafood: 'อาหารทะเล',
  nuts: 'ถั่ว',
  dairy: 'นม/ผลิตภัณฑ์จากนม',
  gluten: 'กลูเตน',
  soy: 'ถั่วเหลือง',
  eggs: 'ไข่'
};

export default function UserPreferencesScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [allergies, setAllergies] = useState([]);
  const [skillLevel, setSkillLevel] = useState(DIFFICULTY_LEVELS.BEGINNER);
  const [isLoading, setIsLoading] = useState(true);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userPrefsDoc = await getDoc(doc(db, 'userPreferences', userId));
      if (userPrefsDoc.exists()) {
        const data = userPrefsDoc.data();
        setAllergies(data.allergies || []);
        setSkillLevel(data.skillLevel || DIFFICULTY_LEVELS.BEGINNER);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'userPreferences', user.uid);
      await setDoc(userRef, {
        allergies: allergies,
        skillLevel: skillLevel,
        updatedAt: new Date().getTime(),
      });

      // แสดง popup แจ้งเตือนสำเร็จ
      setPopupMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      setPopupVisible(true);

      // รอให้ popup แสดง 1.5 วินาทีแล้วกลับไปหน้าก่อนหน้า
      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (error) {
      console.error('Error saving preferences:', error);
      setPopupMessage('ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่');
      setPopupVisible(true);
    }
  };

  const toggleAllergy = (allergy) => {
    setAllergies(prev => {
      if (prev.includes(allergy)) {
        return prev.filter(a => a !== allergy);
      }
      return [...prev, allergy];
    });
    haptics.light();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'android' 
        ? StatusBar.currentHeight + 16 
        : 50,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    allergyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5',
      marginBottom: 8,
      borderRadius: 12,
      paddingHorizontal: 16,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    allergyText: {
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontWeight: '500',
    },
    skillLevelButton: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    skillLevelText: {
      fontSize: 16,
      fontWeight: '500',
    },
    saveButton: {
      backgroundColor: '#6de67b',
      padding: 16,
      borderRadius: 12,
      margin: 16,
      marginBottom: Platform.OS === 'ios' ? 34 : 16,
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    saveButtonText: {
      color: '#000000',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <CustomPopup
        visible={popupVisible}
        message={popupMessage}
        onClose={() => setPopupVisible(false)}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ตั้งค่าการใช้งาน</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>อาหารที่แพ้/ไม่ทาน</Text>
          {Object.entries(FOOD_ALLERGIES).map(([key, value]) => (
            <TouchableOpacity 
              key={key}
              style={styles.allergyItem}
              onPress={() => toggleAllergy(value)}
              activeOpacity={0.7}
            >
              <Text style={styles.allergyText}>{allergyLabels[value]}</Text>
              <Switch
                value={allergies.includes(value)}
                onValueChange={() => toggleAllergy(value)}
                trackColor={{ false: '#767577', true: '#6de67b' }}
                thumbColor={isDarkMode ? '#f4f3f4' : '#f4f3f4'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ระดับความเชี่ยวชาญ</Text>
          {Object.entries(DIFFICULTY_LEVELS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.skillLevelButton,
                {
                  backgroundColor: skillLevel === value 
                    ? '#6de67b' 
                    : isDarkMode ? '#1E1E1E' : '#F5F5F5',
                }
              ]}
              onPress={() => {
                setSkillLevel(value);
                haptics.light();
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.skillLevelText,
                {
                  color: skillLevel === value
                    ? '#000000'
                    : isDarkMode ? '#FFFFFF' : '#000000'
                }
              ]}>
                {difficultyLabels[value]}
              </Text>
              {skillLevel === value && (
                <MaterialIcons name="check" size={24} color="#000000" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={savePreferences}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>บันทึกการตั้งค่า</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
} 