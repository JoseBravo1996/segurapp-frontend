import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

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
  const [address, setAddress] = useState('Obteniendo ubicación...');
  const [errorMsg, setErrorMsg] = useState(null);

  const borderPulseAnim = useRef(new Animated.Value(0)).current;
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(borderPulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
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
          const parts = [`${street} ${number}`.trim(), city, 'Argentina'].filter(Boolean);
          setAddress(parts.join(', '));
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
              ? 'Permití la ubicación en el navegador (icono del candado en la barra de dirección)'
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
                  ? 'No se pudo obtener la ubicación. Revisá que el sitio tenga permiso de ubicación.'
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

  const statusColor = errorMsg ? '#FF0000' : '#00FF41';

  const borderGlow = borderPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  const opacityGlow = borderPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedBorder,
          {
            borderColor: statusColor,
            borderWidth: borderGlow,
            opacity: opacityGlow,
            shadowColor: statusColor,
            shadowRadius: borderPulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 12],
            }),
          },
        ]}
      />

      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: `${statusColor}20` }]}>
          <Ionicons name="location-sharp" size={20} color={statusColor} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {errorMsg ? 'SISTEMA DESCONECTADO' : 'MONITOREO ACTIVO'}
            </Text>
            {!errorMsg && <View style={[styles.dot, { backgroundColor: statusColor }]} />}
          </View>
          <Text style={styles.address} numberOfLines={2}>
            {address}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: -20,
    zIndex: 10,
    position: 'relative',
  },
  animatedBorder: {
    position: 'absolute',
    top: -1,
    left: 19,
    right: 19,
    bottom: -0.8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 100,
    elevation: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#050A18',
    padding: 15,
    borderRadius: 18,
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
  },
  textContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '900', fontSize: 12, color: '#FFFFFF', marginRight: 8, letterSpacing: 1 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  address: { color: '#E0E0E0', fontSize: 12, marginTop: 4, fontWeight: '500' },
});
