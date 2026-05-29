import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppInput from '../components/AppInput';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth, ApiError } from '../context/AuthContext';
import { showAppAlert } from '../utils/showAppAlert';
import * as segurappApi from '../services/segurappApi';
import { useResponsive, getCardWidth } from '../utils/responsive';

export default function LoginScreen({ navigation }) {
  const responsive = useResponsive();
  const cardWidth = getCardWidth(responsive, responsive.isDesktop ? 440 : 480);
  const cardPadding = responsive.isSmallPhone ? 22 : responsive.isMobile ? 28 : 35;
  const titleSize = responsive.isSmallPhone ? 28 : responsive.isDesktop ? 38 : 36;
  const { login, register } = useAuth();
  const [currentView, setCurrentView] = useState('login');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devResetToken, setDevResetToken] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAppAlert('Campos requeridos', 'Ingresá email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.replace('Emergencia');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.';
      showAppAlert('Acceso denegado', message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim() || !registerEmail.trim() || !registerPhone.trim() || !registerPassword) {
      showAppAlert('Campos incompletos', 'Completá todos los datos para registrarte.');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: registerName.trim(),
        email: registerEmail.trim(),
        phone: registerPhone.trim(),
        password: registerPassword,
      });
      setCurrentView('success_register');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo crear la cuenta.';
      showAppAlert('Error de registro', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showAppAlert('Email requerido', 'Ingresá el email de tu cuenta.');
      return;
    }
    setLoading(true);
    try {
      const result = await segurappApi.forgotPassword(email.trim());
      if (result.resetToken) {
        setDevResetToken(result.resetToken);
        setResetToken(result.resetToken);
        setCurrentView('reset');
        showAppAlert(
          'Modo desarrollo',
          'Se generó un token de recuperación. Completá la nueva contraseña en la siguiente pantalla.'
        );
      } else {
        setCurrentView('success_forgot');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo procesar la solicitud.';
      showAppAlert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim() || !resetToken.trim() || !newPassword) {
      showAppAlert('Campos incompletos', 'Completá email, código y nueva contraseña.');
      return;
    }
    if (newPassword.length < 6) {
      showAppAlert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await segurappApi.resetPassword({
        email: email.trim(),
        resetToken: resetToken.trim(),
        newPassword,
      });
      setCurrentView('success_reset');
      setNewPassword('');
      setResetToken('');
      setDevResetToken(null);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo restablecer la contraseña.';
      showAppAlert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (currentView === 'success_register' || currentView === 'success_forgot' || currentView === 'success_reset') {
    const titles = {
      success_register: '¡Listo!',
      success_forgot: '¡Solicitud enviada!',
      success_reset: '¡Contraseña actualizada!',
    };
    const subtitles = {
      success_register: 'Tu cuenta de SegurAPP ha sido configurada. Ya podés iniciar sesión.',
      success_forgot:
        'Si el email está registrado, recibirás instrucciones. En desarrollo, si tenés el token, usá "Restablecer contraseña".',
      success_reset: 'Ya podés iniciar sesión con tu nueva contraseña.',
    };
    const icons = {
      success_register: 'checkmark-circle',
      success_forgot: 'mail-unread',
      success_reset: 'key',
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.card, { width: cardWidth, padding: cardPadding }]}>
          <View style={styles.successIconCircle}>
            <Ionicons name={icons[currentView]} size={responsive.isSmallPhone ? 80 : 100} color="#FF5E00" />
          </View>

          <Text style={[styles.title, { fontSize: titleSize }]}>{titles[currentView]}</Text>
          <Text style={styles.successSubtitle}>{subtitles[currentView]}</Text>

          {currentView === 'success_forgot' && devResetToken && (
            <TouchableOpacity onPress={() => setCurrentView('reset')} style={{ marginBottom: 16 }}>
              <Text style={styles.linkText}>Tengo el código → Restablecer</Text>
            </TouchableOpacity>
          )}

          <PrimaryButton title="Volver al inicio" onPress={() => setCurrentView('login')} />
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'reset') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.card, { width: cardWidth, padding: cardPadding }]}>
          <TouchableOpacity onPress={() => setCurrentView('login')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FF5E00" />
          </TouchableOpacity>

          <Text style={[styles.title, { fontSize: titleSize }]}>Nueva contraseña</Text>
          <Text style={styles.subtitle}>Ingresá el código recibido y tu nueva clave</Text>

          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
            <AppInput
              label="Email"
              iconName="mail-outline"
              placeholder="usuario@mail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <AppInput
              label="Código de recuperación"
              iconName="key-outline"
              placeholder="Pegá el código aquí"
              autoCapitalize="none"
              value={resetToken}
              onChangeText={setResetToken}
            />
            <AppInput
              label="Nueva contraseña"
              iconName="lock-closed-outline"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <PrimaryButton
              title={loading ? 'Guardando...' : 'Restablecer contraseña'}
              onPress={handleResetPassword}
              style={{ marginTop: 20 }}
            />
            {loading && <ActivityIndicator color="#FF5E00" style={{ marginTop: 16 }} />}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'forgot' || currentView === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.card, { width: cardWidth, padding: cardPadding }]}>
          <TouchableOpacity onPress={() => setCurrentView('login')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FF5E00" />
          </TouchableOpacity>

          <Text style={[styles.title, { fontSize: titleSize }]}>
            {currentView === 'forgot' ? 'Recuperar' : 'Registro'}
          </Text>
          <Text style={styles.subtitle}>
            {currentView === 'forgot'
              ? 'Enviaremos un código a tu correo'
              : 'Unite a la red de protección de SegurAPP'}
          </Text>

          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
            {currentView === 'register' && (
              <AppInput
                label="Nombre Completo"
                iconName="person-outline"
                placeholder="Nombre y Apellido"
                value={registerName}
                onChangeText={setRegisterName}
              />
            )}
            <AppInput
              label="Email"
              iconName="mail-outline"
              placeholder="usuario@mail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={currentView === 'register' ? registerEmail : email}
              onChangeText={currentView === 'register' ? setRegisterEmail : setEmail}
            />
            {currentView === 'register' && (
              <AppInput
                label="Teléfono"
                iconName="call-outline"
                placeholder="+5491100000000"
                keyboardType="phone-pad"
                value={registerPhone}
                onChangeText={setRegisterPhone}
              />
            )}
            {currentView === 'register' && (
              <AppInput
                label="Contraseña"
                iconName="lock-closed-outline"
                placeholder="********"
                secureTextEntry
                value={registerPassword}
                onChangeText={setRegisterPassword}
              />
            )}

            <PrimaryButton
              title={
                loading
                  ? 'Procesando...'
                  : currentView === 'forgot'
                    ? 'Enviar instrucciones'
                    : 'Crear Cuenta'
              }
              onPress={() => {
                if (currentView === 'forgot') {
                  handleForgotPassword();
                } else {
                  handleRegister();
                }
              }}
              style={{ marginTop: 20 }}
            />
            {loading && <ActivityIndicator color="#FF5E00" style={{ marginTop: 16 }} />}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.card, { width: cardWidth, padding: cardPadding }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, responsive.isSmallPhone && styles.iconCircleSmall]}>
            <Ionicons name="shield-checkmark" size={responsive.isSmallPhone ? 40 : 50} color="white" />
            <View style={[styles.pulseRing, responsive.isSmallPhone && styles.pulseRingSmall]} />
          </View>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            Segur<Text style={{ color: '#FF5E00' }}>APP</Text>
          </Text>
          <Text style={styles.subtitle}>Sistemas de Protección Inteligente</Text>
        </View>

        <View style={styles.form}>
          <AppInput
            label="Email"
            iconName="mail-outline"
            placeholder="usuario@mail.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <AppInput
            label="Contraseña"
            iconName="lock-closed-outline"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity onPress={() => setCurrentView('forgot')}>
            <Text style={styles.forgotText}>¿Problemas con tu clave?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentView('reset')} style={{ marginBottom: 20 }}>
            <Text style={[styles.forgotText, { textAlign: 'center', fontSize: 12 }]}>Ya tengo código de recuperación</Text>
          </TouchableOpacity>

          <PrimaryButton
            title={loading ? 'Ingresando...' : 'Inicia sesión'}
            onPress={handleLogin}
          />
          {loading && <ActivityIndicator color="#FF5E00" style={{ marginTop: 16 }} />}

          <TouchableOpacity onPress={() => setCurrentView('register')} style={styles.registerBtn}>
            <Text style={styles.registerText}>
              ¿Nuevo en la plataforma? <Text style={styles.linkText}>Registrate</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        <Text style={styles.footerText}>Protección de datos mediante cifrado.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A18',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#0A1128',
    borderRadius: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.2)',
    shadowColor: '#2e3db3',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    maxHeight: '92%',
    maxWidth: 480,
  },
  header: { alignItems: 'center', marginBottom: 30 },
  iconCircle: {
    backgroundColor: '#FF5E00',
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 2,
  },
  iconCircleSmall: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(255, 94, 0, 0.3)',
  },
  pulseRingSmall: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  title: { fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -1 },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  form: { width: '100%' },
  forgotText: {
    textAlign: 'right',
    color: '#FF5E00',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 25,
    opacity: 0.9,
  },
  registerBtn: { marginTop: 20 },
  registerText: { textAlign: 'center', fontSize: 14, color: '#CBD5E1' },
  linkText: { color: '#FF5E00', fontWeight: '800' },
  divider: { width: '40%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 25 },
  footerText: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  backButton: { alignSelf: 'flex-start', marginBottom: 20, padding: 5 },
  successIconCircle: {
    marginBottom: 20,
    shadowColor: '#FF5E00',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 35,
    fontWeight: '500',
  },
});
