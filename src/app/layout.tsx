import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"IngenieroAI Platform",description:"Business Operations OS / Operations & Logistics OS"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
