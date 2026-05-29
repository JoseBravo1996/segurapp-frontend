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
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#050A18' }}>
        <MainTabNavigator variant="sidebar" currentScreen={currentScreen} />
        <View style={{ flex: 1, backgroundColor, minWidth: 0 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor }}>
            {Platform.OS === 'android' && (
              <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
            )}
            {showHeader && <CustomHeader />}
            {showLocation && <LocationStatus />}
            <View style={{ flex: 1 }}>{children}</View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle={backgroundColor === '#050A18' ? 'light-content' : 'dark-content'} />
      )}
      {showHeader && <CustomHeader />}
      {showLocation && <LocationStatus />}
      {children}
      {showNav && <MainTabNavigator variant="bottom" currentScreen={currentScreen} />}
    </SafeAreaView>
  );
}
