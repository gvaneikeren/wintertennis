import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WinterTennis",
    short_name: "WinterTennis",
    description: "Indoor tenniscompetitie op zaterdagavond",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f3",
    theme_color: "#15803d",
    lang: "nl",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
