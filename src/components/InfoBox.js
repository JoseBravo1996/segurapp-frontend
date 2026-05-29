import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InfoBox({ title, children, bgColor, icon }) {
  return (
    /* Usamos un color por defecto oscuro si no se pasa bgColor */
    <View style={[styles.container, { backgroundColor: bgColor || '#0A1128' }]}>
      <View style={styles.headerRow}>
        {icon && <Ionicons name={icon} size={20} color="#FF5E00" style={{ marginRight: 10 }} />}
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
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.2)', // Borde naranja sutil característico
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: '800',
    fontSize: 16,
    color: '#FF5E00', // Título en Naranja SegurAPP
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
  },
  childrenContainer: {
    flex: 1,
    color: '#E0E0E0', // Aseguramos que el contenido tienda al blanco/gris claro
  },
});