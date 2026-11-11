import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { useResponsive, getModalWidth } from '../utils/responsive';

export default function PanicConfirmModal({
  visible,
  words = [],
  onCancel,
  onConfirm,
  loading,
  defaultSilent = false,
}) {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive, 0.94);
  const [selectedWord, setSelectedWord] = useState(null);
  const [isSilent, setIsSilent] = useState(defaultSilent);

  React.useEffect(() => {
    if (visible && words.length > 0) {
      setSelectedWord(words[0].word);
      setIsSilent(defaultSilent);
    }
  }, [visible, words, defaultSilent]);

  const selected = words.find((w) => w.word === selectedWord);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.box, { width: modalWidth, maxWidth: 460 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrapper, isSilent && styles.iconWrapperSilent]}>
              <Ionicons
                name={isSilent ? 'volume-mute' : 'alert-circle'}
                size={28}
                color={isSilent ? colors.neutral.textMuted : colors.emergency.primary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>
                {isSilent ? 'Alerta Silenciosa Discreta' : 'Confirmar Alerta de Emergencia'}
              </Text>
              <Text style={styles.subtitle}>
                Se registrará tu ubicación GPS y se notificará de inmediato a tus contactos.
              </Text>
            </View>
          </View>

          {/* Selector de palabra clave */}
          <Text style={styles.sectionLabel}>Palabra clave asociada:</Text>
          <View style={styles.wordsList}>
            {words.map((item) => {
              const active = selectedWord === item.word;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.wordCard, active && styles.wordCardActive]}
                  onPress={() => setSelectedWord(item.word)}
                  activeOpacity={0.7}
                >
                  <View style={styles.wordRow}>
                    <Text style={[styles.wordText, active && styles.wordTextActive]}>
                      "{item.word}"
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={colors.emergency.primary} />}
                  </View>
                  <Text style={styles.contactText}>
                    👤 Contacto: {item.description || item.contactName || 'No especificado'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Control de Modo Silencioso */}
          <View style={styles.silentContainer}>
            <View style={styles.silentInfo}>
              <Ionicons
                name={isSilent ? 'volume-mute' : 'volume-high'}
                size={22}
                color={isSilent ? colors.neutral.textMuted : colors.emergency.primary}
              />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.silentTitle}>Modo Silencioso (Discreto)</Text>
                <Text style={styles.silentSubtitle}>
                  {isSilent
                    ? 'Sin alarmas sonoras ni vibración en este dispositivo.'
                    : 'Emite señal sonora y háptica de alerta.'}
                </Text>
              </View>
            </View>
            <Switch
              value={isSilent}
              onValueChange={setIsSilent}
              trackColor={{ false: colors.neutral.borderStrong, true: colors.brand.border }}
              thumbColor={isSilent ? colors.brand.dark : colors.emergency.primary}
            />
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnPrimary,
                isSilent ? styles.btnPrimarySilent : styles.btnPrimaryEmergency,
                (!selectedWord || loading) && styles.btnDisabled,
              ]}
              onPress={() => selectedWord && onConfirm(selectedWord, isSilent)}
              disabled={loading || !selectedWord}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {isSilent ? 'Emitir en Silencio' : 'Enviar Alerta Ahora'}
                </Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  box: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.emergency.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperSilent: {
    backgroundColor: colors.neutral.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textDark,
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.dark,
    marginBottom: 8,
  },
  wordsList: {
    gap: 8,
    marginBottom: 16,
  },
  wordCard: {
    backgroundColor: colors.neutral.background,
    borderWidth: 1.5,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    padding: 12,
  },
  wordCardActive: {
    borderColor: colors.emergency.primary,
    backgroundColor: '#FEF2F2',
  },
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textDark,
  },
  wordTextActive: {
    color: colors.emergency.primary,
  },
  contactText: {
    fontSize: 12,
    color: colors.neutral.textMuted,
    marginTop: 4,
  },
  silentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  silentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  silentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textDark,
  },
  silentSubtitle: {
    fontSize: 11,
    color: colors.neutral.textMuted,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.borderStrong,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textMuted,
  },
  btnPrimary: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryEmergency: {
    backgroundColor: colors.emergency.primary,
  },
  btnPrimarySilent: {
    backgroundColor: colors.brand.dark,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
