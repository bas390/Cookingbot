import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import { ThemeProvider } from './context/ThemeContext';
import PinnedMessagesScreen from './screens/PinnedMessagesScreen';
import AdvancedSearchScreen from './screens/AdvancedSearchScreen';
import RecipeVideoScreen from './screens/RecipeVideoScreen';
import RecipeRecommendationScreen from './screens/RecipeRecommendationScreen';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './utils/notifications';

const Stack = createStackNavigator();

// ตั้งค่าการแจ้งเตือนเริ่มต้น
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  React.useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chatbot"
            component={ChatbotScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PinnedMessages"
            component={PinnedMessagesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AdvancedSearch"
            component={AdvancedSearchScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RecipeVideo"
            component={RecipeVideoScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RecipeRecommendation"
            component={RecipeRecommendationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
