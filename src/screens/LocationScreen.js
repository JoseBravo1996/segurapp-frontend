import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import MapPreview from '../components/MapPreview';
import { useRoute } from '@react-navigation/native';
import { showAppAlert } from '../utils/showAppAlert';
import { useResponsive, getModalWidth } from '../utils/responsive';

export default function LocationScreen() {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive, 0.85);
  const mapHeight = responsive.isDesktop ? 320 : responsive.isTablet ? 280 : 220;
  // Coordenadas actuales del usuario
  //const [userLocation] = useState({ latitude: -34.7634, longitude: -58.2302 });
  
  const route = useRoute();

  const latitude = route.params?.latitude || -34.7634;
  const longitude = route.params?.longitude || -58.2302;
  const keyword = route.params?.keyword || "SIN_DATO";

  const [modalVisible, setModalVisible] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newRadius, setNewRadius] = useState('100');

  const [safeZones, setSafeZones] = useState([
    { id: 1, name: 'Casa (Principal)', detail: 'Radio: 100m • Notificaciones: ON', icon: 'home' },
    { id: 2, name: 'Trabajo (Oficina)', detail: 'Radio: 200m • Notificaciones: ON', icon: 'briefcase' },
  ]);

  // --- FUNCIÓN PARA COMPARTIR EN WHATSAPP ---
  const shareLocationViaWhatsApp = () => {
    // Creamos el enlace de Google Maps con las coordenadas
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const message = `🚨 *SegurAPP - Alerta de Ubicación*\n\nHola, te comparto mi ubicación actual: ${mapUrl}`;
    
    // URL Scheme para WhatsApp
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          showAppAlert(
            'WhatsApp no detectado',
            'No pudimos abrir WhatsApp. Por favor, asegurate de tener la aplicación instalada.'
          );
        }
      })
      .catch((err) => console.error("Error al abrir WhatsApp", err));
  };

  const saveNewZone = () => {
    if (newName.trim() === '') return;
    const newZone = {
      id: Date.now(),
      name: newName,
      detail: `Radio: ${newRadius}m • Notificaciones: ON`,
      icon: 'shield-checkmark',
    };
    setSafeZones([...safeZones, newZone]);
    setNewName('');
    setNewRadius('100');
    setModalVisible(false);
  };

  return (
    <AppLayout currentScreen="Ubicación">
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.mapWrapper, { height: mapHeight }]}>
          <MapPreview 
            latitude={latitude} 
            longitude={longitude} 
            title="Tu ubicación" 
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Zonas Seguras</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Ionicons name="add-circle" size={20} color="#FF5E00" />
            <Text style={styles.addText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {safeZones.map((zone) => (
          <View key={zone.id} style={styles.zoneItem}>
            <View style={styles.zoneIconContainer}>
              <Ionicons name={zone.icon} size={22} color="#FF5E00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneDetail}>{zone.detail}</Text>
            </View>
            <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => setSafeZones(safeZones.filter(z => z.id !== zone.id))}
            >
              <Ionicons name="trash" size={18} color="rgba(5, 10, 24, 0.4)" />
            </TouchableOpacity>
          </View>
        ))}

        {/* BOTÓN PARA COMPARTIR EN WHATSAPP */}
        <TouchableOpacity 
          style={styles.shareContainer} 
          activeOpacity={0.8}
          onPress={shareLocationViaWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={22} color="white" />
          <Text style={styles.shareText}>Compartir ubicación vía WhatsApp</Text>
        </TouchableOpacity>

      </ScreenScrollView>

      {/* MODAL DE NUEVA ZONA */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <Text style={styles.modalTitle}>Nueva Zona Segura</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de la zona</Text>
                <TextInput 
                style={styles.input} 
                placeholder="Ej: Gimnasio" 
                placeholderTextColor="#94A3B8"
                value={newName}
                onChangeText={setNewName}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Radio de cobertura (metros)</Text>
                <TextInput 
                style={styles.input} 
                placeholder="100" 
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={newRadius}
                onChangeText={setNewRadius}
                />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={saveNewZone}>
                <Text style={styles.btnSaveText}>Guardar Zona</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    width: '100%',
    borderRadius: 22, 
    overflow: 'hidden', 
    marginBottom: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 94, 0, 0.3)', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20 
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#050A18' },
  addButton: { flexDirection: 'row', alignItems: 'center' },
  addText: { color: '#FF5E00', fontWeight: '700', marginLeft: 5, fontSize: 15 },
  
  zoneItem: { 
    flexDirection: 'row', 
    backgroundColor: '#F8FAFC', 
    padding: 16, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  
  zoneIconContainer: { 
    padding: 12, 
    borderRadius: 15, 
    backgroundColor: 'rgba(255, 94, 0, 0.1)', 
    marginRight: 15 
  },
  zoneName: { fontWeight: '700', fontSize: 16, color: '#050A18' },
  zoneDetail: { fontSize: 12, color: '#64748B', marginTop: 2 },
  deleteBtn: { padding: 8 },

  shareContainer: { 
    backgroundColor: '#25D366', // Color verde oficial de WhatsApp
    flexDirection: 'row', 
    padding: 18, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 15,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  shareText: { color: 'white', fontWeight: '800', marginLeft: 12, fontSize: 15 },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(5, 10, 24, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 25,
    elevation: 20,
    maxWidth: 480,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#050A18', 
    marginBottom: 25, 
    textAlign: 'center' 
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, marginLeft: 5 },
  input: { 
    backgroundColor: '#F1F5F9', 
    borderRadius: 15, 
    padding: 15, 
    fontSize: 16, 
    color: '#050A18',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10 
  },
  btnCancel: { padding: 15, flex: 1, alignItems: 'center' },
  btnCancelText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
  btnSave: { 
    backgroundColor: '#050A18', 
    padding: 15, 
    flex: 1.5, 
    borderRadius: 15, 
    alignItems: 'center',
    shadowColor: '#050A18',
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  btnSaveText: { color: 'white', fontWeight: '800', fontSize: 15 }
});