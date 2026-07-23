const listElement = document.querySelector("#release-list");
const statusElement = document.querySelector("#release-status");
const searchElement = document.querySelector("#release-search");
const filterElement = document.querySelector("#release-filter");

const PLATFORMS = ["すべて", "iOS", "iPadOS", "macOS", "watchOS", "tvOS", "HomePod", "visionOS"];
const CHANNEL_ORDER = {
  "developer-beta": 0,
  "public-beta": 1,
  rc: 2,
  stable: 3,
};

const DATA_URLS = [
  `https://raw.githubusercontent.com/4k29/-orchard-feed/main/data/releases.json?${Date.now()}`,
  "./data/releases.json",
  "../data/releases.json",
];

const OFFICIAL_NOTES = {
  iOS: {
    "26.0.1": [
      "iPhone 17、iPhone Air、iPhone 17 ProモデルでWi-FiとBluetoothの接続が切れることがある問題を修正",
      "一部のiPhoneでモバイル通信ネットワークに接続できないことがある問題を修正",
      "写真のアーチファクト、空白のアプリアイコン、VoiceOverの問題を修正",
      "重要なセキュリティアップデート",
    ],
  },
  iPadOS: {
    "26.0.1": [
      "フローティングキーボードの位置が予期せず変わることがある問題を修正",
      "一部のユーザでVoiceOverが無効になることがある問題を修正",
      "重要なセキュリティアップデート",
    ],
  },
  macOS: {
    "26.0.1": [
      "Mac Studio（M3 Ultra, 2025）でmacOS Tahoeにアップグレードできないことがある問題を修正",
      "重要なバグ修正とセキュリティアップデート",
    ],
  },
  watchOS: {
    "26.0.2": ["Apple Watch用のバグ修正", "重要なセキュリティアップデート"],
  },
  tvOS: {
    "26.0.1": ["パフォーマンスと安定性の改善"],
  },
  HomePod: {
    "26.0": [
      "Apple Musicのクロスフェードに対応",
      "AirPlayの改善",
      "バグ修正と安定性の改善",
    ],
    "26.0.1": ["パフォーマンスと安定性の改善"],
  },
  visionOS: {
    "26.0.1": ["重要なバグ修正", "すべてのユーザに推奨されるアップデート"],
  },
};

let releases = [];
let selectedPlatform = "すべて";
let latestLinkTargets = new Set();

function formatDate(value) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function channelOf(release) {
  const channel = String(release.channel || "").toLowerCase();
  const version = String(release.version || "").toLowerCase();
  const text = `${channel} ${version}`;

  if (channel === "public-beta" || /\b(?:public|pub)\s+beta\b/.test(text)) {
    return "public-beta";
  }
  if (channel === "developer-beta" || /\b(?:developer|dev)\s+beta\b/.test(text)) {
    return "developer-beta";
  }
  if (channel === "rc" || /\b(?:rc|release candidate)\b/.test(text)) return "rc";
  if (channel === "stable") return "stable";
  if (channel === "beta" || /\bbeta\b/.test(version)) return "developer-beta";
  return "stable";
}

function channelLabel(channel) {
  if (channel === "developer-beta") return "Dev β";
  if (channel === "public-beta") return "Pub β";
  if (channel === "rc") return "RC";
  return "正規版";
}

function releaseTitle(release) {
  return String(release.version || "")
    .replace(/\b(?:developer|dev|public|pub)\s+beta\b/gi, "beta")
    .replace(/\bbeta\b/gi, "beta")
    .replace(/\brelease candidate\b/gi, "RC")
    .replace(/\brc\b/gi, "RC")
    .replace(/\s+/g, " ")
    .trim();
}

function fullReleaseTitle(release) {
  const title = releaseTitle(release);
  return title.startsWith(`${release.platform} `) ? title : `${release.platform} ${title}`;
}

