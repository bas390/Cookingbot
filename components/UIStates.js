import React from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Loading State
export const LoadingState = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00B900" />
      <Text style={[styles.text, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
        กำลังโหลด...
      </Text>
    </View>
  );
};

// Error State
export const ErrorState = ({ message, onRetry }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <View style={styles.container}>
      <MaterialIcons 
        name="error-outline" 
        size={64} 
        color={isDarkMode ? '#FF6B6B' : '#FF4444'} 
      />
      <Text style={[styles.text, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
        {message || 'เกิดข้อผิดพลาด'}
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>ลองใหม่อีกครั้ง</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Empty State
export const EmptyState = ({ message, icon }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <View style={styles.container}>
      <MaterialIcons
        name={icon || 'inbox'}
        size={64}
        color={isDarkMode ? '#666' : '#999'}
      />
      <Text style={[styles.text, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
        {message || 'ไม่พบข้อมูล'}
      </Text>
    </View>
  );
};

// Fade In Animation
export const FadeInView = ({ children, style }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
};

// Scale Animation
export const ScaleView = ({ children, style }) => {
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#00B900',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 