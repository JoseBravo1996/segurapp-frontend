/**
 * useRealtimeAlerts.js
 * Hook unificado para alertas en tiempo real mediante Supabase Realtime
 * con desuscripción limpia, deduplicación de eventos y fallback a polling.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getRealtimeSession } from '../services/supabaseClient';
import * as segurappApi from '../services/segurappApi';

// Realtime entrega las filas con los nombres de columna de PostgreSQL (PascalCase)
function normalizeAlertRow(row) {
  return {
    id: row.Id,
    timestamp: row.Timestamp,
    userLat: row.UserLat,
    userLng: row.UserLng,
    isResolved: Boolean(row.IsResolved),
    isSilent: Boolean(row.IsSilent),
    clientAlertId: row.ClientAlertId,
    resolvedAt: row.ResolvedAt,
  };
}

// La fila no trae la palabra clave ni el contacto: se completa con el historial de la API
async function enrichAlert(alert) {
  try {
    const history = await segurappApi.getAlertHistory();
    const match = Array.isArray(history) ? history.find((a) => a.id === alert.id) : null;
    return match ? { ...alert, ...match } : alert;
  } catch {
    return alert;
  }
}

export default function useRealtimeAlerts({ onNewAlert, onAlertResolved, pollInterval = 12000, enabled = true } = {}) {
  const [connectionStatus, setConnectionStatus] = useState(
    isSupabaseConfigured ? 'connecting' : 'polling'
  );
  const processedAlertsRef = useRef(new Set());
  const lastAlertCountRef = useRef(null);
  // Nombre de canal único por instancia: realtime-js reutiliza canales con el mismo nombre
  const channelSuffixRef = useRef(Math.random().toString(36).slice(2, 10));

  // Procesador unificado para evitar duplicados
  const handleAlertEvent = useCallback((alert, eventType = 'INSERT') => {
    if (!alert || !alert.id) return;
    const eventKey = `${eventType}_${alert.id}_${alert.isResolved ? 'resolved' : 'active'}`;
    if (processedAlertsRef.current.has(eventKey)) return;

    processedAlertsRef.current.add(eventKey);

    if (eventType === 'INSERT' && onNewAlert) {
      onNewAlert(alert);
    } else if (eventType === 'UPDATE' && alert.isResolved && onAlertResolved) {
      onAlertResolved(alert);
    }
  }, [onNewAlert, onAlertResolved]);

  const handleRealtimeRow = useCallback(
    async (row, eventType) => {
      if (!row) return;
      const alert = await enrichAlert(normalizeAlertRow(row));
      handleAlertEvent(alert, eventType);
    },
    [handleAlertEvent]
  );

  // Suscripción Realtime si Supabase está disponible (token por usuario + filtro por UserId)
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) return;

    let cancelled = false;
    let channel = null;
    setConnectionStatus('connecting');

    (async () => {
      let session;
      try {
        session = await getRealtimeSession();
        await supabase.realtime.setAuth(session.token);
      } catch (error) {
        console.info('[SupabaseRealtime] Sin token de Realtime, se usa polling:', error?.message);
        if (!cancelled) setConnectionStatus('polling');
        return;
      }
      if (cancelled) return;

      const filter = `UserId=eq.${session.userId}`;
      channel = supabase
        .channel(`segurapp_alerts_${session.userId}_${channelSuffixRef.current}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'AlertHistories', filter },
          (payload) => handleRealtimeRow(payload.new, 'INSERT')
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'AlertHistories', filter },
          (payload) => handleRealtimeRow(payload.new, 'UPDATE')
        )
        .subscribe((status) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('polling');
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [enabled, handleRealtimeRow]);

  // Fallback de polling para entornos locales o de respaldo
  useEffect(() => {
    if (!enabled || connectionStatus === 'connected') return;

    let isMounted = true;
    let timerId = null;

    const checkUpdates = async () => {
      try {
        const history = await segurappApi.getAlertHistory();
        if (!isMounted || !Array.isArray(history)) return;

        if (lastAlertCountRef.current !== null && history.length > lastAlertCountRef.current) {
          const newest = history[0];
          if (newest && !newest.isResolved) {
            handleAlertEvent(newest, 'INSERT');
          }
        }
        lastAlertCountRef.current = history.length;
      } catch {
        // Fallback silencioso en caso de desconexión momentánea
      } finally {
        if (isMounted) {
          timerId = setTimeout(checkUpdates, pollInterval);
        }
      }
    };

    checkUpdates();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [enabled, connectionStatus, pollInterval, handleAlertEvent]);

  return { connectionStatus };
}

