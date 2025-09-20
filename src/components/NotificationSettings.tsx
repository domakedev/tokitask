import React, { useState, useCallback, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import Icon from './Icon';

interface NotificationSettingsProps {
  userId?: string;
  userData: {
    phoneNumber?: string;
    whatsappConfigured?: boolean;
  };
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId, userData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  console.log('🎯 NotificationSettings - Props recibidas:', { userId, userData });

  // Cargar configuración de WhatsApp del usuario
  useEffect(() => {
    console.log('🔄 useEffect - userData:', userData);

    if (userData) {
      // Cargar el estado desde los datos del usuario
      const isConfigured = userData.whatsappConfigured || false;
      const phoneNumberFromData = userData.phoneNumber || '';

      console.log('📱 Configuración cargada:', {
        isConfigured,
        phoneNumberFromData,
        hasPhoneNumber: !!phoneNumberFromData
      });

      setWhatsappConfigured(isConfigured);

      // Si ya tiene número configurado, mostrarlo
      if (phoneNumberFromData) {
        setPhoneNumber(phoneNumberFromData);
      }

      // Si no está configurado, permitir edición por defecto
      if (!isConfigured) {
        setIsEditing(true);
      } else {
        setIsEditing(false); // Asegurar que no esté en modo edición si ya está configurado
      }
    } else {
      console.log('⚠️ userData es null/undefined');
      // Si no hay userData, asumir no configurado
      setWhatsappConfigured(false);
      setIsEditing(true);
      setPhoneNumber('');
    }
  }, [userData]);

  // Función para formatear el número de teléfono para mostrar
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Mostrar solo los últimos 4 dígitos por seguridad
    return `+${phone.replace(/\D/g, '').replace(/(\d{2})\d*(\d{4})$/, '$1****$2')}`;
  };

  // Función para iniciar edición
  const startEditing = () => {
    setIsEditing(true);
  };

  // Función para cancelar edición
  const cancelEditing = () => {
    console.log('❌ Cancelando edición - userData:', userData);
    setIsEditing(false);
    setError(null);
    // Restaurar el número original desde userData
    if (userData?.phoneNumber) {
      console.log('📱 Restaurando número:', userData.phoneNumber);
      setPhoneNumber(userData.phoneNumber);
    } else {
      console.log('⚠️ No hay número para restaurar');
    }
  };

  const configureWhatsApp = useCallback(async () => {
    if (!userId || !phoneNumber.trim()) {
      setError('Ingresa un número de teléfono válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Usar llamada HTTP directa a la función
      const response = await fetch('https://us-central1-tokitask-com.cloudfunctions.net/configureWhatsAppHTTP', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          userId: userId
        })
      });

      const data = await response.json();

      if (data.success) {
        setWhatsappConfigured(true);
        setIsEditing(false); // Salir del modo edición
        setError(null);
        console.log('✅ WhatsApp configurado exitosamente');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      const error = err as Error;
      const errorMessage = error.message || 'Error configurando WhatsApp';
      setError(errorMessage);
      console.error('❌ Error configurando WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, phoneNumber]);


  if (!userId) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="message-circle" className="h-5 w-5 text-green-400" />
          <h3 className="text-sm font-medium text-slate-200">
            Notificaciones WhatsApp
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {whatsappConfigured && (
            <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
              ✓ Configurado
            </span>
          )}
          {loading && (
            <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Recibe recordatorios automáticos de tus tareas calendarTasks por WhatsApp.
        Se ejecuta diariamente a las 6:00 AM.
      </p>

      {whatsappConfigured && !isEditing ? (
        // Estado configurado - mostrar información y opción de editar
        <div className="space-y-3">
          <div className="bg-green-900/20 border border-green-500/20 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="check-circle" className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  WhatsApp configurado
                </span>
              </div>
              <button
                onClick={startEditing}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Editar
              </button>
            </div>
            <div className="text-xs text-slate-300">
              <p>Número: <span className="font-mono">{formatPhoneNumber(phoneNumber)}</span></p>
              <p className="text-slate-400 mt-1">
                Recibirás recordatorios diarios a las 6:00 AM
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Estado de configuración/edición
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Número de teléfono (con código de país)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+51912345678"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={configureWhatsApp}
              disabled={loading || !phoneNumber.trim()}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white text-xs rounded transition-colors"
            >
              <Icon name="message-circle" className="h-3 w-3" />
              {loading ? 'Guardando...' : whatsappConfigured ? 'Actualizar' : 'Configurar WhatsApp'}
            </button>

            {whatsappConfigured && isEditing && (
              <button
                onClick={cancelEditing}
                disabled={loading}
                className="px-3 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 text-white text-xs rounded transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded p-2 mt-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;