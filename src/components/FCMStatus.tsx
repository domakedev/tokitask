import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Icon from './Icon';

const FCMStatus: React.FC = () => {
  const { user } = useAuth();
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Verificar si las notificaciones están soportadas
    if ('Notification' in window) {
      setNotificationSupported(true);
      setPermissionStatus(Notification.permission);
    }
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="radio" className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">
            Estado de Notificaciones
          </span>
        </div>
        <div className="flex items-center gap-2">
          {permissionStatus === 'granted' && (
            <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
              ✓ Activado
            </span>
          )}
          {permissionStatus === 'denied' && (
            <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
              ✗ Denegado
            </span>
          )}
          {permissionStatus === 'default' && (
            <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
              ? Pendiente
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Soporte:</span>
          <span className="text-slate-300">
            {notificationSupported ? 'Disponible' : 'No disponible'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Permisos:</span>
          <span className="text-slate-300">
            {permissionStatus === 'granted' && 'Concedido'}
            {permissionStatus === 'denied' && 'Denegado'}
            {permissionStatus === 'default' && 'Pendiente'}
          </span>
        </div>
      </div>

      {permissionStatus === 'default' && (
        <p className="text-xs text-slate-400 mt-2">
          Ve a Perfil → Notificaciones para activar
        </p>
      )}

      {permissionStatus === 'denied' && (
        <p className="text-xs text-red-400 mt-2">
          Permisos denegados. Ve a configuración del navegador para habilitar.
        </p>
      )}
    </div>
  );
};

export default FCMStatus;