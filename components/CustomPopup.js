import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CustomPopup = ({ visible, message, onClose }) => {
  const { isDarkMode } = useTheme();
  const translateY = new Animated.Value(-100);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: Platform.OS === 'ios' ? 50 : 20,
        useNativeDriver: true,
        tension: 80,
        friction: 10
      }).start();

      // ปิด popup อัตโนมัติหลัง 2 วินาที
      const timer = setTimeout(() => {
        hidePopup();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hidePopup = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true
    }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
        }
      ]}
    >
      <View style={styles.content}>
        <Text style={[
          styles.message,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  }
});

export default CustomPopup; 