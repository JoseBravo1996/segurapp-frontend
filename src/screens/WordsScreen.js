import React, { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import InfoBox from '../components/InfoBox';
import WordItem from '../components/WordItem';
import { useResponsive, getModalWidth } from '../utils/responsive';
import colors from '../theme/colors';

import { useWords } from '../context/WordsContext';
import * as segurappApi from '../services/segurappApi';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';
import { useGuidedOnboarding } from '../context/GuidedOnboardingContext';
import GuidedHighlight from '../components/GuidedHighlight';
import VoiceService from '../services/VoiceService';

const MAX_KEYWORDS = 3;

export default function WordsScreen({ navigation }) {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive);
  const { words, addWord, updateWord, removeWord } = useWords();
  const [globalShow, setGlobalShow] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [noContactsModalVisible, setNoContactsModalVisible] = useState(false);
  const [editingWordId, setEditingWordId] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);

  // Estados de micrófono y prueba de voz segura
  const [micStatus, setMicStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [isContinuousListening, setIsContinuousListening] = useState(VoiceService.isRunning());
  const [voiceTestStatus, setVoiceTestStatus] = useState('idle'); // 'idle' | 'listening' | 'success' | 'failed'
  const [voiceTestMessage, setVoiceTestMessage] = useState('');

  const { isActive, activeTargetId, notifyStepCompleted } = useGuidedOnboarding();

  // Comprobar y restaurar el permiso de micrófono y el estado de escucha
  const checkMicStatus = useCallback(async () => {
    try {
      const status = await VoiceService.checkStoredPermission();
      setMicStatus(status);
      setIsContinuousListening(VoiceService.isRunning());
    } catch (e) {
      console.log('Error chequeando estado del micrófono:', e);
    }
  }, []);

  useEffect(() => {
    checkMicStatus();
    const unsub = VoiceService.onStatus(({ status }) => {
      if (status) {
        setIsContinuousListening(status === 'listening');
      }
    });
    return unsub;
  }, [checkMicStatus]);

  // Solicitar permiso de micrófono
  const handleRequestMic = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicStatus('granted');
        await VoiceService.setStoredPermission('granted');
        showAppAlert('Micrófono Habilitado', 'SegurAPP tiene acceso al micrófono para detección de voz.');
        if (isActive) {
          notifyStepCompleted('voice_mic');
        }
      } else {
        setMicStatus('granted');
        await VoiceService.setStoredPermission('granted');
        if (isActive) {
          notifyStepCompleted('voice_mic');
        }
      }
    } catch (err) {
      setMicStatus('denied');
      showAppAlert('Permiso Denegado', 'No se concedió acceso al micrófono.');
    }
  };

  // Alternar escucha continua de auxilio
  const handleToggleContinuousListening = () => {
    if (words.length === 0) {
      showAppAlert('Sin palabras clave', 'Debés configurar al menos una palabra clave de auxilio.');
      return;
    }
    if (VoiceService.isRunning()) {
      VoiceService.stop();
      setIsContinuousListening(false);
    } else {
      const wordList = words.map((w) => w.word);
      VoiceService.setWords(wordList);
      const ok = VoiceService.start();
      if (ok) {
        setIsContinuousListening(true);
      }
    }
  };

  // Iniciar prueba de voz en modo seguro (sin despachar alertas)
  const handleStartVoiceTest = () => {
    if (words.length === 0) {
      showAppAlert('Sin frases', 'Configurá al menos una frase de auxilio antes de realizar la prueba.');
      return;
    }

    setVoiceTestStatus('listening');
    setVoiceTestMessage('Escuchando... Pronunciá tu frase o palabra clave en voz alta.');

    const wordList = words.map((w) => w.word);
    VoiceService.setWords(wordList);

    const unsubStatus = VoiceService.onStatus(({ type, message }) => {
      if (type === 'error') {
        setVoiceTestStatus('failed');
        setVoiceTestMessage(`Error de micrófono: ${message}`);
      }
    });

    const unsubKeyword = VoiceService.subscribe((detectedWord) => {
      VoiceService.stop();
      setVoiceTestStatus('success');
      setVoiceTestMessage(`✓ ¡Frase "${detectedWord}" reconocida con éxito! El micrófono y el reconocimiento funcionan correctamente.`);
      unsubKeyword();
      unsubStatus();
      if (isActive) {
        notifyStepCompleted('voice_test');
      }
    });

    VoiceService.start();

    // Timeout de seguridad para la prueba (12s)
    setTimeout(() => {
      if (VoiceService.isRunning()) {
        VoiceService.stop();
        unsubKeyword();
        unsubStatus();
        setVoiceTestStatus((prev) => (prev === 'listening' ? 'idle' : prev));
      }
    }, 12000);
  };

  const loadContacts = useCallback(async () => {
    try {
      const data = await segurappApi.getContacts();
      setContacts(data);
      setSelectedContactId((prev) => prev ?? data[0]?.id ?? null);
    } catch (error) {
      console.log('Error cargando contactos:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
      checkMicStatus();
    }, [loadContacts, checkMicStatus])
  );

  const handleAddWord = () => {
    if (words.length >= MAX_KEYWORDS) {
      showAppAlert('Límite alcanzado', `Solo podés configurar un máximo de ${MAX_KEYWORDS} palabras clave.`);
      return;
    }
    if (contacts.length === 0) {
      setNoContactsModalVisible(true);
      return;
    }
    setEditingWordId(null);
    setNewWord('');
    setSelectedContactId(contacts[0]?.id ?? null);
    setModalVisible(true);
  };

  const handleEditWord = (item) => {
    setEditingWordId(item.id);
    setNewWord(item.word);
    setSelectedContactId(item.contactId);
    setModalVisible(true);
  };

  const saveWord = async () => {
    if (!newWord.trim()) {
      showAppAlert('Error', 'Debés ingresar una palabra clave.');
      return;
    }
    if (!selectedContactId) {
      showAppAlert('Error', 'Seleccioná un contacto de emergencia.');
      return;
    }

    setSaving(true);
    try {
      if (editingWordId) {
        await updateWord(editingWordId, { word: newWord.trim(), contactId: selectedContactId });
      } else {
        await addWord({ word: newWord.trim(), contactId: selectedContactId });
      }
      if (isActive) {
        notifyStepCompleted('voice_phrase');
      }
      setModalVisible(false);
      setEditingWordId(null);
      setNewWord('');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo guardar la palabra.';
      showAppAlert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const deleteWord = async (id) => {
    try {
      await removeWord(id);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo eliminar la palabra.';
      showAppAlert('Error', message);
    }
  };

  return (
    <AppLayout currentScreen="Palabras" backgroundColor={colors.neutral.background}>
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        {/* PANEL 1: ESTADO Y HABILITACIÓN DE MICRÓFONO */}
        <GuidedHighlight targetId="voice_mic_btn" tooltipPosition="bottom" style={{ marginBottom: 12 }}>
          <View style={styles.micCard}>
            <View style={styles.micCardHeader}>
              <View style={[styles.micIconWrap, micStatus === 'granted' && { backgroundColor: isContinuousListening ? '#E0F2FE' : '#DCFCE7' }]}>
                <Ionicons
                  name={micStatus === 'granted' ? (isContinuousListening ? 'radio' : 'mic') : 'mic-off'}
                  size={22}
                  color={micStatus === 'granted' ? (isContinuousListening ? '#0284C7' : '#16A34A') : '#FF5E00'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.micCardTitle}>
                    {micStatus === 'granted' ? 'Micrófono Habilitado' : 'Permiso de Micrófono'}
                  </Text>
                  {micStatus === 'granted' && isContinuousListening && (
                    <View style={styles.listeningBadge}>
                      <Text style={styles.listeningBadgeText}>Escuchando en vivo</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.micCardDesc}>
                  {micStatus === 'granted'
                    ? (isContinuousListening
                        ? 'Detección activa en segundo plano en toda la aplicación.'
                        : 'SegurAPP tiene acceso al micrófono. Podés activar la detección continua de frases.')
                    : 'Requerido para la activación de alertas de auxilio por voz.'}
                </Text>
              </View>
              {micStatus !== 'granted' ? (
                <TouchableOpacity
                  style={styles.btnPermisoMic}
                  onPress={handleRequestMic}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnPermisoMicText}>Habilitar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.btnToggleListening,
                    isContinuousListening && styles.btnToggleListeningActive,
                  ]}
                  onPress={handleToggleContinuousListening}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isContinuousListening ? 'pause' : 'play'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.btnToggleListeningText}>
                    {isContinuousListening ? 'Pausar' : 'Activar'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </GuidedHighlight>

        {/* PANEL 2: CABECERA Y FRASE RECOMENDADA */}
        <View style={[styles.titleRow, responsive.isSmallPhone && styles.titleRowStack]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitle}>Palabras Clave de Auxilio</Text>
            <Text style={styles.mainSubtitle}>Configuradas: {words.length}/{MAX_KEYWORDS}</Text>
          </View>

          <GuidedHighlight targetId="voice_new_phrase_btn" tooltipPosition="bottom">
            <TouchableOpacity 
              style={[styles.addButton, words.length >= MAX_KEYWORDS && { backgroundColor: colors.neutral.textLight }]} 
              onPress={handleAddWord}
              disabled={words.length >= MAX_KEYWORDS}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Nueva Palabra</Text>
            </TouchableOpacity>
          </GuidedHighlight>
        </View>

        {/* PANEL 3: PRUEBA DE RECONOCIMIENTO EN MODO SEGURO */}
        <GuidedHighlight targetId="voice_test_box" tooltipPosition="bottom" style={{ marginBottom: 14 }}>
          <View style={styles.testVoiceCard}>
            <View style={styles.testVoiceHeader}>
              <Ionicons name="flask-outline" size={20} color="#0284C7" />
              <Text style={styles.testVoiceTitle}>Prueba de Reconocimiento de Voz (Modo Seguro)</Text>
            </View>
            <Text style={styles.testVoiceDesc}>
              Probá pronunciar tu frase o palabra configurada. En este modo de prueba NO se emitirá ninguna alerta a tus contactos.
            </Text>

            <View style={styles.testActionsRow}>
              <TouchableOpacity
                style={[
                  styles.btnStartTest,
                  voiceTestStatus === 'listening' && styles.btnStartTestActive,
                ]}
                onPress={handleStartVoiceTest}
                disabled={voiceTestStatus === 'listening'}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={voiceTestStatus === 'listening' ? 'radio' : 'play'}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.btnStartTestText}>
                  {voiceTestStatus === 'listening' ? 'Escuchando tu voz...' : 'Iniciar Prueba de Voz'}
                </Text>
              </TouchableOpacity>
            </View>

            {voiceTestMessage ? (
              <View
                style={[
                  styles.testResultBox,
                  voiceTestStatus === 'success' && styles.testResultSuccess,
                  voiceTestStatus === 'failed' && styles.testResultFailed,
                ]}
              >
                <Text
                  style={[
                    styles.testResultText,
                    voiceTestStatus === 'success' && { color: '#065F46' },
                    voiceTestStatus === 'failed' && { color: '#991B1B' },
                  ]}
                >
                  {voiceTestMessage}
                </Text>
              </View>
            ) : null}
          </View>
        </GuidedHighlight>

        {/* Guías de ayuda */}
        <InfoBox title="¿Qué son las palabras clave?" bgColor={colors.brand.accentLight}>
          <Text style={styles.infoBody}>
            Son palabras seguras que activan una alerta automática de emergencia al ser detectadas por voz o seleccionadas en el botón de pánico.
          </Text>
        </InfoBox>

        {/* Barra de control de visualización */}
        <View style={[styles.viewToggleRow, responsive.isSmallPhone && styles.viewToggleColumn]}>
          <TouchableOpacity 
            style={styles.viewToggleBtn}
            onPress={() => setGlobalShow(!globalShow)}
            activeOpacity={0.7}
          >
            <Ionicons name={globalShow ? "eye-off-outline" : "eye-outline"} size={18} color={colors.brand.dark} />
            <Text style={styles.viewToggleLabel}>
              {globalShow ? "Ocultar palabras" : "Revelar palabras"}
            </Text>
          </TouchableOpacity>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{words.length} de {MAX_KEYWORDS} palabras</Text>
          </View>
        </View>

        {/* Listado de Palabras */}
        {words.length > 0 ? (
          <View style={styles.listSection}>
            {words.map((item) => (
              <WordItem 
                key={item.id}
                word={item.word}
                type={item.type}
                description={item.description}
                date={item.date}
                showAll={globalShow}
                onEdit={() => handleEditWord(item)}
                onDelete={() => deleteWord(item.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="key-outline" size={40} color={colors.neutral.textLight} />
            <Text style={styles.emptyTitle}>No hay palabras configuradas</Text>
            {contacts.length === 0 && (
              <Text style={styles.emptyHint}>
                Primero agregá un contacto de emergencia en la pestaña Contactos.
              </Text>
            )}
          </View>
        )}

        {/* Consejos de seguridad */}
        <InfoBox title="Recomendaciones de Seguridad" bgColor="#FEF3C7">
          <View style={styles.tipRow}>
            <Ionicons name="shield-checkmark" size={18} color="#D97706" />
            <Text style={styles.tipText}>
              Elegí palabras comunes que puedas pronunciar con naturalidad en una conversación.
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="shield-checkmark" size={18} color="#D97706" />
            <Text style={styles.tipText}>
              Compartí estas claves únicamente con tus contactos de emergencia autorizados.
            </Text>
          </View>
        </InfoBox>
      </ScreenScrollView>

      {/* Modal sin contactos */}
      <Modal visible={noContactsModalVisible} animationType="fade" transparent onRequestClose={() => setNoContactsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: modalWidth }]}>
            <Text style={styles.modalTitle}>Sin contactos de emergencia</Text>
            <Text style={styles.noContactsBody}>
              Para crear una palabra clave necesitás al menos un contacto asignado para recibir la notificación.
            </Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                setNoContactsModalVisible(false);
                navigation.navigate('Contactos');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Ir a Contactos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => setNoContactsModalVisible(false)}>
              <Text style={styles.cancelLinkText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Agregar / Editar Palabra */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingWordId ? 'Editar palabra clave' : 'Agregar palabra clave'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingWordId(null); }}>
                <Ionicons name="close" size={24} color={colors.brand.dark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Palabra clave</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: PIZZA" 
              value={newWord}
              onChangeText={setNewWord}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Contacto de emergencia asociado</Text>
            <View style={[styles.typeSelector, responsive.isMobile && styles.typeSelectorColumn]}>
              {contacts.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.typeOption, selectedContactId === c.id && styles.typeOptionActive]}
                  onPress={() => setSelectedContactId(c.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeOptionText, selectedContactId === c.id && { color: '#FFFFFF' }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveWord} disabled={saving} activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>{editingWordId ? 'Actualizar palabra' : 'Guardar palabra'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  titleRowStack: { flexDirection: 'column', alignItems: 'flex-start' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: colors.brand.dark },
  mainSubtitle: { fontSize: 13, color: colors.neutral.textMuted, marginTop: 2 },
  addButton: {
    backgroundColor: colors.brand.dark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6, fontSize: 13 },
  
  viewToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, gap: 10 },
  viewToggleColumn: { flexDirection: 'column', alignItems: 'stretch' },
  viewToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.border },
  viewToggleLabel: { marginLeft: 8, fontWeight: '700', fontSize: 13, color: colors.brand.dark },
  counterBadge: { backgroundColor: colors.neutral.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.border },
  counterText: { fontSize: 12, fontWeight: '700', color: colors.neutral.textMuted },

  listSection: { marginBottom: 10 },
  emptyCard: { backgroundColor: colors.neutral.white, padding: 32, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral.border, marginBottom: 20 },
  emptyTitle: { fontWeight: '800', color: colors.brand.dark, marginTop: 10, fontSize: 15 },
  emptyHint: { fontSize: 13, color: colors.neutral.textMuted, marginTop: 6, textAlign: 'center', paddingHorizontal: 12 },
  noContactsBody: { fontSize: 14, color: colors.neutral.textMuted, lineHeight: 20, marginBottom: 16 },
  cancelLink: { alignItems: 'center', marginTop: 14, paddingVertical: 8 },
  cancelLinkText: { color: colors.neutral.textMuted, fontWeight: '700' },
  infoBody: { fontSize: 13, color: colors.brand.dark, lineHeight: 18 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tipText: { fontSize: 12, color: '#92400E', marginLeft: 8, flex: 1, lineHeight: 17 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { backgroundColor: colors.neutral.white, borderRadius: 24, padding: 24, elevation: 10, maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: colors.brand.dark },
  inputLabel: { fontWeight: '800', marginTop: 14, marginBottom: 6, color: colors.brand.dark, fontSize: 13 },
  input: { backgroundColor: colors.neutral.background, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: colors.neutral.border },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  typeSelectorColumn: { flexDirection: 'column' },
  typeOption: { flexGrow: 1, flexBasis: '45%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.neutral.borderStrong, alignItems: 'center', backgroundColor: colors.neutral.background },
  typeOptionActive: { backgroundColor: colors.brand.dark, borderColor: colors.brand.dark },
  typeOptionText: { fontSize: 12, fontWeight: '700', color: colors.neutral.textDark },
  saveButton: { backgroundColor: colors.brand.dark, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  // Estilos del Asistente Guiado y Pruebas de Voz
  micCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  micCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  micIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 94, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  micCardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  btnPermisoMic: {
    backgroundColor: '#FF5E00',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnPermisoMicText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  listeningBadge: {
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  listeningBadgeText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '800',
  },
  btnToggleListening: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnToggleListeningActive: {
    backgroundColor: '#0284C7',
  },
  btnToggleListeningText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  testVoiceCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  testVoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  testVoiceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
  },
  testVoiceDesc: {
    fontSize: 12,
    color: '#0284C7',
    lineHeight: 16,
    marginBottom: 10,
  },
  testActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnStartTest: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  btnStartTestActive: {
    backgroundColor: '#DC2626',
  },
  btnStartTestText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  testResultBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testResultSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  testResultFailed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
