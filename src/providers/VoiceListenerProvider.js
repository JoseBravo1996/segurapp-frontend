import React, { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { showAppAlert } from '../utils/showAppAlert';

import VoiceService from '../services/VoiceService';
import { triggerAlertWithLocation } from '../utils/alertHelper';
import { ApiError } from '../services/apiClient';

export default function VoiceListenerProvider() {
  const navigation = useNavigation();
  const isHandling = useRef(false);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permiso GPS denegado');
      }
    };
    requestPermission();
  }, []);

  useEffect(() => {
    if (!VoiceService.isSupported()) return undefined;

    const unsubscribe = VoiceService.subscribe(async (word) => {
      if (isHandling.current) return;
      isHandling.current = true;

      try {
        const result = await triggerAlertWithLocation(word);

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;

        navigation.navigate('Ubicación', {
          latitude,
          longitude,
          keyword: word,
          contactName: result.contact?.name,
        });
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'No se pudo enviar la alerta.';
        showAppAlert('Alerta por voz', message);
      } finally {
        setTimeout(() => {
          isHandling.current = false;
        }, 3000);
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  return null;
}
