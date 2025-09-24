"use client";
import React, { useMemo } from "react";
import { useAuthStore } from "../../../stores/authStore";
import ProgressView from "../../../components/ProgressView";
import Icon from "../../../components/Icon";

export default function ProgressPage() {
  const userData = useAuthStore(state => state.userData);

  const progressViewComponent = useMemo(() => {
    if (!userData) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
          <Icon
            name="loader"
            className="h-12 w-12 animate-spin text-emerald-400 mb-4"
          />
          <p className="text-lg text-white font-semibold">Cargando datos...</p>
        </div>
      );
    }
    return <ProgressView userData={userData} onNavigate={() => {}} />;
  }, [userData]);

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {progressViewComponent}
    </div>
  );
}