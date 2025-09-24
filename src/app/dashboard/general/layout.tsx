import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Configura tu Horario Semanal | Planificación con IA",
  description: "Configura tu horario semanal con IA. Crea hábitos duraderos, planifica tareas recurrentes y fortalece rutinas diarias con TokiTask. Automatización inteligente de horarios.",
  keywords: [
    "configurar horario",
    "planificación semanal",
    "hábitos duraderos",
    "tareas recurrentes",
    "rutinas diarias",
    "automatización horarios",
    "calendario inteligente",
    "organización semanal",
    "productividad semanal",
    "gestión tiempo"
  ],
  openGraph: {
    title: "TokiTask - Configura tu Horario Semanal con IA",
    description: "Configura tu horario semanal con IA. Crea hábitos duraderos, planifica tareas recurrentes y fortalece rutinas diarias.",
    type: "website",
    siteName: "TokiTask",
    images: [
      {
        url: "/og-image-general.jpg",
        width: 1200,
        height: 630,
        alt: "TokiTask - Configura tu horario semanal con IA"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TokiTask - Configura tu Horario Semanal con IA",
    description: "Configura tu horario semanal con IA. Crea hábitos duraderos, planifica tareas recurrentes y fortalece rutinas diarias.",
    images: ["/og-image-general.jpg"]
  }
};

export default function GeneralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}