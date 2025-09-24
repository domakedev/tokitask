import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Perfil",
  description: "Gestiona tu perfil y configuración de TokiTask",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}