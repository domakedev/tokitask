import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFCM } from '../hooks/useFCM';
import Icon from './Icon';

const NotificationDebug: React.FC = () => {
  const { user } = useAuth();
  const { token, loading, error, requestPermission, revokeToken, refreshToken } = useFCM();
  const [debugInfo, setDebugInfo] = useState<string>('');

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info);
  };

  const checkPermissions = async () => {
    if (!('Notification' in window)) {
      addDebugInfo('❌ Notificaciones no soportadas en este navegador');
      return;
    }

    const permission = Notification.permission;
    addDebugInfo(`📋 Estado de permisos: ${permission}`);

    if (permission === 'default') {
      addDebugInfo('ℹ️ Permisos no solicitados aún');
    } else if (permission === 'granted') {
      addDebugInfo('✅ Permisos concedidos');
    } else {
      addDebugInfo('❌ Permisos denegados');
    }
  };

  const checkServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      addDebugInfo('❌ Service Worker no soportado');
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      addDebugInfo(`📋 Service Workers registrados: ${registrations.length}`);

      registrations.forEach((reg, index) => {
        addDebugInfo(`  ${index + 1}. Scope: ${reg.scope}`);
        addDebugInfo(`     Estado: ${reg.active ? 'ACTIVO' : 'INACTIVO'}`);
      });
    } catch (err) {
      addDebugInfo(`❌ Error verificando SW: ${err}`);
    }
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('🧪 Prueba de Notificación', {
        body: 'Esta es una notificación de prueba desde el navegador',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'test-notification'
      });
      addDebugInfo('✅ Notificación de prueba enviada');
    } else {
      addDebugInfo('❌ No hay permisos para mostrar notificaciones');
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo('');
  };

  if (!user) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
        <p className="text-sm text-slate-400">Inicia sesión para usar las herramientas de debug</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="bug" className="h-5 w-5 text-orange-400" />
          <h3 className="text-sm font-medium text-slate-200">
            Debug de Notificaciones
          </h3>
        </div>
        <button
          onClick={clearDebugInfo}
          className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded transition-colors"
        >
          Limpiar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={checkPermissions}
          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          Verificar Permisos
        </button>
        <button
          onClick={checkServiceWorker}
          className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 rounded transition-colors"
        >
          Verificar SW
        </button>
        <button
          onClick={testNotification}
          className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded transition-colors"
        >
          Probar Notificación
        </button>
        <button
          onClick={refreshToken}
          disabled={loading}
          className="text-xs px-2 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-600 rounded transition-colors"
        >
          {loading ? 'Cargando...' : 'Refrescar Token'}
        </button>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-400 mb-1">Estado del Token FCM:</p>
        <div className="text-xs font-mono bg-slate-900 p-2 rounded">
          {token ? (
            <span className="text-green-400">
              ✅ {token.substring(0, 20)}...
            </span>
          ) : (
            <span className="text-red-400">❌ Sin token</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-900/20 border border-red-500/20 rounded">
          <p className="text-xs text-red-400">Error: {error}</p>
        </div>
      )}

      <div>
        <p className="text-xs text-slate-400 mb-1">Log de Debug:</p>
        <textarea
          value={debugInfo}
          readOnly
          className="w-full h-32 text-xs font-mono bg-slate-900 border border-slate-600 rounded p-2 text-slate-300"
          placeholder="Haz clic en los botones para ver información de debug..."
        />
      </div>
    </div>
  );
};

export default NotificationDebug;