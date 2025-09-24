import React, { useState, useEffect } from 'react';
import { BaseTask, Priority, getPriorityLabel, WeekDay, WEEKDAY_LABELS, WEEKDAY_ORDER } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { parseDurationToMinutes, calculateTimeDifferenceInMinutes, formatDateString } from '../utils/dateUtils';
import Badge from './Badge';
import Icon from './Icon';

// Función auxiliar para sumar minutos a una hora y devolver la nueva hora en formato HH:MM
const addMinutesToTime = (time: string, minutesToAdd: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

// Función auxiliar para calcular duración entre dos horas, redondeando minutos a múltiplo de 10 más cercano
const calculateDurationFromTimes = (startTime: string, endTime: string): string => {
    const diffMinutes = calculateTimeDifferenceInMinutes(startTime, endTime);
    if (diffMinutes <= 0) return '00:00';
    const hours = Math.floor(diffMinutes / 60);
    const mins = Math.round((diffMinutes % 60) / 10) * 10; // Redondear a múltiplo de 10
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Función para convertir de 24 horas a 12 horas
const convertTo12Hour = (hour24: string) => {
    const h = parseInt(hour24, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour12: hour12.toString().padStart(2, '0'), ampm };
};

// Función para convertir de 12 horas a 24 horas
const convertTo24Hour = (hour12: string, ampm: string) => {
    let h = parseInt(hour12, 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h.toString().padStart(2, '0');
};

// Opciones para horas en formato 12 horas (no usado, pero mantener por si acaso)
const hourOptions = [
    { value: '00', label: '12 AM' },
    { value: '01', label: '1 AM' },
    { value: '02', label: '2 AM' },
    { value: '03', label: '3 AM' },
    { value: '04', label: '4 AM' },
    { value: '05', label: '5 AM' },
    { value: '06', label: '6 AM' },
    { value: '07', label: '7 AM' },
    { value: '08', label: '8 AM' },
    { value: '09', label: '9 AM' },
    { value: '10', label: '10 AM' },
    { value: '11', label: '11 AM' },
    { value: '12', label: '12 PM' },
    { value: '13', label: '1 PM' },
    { value: '14', label: '2 PM' },
    { value: '15', label: '3 PM' },
    { value: '16', label: '4 PM' },
    { value: '17', label: '5 PM' },
    { value: '18', label: '6 PM' },
    { value: '19', label: '7 PM' },
    { value: '20', label: '8 PM' },
    { value: '21', label: '9 PM' },
    { value: '22', label: '10 PM' },
    { value: '23', label: '11 PM' },
];

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
    const [startHour12, setStartHour12] = useState('');
    const [startAmPm, setStartAmPm] = useState('');
    const [startMinutes, setStartMinutes] = useState('');
    const [endHour12, setEndHour12] = useState('');
    const [endAmPm, setEndAmPm] = useState('');
    const [endMinutes, setEndMinutes] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [validationError, setValidationError] = useState('');
    const isEditing = !!taskToEdit;

    // Función para manejar cambios en startTime y calcular automáticamente endTime o duration
    const handleStartTimeChange = (value: string) => {
        if (value && endTime) {
            // Si hay endTime, calcular duration
            const newDuration = calculateDurationFromTimes(value, endTime);
            setDuration(newDuration);
        } else if (value && duration) {
            // Si hay duration, calcular endTime
            const durationMinutes = parseDurationToMinutes(duration);
            const newEndTime = addMinutesToTime(value, durationMinutes);
            setEndTime(newEndTime);
            // También actualizar endHour12, endAmPm y endMinutes
            const [h, m] = newEndTime.split(':');
            const { hour12, ampm } = convertTo12Hour(h);
            setEndHour12(hour12);
            setEndAmPm(ampm);
            setEndMinutes(m);
        }
    };

    // Función para manejar cambios en endTime y calcular automáticamente startTime o duration
    const handleEndTimeChange = (value: string) => {
        if (value && startTime) {
            // Si hay startTime, calcular duration
            const newDuration = calculateDurationFromTimes(startTime, value);
            setDuration(newDuration);
        } else if (value && duration) {
            // Si hay duration, calcular startTime
            const durationMinutes = parseDurationToMinutes(duration);
            const newStartTime = addMinutesToTime(value, -durationMinutes);
            setStartTime(newStartTime);
            // También actualizar startHour12, startAmPm y startMinutes
            const [h, m] = newStartTime.split(':');
            const { hour12, ampm } = convertTo12Hour(h);
            setStartHour12(hour12);
            setStartAmPm(ampm);
            setStartMinutes(m);
        }
    };

    // Función para manejar cambios en duration y calcular endTime si hay startTime
    const handleDurationChange = (newDuration: string) => {
        setDuration(newDuration);
        if (startTime) {
            const durationMinutes = parseDurationToMinutes(newDuration);
            const newEndTime = addMinutesToTime(startTime, durationMinutes);
            setEndTime(newEndTime);
            // También actualizar endHour12, endAmPm y endMinutes
            const [h, m] = newEndTime.split(':');
            const { hour12, ampm } = convertTo12Hour(h);
            setEndHour12(hour12);
            setEndAmPm(ampm);
            setEndMinutes(m);
        }
    };

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
                if (taskToEdit.startTime) {
                    const [h, m] = taskToEdit.startTime.split(':');
                    const { hour12, ampm } = convertTo12Hour(h);
                    setStartHour12(hour12);
                    setStartAmPm(ampm);
                    setStartMinutes(m);
                } else {
                    setStartHour12('');
                    setStartAmPm('');
                    setStartMinutes('');
                }
                if (taskToEdit.endTime) {
                    const [h, m] = taskToEdit.endTime.split(':');
                    const { hour12, ampm } = convertTo12Hour(h);
                    setEndHour12(hour12);
                    setEndAmPm(ampm);
                    setEndMinutes(m);
                } else {
                    setEndHour12('');
                    setEndAmPm('');
                    setEndMinutes('');
                }
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
                setStartHour12('');
                setStartAmPm('');
                setStartMinutes('');
                setEndHour12('');
                setEndAmPm('');
                setEndMinutes('');
                setScheduledDate(initialScheduledDate || '');
                // Preselect current day if provided
                setSelectedDays(currentDay ? [currentDay] : []);
            }
        }
    }, [isOpen, taskToEdit, isEditing, currentDay]);

    // useEffect para sincronizar startTime con startHour12, startAmPm y startMinutes
    useEffect(() => {
        if (startHour12 && startAmPm && startMinutes) {
            const startHours = convertTo24Hour(startHour12, startAmPm);
            const newStartTime = `${startHours}:${startMinutes}`;
            setStartTime(newStartTime);
            handleStartTimeChange(newStartTime);
        } else {
            setStartTime('');
        }
    }, [startHour12, startAmPm, startMinutes]);

    // useEffect para sincronizar endTime con endHour12, endAmPm y endMinutes
    useEffect(() => {
        if (endHour12 && endAmPm && endMinutes) {
            const endHours = convertTo24Hour(endHour12, endAmPm);
            const newEndTime = `${endHours}:${endMinutes}`;
            setEndTime(newEndTime);
            handleEndTimeChange(newEndTime);
        } else {
            setEndTime('');
        }
    }, [endHour12, endAmPm, endMinutes]);

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
                                            handleDurationChange(`${hours}:${minutes}`);
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
                                            handleDurationChange(`${hours}:${minutes}`);
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
                                <label className="block text-xs font-medium text-slate-300 mb-1">Hora de inicio (opcional)</label>
                                <div className="flex gap-2 mb-2">
                                    <div className="flex-1">
                                        <label htmlFor="start-hours" className="block text-xs font-medium text-slate-400 mb-1">Horas</label>
                                        <select
                                            id="start-hours"
                                            value={startHour12}
                                            onChange={(e) => {
                                                setStartHour12(e.target.value);
                                                if (e.target.value && !startMinutes) setStartMinutes('00');
                                            }}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">--</option>
                                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((hour) => (
                                                <option key={hour} value={hour}>
                                                    {hour}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="start-minutes" className="block text-xs font-medium text-slate-400 mb-1">Minutos</label>
                                        <select
                                            id="start-minutes"
                                            value={startMinutes}
                                            onChange={(e) => setStartMinutes(e.target.value)}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">--</option>
                                            {[0, 10, 20, 30, 40, 50].map((min) => (
                                                <option key={min} value={min.toString().padStart(2, '0')}>
                                                    {min.toString().padStart(2, '0')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Badge
                                        label="AM"
                                        selected={startAmPm === 'AM'}
                                        onClick={() => {
                                            setStartAmPm('AM');
                                            if (!startMinutes) setStartMinutes('00');
                                        }}
                                        variant="hour"
                                    />
                                    <Badge
                                        label="PM"
                                        selected={startAmPm === 'PM'}
                                        onClick={() => {
                                            setStartAmPm('PM');
                                            if (!startMinutes) setStartMinutes('00');
                                        }}
                                        variant="hour"
                                    />
                                </div>
                            </div>
                            {/* si existe hora de inicio/fin, mostrar botón de limpiar */}
                            {(startTime || endTime) && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartTime('');
                                        setEndTime('');
                                        setStartHour12('');
                                        setStartAmPm('');
                                        setStartMinutes('');
                                        setEndHour12('');
                                        setEndAmPm('');
                                        setEndMinutes('');
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 text-slate-400 hover:text-slate-300 hover:bg-red-600 rounded transition-colors"
                                >
                                    <Icon name="cleaningbrush" className="h-3 w-3" />
                                    Limpiar
                                </button>
                            </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Hora de fin (opcional)</label>
                                <div className="flex gap-2 mb-2">
                                    <div className="flex-1">
                                        <label htmlFor="end-hours" className="block text-xs font-medium text-slate-400 mb-1">Horas</label>
                                        <select
                                            id="end-hours"
                                            value={endHour12}
                                            onChange={(e) => {
                                                setEndHour12(e.target.value);
                                                if (e.target.value && !endMinutes) setEndMinutes('00');
                                            }}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">--</option>
                                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((hour) => (
                                                <option key={hour} value={hour}>
                                                    {hour}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="end-minutes" className="block text-xs font-medium text-slate-400 mb-1">Minutos</label>
                                        <select
                                            id="end-minutes"
                                            value={endMinutes}
                                            onChange={(e) => setEndMinutes(e.target.value)}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">--</option>
                                            {[0, 10, 20, 30, 40, 50].map((min) => (
                                                <option key={min} value={min.toString().padStart(2, '0')}>
                                                    {min.toString().padStart(2, '0')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Badge
                                        label="AM"
                                        selected={endAmPm === 'AM'}
                                        onClick={() => {
                                            setEndAmPm('AM');
                                            if (!endMinutes) setEndMinutes('00');
                                        }}
                                        variant="hour"
                                    />
                                    <Badge
                                        label="PM"
                                        selected={endAmPm === 'PM'}
                                        onClick={() => {
                                            setEndAmPm('PM');
                                            if (!endMinutes) setEndMinutes('00');
                                        }}
                                        variant="hour"
                                    />
                                </div>
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