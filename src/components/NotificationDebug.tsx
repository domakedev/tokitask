import React from 'react';
import { useFCM } from '../hooks/useFCM';
import { useAuth } from '../hooks/useAuth';
import Icon from './Icon';

const NotificationDebug: React.FC = () => {
  const { user } = useAuth();
  const { token, loading, error } = useFCM();

  if (!user) {
    return null;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-600 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="bug" className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-slate-200">
            Debug Notificaciones
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          Recargar
        </button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Usuario:</span>
          <span className="text-slate-300">{user.email}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Token FCM:</span>
          <span className="text-slate-300">
            {token ? `${token.substring(0, 20)}...` : 'No disponible'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Estado:</span>
          <span className={`font-medium ${
            loading ? 'text-yellow-400' :
            error ? 'text-red-400' :
            token ? 'text-green-400' :
            'text-slate-400'
          }`}>
            {loading ? 'Cargando...' :
             error ? 'Error' :
             token ? 'Activo' :
             'Inactivo'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Estado:</span>
          <span className="text-slate-300">
            {token ? 'Token obtenido' : 'Sin token'}
          </span>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/20 rounded">
            <p className="text-red-400 text-xs">Error: {error}</p>
          </div>
        )}
      </div>

      <details className="mt-2">
        <summary className="text-xs text-slate-400 cursor-pointer">
          Ver instrucciones
        </summary>
        <div className="mt-2 text-xs text-slate-400 space-y-1">
          <p>1. Ve a <strong>Perfil → Notificaciones</strong></p>
          <p>2. Haz clic en <strong>&ldquo;Activar Notificaciones&rdquo;</strong></p>
          <p>3. Permite los permisos del navegador</p>
          <p>4. El token aparecerá aquí automáticamente</p>
        </div>
      </details>
    </div>
  );
};

export default NotificationDebug;