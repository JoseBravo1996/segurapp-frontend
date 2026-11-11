/**
 * useOfflineSync.js
 * Sincronización en segundo plano de alertas guardadas en modo offline.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { flushAlertQueue, getPendingCount } from '../services/offlineQueue';
import { showAppAlert } from '../utils/showAppAlert';

export default function useOfflineSync() {
  const wasOfflineRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!isConnected) {
        wasOfflineRef.current = true;
        refreshPendingCount();
        return;
      }

      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        console.log('[useOfflineSync] Conexión recuperada. Vaciando cola de alertas...');

        const { sent, failed, preservedAuthError } = await flushAlertQueue();
        refreshPendingCount();

        if (sent > 0) {
          showAppAlert(
            '📶 Conexión restaurada',
            `Se sincronizaron con éxito ${sent} alerta(s) de emergencia que estaban pendientes.`
          );
        }

        if (preservedAuthError) {
          showAppAlert(
            '⚠️ Sesión expirada',
            'Iniciá sesión nuevamente para completar el envío de tus alertas pendientes.'
          );
        } else if (failed > 0) {
          console.warn(`[useOfflineSync] ${failed} alerta(s) siguen pendientes tras reintento.`);
        }
      }
    });

    return () => unsubscribe();
  }, [refreshPendingCount]);

  return { pendingCount, refreshPendingCount };
}
