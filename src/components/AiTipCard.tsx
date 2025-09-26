
import React from 'react';
import Icon from './Icon';

interface AiTipCardProps {
    tip: string;
    type?: 'tip' | 'warning';
    onDismiss: () => void;
}

const AiTipCard: React.FC<AiTipCardProps> = ({ tip, type = 'tip', onDismiss }) => {
    const isWarning = type === 'warning';
    return (
        <div className={`bg-slate-800/50 border rounded-lg p-4 flex items-start space-x-3 mb-4 relative ${isWarning ? 'border-red-700' : 'border-slate-700'}`}>
            <div className="flex-shrink-0 pt-0.5">
                <Icon name={isWarning ? "alert-triangle" : "lightbulb"} className={`h-5 w-5 ${isWarning ? 'text-red-400' : 'text-yellow-400'}`} />
            </div>
            <div>
                <h3 className="font-semibold text-white">{isWarning ? 'Advertencia' : 'Consejo del Día'}</h3>
                <p className="text-sm text-slate-300 mt-1">{tip}</p>
            </div>
            <button onClick={onDismiss} className="absolute top-2 right-2 text-slate-500 hover:text-slate-300" aria-label="Cerrar">
                <Icon name="x" className="h-4 w-4" />
            </button>
        </div>
    );
};

export default AiTipCard;
