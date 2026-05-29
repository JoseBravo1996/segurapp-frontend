import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import PanicConfirmModal from '../components/PanicConfirmModal';
import { useResponsive } from '../utils/responsive';

import { useWords } from '../context/WordsContext';
import VoiceService from '../services/VoiceService';
import * as segurappApi from '../services/segurappApi';
import { triggerAlertWithLocation, markSafeAndNotify } from '../utils/alertHelper';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';

export default function HomeScreen({ navigation }) {
  const responsive = useResponsive();
  const { isSmallPhone, isMobile, isDesktop, moderateScale, height } = responsive;

  const panicSize = useMemo(() => {
    if (height < 680) return 150;
    if (isSmallPhone) return 165;
    if (isMobile) return 190;
    if (isDesktop) return 250;
    return 220;
  }, [height, isSmallPhone, isMobile, isDesktop]);

  const panicIconSize = Math.round(panicSize * 0.4);
  const [contacts, setContacts] = useState([]);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [markingSafe, setMarkingSafe] = useState(false);
  const [lastAlertWord, setLastAlertWord] = useState(null);
  const [panicModalVisible, setPanicModalVisible] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { words } = useWords();
  const [listening, setListening] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const data = await segurappApi.getContacts();
      setContacts(data.map((c) => ({ id: c.id, nombre: c.name })));
    } catch (error) {
      console.log('Error cargando contactos:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
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

  const openPanicModal = () => {
    if (contacts.length === 0) {
      showAppAlert(
        'SISTEMA BLOQUEADO',
        'No tenés contactos de emergencia configurados. Agregá uno antes de enviar alertas.',
        [{ text: 'Ir a Contactos', onPress: () => navigation.navigate('Contactos') }]
      );
      return;
    }

    if (words.length === 0) {
      showAppAlert(
        'Sin palabras clave',
        'Configurá al menos una palabra clave vinculada a un contacto.',
        [{ text: 'Configurar', onPress: () => navigation.navigate('Palabras') }]
      );
      return;
    }

    setPanicModalVisible(true);
  };

  const sendPanicAlert = async (word) => {
    setSendingAlert(true);
    try {
      const result = await triggerAlertWithLocation(word);
      setLastAlertWord(word);
      setPanicModalVisible(false);
      showAppAlert(
        '¡ALERTA ENVIADA!',
        `Se registró la alerta para ${result.contact.name} (${result.contact.phone}).\n\nSi no se abrió WhatsApp, avisale manualmente.`
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo enviar la alerta.';
      showAppAlert('Error', message);
    } finally {
      setSendingAlert(false);
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
      const started = VoiceService.start();
      if (started) {
        setListening(true);
        setVoiceHint('Escuchando… Decí una de tus palabras clave en voz alta.');
      }
    }
  };

  return (
    <AppLayout currentScreen="Emergencia">
      <ScreenScrollView contentContainerStyle={{ alignItems: 'center' }}>
        <Text style={[styles.instructionText, { fontSize: moderateScale(18) }]}>
          Presioná para enviar alerta
        </Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.panicButton,
              {
                width: panicSize,
                height: panicSize,
                borderRadius: panicSize / 2,
              },
            ]}
            activeOpacity={0.8}
            onPress={openPanicModal}
            disabled={sendingAlert}
          >
            <View
              style={[
                styles.panicOuterRing,
                {
                  width: panicSize - 30,
                  height: panicSize - 30,
                  borderRadius: (panicSize - 30) / 2,
                },
              ]}
            >
              <View style={styles.panicInnerCircle}>
                <Ionicons name="alert-circle" size={panicIconSize} color="#FF5E00" />
                <Text style={[styles.panicText, { fontSize: moderateScale(22) }]}>PÁNICO</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.subInstruction}>
          {sendingAlert ? 'Enviando alerta...' : 'Elegí palabra y contacto antes de confirmar'}
        </Text>
        {sendingAlert && <ActivityIndicator color="#FF5E00" style={{ marginTop: 8 }} />}

        <TouchableOpacity
          style={styles.safeButton}
          onPress={async () => {
            setMarkingSafe(true);
            try {
              await markSafeAndNotify();
              showAppAlert('Estás a salvo', 'La alerta fue cerrada. Si se abrió WhatsApp, confirmale a tu contacto que estás bien.');
            } catch (error) {
              const message = error instanceof ApiError ? error.message : 'No hay alertas activas para cerrar.';
              showAppAlert('Aviso', message);
            } finally {
              setMarkingSafe(false);
            }
          }}
          disabled={markingSafe}
        >
          <Ionicons name="checkmark-done-circle" size={26} color="#27AE60" />
          <Text style={styles.safeButtonText}>{markingSafe ? 'Actualizando...' : 'Estoy a salvo'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleListening}
          style={[
            styles.listenButton,
            listening && styles.listenButtonActive,
            isMobile && { width: '100%', maxWidth: 420 },
          ]}
        >
          <Ionicons name={listening ? 'mic' : 'mic-outline'} size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.listenButtonText}>
            {listening ? 'Escucha activa (tocá para detener)' : 'Activar escucha por voz'}
          </Text>
        </TouchableOpacity>
        {voiceHint ? <Text style={styles.voiceHint}>{voiceHint}</Text> : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>¿Qué sucede al activar?</Text>
          <View style={styles.infoItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>Se notifica a tu contacto de emergencia</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>Se registra tu ubicación GPS actual</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>
              {Platform.OS === 'web'
                ? 'La escucha por voz detecta tus palabras clave (Chrome/Edge)'
                : 'La escucha por voz detecta tus palabras clave en el celular'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.actionButtonsRow,
            isMobile && styles.actionButtonsColumn,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: '#FF5E00' },
              isMobile && styles.actionButtonFull,
            ]}
            onPress={async () => {
              if (!lastAlertWord && words.length === 0) {
                showAppAlert('Sin alertas', 'Primero enviá una alerta de pánico o configurá una palabra clave.');
                return;
              }
              const word = lastAlertWord || words[0]?.word;
              setSendingAlert(true);
              try {
                await triggerAlertWithLocation(word);
                showAppAlert('Alerta reenviada', 'Se registró un nuevo evento en el historial.');
              } catch (error) {
                const message = error instanceof ApiError ? error.message : 'No se pudo reenviar la alerta.';
                showAppAlert('Error', message);
              } finally {
                setSendingAlert(false);
              }
            }}
          >
            <Text style={[styles.actionButtonText, { color: '#FF5E00' }]}>Reenviar última alerta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: '#050A18' },
              isMobile && styles.actionButtonFull,
            ]}
            onPress={() => navigation.navigate('Ubicación')}
          >
            <Text style={[styles.actionButtonText, { color: '#050A18' }]}>Compartir ubicación</Text>
          </TouchableOpacity>
        </View>
      </ScreenScrollView>

      <PanicConfirmModal
        visible={panicModalVisible}
        words={words}
        loading={sendingAlert}
        onCancel={() => setPanicModalVisible(false)}
        onConfirm={sendPanicAlert}
      />

    </AppLayout>
  );
}

