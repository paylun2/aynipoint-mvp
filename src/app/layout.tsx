import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AyniPoint | La Red de Reciprocidad B2B2C",
  description: "Plataforma de fidelización B2B2C que permite a los comercios recompensar a sus clientes de forma segura, sin fricción en caja y sin descargar apps.",
  keywords: ["Fidelización", "B2B", "B2C", "Puntos", "AyniPoint", "Recompensas", "Comercios", "SaaS"],
  authors: [{ name: "AyniPoint" }],
  openGraph: {
    title: "AyniPoint | Impulsa las ventas de tu negocio",
    description: "La red de reciprocidad que hace volver a tus clientes.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
