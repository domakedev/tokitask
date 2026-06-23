import React from "react";
import Icon from "./Icon";

interface TimeBudgetBarProps {
  availableMinutes: number; // minutos hasta el fin del día
  requiredMinutes: number; // minutos que requieren las tareas pendientes
  isOrganized: boolean; // si las tareas ya tienen aiDuration
  isPastEndOfDay: boolean;
}

const formatMinutes = (mins: number): string => {
  const abs = Math.abs(Math.round(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
};

const TimeBudgetBar: React.FC<TimeBudgetBarProps> = ({
  availableMinutes,
  requiredMinutes,
  isOrganized,
  isPastEndOfDay,
}) => {
  const available = Math.max(0, availableMinutes);
  const overload = requiredMinutes - available; // > 0 => falta tiempo
  const fits = overload <= 0;
  const pct =
    available > 0 ? Math.min(100, Math.round((requiredMinutes / available) * 100)) : 100;

  // Tono según situación
  let barColor = "bg-emerald-500";
  let ring = "border-emerald-500/30 bg-emerald-900/10";
  let textColor = "text-emerald-300";

  if (!fits) {
    if (overload >= 120) {
      barColor = "bg-red-500";
      ring = "border-red-500/40 bg-red-900/10";
      textColor = "text-red-300";
    } else {
      barColor = "bg-amber-500";
      ring = "border-amber-500/40 bg-amber-900/10";
      textColor = "text-amber-300";
    }
  }

  if (isPastEndOfDay) {
    ring = "border-slate-600 bg-slate-800/40";
    textColor = "text-slate-300";
  }

  let message: string;
  if (isPastEndOfDay) {
    message =
      "Tu día ya terminó. Ajusta tu hora de fin o pasa las tareas pendientes a mañana.";
  } else if (fits) {
    const spare = available - requiredMinutes;
    message =
      spare <= 0
        ? "Justo, te alcanza el tiempo para todo."
        : `Te alcanza el tiempo. Te sobran ${formatMinutes(spare)}.`;
  } else {
    message = `Te faltan ${formatMinutes(
      overload
    )} para todo. Acorta, prioriza o pasa tareas a mañana.`;
  }

  return (
    <div className={`rounded-lg border p-3 md:p-4 ${ring}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white min-w-0">
          <Icon name="timer" className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {isOrganized ? "Plan organizado" : "Carga del día"}
          </span>
        </div>
        <span className="text-xs text-slate-300 whitespace-nowrap flex-shrink-0">
          {formatMinutes(requiredMinutes)}{" "}
          <span className="text-slate-500">/</span> {formatMinutes(available)} libres
        </span>
      </div>
      <div
        className="h-2.5 w-full rounded-full bg-slate-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Carga del día"
      >
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-2 text-xs md:text-sm ${textColor}`}>{message}</p>
    </div>
  );
};

export default TimeBudgetBar;
