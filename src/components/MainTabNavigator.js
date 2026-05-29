import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function MainTabNavigator({ currentScreen }) {
  const navigation = useNavigation();

  const tabs = [
    { id: 'Emergencia', icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline' },
    { id: 'Ubicación', icon: 'map', iconOutline: 'map-outline' },
    { id: 'Contactos', icon: 'people', iconOutline: 'people-outline' },
    { id: 'Palabras', icon: 'mic', iconOutline: 'mic-outline' },
    { id: 'Historial', icon: 'list', iconOutline: 'list-outline' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;
        
        return (
          <TouchableOpacity 
            key={tab.id} 
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(tab.id)}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Ionicons 
                name={isActive ? tab.icon : tab.iconOutline} 
                size={22} 
                color={isActive ? '#FF5E00' : '#64748B'} 
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.id}
            </Text>
            {/* Indicador inferior para la pestaña activa */}
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 95 : 75,
    backgroundColor: '#050A18', // Azul Marino Profundo
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    // Sombra para que se note la elevación sobre el contenido
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 15,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 94, 0, 0.1)', // Fondo naranja traslúcido
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B', // Gris azulado para inactivos
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FF5E00', // Naranja SegurAPP
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? -5 : 0,
    width: 20,
    height: 3,
    backgroundColor: '#FF5E00',
    borderRadius: 2,
    shadowColor: '#FF5E00',
    shadowOpacity: 0.5,
    shadowRadius: 5,
  }
});