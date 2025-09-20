import { useState, useCallback } from 'react';
import { getFCMToken, onMessageListener, messaging } from '../services/firebase';
import { saveFCMToken, removeFCMToken } from '../services/firestoreService';
import { useAuth } from './useAuth';

interface FCMHookReturn {
  token: string | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  revokeToken: () => Promise<void>;
}

export const useFCM = (): FCMHookReturn => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Solicitar permisos y obtener token FCM
  const requestPermission = useCallback(async () => {
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fcmToken = await getFCMToken();

      if (fcmToken) {
        // Guardar token en Firestore
        await saveFCMToken(user.uid, fcmToken);
        setToken(fcmToken);
        console.log('✅ Token FCM guardado:', fcmToken.substring(0, 20) + '...');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error obteniendo token FCM:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Revocar token y eliminarlo
  const revokeToken = useCallback(async () => {
    if (!user || !token) {
      setError('No hay token para revocar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Eliminar token de Firestore
      await removeFCMToken(user.uid, token);

      // Intentar eliminar el token de Firebase (puede fallar si ya no es válido)
      if (messaging) {
        try {
          // En Firebase v9+, deleteToken() es una función global
          const { deleteToken } = await import('firebase/messaging');
          await deleteToken(messaging);
        } catch (err) {
          console.warn('No se pudo eliminar token de Firebase:', err);
        }
      }

      setToken(null);
      console.log('✅ Token FCM revocado');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error revocando token FCM:', err);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  return {
    token,
    loading,
    error,
    requestPermission,
    revokeToken
  };
};