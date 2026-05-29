import React from 'react';
import { View, SafeAreaView, Platform, StatusBar } from 'react-native';
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
          <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle={backgroundColor === '#050A18' ? 'light-content' : 'dark-content'} />
      )}
      {showHeader && <CustomHeader />}
      {showLocation && <LocationStatus />}
      <View style={styles.scrollHost}>{children}</View>
      {showNav && <MainTabNavigator variant="bottom" currentScreen={currentScreen} />}
    </SafeAreaView>
  );
}

const styles = {
  rootRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#050A18',
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  safeArea: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
    overflow: Platform.OS === 'web' ? 'hidden' : undefined,
  },
};
