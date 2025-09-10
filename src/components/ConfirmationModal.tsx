
import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={onCancel}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm transition-transform duration-300 transform scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                <p className="text-slate-300 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-600 rounded-md hover:bg-slate-500 font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm}
                        className="px-4 py-2 bg-emerald-600 rounded-md hover:bg-emerald-500 font-semibold transition-colors"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
