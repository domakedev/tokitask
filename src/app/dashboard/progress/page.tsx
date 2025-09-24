"use client";
import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import ProgressView from "../../../components/ProgressView";
import FirebaseErrorScreen from "../../../components/FirebaseErrorScreen";
import Icon from "../../../components/Icon";

export default function ProgressPage() {
  const router = useRouter();
  const { user, userData, loading, authError } = useAuth();

  // Handle redirect to login when user is not authenticated
  useEffect(() => {
    if (!loading && (!user || !userData)) {
      router.push("/");
    }
  }, [user, userData, loading, router]);

  const progressViewComponent = useMemo(() => {
    if (!userData) return null;
    return <ProgressView userData={userData} onNavigate={() => {}} />;
  }, [userData]);

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
  if (loading || !user || !userData) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {progressViewComponent}
    </div>
  );
}