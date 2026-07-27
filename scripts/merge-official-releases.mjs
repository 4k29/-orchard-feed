import fs from "node:fs";

const [, , input = "data/releases.json"] = process.argv;
const APPLE_RELEASES_URL = "https://developer.apple.com/news/releases/";
const PLATFORMS = new Set(["iOS", "iPadOS", "macOS", "watchOS", "tvOS", "visionOS"]);

const knownOfficialStableReleases = [
  { platform: "iOS", version: "26.6", build: "23G71", releasedAt: "2026-07-27" },
  { platform: "iPadOS", version: "26.6", build: "23G71", releasedAt: "2026-07-27" },
  { platform: "macOS", version: "26.6", build: "25G72", releasedAt: "2026-07-27" },
  { platform: "watchOS", version: "26.6", build: "23U67", releasedAt: "2026-07-27" },
  { platform: "tvOS", version: "26.6", build: "23L773", releasedAt: "2026-07-27" },
  { platform: "visionOS", version: "26.6", build: "23O770", releasedAt: "2026-07-27" },
];

const monthNumbers = new Map([
  ["January", "01"], ["February", "02"], ["March", "03"], ["April", "04"],
  ["May", "05"], ["June", "06"], ["July", "07"], ["August", "08"],
  ["September", "09"], ["October", "10"], ["November", "11"], ["December", "12"],
]);

function htmlToText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(month, day, year) {
  const number = monthNumbers.get(month);
  if (!number) return "";
  return `${year}-${number}-${String(day).padStart(2, "0")}`;
}

function parseOfficialStableReleases(html) {
  const text = htmlToText(html);
  const releases = [];
  const pattern = /\b(iOS|iPadOS|macOS|watchOS|tvOS|visionOS)\s+(\d+(?:\.\d+){1,2})(?!\s+(?:beta|RC|release candidate))\s*\(([A-Za-z0-9]+)\)\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/g;

  for (const match of text.matchAll(pattern)) {
    const [, platform, version, build, month, day, year] = match;
    if (!PLATFORMS.has(platform) || !/^(26|27)(?:\.|$)/.test(version)) continue;
    const releasedAt = isoDate(month, day, year);
    if (!releasedAt) continue;
    releases.push({ platform, version, build, releasedAt });
  }

  return releases;
}

function stableFeatures(platform, version) {
  if (version === "26.6") {
    return ["重要なセキュリティアップデート", "安定性と不具合の改善"];
  }
  return ["安定性とセキュリティの改善", "前バージョンからの不具合修正"];
}

function mergeStable(payload, releases) {
  const output = new Map(
    payload.releases.map((release) => [
      [release.platform, release.version.toLowerCase(), release.build, release.releasedAt, release.channel].join("|"),
      release,
    ]),
  );

  for (const release of releases) {
    const key = [release.platform, release.version.toLowerCase(), release.build, release.releasedAt, "stable"].join("|");
    if (output.has(key)) continue;
    output.set(key, {
      ...release,
      channel: "stable",
      features: stableFeatures(release.platform, release.version),
      sourceUrl: APPLE_RELEASES_URL,
    });
  }

  payload.releases = [...output.values()].sort(
    (a, b) =>
      b.releasedAt.localeCompare(a.releasedAt) ||
      b.version.localeCompare(a.version, undefined, { numeric: true }) ||
      a.platform.localeCompare(b.platform),
  );
  payload.count = payload.releases.length;
  payload.updatedAt = new Date().toISOString();
}

const payload = JSON.parse(fs.readFileSync(input, "utf8"));
let official = [];

try {
  const response = await fetch(APPLE_RELEASES_URL, {
    headers: { "user-agent": "Orchard OS release checker" },
  });
  if (!response.ok) throw new Error(`Apple Developer Releases: HTTP ${response.status}`);
  official = parseOfficialStableReleases(await response.text());
} catch (error) {
  console.error(error);
}

mergeStable(payload, [...knownOfficialStableReleases, ...official]);
fs.writeFileSync(input, `${JSON.stringify(payload)}\n`);
