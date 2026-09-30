import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const routes = ["/", "/features", "/how-it-works", "/pricing", "/about", "/contact", "/privacy", "/terms"];
  return routes.map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly", priority: path === "/" ? 1 : 0.7 }));
}
