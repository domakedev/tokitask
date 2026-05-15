"use client";
import React, { useEffect, useState } from "react";
import Icon from "./Icon";

export type AiTipPriority = "alta" | "media" | "baja";

export interface AiTipRecommendation {
  title: string;
  detail: string;
  priority: AiTipPriority;
}

export interface StructuredAiTipForGeneral {
  headline: string;
  overview: string;
  strengths: string[];
  concerns: string[];
  recommendations: AiTipRecommendation[];
  closingTip: string;
}

export type AiTipForGeneralOpinion = StructuredAiTipForGeneral | string | null;

interface AiTipForGeneralProps {
  opinion: AiTipForGeneralOpinion;
  onClose?: () => void;
}

const priorityStyles: Record<AiTipPriority, string> = {
  alta: "bg-rose-500/10 text-rose-200 border-rose-500/30",
  media: "bg-amber-500/10 text-amber-200 border-amber-500/30",
  baja: "bg-slate-800 text-slate-300 border-slate-600",
};

const priorityLabels: Record<AiTipPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const isStructuredOpinion = (
  opinion: AiTipForGeneralOpinion
): opinion is StructuredAiTipForGeneral => {
  return (
    !!opinion &&
    typeof opinion === "object" &&
    typeof opinion.headline === "string" &&
    typeof opinion.overview === "string" &&
    Array.isArray(opinion.strengths) &&
    Array.isArray(opinion.concerns) &&
    Array.isArray(opinion.recommendations) &&
    typeof opinion.closingTip === "string"
  );
};

function getVisibleItems<T>(items: T[], isExpanded: boolean, isLong: boolean) {
  if (isExpanded || !isLong) return items;
  return items.slice(0, 2);
}

function getStructuredLength(opinion: StructuredAiTipForGeneral) {
  return [
    opinion.headline,
    opinion.overview,
    ...opinion.strengths,
    ...opinion.concerns,
    ...opinion.recommendations.flatMap((item) => [item.title, item.detail]),
    opinion.closingTip,
  ].join(" ").length;
}

function InsightSection({
  title,
  icon,
  iconClassName,
  children,
}: {
  title: string;
  icon: string;
  iconClassName: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-700 pt-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon name={icon} className={`h-4 w-4 ${iconClassName}`} />
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function BulletList({
  items,
  bulletClassName,
}: {
  items: string[];
  bulletClassName: string;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex gap-2 text-sm text-slate-300"
        >
          <span
            className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${bulletClassName}`}
            aria-hidden="true"
          />
          <span className="leading-5">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 px-3 py-4 backdrop-blur-sm md:items-center"
      onClick={() => onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-opinion-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              <Icon name="brain" className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-emerald-300">
                Opinion de la IA
              </p>
              <h2
                id="ai-opinion-title"
                className="mt-1 text-lg font-bold leading-6 text-white"
              >
                {title}
              </h2>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              aria-label="Cerrar"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AiTipForGeneral({
  opinion,
  onClose,
}: AiTipForGeneralProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!opinion) return null;

  if (!isStructuredOpinion(opinion)) {
    const isLongText = opinion.length > 900;
    const displayText =
      isExpanded || !isLongText ? opinion : `${opinion.slice(0, 900)}...`;

    return (
      <ModalShell title="Opinion de la IA sobre tu horario" onClose={onClose}>
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {displayText}
        </div>
        {isLongText && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 text-sm font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
          >
            {isExpanded ? "Mostrar menos" : "Leer mas"}
          </button>
        )}
      </ModalShell>
    );
  }

  const totalItems =
    opinion.strengths.length +
    opinion.concerns.length +
    opinion.recommendations.length;
  const isLongContent = getStructuredLength(opinion) > 850 || totalItems > 6;
  const visibleStrengths = getVisibleItems(
    opinion.strengths,
    isExpanded,
    isLongContent
  );
  const visibleConcerns = getVisibleItems(
    opinion.concerns,
    isExpanded,
    isLongContent
  );
  const visibleRecommendations = getVisibleItems(
    opinion.recommendations,
    isExpanded,
    isLongContent
  );

  return (
    <ModalShell title={opinion.headline} onClose={onClose}>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
        <p className="text-sm leading-6 text-emerald-50">{opinion.overview}</p>
      </div>

      <div className="mt-4 space-y-4">
        {visibleStrengths.length > 0 && (
          <InsightSection
            title="Fortalezas"
            icon="checkcircle"
            iconClassName="text-emerald-300"
          >
            <BulletList
              items={visibleStrengths}
              bulletClassName="bg-emerald-400"
            />
          </InsightSection>
        )}

        {visibleConcerns.length > 0 && (
          <InsightSection
            title="A revisar"
            icon="alerttriangle"
            iconClassName="text-amber-300"
          >
            <BulletList
              items={visibleConcerns}
              bulletClassName="bg-amber-300"
            />
          </InsightSection>
        )}

        {visibleRecommendations.length > 0 && (
          <InsightSection
            title="Recomendaciones"
            icon="sparkles"
            iconClassName="text-teal-300"
          >
            <ul className="space-y-3">
              {visibleRecommendations.map((recommendation, index) => (
                <li
                  key={`${recommendation.title}-${index}`}
                  className="rounded-lg border border-slate-700 bg-slate-950/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      {recommendation.title}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityStyles[recommendation.priority]}`}
                    >
                      {priorityLabels[recommendation.priority]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-300">
                    {recommendation.detail}
                  </p>
                </li>
              ))}
            </ul>
          </InsightSection>
        )}

        <div className="border-t border-slate-700 pt-4">
          <div className="flex gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm leading-5 text-emerald-50">
            <Icon
              name="lightbulb"
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300"
            />
            <p>{opinion.closingTip}</p>
          </div>
        </div>
      </div>

      {isLongContent && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-sm font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
        >
          {isExpanded ? "Mostrar menos" : "Ver analisis completo"}
        </button>
      )}
    </ModalShell>
  );
}
