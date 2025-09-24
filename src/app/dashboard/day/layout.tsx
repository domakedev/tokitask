import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Mi Día",
  description: "Gestiona tus tareas del día con IA",
};

export default function DayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}