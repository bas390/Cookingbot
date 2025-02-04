import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LoadingSkeleton = () => {
  const { isDarkMode } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    skeletonItem: {
      height: 20,
      backgroundColor: isDarkMode ? '#333' : '#E5E5E5',
      borderRadius: 12,
      marginBottom: 12,
      opacity: 0.7,
    },
    skeletonAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDarkMode ? '#333' : '#E5E5E5',
      marginBottom: 16,
    },
    skeletonHeader: {
      height: 32,
      backgroundColor: isDarkMode ? '#333' : '#E5E5E5',
      borderRadius: 4,
      marginBottom: 24,
      width: '60%',
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
      <Animated.View style={[styles.skeletonHeader, { opacity }]} />
      {[1, 2, 3, 4, 5].map((item) => (
        <Animated.View
          key={item}
          style={[
            styles.skeletonItem,
            { opacity, width: `${Math.random() * 40 + 60}%` },
          ]}
        />
      ))}
    </View>
  );
};

export default LoadingSkeleton; 