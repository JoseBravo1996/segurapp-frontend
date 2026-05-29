import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as segurappApi from './segurappApi';
import { navigateFromPush } from '../navigation/navigationRef';

export const PUSH_CHANNEL_ID = 'segurapp-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: 'Alertas SegurAPP',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#FF5E00',
    sound: 'default',
    enableVibrate: true,
  });
}

function getNotificationRoute(data) {
  const type = data?.type;
  if (type === 'alert_triggered' || type === 'alert_resolved') {
    return { routeName: 'Historial', params: undefined };
  }
  return null;
}

function handleNotificationResponse(response) {
  const data = response?.notification?.request?.content?.data;
  const target = getNotificationRoute(data);
  if (target) {
    navigateFromPush(target.routeName, target.params);
  }
}

export function setupPushNotificationListeners() {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Push] Notificación recibida:', notification.request.content.title);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleNotificationResponse(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

export async function registerPushTokenIfPossible() {
  if (Platform.OS === 'web') {
    console.log('[Push] Web no soporta notificaciones nativas.');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Push] Se requiere un dispositivo físico (no emulador sin Google Play).');
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permiso de notificaciones denegado.');
    return null;
  }

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData?.data;
    if (!token) {
      console.log('[Push] No se obtuvo token del dispositivo.');
      return null;
    }

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await segurappApi.registerDeviceToken({ token, platform });
    console.log(`[Push] Token ${platform} registrado (${token.slice(0, 12)}...).`);
    return token;
  } catch (error) {
    const appOwnership = Constants.appOwnership;
    if (appOwnership === 'expo') {
      console.log(
        '[Push] Expo Go no soporta FCM nativo. Generá un build con: npx expo prebuild && npx expo run:android'
      );
    } else {
      console.log('[Push] Error al registrar token:', error?.message || error);
    }
    return null;
  }
}
