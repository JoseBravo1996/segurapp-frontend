/**
 * LocationScreen.js
 * Módulo de Geolocalización y Zonas Seguras de SegurAPP.
 * Permite buscar direcciones reales con autocompletado en Argentina, convertirlas en coordenadas
 * geográficas, definir radios de cobertura en metros y visualizarlas interactivamente en el mapa.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRoute } from '@react-navigation/native';

import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import SafeZoneMap from '../components/SafeZoneMap';
import { searchAddresses, geocodeStructuredAddress } from '../services/geocodingService';
import * as segurappApi from '../services/segurappApi';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';
import { useResponsive, getModalWidth } from '../utils/responsive';
import colors from '../theme/colors';
import { useGuidedOnboarding } from '../context/GuidedOnboardingContext';
import GuidedHighlight from '../components/GuidedHighlight';

export default function LocationScreen() {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive, 0.94);
  const mapHeight = responsive.isDesktop ? 340 : responsive.isTablet ? 290 : 240;

  const route = useRoute();

  // Coordenadas actuales del usuario
  const [userLatitude, setUserLatitude] = useState(route.params?.latitude || -34.7745);
  const [userLongitude, setUserLongitude] = useState(route.params?.longitude || -58.2678);
  const [locationLoading, setLocationLoading] = useState(true);

  // Lista de Zonas Seguras en backend
  const [safeZones, setSafeZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [focusedZone, setFocusedZone] = useState(null);

  // Modal de Creación / Edición
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [savingZone, setSavingZone] = useState(false);

  // Hook del Asistente Guiado
  const { isActive, currentStepData, notifyStepCompleted } = useGuidedOnboarding();

  // Campos del formulario
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Campos desglosados
  const [address, setAddress] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [city, setCity] = useState('Florencio Varela');
  const [state, setState] = useState('Buenos Aires');
  const [additionalReference, setAdditionalReference] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('100');

  // Coordenadas geocodificadas confirmadas
  const [geoLatitude, setGeoLatitude] = useState(null);
  const [geoLongitude, setGeoLongitude] = useState(null);
  const [geoValidated, setGeoValidated] = useState(false);

  // Referencia para debounce de búsqueda
  const searchTimeoutRef = useRef(null);

  // Obtener ubicación GPS actual del dispositivo
  const fetchCurrentLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAppAlert(
          'Permiso de Ubicación',
          'SegurAPP requiere acceso a tu ubicación para centrar el mapa y calcular distancias.'
        );
        setLocationLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLatitude(location.coords.latitude);
      setUserLongitude(location.coords.longitude);
    } catch (err) {
      console.warn('[LocationScreen] Error obteniendo GPS:', err);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Cargar Zonas Seguras desde el backend
  const loadSafeZones = useCallback(async () => {
    setLoadingZones(true);
    try {
      const data = await segurappApi.getSafeZones();
      setSafeZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[LocationScreen] Error cargando zonas seguras:', err);
    } finally {
      setLoadingZones(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
    loadSafeZones();
  }, [fetchCurrentLocation, loadSafeZones]);

  // Manejo de búsqueda en tiempo real con debounce
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      setIsSearchingAddress(false);
      return;
    }

    setIsSearchingAddress(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(text);
        setSuggestions(Array.isArray(results) ? results : []);
      } catch (err) {
        console.warn('[LocationScreen] Error buscando direcciones:', err);
        setSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 250);
  };

  // Seleccionar sugerencia del autocompletado
  const handleSelectSuggestion = (item) => {
    setSearchQuery(item.displayName);
    setSuggestions([]);
    setAddress(item.street || item.displayName.split(',')[0]);
    setStreetNumber(item.streetNumber || '');
    if (item.city) setCity(item.city);
    if (item.state) setState(item.state);
    setGeoLatitude(item.latitude);
    setGeoLongitude(item.longitude);
    setGeoValidated(true);
  };

  // Geocodificar manualmente los campos estructurados
  const handleGeocodeStructured = async () => {
    if (!address.trim()) {
      showAppAlert('Campo requerido', 'Ingresá al menos la calle o dirección.');
      return;
    }

    setIsSearchingAddress(true);
    try {
      const result = await geocodeStructuredAddress({
        street: address.trim(),
        streetNumber: streetNumber.trim(),
        city: city.trim(),
        state: state.trim(),
      });

      if (result) {
        setGeoLatitude(result.latitude);
        setGeoLongitude(result.longitude);
        setGeoValidated(true);
        showAppAlert(
          'Ubicación Encontrada',
          `Coordenadas validadas: (${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)})`
        );
      } else {
        setGeoValidated(false);
        showAppAlert(
          'Dirección no encontrada',
          'No pudimos encontrar las coordenadas para la dirección indicada. Probá seleccionarla desde el buscador con autocompletado.'
        );
      }
    } catch (err) {
      setGeoValidated(false);
      showAppAlert('Error', 'Ocurrió un error al consultar el servicio de geocodificación.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Ajuste manual de posición mediante clic o arrastre en el mapa para máxima precisión
  const handleManualLocationSelect = async (coords) => {
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      return;
    }
    const { latitude, longitude } = coords;
    setGeoLatitude(latitude);
    setGeoLongitude(longitude);
    setGeoValidated(true);

    try {
      const nearest = await getNearestAddress(latitude, longitude);
      if (nearest) {
        const parts = nearest.split(',');
        const main = parts[0]?.trim() || '';
        const cityPart = parts[1]?.trim() || '';
        setAddress(main);
        if (cityPart) setCity(cityPart);
        setSearchQuery(nearest);
      }
    } catch (err) {
      console.warn('[LocationScreen] Error geocodificando punto manual:', err);
    }
  };

  // Abrir modal para crear nueva zona
  const handleOpenCreateModal = () => {
    setEditingZoneId(null);
    let defaultSuggestedName = '';
    if (isActive) {
      if (currentStepData.id === 'zone_home') {
        defaultSuggestedName = 'Casa';
      } else if (currentStepData.id === 'zone_work') {
        defaultSuggestedName = 'Trabajo';
      }
    }
    setName(defaultSuggestedName);
    setSearchQuery('');
    setSuggestions([]);
    setAddress('');
    setStreetNumber('');
    setCity('Florencio Varela');
    setState('Buenos Aires');
    setAdditionalReference('');
    setRadiusMeters('100');
    // Predefinir coordenadas del usuario para orientar la vista previa y permitir selección manual de inmediato
    setGeoLatitude(userLatitude);
    setGeoLongitude(userLongitude);
    setGeoValidated(true);
    setModalVisible(true);
  };

  // Abrir modal para editar zona existente
  const handleOpenEditModal = (zone) => {
    setEditingZoneId(zone.id);
    setName(zone.name);
    setSearchQuery(zone.address);
    setSuggestions([]);
    setAddress(zone.address);
    setStreetNumber(zone.streetNumber || '');
    setCity(zone.city || 'Florencio Varela');
    setState(zone.state || 'Buenos Aires');
    setAdditionalReference(zone.additionalReference || '');
    setRadiusMeters(String(zone.radiusMeters || 100));
    setGeoLatitude(zone.latitude);
    setGeoLongitude(zone.longitude);
    setGeoValidated(true);
    setModalVisible(true);
  };

  // Guardar (Crear o Modificar) Zona Segura
  const handleSaveZone = async () => {
    if (!name.trim()) {
      showAppAlert('Nombre obligatorio', 'Por favor ingresá un nombre para la zona segura.');
      return;
    }

    if (!address.trim()) {
      showAppAlert('Dirección obligatoria', 'Por favor ingresá la dirección o seleccioná una del buscador.');
      return;
    }

    if (!geoValidated || geoLatitude === null || geoLongitude === null) {
      showAppAlert(
        'Coordenadas requeridas',
        'Debés seleccionar una dirección válida del buscador para obtener sus coordenadas geográficas.'
      );
      return;
    }

    const parsedRadius = parseInt(radiusMeters, 10);
    const validRadius = isNaN(parsedRadius) || parsedRadius < 10 ? 100 : parsedRadius;

    const payload = {
      name: name.trim(),
      address: address.trim(),
      streetNumber: streetNumber.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      additionalReference: additionalReference.trim() || null,
      latitude: geoLatitude,
      longitude: geoLongitude,
      radiusMeters: validRadius,
    };

    setSavingZone(true);
    try {
      if (editingZoneId) {
        await segurappApi.updateSafeZone(editingZoneId, payload);
        showAppAlert('Zona Actualizada', 'La zona segura fue modificada correctamente.');
      } else {
        await segurappApi.createSafeZone(payload);
        showAppAlert('Zona Creada', 'La nueva zona segura fue registrada y representada en el mapa.');
      }
      setModalVisible(false);
      await loadSafeZones();
      setFocusedZone({ latitude: geoLatitude, longitude: geoLongitude });

      if (isActive) {
        const lowerName = payload.name.toLowerCase();
        if (currentStepData.id === 'zone_home' || lowerName.includes('casa')) {
          notifyStepCompleted('zone_home');
        } else if (currentStepData.id === 'zone_work' || lowerName.includes('trabajo')) {
          notifyStepCompleted('zone_work');
        }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo guardar la zona segura.';
      showAppAlert('Error al guardar', msg);
    } finally {
      setSavingZone(false);
    }
  };

  // Eliminar Zona Segura con confirmación
  const handleDeleteZone = (zone) => {
    showAppAlert(
      'Eliminar Zona Segura',
      `¿Estás seguro de que deseás eliminar "${zone.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await segurappApi.deleteSafeZone(zone.id);
              await loadSafeZones();
              showAppAlert('Zona Eliminada', `"${zone.name}" fue eliminada del sistema.`);
            } catch (err) {
              showAppAlert('Error', 'No se pudo eliminar la zona segura.');
            }
          },
        },
      ]
    );
  };

  // Compartir coordenadas por WhatsApp
  const shareLocationViaWhatsApp = () => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${userLatitude},${userLongitude}`;
    const message = `🚨 *SegurAPP - Mi Ubicación Actual*\n\nTe comparto mis coordenadas de monitoreo en tiempo real:\n${mapUrl}`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          showAppAlert(
            'WhatsApp no detectado',
            'No se pudo abrir WhatsApp automáticamente. Podés copiar el enlace para compartirlo.'
          );
        }
      })
      .catch((err) => console.error('Error al abrir WhatsApp:', err));
  };

  // Objeto de previsualización para el mini mapa del modal (permite seleccionar manualmente)
  const previewZoneData =
    geoLatitude && geoLongitude
      ? {
          name: name.trim() || 'Nueva Zona',
          latitude: geoLatitude,
          longitude: geoLongitude,
          radiusMeters: parseInt(radiusMeters, 10) || 100,
        }
      : null;

  return (
    <AppLayout currentScreen="Ubicación">
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        {/* BANNER SUPERIOR INFORMATIVO */}
        <View style={styles.topInfoCard}>
          <View style={styles.topInfoIconWrap}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topInfoTitle}>Monitoreo de Zonas Seguras</Text>
            <Text style={styles.topInfoDesc}>
              Las áreas protegidas cuentan con geolocalización real y radio de cobertura en metros.
            </Text>
          </View>
        </View>

        {/* MAPA PRINCIPAL INTERACTIVO CON ZONAS Y USUARIO */}
        <GuidedHighlight targetId="safezone_map_preview" tooltipPosition="bottom">
          <View style={[styles.mapContainer, { height: mapHeight }]}>
            <SafeZoneMap
              userLatitude={userLatitude}
              userLongitude={userLongitude}
              safeZones={safeZones}
              focusedZone={focusedZone}
              height={mapHeight}
              onSelectZone={(zone) => setFocusedZone(zone)}
            />
          </View>
        </GuidedHighlight>

        {/* ACCIONES DE MAPA */}
        <View style={styles.mapQuickActions}>
          <TouchableOpacity
            style={styles.centerBtn}
            onPress={() => setFocusedZone({ latitude: userLatitude, longitude: userLongitude })}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={16} color="#FF5E00" />
            <Text style={styles.centerBtnText}>Mi posición</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={shareLocationViaWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Compartir WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* CABECERA DE SECCIÓN DE ZONAS SEGURAS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Tus Zonas Seguras</Text>
            <View style={styles.zonesCountBadge}>
              <Text style={styles.zonesCountText}>{safeZones.length}</Text>
            </View>
          </View>
          <GuidedHighlight targetId="safezone_add_btn" tooltipPosition="bottom">
            <TouchableOpacity
              onPress={handleOpenCreateModal}
              style={styles.addZoneButton}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addZoneButtonText}>Nueva Zona</Text>
            </TouchableOpacity>
          </GuidedHighlight>
        </View>

        {/* LISTADO DE ZONAS SEGURAS */}
        {loadingZones ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#FF5E00" />
            <Text style={styles.loadingText}>Cargando zonas seguras...</Text>
          </View>
        ) : safeZones.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Sin zonas seguras registradas</Text>
            <Text style={styles.emptyDesc}>
              Registrá tu casa, oficina o lugar frecuente para visualizar su área de cobertura protegida en el mapa.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Registrar mi primera zona</Text>
            </TouchableOpacity>
          </View>
        ) : (
          safeZones.map((zone) => {
            const isFocused =
              focusedZone &&
              focusedZone.latitude === zone.latitude &&
              focusedZone.longitude === zone.longitude;

            const fullAddress = [zone.address, zone.streetNumber, zone.city, zone.state]
              .filter(Boolean)
              .join(', ');

            return (
              <View
                key={zone.id}
                style={[styles.zoneCard, isFocused && styles.zoneCardFocused]}
              >
                <View style={styles.zoneCardIconWrap}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.zoneNameRow}>
                    <Text style={styles.zoneNameText}>{zone.name}</Text>
                    <View style={styles.radiusBadge}>
                      <Text style={styles.radiusBadgeText}>{zone.radiusMeters}m radio</Text>
                    </View>
                  </View>

                  <Text style={styles.zoneAddressText} numberOfLines={2}>
                    📍 {fullAddress || 'Dirección registrada'}
                  </Text>

                  {zone.additionalReference ? (
                    <Text style={styles.zoneRefText} numberOfLines={1}>
                      Ref: {zone.additionalReference}
                    </Text>
                  ) : null}

                  <View style={styles.zoneActionsRow}>
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => setFocusedZone(zone)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={14} color="#0F172A" />
                      <Text style={styles.actionPillText}>Ver en mapa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleOpenEditModal(zone)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={14} color="#0F172A" />
                      <Text style={styles.actionPillText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionPill, styles.actionPillDanger]}
                      onPress={() => handleDeleteZone(zone)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={styles.actionPillTextDanger}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScreenScrollView>

      {/* ======================================================== */}
      {/* MODAL DE CREACIÓN / EDICIÓN CON AUTOCOMPLETADO Y PREVIEW */}
      {/* ======================================================== */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth, maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={editingZoneId ? 'create' : 'add-circle'}
                  size={22}
                  color="#FF5E00"
                />
                <Text style={styles.modalTitle}>
                  {editingZoneId ? 'Editar Zona Segura' : 'Nueva Zona Segura'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollBody}
            >
              {/* 1. Nombre de la Zona */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Nombre de la Zona Segura <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Casa, Trabajo, Universidad UNAJ"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* 2. Buscador de Direcciones con Autocompletado */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Buscar dirección con autocompletado (Argentina){' '}
                  <Text style={styles.requiredMark}>*</Text>
                </Text>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color="#64748B" style={{ marginLeft: 10 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Ej: Av. Calchaquí 6200, Florencio Varela"
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                  />
                  {isSearchingAddress && (
                    <ActivityIndicator size="small" color="#FF5E00" style={{ marginRight: 10 }} />
                  )}
                  {searchQuery.length > 0 && !isSearchingAddress && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                      }}
                      style={{ padding: 6, marginRight: 6 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Lista desplegable de sugerencias */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView
                      style={{ maxHeight: 220 }}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      {suggestions.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="location-outline" size={16} color="#FF5E00" />
                          <Text style={styles.suggestionText} numberOfLines={2}>
                            {item.displayName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 3. Campos detallados de la dirección */}
              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                  <Text style={styles.label}>
                    Calle / Dirección <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Calle o avenida"
                    placeholderTextColor="#94A3B8"
                    value={address}
                    onChangeText={(val) => {
                      setAddress(val);
                      setGeoValidated(false);
                    }}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Altura / Nº</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234"
                    placeholderTextColor="#94A3B8"
                    value={streetNumber}
                    onChangeText={(val) => {
                      setStreetNumber(val);
                      setGeoValidated(false);
                    }}
                  />
                </View>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Localidad / Partido</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Florencio Varela, Quilmes..."
                    placeholderTextColor="#94A3B8"
                    value={city}
                    onChangeText={(val) => {
                      setCity(val);
                      setGeoValidated(false);
                    }}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Provincia</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Buenos Aires"
                    placeholderTextColor="#94A3B8"
                    value={state}
                    onChangeText={(val) => {
                      setState(val);
                      setGeoValidated(false);
                    }}
                  />
                </View>
              </View>

              {/* Botón para geocodificar si editó los campos desglosados */}
              {!geoValidated && (
                <TouchableOpacity
                  style={styles.btnValidateAddress}
                  onPress={handleGeocodeStructured}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate-circle-outline" size={16} color="#0284C7" />
                  <Text style={styles.btnValidateText}>
                    Geolocalizar y validar en mapa
                  </Text>
                </TouchableOpacity>
              )}

              {/* 4. Referencia Adicional */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Referencia Adicional (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Portón verde, Edificio A, Piso 2"
                  placeholderTextColor="#94A3B8"
                  value={additionalReference}
                  onChangeText={setAdditionalReference}
                />
              </View>

              {/* 5. Radio de Cobertura en Metros */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Radio de cobertura <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <Text style={styles.radiusHint}>{radiusMeters} metros</Text>
                </View>

                {/* Botones de radio rápido */}
                <View style={styles.radioPillsRow}>
                  {['50', '100', '200', '500'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.radioPill,
                        radiusMeters === r && styles.radioPillActive,
                      ]}
                      onPress={() => setRadiusMeters(r)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.radioPillText,
                          radiusMeters === r && styles.radioPillTextActive,
                        ]}
                      >
                        {r}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="O ingresá radio personalizado en metros (ej: 150)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={radiusMeters}
                  onChangeText={setRadiusMeters}
                />
                <Text style={styles.helperText}>
                  Los metros representan el radio de cobertura geográfico protegido alrededor de la dirección.
                </Text>
              </View>

              {/* 6. Indicador de Coordenadas y Vista Previa en Mapa */}
              <View style={styles.previewBox}>
                <View style={styles.previewHeader}>
                  <Ionicons
                    name={geoValidated ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={geoValidated ? '#16A34A' : '#D97706'}
                  />
                  <Text
                    style={[
                      styles.previewStatusText,
                      { color: geoValidated ? '#16A34A' : '#D97706' },
                    ]}
                  >
                    {geoValidated
                      ? `Coordenadas validadas: (${geoLatitude.toFixed(5)}, ${geoLongitude.toFixed(5)})`
                      : 'Dirección pendiente de validación geográfica'}
                  </Text>
                </View>

                {previewZoneData && (
                  <View style={styles.miniMapWrapper}>
                    <View style={styles.manualPinToolbar}>
                      <Ionicons name="finger-print-outline" size={15} color="#0284C7" />
                      <Text style={styles.manualPinToolbarText}>
                        <Text style={{ fontWeight: '800', color: '#0369A1' }}>Ajuste manual:</Text> Hacé clic en el mapa o arrastrá el punto azul 🎯 para fijar el punto exacto.
                      </Text>
                    </View>
                    <SafeZoneMap
                      userLatitude={null}
                      userLongitude={null}
                      safeZones={[]}
                      previewZone={previewZoneData}
                      height={200}
                      onLocationChange={handleManualLocationSelect}
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            {/* BOTONES DEL MODAL */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnSave,
                  (!geoValidated || savingZone) && styles.btnSaveDisabled,
                ]}
                onPress={handleSaveZone}
                disabled={!geoValidated || savingZone}
                activeOpacity={0.8}
              >
                {savingZone ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                    <Text style={styles.btnSaveText}>
                      {editingZoneId ? 'Guardar Cambios' : 'Confirmar Zona'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  topInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  topInfoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topInfoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  topInfoDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16,
  },

  mapContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  mapQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    gap: 10,
  },
  centerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  centerBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  zonesCountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  zonesCountText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5E00',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#FF5E00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addZoneButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 320,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5E00',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  zoneCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    alignItems: 'flex-start',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  zoneCardFocused: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  zoneCardIconWrap: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  zoneNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  zoneNameText: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
  },
  radiusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  radiusBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  zoneAddressText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
  zoneRefText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  zoneActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionPillDanger: {
    backgroundColor: '#FEF2F2',
  },
  actionPillTextDanger: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  // ESTILOS DEL MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalScrollBody: {
    paddingBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  rowTwoCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radiusHint: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  requiredMark: {
    color: '#DC2626',
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 180,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 16,
  },
  btnValidateAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
    gap: 6,
  },
  btnValidateText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  radioPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  radioPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  radioPillActive: {
    borderColor: '#10B981',
    backgroundColor: '#DCFCE7',
  },
  radioPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  radioPillTextActive: {
    color: '#059669',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 14,
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  previewStatusText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  miniMapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  manualPinToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  manualPinToolbarText: {
    fontSize: 11.5,
    color: '#0C4A6E',
    flex: 1,
    lineHeight: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnCancelText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
  btnSave: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
  },
  btnSaveDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
