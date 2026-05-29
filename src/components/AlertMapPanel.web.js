import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';

export default function AlertMapPanel({ coords, style }) {
  const openMaps = () => {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`
    );
  };

  return (
    <View style={[styles.panel, style]}>
      <Text style={styles.label}>Ubicación del evento</Text>
      <Text style={styles.coords}>
        {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
      </Text>
      <TouchableOpacity style={styles.button} onPress={openMaps}>
        <Text style={styles.buttonText}>Ver en Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    padding: 20,
  },
  label: { fontWeight: '700', color: '#050A18', marginBottom: 8 },
  coords: { color: '#64748B', marginBottom: 16 },
  button: {
    backgroundColor: '#FF5E00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
