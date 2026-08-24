import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/legal/"],
      disallow: ["/admin/", "/api/", "/auth/", "/dashboard/"],
    },
    sitemap: "https://naxcal.us/sitemap.xml",
    host: "https://naxcal.us",
  };
}
