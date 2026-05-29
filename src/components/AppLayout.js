import React from 'react';
import { View, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../utils/responsive';
import CustomHeader from './CustomHeader';
import LocationStatus from './LocationStatus';
import MainTabNavigator from './MainTabNavigator';

export default function AppLayout({
  children,
  currentScreen,
  showHeader = true,
  showLocation = true,
  showNav = true,
  backgroundColor = '#ffffff',
}) {
  const { isDesktop } = useResponsive();

  if (isDesktop && showNav) {
    return (
      <View style={styles.rootRow}>
        <MainTabNavigator variant="sidebar" currentScreen={currentScreen} />
        <View style={[styles.mainColumn, { backgroundColor }]}>
          <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
            {Platform.OS === 'android' && (
              <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
            )}
            {showHeader && <CustomHeader />}
            {showLocation && <LocationStatus />}
            <View style={styles.scrollHost}>{children}</View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle={backgroundColor === '#050A18' ? 'light-content' : 'dark-content'} />
      )}
      {showHeader && <CustomHeader />}
      {showLocation && <LocationStatus />}
      <View style={styles.scrollHost}>{children}</View>
      {showNav && (
        <SafeAreaView edges={['bottom']} style={styles.tabBarSafeArea}>
          <MainTabNavigator variant="bottom" currentScreen={currentScreen} />
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = {
  rootRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#050A18',
    minHeight: Platform.OS === 'web' ? '100dvh' : undefined,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: Platform.OS === 'web' ? '100dvh' : undefined,
  },
  safeArea: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100dvh' : undefined,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
    overflow: Platform.OS === 'web' ? 'hidden' : undefined,
  },
  tabBarSafeArea: {
    backgroundColor: '#050A18',
    flexShrink: 0,
  },
};
