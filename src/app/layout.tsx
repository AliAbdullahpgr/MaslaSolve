import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "~/components/auth-provider";

export const metadata: Metadata = {
  title: "MaslaSolve · Civic reporting for Lahore",
  description:
    "Report and track civic issues across Lahore. Built for citizens, powered by AI.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[#EAE5DA] text-[#0B1A24] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
