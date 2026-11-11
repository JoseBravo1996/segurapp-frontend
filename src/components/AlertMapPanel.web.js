/**
 * AlertMapPanel.web.js
 * Panel interactivo para visualizar la ubicación detallada de una alerta en Web.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapPreview from './MapPreview';

export default function AlertMapPanel({ coords, style, title = 'Ubicación de la alerta' }) {
  const latitude = coords?.latitude ?? 0;
  const longitude = coords?.longitude ?? 0;

  return (
    <View style={[styles.panel, style]}>
      <MapPreview latitude={latitude} longitude={longitude} title={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 280,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
});
