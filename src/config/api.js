import { Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveDevHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') return host;
  }
  return null;
}

export function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const devHost = resolveDevHost();
  if (devHost) {
    return `http://${devHost}:5093`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5093';
  }

  return 'http://localhost:5093';
}
