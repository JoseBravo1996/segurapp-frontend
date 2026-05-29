import React, { useEffect } from 'react';
import { ActivityIndicator, View, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import WordsScreen from './src/screens/WordsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LocationScreen from './src/screens/LocationScreen';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { WordsProvider } from './src/context/WordsContext';
import VoiceListenerProvider from './src/providers/VoiceListenerProvider';
import PushNotificationProvider from './src/providers/PushNotificationProvider';
import { navigationRef } from './src/navigation/navigationRef';

const Stack = createStackNavigator();

function ensureWebViewportHeight() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'segurapp-web-layout';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
    }
    #root {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    body {
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
  `;
  document.head.appendChild(style);
}

function AppNavigator() {
  useEffect(() => {
    ensureWebViewportHeight();
  }, []);
  const { isReady, isAuthenticated } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050A18' }}>
        <ActivityIndicator size="large" color="#FF5E00" />
      </View>
    );
  }

  return (
    <View style={styles.appRoot}>
      <WordsProvider>
        <NavigationContainer ref={navigationRef}>
          <PushNotificationProvider />
          <VoiceListenerProvider />
          <Stack.Navigator
            initialRouteName={isAuthenticated ? 'Emergencia' : 'Login'}
            screenOptions={{
              headerShown: false,
              animationEnabled: false,
              cardStyle: { flex: 1 },
            }}
          >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Emergencia" component={HomeScreen} />
          <Stack.Screen name="Palabras" component={WordsScreen} />
          <Stack.Screen name="Contactos" component={ContactsScreen} />
          <Stack.Screen name="Historial" component={HistoryScreen} />
          <Stack.Screen name="Ubicación" component={LocationScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </WordsProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
