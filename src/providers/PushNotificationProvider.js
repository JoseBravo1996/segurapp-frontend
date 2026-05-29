import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerPushTokenIfPossible, setupPushNotificationListeners } from '../services/pushNotifications';

export default function PushNotificationProvider() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    registerPushTokenIfPossible();
    return setupPushNotificationListeners();
  }, [isAuthenticated]);

  return null;
}
