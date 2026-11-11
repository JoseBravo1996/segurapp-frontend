import React from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

export default function AppInput({
  label,
  iconName,
  placeholder,
  value,
  onChangeText,
  lightLabel = false,
  ...props
}) {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, lightLabel ? styles.labelLight : styles.labelDark]}>
          {label}
        </Text>
      )}

      <View style={styles.inputContainer}>
        {iconName && (
          <Ionicons
            name={iconName}
            size={18}
            color={colors.neutral.textMuted}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral.textLight}
          value={value}
          onChangeText={onChangeText}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  labelDark: {
    color: colors.brand.dark,
  },
  labelLight: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.brand.dark,
  },
});
