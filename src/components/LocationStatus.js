import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useResponsive } from '../utils/responsive';

const LOCATION_TIMEOUT_MS = 15000;

function formatCoords(latitude, longitude) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

async function getPositionWithTimeout() {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), LOCATION_TIMEOUT_MS);
  });
  const position = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    ...(Platform.OS === 'web' ? { maximumAge: 60000 } : {}),
  });
  return Promise.race([position, timeout]);
}

export default function LocationStatus() {
  const { contentPadding, contentMaxWidth, isMobile, isDesktop, isSmallPhone } = useResponsive();
  const [address, setAddress] = useState('Obteniendo ubicación...');
  const [errorMsg, setErrorMsg] = useState(null);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    const updateAddress = async (latitude, longitude) => {
      const coordsLabel = formatCoords(latitude, longitude);
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (cancelledRef.current) return;

        if (reverseGeocode.length > 0) {
          const item = reverseGeocode[0];
          const street = item.street || item.name || 'Ubicación detectada';
          const number = item.streetNumber || '';
          const city = item.city || item.subregion || item.region || '';
          const parts = [`${street} ${number}`.trim(), city].filter(Boolean);
          setAddress(parts.length > 0 ? parts.join(', ') : coordsLabel);
        } else {
          setAddress(coordsLabel);
        }
      } catch {
        if (!cancelledRef.current) {
          setAddress(coordsLabel);
        }
      }
    };

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelledRef.current) return;

        if (status !== 'granted') {
          setErrorMsg('Permiso denegado');
          setAddress(
            Platform.OS === 'web'
              ? 'Permití la ubicación en el navegador'
              : 'Ubicación no disponible'
          );
          return;
        }

        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
          try {
            location = await getPositionWithTimeout();
          } catch {
            if (!cancelledRef.current) {
              setAddress(
                Platform.OS === 'web'
                  ? 'No se pudo obtener la ubicación'
                  : 'No se pudo obtener la ubicación'
              );
            }
            return;
          }
        }

        if (cancelledRef.current) return;

        if (location?.coords) {
          const { latitude, longitude } = location.coords;
          await updateAddress(latitude, longitude);
        } else {
          setAddress('Ubicación no disponible');
        }
      } catch {
        if (!cancelledRef.current) {
          setAddress('Error al obtener ubicación');
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const isActive = !errorMsg;
  const accentColor = isActive ? '#22C55E' : '#EF4444';

  return (
    <View style={[styles.wrapper, { paddingHorizontal: contentPadding }]}>
      <View
        style={[
          styles.card,
          { borderLeftColor: accentColor, maxWidth: contentMaxWidth },
          errorMsg && styles.cardError,
          isDesktop && styles.cardDesktop,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons
            name={isActive ? 'navigate' : 'location-outline'}
            size={isSmallPhone ? 16 : 18}
            color={accentColor}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.statusLabel, { color: accentColor }]}>
              {isActive ? 'Monitoreo activo' : 'GPS desconectado'}
            </Text>
            {isActive && (
              <View style={[styles.liveBadge, { borderColor: `${accentColor}40` }]}>
                <Animated.View
                  style={[styles.liveDot, { backgroundColor: accentColor, opacity: pulseAnim }]}
                />
                <Text style={[styles.liveText, { color: accentColor }]}>En vivo</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.address, isSmallPhone && styles.addressSmall]}
            numberOfLines={isMobile ? 1 : 2}
          >
            {address}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDesktop: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  cardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#F0FDF4',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  address: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  addressSmall: {
    fontSize: 11,
  },
});
