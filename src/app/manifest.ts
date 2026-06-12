import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Foyer — Gestion des dépenses",
    short_name: "Foyer",
    description:
      "Répartissez équitablement les dépenses de votre foyer au prorata de vos revenus.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#18181b",
    theme_color: "#18181b",
    orientation: "portrait",
    icons: [
      {
        src: "/api/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
