const BASE = "https://j-novel.club";

const allowedHost = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      (parsed.hostname === "j-novel.club" ||
       parsed.hostname.endsWith(".j-novel.club"));
  } catch {
    return false;
  }
};

const handlers = {
  async searchResults(args = {}) {
    const query = String(args.query || "").trim();
    if (!query) return { items: [] };

    const url = BASE + "/series?search=" + encodeURIComponent(query);
    const response = await fetchv2(url);
    if (!response || response.status < 200 || response.status >= 300) {
      return { items: [] };
    }

    const html = typeof response.body === "string" ? response.body : "";
    const items = [];
    const seen = new Set();
    const pattern =
      /<a\b[^>]*href=["']([^"']*\/series\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    while ((match = pattern.exec(html)) && items.length < 50) {
      const href = match[1].replace(/&amp;/g, "&");
      const title = match[2].replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ").trim();

      if (!title || !href) continue;
      const fullURL = new URL(href, BASE).toString();
      if (!allowedHost(fullURL) || seen.has(fullURL)) continue;

      seen.add(fullURL);
      items.push({
        id: fullURL,
        title,
        href: fullURL
      });
    }

    return { items };
  },

  async extractDetails(args = {}) {
    const url = String(args.url || args.href || "");
    if (!allowedHost(url)) return null;

    const response = await fetchv2(url);
    if (!response || response.status < 200 || response.status >= 300) {
      return null;
    }

    const html = typeof response.body === "string" ? response.body : "";
    const titleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i
    );
    const descriptionMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i
    );

    const decode = (value) => value
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    return {
      title: titleMatch ? decode(titleMatch[1]) : "",
      description: descriptionMatch
        ? decode(descriptionMatch[1]) : "",
      url
    };
  },

  async extractResources() {
    // Only return files that J-Novel Club explicitly makes
    // publicly accessible and authorized for direct download.
    // Do not bypass accounts, subscriptions, or access controls.
    return [];
  }
};

globalThis.SynthetiqModule = handlers;