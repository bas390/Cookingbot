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
        tension: 50,
        friction: 7,
      }).start();

      // Auto hide after 2 seconds
      const timer = setTimeout(() => {
        hidePopup();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hidePopup = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
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
            backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="content-copy" size={24} color="#FFFFFF" />
          </View>
          <Text style={[styles.message, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
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
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  popup: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6de67b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CustomPopup; 