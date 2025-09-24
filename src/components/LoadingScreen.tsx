import React from "react";
import Icon from "./Icon";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Cargando..."
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
      <Icon
        name="loader"
        className="h-12 w-12 animate-spin text-emerald-400 mb-4"
      />
      <p className="text-lg text-white font-semibold">{message}</p>
    </div>
  );
};

export default LoadingScreen;