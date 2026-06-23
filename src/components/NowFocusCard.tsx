import React from "react";
import { DayTask } from "../types";
import Icon from "./Icon";
import RemainingTime from "./RemainingTime";
import {
  parseDurationToMinutes,
  formatDurationToHuman,
} from "../utils/dateUtils";

interface NowFocusCardProps {
  task: DayTask;
  endOfDay: string;
  onComplete: (id: string) => void;
  onEdit?: (id: string) => void;
}

const NowFocusCard: React.FC<NowFocusCardProps> = ({
  task,
  endOfDay,
  onComplete,
  onEdit,
}) => {
  const aiMinutes = parseDurationToMinutes(task.aiDuration);
  const durationLabel =
    aiMinutes > 0 ? formatDurationToHuman(task.aiDuration) : task.baseDuration;

  return (
    <div className="rounded-xl border border-emerald-400/60 bg-gradient-to-br from-emerald-900/40 to-slate-800 p-4 md:p-5 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
          Ahora
        </span>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-400 leading-none mb-0.5">
            Te queda de día
          </p>
          <RemainingTime
            endOfDay={endOfDay}
            className="text-sm font-bold text-emerald-300"
          />
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-white mt-2 break-words">
        {task.name}
      </h2>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-200">
        <span className="flex items-center gap-1">
          <Icon name="timer" className="h-4 w-4 text-emerald-300" />
          {durationLabel}
          {aiMinutes > 0 && (
            <span className="text-emerald-300/80 text-xs ml-1">(IA)</span>
          )}
        </span>
        {task.startTime && task.endTime && (
          <span className="flex items-center gap-1">
            <Icon name="clock" className="h-4 w-4 text-emerald-300" />
            {task.startTime} - {task.endTime}
          </span>
        )}
        {task.isHabit && (
          <span className="flex items-center gap-1 text-purple-300">
            <Icon name="repeat" className="h-4 w-4" />
            Hábito
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => onComplete(task.id)}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
        >
          <Icon name="check" className="h-5 w-5" />
          Completar
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(task.id)}
            className="flex items-center justify-center p-3 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
            title="Editar tarea"
            aria-label="Editar tarea actual"
          >
            <Icon name="pencil" className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NowFocusCard;
