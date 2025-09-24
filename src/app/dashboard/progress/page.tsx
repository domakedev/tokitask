"use client";
import React, { useMemo } from "react";
import { useAuthStore } from "../../../stores/authStore";
import ProgressView from "../../../components/ProgressView";
import LoadingScreen from "../../../components/LoadingScreen";

export default function ProgressPage() {
  const userData = useAuthStore(state => state.userData);

  const progressViewComponent = useMemo(() => {
    if (!userData) {
      return <LoadingScreen message="Cargando datos..." />;
    }
    return <ProgressView userData={userData} onNavigate={() => {}} />;
  }, [userData]);

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {progressViewComponent}
    </div>
  );
}