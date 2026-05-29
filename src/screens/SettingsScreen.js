import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
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

export default function SettingsScreen() {
  const responsive = useResponsive();
  const socialColWidth = responsive.isDesktop ? '15.5%' : responsive.isTablet ? '23%' : '31%';
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedLang, setSelectedLang] = useState('Español');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const navigation = useNavigation();
  const { logout } = useAuth();
  const openSocial = (url) => Linking.openURL(url);

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
      showAppAlert('Perfil actualizado', 'Tus datos se guardaron correctamente.');
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

  // --- SUB-VISTA: DATOS PERSONALES ---
  const ProfileView = () => (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <Text style={styles.cardTitle}>Mi Perfil de Seguridad</Text>
      {profileLoading ? (
        <ActivityIndicator color="#FF5E00" style={{ marginVertical: 24 }} />
      ) : (
        <>
          <AppInput
            label="Nombre completo"
            iconName="person-outline"
            placeholder="Nombre completo"
            value={name}
            onChangeText={setName}
          />
          <AppInput
            label="Email"
            iconName="mail-outline"
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            editable={false}
          />
          <Text style={styles.fieldHint}>El email no se puede cambiar por ahora.</Text>
          <AppInput
            label="Teléfono vinculado"
            iconName="call-outline"
            placeholder="Teléfono"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
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
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              title={profileSaving ? 'Guardando...' : 'Guardar cambios'}
              onPress={saveProfile}
            />
          </View>
        </>
      )}
      <View style={{ marginTop: 16 }}>
        <PrimaryButton title="Cerrar sesión" onPress={handleLogout} />
      </View>
    </View>
  );

  // --- SUB-VISTA: IDIOMA ---
  const LanguageView = () => {
    const languages = [
      { id: 'es', name: 'Español', flag: '🇪🇸' },
      { id: 'en', name: 'English', flag: '🇺🇸' },
      { id: 'it', name: 'Italiano', flag: '🇮🇹' },
      { id: 'fr', name: 'Français', flag: '🇫🇷' },
      { id: 'pt', name: 'Português', flag: '🇧🇷' },
    ];
    return (
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <Text style={styles.cardTitle}>Idioma del Sistema</Text>
        {languages.map((lang) => (
          <TouchableOpacity 
            key={lang.id} 
            style={[styles.langItem, selectedLang === lang.name && styles.langItemActive]}
            onPress={() => setSelectedLang(lang.name)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 15 }}>{lang.flag}</Text>
              <Text style={[styles.langText, selectedLang === lang.name && {fontWeight: '700'}]}>{lang.name}</Text>
            </View>
            {selectedLang === lang.name && <Ionicons name="checkmark-circle" size={20} color="#FF5E00" />}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // --- SUB-VISTA: ACERCA DE (UNAJ) ---
  const AboutView = () => (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <Text style={styles.cardTitle}>Información del Proyecto</Text>
      <View style={styles.aboutBox}>
        <Text style={styles.aboutText}>
          <Text style={{color: '#FF5E00', fontWeight: '800'}}>SegurAPP</Text> es un desarrollo para la materia de Programación en Tiempo Real de la <Text style={{fontWeight: '700'}}>Universidad Nacional Arturo Jauretche</Text>.
        </Text>
        <View style={styles.separator} />
        <Text style={styles.aboutLabel}>Profesor:</Text>
        <Text style={styles.aboutValue}> • Encinas Diego</Text>
        <View style={styles.separator} />
        <Text style={styles.aboutLabel}>Alumnos:</Text>
        {['Antunes Julian', 'Acuña Roberto', 'Bravo Jose', 'D\'Amico Claudio', 'Lopez Franco'].map(a => (
          <Text key={a} style={styles.aboutValue}> • {a}</Text>
        ))}
        <Text style={styles.footerCopy}>© 2026 • Versión 1.0.4-stable</Text>
      </View>
    </View>
  );

  const SocialView = () => {
    const socials = [
      { name: 'Facebook', icon: 'logo-facebook', color: '#1877F2', url: 'https://facebook.com' },
      { name: 'X', icon: 'logo-twitter', color: '#050A18', url: 'https://twitter.com' },
      { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', url: 'https://instagram.com' },
      { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', url: 'https://youtube.com' },
      { name: 'Reddit', icon: 'logo-reddit', color: '#FF4500', url: 'https://reddit.com' },
      { name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2', url: 'https://linkedin.com' },
    ];
    return (
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <Text style={styles.cardTitle}>Seguinos en Redes</Text>
        <View style={styles.socialGrid}>
          {socials.map((s) => (
            <TouchableOpacity key={s.name} style={[styles.socialBtn, { width: socialColWidth }]} onPress={() => openSocial(s.url)}>
              <Ionicons name={s.icon} size={28} color={s.color} />
              <Text style={styles.socialName}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <AppLayout currentScreen="Settings">
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#050A18" />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Configuración</Text>
        </View>

        {/* --- SELECTOR DE TABS --- */}
        <View style={styles.tabBar}>
          {[
            {id: 'profile', icon: 'person'},
            {id: 'language', icon: 'globe'},
            {id: 'about', icon: 'information-circle'},
            {id: 'social', icon: 'heart'}
          ].map(tab => (
            <TouchableOpacity 
              key={tab.id}
              style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]} 
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons 
                name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`} 
                size={22} 
                color={activeTab === tab.id ? '#FF5E00' : '#64748B'} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* --- RENDERIZADO DE VISTAS --- */}
        <View style={styles.viewContainer}>
            {activeTab === 'profile' && <ProfileView />}
            {activeTab === 'language' && <LanguageView />}
            {activeTab === 'about' && <AboutView />}
            {activeTab === 'social' && <SocialView />}
        </View>

      </ScreenScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  mainTitle: { fontSize: 24, fontWeight: '800', marginLeft: 15, color: '#050A18' },
  
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 20, 
    padding: 6, 
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 15 },
  tabItemActive: { backgroundColor: '#FFFFFF', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },

  card: { 
    backgroundColor: 'white', 
    borderRadius: 25, 
    padding: 25, 
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15,
    borderWidth: 1, borderColor: '#F1F5F9',
    position: 'relative', overflow: 'hidden'
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: '#FF5E00' },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, color: '#050A18' },
  fieldHint: { fontSize: 11, color: '#94A3B8', marginTop: -8, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 8, marginBottom: 4 },
  
  langItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  langItemActive: { backgroundColor: 'transparent' },
  langText: { fontSize: 16, color: '#050A18' },
  
  aboutBox: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20 },
  aboutText: { fontSize: 15, color: '#475569', lineHeight: 24 },
  separator: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 15 },
  aboutLabel: { fontSize: 13, fontWeight: '800', color: '#050A18', textTransform: 'uppercase', marginBottom: 8 },
  aboutValue: { fontSize: 15, color: '#64748B', marginBottom: 5 },
  footerCopy: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 20, fontWeight: '600' },
  
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  socialBtn: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  socialName: { fontSize: 10, color: '#050A18', marginTop: 8, fontWeight: '700' }
});