/**
 * GuidedHighlight.js
 * Envoltorio de resaltado contextual del asistente guiado de SegurAPP.
 * Coloca un contorno naranja vibrante y una indicación con flecha directamente
 * junto al componente real que el usuario debe interactuar.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGuidedOnboarding } from '../context/GuidedOnboardingContext';

export default function GuidedHighlight({
  targetId,
  children,
  tooltipPosition = 'bottom', // 'top' | 'bottom'
  style,
  onActionComplete,
}) {
  const {
    isActive,
    activeTargetId,
    currentStepData,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipAssistant,
    finishAssistant,
  } = useGuidedOnboarding();

  const isHighlighted = isActive && activeTargetId === targetId;

  if (!isHighlighted) {
    return <View style={style}>{children}</View>;
  }

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  return (
    <View style={[styles.container, style]}>
      {/* Tooltip superior (si position === 'top') */}
      {tooltipPosition === 'top' && (
        <View style={[styles.tooltipCard, styles.tooltipTop]}>
          <View style={styles.tooltipHeader}>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>{currentStepData.badge || 'Paso'}</Text>
            </View>
            <Text style={styles.stepCounterText}>
              {currentStepIndex + 1}/{totalSteps}
            </Text>
          </View>
          <Text style={styles.tooltipTitle}>{currentStepData.title}</Text>
          <Text style={styles.tooltipDesc}>{currentStepData.instruction}</Text>
          <View style={styles.tooltipActions}>
            {!isFirst && (
              <TouchableOpacity onPress={prevStep} style={styles.btnPrev} activeOpacity={0.7}>
                <Text style={styles.btnPrevText}>← Anterior</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={isLast ? finishAssistant : nextStep}
              style={styles.btnNext}
              activeOpacity={0.8}
            >
              <Text style={styles.btnNextText}>{isLast ? 'Finalizar ✓' : 'Continuar →'}</Text>
            </TouchableOpacity>
          </View>
          {/* Flecha apuntando abajo al elemento */}
          <View style={styles.arrowDown} />
        </View>
      )}

      {/* Elemento hijo con CONTORNO NARANJA y resplandor */}
      <View style={styles.highlightWrapper}>
        {children}
        <View style={styles.pulsingBorder} pointerEvents="none" />
      </View>

      {/* Tooltip inferior (default) */}
      {tooltipPosition === 'bottom' && (
        <View style={[styles.tooltipCard, styles.tooltipBottom]}>
          {/* Flecha apuntando arriba al elemento */}
          <View style={styles.arrowUp} />
          <View style={styles.tooltipHeader}>
            <View style={styles.badgeWrap}>
              <Ionicons name="sparkles" size={12} color="#FF5E00" />
              <Text style={styles.badgeText}>{currentStepData.badge || 'Guía'}</Text>
            </View>
            <Text style={styles.stepCounterText}>
              {currentStepIndex + 1} de {totalSteps}
            </Text>
          </View>

          <Text style={styles.tooltipTitle}>{currentStepData.title}</Text>
          <Text style={styles.tooltipDesc}>{currentStepData.instruction}</Text>

          {/* Acciones del asistente */}
          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={skipAssistant} style={styles.btnSkip} activeOpacity={0.7}>
              <Text style={styles.btnSkipText}>Omitir</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {!isFirst && (
                <TouchableOpacity onPress={prevStep} style={styles.btnPrev} activeOpacity={0.7}>
                  <Text style={styles.btnPrevText}>←</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={isLast ? finishAssistant : nextStep}
                style={styles.btnNext}
                activeOpacity={0.8}
              >
                <Text style={styles.btnNextText}>{isLast ? 'Finalizar ✓' : 'Siguiente →'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 999,
  },
  highlightWrapper: {
    position: 'relative',
    borderRadius: 14,
  },
  pulsingBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#FF5E00',
    backgroundColor: 'rgba(255, 94, 0, 0.04)',
    shadowColor: '#FF5E00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  tooltipCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF5E00',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  tooltipBottom: {
    marginTop: 8,
  },
  tooltipTop: {
    marginBottom: 8,
  },
  arrowUp: {
    position: 'absolute',
    top: -8,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF5E00',
  },
  arrowDown: {
    position: 'absolute',
    bottom: -8,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF5E00',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 94, 0, 0.18)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FF7A29',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stepCounterText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  tooltipDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  btnSkip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  btnSkipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  btnPrev: {
    backgroundColor: '#1E293B',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnPrevText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  btnNext: {
    backgroundColor: '#FF5E00',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnNextText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});

