import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        try {
          const parsedTheme = JSON.parse(savedTheme);
          if (typeof parsedTheme === 'boolean') {
            setIsDarkMode(parsedTheme);
          }
        } catch (parseError) {
          await AsyncStorage.removeItem('theme');
          await AsyncStorage.setItem('theme', JSON.stringify(false));
        }
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      try {
        await AsyncStorage.setItem('theme', JSON.stringify(false));
      } catch (resetError) {
        console.error('Error resetting theme:', resetError);
      }
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', JSON.stringify(newTheme));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}