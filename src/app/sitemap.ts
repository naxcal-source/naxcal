import type { MetadataRoute } from "next";

const publicRoutes = [
  "",
  "/login",
  "/register",
  "/forgot-password",
  "/legal/terms",
  "/legal/privacy",
  "/legal/risk",
  "/legal/aml",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route, index) => ({
    url: `https://naxcal.us${route}`,
    lastModified,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : route === "/login" || route === "/register" ? 0.8 : 0.5,
  }));
}
