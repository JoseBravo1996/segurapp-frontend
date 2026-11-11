/**
 * useRealtimeAlerts.js
 * Hook unificado para alertas en tiempo real mediante Supabase Realtime
 * con desuscripción limpia, deduplicación de eventos y fallback a polling.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import * as segurappApi from '../services/segurappApi';

export default function useRealtimeAlerts({ onNewAlert, onAlertResolved, pollInterval = 12000, enabled = true } = {}) {
  const [connectionStatus, setConnectionStatus] = useState(
    isSupabaseConfigured ? 'connecting' : 'polling'
  );
  const processedAlertsRef = useRef(new Set());
  const lastAlertCountRef = useRef(null);

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

  // Suscripción Realtime si Supabase está disponible
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) return;

    setConnectionStatus('connecting');

    const channel = supabase
      .channel('segurapp_alert_stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'AlertHistories' },
        (payload) => {
          handleAlertEvent(payload.new, 'INSERT');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'AlertHistories' },
        (payload) => {
          handleAlertEvent(payload.new, 'UPDATE');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('polling');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, handleAlertEvent]);

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

