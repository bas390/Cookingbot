import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { height } = Dimensions.get('window');

const MessageOptionsMenu = ({ visible, onClose, onCopy, onSelect }) => {
  const { isDarkMode } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 12,
        velocity: 8,
      }).start();
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      backgroundColor: isDarkMode ? '#333' : '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      transform: [{ translateY: slideAnim }],
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: isDarkMode ? '#666' : '#E0E0E0',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 12,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 16,
    },
    menuText: {
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    divider: {
      height: 1,
      backgroundColor: isDarkMode ? '#444' : '#F0F0F0',
      marginHorizontal: 16,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={styles.menuContainer}>
          <View style={styles.handle} />
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onCopy();
              onClose();
            }}
          >
            <MaterialIcons 
              name="content-copy" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
            <Text style={styles.menuText}>คัดลอก</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onSelect();
              onClose();
            }}
          >
            <MaterialIcons 
              name="check-box-outline-blank" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
            <Text style={styles.menuText}>เลือก</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

export default MessageOptionsMenu; 