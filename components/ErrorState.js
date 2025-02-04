import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ErrorState = ({ error, onRetry }) => {
  const { isDarkMode } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: isDarkMode ? '#CCCCCC' : '#666666',
      marginBottom: 24,
      textAlign: 'center',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#6de67b',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    retryText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const getErrorMessage = (error) => {
    if (error?.code === 'auth/network-request-failed') {
      return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    }
    if (error?.code === 'permission-denied') {
      return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
    }
    return error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  };

  return (
    <View style={styles.container}>
      <MaterialIcons
        name="error-outline"
        size={64}
        color="#FF3B30"
        style={styles.icon}
      />
      <Text style={styles.title}>เกิดข้อผิดพลาด</Text>
      <Text style={styles.message}>
        {getErrorMessage(error)}
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ErrorState; 