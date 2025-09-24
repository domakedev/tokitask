import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Organiza tu Día con IA | Gestión de Tareas Diarias",
  description: "Organiza tu día con IA inteligente. Gestiona tareas, fortalece hábitos y mejora tu productividad diaria con TokiTask. Planificación automática y recordatorios inteligentes.",
  keywords: [
    "organizar día",
    "gestión tareas",
    "IA productividad",
    "hábitos diarios",
    "planificación automática",
    "recordatorios inteligentes",
    "productividad personal",
    "organización tiempo",
    "tareas diarias",
    "mejora hábitos"
  ],
  openGraph: {
    title: "TokiTask - Organiza tu Día con IA",
    description: "Organiza tu día con IA inteligente. Gestiona tareas, fortalece hábitos y mejora tu productividad diaria.",
    type: "website",
    siteName: "TokiTask",
    images: [
      {
        url: "/og-image-day.jpg",
        width: 1200,
        height: 630,
        alt: "TokiTask - Organiza tu día con IA"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TokiTask - Organiza tu Día con IA",
    description: "Organiza tu día con IA inteligente. Gestiona tareas, fortalece hábitos y mejora tu productividad diaria.",
    images: ["/og-image-day.jpg"]
  }
};

export default function DayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}