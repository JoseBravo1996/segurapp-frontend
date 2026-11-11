/**
 * SafeZoneMap.web.js
 * Mapa interactivo de Zonas Seguras para Web usando Leaflet + OpenStreetMap.
 * Renderiza marcadores temáticos, círculos de radio de cobertura en metros y popups informativos.
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

function createUserPinIcon() {
  const html = `
    <div style="
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #FF5E00;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 10px rgba(255, 94, 0, 0.45);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <span style="font-size: 16px;">📍</span>
    </div>
  `;
  return L.divIcon({
    className: 'segurapp-user-pin',
    html,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
}

function createSafeZonePinIcon() {
  const html = `
    <div style="
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #10B981;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.45);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <span style="font-size: 18px;">🛡️</span>
    </div>
  `;
  return L.divIcon({
    className: 'segurapp-safezone-pin',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function createPreviewPinIcon() {
  const html = `
    <div style="
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #0284C7;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);
      cursor: pointer;
      transform: translate(-50%, -50%);
      animation: pulse 1.5s infinite;
    ">
      <span style="font-size: 18px;">🎯</span>
    </div>
  `;
  return L.divIcon({
    className: 'segurapp-preview-pin',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

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
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const previewMarkerRef = useRef(null);
  const previewCircleRef = useRef(null);
  const onLocationChangeRef = useRef(onLocationChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    ensureLeafletCss();

    if (!mapContainerRef.current) return;

    // Si el mapa ya existe y solo estamos actualizando la posicion del previewMarker
    if (mapInstanceRef.current && previewZone && previewMarkerRef.current && previewCircleRef.current) {
      const pLat = previewZone.latitude;
      const pLng = previewZone.longitude;
      const pRad = previewZone.radiusMeters || 100;

      if (typeof pLat === 'number' && typeof pLng === 'number' && !isNaN(pLat) && !isNaN(pLng)) {
        previewMarkerRef.current.setLatLng([pLat, pLng]);
        previewCircleRef.current.setLatLng([pLat, pLng]);
        previewCircleRef.current.setRadius(pRad);
        return;
      }
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Centro inicial: zona enfocada, preview, usuario o default Florencio Varela
    const centerLat =
      focusedZone?.latitude ??
      previewZone?.latitude ??
      (userLatitude && !isNaN(userLatitude) ? userLatitude : -34.7745);
    const centerLng =
      focusedZone?.longitude ??
      previewZone?.longitude ??
      (userLongitude && !isNaN(userLongitude) ? userLongitude : -58.2678);

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: previewZone ? 16 : 14,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Si estamos en modo de seleccion / preview, permitir clic directo en cualquier punto del mapa
    if (previewZone) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', (e) => {
        if (onLocationChangeRef.current) {
          onLocationChangeRef.current({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          });
        }
      });
    }

    const featureElements = [];

    // 1. Ubicación del usuario (si está disponible)
    if (
      typeof userLatitude === 'number' &&
      typeof userLongitude === 'number' &&
      !isNaN(userLatitude) &&
      !isNaN(userLongitude) &&
      userLatitude !== 0
    ) {
      const userMarker = L.marker([userLatitude, userLongitude], {
        icon: createUserPinIcon(),
      }).addTo(map);

      userMarker.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 4px;">
          <strong style="color: #FF5E00; font-size: 13px;">📍 Tu Ubicación Actual</strong>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            ${userLatitude.toFixed(5)}, ${userLongitude.toFixed(5)}
          </div>
        </div>
      `);
      featureElements.push(userMarker);
    }

    // 2. Zonas Seguras registradas
    safeZones.forEach((zone) => {
      if (
        typeof zone.latitude !== 'number' ||
        typeof zone.longitude !== 'number' ||
        isNaN(zone.latitude) ||
        isNaN(zone.longitude)
      ) {
        return;
      }

      const radius = zone.radiusMeters || 100;

      // Círculo de cobertura
      const circle = L.circle([zone.latitude, zone.longitude], {
        radius,
        color: '#10B981',
        fillColor: '#10B981',
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(map);

      featureElements.push(circle);

      // Marcador
      const marker = L.marker([zone.latitude, zone.longitude], {
        icon: createSafeZonePinIcon(),
      }).addTo(map);

      featureElements.push(marker);

      const addressLine = [
        zone.address,
        zone.streetNumber,
        zone.city,
        zone.state,
      ]
        .filter(Boolean)
        .join(', ');

      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 800; font-size: 11px; padding: 2px 6px; border-radius: 6px;">
              🛡️ ZONA SEGURA
            </span>
            <span style="font-size: 11px; color: #64748B; font-weight: 600;">
              Radio: ${radius}m
            </span>
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">
            ${zone.name}
          </div>
          <div style="font-size: 12px; color: #334155; line-height: 16px; margin-bottom: 4px;">
            📍 ${addressLine || 'Dirección registrada'}
          </div>
          ${
            zone.additionalReference
              ? `<div style="font-size: 11px; color: #64748B; font-style: italic; margin-bottom: 6px;">
                   Ref: "${zone.additionalReference}"
                 </div>`
              : ''
          }
          <div style="font-size: 11px; color: #94A3B8; margin-bottom: 8px;">
            Coord: ${zone.latitude.toFixed(5)}, ${zone.longitude.toFixed(5)}
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=${zone.latitude},${zone.longitude}"
             target="_blank"
             rel="noopener noreferrer"
             style="display: inline-block; background: #0F172A; color: #FFF; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: 700;">
            Ver en Google Maps ↗
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);

      if (onSelectZone) {
        marker.on('click', () => onSelectZone(zone));
      }
    });

    // 3. Zona en Previsualización (durante creación o edición)
    if (
      previewZone &&
      typeof previewZone.latitude === 'number' &&
      typeof previewZone.longitude === 'number' &&
      !isNaN(previewZone.latitude) &&
      !isNaN(previewZone.longitude)
    ) {
      const pRadius = previewZone.radiusMeters || 100;

      const previewCircle = L.circle([previewZone.latitude, previewZone.longitude], {
        radius: pRadius,
        color: '#0284C7',
        fillColor: '#0284C7',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);

      previewCircleRef.current = previewCircle;
      featureElements.push(previewCircle);

      const previewMarker = L.marker([previewZone.latitude, previewZone.longitude], {
        icon: createPreviewPinIcon(),
        draggable: true,
      }).addTo(map);

      previewMarkerRef.current = previewMarker;

      previewMarker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        if (previewCircleRef.current) {
          previewCircleRef.current.setLatLng(newPos);
        }
        if (onLocationChangeRef.current) {
          onLocationChangeRef.current({
            latitude: newPos.lat,
            longitude: newPos.lng,
          });
        }
      });

      previewMarker
        .bindPopup(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 4px; text-align: center;">
            <strong style="color: #0284C7; font-size: 13px;">🎯 Ubicación Manual Activa</strong>
            <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-top: 2px;">${previewZone.name || 'Nueva Zona'}</div>
            <div style="font-size: 11px; color: #0369A1; background: #E0F2FE; padding: 3px 6px; border-radius: 6px; margin-top: 4px;">
              Arrastrá este punto o hacé clic en el mapa
            </div>
          </div>
        `);

      featureElements.push(previewMarker);
    }

    // Auto-encuadre si hay múltiples elementos
    if (featureElements.length > 1 && !previewZone && !focusedZone) {
      const group = L.featureGroup(featureElements);
      map.fitBounds(group.getBounds().pad(0.2));
    } else if (focusedZone) {
      map.setView([focusedZone.latitude, focusedZone.longitude], 16);
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userLatitude, userLongitude, safeZones, previewZone, focusedZone]);

  return (
    <View style={[styles.container, { height }]}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '18px',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
});

