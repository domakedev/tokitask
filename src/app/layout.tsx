import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TokiTask - Gestiona tu tiempo con IA",
  description: "Revoluciona tu productividad con IA. Organiza tareas diarias, recibe sugerencias inteligentes y optimiza tu tiempo libre con sincronización automática.",
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
      </body>
    </html>
  );
}
