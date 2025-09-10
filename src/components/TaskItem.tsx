import React from 'react';
import { BaseTask, DayTask, Priority } from '../types';
import Icon from './Icon';

interface TaskItemProps {
    task: DayTask | (BaseTask & { completed?: boolean; isCurrent?: boolean });
    isDaily: boolean;
    onToggleComplete?: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit?: (id: number) => void;
}

const getPriorityClass = (priority: Priority): string => {
    switch (priority) {
        case Priority.High: return 'bg-red-500/20 text-red-400 border-red-500/30';
        case Priority.Medium: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case Priority.Low: return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
        default: return 'bg-slate-600 text-slate-300';
    }
};

const TaskItem: React.FC<TaskItemProps & React.HTMLAttributes<HTMLDivElement>> = ({ task, isDaily, onToggleComplete, onDelete, onEdit, className, ...divProps }) => {
    
    const getTaskSpecificClasses = () => {
        if (!isDaily) {
            return 'border-slate-600 bg-slate-800';
        }
        if (task.completed) {
            // Fainter border and opacity for completed tasks
            return 'border-slate-700 bg-slate-800 opacity-50';
        }
        if (task.isCurrent) {
            // Prominent border for the current task
            return 'border-emerald-500 bg-slate-800';
        }
        // Default style for pending tasks
        return 'border-slate-600 bg-slate-800';
    };

    const taskClasses = [
        'p-4', 'rounded-lg', 'border', 'flex', 'items-center', 'space-x-4', 'transition-all', 'duration-300', 'shadow-sm', 'group', 'cursor-grab',
        getTaskSpecificClasses(),
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={taskClasses} {...divProps}>
            {isDaily ? (
                <button 
                    onClick={() => onToggleComplete?.(task.id)}
                    className="flex-shrink-0 h-6 w-6 rounded flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 cursor-pointer"
                    aria-label={task.completed ? "Marcar tarea como incompleta" : "Marcar tarea como completa"}
                >
                    {task.completed ? (
                        <div className="h-full w-full rounded bg-rose-600 flex items-center justify-center">
                            <Icon name="check" className="h-4 w-4 text-white" />
                        </div>
                    ) : (
                        <div className="h-full w-full rounded border-2 border-slate-400 group-hover:border-white transition-colors"></div>
                    )}
                </button>
            ) : (
                <div className="flex-shrink-0 cursor-grab">
                    <Icon name="grip-vertical" className="text-slate-500 h-5 w-5" />
                </div>
            )}

            <div className="flex-grow">
                <p className={`font-semibold text-white ${isDaily && task.completed ? 'line-through' : ''}`}>
                    {task.name}
                </p>
                <div className="flex items-center text-sm text-slate-400 mt-1 space-x-4">
                    <span>Base: {task.baseDuration}</span>
                    {isDaily && 'aiDuration' in task && <span>Organizado IA: {task.aiDuration}</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getPriorityClass(task.priority)}`}>
                        {task.priority}
                    </span>
                </div>
            </div>

            <div className="flex items-center space-x-2 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onEdit?.(task.id)}
                    className="p-2 rounded-md hover:bg-slate-700 hover:text-white transition-colors"
                    aria-label="Editar tarea"
                >
                    <Icon name="pencil" className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(task.id)} className="p-2 rounded-md hover:bg-red-700 hover:text-white transition-colors">
                    <Icon name="trash2" className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default TaskItem;