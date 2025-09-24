import React from 'react';
import Icon from './Icon';

interface CongratulationsCardProps {
    completedCount: number;
    totalTasks: number;
}

const CongratulationsCard: React.FC<CongratulationsCardProps> = ({ completedCount, totalTasks }) => {
    const getMessage = () => {
        const ratio = completedCount / totalTasks;
        if (ratio === 1) {
            return {
                title: "🎉 ¡Felicidades! 🎉",
                message: "Has completado todas tus tareas del día. ¡Excelente trabajo! 🌟",
                icon: "trophy",
                bgClass: "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500",
                textClass: "text-white"
            };
        } else if (ratio >= 0.75) {
            return {
                title: "🚀 ¡Casi listo!",
                message: `Has completado ${completedCount} de ${totalTasks} tareas. ¡Estás cerca de terminar! 💪`,
                icon: "checkcircle",
                bgClass: "bg-gradient-to-r from-blue-400 to-purple-500",
                textClass: "text-white"
            };
        } else if (ratio >= 0.5) {
            return {
                title: "😊 ¡Vas bien!",
                message: `Has completado ${completedCount} de ${totalTasks} tareas. ¡Mitad del camino! 🎯`,
                icon: "thumbsup",
                bgClass: "bg-gradient-to-r from-green-400 to-blue-500",
                textClass: "text-white"
            };
        } else if (ratio >= 0.25) {
            return {
                title: "✨ ¡Buen progreso!",
                message: `Has completado ${completedCount} de ${totalTasks} tareas. ¡Sigue adelante! 🔥`,
                icon: "star",
                bgClass: "bg-gradient-to-r from-purple-400 to-pink-500",
                textClass: "text-white"
            };
        } else {
            return {
                title: "🌟 ¡Primeros pasos!",
                message: `Has completado ${completedCount} de ${totalTasks} tareas. ¡Cada uno cuenta! 😄`,
                icon: "smile",
                bgClass: "bg-gradient-to-r from-pink-400 to-yellow-500",
                textClass: "text-gray-800"
            };
        }
    };

    const { title, message, icon, bgClass, textClass } = getMessage();

    return (
        <div className={`${bgClass} border-0 rounded-lg p-4 flex items-start space-x-3 mb-4 relative shadow-lg animate-pulse-slow`}>
            <div className="flex-shrink-0 pt-1">
                <Icon name={icon} className="h-6 w-6 text-white drop-shadow-lg animate-bounce" />
            </div>
            <div className="flex-1">
                <h3 className={`font-bold text-lg ${textClass} drop-shadow-md`}>{title}</h3>
                <p className={`text-sm ${textClass} mt-1 opacity-90`}>{message}</p>
            </div>
            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
                    }
                    50% {
                        transform: scale(1.02);
                        box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
                    }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default CongratulationsCard;