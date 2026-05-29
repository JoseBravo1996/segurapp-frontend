import { apiRequest } from './apiClient';

export function login(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function register({ name, email, phone, password }) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name, email, phone, password },
    auth: false,
  });
}

export function getContacts() {
  return apiRequest('/api/contacts');
}

export function createContact({ name, phone, lat, lng }) {
  return apiRequest('/api/contacts', {
    method: 'POST',
    body: { name, phone, lat, lng },
  });
}

export function updateContact(id, { name, phone, lat, lng }) {
  return apiRequest(`/api/contacts/${id}`, {
    method: 'PUT',
    body: { name, phone, lat, lng },
  });
}

export function deleteContact(id) {
  return apiRequest(`/api/contacts/${id}`, { method: 'DELETE' });
}

export function getKeywords() {
  return apiRequest('/api/keywords');
}

export function createKeyword({ word, contactId }) {
  return apiRequest('/api/keywords', {
    method: 'POST',
    body: { word, contactId },
  });
}

export function updateKeyword(id, { word, contactId }) {
  return apiRequest(`/api/keywords/${id}`, {
    method: 'PUT',
    body: { word, contactId },
  });
}

export function deleteKeyword(id) {
  return apiRequest(`/api/keywords/${id}`, { method: 'DELETE' });
}

export function triggerAlert({ word, userLat, userLng }) {
  return apiRequest('/api/alerts', {
    method: 'POST',
    body: { word, userLat, userLng },
  });
}

export function getAlertHistory() {
  return apiRequest('/api/alerts');
}

export function resolveAlert(id) {
  return apiRequest(`/api/alerts/${id}/resolve`, { method: 'POST' });
}

export function resolveLatestAlert() {
  return apiRequest('/api/alerts/resolve-latest', { method: 'POST' });
}

export function registerDeviceToken({ token, platform }) {
  return apiRequest('/api/device-token', {
    method: 'POST',
    body: { token, platform },
  });
}

export function getProfile() {
  return apiRequest('/api/users/me');
}

export function updateProfile({ name, phone, currentPassword, newPassword }) {
  const body = { name, phone };
  if (currentPassword) body.currentPassword = currentPassword;
  if (newPassword) body.newPassword = newPassword;
  return apiRequest('/api/users/me', { method: 'PUT', body });
}

export function forgotPassword(email) {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export function resetPassword({ email, resetToken, newPassword }) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: { email, resetToken, newPassword },
    auth: false,
  });
}
