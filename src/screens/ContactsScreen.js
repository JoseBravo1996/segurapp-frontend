import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import AppInput from '../components/AppInput';
import * as segurappApi from '../services/segurappApi';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';
import { useResponsive, getModalWidth } from '../utils/responsive';
import colors from '../theme/colors';
import GuidedHighlight from '../components/GuidedHighlight';

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

export default function ContactsScreen() {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive);
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
    <AppLayout currentScreen="Contactos">
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        <GuidedHighlight targetId="contacts_section" tooltipPosition="bottom">
          <View style={[styles.titleRow, responsive.isSmallPhone && styles.titleRowStack]}>
            <View>
              <Text style={styles.mainTitle}>Contactos de Emergencia</Text>
              <Text style={styles.mainSubtitle}>{contacts.length} personas recibirán tus alertas</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNew} activeOpacity={0.8}>
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Agregar Contacto</Text>
            </TouchableOpacity>
          </View>
        </GuidedHighlight>

        {loading ? (
          <ActivityIndicator size="large" color={colors.brand.dark} style={{ marginTop: 40 }} />
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
                  <Ionicons name="call" size={12} color={colors.neutral.textMuted} />
                  <Text style={styles.contactDetail}>{item.telefono}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconAction}>
                  <Ionicons name="pencil" size={18} color={colors.brand.dark} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconAction}>
                  <Ionicons name="trash-outline" size={18} color={colors.emergency.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.neutral.textLight} />
            <Text style={styles.emptyTitle}>Sin contactos configurados</Text>
            <Text style={styles.emptySubtitle}>
              Agregá personas de tu confianza para que reciban tu ubicación GPS automáticamente en caso de emergencia.
            </Text>
          </View>
        )}
      </ScreenScrollView>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar Contacto' : 'Registrar Contacto'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.brand.dark} />
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
                placeholder="+54 9 11 0000-0000"
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
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  titleRowStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  mainTitle: { fontSize: 22, fontWeight: '900', color: colors.brand.dark },
  mainSubtitle: { fontSize: 13, color: colors.neutral.textMuted, marginTop: 2 },
  addButton: {
    backgroundColor: colors.brand.dark,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 8, fontSize: 13 },
  emptyCard: {
    backgroundColor: colors.neutral.white,
    padding: 36,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginTop: 20,
  },
  emptyTitle: { fontWeight: '800', fontSize: 16, color: colors.brand.dark, marginTop: 12, marginBottom: 6 },
  emptySubtitle: { color: colors.neutral.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 20, maxWidth: 320 },
  contactCard: {
    backgroundColor: colors.neutral.white,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.brand.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: colors.brand.accent, fontWeight: '800', fontSize: 16 },
  contactName: { fontWeight: '800', fontSize: 15, color: colors.brand.dark },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  contactDetail: { fontSize: 13, color: colors.neutral.textMuted, marginLeft: 6 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconAction: { padding: 8, borderRadius: 8, backgroundColor: colors.neutral.background },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: colors.brand.dark },
  closeBtn: { padding: 4 },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  btnCancel: {
    padding: 14,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.borderStrong,
  },
  btnCancelText: { color: colors.neutral.textMuted, fontWeight: '700', fontSize: 14 },
  btnSave: {
    backgroundColor: colors.brand.dark,
    padding: 14,
    flex: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