function numericVersion(value) {
  return String(value || "").match(/^\d+(?:\.\d+){0,2}/)?.[0] || "";
}

function majorVersion(value) {
  return numericVersion(value).split(".")[0] || "";
}

function identity(release) {
  return [
    release.platform,
    release.version,
    release.build,
    release.releasedAt,
    channelOf(release),
  ].join("|");
}

function completeFeatures(release) {
  const exact = OFFICIAL_NOTES[release.platform]?.[numericVersion(release.version)];
  if (exact) return [...exact];
  return Array.isArray(release.features) ? [...release.features] : [];
}

function removeRepeatedBetaFeatures(rows) {
  const previousByVersionAndChannel = new Map();
  const featuresByRelease = new Map();
  const chronological = [...rows].sort((a, b) => {
    const date = a.releasedAt.localeCompare(b.releasedAt);
    if (date) return date;
    const platform = a.platform.localeCompare(b.platform);
    if (platform) return platform;
    const version = numericVersion(a.version).localeCompare(numericVersion(b.version), undefined, {
      numeric: true,
    });
    if (version) return version;
    return CHANNEL_ORDER[channelOf(a)] - CHANNEL_ORDER[channelOf(b)];
  });

  for (const release of chronological) {
    const channel = channelOf(release);
    const complete = completeFeatures(release);

    if (channel === "rc" || channel === "stable") {
      featuresByRelease.set(identity(release), complete);
      continue;
    }

    const key = [release.platform, numericVersion(release.version), channel].join("|");
    const previous = previousByVersionAndChannel.get(key) || new Set();
    const changed = complete.filter((feature) => !previous.has(feature));
    featuresByRelease.set(identity(release), changed);
    previousByVersionAndChannel.set(key, new Set(complete));
  }

  return rows.map((release) => ({
    ...release,
    channel: channelOf(release),
    features: featuresByRelease.get(identity(release)) || [],
  }));
}

function findLatestLinkTargets(rows) {
  const latestDates = new Map();

  for (const release of rows) {
    const major = majorVersion(release.version);
    if (!major) continue;
    const key = `${release.platform}|${major}`;
    const current = latestDates.get(key);
    if (!current || release.releasedAt > current) latestDates.set(key, release.releasedAt);
  }

  return new Set(
    rows
      .filter((release) => {
        const major = majorVersion(release.version);
        return major && release.releasedAt === latestDates.get(`${release.platform}|${major}`);
      })
      .map(identity),
  );
}

