import { useEffect } from "react";
import toolSeo from "./toolSeo.json";

type ToolSeo = { title: string; description: string; keywords: string[] };
type SeoEntry = ToolSeo & {
  url: string;
  index: boolean;
  toolId?: string;
  notFound?: boolean;
};

const site = toolSeo.site;
const toolMap = toolSeo.tools as Record<string, ToolSeo>;
const pageMap = toolSeo.pages as Record<string, ToolSeo>;

function normalizePath(path: string) {
  const pathWithoutQuery = path.split(/[?#]/, 1)[0] || "/";
  if (pathWithoutQuery === "/") return "/";
  return `/${pathWithoutQuery.replace(/^\/+|\/+$/g, "")}`;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function getRouteSeo(path: string): SeoEntry {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/") {
    return {
      title: site.defaultTitle,
      description: site.defaultDescription,
      keywords: site.defaultKeywords,
      url: `${site.url}/`,
      index: true,
    };
  }

  const toolMatch = /^\/tools\/([^/]+)$/.exec(normalizedPath);
  const toolId = toolMatch?.[1] ?? "";
  if (toolId && toolMap[toolId]) {
    const item = toolMap[toolId];
    return {
      title: item.title,
      description: item.description,
      keywords: item.keywords,
      url: `${site.url}/tools/${toolId}`,
      index: true,
      toolId,
    };
  }

  const page = pageMap[normalizedPath.slice(1)];
  if (page) {
    return {
      title: page.title,
      description: page.description,
      keywords: page.keywords,
      url: `${site.url}${normalizedPath}`,
      index: true,
    };
  }

  if (/^\/s\/[^/]+$/.test(normalizedPath)) {
    return {
      title: "分享内容 - Bocchi 工具台",
      description: "来自 Bocchi 工具台的分享内容。",
      keywords: [],
      url: `${site.url}${normalizedPath}`,
      index: false,
    };
  }

  if (normalizedPath === "/admin" || normalizedPath === "/account") {
    const isAdmin = normalizedPath === "/admin";
    return {
      title: `${isAdmin ? "\u7ba1\u7406\u540e\u53f0" : "\u8d26\u6237\u8bbe\u7f6e"} - ${site.name}`,
      description: "\u8d26\u6237\u4e0e\u7ba1\u7406\u540e\u53f0\u9875\u9762\u4e0d\u5bf9\u641c\u7d22\u5f15\u64ce\u5f00\u653e\u3002",
      keywords: [],
      url: `${site.url}${normalizedPath}`,
      index: false,
    };
  }

  return {
    title: `\u9875\u9762\u672a\u627e\u5230 - ${site.name}`,
    description: "\u4f60\u8bbf\u95ee\u7684\u9875\u9762\u4e0d\u5b58\u5728\uff0c\u8bf7\u8fd4\u56de Bocchi \u5de5\u5177\u53f0\u7ee7\u7eed\u4f7f\u7528\u5e38\u7528\u5de5\u5177\u3002",
    keywords: [],
    url: `${site.url}${normalizedPath}`,
    index: false,
    notFound: true,
  };
}

export function useSeo(path: string) {
  useEffect(() => {
    const seo = getRouteSeo(path);
    const websiteId = `${site.url}/#website`;
    const webpageId = `${seo.url}#webpage`;
    const imageUrl = site.image;

    document.title = seo.title;
    document.documentElement.lang = site.locale;
    upsertMeta('meta[name="description"]', { name: "description", content: seo.description });
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: seo.keywords.join(",") });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: seo.index ? "index,follow,max-image-preview:large" : "noindex,nofollow",
    });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: seo.url });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: site.locale.replace("-", "_") });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: site.name });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
    upsertMeta('meta[property="og:image:secure_url"]', { property: "og:image:secure_url", content: imageUrl });
    upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: site.imageAlt });
    upsertMeta('meta[property="og:image:width"]', { property: "og:image:width", content: String(site.imageWidth) });
    upsertMeta('meta[property="og:image:height"]', { property: "og:image:height", content: String(site.imageHeight) });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: seo.description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
    upsertMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: site.imageAlt });
    upsertLink("canonical", seo.url);

    const graph: Record<string, unknown>[] = [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: `${site.url}/`,
        name: site.name,
        description: site.defaultDescription,
        inLanguage: site.locale,
      },
    ];
    const webpage: Record<string, unknown> = {
      "@type": "WebPage",
      "@id": webpageId,
      url: seo.url,
      name: seo.title,
      description: seo.description,
      inLanguage: site.locale,
      isPartOf: { "@id": websiteId },
    };

    if (seo.toolId) {
      const appId = `${seo.url}#app`;
      const tool = toolMap[seo.toolId];
      webpage.mainEntity = { "@id": appId };
      graph.push(webpage, {
        "@type": "SoftwareApplication",
        "@id": appId,
        name: tool.title,
        description: seo.description,
        url: seo.url,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
        isPartOf: { "@id": websiteId },
      }, {
        "@type": "BreadcrumbList",
        "@id": `${seo.url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "\u9996\u9875", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: tool.title, item: seo.url },
        ],
      });
    } else {
      graph.push(webpage);
    }

    let jsonLd = document.getElementById("bocchi-seo-jsonld") as HTMLScriptElement | null;
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "bocchi-seo-jsonld";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  }, [path]);
}