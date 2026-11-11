import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

export default function InfoBox({ title, children, bgColor, icon }) {
  return (
    <View style={[styles.container, { backgroundColor: bgColor || colors.neutral.white }]}>
      <View style={styles.headerRow}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={colors.brand.dark}
            style={{ marginRight: 8 }}
          />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.childrenContainer}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.brand.dark,
    letterSpacing: 0.3,
  },
  content: {
    flexDirection: 'row',
  },
  childrenContainer: {
    flex: 1,
  },
});
