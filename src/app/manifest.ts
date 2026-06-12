import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const now = new Date();
  const currentMonthSlug = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
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
    shortcuts: [
      {
        name: "Mois en cours",
        short_name: "Ce mois",
        description: "Voir le détail du mois",
        url: `/month/${currentMonthSlug}`,
        icons: [{ src: "/api/icon/192", sizes: "192x192" }],
      },
      {
        name: "Tableau de bord",
        short_name: "Dashboard",
        description: "Vue d'ensemble du foyer",
        url: "/dashboard",
        icons: [{ src: "/api/icon/192", sizes: "192x192" }],
      },
    ],
  };
}
