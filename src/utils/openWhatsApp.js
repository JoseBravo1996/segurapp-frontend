import { Linking, Platform } from 'react-native';
import { showAppAlert } from './showAppAlert';

export async function openWhatsAppUrl(whatsappUrl, fallbackMessage) {
  if (!whatsappUrl) {
    showAppAlert('WhatsApp', fallbackMessage || 'No hay enlace disponible para este contacto.');
    return false;
  }

  try {
    if (Platform.OS === 'web') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
    await Linking.openURL(whatsappUrl);
    return true;
  } catch {
    showAppAlert('WhatsApp', 'No se pudo abrir WhatsApp.');
    return false;
  }
}
