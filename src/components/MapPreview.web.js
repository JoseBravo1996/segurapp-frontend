import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Linking } from 'react-native';

export default function MapPreview({ latitude, longitude, title }) {
  const openMaps = () => {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    );
  };

  return (
    <View style={styles.mapContainer}>
      <TouchableOpacity style={styles.placeholder} onPress={openMaps} activeOpacity={0.85}>
        <Text style={styles.title}>{title || 'Ubicación actual'}</Text>
        <Text style={styles.coords}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
        <Text style={styles.link}>Abrir en Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#050A18',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 94, 0, 0.3)',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { color: '#FF5E00', fontWeight: '800', fontSize: 16, marginBottom: 8 },
  coords: { color: '#CBD5E1', fontSize: 14, marginBottom: 12 },
  link: { color: '#FFFFFF', fontWeight: '700', textDecorationLine: 'underline' },
});
