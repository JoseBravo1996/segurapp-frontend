/**
 * offlineQueue.js
 * Cola de almacenamiento offline robusta e idempotente para alertas de emergencia.
 * Cumple con control de reintentos, identificadores UUID v4, preservación en error 401
 * y eliminación estricta únicamente tras confirmación del servidor.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as segurappApi from './segurappApi';
import { openWhatsAppUrl } from '../utils/openWhatsApp';

const QUEUE_STORAGE_KEY = '@segurapp_offline_alert_queue_v2';
const MAX_RETRIES = 5;

// Generador ligero de UUID v4 compatible con Web y React Native
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Encola una alerta pendiente con identificador único de idempotencia.
 * @param {object} alertData - { word, userLat, userLng, isSilent }
 * @returns {Promise<string>} clientAlertId generado
 */
export async function enqueueAlert(alertData) {
  try {
    const clientAlertId = alertData.clientAlertId || generateUUID();
    const alertItem = {
      clientAlertId,
      word: alertData.word,
      userLat: Number(alertData.userLat) || 0,
      userLng: Number(alertData.userLng) || 0,
      isSilent: Boolean(alertData.isSilent),
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    const existingRaw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const queue = existingRaw ? JSON.parse(existingRaw) : [];

    // Evitar duplicar en la cola local
    if (!queue.some((item) => item.clientAlertId === clientAlertId)) {
      queue.push(alertItem);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      console.log(`[OfflineQueue] Alerta encolada con ID: ${clientAlertId} (Palabra: ${alertData.word})`);
    }

    return clientAlertId;
  } catch (error) {
    console.error('[OfflineQueue] Error crítico guardando alerta offline:', error);
    throw error;
  }
}

/**
 * Retorna las alertas pendientes almacenadas localmente.
 * @returns {Promise<Array>}
 */
export async function getPendingAlerts() {
  try {
    const existingRaw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch {
    return [];
  }
}

/**
 * Retorna la cantidad de alertas pendientes de sincronización.
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const items = await getPendingAlerts();
  return items.length;
}

/**
 * Procesa la cola de alertas pendientes en orden cronológico (FIFO).
 * Preserva alertas ante fallos de conexión o error 401 de sesión.
 * @returns {Promise<{ sent: number, failed: number, preservedAuthError: boolean }>}
 */
export async function flushAlertQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return { sent: 0, failed: 0, preservedAuthError: false };

    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) {
      return { sent: 0, failed: 0, preservedAuthError: false };
    }

    console.log(`[OfflineQueue] Iniciando sincronización de ${queue.length} alerta(s)...`);

    let sent = 0;
    const remainingQueue = [];
    let preservedAuthError = false;

    for (const item of queue) {
      try {
        const payload = {
          word: item.word,
          userLat: item.userLat,
          userLng: item.userLng,
          isSilent: item.isSilent,
          clientAlertId: item.clientAlertId,
        };

        const result = await segurappApi.triggerAlert(payload);

        // Si se envió exitosamente (o era duplicado ya procesado por el backend)
        sent++;
        console.log(`[OfflineQueue] Alerta confirmada por el servidor: ${item.clientAlertId}`);

        // Si no es silenciosa y tiene contactos, avisar por WhatsApp si aplica
        if (!item.isSilent && result?.contacts?.length > 0) {
          const firstContact = result.contacts[0];
          await openWhatsAppUrl(
            firstContact.whatsappUrl,
            `Avisá manualmente a ${firstContact.name} (${firstContact.phone}).`
          );
        }
      } catch (err) {
        const status = err?.status;

        // Si es 401 (no autorizado), conservamos la alerta intacta para cuando renueve sesión
        if (status === 401) {
          preservedAuthError = true;
          remainingQueue.push(item);
          console.warn('[OfflineQueue] Sesión expirada durante sincronización. Alertas preservadas.');
          continue;
        }

        // Si es un error recuperable de red o 500, incrementamos reintentos
        const newRetries = (item.retryCount || 0) + 1;
        if (newRetries < MAX_RETRIES) {
          remainingQueue.push({ ...item, retryCount: newRetries });
          console.warn(
            `[OfflineQueue] Fallo en alerta ${item.clientAlertId} (intento ${newRetries}/${MAX_RETRIES}): ${err.message}`
          );
        } else {
          console.error(
            `[OfflineQueue] Se superó el máximo de reintentos para la alerta ${item.clientAlertId}. Se retiene como fallida.`
          );
          // Opcionalmente se puede archivar o retener para revisión del usuario
          remainingQueue.push({ ...item, retryCount: newRetries, status: 'max_retries_exceeded' });
        }
      }
    }

    // Actualizar almacenamiento con lo que quedó pendiente
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));

    return {
      sent,
      failed: remainingQueue.length,
      preservedAuthError,
    };
  } catch (error) {
    console.error('[OfflineQueue] Error general vaciando la cola:', error);
    return { sent: 0, failed: 0, preservedAuthError: false };
  }
}
