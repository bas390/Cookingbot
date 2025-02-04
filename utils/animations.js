import { Animated, Easing } from 'react-native';

export const slideAnimation = {
  in: (duration = 300) => ({
    transform: [{
      translateX: new Animated.Value(100)
    }],
    opacity: new Animated.Value(0)
  }),
  out: (duration = 300) => ({
    transform: [{
      translateX: new Animated.Value(0)
    }],
    opacity: new Animated.Value(1)
  })
}; 