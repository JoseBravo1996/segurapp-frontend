import { Alert, Platform } from 'react-native';

/**
 * Alertas visibles en web (Alert.alert de RN no hace nada en react-native-web).
 */
export function showAppAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const text = [title, message].filter(Boolean).join('\n\n');
      window.alert(text || 'Aviso');
    }
    const primary = buttons?.find((b) => b.style !== 'cancel') ?? buttons?.[0];
    primary?.onPress?.();
    return;
  }
  Alert.alert(title, message, buttons);
}
