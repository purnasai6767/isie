import type { Metadata } from "next";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";

export const metadata: Metadata = {
  title: "ISIE — Integrated Situation Intelligence Engine",
  description:
    "Multi-agency disaster intelligence, hazard red-zone mapping, dynamic carrying capacity evaluation, and real-time operational crisis response command platform.",
  openGraph: {
    title: "ISIE — Integrated Situation Intelligence Engine",
    description:
      "Multi-agency disaster intelligence, hazard red-zone mapping, dynamic carrying capacity evaluation, and real-time operational crisis response command platform.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-isie-bg-deep text-isie-text-primary antialiased selection:bg-isie-primary/30 selection:text-white"
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
