import type { Metadata } from "next";
import "mapbox-gl/dist/mapbox-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";

export const metadata: Metadata = {
  title: "ISIE — Integrated Situation Intelligence Engine",
  description:
    "Spatial intelligence prototype with public event data, model weather forecasts, user-submitted records, and clearly labeled tabletop simulations.",
  openGraph: {
    title: "ISIE — Integrated Situation Intelligence Engine",
    description:
      "Spatial intelligence prototype with public event data, model weather forecasts, user-submitted records, and clearly labeled tabletop simulations.",
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
