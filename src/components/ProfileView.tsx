import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { getUserData } from "../services/firestoreService";
import { UserData } from "../types";
import NotificationSettings from "./NotificationSettings";

interface ProfileViewProps {
  user: User | null;
  onSignOut: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onSignOut }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        setLoading(true);
        try {
          const data = await getUserData(user.uid);
          setUserData(data);
          console.log("📊 Datos de usuario cargados desde Firestore:", data);
        } catch (error) {
          console.error("❌ Error cargando datos de usuario:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserData();
  }, [user?.uid]);

  console.log("🚀 ~ ProfileView ~ user:", user)
  console.log("🚀 ~ ProfileView ~ userData:", userData)
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
        {/* {loading ? (
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-xs text-slate-400 text-center mt-2">Cargando configuración...</p>
          </div>
        ) : (
          <NotificationSettings
            userId={user?.uid || ''}
            userData={{
              phoneNumber: userData?.phoneNumber,
              whatsappConfigured: userData?.whatsappConfigured,
            }}
          />
        )} */}

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