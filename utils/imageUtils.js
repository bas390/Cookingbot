import { MaterialIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet } from 'react-native';

// ฟังก์ชันสำหรับโหลดรูปภาพ
const IMAGES = {
  // ใช้ static require เพื่อให้รูปถูก bundle ไปกับแอพ
  bot: require('../assets/images/icon.png'), // ใช้ icon.png แทน chef-icon.png
  default: require('../assets/images/icon.png')
};

export const getBotIcon = () => {
  try {
    return IMAGES.bot;
  } catch (error) {
    console.error('Error loading bot icon:', error);
    return IMAGES.default;
  }
};

export const BotIcon = ({ size = 24, color = '#000000', isAI = false }) => {
  // Validate props
  const validSize = typeof size === 'number' ? size : 24;
  const validColor = typeof color === 'string' ? color : '#000000';
  
  try {
    return (
      <View style={styles.iconContainer}>
        <MaterialIcons 
          name={isAI ? "psychology" : "memory"}
          size={validSize}
          color={validColor}
          style={styles.icon}
        />
        <View style={[
          styles.statusDot, 
          { 
            borderColor: validColor,
            backgroundColor: isAI ? '#6de67b' : '#888888'
          }
        ]} />
      </View>
    );
  } catch (error) {
    console.error('Error rendering BotIcon:', error);
    // Fallback icon
    return (
      <MaterialIcons 
        name="android" 
        size={validSize}
        color={validColor}
      />
    );
  }
};

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    // เพิ่ม shadow ให้ไอคอนดูมีมิติ
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  }
}); 