import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Configurar Horario",
  description: "Configura tus tareas semanales y calendario con IA",
};

export default function GeneralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}