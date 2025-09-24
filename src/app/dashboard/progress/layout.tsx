import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Rastrea tu Progreso | Estadísticas de Hábitos y Productividad",
  description: "Rastrea tu progreso diario y semanal. Visualiza estadísticas de hábitos, mide tu productividad y celebra tus logros con TokiTask. Análisis inteligente de patrones.",
  keywords: [
    "rastrear progreso",
    "estadísticas hábitos",
    "productividad personal",
    "análisis patrones",
    "logros diarios",
    "métricas productividad",
    "seguimiento hábitos",
    "estadísticas semanales",
    "progreso personal",
    "análisis rendimiento"
  ],
  openGraph: {
    title: "TokiTask - Rastrea tu Progreso con IA",
    description: "Rastrea tu progreso diario y semanal. Visualiza estadísticas de hábitos, mide tu productividad y celebra tus logros.",
    type: "website",
    siteName: "TokiTask",
    images: [
      {
        url: "/og-image-progress.jpg",
        width: 1200,
        height: 630,
        alt: "TokiTask - Rastrea tu progreso con IA"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TokiTask - Rastrea tu Progreso con IA",
    description: "Rastrea tu progreso diario y semanal. Visualiza estadísticas de hábitos, mide tu productividad y celebra tus logros.",
    images: ["/og-image-progress.jpg"]
  }
};

export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}