import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import AlertMapPanel from '../components/AlertMapPanel';
import AlertMap from '../components/AlertMap';
import * as segurappApi from '../services/segurappApi';
import { triggerAlertWithLocation, markSafeAndNotify } from '../utils/alertHelper';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';
import { useResponsive, getModalWidth } from '../utils/responsive';
import colors from '../theme/colors';
import useRealtimeAlerts from '../hooks/useRealtimeAlerts';

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive, 0.92);
  const modalHeight = responsive.isDesktop ? 560 : responsive.isTablet ? 520 : 480;

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'resolved' | 'silent'

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await segurappApi.getAlertHistory();
      if (Array.isArray(data)) {
        setAlertHistory(
          data.map((a) => ({
            id: a.id,
            word: a.word,
            isResolved: Boolean(a.isResolved),
            isSilent: Boolean(a.isSilent),
            timestamp: a.timestamp,
            dateFormatted: formatDate(a.timestamp),
            contactName: a.contactName || 'No especificado',
            contactPhone: a.contactPhone || '',
            userLat: Number(a.userLat) || 0,
            userLng: Number(a.userLng) || 0,
            coords: { latitude: Number(a.userLat) || 0, longitude: Number(a.userLng) || 0 },
          }))
        );
      }
    } catch (error) {
      console.log('Error cargando historial de alertas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // Actualización en tiempo real del historial y marcadores del mapa
  useRealtimeAlerts({
    onNewAlert: useCallback(() => {
      loadHistory();
    }, [loadHistory]),
    onAlertResolved: useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  });

  const openAlertDetail = (alertItem) => {
    setSelectedAlert(alertItem);
    setModalVisible(true);
  };

  const handleResolveAlert = async () => {
    if (!selectedAlert?.id) return;
    try {
      await markSafeAndNotify({ alertId: selectedAlert.id });
      showAppAlert('✓ Alerta Resuelta', 'Se notificó a tus contactos que te encontrás a salvo.');
      setModalVisible(false);
      await loadHistory();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo resolver la alerta.';
      showAppAlert('Error', message);
    }
  };

  const handleResendAlert = async () => {
    if (!selectedAlert?.word) return;
    try {
      await triggerAlertWithLocation(selectedAlert.word, selectedAlert.isSilent);
      showAppAlert('Alerta Disparada', 'Se registró un nuevo evento y se transmitió tu ubicación actual.');
      setModalVisible(false);
      await loadHistory();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo reenviar la alerta.';
      showAppAlert('Error', message);
    }
  };

  // Filtrado reactivo
  const filteredAlerts = useMemo(() => {
    return alertHistory.filter((item) => {
      // Filtro de estado
      if (statusFilter === 'active' && item.isResolved) return false;
      if (statusFilter === 'resolved' && !item.isResolved) return false;
      if (statusFilter === 'silent' && !item.isSilent) return false;

      // Filtro de texto
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesWord = item.word?.toLowerCase().includes(query);
        const matchesContact = item.contactName?.toLowerCase().includes(query);
        if (!matchesWord && !matchesContact) return false;
      }

      return true;
    });
  }, [alertHistory, statusFilter, searchQuery]);

  // Contadores
  const stats = useMemo(() => {
    const total = alertHistory.length;
    const active = alertHistory.filter((a) => !a.isResolved).length;
    const resolved = alertHistory.filter((a) => a.isResolved).length;
    const silent = alertHistory.filter((a) => a.isSilent).length;
    return { total, active, resolved, silent };
  }, [alertHistory]);

  return (
    <AppLayout currentScreen="Historial" backgroundColor={colors.neutral.background}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <Text style={styles.title}>Historial y Monitoreo Geográfico</Text>
          <Text style={styles.subtitle}>
            Seguimiento de eventos de emergencia y visualización interactiva de coordenadas.
          </Text>
        </View>

        {/* MÉTRICAS DEL HISTORIAL */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statBox, statusFilter === 'all' && styles.statBoxActive]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, statusFilter === 'active' && styles.statBoxActiveEmergency]}
            onPress={() => setStatusFilter('active')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNumber, { color: colors.emergency.primary }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Activas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, statusFilter === 'resolved' && styles.statBoxActiveSuccess]}
            onPress={() => setStatusFilter('resolved')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNumber, { color: colors.status.success }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resueltas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, statusFilter === 'silent' && styles.statBoxActiveSilent]}
            onPress={() => setStatusFilter('silent')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNumber, { color: colors.status.silent }]}>{stats.silent}</Text>
            <Text style={styles.statLabel}>Silenciosas</Text>
          </TouchableOpacity>
        </View>

        {/* BUSCADOR Y TOGGLE LISTA / MAPA */}
        <View style={styles.controlsRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.neutral.textMuted} />
            <TextInput
              placeholder="Buscar por palabra clave o contacto..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor={colors.neutral.textLight}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.neutral.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === 'list' ? colors.brand.dark : colors.neutral.textLight}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="map"
                size={18}
                color={viewMode === 'map' ? colors.brand.dark : colors.neutral.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={{ marginVertical: 30, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.brand.dark} />
            <Text style={{ marginTop: 8, color: colors.neutral.textMuted, fontSize: 13 }}>
              Cargando historial de alertas...
            </Text>
          </View>
        )}

        {/* VISTA MAPA GENERAL INTERACTIVO */}
        {viewMode === 'map' && !loading && (
          <View style={styles.mapViewContainer}>
            <Text style={styles.mapSectionTitle}>Mapa Interactivo de Emergencias</Text>
            <AlertMap
              alerts={filteredAlerts}
              height={responsive.isDesktop ? 460 : 380}
              onSelectAlert={openAlertDetail}
            />
          </View>
        )}

        {/* VISTA LISTA DE TARJETAS MODERNAS */}
        {viewMode === 'list' && !loading && (
          <View style={styles.cardsContainer}>
            {filteredAlerts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark" size={44} color={colors.neutral.textLight} />
                <Text style={styles.emptyTitle}>No hay alertas registradas</Text>
                <Text style={styles.emptySubtitle}>
                  {statusFilter !== 'all' || searchQuery !== ''
                    ? 'No se encontraron resultados para los filtros seleccionados.'
                    : 'Cuando se disparen alertas de pánico aparecerán aquí en orden cronológico.'}
                </Text>
              </View>
            ) : (
              filteredAlerts.map((item) => {
                const isEmergency = !item.isResolved && !item.isSilent;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.alertCard,
                      isEmergency && styles.alertCardEmergency,
                      item.isSilent && !item.isResolved && styles.alertCardSilent,
                    ]}
                    onPress={() => openAlertDetail(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.titleGroup}>
                        <View
                          style={[
                            styles.cardIconCircle,
                            {
                              backgroundColor: item.isResolved
                                ? colors.status.successLight
                                : item.isSilent
                                ? colors.status.silentLight
                                : colors.emergency.light,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              item.isResolved
                                ? 'checkmark-circle'
                                : item.isSilent
                                ? 'volume-mute'
                                : 'alert-circle'
                            }
                            size={20}
                            color={
                              item.isResolved
                                ? colors.status.success
                                : item.isSilent
                                ? colors.status.silent
                                : colors.emergency.primary
                            }
                          />
                        </View>
                        <View>
                          <Text style={styles.cardWordTitle}>Palabra: "{item.word}"</Text>
                          <Text style={styles.cardDateText}>{item.dateFormatted}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.badgeStatus,
                          {
                            backgroundColor: item.isResolved
                              ? colors.status.successLight
                              : item.isSilent
                              ? colors.status.silentLight
                              : colors.emergency.light,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeStatusText,
                            {
                              color: item.isResolved
                                ? colors.status.success
                                : item.isSilent
                                ? colors.status.silent
                                : colors.emergency.primary,
                            },
                          ]}
                        >
                          {item.isResolved ? '✓ Resuelta' : item.isSilent ? '🔇 Silenciosa' : '🚨 Activa'}
                        </Text>
                      </View>
                    </View>

                    {/* Fila de Ubicación */}
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={15} color={colors.neutral.textMuted} />
                      <Text style={styles.locationText}>
                        Lat: {item.userLat.toFixed(5)}, Lng: {item.userLng.toFixed(5)}
                      </Text>
                    </View>

                    {/* Fila de Contacto */}
                    <View style={styles.contactRow}>
                      <Ionicons name="person" size={15} color={colors.neutral.textMuted} />
                      <Text style={styles.contactText}>
                        Contacto asignado: <Text style={{ fontWeight: '700' }}>{item.contactName}</Text>{' '}
                        {item.contactPhone ? `(${item.contactPhone})` : ''}
                      </Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardActionHint}>Tocar para inspeccionar en el mapa ↗</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* MODAL DETALLADO CON MAPA INTERACTIVO */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { width: modalWidth, maxWidth: 680, height: modalHeight }]}>
              {/* Header Modal */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalMainTitle}>Detalle Geográfico de la Alerta</Text>
                  <Text style={styles.modalSubTitle}>
                    {selectedAlert ? `Palabra: "${selectedAlert.word}" · ${selectedAlert.dateFormatted}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={28} color={colors.neutral.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedAlert && (
                <View style={{ flex: 1, paddingBottom: 10 }}>
                  {/* Mapa individual interactivo */}
                  <View style={styles.modalMapWrapper}>
                    <AlertMapPanel
                      coords={selectedAlert.coords}
                      title={`Alerta: "${selectedAlert.word}"`}
                    />
                  </View>

                  {/* Acciones del evento */}
                  <View style={styles.modalActionsSection}>
                    {!selectedAlert.isResolved && (
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnSafe]}
                        onPress={handleResolveAlert}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                        <Text style={styles.modalBtnText}>Marcar Alerta como Resuelta</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnResend]}
                      onPress={handleResendAlert}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="repeat" size={18} color="#FFFFFF" />
                      <Text style={styles.modalBtnText}>Reenviar Ubicación Actual</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScreenScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.brand.dark,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statBoxActive: {
    borderColor: colors.brand.dark,
    backgroundColor: '#F1F5F9',
  },
  statBoxActiveEmergency: {
    borderColor: colors.emergency.primary,
    backgroundColor: colors.emergency.light,
  },
  statBoxActiveSuccess: {
    borderColor: colors.status.success,
    backgroundColor: colors.status.successLight,
  },
  statBoxActiveSilent: {
    borderColor: colors.status.silent,
    backgroundColor: colors.status.silentLight,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.brand.dark,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
    color: colors.brand.dark,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  toggleBtnActive: {
    backgroundColor: '#E2E8F0',
  },
  mapViewContainer: {
    marginBottom: 20,
  },
  mapSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand.dark,
    marginBottom: 10,
  },
  cardsContainer: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
    elevation: 2,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  alertCardEmergency: {
    borderColor: 'rgba(220, 38, 38, 0.4)',
    borderLeftWidth: 5,
    borderLeftColor: colors.emergency.primary,
  },
  alertCardSilent: {
    borderColor: 'rgba(100, 116, 139, 0.4)',
    borderLeftWidth: 5,
    borderLeftColor: colors.status.silent,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardWordTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand.dark,
  },
  cardDateText: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    marginTop: 1,
  },
  badgeStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.neutral.textDark,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 12,
    color: colors.neutral.textMuted,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    paddingTop: 8,
    marginTop: 4,
  },
  cardActionHint: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.accent,
  },
  emptyState: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.dark,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: colors.neutral.white,
    borderRadius: 22,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.dark,
  },
  modalSubTitle: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    marginTop: 1,
  },
  modalMapWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  modalActionsSection: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  modalBtnSafe: {
    backgroundColor: colors.status.success,
  },
  modalBtnResend: {
    backgroundColor: colors.brand.dark,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
