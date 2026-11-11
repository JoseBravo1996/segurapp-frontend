import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import PanicConfirmModal from '../components/PanicConfirmModal';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';

import { useWords } from '../context/WordsContext';
import VoiceService from '../services/VoiceService';
import * as segurappApi from '../services/segurappApi';
import { triggerAlertWithLocation, markSafeAndNotify } from '../utils/alertHelper';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';
import useRealtimeAlerts from '../hooks/useRealtimeAlerts';
import useOfflineSync from '../hooks/useOfflineSync';
import { useGuidedOnboarding } from '../context/GuidedOnboardingContext';
import GuidedHighlight from '../components/GuidedHighlight';

export default function HomeScreen({ navigation }) {
  const responsive = useResponsive();
  const { isSmallPhone, isMobile, isDesktop, height } = responsive;

  const panicSize = useMemo(() => {
    if (height < 680) return 155;
    if (isSmallPhone) return 165;
    if (isMobile) return 185;
    if (isDesktop) return 210;
    return 195;
  }, [height, isSmallPhone, isMobile, isDesktop]);

  const [contacts, setContacts] = useState([]);
  const [recentAlert, setRecentAlert] = useState(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [markingSafe, setMarkingSafe] = useState(false);
  const [panicModalVisible, setPanicModalVisible] = useState(false);
  const [defaultSilentModal, setDefaultSilentModal] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { words } = useWords();
  const { pendingCount, refreshPendingCount } = useOfflineSync();
  const { checkGuidedOnboarding } = useGuidedOnboarding();

  useEffect(() => {
    // Comprobar si requiere el asistente guiado interactivo
    checkGuidedOnboarding();
  }, [checkGuidedOnboarding]);

  // Escucha Realtime mediante Supabase (con fallback a polling)
  const { connectionStatus } = useRealtimeAlerts({
    onNewAlert: useCallback((newAlert) => {
      setRecentAlert(newAlert);
      showAppAlert(
        newAlert.isSilent ? '🔇 Alerta Silenciosa Registrada' : '🚨 Nueva Alerta en Tiempo Real',
        `Palabra: "${newAlert.word}" · ${new Date(newAlert.timestamp).toLocaleTimeString('es-AR')}`
      );
    }, []),
    onAlertResolved: useCallback((resolvedAlert) => {
      setRecentAlert((prev) => (prev?.id === resolvedAlert.id ? { ...prev, isResolved: true } : prev));
    }, []),
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const [contactsData, historyData] = await Promise.allSettled([
        segurappApi.getContacts(),
        segurappApi.getAlertHistory(),
      ]);

      if (contactsData.status === 'fulfilled' && Array.isArray(contactsData.value)) {
        setContacts(contactsData.value);
      }

      if (historyData.status === 'fulfilled' && Array.isArray(historyData.value) && historyData.value.length > 0) {
        setRecentAlert(historyData.value[0]);
      }
      refreshPendingCount();
    } catch (err) {
      console.log('Error cargando datos del dashboard:', err);
    }
  }, [refreshPendingCount]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      if (words.length > 0 && !VoiceService.isRunning()) {
        const wordList = words.map((w) => w.word);
        VoiceService.setWords(wordList);
        VoiceService.start();
      }
      setListening(VoiceService.isRunning());
    }, [loadDashboardData, words])
  );

  // Auto-iniciar reconocimiento continuo siempre activo al cargar palabras
  useEffect(() => {
    if (words.length > 0 && !VoiceService.isRunning()) {
      const wordList = words.map((w) => w.word);
      VoiceService.setWords(wordList);
      VoiceService.start();
      setListening(true);
    }
  }, [words]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    setListening(VoiceService.isRunning());
    const unsub = VoiceService.onStatus(({ type, message, status }) => {
      if (type === 'error' && message) {
        setVoiceHint(message);
        setListening(false);
      } else if (type === 'status') {
        setListening(status === 'listening');
      }
    });
    return unsub;
  }, []);

  const handleOpenEmergency = (isSilent = false) => {
    if (contacts.length === 0) {
      showAppAlert(
        'Sin Contactos de Emergencia',
        'Antes de emitir una alerta debés agregar al menos un contacto para que reciba tu ubicación.',
        [{ text: 'Ir a Contactos', onPress: () => navigation.navigate('Contactos') }]
      );
      return;
    }

    if (words.length === 0) {
      showAppAlert(
        'Sin Palabras Clave',
        'Configurá al menos una palabra clave para vincular la alerta de pánico.',
        [{ text: 'Configurar', onPress: () => navigation.navigate('Palabras') }]
      );
      return;
    }

    setDefaultSilentModal(isSilent);
    setPanicModalVisible(true);
  };

  const executePanicAlert = async (word, isSilent = false) => {
    setSendingAlert(true);
    try {
      const result = await triggerAlertWithLocation(word, isSilent);
      setPanicModalVisible(false);

      if (result.offlineQueued) {
        showAppAlert(
          '📶 Alerta guardada localmente',
          'No tenés conexión a internet. La alerta fue asegurada en la cola offline y se sincronizará automáticamente apenas se restaure la red.'
        );
        refreshPendingCount();
        return;
      }

      const totalContacts = result.contacts?.length ?? 1;
      showAppAlert(
        isSilent ? '🔇 ALERTA SILENCIOSA REGISTRADA' : '🚨 ¡EMERGENCIA ACTIVADA!',
        isSilent
          ? 'Tu ubicación fue transmitida en modo silencioso sin alertas en tu dispositivo.'
          : `Se notificó tu ubicación GPS a tus ${totalContacts} contactos de emergencia.`
      );
      loadDashboardData();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo enviar la alerta.';
      showAppAlert('Error de Envío', message);
    } finally {
      setSendingAlert(false);
    }
  };

  const handleMarkSafe = async () => {
    setMarkingSafe(true);
    try {
      await markSafeAndNotify();
      showAppAlert('✓ Estás a Salvo', 'La alerta fue marcada como resuelta y se notificó a tus contactos.');
      loadDashboardData();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No hay alertas activas para cerrar.';
      showAppAlert('Aviso', message);
    } finally {
      setMarkingSafe(false);
    }
  };

  const toggleListening = () => {
    if (words.length === 0) {
      showAppAlert('Sin palabras clave', 'Debés configurar al menos una palabra clave.');
      return;
    }

    if (VoiceService.isRunning()) {
      VoiceService.stop();
      setListening(false);
      setVoiceHint('');
    } else {
      const wordList = words.map((w) => w.word);
      VoiceService.setWords(wordList);
      const started = VoiceService.start();
      if (started) {
        setListening(true);
        setVoiceHint('Escuchando palabra clave de auxilio en voz alta...');
      }
    }
  };

  return (
    <AppLayout currentScreen="Emergencia">
      <ScreenScrollView contentContainerStyle={styles.scrollContainer}>
        {/* BANNER DE ESTADO Y CONECTIVIDAD DEL SISTEMA */}
        <GuidedHighlight targetId="home_status_card" tooltipPosition="bottom">
          <View style={styles.statusBarCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusIndicatorGroup}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        connectionStatus === 'connected'
                          ? colors.status.success
                          : colors.status.warning,
                    },
                  ]}
                />
                <Text style={styles.statusTitle}>
                  {connectionStatus === 'connected'
                    ? 'Sistema en Tiempo Real (Supabase Activo)'
                    : 'Monitoreo Activo (Modo Conectado)'}
                </Text>
              </View>

              {pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Ionicons name="cloud-offline" size={14} color="#D97706" />
                  <Text style={styles.pendingText}>{pendingCount} pendiente(s)</Text>
                </View>
              )}
            </View>
          </View>
        </GuidedHighlight>

        {/* BOTÓN PRINCIPAL DE EMERGENCIA (ALTA JERARQUÍA) */}
        <View style={styles.panicSection}>
          <Text style={styles.sectionHeaderTitle}>CENTRO DE ACTIVACIÓN RÁPIDA</Text>
          <Text style={styles.sectionSubtitle}>
            Presioná para disparar la alerta y compartir tu ubicación GPS en tiempo real.
          </Text>

          <GuidedHighlight targetId="home_panic_btn" tooltipPosition="bottom">
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginVertical: 18 }}>
              <TouchableOpacity
                style={[
                  styles.panicButton,
                  {
                    width: panicSize,
                    height: panicSize,
                    borderRadius: panicSize / 2,
                  },
                ]}
                activeOpacity={0.82}
                onPress={() => handleOpenEmergency(false)}
                disabled={sendingAlert}
              >
                <View
                  style={[
                    styles.panicRing,
                    {
                      width: panicSize - 26,
                      height: panicSize - 26,
                      borderRadius: (panicSize - 26) / 2,
                    },
                  ]}
                >
                  <View style={styles.panicInner}>
                    <Ionicons name="warning" size={Math.round(panicSize * 0.34)} color="#FFFFFF" />
                    <Text style={styles.panicMainText}>EMERGENCIA</Text>
                    <Text style={styles.panicSubText}>Presionar</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </GuidedHighlight>

          {/* ACCIÓN SILENCIOSA RÁPIDA Y RESOLUCIÓN */}
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.silentQuickBtn}
              onPress={() => handleOpenEmergency(true)}
              disabled={sendingAlert}
              activeOpacity={0.75}
            >
              <Ionicons name="volume-mute" size={20} color={colors.brand.dark} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.silentQuickText}>Alerta Silenciosa</Text>
                <Text style={styles.silentQuickSub}>Sin sonido en tu teléfono</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.safeQuickBtn}
              onPress={handleMarkSafe}
              disabled={markingSafe}
              activeOpacity={0.75}
            >
              <Ionicons name="checkmark-done-circle" size={20} color={colors.status.success} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.safeQuickText}>
                  {markingSafe ? 'Cerrando...' : 'Estoy a Salvo'}
                </Text>
                <Text style={styles.safeQuickSub}>Cerrar alerta activa</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* MÉTRICAS Y ACCESOS RÁPIDOS DEL CENTRO DE CONTROL */}
        <View style={styles.metricsContainer}>
          {/* Tarjeta Contactos */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Contactos')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: colors.brand.accentLight }]}>
              <Ionicons name="people" size={22} color={colors.brand.accent} />
            </View>
            <Text style={styles.metricValue}>{contacts.length}</Text>
            <Text style={styles.metricLabel}>Contactos activos</Text>
          </TouchableOpacity>

          {/* Tarjeta Palabras Clave */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Palabras')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="key" size={22} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>{words.length}/3</Text>
            <Text style={styles.metricLabel}>Palabras clave</Text>
          </TouchableOpacity>

          {/* Tarjeta Mapa General */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Historial')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: colors.status.successLight }]}>
              <Ionicons name="map" size={22} color={colors.status.success} />
            </View>
            <Text style={styles.metricValue}>Mapa</Text>
            <Text style={styles.metricLabel}>Ver historial</Text>
          </TouchableOpacity>
        </View>

        {/* MONITOREO DE VOZ SIEMPRE ACTIVO */}
        <View style={[styles.voiceCard, listening && styles.voiceCardActive]}>
          <View style={styles.voiceHeader}>
            <View style={[styles.voiceIconWrap, listening && styles.voiceIconWrapActive]}>
              <Ionicons
                name={listening ? 'mic' : 'mic-off'}
                size={22}
                color={listening ? '#15803D' : '#64748B'}
              />
            </View>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                <Text style={[styles.voiceTitle, listening && styles.voiceTitleActive]}>
                  Detección de Auxilio por Voz
                </Text>
                <View style={[styles.voiceBadge, listening && styles.voiceBadgeActive]}>
                  {listening && <View style={styles.voiceDot} />}
                  <Text style={[styles.voiceBadgeText, listening && styles.voiceBadgeTextActive]}>
                    {listening ? 'Siempre Activo 24/7' : 'En Pausa'}
                  </Text>
                </View>
              </View>

              <Text style={styles.voiceDesc}>
                {voiceHint ||
                  (listening
                    ? 'Monitoreo en segundo plano activo. Pronunciá tu palabra clave ante cualquier emergencia.'
                    : 'Monitoreo en pausa. Presioná el botón para reanudar la detección continua.')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.voiceBtn, listening && styles.voiceBtnActive]}
              onPress={toggleListening}
              activeOpacity={0.8}
            >
              <Ionicons name={listening ? 'mic' : 'play'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ÚLTIMA ALERTA REGISTRADA */}
        {recentAlert && (
          <View style={styles.recentAlertCard}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>ÚLTIMA ALERTA REGISTRADA</Text>
              <View
                style={[
                  styles.recentBadge,
                  {
                    backgroundColor: recentAlert.isResolved
                      ? colors.status.successLight
                      : colors.emergency.light,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.recentBadgeText,
                    {
                      color: recentAlert.isResolved
                        ? colors.status.success
                        : colors.emergency.primary,
                    },
                  ]}
                >
                  {recentAlert.isResolved ? '✓ Resuelta' : '🚨 Activa'}
                </Text>
              </View>
            </View>
            <Text style={styles.recentWord}>Palabra clave: "{recentAlert.word}"</Text>
            <Text style={styles.recentMeta}>
              🕒 {new Date(recentAlert.timestamp).toLocaleString('es-AR')}
            </Text>
            <TouchableOpacity
              style={styles.viewHistoryBtn}
              onPress={() => navigation.navigate('Historial')}
            >
              <Text style={styles.viewHistoryText}>Ver detalles en el mapa interactivo →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScreenScrollView>

      {/* MODAL DE CONFIRMACIÓN DE EMERGENCIA */}
      <PanicConfirmModal
        visible={panicModalVisible}
        words={words}
        defaultSilent={defaultSilentModal}
        loading={sendingAlert}
        onCancel={() => setPanicModalVisible(false)}
        onConfirm={executePanicAlert}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  statusBarCard: {
    width: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: 16,
    elevation: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicatorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.dark,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  panicSection: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: 18,
    elevation: 3,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.emergency.primary,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 320,
  },
  panicButton: {
    backgroundColor: colors.emergency.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.emergency.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  panicRing: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicMainText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  panicSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  silentQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.borderStrong,
    padding: 12,
    borderRadius: 14,
  },
  silentQuickText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.dark,
  },
  silentQuickSub: {
    fontSize: 10,
    color: colors.neutral.textMuted,
  },
  safeQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.successLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 14,
  },
  safeQuickText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.status.success,
  },
  safeQuickSub: {
    fontSize: 10,
    color: '#15803D',
  },
  metricsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    elevation: 1,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand.dark,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.neutral.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  voiceCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  voiceCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceIconWrapActive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand.dark,
  },
  voiceTitleActive: {
    color: '#064E3B',
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  voiceBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  voiceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  voiceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  voiceBadgeTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  voiceDesc: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  voiceBtn: {
    backgroundColor: '#64748B',
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnActive: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  recentAlertCard: {
    width: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.neutral.textMuted,
    letterSpacing: 0.8,
  },
  recentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recentWord: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.dark,
  },
  recentMeta: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
  viewHistoryBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  viewHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.accent,
  },
});
