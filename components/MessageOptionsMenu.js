import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { height } = Dimensions.get('window');

const MessageOptionsMenu = ({ visible, onClose, onCopy, onSelect, onAddTag }) => {
  const { isDarkMode } = useTheme();
  const translateY = React.useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={[
          styles.menu,
          { backgroundColor: isDarkMode ? '#333' : '#FFFFFF' }
        ]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onCopy();
              onClose();
            }}
          >
            <MaterialIcons name="content-copy" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            <Text style={[styles.menuText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>คัดลอก</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onSelect();
              onClose();
            }}
          >
            <MaterialIcons name="check-box-outline-blank" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            <Text style={[styles.menuText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>เลือก</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onAddTag();
              onClose();
            }}
          >
            <MaterialIcons name="local-offer" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            <Text style={[styles.menuText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>เพิ่มแท็ก</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#999999',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MessageOptionsMenu; 