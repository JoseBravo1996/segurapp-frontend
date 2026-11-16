/**
 * NotifyContactsModal.js
 * Lista a todos los contactos de emergencia con un botón de WhatsApp por contacto.
 * wa.me requiere una acción del usuario por cada mensaje (y los navegadores bloquean
 * abrir varias pestañas a la vez), por eso cada contacto se envía con su propio toque.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { useResponsive, getModalWidth } from '../utils/responsive';
import { subscribeContactNotification } from '../services/contactNotifyEvents';
import { openWhatsAppUrl } from '../utils/openWhatsApp';

const WHATSAPP_GREEN = '#25D366';

export default function NotifyContactsModal() {
  const responsive = useResponsive();
  const modalWidth = getModalWidth(responsive, 0.94);
  const [request, setRequest] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());

  useEffect(
    () =>
      subscribeContactNotification((next) => {
        setSentIds(new Set());
        setRequest(next);
      }),
    []
  );

  if (!request) return null;

  const { type, contacts } = request;
  const isSafe = type === 'safe';
  const sentCount = contacts.filter((c, i) => sentIds.has(c.id ?? i)).length;
  const allSent = sentCount === contacts.length;

  const handleSend = async (contact, key) => {
    const opened = await openWhatsAppUrl(
      contact.whatsappUrl,
      `Avisá manualmente a ${contact.name} (${contact.phone}).`
    );
    if (opened) {
      setSentIds((prev) => new Set(prev).add(key));
    }
  };

  const close = () => setRequest(null);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.box, { width: modalWidth, maxWidth: 460 }]}>
          <View style={[styles.iconWrapper, isSafe && styles.iconWrapperSafe]}>
            <Ionicons
              name={isSafe ? 'shield-checkmark' : 'logo-whatsapp'}
              size={30}
              color={isSafe ? colors.status.success : WHATSAPP_GREEN}
            />
          </View>
          <Text style={styles.title}>
            {isSafe ? 'Avisá que estás a salvo' : 'Avisá a tus contactos'}
          </Text>
          <Text style={styles.subtitle}>
            Tocá cada contacto para enviarle el mensaje por WhatsApp ({sentCount}/{contacts.length}).
          </Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {contacts.map((contact, index) => {
              const key = contact.id ?? index;
              const sent = sentIds.has(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.contactRow, sent && styles.contactRowSent]}
                  onPress={() => handleSend(contact, key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <View style={[styles.sendBadge, sent && styles.sendBadgeSent]}>
                    <Ionicons
                      name={sent ? 'checkmark' : 'logo-whatsapp'}
                      size={16}
                      color={colors.neutral.white}
                    />
                    <Text style={styles.sendBadgeText}>{sent ? 'Enviado' : 'Enviar'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={close} activeOpacity={0.85}>
            <Text style={styles.closeButtonText}>{allSent ? 'Listo' : 'Cerrar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  box: {
    backgroundColor: colors.neutral.card,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    maxHeight: '90%',
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapperSafe: {
    backgroundColor: colors.status.successLight,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.neutral.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  list: {
    alignSelf: 'stretch',
  },
  listContent: {
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.neutral.background,
  },
  contactRowSent: {
    borderColor: colors.status.success,
    backgroundColor: colors.status.successLight,
  },
  contactInfo: {
    flex: 1,
    marginRight: 10,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textDark,
  },
  contactPhone: {
    fontSize: 13,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
  sendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  sendBadgeSent: {
    backgroundColor: colors.status.success,
  },
  sendBadgeText: {
    color: colors.neutral.white,
    fontWeight: '700',
    fontSize: 13,
  },
  closeButton: {
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: colors.brand.dark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.neutral.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
