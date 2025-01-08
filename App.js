import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider } from './context/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import PinnedMessagesScreen from './screens/PinnedMessagesScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import { cleanup } from './firebase';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} />
          <Stack.Screen name="PinnedMessages" component={PinnedMessagesScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
