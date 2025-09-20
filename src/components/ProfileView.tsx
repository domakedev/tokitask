import React from "react";
import { User } from "firebase/auth";
import NotificationSettings from "./NotificationSettings";

interface ProfileViewProps {
  user: User | null;
  onSignOut: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onSignOut }) => {
  return (
    <div>
      <header className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white">Perfil</h1>
      </header>
      <main className="px-4 sm:px-6 mt-4 space-y-6">
        {user && (
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-400">Sesión iniciada como:</p>
            <p className="font-semibold text-white truncate">
              {user.email}
            </p>
          </div>
        )}

        {/* Configuración de Notificaciones */}
        <NotificationSettings userId={user?.uid || null} />

        <button
          onClick={onSignOut}
          className="w-full bg-rose-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-75 transition-colors"
        >
          Cerrar Sesión
        </button>
      </main>
    </div>
  );
};

export default ProfileView;