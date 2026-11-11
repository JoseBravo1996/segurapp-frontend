// src/services/mockApi.js

// Variables en memoria para simular el estado del servidor
let mockAlerts = [];
let mockContacts = [
  { id: 1, name: 'Contacto de Prueba', phone: '1122334455', lat: -34.6, lng: -58.4 }
];
let mockKeywords = [
  { id: 1, word: 'ayuda', contactId: 1, contact: mockContacts[0] }
];

export async function mockApiRequest(path, { method, body }) {
  console.log(`[MOCK API] ${method} ${path}`, body || '');

  // Retardo simulado de red
  await new Promise(resolve => setTimeout(resolve, 500));

  if (path === '/api/auth/login' && method === 'POST') {
    return { token: 'mock-jwt-token' };
  }
  
  if (path === '/api/auth/register' && method === 'POST') {
    return { message: 'Registrado correctamente' };
  }

  if (path === '/api/users/me' && method === 'GET') {
    return { id: 1, name: 'Usuario Prueba (Modo Local)', email: 'prueba@local.com', phone: '123456789' };
  }

  if (path === '/api/contacts' && method === 'GET') {
    return mockContacts;
  }

  if (path === '/api/keywords' && method === 'GET') {
    return mockKeywords;
  }

  if (path === '/api/alerts' && method === 'GET') {
    return mockAlerts;
  }

  if (path === '/api/alerts' && method === 'POST') {
    const newAlert = {
      id: Date.now(),
      word: body.word,
      contactName: 'Contacto de Prueba',
      contactPhone: '1122334455',
      timestamp: new Date().toISOString(),
      userLat: body.userLat,
      userLng: body.userLng,
      isResolved: false,
    };
    mockAlerts.unshift(newAlert);

    return {
      alertId: newAlert.id,
      isSilent: body.isSilent,
      contacts: mockContacts.map(c => ({
        ...c,
        whatsappUrl: `https://wa.me/${c.phone}?text=Alerta_Prueba`
      })),
      mapUrl: 'https://maps.google.com',
      triggeredAt: newAlert.timestamp
    };
  }
  
  if (path.includes('/resolve') && method === 'POST') {
    if (mockAlerts.length > 0) {
      mockAlerts[0].isResolved = true;
    }
    return {
      alertId: 1,
      isResolved: true,
      whatsappUrl: `https://wa.me/1122334455?text=Estoy_A_Salvo`
    };
  }

  if (path === '/api/device-token' && method === 'POST') {
    return { success: true };
  }

  // Fallback genérico para otros endpoints (POST/PUT/DELETE)
  return { success: true };
}