function matchesSearch(release, query) {
  if (!query) return true;
  return [
    release.platform,
    releaseTitle(release),
    release.build,
    channelLabel(channelOf(release)),
    ...(release.features || []),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function detailElement(release) {
  const element = document.createElement("section");
  element.className = "release-platform-item";
  element.innerHTML =
    '<div class="release-platform-head"><div><p class="release-platform"></p><h3></h3></div><div class="release-platform-meta"><span class="release-build"></span><time></time></div></div><ul class="release-features"></ul>';

  element.querySelector(".release-platform").textContent = release.platform;
  element.querySelector("h3").textContent = fullReleaseTitle(release);
  element.querySelector(".release-build").textContent = release.build || "—";
  element.querySelector("time").textContent = formatDate(release.releasedAt);

  const featureList = element.querySelector(".release-features");
  for (const feature of release.features || []) {
    const item = document.createElement("li");
    item.textContent = feature;
    featureList.append(item);
  }
  if (!featureList.children.length) featureList.remove();

  if (latestLinkTargets.has(identity(release))) {
    const links = document.createElement("div");
    links.className = "release-links";

    if (release.sourceUrl) {
      const apple = document.createElement("a");
      apple.href = release.sourceUrl;
      apple.target = "_blank";
      apple.rel = "noopener";
      apple.textContent = "Apple公式 ↗";
      links.append(apple);
    }

    const profiles = document.createElement("a");
    profiles.href = "https://betaprofiles.dev/";
    profiles.target = "_blank";
    profiles.rel = "noopener";
    profiles.textContent = "Beta Profiles ↗";
    links.append(profiles);

    element.append(links);
  }

  return element;
}

function groupRows(rows) {
  const groups = new Map();

  for (const release of rows) {
    const channel = channelOf(release);
    const title = releaseTitle(release);
    const key = `${channel}|${title.toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        version: title,
        channel,
        releasedAt: release.releasedAt,
        items: [],
      });
    }

    const group = groups.get(key);
    group.items.push(release);
    if (release.releasedAt > group.releasedAt) group.releasedAt = release.releasedAt;
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.releasedAt.localeCompare(a.releasedAt) ||
      b.version.localeCompare(a.version, undefined, { numeric: true }),
  );
}

function groupElement(group) {
  const details = document.createElement("details");
  details.className = "release-group";

  const summary = document.createElement("summary");
  summary.className = "release-group-summary";
  summary.innerHTML =
    '<div><p class="release-platform"></p><h2></h2><div class="release-badges"><span class="release-badge"></span></div></div><div class="release-group-side"><time></time><span class="release-count"></span><span class="release-chevron" aria-hidden="true"></span></div>';

  summary.querySelector(".release-platform").textContent =
    selectedPlatform === "すべて" ? "OS" : selectedPlatform;
  summary.querySelector("h2").textContent =
    selectedPlatform === "すべて" ? group.version : `${selectedPlatform} ${group.version}`;

  const badge = summary.querySelector(".release-badge");
  badge.textContent = channelLabel(group.channel);
  badge.classList.add(group.channel);

  summary.querySelector("time").textContent = formatDate(group.releasedAt);
  summary.querySelector(".release-count").textContent = `${group.items.length} OS`;
  details.append(summary);

  const body = document.createElement("div");
  body.className = "release-group-body";
  group.items
    .sort((a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform))
    .forEach((release) => body.append(detailElement(release)));
  details.append(body);

  return details;
}

function draw() {
  const query = searchElement.value.trim().toLowerCase();
  const rows = releases.filter(
    (release) =>
      (selectedPlatform === "すべて" || release.platform === selectedPlatform) &&
      matchesSearch(release, query),
  );
  const groups = groupRows(rows);

  listElement.replaceChildren(...groups.map(groupElement));
  if (!groups.length) {
    listElement.innerHTML = '<div class="empty-state">該当するリリースがありません。</div>';
  }

  statusElement.textContent =
    selectedPlatform === "すべて"
      ? `${groups.length}リリース・${rows.length}項目`
      : `${rows.length}件`;
}

function buildFilters() {
  filterElement.replaceChildren();

  for (const name of PLATFORMS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${name === selectedPlatform ? " active" : ""}`;
    button.textContent = name;
    button.addEventListener("click", () => {
      selectedPlatform = name;
      filterElement.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      draw();
    });
    filterElement.append(button);
  }
}

async function fetchReleaseData() {
  let lastError;

  for (const url of DATA_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.releases)) throw new Error("Invalid release data");
      return data.releases;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Release data could not be loaded");
}

async function initialize() {
  try {
    const loaded = await fetchReleaseData();
    const valid = loaded.filter(
      (release) =>
        release &&
        typeof release.platform === "string" &&
        typeof release.version === "string" &&
        typeof release.releasedAt === "string" &&
        release.platform !== "AirPods" &&
        /^2[67](?:\.|$)/.test(release.version),
    );

    releases = removeRepeatedBetaFeatures(valid);
    latestLinkTargets = findLatestLinkTargets(releases);
    buildFilters();
    draw();
  } catch (error) {
    console.error(error);
    statusElement.textContent = "読み込みエラー";
    listElement.innerHTML = '<div class="empty-state">配信情報を読み込めませんでした。</div>';
  }
}

searchElement.addEventListener("input", draw);
initialize();
