import { Platform } from 'react-native';
import { createVoiceRecognition as createWeb } from './voiceRecognition.web';
import { createVoiceRecognition as createNative } from './voiceRecognition.native';

const createEngine = Platform.OS === 'web' ? createWeb : createNative;

class VoiceService {
  constructor() {
    this.listeners = new Set();
    this.words = [];
    this.lastEmitTime = 0;
    this.statusListeners = new Set();
    this.engine = null;
  }

  _ensureEngine() {
    if (this.engine) return;

    this.engine = createEngine({
      onKeywordDetected: (word) => this.emit(word),
      onError: (message) => {
        console.log('[VoiceService]', message);
        this.statusListeners.forEach((cb) => cb({ type: 'error', message }));
      },
      onStatus: (status) => {
        this.statusListeners.forEach((cb) => cb({ type: 'status', status }));
      },
    });
  }

  setWords(wordsArray) {
    this.words = wordsArray || [];
    this._ensureEngine();
    this.engine.setKeywords(this.words);
  }

  start() {
    if (this.words.length === 0) return false;

    this._ensureEngine();
    if (!this.engine.isSupported()) {
      this.statusListeners.forEach((cb) =>
        cb({
          type: 'error',
          message:
            Platform.OS === 'web'
              ? 'Reconocimiento de voz no disponible. Probá en Chrome o Edge.'
              : 'Reconocimiento de voz no disponible en este dispositivo.',
        })
      );
      return false;
    }

    this.engine.setKeywords(this.words);
    this.engine.start();
    return true;
  }

  stop() {
    this.engine?.stop();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onStatus(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  emit(word) {
    const now = Date.now();
    if (this.lastEmitTime && now - this.lastEmitTime < 5000) return;
    this.lastEmitTime = now;
    this.listeners.forEach((cb) => cb(word));
  }

  isRunning() {
    return this.engine?.isRunning?.() ?? false;
  }

  isSupported() {
    this._ensureEngine();
    return this.engine.isSupported();
  }
}

export default new VoiceService();
