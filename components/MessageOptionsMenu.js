import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { height } = Dimensions.get('window');

const MessageOptionsMenu = ({ visible, onClose, onCopy, onSelect }) => {
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
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
          },
        ]}
      >
        <View style={styles.handle} />
        <TouchableOpacity
          style={styles.option}
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
          <Text style={[styles.optionText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            คัดลอกข้อความ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
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
          <Text style={[styles.optionText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            เลือกข้อความ
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
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
  container: {
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MessageOptionsMenu; 