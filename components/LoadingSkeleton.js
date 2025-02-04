import React, { useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const LoadingSkeleton = () => {
  const { isDarkMode } = useTheme();
  const shimmerValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    shimmer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.2,
      transform: [{ translateX }],
      backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
    },
    messageGroup: {
      marginBottom: 24,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F0F0F0',
      marginRight: 12,
      overflow: 'hidden',
    },
    messageBubble: {
      flex: 1,
      maxWidth: '75%',
      minHeight: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F0F0F0',
      overflow: 'hidden',
      padding: 16,
    },
    shortMessage: {
      width: '40%',
    },
    mediumMessage: {
      width: '60%',
    },
    longMessage: {
      width: '75%',
    },
    userMessageRow: {
      flexDirection: 'row-reverse',
    },
    userMessageBubble: {
      backgroundColor: isDarkMode ? '#333333' : '#E8E8E8',
      marginLeft: 12,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDarkMode ? '#666666' : '#CCCCCC',
      marginRight: 4,
    },
    statusDot: {
      backgroundColor: '#6de67b',
    },
  });

  const renderMessageBubble = (isUser, size) => (
    <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Animated.View style={styles.shimmer} />
        </View>
      )}
      <View style={[
        styles.messageBubble,
        isUser && styles.userMessageBubble,
        size === 'short' && styles.shortMessage,
        size === 'medium' && styles.mediumMessage,
        size === 'long' && styles.longMessage,
      ]}>
        <Animated.View style={styles.shimmer} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.messageGroup}>
        {renderMessageBubble(false, 'medium')}
        {renderMessageBubble(true, 'short')}
      </View>
      
      <View style={styles.messageGroup}>
        {renderMessageBubble(false, 'long')}
        {renderMessageBubble(true, 'medium')}
        {renderMessageBubble(true, 'short')}
      </View>

      <View style={styles.messageGroup}>
        {renderMessageBubble(false, 'short')}
        <View style={styles.typingIndicator}>
          <View style={styles.avatar}>
            <Animated.View style={styles.shimmer} />
          </View>
          <View style={[styles.messageBubble, { width: 60, minHeight: 30 }]}>
            <Animated.View style={styles.shimmer} />
          </View>
        </View>
      </View>
    </View>
  );
};

export default LoadingSkeleton; 