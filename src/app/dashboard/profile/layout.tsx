import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokiTask - Perfil | Personaliza tu Experiencia de Productividad",
  description: "Personaliza tu perfil en TokiTask. Configura notificaciones, preferencias y ajusta tu experiencia de organización diaria con IA para maximizar tu productividad.",
  keywords: [
    "perfil usuario",
    "configuración app",
    "preferencias productividad",
    "notificaciones inteligentes",
    "personalización app",
    "ajustes usuario",
    "configuración IA",
    "preferencias hábitos",
    "personalizar experiencia",
    "configuración productividad"
  ],
  openGraph: {
    title: "TokiTask - Personaliza tu Perfil de Productividad",
    description: "Personaliza tu perfil en TokiTask. Configura notificaciones, preferencias y ajusta tu experiencia de organización diaria con IA.",
    type: "website",
    siteName: "TokiTask",
    images: [
      {
        url: "/og-image-profile.jpg",
        width: 1200,
        height: 630,
        alt: "TokiTask - Personaliza tu perfil de productividad"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TokiTask - Personaliza tu Perfil de Productividad",
    description: "Personaliza tu perfil en TokiTask. Configura notificaciones, preferencias y ajusta tu experiencia de organización diaria con IA.",
    images: ["/og-image-profile.jpg"]
  }
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}