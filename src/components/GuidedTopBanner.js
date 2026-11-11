/**
 * GuidedTopBanner.js
 * Barra superior discreta que indica el estado del asistente interactivo
 * sobre la interfaz real de SegurAPP.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGuidedOnboarding } from '../context/GuidedOnboardingContext';

export default function GuidedTopBanner() {
  const { isActive, currentStepIndex, totalSteps, skipAssistant } = useGuidedOnboarding();

  if (!isActive) return null;

  const percent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.innerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.pulseDot} />
          <Text style={styles.bannerTitle}>CONFIGURACIÓN INICIAL GUIADA</Text>
          <Text style={styles.stepText}>
            Paso {currentStepIndex + 1} de {totalSteps} ({percent}%)
          </Text>
        </View>

        <TouchableOpacity onPress={skipAssistant} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Omitir</Text>
          <Ionicons name="close-circle-outline" size={15} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 94, 0, 0.4)',
    paddingTop: Platform.OS === 'web' ? 8 : 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  innerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5E00',
  },
  bannerTitle: {
    color: '#FF7A29',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  skipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: '#1E293B',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF5E00',
  },
});

