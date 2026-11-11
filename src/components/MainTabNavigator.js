import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useResponsive, SIDEBAR_WIDTH } from '../utils/responsive';
import colors from '../theme/colors';

const TABS = [
  { id: 'Emergencia', icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline', label: 'Emergencia' },
  { id: 'Ubicación', icon: 'map', iconOutline: 'map-outline', label: 'Ubicación' },
  { id: 'Contactos', icon: 'people', iconOutline: 'people-outline', label: 'Contactos' },
  { id: 'Palabras', icon: 'mic', iconOutline: 'mic-outline', label: 'Palabras' },
  { id: 'Historial', icon: 'list', iconOutline: 'list-outline', label: 'Historial' },
];

function TabButton({ tab, isActive, onPress, variant }) {
  const { isSmallPhone } = useResponsive();
  const isSidebar = variant === 'sidebar';

  return (
    <TouchableOpacity
      style={[
        isSidebar ? styles.sidebarItem : styles.tabItem,
        isSidebar && isActive && styles.sidebarItemActive,
        !isSidebar && isActive && styles.tabItemActive,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      focusable={false}
    >
      <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
        <Ionicons
          name={isActive ? tab.icon : tab.iconOutline}
          size={isSidebar ? 22 : isSmallPhone ? 20 : 22}
          color={isActive ? colors.neutral.white : '#94A3B8'}
        />
      </View>
      {(isSidebar || !isSmallPhone) && (
        <Text
          selectable={false}
          style={[
            isSidebar ? styles.sidebarLabel : styles.tabLabel,
            isActive && (isSidebar ? styles.sidebarLabelActive : styles.tabLabelActive),
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function MainTabNavigator({ currentScreen, variant = 'bottom' }) {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { bottomInset, isWeb } = useResponsive();

  const navigate = (id) => navigation.navigate(id);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (variant === 'sidebar') {
    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarBrand}>
          <View style={styles.brandIcon}>
            <Ionicons name="shield-checkmark" size={26} color="white" />
          </View>
          <Text style={styles.brandTitle}>
            Segur<Text style={{ color: colors.emergency.primary }}>APP</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Centro de Operaciones</Text>
        </View>

        <View style={styles.sidebarNav}>
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={currentScreen === tab.id}
              onPress={() => navigate(tab.id)}
              variant="sidebar"
            />
          ))}
        </View>

        {/* ACCIONES DE CONFIGURACIÓN Y CERRAR SESIÓN (EN LA POSICIÓN MARCADA EN AZUL) */}
        <View style={styles.sidebarActionsContainer}>
          <TouchableOpacity
            style={[
              styles.sidebarActionBtn,
              currentScreen === 'Settings' && styles.sidebarItemActive,
            ]}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.sidebarActionIconWrap}>
              <Ionicons name="settings-outline" size={18} color="#94A3B8" />
            </View>
            <Text style={styles.sidebarActionText}>Configuración</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarActionBtn, styles.sidebarActionBtnLogout]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.sidebarActionIconWrap, styles.sidebarLogoutIconWrap]}>
              <Ionicons name="log-out-outline" size={18} color="#F87171" />
            </View>
            <Text style={styles.sidebarLogoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarFooter}>
          <Text style={styles.footerNote}>SISTEMA ACTIVO 24/7</Text>
        </View>
      </View>
    );
  }

  const tabBarBottomPad = isWeb && bottomInset > 0 ? bottomInset : 0;

  return (
    <View
      style={[
        styles.tabBar,
        tabBarBottomPad > 0 && { paddingBottom: tabBarBottomPad },
      ]}
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={currentScreen === tab.id}
          onPress={() => navigate(tab.id)}
          variant="bottom"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.brand.dark,
    borderTopWidth: 1,
    borderTopColor: colors.brand.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabItemActive: {
    borderRadius: 12,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.neutral.white,
    fontWeight: '800',
  },

  sidebar: {
    width: SIDEBAR_WIDTH,
    alignSelf: 'stretch',
    backgroundColor: colors.brand.dark,
    borderRightWidth: 1,
    borderRightColor: colors.brand.border,
    paddingTop: Platform.OS === 'web' ? 16 : 40,
    paddingHorizontal: 12,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  sidebarBrand: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand.border,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '600',
  },
  sidebarNav: {
    flex: 1,
    gap: 3,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sidebarLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 10,
    fontWeight: '600',
    flex: 1,
  },
  sidebarLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sidebarActionsContainer: {
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.brand.border,
    gap: 4,
  },
  sidebarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sidebarActionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarActionText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginLeft: 8,
    fontWeight: '700',
  },
  sidebarActionBtnLogout: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  sidebarLogoutIconWrap: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  sidebarLogoutText: {
    fontSize: 12,
    color: '#FCA5A5',
    marginLeft: 8,
    fontWeight: '700',
  },
  sidebarFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.brand.border,
  },
  footerNote: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
