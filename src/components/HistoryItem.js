import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryItem({ type, date, time, status, location }) {
  const isDanger = type === 'Peligro';
  // Usamos el Naranja de Seguridad para Peligro y un Gris azulado para otros
  const accentColor = isDanger ? '#FF5E00' : '#64748B';

  return (
    <View style={styles.container}>
      {/* Indicador lateral con el color de acento */}
      <View style={[styles.indicator, { backgroundColor: accentColor }]} />
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.typeText, { color: accentColor }]}>{type.toUpperCase()}</Text>
          <Text style={styles.dateText}>{date} • {time}</Text>
        </View>
        
        <Text style={styles.locationText}>
          <Ionicons name="location-sharp" size={12} color="#FF5E00" /> {location}
        </Text>
        
        <View style={[styles.statusBadge, { borderColor: isDanger ? 'rgba(255, 94, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)' }]}>
          <Text style={[styles.statusText, { color: isDanger ? '#FF5E00' : '#B0B0B0' }]}>{status}</Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#475569" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A1128', // Fondo de tarjeta SegurAPP
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)', // Borde sutil
    // Sombra suave para elevación
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  indicator: { 
    width: 4, 
    height: '100%', 
    borderRadius: 2 
  },
  content: { 
    flex: 1, 
    marginLeft: 15 
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  typeText: { 
    fontWeight: '800', 
    fontSize: 13, 
    letterSpacing: 0.5 
  },
  dateText: { 
    fontSize: 12, 
    color: '#64748B' 
  },
  locationText: { 
    fontSize: 13, 
    color: '#B0B0B0', // Texto en gris claro para legibilidad
    marginBottom: 10,
    fontWeight: '400'
  },
  statusBadge: { 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { 
    fontSize: 11, 
    fontWeight: '700',
    textTransform: 'uppercase'
  }
});