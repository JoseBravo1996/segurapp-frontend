import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WordItem({ word, type, description, date, onDelete, onEdit, showAll }) {
  const getTheme = () => {
    switch (type) {
      case 'Peligro': return { bg: '#FEE2E2', text: '#D00000', iconBg: '#FFE5E5' };
      case 'Ayuda': return { bg: '#FFEDD5', text: '#F97316', iconBg: '#FFF4E5' };
      case 'Seguro': return { bg: '#DCFCE7', text: '#16A34A', iconBg: '#E5F9EB' };
      default: return { bg: '#F3F4F6', text: '#666', iconBg: '#F3F4F6' };
    }
  };

  const theme = getTheme();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.keyCircle, { backgroundColor: theme.iconBg }]}>
            <Ionicons name="key" size={18} color={theme.text} />
          </View>
          <View style={[styles.badge, { backgroundColor: theme.bg }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>{type}</Text>
          </View>
        </View>
        
        <View style={styles.rightActions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Ionicons name="create-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color="#D00000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentBody}>
        <Text style={styles.wordDisplay}>
          {showAll ? word : '••••••••'}
        </Text>
        <Text style={styles.descriptionText}>{description}</Text>
        <Text style={styles.dateText}>Creada: {date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  leftInfo: { flexDirection: 'row', alignItems: 'center' },
  keyCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  rightActions: { flexDirection: 'row' },
  actionBtn: { marginLeft: 12 },
  contentBody: { paddingLeft: 46 },
  wordDisplay: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 6, letterSpacing: 1 },
  descriptionText: { fontSize: 14, color: '#555', marginBottom: 6 },
  dateText: { fontSize: 11, color: '#999' }
});