const DAY_MS = 24 * 60 * 60 * 1000;

export const PRODUCT_FAMILIES = [
  {
    id: "iphone",
    name: "iPhone",
    pattern: /\biphone\b|foldable iphone|iphone fold|折りたたみ.*iphone/i,
  },
  {
    id: "ipad",
    name: "iPad",
    pattern: /\bipad\b|apple pencil/i,
  },
  {
    id: "mac",
    name: "Mac",
    pattern: /\bmacbook\b|\bimac\b|\bmac mini\b|\bmac studio\b|\bmac pro\b|apple silicon|\bm[1-9]\b.*(?:chip|チップ)/i,
  },
  {
    id: "watch",
    name: "Apple Watch",
    pattern: /apple watch|watchos/i,
  },
  {
    id: "audio",
    name: "AirPods・オーディオ",
    pattern: /airpods|beats (?:fit|studio|solo|pill)|beats製品/i,
  },
  {
    id: "vision",
    name: "Vision・空間コンピューティング",
    pattern: /vision pro|visionos|apple (?:glasses|smart glasses)|スマートグラス|空間コンピューティング/i,
  },
  {
    id: "home",
    name: "Apple TV・Home",
    pattern: /apple tv(?!\+)|homepod|homekit|homeos|smart home|スマートホーム/i,
  },
  {
    id: "accessories",
    name: "ディスプレイ・アクセサリ",
    pattern: /studio display|pro display|thunderbolt display|magic keyboard|magic mouse|airtag|apple pencil|アクセサリ/i,
  },
  {
    id: "software",
    name: "OS・サービス",
    pattern: /\bios\s?\d|\bipados\b|\bmacos\b|\bwatchos\b|\bvisionos\b|apple intelligence|\bsiri\b|\bicloud\b|app store|apple music|apple tv\+|apple arcade/i,
  },
];

function articleText(article) {
  return [article.titleJa, article.titleOriginal, article.summaryJa, ...(article.tags ?? [])]
    .filter(Boolean)
    .join(" ");
}

export function collectRumorCandidates(articles, { now = Date.now(), days = 7 } = {}) {
  const end = new Date(now).getTime();
  if (!Number.isFinite(end)) throw new Error("Invalid weekly digest clock");
  const start = end - days * DAY_MS;

  return articles
    .filter((article) => article?.category === "rumors")
    .filter((article) => {
      const published = new Date(article.publishedAt).getTime();
      return Number.isFinite(published) && published >= start && published <= end;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function groupRumors(articles, { maxPerFamily = 6 } = {}) {
  return PRODUCT_FAMILIES.map((family) => ({
    ...family,
    articles: articles
      .filter((article) => family.pattern.test(articleText(article)))
      .slice(0, maxPerFamily),
  }));
}
