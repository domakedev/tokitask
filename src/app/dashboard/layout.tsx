"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../stores/authStore";
import BottomNav from "../../components/BottomNav";
import FirebaseErrorScreen from "../../components/FirebaseErrorScreen";
import Icon from "../../components/Icon";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  // Ejecutar el hook useAuth para configurar el listener
  useAuth();
  const user = useAuthStore(state => state.user);
  const userData = useAuthStore(state => state.userData);
  const loading = useAuthStore(state => state.loading);
  const authError = useAuthStore(state => state.authError);

  // Handle redirect to login when user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Icon
          name="loader"
          className="h-12 w-12 animate-spin text-emerald-400 mb-4"
        />
        <p className="text-lg text-white font-semibold">Cargando...</p>
      </div>
    );
  }

  if (authError) {
    return <FirebaseErrorScreen />;
  }

  // Don't render anything while loading or if redirecting
  if (loading || !user) {
    return null;
  }

  return (
    <>
      {children}
      <BottomNav profilePhotoUrl={user?.photoURL || undefined} />
    </>
  );
}