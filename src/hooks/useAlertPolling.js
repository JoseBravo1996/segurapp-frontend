import { useEffect, useRef, useCallback } from 'react';
import * as segurappApi from '../services/segurappApi';

/**
 * Hook que hace polling al historial de alertas cada `intervalMs` milisegundos.
 * Detecta nuevas alertas comparando IDs y llama a `onNewAlert` cuando aparece una nueva.
 *
 * @param {function} onNewAlert - Callback llamado con la nueva alerta cuando se detecta
 * @param {number} intervalMs - Intervalo de polling en ms (default: 15000)
 * @param {boolean} enabled - Si false, el polling se detiene
 */
export default function useAlertPolling(onNewAlert, intervalMs = 15000, enabled = true) {
  const lastKnownIdRef = useRef(null);
  const onNewAlertRef = useRef(onNewAlert);

  // Actualizar la ref del callback sin recrear el efecto
  useEffect(() => {
    onNewAlertRef.current = onNewAlert;
  }, [onNewAlert]);

  const poll = useCallback(async () => {
    try {
      const alerts = await segurappApi.getAlertHistory();
      if (!alerts || alerts.length === 0) return;

      const latestAlert = alerts[0]; // El historial viene ordenado por Timestamp DESC

      if (lastKnownIdRef.current === null) {
        // Primera carga: solo guardamos el último ID conocido, sin notificar
        lastKnownIdRef.current = latestAlert.id;
        return;
      }

      if (latestAlert.id !== lastKnownIdRef.current) {
        // Hay alertas nuevas desde la última comprobación
        const newAlerts = alerts.filter((a) => a.id > lastKnownIdRef.current);
        lastKnownIdRef.current = latestAlert.id;

        // Notificar cada nueva alerta (de más antigua a más nueva)
        newAlerts.reverse().forEach((alert) => {
          onNewAlertRef.current?.(alert);
        });
      }
    } catch (error) {
      // Fallo silencioso: el polling reintentará en el próximo ciclo
      console.log('[useAlertPolling] Error en polling:', error?.message);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Poll inmediato al montar para establecer baseline
    poll();

    const intervalId = setInterval(poll, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, intervalMs, poll]);
}
