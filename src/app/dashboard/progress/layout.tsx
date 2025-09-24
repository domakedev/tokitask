import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Progreso",
  description: "Visualiza tu progreso y estadísticas de tareas",
};

export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}