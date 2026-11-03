import type { MetadataRoute } from "next";

// Macht PaperPunch auf dem Handy installierbar ("Zum Startbildschirm hinzufügen"): eigenes Icon,
// Vollbild ohne Browserleiste. Die Icons in public/ wurden aus dem Logo (components/brand/Logo.tsx) gerendert.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PaperPunch",
    short_name: "PaperPunch",
    description: "Upload your study material and get a worksheet, test, or learning game created for you.",
    // Vom Startbildschirm direkt in die App-Oberfläche; scope "/" hält Links auf andere Seiten im Vollbild.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
