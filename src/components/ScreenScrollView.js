import React from 'react';
import { ScrollView, StyleSheet, Platform } from 'react-native';
import { useResponsive, getScrollContentStyle } from '../utils/responsive';

export default function ScreenScrollView({
  children,
  contentContainerStyle,
  style,
  ...props
}) {
  const responsive = useResponsive();
  const baseContentStyle = getScrollContentStyle(responsive);

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[baseContentStyle, contentContainerStyle]}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          overflow: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }
      : {}),
  },
});
