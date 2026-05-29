import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { findKeyword } from './voiceKeywordMatcher';

function supportsContinuousRecognition() {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS === 'android') return Number(Platform.Version) >= 33;
  return false;
}

export function createVoiceRecognition({ onKeywordDetected, onError, onStatus }) {
  let running = false;
  let keywords = [];
  let listeners = [];

  const removeListeners = () => {
    listeners.forEach((listener) => listener.remove());
    listeners = [];
  };

  const buildStartOptions = () => ({
    lang: 'es-AR',
    interimResults: true,
    continuous: supportsContinuousRecognition(),
    contextualStrings: keywords.filter(Boolean),
    iosTaskHint: 'confirmation',
    androidIntentOptions: {
      EXTRA_LANGUAGE_MODEL: 'web_search',
    },
  });

  const beginRecognition = () => {
    if (!running) return;

    try {
      ExpoSpeechRecognitionModule.start(buildStartOptions());
    } catch (error) {
      running = false;
      removeListeners();
      onError?.(error.message || 'No se pudo iniciar el micrófono.');
      onStatus?.('stopped');
    }
  };

  const attachListeners = () => {
    listeners.push(
      ExpoSpeechRecognitionModule.addListener('start', () => {
        onStatus?.('listening');
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        if (running) {
          beginRecognition();
          return;
        }
        onStatus?.('stopped');
      }),
      ExpoSpeechRecognitionModule.addListener('result', (event) => {
        let transcript = '';
        for (const result of event.results || []) {
          transcript += result.transcript || '';
        }
        const match = findKeyword(transcript, keywords);
        if (match) onKeywordDetected?.(match);
      }),
      ExpoSpeechRecognitionModule.addListener('error', (event) => {
        if (event.error === 'not-allowed') {
          running = false;
          removeListeners();
          onError?.('Permiso de micrófono denegado.');
          onStatus?.('stopped');
          return;
        }

        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          onError?.(`Error de voz: ${event.error}`);
        }
      })
    );
  };

  return {
    start: () => {
      if (running) return;

      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        onError?.('Reconocimiento de voz no disponible en este dispositivo.');
        return;
      }

      (async () => {
        const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permissions.granted) {
          onError?.('Permiso de micrófono o reconocimiento de voz denegado.');
          return;
        }

        running = true;
        removeListeners();
        attachListeners();
        beginRecognition();
      })();
    },
    stop: () => {
      running = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* ignore */
      }
      removeListeners();
      onStatus?.('stopped');
    },
    setKeywords: (list) => {
      keywords = list || [];
    },
    isSupported: () => ExpoSpeechRecognitionModule.isRecognitionAvailable(),
    isRunning: () => running,
  };
}
