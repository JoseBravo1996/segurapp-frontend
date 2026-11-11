/**
 * GuidedOnboardingContext.js
 * Motor global del Asistente Guiado interactivo de SegurAPP.
 * Guía al usuario directamente sobre los formularios y componentes reales de la aplicación.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getGuidedOnboardingState,
  saveGuidedOnboardingState,
  markStepCompleted,
  markGuidedOnboardingCompleted,
  resetGuidedOnboarding,
} from '../services/onboardingStorage';
import { navigationRef } from '../navigation/navigationRef';

export const GUIDED_STEPS = [
  // --- MÓDULO 1: PERFIL REAL (SettingsScreen) ---
  {
    stepIndex: 0,
    id: 'profile_name',
    screen: 'Settings',
    subTab: 'profile',
    targetId: 'profile_name',
    badge: 'Perfil (1/3)',
    title: 'Completá tu Nombre',
    instruction: 'Ingresá tu nombre y apellido en el formulario de cuenta.',
    actionType: 'input',
    isOptional: false,
  },
  {
    stepIndex: 1,
    id: 'profile_phone',
    screen: 'Settings',
    subTab: 'profile',
    targetId: 'profile_phone',
    badge: 'Perfil (2/3)',
    title: 'Teléfono de Contacto',
    instruction: 'Ingresá tu número de teléfono para que tus contactos puedan comunicarse.',
    actionType: 'input',
    isOptional: false,
  },
  {
    stepIndex: 2,
    id: 'profile_save',
    screen: 'Settings',
    subTab: 'profile',
    targetId: 'profile_save_btn',
    badge: 'Perfil (3/3)',
    title: 'Guardar tus Datos',
    instruction: 'Presioná Guardar Cambios para sincronizar tu perfil con el servidor.',
    actionType: 'button',
    isOptional: false,
  },

  // --- MÓDULO 2: MICRÓFONO Y VOZ REAL (WordsScreen) ---
  {
    stepIndex: 3,
    id: 'voice_mic',
    screen: 'Palabras',
    targetId: 'voice_mic_btn',
    badge: 'Voz (1/3)',
    title: 'Habilitar Micrófono',
    instruction: 'Concedé permiso de micrófono para que SegurAPP pueda escuchar tu voz.',
    actionType: 'button',
    isOptional: false,
  },
  {
    stepIndex: 4,
    id: 'voice_phrase',
    screen: 'Palabras',
    targetId: 'voice_new_phrase_btn',
    badge: 'Voz (2/3)',
    title: 'Palabra de Auxilio',
    instruction: 'Configurá tu palabra clave de emergencia presionando en "+ Nueva Palabra".',
    actionType: 'button',
    isOptional: false,
  },
  {
    stepIndex: 5,
    id: 'voice_test',
    screen: 'Palabras',
    targetId: 'voice_test_box',
    badge: 'Voz (3/3)',
    title: 'Prueba en Modo Seguro',
    instruction: 'Probá pronunciar tu frase de auxilio aquí. En esta prueba NO se emite alerta real.',
    actionType: 'button',
    isOptional: false,
  },

  // --- MÓDULO 3: ZONAS SEGURAS (LocationScreen) ---
  {
    stepIndex: 6,
    id: 'zone_home',
    screen: 'Ubicación',
    targetId: 'safezone_add_btn',
    badge: 'Zonas Seguras (1/3)',
    title: 'Registrar CASA',
    instruction: 'Presioná Nueva Zona, buscá la dirección de tu Casa y confirmá su área de cobertura.',
    actionType: 'button',
    isOptional: false,
  },
  {
    stepIndex: 7,
    id: 'zone_work',
    screen: 'Ubicación',
    targetId: 'safezone_add_btn',
    badge: 'Zonas Seguras (2/3)',
    title: 'Registrar TRABAJO',
    instruction: 'Ahora registrá la dirección de tu Trabajo o estudio como segunda zona protegida.',
    actionType: 'button',
    isOptional: false,
  },
  {
    stepIndex: 8,
    id: 'zone_verify',
    screen: 'Ubicación',
    targetId: 'safezone_map_preview',
    badge: 'Zonas Seguras (3/3)',
    title: 'Zonas en el Mapa',
    instruction: '¡Excelente! Ambas ubicaciones ya están geolocalizadas con sus círculos de cobertura.',
    actionType: 'info',
    isOptional: false,
  },

  // --- MÓDULO 4: RECORRIDO Y FUNCIONALIDADES CLAVE ---
  {
    stepIndex: 9,
    id: 'tour_panic',
    screen: 'Emergencia',
    targetId: 'home_panic_btn',
    badge: 'Centro de Control',
    title: 'Botón de Emergencia',
    instruction: 'Presionarlo emite una alerta inmediata con tu GPS. Abajo tenés la Alerta Silenciosa.',
    actionType: 'info',
    isOptional: false,
  },
  {
    stepIndex: 10,
    id: 'tour_contacts',
    screen: 'Contactos',
    targetId: 'contacts_section',
    badge: 'Contactos',
    title: 'Red de Contactos',
    instruction: 'Acá administrás a tus contactos de confianza que reciben tus alertas.',
    actionType: 'info',
    isOptional: false,
  },
  {
    stepIndex: 11,
    id: 'tour_finish',
    screen: 'Emergencia',
    targetId: 'home_status_card',
    badge: 'Listo',
    title: '¡Configuración Completa!',
    instruction: 'Completaste todos los pasos. SegurAPP está configurada y lista para protegerte.',
    actionType: 'info',
    isOptional: false,
  },
];

const GuidedOnboardingContext = createContext(null);

export function GuidedOnboardingProvider({ children }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState('default');
  const [persistedSteps, setPersistedSteps] = useState({});

  const currentStepData = useMemo(() => {
    return GUIDED_STEPS[currentStepIndex] || GUIDED_STEPS[0];
  }, [currentStepIndex]);

  // Navegar a la pantalla del paso activo
  const syncNavigationWithStep = useCallback((stepData) => {
    if (!stepData || !navigationRef.isReady()) return;
    try {
      navigationRef.navigate(stepData.screen, {
        subTab: stepData.subTab,
      });
    } catch (e) {
      console.warn('[GuidedOnboarding] Error al sincronizar navegación:', e);
    }
  }, []);

  // Verificar si el usuario requiere el asistente
  const checkGuidedOnboarding = useCallback(async (userId = 'default') => {
    setCurrentUserId(userId);
    const state = await getGuidedOnboardingState(userId);
    setPersistedSteps(state.steps || {});

    if (!state.completed && !state.skipped) {
      const idx = Math.min(state.currentStepIndex || 0, GUIDED_STEPS.length - 1);
      setCurrentStepIndex(idx);
      setIsActive(true);
      setTimeout(() => syncNavigationWithStep(GUIDED_STEPS[idx]), 300);
      return true;
    }
    return false;
  }, [syncNavigationWithStep]);

  // Iniciar o reiniciar el asistente
  const startAssistant = useCallback(async (userId = currentUserId) => {
    setCurrentUserId(userId);
    await resetGuidedOnboarding(userId);
    setCurrentStepIndex(0);
    setPersistedSteps({});
    setIsActive(true);
    setTimeout(() => syncNavigationWithStep(GUIDED_STEPS[0]), 300);
  }, [currentUserId, syncNavigationWithStep]);

  // Completar un paso específico y avanzar
  const notifyStepCompleted = useCallback(async (stepId) => {
    const currentStep = GUIDED_STEPS[currentStepIndex];
    if (!currentStep) return;

    // Si el paso notificado coincide con el paso actual o es un prerrequisito
    if (currentStep.id === stepId || currentStep.targetId === stepId) {
      const nextIndex = currentStepIndex + 1;
      const updated = await markStepCompleted(currentUserId, stepId, nextIndex);
      setPersistedSteps(updated.steps || {});

      if (nextIndex >= GUIDED_STEPS.length) {
        // Fin del asistente
        await markGuidedOnboardingCompleted(currentUserId);
        setIsActive(false);
        syncNavigationWithStep(GUIDED_STEPS[0]);
      } else {
        setCurrentStepIndex(nextIndex);
        syncNavigationWithStep(GUIDED_STEPS[nextIndex]);
      }
    }
  }, [currentStepIndex, currentUserId, syncNavigationWithStep]);

  // Avanzar manualmente (para pasos informativos)
  const nextStep = useCallback(async () => {
    const currentStep = GUIDED_STEPS[currentStepIndex];
    const nextIndex = currentStepIndex + 1;

    await markStepCompleted(currentUserId, currentStep.id, nextIndex);

    if (nextIndex >= GUIDED_STEPS.length) {
      await markGuidedOnboardingCompleted(currentUserId);
      setIsActive(false);
      syncNavigationWithStep(GUIDED_STEPS[0]);
    } else {
      setCurrentStepIndex(nextIndex);
      syncNavigationWithStep(GUIDED_STEPS[nextIndex]);
    }
  }, [currentStepIndex, currentUserId, syncNavigationWithStep]);

  // Retroceder un paso
  const prevStep = useCallback(() => {
    const prevIndex = Math.max(0, currentStepIndex - 1);
    setCurrentStepIndex(prevIndex);
    syncNavigationWithStep(GUIDED_STEPS[prevIndex]);
  }, [currentStepIndex, syncNavigationWithStep]);

  // Omitir el asistente
  const skipAssistant = useCallback(async () => {
    setIsActive(false);
    await markGuidedOnboardingCompleted(currentUserId);
  }, [currentUserId]);

  // Finalizar
  const finishAssistant = useCallback(async () => {
    setIsActive(false);
    await markGuidedOnboardingCompleted(currentUserId);
    syncNavigationWithStep(GUIDED_STEPS[0]);
  }, [currentUserId, syncNavigationWithStep]);

  return (
    <GuidedOnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        totalSteps: GUIDED_STEPS.length,
        currentStepData,
        activeTargetId: isActive ? currentStepData.targetId : null,
        persistedSteps,
        checkGuidedOnboarding,
        startAssistant,
        notifyStepCompleted,
        nextStep,
        prevStep,
        skipAssistant,
        finishAssistant,
      }}
    >
      {children}
    </GuidedOnboardingContext.Provider>
  );
}

export function useGuidedOnboarding() {
  const ctx = useContext(GuidedOnboardingContext);
  if (!ctx) {
    throw new Error('useGuidedOnboarding debe usarse dentro de GuidedOnboardingProvider');
  }
  return ctx;
}

export default GuidedOnboardingContext;

