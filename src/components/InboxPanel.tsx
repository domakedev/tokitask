"use client";

import React, { useState } from "react";
import Icon from "./Icon";
import { AiPlannerPriority, InboxTask } from "../types";
import { completedInbox, pendingInbox } from "../utils/inbox";

export type InboxAssignTarget = "plan" | "calendar";

interface InboxPanelProps {
  items: InboxTask[];
  /** Pendientes elegidos para que el Plan IA los planifique en el día seleccionado. */
  selectedIds: Set<string>;
  /** Día que se está viendo en el Plan IA (por defecto al asignar). */
  defaultDate: string;
  defaultDateLabel: string;
  busy: boolean;
  onAdd: (input: { title: string; priority: AiPlannerPriority; estimatedMinutes: number }) => Promise<boolean>;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (item: InboxTask) => void;
  onDelete: (item: InboxTask) => void;
  onClearCompleted: () => void;
  onAssign: (item: InboxTask, date: string, target: InboxAssignTarget) => void;
}

const priorityLabel: Record<AiPlannerPriority, string> = { high: "Alta", medium: "Media", low: "Baja" };
const priorityClasses: Record<AiPlannerPriority, string> = {
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-sky-500/20 text-sky-300 border-sky-500/30",
};

const todayString = () => new Date().toLocaleDateString("en-CA");

export default function InboxPanel({
  items,
  selectedIds,
  defaultDate,
  defaultDateLabel,
  busy,
  onAdd,
  onToggleSelect,
  onToggleComplete,
  onDelete,
  onClearCompleted,
  onAssign,
}: InboxPanelProps) {
  const pending = pendingInbox(items);
  const done = completedInbox(items);
  const [open, setOpen] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<AiPlannerPriority>("medium");
  const [minutes, setMinutes] = useState("30");
  const [assigning, setAssigning] = useState<{ id: string; date: string; target: InboxAssignTarget } | null>(null);

  const selectedCount = pending.filter((item) => selectedIds.has(item.id)).length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    const ok = await onAdd({ title: clean, priority, estimatedMinutes: Number(minutes) });
    if (ok) {
      setTitle("");
      setMinutes("30");
      setPriority("medium");
    }
  };

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-3 md:p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Icon name="clipboardList" className="h-4 w-4 text-emerald-300" />
            Bandeja general
            <span className="rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-200">
              {pending.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Pendientes sin día: para cualquier día. Asígnalos cuando quieras.
          </p>
        </div>
        <Icon name={open ? "chevronup" : "chevrondown"} className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <form onSubmit={submit} className="space-y-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400"
              placeholder="Ej: renovar el DNI, comprar repuesto del filtro..."
              aria-label="Nuevo pendiente de la bandeja"
            />
            <div className="grid grid-cols-[1fr_88px_auto] gap-2">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as AiPlannerPriority)}
                className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-emerald-400"
                aria-label="Prioridad"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-emerald-400"
                aria-label="Minutos estimados"
              />
              <button
                type="submit"
                disabled={busy || !title.trim()}
                className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="plus" className="h-4 w-4" />
                Agregar
              </button>
            </div>
          </form>

          {pending.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-600 px-3 py-3 text-center text-xs text-slate-400">
              Tu bandeja está vacía. Anota aquí lo que tienes que hacer algún día, sin fecha.
            </p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400">
                Marca <span className="font-semibold text-emerald-300">Planificar</span> en los que quieras que la IA
                incluya en el plan de {defaultDateLabel}.
                {selectedCount > 0 && ` (${selectedCount} elegido${selectedCount === 1 ? "" : "s"})`}
              </p>
              <ul className="space-y-2">
                {pending.map((item) => {
                  const selected = selectedIds.has(item.id);
                  const isAssigning = assigning?.id === item.id;
                  return (
                    <li
                      key={item.id}
                      className={`rounded-md border px-2 py-2 text-sm ${
                        selected ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-700 bg-slate-900/70"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={false}
                          disabled={busy}
                          onChange={() => onToggleComplete(item)}
                          className="mt-1 h-4 w-4 rounded border-slate-500 accent-emerald-500"
                          aria-label={`Marcar «${item.title}» como hecho`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-slate-100">{item.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className={`rounded-full border px-2 py-0.5 ${priorityClasses[item.priority] || priorityClasses.medium}`}>
                              {priorityLabel[item.priority] || "Media"}
                            </span>
                            <span className="rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-slate-300">
                              {item.estimatedMinutes} min
                            </span>
                            {item.source === "kami" && (
                              <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-300">
                                Desde Kami
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleSelect(item.id)}
                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                              selected
                                ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                : "border-slate-600 bg-slate-900 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200"
                            }`}
                            aria-pressed={selected}
                            title="Incluir en el próximo Plan IA"
                          >
                            {selected ? "✓ Planificar" : "Planificar"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAssigning(isAssigning ? null : { id: item.id, date: defaultDate, target: "plan" })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 transition-colors hover:border-emerald-400/60 hover:text-emerald-200"
                            title="Asignar a un día"
                            aria-label="Asignar a un día"
                          >
                            <Icon name="calendarcheck" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 transition-colors hover:border-red-400/60 hover:text-red-200"
                            title="Eliminar de la bandeja"
                            aria-label="Eliminar de la bandeja"
                          >
                            <Icon name="trash2" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {isAssigning && assigning && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (!assigning.date) return;
                            onAssign(item, assigning.date, assigning.target);
                            setAssigning(null);
                          }}
                          className="mt-2 space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setAssigning({ ...assigning, target: "plan" })}
                              className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${
                                assigning.target === "plan"
                                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
                              }`}
                            >
                              Plan IA del día
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssigning({ ...assigning, target: "calendar" })}
                              className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${
                                assigning.target === "calendar"
                                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
                              }`}
                            >
                              Calendario
                            </button>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                            <input
                              type="date"
                              value={assigning.date}
                              min={todayString()}
                              onChange={(event) => setAssigning({ ...assigning, date: event.target.value })}
                              className="min-w-0 rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
                              aria-label="Día"
                            />
                            <button
                              type="button"
                              onClick={() => setAssigning(null)}
                              className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={busy || !assigning.date}
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Asignar
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {assigning.target === "plan"
                              ? "Se agrega como pendiente del Plan IA de ese día y sale de la bandeja."
                              : "Se agrega a tu calendario (Horario General) ese día y sale de la bandeja."}
                          </p>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {done.length > 0 && (
            <div className="border-t border-slate-700 pt-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowDone((value) => !value)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white"
                  aria-expanded={showDone}
                >
                  <Icon name={showDone ? "chevronup" : "chevrondown"} className="h-3.5 w-3.5" />
                  Hechos ({done.length})
                </button>
                <button
                  type="button"
                  onClick={onClearCompleted}
                  disabled={busy}
                  className="text-xs font-semibold text-slate-400 hover:text-red-200 disabled:opacity-50"
                >
                  Limpiar hechos
                </button>
              </div>
              {showDone && (
                <ul className="mt-2 space-y-1.5">
                  {done.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 rounded-md bg-slate-900/50 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked
                        disabled={busy}
                        onChange={() => onToggleComplete(item)}
                        className="mt-1 h-4 w-4 rounded border-slate-500 accent-emerald-500"
                        aria-label={`Volver «${item.title}» a pendiente`}
                      />
                      <span className="min-w-0 flex-1 break-words text-slate-500 line-through">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-red-200"
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
                        <Icon name="trash2" className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
