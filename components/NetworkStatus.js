import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

const NetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const { isDarkMode } = useTheme();
  const translateY = new Animated.Value(-50);

  useEffect(() => {
    const checkConnection = async () => {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected);
    };
    
    checkConnection();

    const unsubscribe = NetInfo.addEventListener(state => {
      if (isConnected !== state.isConnected) {
        setIsConnected(state.isConnected);
        
        if (state.isConnected) {
          // เมื่อกลับมาออนไลน์
          setShowOnlineStatus(true);
          setTimeout(() => {
            setShowOnlineStatus(false);
          }, 3000); // แสดง 3 วินาที
        }
        
        Animated.spring(translateY, {
          toValue: (state.isConnected && !showOnlineStatus) ? -50 : 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10
        }).start();
      }
    });

    return () => unsubscribe();
  }, [isConnected]);

  if (isConnected && !showOnlineStatus) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          backgroundColor: isDarkMode 
            ? isConnected 
              ? 'rgba(40, 167, 69, 0.95)' 
              : 'rgba(51, 51, 51, 0.95)'
            : isConnected
              ? 'rgba(227, 252, 234, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
          top: Platform.OS === 'ios' ? 90 : 60
        }
      ]}
    >
      <View style={styles.content}>
        <MaterialIcons 
          name={isConnected ? "wifi" : "wifi-off"}
          size={16}
          color={isDarkMode 
            ? isConnected ? '#FFF' : '#FF6B6B'
            : isConnected ? '#28a745' : '#FF4444'
          }
        />
        <Text style={[
          styles.text,
          { 
            color: isDarkMode 
              ? '#FFF' 
              : isConnected ? '#28a745' : '#333'
          }
        ]}>
          {isConnected ? 'กลับมาออนไลน์แล้ว' : 'ไม่มีการเชื่อมต่อ'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderRadius: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  }
});

export default NetworkStatus; 