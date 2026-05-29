/**
 * Reconocimiento de voz con Web Speech API (Chrome, Edge, Safari).
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
    };
  }

  let recognition = null;
  let keywords = [];
  let running = false;

  const start = () => {
    if (running) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      running = true;
      onStatus?.('listening');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const match = findKeyword(transcript, keywords);
      if (match) onKeywordDetected?.(match);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        onError?.('Permiso de micrófono denegado.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        onError?.(`Error de voz: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (running) {
        try {
          recognition.start();
        } catch {
          running = false;
          onStatus?.('stopped');
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      onError?.(e.message || 'No se pudo iniciar el micrófono.');
    }
  };

  const stop = () => {
    running = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognition = null;
    }
    onStatus?.('stopped');
  };

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