const styles = StyleSheet.create({
  instructionText: { fontWeight: '800', color: '#050A18', marginBottom: 20, marginTop: 6, textAlign: 'center' },
  panicButton: {
    backgroundColor: '#050A18',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#FF5E00',
    shadowColor: '#FF5E00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },
  panicOuterRing: {
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panicInnerCircle: { alignItems: 'center', justifyContent: 'center' },
  panicText: { color: 'white', fontWeight: '900', marginTop: 5, letterSpacing: 2 },
  subInstruction: { color: '#64748B', marginTop: 16, marginBottom: 16, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  safeButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#27AE60',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
  },
  safeButtonText: { color: '#27AE60', fontWeight: '900', fontSize: 16, marginLeft: 10 },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    marginBottom: 8,
  },
  listenButtonActive: { backgroundColor: '#2ECC71' },
  listenButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  voiceHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#050A18',
    width: '100%',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#FF5E00',
  },
  infoTitle: { color: '#FF5E00', fontWeight: '800', fontSize: 16, marginBottom: 15 },
  infoItem: { flexDirection: 'row', marginBottom: 10 },
  bullet: { color: '#FF5E00', marginRight: 10, fontWeight: 'bold' },
  infoText: { color: '#F1F5F9', fontSize: 14, flex: 1, lineHeight: 20 },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20, gap: 12 },
  actionButtonsColumn: { flexDirection: 'column' },
  actionButton: {
    width: '48%',
    borderWidth: 2,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  actionButtonFull: { width: '100%' },
  actionButtonText: { fontWeight: '800', fontSize: 12.5, textAlign: 'center' },
});
