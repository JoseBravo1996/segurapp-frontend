import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../utils/responsive';

export default function CustomHeader() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { isMobile, isDesktop, contentPadding, isWeb } = useResponsive();

  const topPadding = isDesktop ? 20 : isWeb ? 12 : Platform.OS === 'ios' ? 60 : 50;

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
          paddingBottom: isDesktop ? 16 : 20,
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <View style={[styles.iconCircle, isMobile && styles.iconCircleMobile]}>
          <Ionicons name="shield-checkmark" size={isMobile ? 20 : 24} color="white" />
        </View>

        <View style={{ marginLeft: isMobile ? 10 : 12 }}>
          <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>
            Segur<Text style={{ color: '#FF5E00' }}>APP</Text>
          </Text>
          {!isMobile && <Text style={styles.headerSubtitle}>Sistema Protegido</Text>}
        </View>
      </View>

      <View style={styles.headerIcons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={22} color="#B0B0B0" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#FF5E00" />
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
    backgroundColor: '#050A18',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 94, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.4)',
  },
  iconCircleMobile: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: 1 },
  headerTitleMobile: { fontSize: 18 },
  headerSubtitle: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  iconButton: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
});
