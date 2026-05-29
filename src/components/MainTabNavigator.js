import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useResponsive, SIDEBAR_WIDTH } from '../utils/responsive';

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
          color={isActive ? '#FF5E00' : '#64748B'}
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
  const { bottomInset, isWeb } = useResponsive();

  const navigate = (id) => navigation.navigate(id);

  if (variant === 'sidebar') {
    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarBrand}>
          <View style={styles.brandIcon}>
            <Ionicons name="shield-checkmark" size={26} color="white" />
          </View>
          <Text style={styles.brandTitle}>
            Segur<Text style={{ color: '#FF5E00' }}>APP</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Panel de control</Text>
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

        <View style={styles.sidebarFooter}>
          <Text style={styles.footerNote}>Protección activa 24/7</Text>
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
    backgroundColor: '#050A18',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 94, 0, 0.08)',
    borderRadius: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 15,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 94, 0, 0.1)',
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
    textDecorationLine: 'none',
  },
  tabLabelActive: {
    color: '#FF5E00',
    fontWeight: '800',
    textDecorationLine: 'none',
  },

  sidebar: {
    width: SIDEBAR_WIDTH,
    alignSelf: 'stretch',
    backgroundColor: '#050A18',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: Platform.OS === 'web' ? 28 : 48,
    paddingHorizontal: 16,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  sidebarBrand: {
    alignItems: 'center',
    marginBottom: 36,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 94, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  sidebarNav: {
    flex: 1,
    gap: 6,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(255, 94, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.25)',
  },
  sidebarLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 12,
    fontWeight: '600',
    flex: 1,
  },
  sidebarLabelActive: {
    color: '#FF5E00',
    fontWeight: '800',
  },
  sidebarFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerNote: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
