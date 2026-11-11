/**
 * OnboardingContext.js
 * Contexto global para la gestión del onboarding inicial y del Product Tour interactivo.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  getOnboardingState,
  markOnboardingCompleted,
  markOnboardingSkipped,
  resetOnboardingState,
} from '../services/onboardingStorage';
import { navigationRef } from '../navigation/navigationRef';

const OnboardingContext = createContext(null);

export const TOUR_STEPS = [
  {
    stepIndex: 0,
    screen: 'Emergencia',
    title: 'Centro de Control de Seguridad',
    icon: 'shield-checkmark',
    description:
      'Esta es la pantalla principal de SegurAPP. Desde acá podés monitorear el estado de tu red, ver alertas recientes y saber si el sistema está protegido y conectado en tiempo real.',
    badge: 'Inicio',
  },
  {
    stepIndex: 1,
    screen: 'Emergencia',
    title: 'Activación de Emergencia y Modo Silencioso',
    icon: 'warning',
    description:
      'Al presionar el botón de EMERGENCIA, tus coordenadas GPS se envían a todos tus contactos. Si estás en una situación de riesgo, activá la "Alerta Silenciosa" para emitir sin sonido ni vibración en tu teléfono.',
    badge: 'Emergencias',
  },
  {
    stepIndex: 2,
    screen: 'Ubicación',
    title: 'Geolocalización y Zonas Seguras',
    icon: 'map',
    description:
      'En esta sección podés visualizar tu ubicación exacta en un mapa interactivo, compartir tu posición vía WhatsApp y definir Zonas Seguras (como tu casa o trabajo) para recibir notificaciones automáticas.',
    badge: 'Ubicación',
  },
  {
    stepIndex: 3,
    screen: 'Contactos',
    title: 'Red de Contactos de Confianza',
    icon: 'people',
    description:
      'Registrá a las personas que recibirán tus alertas. Cuando actives una emergencia, SegurAPP notificará a todos tus contactos activos simultáneamente con tu ubicación en el mapa.',
    badge: 'Contactos',
  },
  {
    stepIndex: 4,
    screen: 'Palabras',
    title: 'Palabras Clave de Auxilio por Voz',
    icon: 'mic',
    description:
      'Configurá hasta 3 palabras secretas (ej. "PIZZA" o "AUXILIO"). Si activás la escucha por voz, pronunciar tu palabra clave activará la alerta automáticamente sin necesidad de tocar la pantalla.',
    badge: 'Palabras Clave',
  },
  {
    stepIndex: 5,
    screen: 'Historial',
    title: 'Historial y Monitoreo Geográfico',
    icon: 'time',
    description:
      'Consultá el registro completo de alertas emitidas con su fecha, estado y coordenadas. Podés ver los eventos en lista o sobre el mapa interactivo con marcadores geográficos en tiempo real.',
    badge: 'Historial',
  },
  {
    stepIndex: 6,
    screen: 'Settings',
    title: 'Configuración y Preferencias',
    icon: 'settings',
    description:
      'Personalizá las preferencias de emergencia (modo silencioso por defecto, vibración háptica), gestioná tus datos de cuenta o volvé a iniciar este recorrido guiado cuando lo necesites.',
    badge: 'Configuración',
  },
];

export function OnboardingProvider({ children }) {
  const [isOnboardingModalVisible, setIsOnboardingModalVisible] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [currentUserId, setCurrentUserId] = useState('default');

  // Verifica si el usuario necesita onboarding
  const checkOnboardingRequired = useCallback(async (userId = 'default') => {
    setCurrentUserId(userId);
    const state = await getOnboardingState(userId);
    if (!state.completed && !state.skipped) {
      console.log(`[OnboardingContext] Usuario ${userId} requiere configuración inicial.`);
      setIsOnboardingModalVisible(true);
      return true;
    }
    return false;
  }, []);

  // Iniciar wizard de bienvenida manualmente
  const startInitialSetup = useCallback((userId = currentUserId) => {
    setCurrentUserId(userId);
    setIsOnboardingModalVisible(true);
  }, [currentUserId]);

  // Completar wizard de configuración mínima e iniciar el tour
  const completeInitialSetup = useCallback(async (startTourAfter = true) => {
    setIsOnboardingModalVisible(false);
    if (startTourAfter) {
      setTourStep(0);
      setIsTourActive(true);
      if (navigationRef.isReady()) {
        navigationRef.navigate(TOUR_STEPS[0].screen);
      }
    } else {
      await markOnboardingCompleted(currentUserId);
    }
  }, [currentUserId]);

  // Iniciar el Product Tour interactivo
  const startProductTour = useCallback((userId = currentUserId) => {
    setCurrentUserId(userId);
    setIsOnboardingModalVisible(false);
    setTourStep(0);
    setIsTourActive(true);
    if (navigationRef.isReady()) {
      navigationRef.navigate(TOUR_STEPS[0].screen);
    }
  }, [currentUserId]);

  // Avanzar al siguiente paso del tour
  const nextTourStep = useCallback(() => {
    setTourStep((prev) => {
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) {
        // Fin del tour
        setIsTourActive(false);
        markOnboardingCompleted(currentUserId);
        if (navigationRef.isReady()) {
          navigationRef.navigate('Emergencia');
        }
        return 0;
      }
      // Navegar a la pantalla correspondiente al siguiente paso
      const nextScreen = TOUR_STEPS[next].screen;
      if (navigationRef.isReady()) {
        navigationRef.navigate(nextScreen);
      }
      return next;
    });
  }, [currentUserId]);

  // Retroceder al paso anterior
  const prevTourStep = useCallback(() => {
    setTourStep((prev) => {
      const back = Math.max(0, prev - 1);
      const backScreen = TOUR_STEPS[back].screen;
      if (navigationRef.isReady()) {
        navigationRef.navigate(backScreen);
      }
      return back;
    });
  }, []);

  // Omitir el tour
  const skipTour = useCallback(async () => {
    setIsTourActive(false);
    await markOnboardingSkipped(currentUserId);
    if (navigationRef.isReady()) {
      navigationRef.navigate('Emergencia');
    }
  }, [currentUserId]);

  // Finalizar tour
  const finishTour = useCallback(async () => {
    setIsTourActive(false);
    await markOnboardingCompleted(currentUserId);
    if (navigationRef.isReady()) {
      navigationRef.navigate('Emergencia');
    }
  }, [currentUserId]);

  // Resetear para volver a ver tutorial desde Configuración
  const resetAndRestartTour = useCallback(async (userId = currentUserId) => {
    await resetOnboardingState(userId);
    startProductTour(userId);
  }, [currentUserId, startProductTour]);

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingModalVisible,
        isTourActive,
        tourStep,
        currentStepData: TOUR_STEPS[tourStep] || TOUR_STEPS[0],
        totalSteps: TOUR_STEPS.length,
        checkOnboardingRequired,
        startInitialSetup,
        completeInitialSetup,
        startProductTour,
        nextTourStep,
        prevTourStep,
        skipTour,
        finishTour,
        resetAndRestartTour,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding debe usarse dentro de un OnboardingProvider');
  }
  return ctx;
}

export default OnboardingContext;

