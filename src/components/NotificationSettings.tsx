import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getFCMToken, messaging } from '@/services/firebase';
import { saveFCMToken } from '@/services/firestoreService';

const NotificationSettings= ({userId}: {userId: string | null}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);


  const requestPermission = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Simular la activación de notificaciones
      console.log('✅ Notificaciones activadas (simulado)');

      // Aquí iría la lógica real de FCM
      const token = await getFCMToken();
      if (token) {
        await saveFCMToken(userId, token);
        setHasToken(true);
      }

      setHasToken(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const revokeToken = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Simular la desactivación de notificaciones
      console.log('✅ Notificaciones desactivadas (simulado)');

      // Aquí iría la lógica real de FCM
      if (messaging) {
        const { deleteToken } = await import('firebase/messaging');
        await deleteToken(messaging);
      }

      setHasToken(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  if (!userId) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-lg">🔔</span>
          <h3 className="text-sm font-medium text-slate-200">
            Notificaciones Push
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {hasToken && (
            <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
              ✓ Activadas
            </span>
          )}
          {loading && (
            <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Recibe notificaciones automáticas de tus tareas programadas en calendarTasks,
        incluso cuando la app esté cerrada.
      </p>

      {!hasToken && (
        <div className="bg-amber-900/20 border border-amber-500/20 rounded p-2 mb-3">
          <p className="text-xs text-amber-400">
            💡 Haz clic en &ldquo;Activar Notificaciones&rdquo; para comenzar a recibir avisos
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded p-2 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        {!hasToken ? (
          <button
            onClick={requestPermission}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white text-xs rounded transition-colors"
          >
            <span className="text-sm">🔔</span>
            {loading ? 'Activando...' : 'Activar Notificaciones'}
          </button>
        ) : (
          <button
            onClick={revokeToken}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 text-white text-xs rounded transition-colors"
          >
            <span className="text-sm">🔕</span>
            {loading ? 'Desactivando...' : 'Desactivar'}
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;