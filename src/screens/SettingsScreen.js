import React, { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import AppInput from '../components/AppInput';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { showAppAlert } from '../utils/showAppAlert';
import * as segurappApi from '../services/segurappApi';
import { ApiError } from '../services/apiClient';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';
import { useGuidedOnboarding } from '../context/GuidedOnboardingContext';
import GuidedHighlight from '../components/GuidedHighlight';
import { useRoute } from '@react-navigation/native';

export default function SettingsScreen() {
  const responsive = useResponsive();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState(route.params?.subTab || 'profile');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Preferencias de emergencia
  const [prefSilentDefault, setPrefSilentDefault] = useState(false);
  const [prefHapticFeedback, setPrefHapticFeedback] = useState(true);
  const [prefAutoGps, setPrefAutoGps] = useState(true);

  const navigation = useNavigation();
  const { logout } = useAuth();
  const { isActive, startAssistant, notifyStepCompleted } = useGuidedOnboarding();
  const openSocial = (url) => Linking.openURL(url);

  useEffect(() => {
    if (route.params?.subTab) {
      setActiveTab(route.params.subTab);
    }
  }, [route.params?.subTab]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await segurappApi.getProfile();
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo cargar el perfil.';
      showAppAlert('Error', message);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const saveProfile = async () => {
    if (!name.trim() || !phone.trim()) {
      showAppAlert('Campos incompletos', 'Nombre y teléfono son obligatorios.');
      return;
    }
    setProfileSaving(true);
    try {
      const data = await segurappApi.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setName(data.name);
      setPhone(data.phone);
      setCurrentPassword('');
      setNewPassword('');
      showAppAlert('Perfil Actualizado', 'Tus datos se guardaron correctamente.');
      if (isActive) {
        notifyStepCompleted('profile_save');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo guardar el perfil.';
      showAppAlert('Error', message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // --- SUB-VISTA: PERFIL ---
  const ProfileView = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mi Perfil de Cuenta</Text>
      {profileLoading ? (
        <ActivityIndicator color={colors.brand.dark} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <GuidedHighlight targetId="profile_name" tooltipPosition="bottom">
            <AppInput
              label="Nombre completo"
              iconName="person-outline"
              placeholder="Nombre completo"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (isActive && text.trim().length >= 3) {
                  // paso listo para avanzar
                }
              }}
            />
          </GuidedHighlight>

          <AppInput
            label="Email"
            iconName="mail-outline"
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            editable={false}
          />
          <Text style={styles.fieldHint}>El email está vinculado a tu cuenta institucional.</Text>

          <GuidedHighlight targetId="profile_phone" tooltipPosition="bottom">
            <AppInput
              label="Teléfono principal"
              iconName="call-outline"
              placeholder="Teléfono"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </GuidedHighlight>

          <Text style={styles.sectionLabel}>Cambiar contraseña (opcional)</Text>
          <AppInput
            label="Contraseña actual"
            iconName="lock-closed-outline"
            placeholder="Solo si querés cambiar la clave"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <AppInput
            label="Nueva contraseña"
            iconName="key-outline"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <GuidedHighlight targetId="profile_save_btn" tooltipPosition="top">
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                title={profileSaving ? 'Guardando...' : 'Guardar Cambios'}
                onPress={saveProfile}
              />
            </View>
          </GuidedHighlight>
        </>
      )}
      <View style={{ marginTop: 16 }}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.emergency.primary} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- SUB-VISTA: PREFERENCIAS DE EMERGENCIA ---
  const EmergencyPreferencesView = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Preferencias de Emergencia</Text>
      
      <View style={styles.prefRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefLabel}>Modo Silencioso por defecto</Text>
          <Text style={styles.prefDesc}>
            Activa el switch silencioso predeterminado al abrir la confirmación de pánico.
          </Text>
        </View>
        <Switch
          value={prefSilentDefault}
          onValueChange={setPrefSilentDefault}
          trackColor={{ false: colors.neutral.borderStrong, true: colors.brand.border }}
          thumbColor={prefSilentDefault ? colors.brand.dark : '#CBD5E1'}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.prefRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefLabel}>Retroalimentación háptica / vibración</Text>
          <Text style={styles.prefDesc}>Vibra al disparar alertas normales para confirmar el envío.</Text>
        </View>
        <Switch
          value={prefHapticFeedback}
          onValueChange={setPrefHapticFeedback}
          trackColor={{ false: colors.neutral.borderStrong, true: colors.brand.border }}
          thumbColor={prefHapticFeedback ? colors.brand.dark : '#CBD5E1'}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.prefRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefLabel}>Geolocalización GPS de alta precisión</Text>
          <Text style={styles.prefDesc}>Adquiere coordenadas precisas antes de emitir la alerta.</Text>
        </View>
        <Switch
          value={prefAutoGps}
          onValueChange={setPrefAutoGps}
          trackColor={{ false: colors.neutral.borderStrong, true: colors.brand.border }}
          thumbColor={prefAutoGps ? colors.brand.dark : '#CBD5E1'}
        />
      </View>

      {/* SECCIÓN TUTORIAL Y AYUDA */}
      <View style={styles.separator} />
      <Text style={[styles.sectionLabel, { marginTop: 14, marginBottom: 8 }]}>Guía y Tutoriales</Text>
      
      <View style={styles.tutorialBox}>
        <View style={styles.tutorialHeader}>
          <Ionicons name="compass-outline" size={20} color="#FF5E00" />
          <Text style={styles.tutorialTitle}>Recorrido Guiado Interactivo</Text>
        </View>
        <Text style={styles.tutorialDesc}>
          Configurá paso a paso tu perfil, micrófono, frase de auxilio y zonas seguras sobre la interfaz real.
        </Text>
        <View style={styles.tutorialActionsRow}>
          <TouchableOpacity
            style={styles.tourBtn}
            onPress={() => startAssistant()}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.tourBtnText}>Iniciar Asistente Guiado</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // --- SUB-VISTA: ACERCA DE ---
  const AboutView = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Información del Sistema</Text>
      <View style={styles.aboutBox}>
        <Text style={styles.aboutText}>
          <Text style={{ color: colors.emergency.primary, fontWeight: '900' }}>SegurAPP</Text> es una plataforma de respuesta rápida y asistencia en emergencias desarrollada para la cátedra de Programación en Tiempo Real de la <Text style={{ fontWeight: '800' }}>Universidad Nacional Arturo Jauretche (UNAJ)</Text>.
        </Text>
        <View style={styles.separator} />
        <Text style={styles.aboutLabel}>Cátedra:</Text>
        <Text style={styles.aboutValue}> • Prof. Diego Encinas</Text>
        <View style={styles.separator} />
        <Text style={styles.aboutLabel}>Equipo de Desarrollo:</Text>
        {['Antunes Julian', 'Acuña Roberto', 'Bravo Jose', "D'Amico Claudio", 'Lopez Franco'].map((a) => (
          <Text key={a} style={styles.aboutValue}> • {a}</Text>
        ))}
        <Text style={styles.footerCopy}>© 2026 SegurAPP • Arquitectura de Tiempo Real</Text>
      </View>
    </View>
  );

  return (
    <AppLayout currentScreen="Settings">
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.brand.dark} />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Configuración del Sistema</Text>
        </View>

        {/* SELECTOR DE TABS */}
        <View style={styles.tabBar}>
          {[
            { id: 'profile', icon: 'person', label: 'Cuenta' },
            { id: 'preferences', icon: 'options', label: 'Emergencia' },
            { id: 'about', icon: 'information-circle', label: 'Acerca de' },
          ].map((tab) => (
            <TouchableOpacity 
              key={tab.id}
              style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]} 
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`} 
                size={18} 
                color={activeTab === tab.id ? colors.brand.dark : colors.neutral.textMuted} 
              />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CONTENIDO */}
        <View style={styles.viewContainer}>
          {activeTab === 'profile' && <ProfileView />}
          {activeTab === 'preferences' && <EmergencyPreferencesView />}
          {activeTab === 'about' && <AboutView />}
        </View>
      </ScreenScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 8, backgroundColor: colors.neutral.white, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.border },
  mainTitle: { fontSize: 22, fontWeight: '900', marginLeft: 12, color: colors.brand.dark },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: colors.neutral.white, 
    borderRadius: 16, 
    padding: 4, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.borderStrong,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textMuted,
  },
  tabLabelActive: {
    color: colors.brand.dark,
    fontWeight: '800',
  },
  card: { 
    backgroundColor: colors.neutral.white, 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
    elevation: 2,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16, color: colors.brand.dark },
  fieldHint: { fontSize: 11, color: colors.neutral.textMuted, marginTop: -6, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.neutral.textMuted, marginTop: 10, marginBottom: 4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    backgroundColor: '#FEF2F2',
    gap: 6,
  },
  logoutText: {
    color: colors.emergency.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.dark,
  },
  prefDesc: {
    fontSize: 11,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
  separator: { height: 1, backgroundColor: colors.neutral.border, marginVertical: 12 },
  tutorialBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 4,
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tutorialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand.dark,
  },
  tutorialDesc: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  tutorialActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF5E00',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tourBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  wizardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.borderStrong,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  wizardBtnText: {
    color: colors.brand.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  aboutBox: { backgroundColor: colors.neutral.background, padding: 16, borderRadius: 14 },
  aboutText: { fontSize: 13, color: colors.brand.dark, lineHeight: 20 },
  aboutLabel: { fontSize: 11, fontWeight: '800', color: colors.neutral.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  aboutValue: { fontSize: 13, color: colors.brand.dark, marginBottom: 3 },
  footerCopy: { fontSize: 11, color: colors.neutral.textLight, textAlign: 'center', marginTop: 16, fontWeight: '600' },
});
