import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

export const FEEDS = [
  {
    id: "apple-newsroom",
    name: "Apple Newsroom",
    url: "https://www.apple.com/newsroom/rss-feed.rss",
    category: "official",
    tags: ["公式"],
  },
  {
    id: "apple-developer",
    name: "Apple Developer",
    url: "https://developer.apple.com/news/rss/news.rss",
    fallbackUrl: "https://developer.apple.com/news/releases/rss/releases.rss",
    category: "developer",
    tags: ["Developer", "公式"],
  },
  {
    id: "macrumors",
    name: "MacRumors",
    url: "https://feeds.macrumors.com/MacRumors-All",
    category: "rumors",
    tags: ["噂"],
  },
  {
    id: "9to5mac",
    name: "9to5Mac",
    url: "https://9to5mac.com/feed/",
    category: "rumors",
    tags: ["海外メディア"],
  },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  trimValues: true,
  processEntities: true,
});

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).find(Boolean) ?? "";
  if (typeof value === "object") {
    return textOf(value["#text"] ?? value["#cdata"] ?? value._ ?? "");
  }
  return "";
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function plainText(value, maxLength = 1800) {
  const cleaned = decodeEntities(textOf(value))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLength);
}

function linkOf(value) {
  if (typeof value === "string") return value;
  for (const link of asArray(value)) {
    if (typeof link === "string") return link;
    if (link?.["@_rel"] === "alternate" && link?.["@_href"]) return link["@_href"];
    if (link?.["@_href"]) return link["@_href"];
    if (link?.["#text"]) return link["#text"];
  }
  return "";
}

function imageOf(item) {
  const candidates = [
    item?.enclosure,
    item?.["media:content"],
    item?.["media:thumbnail"],
  ];
  for (const candidate of candidates.flatMap(asArray)) {
    const url = candidate?.["@_url"] ?? candidate?.["@_href"];
    const type = candidate?.["@_type"] ?? "";
    if (url && (!type || String(type).startsWith("image/"))) return String(url);
  }

  const html = textOf(item?.["content:encoded"] ?? item?.description ?? item?.content);
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

function isoDate(value) {
  const date = new Date(textOf(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function parseFeed(xml, feed) {
  const document = parser.parse(xml);
  const rssItems = asArray(document?.rss?.channel?.item);
  const atomItems = asArray(document?.feed?.entry);

  return [...rssItems, ...atomItems]
    .map((item) => {
      const titleOriginal = plainText(item?.title, 500);
      const url = linkOf(item?.link) || textOf(item?.guid) || textOf(item?.id);
      if (!titleOriginal || !url) return null;

      const key = textOf(item?.guid) || textOf(item?.id) || url;
      const summaryOriginal = plainText(
        item?.["content:encoded"] ?? item?.description ?? item?.summary ?? item?.content,
      );

      return {
        id: createHash("sha256").update(`${feed.id}:${key}`).digest("hex").slice(0, 20),
        source: feed.name,
        sourceId: feed.id,
        category: feed.category,
        titleOriginal,
        summaryOriginal,
        url,
        publishedAt: isoDate(item?.pubDate ?? item?.published ?? item?.updated ?? item?.date),
        imageUrl: imageOf(item),
        tags: feed.tags,
      };
    })
    .filter(Boolean);
}

export function mergeArticles(existing, translated, limit = 300) {
  const byUrl = new Map();
  for (const article of [...translated, ...existing]) {
    if (!article?.url || byUrl.has(article.url)) continue;
    byUrl.set(article.url, article);
  }
  return [...byUrl.values()]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);
}

const NOTIFICATION_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const NOTIFICATION_CHECKPOINT_GRACE_MS = 6 * 60 * 60 * 1000;

export function selectFreshNotifications(
  articles,
  {
    previousUpdatedAt,
    now = Date.now(),
    maxAgeMs = NOTIFICATION_MAX_AGE_MS,
    checkpointGraceMs = NOTIFICATION_CHECKPOINT_GRACE_MS,
  } = {},
) {
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) throw new Error("Invalid notification clock");

  const previousUpdatedAtMs = new Date(previousUpdatedAt).getTime();
  const ageCutoff = nowMs - maxAgeMs;
  const checkpointCutoff = Number.isFinite(previousUpdatedAtMs)
    ? previousUpdatedAtMs - checkpointGraceMs
    : ageCutoff;
  const cutoff = Math.max(ageCutoff, checkpointCutoff);

  return articles.filter((article) => {
    const publishedAtMs = new Date(article?.publishedAt).getTime();
    return Number.isFinite(publishedAtMs) && publishedAtMs >= cutoff;
  });
}
