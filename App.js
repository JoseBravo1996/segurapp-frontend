import React from 'react';
import { ActivityIndicator, View } from 'react-native';
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

function AppNavigator() {
  const { isReady, isAuthenticated } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050A18' }}>
        <ActivityIndicator size="large" color="#FF5E00" />
      </View>
    );
  }

  return (
    <WordsProvider>
      <NavigationContainer ref={navigationRef}>
        <PushNotificationProvider />
        <VoiceListenerProvider />
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'Emergencia' : 'Login'}
          screenOptions={{
            headerShown: false,
            animationEnabled: false,
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
