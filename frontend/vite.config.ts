import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/api": {
    target: "http://localhost:8000",
    changeOrigin: true,
  },
};
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const seoData = JSON.parse(fs.readFileSync(path.join(rootDir, "src/seo/toolSeo.json"), "utf8")) as {
  site: {
    name: string;
    url: string;
    defaultTitle: string;
    defaultDescription: string;
    defaultKeywords: string[];
    image: string;
    imageAlt: string;
    imageWidth: number;
    imageHeight: number;
    locale: string;
  };
  pages: Record<string, { title: string; description: string; keywords: string[] }>;
  tools: Record<string, { title: string; description: string; keywords: string[] }>;
};

type PageEntry = {
  title: string;
  description: string;
  keywords: string[];
  url: string;
  index: boolean;
  toolId?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function metaBlock(entry: PageEntry) {
  const title = escapeHtml(entry.title);
  const description = escapeHtml(entry.description);
  const keywords = escapeHtml(entry.keywords.join(","));
  const url = escapeHtml(entry.url);
  const robots = entry.index ? "index,follow,max-image-preview:large" : "noindex,nofollow";
  const image = escapeHtml(seoData.site.image);
  const imageAlt = escapeHtml(seoData.site.imageAlt);
  return `<!-- SEO_META_START -->\n    <title>${title}</title>\n    <meta name="description" content="${description}" />\n    <meta name="keywords" content="${keywords}" />\n    <meta name="robots" content="${robots}" />\n    <link rel="canonical" href="${url}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:site_name" content="${escapeHtml(seoData.site.name)}" />\n    <meta property="og:locale" content="${escapeHtml(seoData.site.locale.replace("-", "_"))}" />\n    <meta property="og:title" content="${title}" />\n    <meta property="og:description" content="${description}" />\n    <meta property="og:url" content="${url}" />\n    <meta property="og:image" content="${image}" />\n    <meta property="og:image:secure_url" content="${image}" />\n    <meta property="og:image:alt" content="${imageAlt}" />\n    <meta property="og:image:width" content="${seoData.site.imageWidth}" />\n    <meta property="og:image:height" content="${seoData.site.imageHeight}" />\n    <meta name="twitter:card" content="summary" />\n    <meta name="twitter:title" content="${title}" />\n    <meta name="twitter:description" content="${description}" />\n    <meta name="twitter:image" content="${image}" />\n    <meta name="twitter:image:alt" content="${imageAlt}" />\n    <!-- SEO_META_END -->`;
}

function structuredData(entry: PageEntry) {
  const websiteId = `${seoData.site.url}/#website`;
  const webpageId = `${entry.url}#webpage`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${seoData.site.url}/`,
      name: seoData.site.name,
      description: seoData.site.defaultDescription,
      inLanguage: seoData.site.locale,
    },
  ];
  const webpage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": webpageId,
    url: entry.url,
    name: entry.title,
    description: entry.description,
    inLanguage: seoData.site.locale,
    isPartOf: { "@id": websiteId },
  };

  if (entry.toolId) {
    const appId = `${entry.url}#app`;
    webpage.mainEntity = { "@id": appId };
    graph.push(webpage, {
      "@type": "SoftwareApplication",
      "@id": appId,
      name: entry.title,
      description: entry.description,
      url: entry.url,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
      isPartOf: { "@id": websiteId },
    }, {
      "@type": "BreadcrumbList",
      "@id": `${entry.url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "\u9996\u9875", item: `${seoData.site.url}/` },
        { "@type": "ListItem", position: 2, name: entry.title, item: entry.url },
      ],
    });
  } else {
    graph.push(webpage);
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function routeHtml(base: string, entry: PageEntry) {
  const jsonLd = structuredData(entry);
  return base
    .replace(/<!-- SEO_META_START -->[\s\S]*?<!-- SEO_META_END -->/, metaBlock(entry))
    .replace(/(<script id="bocchi-seo-jsonld" type="application\/ld\+json">)[\s\S]*?(<\/script>)/, `$1${jsonLd}$2`);
}

function seoPlugin(): Plugin {
  return {
    name: "bocchi-seo-routes",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(rootDir, "dist");
      const basePath = path.join(dist, "index.html");
      const base = fs.readFileSync(basePath, "utf8");
      const pages = new Map<string, PageEntry>();

      pages.set("/", {
        title: seoData.site.defaultTitle,
        description: seoData.site.defaultDescription,
        keywords: seoData.site.defaultKeywords,
        url: `${seoData.site.url}/`,
        index: true,
      });
      for (const [pageId, item] of Object.entries(seoData.pages)) {
        pages.set(`/${pageId}`, { ...item, url: `${seoData.site.url}/${pageId}`, index: true });
      }
      for (const [toolId, item] of Object.entries(seoData.tools)) {
        pages.set(`/tools/${toolId}`, {
          ...item,
          url: `${seoData.site.url}/tools/${toolId}`,
          index: true,
          toolId,
        });
      }
      pages.set("/admin", {
        title: `\u7ba1\u7406\u540e\u53f0 - ${seoData.site.name}`,
        description: "\u8d26\u6237\u4e0e\u7ba1\u7406\u540e\u53f0\u9875\u9762\u4e0d\u5bf9\u641c\u7d22\u5f15\u64ce\u5f00\u653e\u3002",
        keywords: [],
        url: `${seoData.site.url}/admin`,
        index: false,
      });
      pages.set("/account", {
        title: `\u8d26\u6237\u8bbe\u7f6e - ${seoData.site.name}`,
        description: "\u8d26\u6237\u4e0e\u7ba1\u7406\u540e\u53f0\u9875\u9762\u4e0d\u5bf9\u641c\u7d22\u5f15\u64ce\u5f00\u653e\u3002",
        keywords: [],
        url: `${seoData.site.url}/account`,
        index: false,
      });

      for (const [route, entry] of pages) {
        const html = routeHtml(base, entry);
        if (route === "/") {
          fs.writeFileSync(basePath, html, "utf8");
          continue;
        }
        const output = path.join(dist, route.replace(/^\//, ""), "index.html");
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, html, "utf8");
      }

      const urls = [...pages.entries()]
        .filter(([, entry]) => entry.index)
        .map(([route, entry]) => `  <url><loc>${entry.url}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><priority>${route === "/" ? "1.0" : route.startsWith("/tools/") ? "0.8" : "0.6"}</priority></url>`)
        .join("\n");
      fs.writeFileSync(
        path.join(dist, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        "utf8",
      );
      fs.writeFileSync(
        path.join(dist, "robots.txt"),
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /api/\n\nSitemap: ${seoData.site.url}/sitemap.xml\n`,
        "utf8",
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), seoPlugin()],
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});