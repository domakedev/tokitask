"use client";
import React, { useState } from "react";
import Icon from "./Icon";

interface AiTipForGeneralProps {
  opinion: string;
  isLoading?: boolean;
  onClose?: () => void;
}

export default function AiTipForGeneral({
  opinion,
  isLoading = false,
  onClose,
}: AiTipForGeneralProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="text-blue-700 font-medium">
            La IA está analizando tu horario...
          </p>
        </div>
      </div>
    );
  }

  if (!opinion) return null;

  const isLongText = opinion.length > 300;
  const displayText = isExpanded || !isLongText ? opinion : opinion.slice(0, 300) + "...";

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex-shrink-0">
            <Icon name="brain" className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-emerald-800 mb-2">
              Opinión de la IA sobre tu horario
            </h3>
            <div className="text-emerald-700 leading-relaxed whitespace-pre-wrap">
              {displayText}
            </div>
            {isLongText && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-emerald-600 hover:text-emerald-800 font-medium text-sm transition-colors duration-200"
              >
                {isExpanded ? "Mostrar menos" : "Leer más"}
              </button>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-emerald-100 transition-colors duration-200"
            aria-label="Cerrar"
          >
            <Icon name="x" className="h-4 w-4 text-emerald-600" />
          </button>
        )}
      </div>
    </div>
  );
}