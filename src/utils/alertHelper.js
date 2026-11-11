import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import * as segurappApi from '../services/segurappApi';
import { enqueueAlert, generateUUID } from '../services/offlineQueue';
import { openWhatsAppUrl } from './openWhatsApp';

/**
 * Dispara una alerta de pánico con la ubicación actual del usuario.
 * Si no hay internet o falla la red, la guarda en la cola local segura sin perderla.
 * @param {string} word - Palabra clave seleccionada
 * @param {boolean} isSilent - Si true, no emite sonidos ni abre ventanas que comprometan al usuario
 * @param {object} options
 */
export async function triggerAlertWithLocation(word, isSilent = false, { notifyContacts = true } = {}) {
  let userLat = 0;
  let userLng = 0;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
    }
  } catch (locErr) {
    console.warn('[alertHelper] No se pudo obtener ubicación GPS:', locErr.message);
  }

  const clientAlertId = generateUUID();

  // Verificar conectividad antes de intentar llamada
  const netState = await NetInfo.fetch();
  const hasConnection = Boolean(netState.isConnected && netState.isInternetReachable !== false);

  if (!hasConnection) {
    console.log('[alertHelper] Sin conexión. Guardando alerta en cola local segura...');
    await enqueueAlert({ word, userLat, userLng, isSilent, clientAlertId });
    return {
      offlineQueued: true,
      clientAlertId,
      word,
      isSilent,
      userLat,
      userLng,
    };
  }

  try {
    const result = await segurappApi.triggerAlert({
      word,
      userLat,
      userLng,
      isSilent,
      clientAlertId,
    });

    // En modo silencioso (isSilent = true), NO abrir aplicaciones externas en el emisor
    if (!isSilent && notifyContacts && result?.contacts?.length > 0) {
      const firstContact = result.contacts[0];
      await openWhatsAppUrl(
        firstContact.whatsappUrl,
        `Avisá manualmente a ${firstContact.name} (${firstContact.phone}).`
      );
    }

    return result;
  } catch (networkError) {
    // Si falla la red durante la petición, encolamos automáticamente para evitar pérdida
    console.warn('[alertHelper] Error de red al enviar alerta. Encolando offline:', networkError.message);
    await enqueueAlert({ word, userLat, userLng, isSilent, clientAlertId });
    return {
      offlineQueued: true,
      clientAlertId,
      word,
      isSilent,
      userLat,
      userLng,
      networkError: networkError.message,
    };
  }
}

/**
 * Marca la alerta como resuelta y notifica a los contactos de emergencia.
 */
export async function markSafeAndNotify({ alertId } = {}) {
  const result = alertId
    ? await segurappApi.resolveAlert(alertId)
    : await segurappApi.resolveLatestAlert();

  // Si devuelve un enlace general o el primer contacto, abrir WhatsApp
  if (result?.whatsappUrl) {
    const contactName = result.contact?.name || 'tus contactos';
    await openWhatsAppUrl(
      result.whatsappUrl,
      `Avisá manualmente a ${contactName} que estás a salvo.`
    );
  }

  return result;
}
