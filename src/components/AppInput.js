import React from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AppInput({ label, iconName, placeholder, value, onChangeText, ...props }) {
  return (
    <View style={styles.container}>
      {/* 1. Etiqueta (Usuario/Contraseña) ahora en Blanco */}
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.inputContainer}>
        <Ionicons name={iconName} size={20} color="#FF5E00" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder={placeholder}
          placeholderTextColor="#BBB" 
          value={value}
          onChangeText={onChangeText}
          {...props} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 15 },
  
  // CAMBIADO A BLANCO
  label: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginBottom: 5, 
    color: '#FFFFFF' 
  },
  
  // MANTENEMOS EL ESTILO ORIGINAL (Fondo claro)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  
  inputIcon: { marginRight: 10 },
  
  // CAMBIADO A BLANCO (Lo que el usuario escribe)
  input: { 
    flex: 1, 
    height: 45, 
    color: '#0e0e0e' // Ahora el texto ingresado será blanco
  },
});