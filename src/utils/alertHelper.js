import * as Location from 'expo-location';
import * as segurappApi from '../services/segurappApi';
import { openWhatsAppUrl } from './openWhatsApp';

export async function triggerAlertWithLocation(word, { notifyContact = true } = {}) {
  let userLat = 0;
  let userLng = 0;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    userLat = position.coords.latitude;
    userLng = position.coords.longitude;
  }

  const result = await segurappApi.triggerAlert({ word, userLat, userLng });

  if (notifyContact && result?.whatsappUrl) {
    await openWhatsAppUrl(
      result.whatsappUrl,
      `Avisá manualmente a ${result.contact?.name} (${result.contact?.phone}).`
    );
  }

  return result;
}

export async function markSafeAndNotify({ alertId } = {}) {
  const result = alertId
    ? await segurappApi.resolveAlert(alertId)
    : await segurappApi.resolveLatestAlert();

  if (result?.whatsappUrl) {
    await openWhatsAppUrl(
      result.whatsappUrl,
      `Avisá manualmente a ${result.contact?.name} que estás a salvo.`
    );
  }

  return result;
}
