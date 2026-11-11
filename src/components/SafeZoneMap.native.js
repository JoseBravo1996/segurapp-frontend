/**
 * SafeZoneMap.native.js
 * Mapa nativo de Zonas Seguras con react-native-maps para Android e iOS.
 * Renderiza marcadores y círculos de radio de cobertura geográfico.
 */
import React from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import colors from '../theme/colors';

export default function SafeZoneMap({
  userLatitude,
  userLongitude,
  safeZones = [],
  previewZone = null,
  focusedZone = null,
  height = 300,
  onSelectZone,
  onLocationChange,
}) {
  const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  const initialLat =
    focusedZone?.latitude ??
    previewZone?.latitude ??
    (userLatitude && !isNaN(userLatitude) ? userLatitude : -34.7745);
  const initialLng =
    focusedZone?.longitude ??
    previewZone?.longitude ??
    (userLongitude && !isNaN(userLongitude) ? userLongitude : -58.2678);

  return (
    <View style={[styles.mapContainer, { height }]}>
      <MapView
        provider={provider}
        style={StyleSheet.absoluteFillObject}
        onPress={(e) => {
          if (previewZone && onLocationChange) {
            onLocationChange(e.nativeEvent.coordinate);
          }
        }}
        region={{
          latitude: initialLat,
          longitude: initialLng,
          latitudeDelta: previewZone ? 0.008 : 0.03,
          longitudeDelta: previewZone ? 0.008 : 0.03,
        }}
        toolbarEnabled={true}
      >
        {/* Ubicación del usuario */}
        {userLatitude && userLongitude && (
          <Marker
            coordinate={{ latitude: userLatitude, longitude: userLongitude }}
            title="Tu Ubicación Actual"
            pinColor="#FF5E00"
          />
        )}

        {/* Zonas Seguras registradas */}
        {safeZones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Circle
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={zone.radiusMeters || 100}
              strokeColor="rgba(16, 185, 129, 0.85)"
              fillColor="rgba(16, 185, 129, 0.20)"
              strokeWidth={2}
            />
            <Marker
              coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
              title={zone.name}
              description={`${zone.address || ''} (Radio: ${zone.radiusMeters}m)`}
              pinColor="#10B981"
              onPress={() => onSelectZone && onSelectZone(zone)}
            />
          </React.Fragment>
        ))}

        {/* Previsualización en modal */}
        {previewZone && previewZone.latitude && previewZone.longitude && (
          <React.Fragment>
            <Circle
              center={{ latitude: previewZone.latitude, longitude: previewZone.longitude }}
              radius={previewZone.radiusMeters || 100}
              strokeColor="rgba(2, 132, 199, 0.9)"
              fillColor="rgba(2, 132, 199, 0.25)"
              strokeWidth={2}
            />
            <Marker
              coordinate={{ latitude: previewZone.latitude, longitude: previewZone.longitude }}
              title={previewZone.name || 'Nueva Zona'}
              description={`Radio: ${previewZone.radiusMeters || 100}m (Arrastrá para ajustar)`}
              pinColor="#0284C7"
              draggable={true}
              onDragEnd={(e) => {
                if (onLocationChange) {
                  onLocationChange(e.nativeEvent.coordinate);
                }
              }}
            />
          </React.Fragment>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    elevation: 4,
  },
});

