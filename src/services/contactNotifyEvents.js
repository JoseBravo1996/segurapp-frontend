/**
 * contactNotifyEvents.js
 * Canal global para pedir que se avise a TODOS los contactos de emergencia por WhatsApp.
 * El modal NotifyContactsModal (montado en App.js) escucha y muestra la lista de contactos.
 */
const listeners = new Set();

export function subscribeContactNotification(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @param {object} request
 * @param {'alert'|'safe'} request.type - Tipo de aviso (emergencia o "estoy a salvo")
 * @param {Array<{ id, name, phone, whatsappUrl }>} request.contacts
 */
export function requestContactNotification({ type = 'alert', contacts = [] } = {}) {
  const validContacts = (contacts || []).filter(Boolean);
  if (validContacts.length === 0) return;
  listeners.forEach((listener) => listener({ type, contacts: validContacts }));
}
