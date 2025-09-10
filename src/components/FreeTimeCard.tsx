import React from 'react';
import Icon from './Icon';

interface FreeTimeCardProps {
    duration: string;
}

const FreeTimeCard: React.FC<FreeTimeCardProps> = ({ duration }) => {
    return (
        <div className="mt-4 p-4 rounded-lg border border-dashed border-sky-500/30 bg-sky-900/20 flex items-center space-x-4">
            <div className="flex-shrink-0">
                <Icon name="coffee" className="h-6 w-6 text-sky-400" />
            </div>
            <div className="flex-grow">
                <p className="font-semibold text-white">Tiempo Libre</p>
                <p className="text-sm text-sky-300">{duration}</p>
            </div>
        </div>
    );
};

export default FreeTimeCard;
