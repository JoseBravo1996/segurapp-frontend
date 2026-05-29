import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import AlertMapPanel from '../components/AlertMapPanel';
import * as segurappApi from '../services/segurappApi';
import { triggerAlertWithLocation, markSafeAndNotify } from '../utils/alertHelper';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';
import { useResponsive, getModalWidth } from '../utils/responsive';

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive, 0.92);
  const modalHeight = responsive.isDesktop ? '70%' : responsive.isTablet ? '72%' : '78%';
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await segurappApi.getAlertHistory();
      setAlertHistory(
        data.map((a) => ({
          id: a.id,
          type: a.word,
          status: a.isResolved ? 'Resuelta' : 'Activa',
          isResolved: a.isResolved,
          date: formatDate(a.timestamp),
          address: `Lat: ${a.userLat.toFixed(4)}, Lng: ${a.userLng.toFixed(4)}`,
          note: `Contacto: ${a.contactName} (${a.contactPhone})`,
          category: 'peligro',
          word: a.word,
          coords: { latitude: a.userLat, longitude: a.userLng },
        }))
      );
    } catch (error) {
      console.log('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const openMap = (item) => {
    setSelectedLocation(item);
    setModalVisible(true);
  };

  // Funciones para las nuevas acciones
  const handleFinalize = async () => {
    if (!selectedLocation?.id) return;
    try {
      await markSafeAndNotify({ alertId: selectedLocation.id });
      showAppAlert('Estás a salvo', 'La alerta fue marcada como resuelta. Si se abrió WhatsApp, avisale a tu contacto.');
      setModalVisible(false);
      await loadHistory();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo cerrar la alerta.';
      showAppAlert('Error', message);
    }
  };

  const handleResend = async () => {
    if (!selectedLocation?.word) return;
    try {
      await triggerAlertWithLocation(selectedLocation.word);
      showAppAlert('Alerta reenviada', 'Se registró un nuevo evento en el historial.');
      setModalVisible(false);
      await loadHistory();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo reenviar la alerta.';
      showAppAlert('Error', message);
    }
  };

  return (
    <AppLayout currentScreen="Historial" backgroundColor="#F8F9FA">
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Historial de alertas</Text>
        <Text style={styles.mainSubtitle}>Gestión de eventos de peligro y ayuda</Text>

        {/* --- PANEL DE ESTADÍSTICAS --- */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#F8F9FA' }]}>
            <Text style={styles.statNumber}>{alertHistory.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {loading && <ActivityIndicator size="large" color="#FF5E00" style={{ marginVertical: 20 }} />}

        {/* --- BUSCADOR --- */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput placeholder="Buscar eventos..." style={styles.searchInput} />
          </View>
        </View>

        {/* --- LISTA DE ALERTAS --- */}
        {alertHistory.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.alertCard} 
            onPress={() => openMap(item)}
          >
            <View style={styles.alertHeader}>
              <View style={styles.alertTitleRow}>
                <View style={[
                  styles.alertIconCircle, 
                  { backgroundColor: item.category === 'peligro' ? '#FFF5F5' : '#FFFBEB' }
                ]}>
                  <Ionicons 
                    name={item.category === 'peligro' ? "alert-circle" : "help-buoy"} 
                    size={20} 
                    color={item.category === 'peligro' ? "#D00000" : "#F59E00"} 
                  />
                </View>
                <Text style={styles.alertTitle}>Palabra: {item.type}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.alertDate}>{item.date}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color="#999" />
              <Text style={styles.addressText}>{item.address}</Text>
            </View>
            <View style={[
              styles.noteBox, 
              { borderLeftColor: item.category === 'peligro' ? "#D00000" : "#F59E00", borderLeftWidth: 3 }
            ]}>
              <Text style={styles.noteText}>{item.note}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScreenScrollView>

      {/* --- MODAL TRASLÚCIDO CON MAPA Y ACCIONES --- */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth, maxWidth: 720, height: modalHeight }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gestión del Evento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedLocation && (
              <View style={{ flex: 1 }}>
                <View style={styles.mapContainer}>
                  <AlertMapPanel coords={selectedLocation.coords} style={styles.map} />
                </View>

                {/* --- NUEVA SECCIÓN DE ACCIONES --- */}
                <View style={styles.actionSection}>
                  <Text style={styles.actionTitle}>Acciones rápidas:</Text>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.btnSafe]} 
                    onPress={handleFinalize}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                    <Text style={styles.btnText}>Finalizar: Estoy Bien</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnResend, { backgroundColor: '#FF5E00' }]}
                    onPress={handleResend}
                  >
                    <Ionicons name="refresh-outline" size={18} color="white" />
                    <Text style={styles.btnText}>Reenviar alerta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  mainSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { width: '23%', padding: 10, borderRadius: 12, alignItems: 'center', elevation: 1 },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: 'white', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  searchInput: { marginLeft: 10, flex: 1 },
  alertCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center' },
  alertIconCircle: { padding: 6, borderRadius: 20, marginRight: 10 },
  alertTitle: { fontSize: 13, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#F8F9FA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  alertDate: { fontSize: 12, color: '#999', marginLeft: 36, marginBottom: 10 },
  addressRow: { flexDirection: 'row', marginLeft: 36, alignItems: 'center', marginBottom: 15 },
  addressText: { fontSize: 12, color: '#777', marginLeft: 5 },
  noteBox: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, marginLeft: 36 },
  noteText: { fontSize: 12, color: '#444' },

  // Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 25, padding: 20, overflow: 'hidden', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#050A18' },
  mapContainer: { flex: 1, borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  map: { flex: 1 },
  
  // Estilos de Acciones en Modal
  actionSection: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
  actionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginBottom: 10 },
  btnSafe: { backgroundColor: '#27AE60' },
  btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
  rowButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnResend: { flex: 0.48 }
});