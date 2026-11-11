import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createVoiceRecognition as createWeb } from './voiceRecognition.web';
import { createVoiceRecognition as createNative } from './voiceRecognition.native';

const createEngine = Platform.OS === 'web' ? createWeb : createNative;

const MIC_STORAGE_KEY = '@segurapp_mic_status';
const VOICE_ACTIVE_KEY = '@segurapp_voice_active';

class VoiceService {
  constructor() {
    this.listeners = new Set();
    this.words = [];
    this.lastEmitTime = 0;
    this.statusListeners = new Set();
    this.engine = null;
    this._continuousDesired = true; // SIEMPRE ACTIVO POR DEFECTO
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

  async checkStoredPermission() {
    try {
      const saved = await AsyncStorage.getItem(MIC_STORAGE_KEY);
      if (saved === 'granted') return 'granted';

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const res = await navigator.permissions.query({ name: 'microphone' });
          if (res.state === 'granted') {
            await AsyncStorage.setItem(MIC_STORAGE_KEY, 'granted');
            return 'granted';
          }
        } catch {
          // ignore
        }
      }
      return saved || 'prompt';
    } catch {
      return 'prompt';
    }
  }

  async setStoredPermission(status) {
    try {
      await AsyncStorage.setItem(MIC_STORAGE_KEY, status);
    } catch {
      // ignore
    }
  }

  setWords(wordsArray) {
    this.words = wordsArray || [];
    this._ensureEngine();
    this.engine.setKeywords(this.words);
    // Inicio automático permanente si hay palabras clave y no está en pausa explícita
    if (this.words.length > 0 && this._continuousDesired && !this.isRunning()) {
      this.start();
    }
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

    this._continuousDesired = true;
    AsyncStorage.setItem(VOICE_ACTIVE_KEY, 'true').catch(() => {});
    this.engine.setKeywords(this.words);
    this.engine.start();
    this.statusListeners.forEach((cb) => cb({ type: 'status', status: 'listening' }));
    return true;
  }

  stop() {
    this._continuousDesired = false;
    AsyncStorage.setItem(VOICE_ACTIVE_KEY, 'false').catch(() => {});
    this.engine?.stop();
    this.statusListeners.forEach((cb) => cb({ type: 'status', status: 'stopped' }));
  }

  async checkAndRestoreListening() {
    try {
      const active = await AsyncStorage.getItem(VOICE_ACTIVE_KEY);
      // Siempre activo por defecto a menos que el usuario lo haya pausado explícitamente con 'false'
      if (active !== 'false' && this.words.length > 0 && !this.isRunning()) {
        this.start();
      }
    } catch {
      if (this.words.length > 0 && !this.isRunning()) {
        this.start();
      }
    }
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
