import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useResponsive } from '../utils/responsive';
import { getNearestAddress } from '../services/geocodingService';

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
  const [coordsText, setCoordsText] = useState(null);
  const [addressText, setAddressText] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Obteniendo ubicación...');
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

    const resolveLocationDetails = async (latitude, longitude) => {
      const formatted = formatCoords(latitude, longitude);
      if (cancelledRef.current) return;
      setCoordsText(formatted);

      // Obtener dirección más cercana mediante geocodificación inversa
      let resolvedAddress = null;
      try {
        resolvedAddress = await getNearestAddress(latitude, longitude);
      } catch (e) {
        console.warn('[LocationStatus] Error en getNearestAddress:', e);
      }

      // Fallback con expo-location si no se obtuvo de Nominatim
      if (!resolvedAddress) {
        try {
          const expoReverse = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (expoReverse && expoReverse.length > 0) {
            const item = expoReverse[0];
            const street = item.street || item.name || '';
            const number = item.streetNumber || '';
            const city = item.city || item.subregion || item.region || '';
            const parts = [`${street} ${number}`.trim(), city].filter(Boolean);
            if (parts.length > 0) resolvedAddress = parts.join(', ');
          }
        } catch {
          // ignore
        }
      }

      if (cancelledRef.current) return;
      setAddressText(resolvedAddress || 'Ubicación geolocalizada en mapa');
    };

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelledRef.current) return;

        if (status !== 'granted') {
          setErrorMsg('Permiso denegado');
          setStatusMessage(
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
              setStatusMessage('No se pudo obtener la ubicación GPS');
            }
            return;
          }
        }

        if (cancelledRef.current) return;

        if (location?.coords) {
          const { latitude, longitude } = location.coords;
          await resolveLocationDetails(latitude, longitude);
        } else {
          setStatusMessage('Ubicación no disponible');
        }
      } catch {
        if (!cancelledRef.current) {
          setStatusMessage('Error al obtener ubicación');
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const isActive = !errorMsg;

  return (
    <View style={[styles.wrapper, { paddingHorizontal: contentPadding }]}>
      <View
        style={[
          styles.card,
          { maxWidth: contentMaxWidth },
          !isActive && styles.cardError,
          isDesktop && styles.cardDesktop,
        ]}
      >
        {/* Icono de Radar / Brújula Verde */}
        <View style={[styles.iconWrap, !isActive && styles.iconWrapError]}>
          <Ionicons
            name={isActive ? 'navigate' : 'location-outline'}
            size={isSmallPhone ? 18 : 20}
            color={isActive ? '#15803D' : '#DC2626'}
          />
        </View>

        <View style={styles.body}>
          {/* Fila Superior: Título + Badge En Vivo + Píldora de Coordenadas */}
          <View style={styles.topRow}>
            <View style={styles.statusGroup}>
              <Text style={[styles.statusLabel, !isActive && styles.statusLabelError]}>
                {isActive ? 'MONITOREO GPS ACTIVO' : 'GPS DESCONECTADO'}
              </Text>
              {isActive && (
                <View style={styles.liveBadge}>
                  <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                  <Text style={styles.liveText}>En vivo</Text>
                </View>
              )}
            </View>

            {isActive && coordsText && (
              <View style={styles.coordPill}>
                <Ionicons name="radio-outline" size={12} color="#15803D" />
                <Text style={styles.coordValue}>{coordsText}</Text>
              </View>
            )}
          </View>

          {/* Fila Inferior: Dirección física más cercana destacada */}
          {isActive ? (
            <View style={styles.addressRow}>
              <View style={styles.pinIconWrap}>
                <Ionicons name="location-sharp" size={13} color="#15803D" />
              </View>
              <Text
                style={[styles.addressText, isSmallPhone && styles.addressSmall]}
                numberOfLines={2}
              >
                {addressText || 'Identificando calles más cercanas...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.errorText}>{statusMessage}</Text>
          )}
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
    backgroundColor: '#F0FDF4', // Verde suave uniforme de fondo
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#86EFAC', // Borde verde esmeralda suave
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A', // Indicador verde vivo a la izquierda
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDesktop: {
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  cardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderLeftColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconWrapError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#15803D',
  },
  statusLabelError: {
    color: '#DC2626',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#86EFAC',
    backgroundColor: '#DCFCE7',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  coordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  coordValue: {
    color: '#166534',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  pinIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressText: {
    color: '#064E3B',
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 18,
    flex: 1,
  },
  addressSmall: {
    fontSize: 11,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
});
