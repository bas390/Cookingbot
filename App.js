import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import RegisterScreen from './screens/RegisterScreen'; // นำเข้า RegisterScreen

const Stack = createStackNavigator();

export default function App() {
  return (
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
          options={{ headerShown: false }} // ซ่อน Header ของหน้าสมัครสมาชิก
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ 
            title: 'Chat History',
            headerShown: false 
          }}
        />
        <Stack.Screen
          name="Chatbot"
          component={ChatbotScreen}
          options={({ route }) => ({
            title: `Chat ${route.params.chatId || ''}`,
            headerShown: false
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
