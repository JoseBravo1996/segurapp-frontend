import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../context/OnboardingContext';
import colors from '../theme/colors';

const { width } = Dimensions.get('window');

export default function ProductTourGuide() {
  const {
    isTourActive,
    tourStep,
    totalSteps,
    currentStepData,
    nextTourStep,
    prevTourStep,
    skipTour,
    finishTour,
  } = useOnboarding();

  if (!isTourActive || !currentStepData) {
    return null;
  }

  const isFirstStep = tourStep === 0;
  const isLastStep = tourStep === totalSteps - 1;
  const progressPercent = Math.round(((tourStep + 1) / totalSteps) * 100);

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Tira superior informativa del Tour */}
      <View style={styles.topTourBanner}>
        <View style={styles.tourPill}>
          <Ionicons name="compass-outline" size={16} color="#FF5E00" />
          <Text style={styles.tourPillText}>RECORRIDO GUIADO</Text>
        </View>
        <TouchableOpacity
          onPress={skipTour}
          style={styles.skipTopButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipTopText}>Omitir recorrido</Text>
          <Ionicons name="close-circle-outline" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Tarjeta flotante interactiva */}
      <View style={styles.bottomCardWrapper} pointerEvents="auto">
        <View style={styles.card}>
          {/* Barra de progreso superior */}
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Encabezado con badge y contador */}
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  {currentStepData.badge || `Sección ${tourStep + 1}`}
                </Text>
              </View>
              <Text style={styles.stepCounterText}>
                {tourStep + 1} de {totalSteps}
              </Text>
            </View>

            {/* Indicador de puntos (dots) */}
            <View style={styles.dotsRow}>
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === tourStep && styles.dotActive,
                    idx < tourStep && styles.dotCompleted,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Contenido principal del paso */}
          <View style={styles.cardBody}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={currentStepData.icon || 'information-circle'}
                size={26}
                color="#FF5E00"
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.stepTitle}>{currentStepData.title}</Text>
              <Text style={styles.stepDescription}>
                {currentStepData.description}
              </Text>
            </View>
          </View>

          {/* Acciones de navegación */}
          <View style={styles.actionsRow}>
            {/* Botón Anterior */}
            <TouchableOpacity
              onPress={prevTourStep}
              disabled={isFirstStep}
              style={[
                styles.navButton,
                styles.prevButton,
                isFirstStep && styles.buttonDisabled,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={isFirstStep ? '#475569' : '#CBD5E1'}
              />
              <Text
                style={[
                  styles.prevButtonText,
                  isFirstStep && styles.textDisabled,
                ]}
              >
                Anterior
              </Text>
            </TouchableOpacity>

            {/* Botón Siguiente o Finalizar */}
            <TouchableOpacity
              onPress={isLastStep ? finishTour : nextTourStep}
              style={[styles.navButton, styles.nextButton]}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Finalizar tutorial' : 'Siguiente'}
              </Text>
              <Ionicons
                name={isLastStep ? 'checkmark-circle' : 'arrow-forward'}
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 45,
    paddingBottom: Platform.OS === 'web' ? 24 : 34,
    paddingHorizontal: 16,
  },
  topTourBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.35)',
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  tourPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tourPillText: {
    color: '#FF5E00',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skipTopText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomCardWrapper: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF5E00',
    borderRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    backgroundColor: 'rgba(255, 94, 0, 0.15)',
    borderColor: 'rgba(255, 94, 0, 0.4)',
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  stepBadgeText: {
    color: '#FF7A29',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stepCounterText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#FF5E00',
  },
  dotCompleted: {
    backgroundColor: '#10B981',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 94, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDescription: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  prevButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  prevButtonText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#FF5E00',
    flex: 1,
    shadowColor: '#FF5E00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  textDisabled: {
    color: '#475569',
  },
});

