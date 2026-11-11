import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../utils/responsive';
import colors from '../theme/colors';

export default function CustomHeader() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { isMobile, isDesktop, contentPadding, isWeb } = useResponsive();

  const topPadding = isDesktop ? 16 : isWeb ? 12 : Platform.OS === 'ios' ? 56 : 46;

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: contentPadding,
          paddingTop: topPadding,
          paddingBottom: isDesktop ? 14 : 16,
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <View style={[styles.iconCircle, isMobile && styles.iconCircleMobile]}>
          <Ionicons name="shield-checkmark" size={isMobile ? 20 : 24} color="#FFFFFF" />
        </View>

        <View style={{ marginLeft: isMobile ? 10 : 12 }}>
          <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>
            Segur<Text style={{ color: colors.emergency.primary }}>APP</Text>
          </Text>
          {!isMobile && <Text style={styles.headerSubtitle}>Red de Protección y Emergencias</Text>}
        </View>
      </View>

      <View style={styles.headerIcons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#F87171" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.5)',
  },
  iconCircleMobile: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.8 },
  headerTitleMobile: { fontSize: 18 },
  headerSubtitle: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  iconButton: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
  },
});
