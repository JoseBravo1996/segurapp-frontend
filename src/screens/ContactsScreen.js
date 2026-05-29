import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import CustomHeader from '../components/CustomHeader';
import LocationStatus from '../components/LocationStatus';
import MainTabNavigator from '../components/MainTabNavigator';
import AppInput from '../components/AppInput';
import * as segurappApi from '../services/segurappApi';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';

const { width } = Dimensions.get('window');

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await segurappApi.getContacts();
      setContacts(
        data.map((c) => {
          const { nombre: n, apellido: a } = splitName(c.name);
          return {
            id: c.id,
            nombre: n,
            apellido: a,
            telefono: c.phone,
            lat: c.lat,
            lng: c.lng,
          };
        })
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudieron cargar los contactos.';
      showAppAlert('Error', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const handleAddNew = () => {
    setEditingId(null);
    setNombre('');
    setApellido('');
    setTelefono('');
    setModalVisible(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setNombre(item.nombre);
    setApellido(item.apellido);
    setTelefono(item.telefono);
    setModalVisible(true);
  };

  const handleDelete = async (item) => {
    try {
      await segurappApi.deleteContact(item.id);
      await loadContacts();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo eliminar el contacto.';
      showAppAlert('Error', message);
    }
  };

  const saveContact = async () => {
    if (!nombre.trim() || !telefono.trim()) {
      showAppAlert('Campos incompletos', 'Nombre y teléfono son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      let lat = -34.6037;
      let lng = -58.3816;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      const name = `${nombre.trim()} ${apellido.trim()}`.trim();
      const payload = { name, phone: telefono.trim(), lat, lng };

      if (editingId) {
        const existing = contacts.find((c) => c.id === editingId);
        await segurappApi.updateContact(editingId, {
          ...payload,
          lat: existing?.lat ?? lat,
          lng: existing?.lng ?? lng,
        });
      } else {
        await segurappApi.createContact(payload);
      }

      setModalVisible(false);
      setEditingId(null);
      await loadContacts();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo guardar el contacto.';
      showAppAlert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />
      <LocationStatus />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.mainTitle}>Contactos de Red</Text>
            <Text style={styles.mainSubtitle}>{contacts.length} personas vinculadas</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <Ionicons name="person-add" size={18} color="white" />
            <Text style={styles.addButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FF5E00" style={{ marginTop: 40 }} />
        ) : contacts.length > 0 ? (
          contacts.map((item) => (
            <View key={item.id} style={styles.contactCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.nombre[0]}
                  {item.apellido?.[0] || ''}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>
                  {item.nombre} {item.apellido}
                </Text>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={12} color="#64748B" />
                  <Text style={styles.contactDetail}>{item.telefono}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconAction}>
                  <Ionicons name="create-outline" size={20} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconAction}>
                  <Ionicons name="trash-outline" size={20} color="#D00000" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={50} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Sin contactos</Text>
            <Text style={styles.emptySubtitle}>
              Agregá personas de confianza para enviarles alertas automáticas.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar contacto' : 'Registrar contacto'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#050A18" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppInput
                label="Nombre"
                iconName="person-outline"
                placeholder="Ej: María"
                value={nombre}
                onChangeText={setNombre}
              />
              <AppInput
                label="Apellido"
                iconName="person-outline"
                placeholder="Ej: Gómez"
                value={apellido}
                onChangeText={setApellido}
              />
              <AppInput
                label="Teléfono"
                iconName="call-outline"
                placeholder="+54 11 0000-0000"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={saveContact} disabled={saving}>
                  <Text style={styles.btnSaveText}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MainTabNavigator currentScreen="Contactos" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  mainTitle: { fontSize: 22, fontWeight: '800', color: '#050A18' },
  mainSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  addButton: {
    backgroundColor: '#FF5E00',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF5E00',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  addButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    padding: 50,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: { fontWeight: '800', fontSize: 16, color: '#050A18', marginTop: 15, marginBottom: 8 },
  emptySubtitle: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  contactCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 94, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { color: '#FF5E00', fontWeight: '800', fontSize: 18 },
  contactName: { fontWeight: '700', fontSize: 17, color: '#050A18', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  contactDetail: { fontSize: 13, color: '#64748B', marginLeft: 6 },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { padding: 8, marginLeft: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 24, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: width * 0.9,
    borderRadius: 30,
    padding: 25,
    maxHeight: '85%',
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#050A18' },
  closeBtn: { padding: 5 },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: 10,
  },
  btnCancel: { padding: 15, flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
  btnSave: {
    backgroundColor: '#050A18',
    padding: 15,
    flex: 1.5,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  btnSaveText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
