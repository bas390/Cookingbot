import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tutorial = ({ visible, onClose }) => {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(0);

  const tutorialSteps = [
    {
      title: 'ยินดีต้อนรับ! 👋',
      description: 'มาเริ่มเรียนรู้วิธีใช้งานแอพกันเถอะ',
      icon: 'waving-hand'
    },
    {
      title: 'โหมด AI 🤖',
      description: 'กดปุ่มนี้เพื่อสลับระหว่างโหมด AI และโหมดพื้นฐาน',
      icon: 'psychology'
    },
    {
      title: 'ตั้งเวลา ⏰',
      description: 'พิมพ์เลขนาทีเพื่อตั้งเวลาทำอาหาร เช่น "30" จะตั้งเวลา 30 นาที',
      icon: 'timer'
    },
    {
      title: 'เริ่มใช้งานกันเลย!',
      description: 'คุณพร้อมแล้วที่จะเริ่มทำอาหารกับเรา',
      icon: 'restaurant'
    }
  ];

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('tutorialShown', 'true');
      onClose();
    } catch (error) {
      console.error('Error saving tutorial state:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={[
        styles.container,
        { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)' }
      ]}>
        <View style={[
          styles.card,
          { backgroundColor: isDarkMode ? '#333' : '#FFF' }
        ]}>
          <MaterialIcons 
            name={tutorialSteps[step].icon}
            size={48}
            color="#6de67b"
          />
          <Text style={[
            styles.title,
            { color: isDarkMode ? '#FFF' : '#000' }
          ]}>
            {tutorialSteps[step].title}
          </Text>
          <Text style={[
            styles.description,
            { color: isDarkMode ? '#CCC' : '#666' }
          ]}>
            {tutorialSteps[step].description}
          </Text>
          <View style={styles.footer}>
            <View style={styles.dots}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: index === step ? '#6de67b' : '#CCC' }
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>
                {step < tutorialSteps.length - 1 ? 'ถัดไป' : 'เริ่มใช้งาน'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  button: {
    backgroundColor: '#6de67b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default Tutorial; 