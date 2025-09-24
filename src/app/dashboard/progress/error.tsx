"use client";
import React from "react";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-4">
          ¡Ups! Algo salió mal
        </h1>
        <p className="text-slate-400 mb-6">
          Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}