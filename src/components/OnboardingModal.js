/**
 * OnboardingModal.js
 * Asistente de bienvenida y configuración inicial de SegurAPP.
 * Solicita los requisitos mínimos de forma contextual y progresiva.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useOnboarding } from '../context/OnboardingContext';
import * as segurappApi from '../services/segurappApi';
import { registerPushTokenIfPossible } from '../services/pushNotifications';
import { useResponsive, getModalWidth } from '../utils/responsive';
import colors from '../theme/colors';

const TOTAL_WIZARD_STEPS = 5;

export default function OnboardingModal() {
  const { isOnboardingModalVisible, completeInitialSetup } = useOnboarding();
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive, 0.94);

  const [step, setStep] = useState(1);

  // Estados de requisitos
  const [locationStatus, setLocationStatus] = useState('checking'); // 'granted' | 'denied' | 'prompt'
  const [contactsCount, setContactsCount] = useState(0);
  const [checkingContacts, setCheckingContacts] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('prompt'); // 'granted' | 'denied' | 'prompt'

  // Formulario de contacto inicial rápido
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');

  // Verificar estado actual de permisos y contactos
  const verifyCurrentState = useCallback(async () => {
    // 1. Ubicación
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationStatus(status === 'granted' ? 'granted' : 'prompt');
    } catch {
      setLocationStatus('prompt');
    }

    // 2. Contactos existentes
    setCheckingContacts(true);
    try {
      const contacts = await segurappApi.getContacts();
      setContactsCount(Array.isArray(contacts) ? contacts.length : 0);
    } catch {
      setContactsCount(0);
    } finally {
      setCheckingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (isOnboardingModalVisible) {
      setStep(1);
      verifyCurrentState();
    }
  }, [isOnboardingModalVisible, verifyCurrentState]);

  // Acción: Solicitar permiso de ubicación
  const handleRequestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationStatus(status === 'granted' ? 'granted' : 'denied');
    } catch (err) {
      console.warn('[Onboarding] Error solicitando ubicación:', err);
      setLocationStatus('denied');
    }
  };

  // Acción: Solicitar permiso de notificaciones
  const handleRequestNotifications = async () => {
    try {
      const token = await registerPushTokenIfPossible();
      if (token) {
        setNotificationStatus('granted');
      } else {
        setNotificationStatus(Platform.OS === 'web' ? 'granted' : 'denied');
      }
    } catch {
      setNotificationStatus('denied');
    }
  };

  // Acción: Guardar contacto inicial
  const handleSaveInitialContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      setContactError('Ingresá el nombre y teléfono del contacto.');
      return;
    }
    setSavingContact(true);
    setContactError('');
    try {
      await segurappApi.createContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        lat: -34.6037,
        lng: -58.3816,
      });
      setContactsCount((prev) => prev + 1);
      setContactName('');
      setContactPhone('');
    } catch (err) {
      setContactError(err.message || 'No se pudo guardar el contacto.');
    } finally {
      setSavingContact(false);
    }
  };

  if (!isOnboardingModalVisible) return null;

  return (
    <Modal visible={isOnboardingModalVisible} animationType="fade" transparent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={[styles.card, { width: modalWidth, maxWidth: 480 }]}>
          {/* Header con Indicador de Progreso */}
          <View style={styles.progressHeader}>
            <View style={styles.badgeStep}>
              <Text style={styles.badgeStepText}>
                Paso {step} de {TOTAL_WIZARD_STEPS}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(step / TOTAL_WIZARD_STEPS) * 100}%` }]} />
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* PASO 1: BIENVENIDA */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.welcomeIconWrap}>
                  <Ionicons name="shield-checkmark" size={44} color="#FF5E00" />
                </View>
                <Text style={styles.title}>¡Bienvenido a SegurAPP!</Text>
                <Text style={styles.subtitle}>Tu red personal de asistencia y respuesta ante emergencias.</Text>

                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>¿Cómo te protege SegurAPP?</Text>
                  <Text style={styles.infoText}>
                    • Transmite tu ubicación GPS en vivo al activar una emergencia.{'\n'}
                    • Avisa simultáneamente a tus contactos de confianza.{'\n'}
                    • Cuenta con modo silencioso discreto y detección por voz.{'\n'}
                    • Conserva tus alertas incluso si te quedás sin internet.
                  </Text>
                </View>

                <Text style={styles.requirementHint}>
                  Para garantizar tu seguridad, vamos a configurar juntos los 2 requisitos mínimos indispensables.
                </Text>
              </View>
            )}

            {/* PASO 2: UBICACIÓN GPS (OBLIGATORIA) */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                <View style={[styles.welcomeIconWrap, { backgroundColor: 'rgba(255, 94, 0, 0.12)' }]}>
                  <Ionicons name="location" size={42} color="#FF5E00" />
                </View>
                <View style={styles.tagObligatorio}>
                  <Text style={styles.tagObligatorioText}>REQUISITO OBLIGATORIO</Text>
                </View>
                <Text style={styles.title}>Permiso de Ubicación GPS</Text>
                <Text style={styles.subtitle}>
                  Cuando actives una alerta, tus contactos recibirán un mapa interactivo con tus coordenadas exactas.
                </Text>

                <View style={styles.permissionCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.permCardTitle}>Acceso a Geolocalización</Text>
                    <Text style={styles.permCardSubtitle}>
                      Solo se utiliza para registrar tu posición en momentos de peligro o emergencia.
                    </Text>
                  </View>
                  <View style={styles.statusIndicator}>
                    {locationStatus === 'granted' ? (
                      <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                    ) : (
                      <Ionicons name="alert-circle" size={28} color="#D97706" />
                    )}
                  </View>
                </View>

                {locationStatus !== 'granted' && (
                  <TouchableOpacity
                    style={styles.btnActionPermission}
                    onPress={handleRequestLocation}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={18} color="#FFFFFF" />
                    <Text style={styles.btnActionText}>Habilitar Ubicación GPS</Text>
                  </TouchableOpacity>
                )}

                {locationStatus === 'granted' && (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-done" size={18} color="#16A34A" />
                    <Text style={styles.successBannerText}>¡Ubicación GPS habilitada correctamente!</Text>
                  </View>
                )}
              </View>
            )}

            {/* PASO 3: CONTACTO DE EMERGENCIA (OBLIGATORIO) */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                <View style={[styles.welcomeIconWrap, { backgroundColor: 'rgba(255, 94, 0, 0.12)' }]}>
                  <Ionicons name="people" size={42} color="#FF5E00" />
                </View>
                <View style={styles.tagObligatorio}>
                  <Text style={styles.tagObligatorioText}>REQUISITO OBLIGATORIO</Text>
                </View>
                <Text style={styles.title}>Contacto de Confianza</Text>
                <Text style={styles.subtitle}>
                  Necesitás al menos una persona de confianza registrada para que reciba tu ubicación en una emergencia.
                </Text>

                {contactsCount > 0 ? (
                  <View style={styles.contactAlreadySetCard}>
                    <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.contactAlreadySetTitle}>
                        ¡Ya tenés {contactsCount} contacto(s) configurado(s)!
                      </Text>
                      <Text style={styles.contactAlreadySetSub}>
                        Tus alertas se notificarán a tu red de contactos existente.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.formContactBox}>
                    <Text style={styles.formTitle}>Registrá tu primer contacto:</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Nombre (ej. Mamá, Carlos)"
                      placeholderTextColor="#94A3B8"
                      value={contactName}
                      onChangeText={setContactName}
                    />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Teléfono móvil (ej. +54 9 11 1234-5678)"
                      placeholderTextColor="#94A3B8"
                      value={contactPhone}
                      onChangeText={setContactPhone}
                      keyboardType="phone-pad"
                    />
                    {contactError !== '' && <Text style={styles.errorText}>{contactError}</Text>}

                    <TouchableOpacity
                      style={styles.btnSaveContact}
                      onPress={handleSaveInitialContact}
                      disabled={savingContact}
                      activeOpacity={0.8}
                    >
                      {savingContact ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.btnSaveContactText}>Guardar Contacto</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* PASO 4: NOTIFICACIONES (RECOMENDADO) */}
            {step === 4 && (
              <View style={styles.stepContainer}>
                <View style={[styles.welcomeIconWrap, { backgroundColor: 'rgba(255, 94, 0, 0.12)' }]}>
                  <Ionicons name="notifications" size={42} color="#FF5E00" />
                </View>
                <View style={styles.tagRecomendado}>
                  <Text style={styles.tagRecomendadoText}>RECOMENDADO</Text>
                </View>
                <Text style={styles.title}>Notificaciones en Tiempo Real</Text>
                <Text style={styles.subtitle}>
                  Permite que la app te avise de inmediato cuando un familiar o contacto active una emergencia o esté a salvo.
                </Text>

                <View style={styles.permissionCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.permCardTitle}>Avisos y Alertas Push</Text>
                    <Text style={styles.permCardSubtitle}>
                      Fundamental para recibir actualizaciones en segundo plano.
                    </Text>
                  </View>
                  <View style={styles.statusIndicator}>
                    {notificationStatus === 'granted' ? (
                      <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                    ) : (
                      <Ionicons name="notifications-outline" size={28} color="#64748B" />
                    )}
                  </View>
                </View>

                {notificationStatus !== 'granted' && (
                  <TouchableOpacity
                    style={styles.btnActionPermission}
                    onPress={handleRequestNotifications}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="notifications" size={18} color="#FFFFFF" />
                    <Text style={styles.btnActionText}>Permitir Notificaciones</Text>
                  </TouchableOpacity>
                )}

                {notificationStatus === 'granted' && (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-done" size={18} color="#16A34A" />
                    <Text style={styles.successBannerText}>¡Notificaciones habilitadas con éxito!</Text>
                  </View>
                )}
              </View>
            )}

            {/* PASO 5: RESUMEN Y RECORRIDO */}
            {step === 5 && (
              <View style={styles.stepContainer}>
                <View style={[styles.welcomeIconWrap, { backgroundColor: 'rgba(22, 163, 74, 0.15)' }]}>
                  <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
                </View>
                <Text style={styles.title}>¡Configuración Completa!</Text>
                <Text style={styles.subtitle}>
                  SegurAPP ya cuenta con los requisitos mínimos para protegerte ante cualquier emergencia.
                </Text>

                {/* Checklist */}
                <View style={styles.checklistCard}>
                  <View style={styles.checkItem}>
                    <Ionicons
                      name={locationStatus === 'granted' ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={locationStatus === 'granted' ? '#16A34A' : '#D97706'}
                    />
                    <Text style={styles.checkText}>Ubicación GPS: {locationStatus === 'granted' ? 'Habilitada' : 'Pendiente'}</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons
                      name={contactsCount > 0 ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={contactsCount > 0 ? '#16A34A' : '#D97706'}
                    />
                    <Text style={styles.checkText}>Contacto de emergencia: {contactsCount > 0 ? `${contactsCount} configurado(s)` : 'Sin registrar'}</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    <Text style={styles.checkText}>Modo Offline y Sincronización: Activos</Text>
                  </View>
                </View>

                <Text style={styles.tourPromptText}>
                  ¿Querés realizar un breve recorrido guiado ventana por ventana para conocer las funciones principales de SegurAPP?
                </Text>
              </View>
            )}
          </ScrollView>

          {/* BOTONES DE NAVEGACIÓN DEL ASISTENTE */}
          <View style={styles.footerActions}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.btnBack}
                onPress={() => setStep((s) => s - 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnBackText}>← Anterior</Text>
              </TouchableOpacity>
            )}

            {step < TOTAL_WIZARD_STEPS ? (
              <TouchableOpacity
                style={styles.btnNext}
                onPress={() => setStep((s) => s + 1)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnNextText}>Siguiente →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.finalActionsWrap}>
                <TouchableOpacity
                  style={styles.btnStartTour}
                  onPress={() => completeInitialSetup(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnStartTourText}>Iniciar Recorrido Guiado</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnSkipTour}
                  onPress={() => completeInitialSetup(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnSkipTourText}>Ir directo al Inicio</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeStep: {
    backgroundColor: 'rgba(255, 94, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeStepText: {
    color: '#FF5E00',
    fontWeight: '800',
    fontSize: 11,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginLeft: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF5E00',
    borderRadius: 3,
  },
  scrollContent: {
    paddingVertical: 6,
  },
  stepContainer: {
    alignItems: 'center',
  },
  welcomeIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 94, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  tagObligatorio: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220, 38, 38, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  tagObligatorioText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagRecomendado: {
    backgroundColor: '#FEF3C7',
    borderColor: 'rgba(217, 119, 6, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  tagRecomendadoText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  requirementHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    marginBottom: 14,
  },
  permCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  permCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusIndicator: {
    marginLeft: 10,
  },
  btnActionPermission: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5E00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  btnActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  contactAlreadySetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    width: '100%',
  },
  contactAlreadySetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  contactAlreadySetSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  formContactBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  btnSaveContact: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnSaveContactText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  checklistCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    marginBottom: 14,
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  tourPromptText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
    gap: 10,
  },
  btnBack: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  btnBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  btnNext: {
    flex: 1,
    backgroundColor: '#FF5E00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnNextText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  finalActionsWrap: {
    width: '100%',
    gap: 8,
  },
  btnStartTour: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5E00',
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnStartTourText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  btnSkipTour: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  btnSkipTourText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});

