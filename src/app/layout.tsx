import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "IngenieroAI.pro", description: "Plataforma de operaciones empresariales multiempresa para LATAM y UAE", metadataBase: new URL(process.env.AUTH_URL ?? "https://ingenieroai-pro.vercel.app") };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="es"><body>{children}</body></html>; }
