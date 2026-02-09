import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/useAuthStore';
import './src/i18n';

export default function App() {
  const language = useAuthStore((s) => s.language);

  useEffect(() => {
    // Restore persisted language on app launch
    const { setLanguage } = useAuthStore.getState();
    if (language) {
      setLanguage(language);
    }
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <RootNavigator />
    </NavigationContainer>
  );
}
