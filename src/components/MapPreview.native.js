import React from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import colors from '../theme/colors';

export default function MapPreview({ latitude, longitude, title = 'Ubicación' }) {
  const isValidCoord =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  if (!isValidCoord) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Ubicación no disponible</Text>
      </View>
    );
  }

  const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <View style={styles.mapContainer}>
      <MapView
        provider={provider}
        style={StyleSheet.absoluteFillObject}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        toolbarEnabled={true}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          pinColor={colors.emergency.primary}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: '100%',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    elevation: 4,
  },
  errorContainer: {
    height: '100%',
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#64748B',
    fontSize: 13,
  },
});
