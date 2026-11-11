import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';

export default function PrimaryButton({ title, onPress, style, variant = 'primary' }) {
  const isEmergency = variant === 'emergency';
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isEmergency ? styles.buttonEmergency : styles.buttonPrimary,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    elevation: 3,
  },
  buttonPrimary: {
    backgroundColor: colors.brand.dark,
    borderWidth: 1,
    borderColor: colors.brand.border,
  },
  buttonEmergency: {
    backgroundColor: colors.emergency.primary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
