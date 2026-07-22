import { load } from "cheerio";

function normalizeText(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function collectArticleBodies(value, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectArticleBodies(item, output);
    return;
  }
  if (!value || typeof value !== "object") return;

  if (typeof value.articleBody === "string") output.push(value.articleBody);
  for (const nested of Object.values(value)) collectArticleBodies(nested, output);
}

function longestElementText($, selector, maxLength) {
  const candidates = [];
  $(selector).each((_, element) => {
    const copy = $(element).clone();
    copy.find("script, style, noscript, nav, aside, form, button, svg").remove();
    const text = normalizeText(copy.text(), maxLength);
    if (text) candidates.push(text);
  });
  return candidates.sort((a, b) => b.length - a.length)[0] ?? "";
}

export function extractArticleText(html, maxLength = 6000) {
  const $ = load(String(html ?? ""));
  const structuredBodies = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      collectArticleBodies(JSON.parse($(element).text()), structuredBodies);
    } catch {
      // Some sites publish malformed or non-JSON data in this element.
    }
  });

  const structuredText = structuredBodies
    .map((value) => normalizeText(value, maxLength))
    .sort((a, b) => b.length - a.length)[0];
  if (structuredText?.length >= 160) return structuredText;

  const selectors = [
    '[itemprop="articleBody"]',
    ".article-body",
    ".article-content",
    ".entry-content",
    ".post-content",
    ".post__content",
    ".article-copy",
    "article",
    "main",
  ];
  let fallback = structuredText ?? "";
  for (const selector of selectors) {
    const text = longestElementText($, selector, maxLength);
    if (text.length > fallback.length) fallback = text;
    if (text.length >= 300) return text;
  }

  const description =
    $('meta[property="og:description"]').attr("content") ??
    $('meta[name="description"]').attr("content") ??
    "";
  return fallback || normalizeText(description, maxLength);
}
