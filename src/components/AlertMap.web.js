/**
 * AlertMap.web.js
 * Mapa interactivo general con OpenStreetMap + Leaflet para entorno Web.
 * Resuelve el renderizado interactivo, zoom, popup y prevención de iconos rotos.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import L from 'leaflet';
import colors from '../theme/colors';

// Inyección segura del CSS de Leaflet
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

// Generador de iconos SVG vectoriales sin dependencias de archivos estáticos
function createSvgMarkerIcon({ color, label, isSilent }) {
  const svgContent = `
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${color};
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <span style="font-size: 16px;">${isSilent ? '🔇' : label === 'resolved' ? '✓' : '🚨'}</span>
    </div>
  `;

  return L.divIcon({
    className: 'segurapp-custom-marker',
    html: svgContent,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function formatDate(timestamp) {
  if (!timestamp) return 'Fecha desconocida';
  const d = new Date(timestamp);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AlertMap({ alerts = [], height = 380, onSelectAlert }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const validAlerts = alerts.filter(
    (a) =>
      typeof a.userLat === 'number' &&
      typeof a.userLng === 'number' &&
      !isNaN(a.userLat) &&
      !isNaN(a.userLng) &&
      a.userLat !== 0 &&
      a.userLng !== 0
  );

  useEffect(() => {
    ensureLeafletCss();

    if (!mapContainerRef.current) return;

    // Si ya existe instancia previa, destruirla limpiamente
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultLat = validAlerts[0]?.userLat ?? -34.6037;
    const defaultLng = validAlerts[0]?.userLng ?? -58.3816;
    const initialZoom = validAlerts.length > 0 ? 14 : 12;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: initialZoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // Capa de OpenStreetMap estándar
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (validAlerts.length > 0) {
      const markers = [];

      validAlerts.forEach((alert) => {
        const markerColor = alert.isResolved
          ? colors.status.success
          : alert.isSilent
          ? colors.status.silent
          : colors.emergency.primary;

        const icon = createSvgMarkerIcon({
          color: markerColor,
          label: alert.isResolved ? 'resolved' : 'active',
          isSilent: alert.isSilent,
        });

        const marker = L.marker([alert.userLat, alert.userLng], { icon }).addTo(map);

        const statusLabel = alert.isResolved
          ? '<span style="color:#16A34A;font-weight:700;">✓ Resuelta (A salvo)</span>'
          : alert.isSilent
          ? '<span style="color:#475569;font-weight:700;">🔇 Alerta Silenciosa Activa</span>'
          : '<span style="color:#DC2626;font-weight:700;">🚨 Emergencia Activa</span>';

        const popupContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-size: 13px; margin-bottom: 6px;">${statusLabel}</div>
            <div style="font-weight: 800; font-size: 15px; color: #0F172A; margin-bottom: 4px;">
              Palabra: "${alert.word || 'Emergencia'}"
            </div>
            <div style="font-size: 12px; color: #64748B; margin-bottom: 4px;">
              🕒 ${formatDate(alert.timestamp)}
            </div>
            ${
              alert.contactName
                ? `<div style="font-size: 12px; color: #0F172A; margin-bottom: 6px;">
                     👤 Contacto: <strong>${alert.contactName}</strong> ${alert.contactPhone ? `(${alert.contactPhone})` : ''}
                   </div>`
                : ''
            }
            <div style="font-size: 11px; color: #94A3B8; margin-bottom: 8px;">
              Lat: ${alert.userLat.toFixed(5)}, Lng: ${alert.userLng.toFixed(5)}
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=${alert.userLat},${alert.userLng}"
               target="_blank"
               rel="noopener noreferrer"
               style="display: inline-block; background: #0F172A; color: #FFF; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: 700;">
              Abrir en Google Maps ↗
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onSelectAlert) {
          marker.on('click', () => onSelectAlert(alert));
        }

        markers.push(marker);
      });

      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    }

    // Asegurar redibujado de Leaflet tras montaje de contenedor
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [validAlerts.length]);

  if (validAlerts.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyTitle}>📍 Sin alertas con coordenadas</Text>
        <Text style={styles.emptySubtitle}>
          Cuando se activen alertas con GPS, sus marcadores aparecerán aquí en tiempo real.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.mapWrapper, { height }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  emptyContainer: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
  },
});
