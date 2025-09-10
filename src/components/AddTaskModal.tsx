import React, { useState, useEffect } from 'react';
import { BaseTask, Priority } from '../types';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: Omit<BaseTask, 'id'> | BaseTask) => void;
    taskToEdit?: BaseTask | null;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, taskToEdit }) => {
    const [name, setName] = useState('');
    const [duration, setDuration] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.High);
    const isEditing = !!taskToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setName(taskToEdit.name);
                setDuration(taskToEdit.baseDuration);
                setPriority(taskToEdit.priority);
            } else {
                // Reset form for adding a new task
                setName('');
                setDuration('');
                setPriority(Priority.High);
            }
        }
    }, [isOpen, taskToEdit, isEditing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !duration.trim()) return;
        
        if (isEditing) {
            onSubmit({ ...taskToEdit, name, baseDuration: duration, priority });
        } else {
            onSubmit({ name, baseDuration: duration, priority });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-40 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md transition-transform duration-300 transform scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white mb-4">{isEditing ? 'Editar Tarea' : 'Añadir Nueva Tarea'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="task-name" className="block text-sm font-medium text-slate-300 mb-1">Nombre de la Tarea</label>
                        <input type="text" id="task-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="task-duration" className="block text-sm font-medium text-slate-300 mb-1">Duración (ej: 30 min, 1 h)</label>
                        <input type="text" id="task-duration" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="task-priority" className="block text-sm font-medium text-slate-300 mb-1">Prioridad</label>
                        <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value={Priority.High}>Alta</option>
                            <option value={Priority.Medium}>Media</option>
                            <option value={Priority.Low}>Baja</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 rounded-md hover:bg-slate-500 font-semibold transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 rounded-md hover:bg-emerald-500 font-semibold transition-colors">{isEditing ? 'Guardar Cambios' : 'Añadir Tarea'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;