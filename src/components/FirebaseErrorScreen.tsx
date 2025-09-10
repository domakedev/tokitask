import React from 'react';
import Icon from './Icon';

const FirebaseErrorScreen: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 p-4">
            <div className="w-full max-w-md mx-auto text-center bg-slate-800 rounded-lg shadow-xl p-8">
                <Icon name="server-crash" className="h-16 w-16 text-rose-500 mx-auto" />
                <h1 className="text-3xl font-bold text-white mt-6">Ups! Error en el servidor.</h1>
                <p className="text-slate-400 mt-4">
                    No pudimos conectar con nuestros servicios. Esto puede deberse a una configuración incorrecta.
                </p>
                <p className="text-slate-400 mt-2">
                    Por favor, contacta con el creador: <a href="https://domakedev.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 hover:underline">domakedev.com</a>
                </p>
            </div>
        </div>
    );
};

export default FirebaseErrorScreen;
