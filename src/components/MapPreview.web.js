/**
 * MapPreview.web.js
 * Mapa individual interactivo para Web usando Leaflet + OpenStreetMap.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking } from 'react-native';
import L from 'leaflet';
import colors from '../theme/colors';

function ensureLeafletCss() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('segurapp-leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'segurapp-leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

function createSinglePinIcon() {
  const html = `
    <div style="
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${colors.emergency.primary};
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <span style="font-size: 15px;">📍</span>
    </div>
  `;
  return L.divIcon({
    className: 'segurapp-single-pin',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export default function MapPreview({ latitude, longitude, title = 'Ubicación de alerta' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const isValidCoord =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  useEffect(() => {
    ensureLeafletCss();

    if (!mapContainerRef.current || !isValidCoord) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { icon: createSinglePinIcon() }).addTo(map);
    marker.bindPopup(`<strong>${title}</strong><br/>${latitude.toFixed(5)}, ${longitude.toFixed(5)}`).openPopup();

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, title, isValidCoord]);

  const openExternalMaps = () => {
    if (!isValidCoord) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
  };

  if (!isValidCoord) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Coordenadas no disponibles</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />
      <TouchableOpacity style={styles.externalButton} onPress={openExternalMaps} activeOpacity={0.85}>
        <Text style={styles.externalButtonText}>Abrir en app de mapas ↗</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  externalButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 999,
    backgroundColor: colors.brand.dark,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  externalButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
