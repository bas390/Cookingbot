import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import PinnedMessagesScreen from './screens/PinnedMessagesScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import UserPreferencesScreen from './screens/UserPreferencesScreen';
import { cleanup } from './firebase';
import { Easing } from 'react-native';
import { initSounds, cleanupSounds } from './utils/soundUtils';

const Stack = createStackNavigator();

const config = {
  animation: 'timing',
  config: {
    duration: 200,
    easing: Easing.ease,
  },
};

// แยก Navigator ออกมาเป็น component แยก
function AppNavigator() {
  const { isDarkMode } = useTheme();

  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' },
        transitionSpec: {
          open: config,
          close: config,
        },
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
              opacity: current.progress,
            },
          };
        },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} />
      <Stack.Screen name="PinnedMessages" component={PinnedMessagesScreen} />
      <Stack.Screen name="UserPreferences" component={UserPreferencesScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // เริ่มต้นระบบเสียง
    initSounds();

    return () => {
      // ทำความสะอาดเมื่อปิดแอพ
      cleanupSounds();
    };
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}
