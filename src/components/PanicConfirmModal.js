import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PanicConfirmModal({
  visible,
  words,
  onCancel,
  onConfirm,
  loading,
}) {
  const [selectedWord, setSelectedWord] = useState(null);

  React.useEffect(() => {
    if (visible && words.length > 0) {
      setSelectedWord(words[0].word);
    }
  }, [visible, words]);

  const selected = words.find((w) => w.word === selectedWord);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Ionicons name="warning" size={28} color="#FF5E00" />
            <Text style={styles.title}>Confirmar alerta de pánico</Text>
          </View>

          <Text style={styles.subtitle}>
            Se notificará al contacto asociado y se registrará tu ubicación.
          </Text>

          <Text style={styles.label}>Palabra clave a usar</Text>
          {words.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.option, selectedWord === item.word && styles.optionActive]}
              onPress={() => setSelectedWord(item.word)}
            >
              <Text style={[styles.optionWord, selectedWord === item.word && styles.optionWordActive]}>
                {item.word}
              </Text>
              <Text style={styles.optionContact}>→ {item.description}</Text>
            </TouchableOpacity>
          ))}

          {selected && (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                Contacto: <Text style={{ fontWeight: '800' }}>{selected.description}</Text>
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel} disabled={loading}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnConfirm}
              onPress={() => selectedWord && onConfirm(selectedWord)}
              disabled={loading || !selectedWord}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnConfirmText}>ENVIAR ALERTA</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 24, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: '#050A18', flex: 1 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 20 },
  label: { fontWeight: '700', color: '#333', marginBottom: 10 },
  option: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  optionActive: { borderColor: '#FF5E00', backgroundColor: 'rgba(255, 94, 0, 0.08)' },
  optionWord: { fontSize: 16, fontWeight: '800', color: '#050A18' },
  optionWordActive: { color: '#FF5E00' },
  optionContact: { fontSize: 12, color: '#64748B', marginTop: 4 },
  summary: {
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  summaryText: { fontSize: 13, color: '#9A3412' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnCancelText: { color: '#64748B', fontWeight: '700' },
  btnConfirm: {
    flex: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FF5E00',
  },
  btnConfirmText: { color: 'white', fontWeight: '900', fontSize: 13 },
});
