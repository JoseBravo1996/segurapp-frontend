/**
 * onboardingStorage.js
 * Persistencia granular del asistente guiado de SegurAPP por usuario.
 * Registra el avance paso a paso y el estado de cada configuración real.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_PREFIX = '@segurapp_guided_onboarding_v2_';

const DEFAULT_STATE = {
  completed: false,
  skipped: false,
  currentStepIndex: 0,
  updatedAt: null,
  completedAt: null,
  steps: {
    profile_name: false,
    profile_phone: false,
    profile_completed: false,
    mic_completed: false,
    voice_phrase_completed: false,
    voice_test_completed: false,
    home_zone_completed: false,
    work_zone_completed: false,
    notifications_completed: false,
    tour_panic_completed: false,
    tour_contacts_completed: false,
    tour_completed: false,
  },
};

export async function getGuidedOnboardingState(userId = 'default') {
  try {
    const raw = await AsyncStorage.getItem(`${ONBOARDING_PREFIX}${userId}`);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      steps: {
        ...DEFAULT_STATE.steps,
        ...(parsed.steps || {}),
      },
    };
  } catch (err) {
    console.warn('[onboardingStorage] Error leyendo estado:', err);
    return { ...DEFAULT_STATE };
  }
}

export async function saveGuidedOnboardingState(userId = 'default', stateUpdate = {}) {
  try {
    const current = await getGuidedOnboardingState(userId);
    const updated = {
      ...current,
      ...stateUpdate,
      steps: {
        ...current.steps,
        ...(stateUpdate.steps || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(`${ONBOARDING_PREFIX}${userId}`, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[onboardingStorage] Error guardando estado:', err);
    throw err;
  }
}

export async function markStepCompleted(userId = 'default', stepKey, nextStepIndex = null) {
  const current = await getGuidedOnboardingState(userId);
  const updatedSteps = {
    ...current.steps,
    [stepKey]: true,
  };

  const updatePayload = {
    steps: updatedSteps,
  };

  if (typeof nextStepIndex === 'number') {
    updatePayload.currentStepIndex = nextStepIndex;
  }

  return saveGuidedOnboardingState(userId, updatePayload);
}

export async function markGuidedOnboardingCompleted(userId = 'default') {
  return saveGuidedOnboardingState(userId, {
    completed: true,
    skipped: false,
    completedAt: new Date().toISOString(),
  });
}

export async function resetGuidedOnboarding(userId = 'default') {
  try {
    await AsyncStorage.removeItem(`${ONBOARDING_PREFIX}${userId}`);
  } catch (err) {
    console.warn('[onboardingStorage] Error reseteando:', err);
  }
}
