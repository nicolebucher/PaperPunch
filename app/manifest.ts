import type { MetadataRoute } from "next";

// Macht snap.it auf dem Handy installierbar ("Zum Startbildschirm hinzufügen"): eigenes Icon,
// Vollbild ohne Browserleiste. Die Icons in public/ wurden aus dem Logo (components/brand/Logo.tsx) gerendert.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "snap.it",
    short_name: "snap.it",
    description: "Upload your study material and get a worksheet, test, or learning game created for you.",
    start_url: "/",
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
