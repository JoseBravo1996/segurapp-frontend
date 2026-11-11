/**
 * AlertMap.native.js
 * Mapa interactivo con marcadores del historial de alertas – versión nativa (iOS / Android)
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import colors from '../theme/colors';

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AlertMap({ alerts = [], height = 340, onSelectAlert }) {
  const validAlerts = useMemo(
    () =>
      alerts.filter(
        (a) =>
          typeof a.userLat === 'number' &&
          typeof a.userLng === 'number' &&
          !isNaN(a.userLat) &&
          !isNaN(a.userLng) &&
          a.userLat !== 0 &&
          a.userLng !== 0
      ),
    [alerts]
  );

  if (validAlerts.length === 0) {
    return (
      <View style={[styles.empty, { height: 120 }]}>
        <Text style={styles.emptyTitle}>📍 Sin alertas con ubicación</Text>
        <Text style={styles.emptySubtitle}>Las alertas con coordenadas se mostrarán en este mapa.</Text>
      </View>
    );
  }

  const centerAlert = validAlerts[0];
  const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        provider={provider}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: centerAlert.userLat,
          longitude: centerAlert.userLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {validAlerts.map((alert) => {
          const pinColor = alert.isResolved
            ? colors.status.success
            : alert.isSilent
            ? colors.status.silent
            : colors.emergency.primary;

          return (
            <Marker
              key={alert.id}
              coordinate={{ latitude: alert.userLat, longitude: alert.userLng }}
              pinColor={pinColor}
              onPress={() => onSelectAlert && onSelectAlert(alert)}
            >
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutBadge}>
                    {alert.isResolved ? '✓ Resuelta' : alert.isSilent ? '🔇 Silenciosa' : '🚨 Activa'}
                  </Text>
                  <Text style={styles.calloutWord}>"{alert.word || 'Emergencia'}"</Text>
                  <Text style={styles.calloutDate}>{formatDate(alert.timestamp)}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#E2E8F0',
  },
  empty: {
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  emptyTitle: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  callout: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#334155',
  },
  calloutBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  calloutWord: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  calloutDate: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
});
