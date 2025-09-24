import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "TokiTask - Organiza tu Día con IA",
    template: "%s | TokiTask"
  },
  description: "Organiza tu día con IA y fortalece tus hábitos. TokiTask te ayuda a gestionar tareas, crear rutinas productivas y mejorar tu organización diaria con inteligencia artificial.",
  keywords: [
    "TokiTask",
    "organizar día",
    "IA productividad",
    "gestión tareas",
    "hábitos diarios",
    "productividad personal",
    "planificación automática",
    "recordatorios inteligentes",
    "fortalecer hábitos",
    "organización tiempo"
  ],
  authors: [{ name: "TokiTask Team" }],
  creator: "TokiTask",
  publisher: "TokiTask",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://tokitask.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "TokiTask",
    title: "TokiTask - Organiza tu Día con IA y Fortalece tus Hábitos",
    description: "Organiza tu día con IA y fortalece tus hábitos. TokiTask te ayuda a gestionar tareas, crear rutinas productivas y mejorar tu organización diaria.",
    images: [
      {
        url: "/og-image-main.jpg",
        width: 1200,
        height: 630,
        alt: "TokiTask - Organiza tu día con IA"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TokiTask - Organiza tu Día con IA",
    description: "Organiza tu día con IA y fortalece tus hábitos. TokiTask te ayuda a gestionar tareas, crear rutinas productivas y mejorar tu organización diaria.",
    images: ["/og-image-main.jpg"],
    creator: "@tokitask"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-900 text-slate-200`}>
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  );
}
