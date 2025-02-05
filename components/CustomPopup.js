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
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }).start();

      // Auto hide after 1.5 seconds
      const timer = setTimeout(() => {
        hidePopup();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hidePopup = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.popup,
          {
            opacity: animatedValue,
            transform: [
              {
                scale: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            backgroundColor: isDarkMode ? 'rgba(51, 51, 51, 0.95)' : 'rgba(0, 0, 0, 0.85)',
          },
        ]}
      >
        <View style={styles.content}>
          <Text style={[
            styles.message, 
            { color: '#FFFFFF' }
          ]}>
            {message}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 60,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  popup: {
    minWidth: 120,
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
  },
  content: {
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#FFFFFF',
  },
});

export default CustomPopup; 