import React, { useState, useEffect } from 'react';
import { BaseTask, Priority, getPriorityLabel, WeekDay, WEEKDAY_LABELS, WEEKDAY_ORDER } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { parseDurationToMinutes, calculateTimeDifferenceInMinutes, formatDateString } from '../utils/dateUtils';
import Badge from './Badge';
import Icon from './Icon';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: Omit<BaseTask, 'id'> | BaseTask, selectedDays?: WeekDay[]) => void;
    taskToEdit?: BaseTask | null;
    showDaySelection?: boolean;
    currentDay?: WeekDay;
    initialScheduledDate?: string;
    showScheduledDateField?: boolean;
    currentView?: string; // 'day', 'general-week', 'general-calendar', etc.
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, taskToEdit, showDaySelection = false, currentDay, initialScheduledDate, showScheduledDateField = false, currentView }) => {
    const [name, setName] = useState('');
    const [duration, setDuration] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.High);
    const [flexibleTime, setFlexibleTime] = useState(true);
    const [isHabit, setIsHabit] = useState(false);
    const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [validationError, setValidationError] = useState('');
    const isEditing = !!taskToEdit;

    useEffect(() => {
        if (isOpen) {
            setValidationError(''); // Reset error on open
            if (isEditing) {
                setName(taskToEdit.name);
                // Convert duration to HH:MM format
                const minutes = parseDurationToMinutes(taskToEdit.baseDuration);
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                
                setDuration(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
                setPriority(taskToEdit.priority);
                setFlexibleTime(taskToEdit.flexibleTime ?? true);
                setIsHabit(taskToEdit.isHabit ?? false);
                setStartTime(taskToEdit.startTime || '');
                setEndTime(taskToEdit.endTime || '');
                setScheduledDate(taskToEdit.scheduledDate || '');
                // For editing, don't show day selection or preselect days
                setSelectedDays([]);
            } else {
                // Reset form for adding a new task
                setName('');
                setDuration('00:10');
                setPriority(Priority.High);
                setFlexibleTime(true);
                setIsHabit(false);
                setStartTime('');
                setEndTime('');
                setScheduledDate(initialScheduledDate || '');
                // Preselect current day if provided
                setSelectedDays(currentDay ? [currentDay] : []);
            }
        }
    }, [isOpen, taskToEdit, isEditing, currentDay]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !duration.trim()) return;

        // Validación: duración mínima de 10 minutos
        const totalMinutes = parseDurationToMinutes(duration);
        if (totalMinutes < 10) {
            setValidationError('La duración mínima es de 10 minutos.');
            return;
        }

        // Validación: si hay startTime y endTime y el tiempo es fijo, la duración base no puede exceder la diferencia
        if (startTime && endTime && !flexibleTime) {
            const durationMinutes = parseDurationToMinutes(duration);
            const timeDiffMinutes = calculateTimeDifferenceInMinutes(startTime, endTime);

            if (timeDiffMinutes <= 0) {
                setValidationError('La hora de fin debe ser posterior a la hora de inicio.');
                return;
            }

            if (durationMinutes > timeDiffMinutes) {
                setValidationError(`La duración de ${duration} no puede ser mayor que el tiempo disponible entre ${startTime} y ${endTime} (${Math.floor(timeDiffMinutes / 60)}h ${timeDiffMinutes % 60}min) ya que el tiempo es fijo.`);
                return;
            }
        }

        setValidationError(''); // Limpiar error si pasa validación

        const taskData = {
            name,
            baseDuration: duration,
            priority,
            flexibleTime,
            isHabit,
            startTime: startTime || '',
            endTime: endTime || '',
            scheduledDate: showScheduledDateField ? (scheduledDate || "") : (taskToEdit?.scheduledDate || ""), // Mantener fecha existente si no se puede editar
        };

        if (isEditing) {
            onSubmit({ ...taskToEdit, ...taskData });
        } else {
            onSubmit({ ...taskData, progressId: generateUniqueId() }, showDaySelection ? selectedDays : undefined);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md transition-transform duration-300 transform scale-100 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">{isEditing ? 'Editar Tarea' : 'Agrega una Nueva Tarea'}</h2>
                </div>
                <div className="px-6 pb-6 overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="task-name" className="block text-sm font-medium text-slate-300 mb-1">¿Qué tarea quieres hacer?</label>
                            <input type="text" id="task-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Revisar emails" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                            <div className="mt-1 p-3 bg-yellow-500 rounded-md">
                                <p className="text-xs text-slate-800">
                                    Los hábitos deben tener exactamente el mismo nombre en los diferentes días para agruparse en el Habit Tracker.
                                </p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Cuánto tiempo de tu día crees que tomará</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="task-hours" className="block text-xs font-medium text-slate-400 mb-1">Horas</label>
                                    <select
                                        id="task-hours"
                                        value={duration.split(':')[0] || '0'}
                                        onChange={(e) => {
                                            const hours = e.target.value;
                                            const minutes = duration.split(':')[1] || '00';
                                            setDuration(`${hours}:${minutes}`);
                                        }}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    >
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <option key={i} value={i.toString().padStart(2, '0')}>
                                                {i.toString().padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="task-minutes" className="block text-xs font-medium text-slate-400 mb-1">Minutos</label>
                                    <select
                                        id="task-minutes"
                                        value={duration.split(':')[1] || '00'}
                                        onChange={(e) => {
                                            const hours = duration.split(':')[0] || '00';
                                            const minutes = e.target.value;
                                            setDuration(`${hours}:${minutes}`);
                                        }}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    >
                                        {[0, 10, 20, 30, 40, 50].map((min) => (
                                            <option key={min} value={min.toString().padStart(2, '0')}>
                                                {min.toString().padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Campos de horario opcionales */}
                        <div className="mb-4 flex items-end gap-4 justify-between">
                            <div>
                                <label htmlFor="start-time" className="block text-xs font-medium text-slate-300 mb-1">Hora de inicio (opcional)</label>
                                <input
                                    type="time"
                                    id="start-time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    min="00:01"
                                    max="23:59"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            {/* si existe hora de inicio/fin, mostrar botón de limpiar */}
                            {(startTime || endTime) && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => { setStartTime(''); setEndTime(''); }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 text-slate-400 hover:text-slate-300 hover:bg-red-600 rounded transition-colors"
                                >
                                    <Icon name="cleaningbrush" className="h-3 w-3" />
                                    Limpiar
                                </button>
                            </div>
                            )}
                            <div>
                                <label htmlFor="end-time" className="block text-xs font-medium text-slate-300 mb-1">Hora de fin (opcional)</label>
                                <input
                                    type="time"
                                    id="end-time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    min="00:01"
                                    max="23:59"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        
                        </div>

                        {showScheduledDateField ? (
                            <div className="mb-4">
                                <label htmlFor="scheduled-date" className="block text-sm font-medium text-slate-300 mb-1">Fecha específica</label>
                                <input
                                    type="date"
                                    id="scheduled-date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Selecciona la fecha para esta tarea programada</p>
                            </div>
                        ) : (
                            isEditing && taskToEdit?.scheduledDate && (
                                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <p className="text-sm text-amber-300">
                                        <Icon name="informationcircle" className="inline mr-2 h-4 w-4" />
                                        Esta tarea tiene una fecha programada &quot;{taskToEdit.scheduledDate}.&quot; 
                                        Para cambiarla, ve a <strong>Configurar Horario → Calendario</strong>.
                                    </p>
                                </div>
                            )
                        )}

                         <div className="mb-6">
                             <label className="block text-sm font-medium text-slate-300 mb-3">
                                 ¿Este tiempo es fijo o flexible?
                             </label>
                             <div className="flex items-center gap-4">
                                 <div className="flex flex-col gap-2 min-w-20">
                                     <Badge
                                         label="Flexible"
                                         icon="bird"
                                         variant="flexible"
                                         selected={flexibleTime}
                                         onClick={() => setFlexibleTime(true)}
                                     />
                                     <Badge
                                         label="Fijo"
                                         icon="lock"
                                         variant="fixed"
                                         selected={!flexibleTime}
                                         onClick={() => setFlexibleTime(false)}
                                     />
                                 </div>
                                 <div className="flex-1 p-3 bg-slate-700 rounded-md">
                                     <p className="text-xs text-slate-400">
                                         {flexibleTime
                                             ? "La IA ajustará la duración recomendada."
                                             : "La IA no te recomendará cambios en la duración."
                                         }
                                     </p>
                                 </div>
                             </div>
                         </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-2">¿Es un hábito?</label>
                            <div className="flex items-center gap-4">
                                <div className="min-w-20">

                                <Badge
                                    label="Hábito"
                                    icon="repeat"
                                    variant={currentView !== 'day' ? 'habit' : 'blocked'}
                                    selected={isHabit}
                                    onClick={() => currentView !== 'day' && setIsHabit(!isHabit)}
                                    />
                                </div>
                                <div className="flex-1 p-2 bg-slate-700 rounded-md">
                                    <p className="text-xs text-slate-400">
                                        {currentView === 'day'
                                            ? 'Los hábitos se definen en Configurar Horario -> Semana para mantener su repetición semanal.'
                                            : 'Los hábitos se mostrarán en la vista de Progreso para seguimiento continuo.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="task-priority" className="block text-sm font-medium text-slate-300 mb-1">¿Qué tan importante es?</label>
                            <select id="task-priority" value={priority.toString()} onChange={(e) => setPriority(Number(e.target.value) as Priority)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value={Priority.High.toString()}>{getPriorityLabel(Priority.High)}</option>
                                <option value={Priority.Medium.toString()}>{getPriorityLabel(Priority.Medium)}</option>
                                <option value={Priority.Low.toString()}>{getPriorityLabel(Priority.Low)}</option>
                            </select>
                        </div>
                        {showDaySelection && !isEditing && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-3">¿En qué días quieres repetir esta tarea?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {WEEKDAY_ORDER.filter(day => day !== WeekDay.All).map(day => (
                                        <label key={day} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedDays.includes(day)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedDays([...selectedDays, day]);
                                                    } else {
                                                        setSelectedDays(selectedDays.filter(d => d !== day));
                                                    }
                                                }}
                                                className="mr-2 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-600"
                                            />
                                            <span className="text-sm font-medium text-slate-300">{WEEKDAY_LABELS[day]}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-2 p-2 bg-slate-700 rounded-md">
                                    <p className="text-xs text-slate-400">
                                        Selecciona uno o más días. La tarea se creará en cada día seleccionado.
                                    </p>
                                </div>
                            </div>
                        )}
                        {validationError && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-md">
                                <p className="text-sm text-red-400">{validationError}</p>
                            </div>
                        )}
                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 rounded-md hover:bg-slate-500 font-semibold transition-colors">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 rounded-md hover:bg-emerald-500 font-semibold transition-colors">{isEditing ? 'Guardar Cambios' : 'Agregar Tarea'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;