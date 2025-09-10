
import React from 'react';
import Icon from './Icon';

interface AiTipCardProps {
    tip: string;
    onDismiss: () => void;
}

const AiTipCard: React.FC<AiTipCardProps> = ({ tip, onDismiss }) => {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start space-x-3 mb-4 relative">
            <div className="flex-shrink-0 pt-0.5">
                <Icon name="lightbulb" className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
                <h3 className="font-semibold text-white">Consejo del Día</h3>
                <p className="text-sm text-slate-300 mt-1">{tip}</p>
            </div>
            <button onClick={onDismiss} className="absolute top-2 right-2 text-slate-500 hover:text-slate-300" aria-label="Cerrar consejo">
                <Icon name="x" className="h-4 w-4" />
            </button>
        </div>
    );
};

export default AiTipCard;
