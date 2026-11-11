/**
 * Reconocimiento de voz con Web Speech API (Chrome, Edge, Safari).
 * Implementación robusta con auto-reanudación, tolerancia a cambio de pestañas y eventos de visibilidad.
 */

import { findKeyword } from './voiceKeywordMatcher';

export { findKeyword };

export function createVoiceRecognition({ onKeywordDetected, onError, onStatus }) {
  const SpeechRecognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

  if (!SpeechRecognition) {
    return {
      start: () => onError?.('Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.'),
      stop: () => {},
      isSupported: () => false,
      isRunning: () => false,
      setKeywords: () => {},
    };
  }

  let recognition = null;
  let keywords = [];
  let running = false;
  let isListeningInstance = false;
  let restartTimeout = null;

  const cleanupInstance = () => {
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognition = null;
    }
    isListeningInstance = false;
  };

  const spawnRecognition = () => {
    if (!running) return;

    cleanupInstance();

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-AR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isListeningInstance = true;
        onStatus?.('listening');
      };

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const match = findKeyword(transcript, keywords);
        if (match) {
          onKeywordDetected?.(match);
        }
      };

      rec.onerror = (event) => {
        const error = event.error;
        if (error === 'not-allowed') {
          running = false;
          cleanupInstance();
          onError?.('Permiso de micrófono denegado en el navegador.');
          onStatus?.('stopped');
          return;
        }

        // Errores transitorios normales (silencio prolongado, cambio de foco, red)
        if (error !== 'aborted' && error !== 'no-speech') {
          console.log('[WebSpeech] Evento de error no crítico:', error);
        }
      };

      rec.onend = () => {
        isListeningInstance = false;
        if (running) {
          // Reintentar de forma asíncrona para no provocar InvalidStateError en Chrome
          if (restartTimeout) clearTimeout(restartTimeout);
          restartTimeout = setTimeout(() => {
            if (running && !isListeningInstance) {
              spawnRecognition();
            }
          }, 300);
        } else {
          onStatus?.('stopped');
        }
      };

      recognition = rec;
      rec.start();
    } catch (e) {
      console.warn('[WebSpeech] Error iniciando reconocimiento:', e?.message || e);
      if (running) {
        if (restartTimeout) clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
          if (running && !isListeningInstance) {
            spawnRecognition();
          }
        }, 500);
      } else {
        onError?.(e?.message || 'No se pudo iniciar el micrófono.');
        onStatus?.('stopped');
      }
    }
  };

  const start = () => {
    running = true;
    if (restartTimeout) clearTimeout(restartTimeout);
    spawnRecognition();
  };

  const stop = () => {
    running = false;
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }
    cleanupInstance();
    onStatus?.('stopped');
  };

  // Mantener vivo al cambiar de pestaña del navegador o volver al foco
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && running && !isListeningInstance) {
        spawnRecognition();
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      if (running && !isListeningInstance) {
        spawnRecognition();
      }
    });
  }

  return {
    start,
    stop,
    setKeywords: (list) => {
      keywords = list || [];
    },
    isSupported: () => true,
    isRunning: () => running,
  };
}
