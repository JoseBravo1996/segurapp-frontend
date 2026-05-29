import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppLayout from '../components/AppLayout';
import ScreenScrollView from '../components/ScreenScrollView';
import InfoBox from '../components/InfoBox';
import WordItem from '../components/WordItem';
import { useResponsive, getModalWidth } from '../utils/responsive';

import { useWords } from '../context/WordsContext';
import * as segurappApi from '../services/segurappApi';
import { ApiError } from '../services/apiClient';
import { showAppAlert } from '../utils/showAppAlert';

const MAX_KEYWORDS = 3;

export default function WordsScreen({ navigation }) {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive);
  const { words, addWord, updateWord, removeWord } = useWords();
  const [globalShow, setGlobalShow] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [noContactsModalVisible, setNoContactsModalVisible] = useState(false);
  const [editingWordId, setEditingWordId] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);

  const loadContacts = useCallback(async () => {
    try {
      const data = await segurappApi.getContacts();
      setContacts(data);
      setSelectedContactId((prev) => prev ?? data[0]?.id ?? null);
    } catch (error) {
      console.log('Error cargando contactos:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const handleAddWord = () => {
    if (words.length >= MAX_KEYWORDS) {
      showAppAlert('Límite alcanzado', `Solo podés configurar un máximo de ${MAX_KEYWORDS} palabras clave.`);
      return;
    }
    if (contacts.length === 0) {
      setNoContactsModalVisible(true);
      return;
    }
    setEditingWordId(null);
    setNewWord('');
    setSelectedContactId(contacts[0]?.id ?? null);
    setModalVisible(true);
  };

  const handleEditWord = (item) => {
    setEditingWordId(item.id);
    setNewWord(item.word);
    setSelectedContactId(item.contactId);
    setModalVisible(true);
  };

  const saveWord = async () => {
    if (!newWord.trim()) {
      showAppAlert('Error', 'Debés ingresar una palabra clave.');
      return;
    }
    if (!selectedContactId) {
      showAppAlert('Error', 'Seleccioná un contacto de emergencia.');
      return;
    }

    setSaving(true);
    try {
      if (editingWordId) {
        await updateWord(editingWordId, { word: newWord.trim(), contactId: selectedContactId });
      } else {
        await addWord({ word: newWord.trim(), contactId: selectedContactId });
      }
      setModalVisible(false);
      setEditingWordId(null);
      setNewWord('');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo guardar la palabra.';
      showAppAlert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const deleteWord = async (id) => {
    try {
      await removeWord(id);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo eliminar la palabra.';
      showAppAlert('Error', message);
    }
  };

  return (
    <AppLayout currentScreen="Palabras" backgroundColor="#F8F9FA">
      <ScreenScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.titleRow, responsive.isSmallPhone && styles.titleRowStack]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitle}>Palabras clave</Text>
            <Text style={styles.mainSubtitle}>Configuradas: {words.length}/{MAX_KEYWORDS}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, words.length >= MAX_KEYWORDS && { backgroundColor: '#AAA' }]} 
            onPress={handleAddWord}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* Guías de ayuda */}
        <InfoBox title="¿Qué son las palabras clave?" bgColor="#EFF6FF">
          <Text style={styles.infoBody}>
            Son códigos secretos que solo vos y tus contactos conocen para indicar peligro sin levantar sospechas.
          </Text>
        </InfoBox>

        {/* Barra de control de visualización */}
        <View style={[styles.viewToggleRow, responsive.isSmallPhone && styles.viewToggleColumn]}>
          <TouchableOpacity 
            style={styles.viewToggleBtn}
            onPress={() => setGlobalShow(!globalShow)}
          >
            <Ionicons name={globalShow ? "eye-off-outline" : "eye-outline"} size={18} color="black" />
            <Text style={styles.viewToggleLabel}>
              {globalShow ? "Ocultar palabras" : "Mostrar palabras"}
            </Text>
          </TouchableOpacity>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{words.length} palabras</Text>
          </View>
        </View>

        {/* Listado de Palabras */}
        {words.length > 0 ? (
          <View style={styles.listSection}>
            {words.map(item => (
              <WordItem 
                key={item.id}
                word={item.word}
                type={item.type}
                description={item.description}
                date={item.date}
                showAll={globalShow}
                onEdit={() => handleEditWord(item)}
                onDelete={() => deleteWord(item.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="key-outline" size={40} color="#CCC" />
            <Text style={styles.emptyTitle}>No hay palabras configuradas</Text>
            {contacts.length === 0 && (
              <Text style={styles.emptyHint}>
                Primero agregá un contacto de emergencia en la pestaña Contactos.
              </Text>
            )}
          </View>
        )}

        {/* Ejemplo de uso */}
        <InfoBox title="Ejemplo de uso" bgColor="#FFFBEB">
          <View style={styles.exampleBox}>
            <Text style={styles.exampleText}>
              "Me encantaría pedir <Text style={{ fontWeight: 'bold' }}>PIZZA</Text> esta noche."
            </Text>
          </View>
          <Text style={styles.exampleCaption}>→ Alerta de Peligro activada</Text>
        </InfoBox>

        {/* Consejos de seguridad */}
     <InfoBox title="Consejos de seguridad" bgColor="#EFF6FF">
          <View style={styles.tipRow}>
            <Ionicons name="shield-outline" size={18} color="#FF5E00" />
            <Text style={styles.tipText}>
              Elige palabras comunes que puedas usar naturalmente en conversación
            </Text>
          </View>
          
          <View style={styles.tipRow}>
            <Ionicons name="shield-outline" size={18} color="#FF5E00" />
            <Text style={styles.tipText}>
              Comparte estas palabras solo con contactos de confianza
            </Text>
          </View>
          
          <View style={styles.tipRow}>
            <Ionicons name="shield-outline" size={18} color="#FF5E00" />
            <Text style={styles.tipText}>
              Cambia las palabras periódicamente si sospechas que fueron descubiertas
            </Text>
          </View>
        </InfoBox>

      </ScreenScrollView>

      <Modal visible={noContactsModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: modalWidth }]}>
            <Text style={styles.modalTitle}>Sin contactos de emergencia</Text>
            <Text style={styles.noContactsBody}>
              Para crear una palabra clave necesitás al menos un contacto. Agregalo en la pestaña Contactos.
            </Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                setNoContactsModalVisible(false);
                navigation.navigate('Contactos');
              }}
            >
              <Text style={styles.saveButtonText}>Ir a Contactos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => setNoContactsModalVisible(false)}>
              <Text style={styles.cancelLinkText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- AGREGAR PALABRA --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingWordId ? 'Editar palabra clave' : 'Agregar palabra clave'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingWordId(null); }}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Palabra clave</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: PIZZA" 
              value={newWord}
              onChangeText={setNewWord}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Contacto de emergencia</Text>
            <View style={[styles.typeSelector, responsive.isMobile && styles.typeSelectorColumn]}>
              {contacts.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.typeOption, selectedContactId === c.id && styles.typeOptionActive]}
                  onPress={() => setSelectedContactId(c.id)}
                >
                  <Text style={[styles.typeOptionText, selectedContactId === c.id && { color: 'white' }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveWord} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{editingWordId ? 'Actualizar palabra' : 'Guardar palabra'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  titleRowStack: { flexDirection: 'column', alignItems: 'flex-start' },
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  mainSubtitle: { fontSize: 13, color: '#666' },
  addButton: {
    backgroundColor: '#FF5E00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 5 },
  
  viewToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, gap: 10 },
  viewToggleColumn: { flexDirection: 'column', alignItems: 'stretch' },
  viewToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', elevation: 2 },
  viewToggleLabel: { marginLeft: 8, fontWeight: '500', fontSize: 14 },
  counterBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  counterText: { fontSize: 12, color: '#444' },

  listSection: { marginBottom: 10 },
  emptyCard: { backgroundColor: 'white', padding: 30, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#EEE', marginBottom: 20 },
  emptyTitle: { fontWeight: 'bold', color: '#666', marginTop: 10 },
  emptyHint: { fontSize: 13, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 12 },
  noContactsBody: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 8 },
  cancelLink: { alignItems: 'center', marginTop: 14, paddingVertical: 8 },
  cancelLinkText: { color: '#666', fontWeight: '600' },
  infoBody: { fontSize: 14, color: '#444', lineHeight: 20 },
  exampleBox: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  exampleText: { fontSize: 14, fontStyle: 'italic', color: '#444' },
  exampleCaption: { fontSize: 12, color: '#B45309', marginTop: 8, fontWeight: 'bold' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tipText: { fontSize: 13, color: '#4C1D95', marginLeft: 10, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 10, maxWidth: 520 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  inputLabel: { fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: '#333' },
  input: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 16 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  typeSelectorColumn: { flexDirection: 'column' },
  typeOption: { flexGrow: 1, flexBasis: '30%', minWidth: 100, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  typeOptionActive: { backgroundColor: '#FF5E00', borderColor: '#FF5E00' },
  typeOptionText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  saveButton: { backgroundColor: '#FF5E00', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});