import React from "react";
import Icon from "./Icon";

interface ApiErrorScreenProps {
  error: string;
}

const ApiErrorScreen: React.FC<ApiErrorScreenProps> = ({ error }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 text-center">
        <Icon
          name="alert-triangle"
          className="h-16 w-16 text-yellow-500 mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-white mb-4">
          Configuración Incompleta
        </h1>
        <p className="text-slate-300 mb-6 leading-relaxed">
          {error}
        </p>
        <div className="bg-slate-700 rounded-lg p-4 text-left">
          <h3 className="text-sm font-semibold text-white mb-2">
            Para configurar la API key:
          </h3>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
            <li>Ve al archivo <code className="bg-slate-600 px-1 rounded">.env.local</code></li>
            <li>Agrega tu API key de Google Gemini:</li>
            <li><code className="bg-slate-600 px-1 rounded block mt-2">GEMINI_API_KEY=tu_api_key_aqui</code></li>
            <li>Reinicia el servidor de desarrollo</li>
          </ol>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Obtén tu API key en: <a
            href="https://makersuite.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Google AI Studio
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApiErrorScreen;