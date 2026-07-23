const L = document.querySelector("#release-list");
const T = document.querySelector("#release-status");
const Q = document.querySelector("#release-search");
const F = document.querySelector("#release-filter");

let A = [];
let P = "すべて";
let H = new Set();

const PS = ["すべて", "iOS", "iPadOS", "macOS", "watchOS", "tvOS", "HomePod", "visionOS"];
const CHANNEL_ORDER = {
  "developer-beta": 0,
  "public-beta": 1,
  rc: 2,
  stable: 3,
};

const fmt = (date) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00+09:00`));

function channelOf(release) {
  const text = `${release.channel || ""} ${release.version || ""}`.toLowerCase();
  if (text.includes("public-beta") || /\b(?:public|pub)\s+beta\b/.test(text)) {
    return "public-beta";
  }
  if (text.includes("developer-beta") || /\b(?:developer|dev)\s+beta\b/.test(text)) {
    return "developer-beta";
  }
  if (release.channel === "rc" || /\b(?:rc|release candidate)\b/i.test(release.version || "")) {
    return "rc";
  }
  if (release.channel === "stable") return "stable";
  if (release.channel === "beta" || /\bbeta\b/i.test(release.version || "")) {
    return "developer-beta";
  }
  return "stable";
}

function channelLabel(channel) {
  if (channel === "developer-beta") return "Dev Beta";
  if (channel === "public-beta") return "Pub Beta";
  if (channel === "rc") return "RC";
  return "正規版";
}

function releaseTitle(release) {
  const channel = channelOf(release);
  let value = String(release.version || "")
    .replace(/release candidate/gi, "Release Candidate")
    .replace(/\brc\b/gi, "Release Candidate")
    .replace(/\s+/g, " ")
    .trim();

  if (channel === "public-beta") {
    value = value
      .replace(/\bpublic\s+beta\b/i, "Public Beta")
      .replace(/\bpub\s+beta\b/i, "Public Beta");
    if (!/\bPublic Beta\b/.test(value)) value = value.replace(/\bbeta\b/i, "Public Beta");
  } else if (channel === "developer-beta") {
    value = value
      .replace(/\bdeveloper\s+beta\b/i, "Developer Beta")
      .replace(/\bdev\s+beta\b/i, "Developer Beta");
    if (!/\bDeveloper Beta\b/.test(value)) value = value.replace(/\bbeta\b/i, "Developer Beta");
  }

  return value;
}

function fullReleaseTitle(release) {
  const title = releaseTitle(release);
  return title.startsWith(`${release.platform} `) ? title : `${release.platform} ${title}`;
}

function majorVersion(version) {
  return String(version || "").match(/^\d+/)?.[0] || "";
}

function releaseSeries(version) {
  const parts = String(version || "").match(/^\d+(?:\.\d+){0,2}/)?.[0]?.split(".") || [];
  return parts.slice(0, 2).join(".");
}

function identity(release) {
  return [release.platform, release.version, release.build, release.releasedAt].join("|");
}

function removeRepeatedFeatures(rows) {
  const previousBySeries = new Map();
  const changedByRelease = new Map();
  const chronological = [...rows].sort((a, b) => {
    const date = a.releasedAt.localeCompare(b.releasedAt);
    if (date) return date;
    const platform = a.platform.localeCompare(b.platform);
    if (platform) return platform;
    const series = releaseSeries(a.version).localeCompare(releaseSeries(b.version), undefined, {
      numeric: true,
    });
    if (series) return series;
    const channel = CHANNEL_ORDER[channelOf(a)] - CHANNEL_ORDER[channelOf(b)];
    if (channel) return channel;
    return releaseTitle(a).localeCompare(releaseTitle(b), undefined, { numeric: true });
  });

  for (const release of chronological) {
    const key = [release.platform, releaseSeries(release.version)].join("|");
    const previous = previousBySeries.get(key) || new Set();
    const complete = release.features || [];
    changedByRelease.set(
      identity(release),
      complete.filter((feature) => !previous.has(feature)),
    );
    previousBySeries.set(key, new Set(complete));
  }

  return rows.map((release) => ({
    ...release,
    channel: channelOf(release),
    features: changedByRelease.get(identity(release)) || [],
  }));
}

function latestLinkTargets(rows) {
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

function matches(release, query) {
  return (
    !query ||
    [
      release.platform,
      releaseTitle(release),
      release.build,
      channelLabel(channelOf(release)),
      ...(release.features || []),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function detail(release) {
  const element = document.createElement("section");
  element.className = "release-platform-item";
  element.innerHTML =
    '<div class="release-platform-head"><div><p class="release-platform"></p><h3></h3></div><div class="release-platform-meta"><span class="release-build"></span><time></time></div></div><ul class="release-features"></ul>';
  element.querySelector(".release-platform").textContent = release.platform;
  element.querySelector("h3").textContent = fullReleaseTitle(release);
  element.querySelector(".release-build").textContent = release.build;
  element.querySelector("time").textContent = fmt(release.releasedAt);

  const list = element.querySelector("ul");
  (release.features || []).forEach((feature) => {
    const item = document.createElement("li");
    item.textContent = feature;
    list.append(item);
  });
  if (!list.children.length) list.remove();

  if (H.has(identity(release))) {
    const links = document.createElement("div");
    links.className = "release-links";

    const apple = document.createElement("a");
    apple.href = release.sourceUrl;
    apple.target = "_blank";
    apple.rel = "noopener";
    apple.textContent = "Apple公式 ↗";

    const profiles = document.createElement("a");
    profiles.href = "https://betaprofiles.dev/";
    profiles.target = "_blank";
    profiles.rel = "noopener";
    profiles.textContent = "Beta Profiles ↗";

    links.append(apple, profiles);
    element.append(links);
  }

  return element;
}

function grouped(rows) {
  const groups = new Map();
  for (const release of rows) {
    const channel = channelOf(release);
    const displayTitle = releaseTitle(release);
    const key = `${channel}|${displayTitle.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        version: displayTitle,
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

function groupCard(group) {
  const details = document.createElement("details");
  details.className = "release-group";
  const summary = document.createElement("summary");
  summary.className = "release-group-summary";
  summary.innerHTML =
    '<div><p class="release-platform"></p><h2></h2><div class="release-badges"><span class="release-badge"></span></div></div><div class="release-group-side"><time></time><span class="release-count"></span><span class="release-chevron" aria-hidden="true"></span></div>';
  const platformLabel = P === "すべて" ? "OS" : P;
  summary.querySelector(".release-platform").textContent = platformLabel;
  summary.querySelector("h2").textContent = P === "すべて" ? group.version : `${P} ${group.version}`;

  const badge = summary.querySelector(".release-badge");
  badge.textContent = channelLabel(group.channel);
  badge.classList.add(group.channel);

  summary.querySelector("time").textContent = fmt(group.releasedAt);
  summary.querySelector(".release-count").textContent = `${group.items.length} OS`;
  details.append(summary);

  const body = document.createElement("div");
  body.className = "release-group-body";
  group.items
    .sort((a, b) => PS.indexOf(a.platform) - PS.indexOf(b.platform))
    .forEach((release) => body.append(detail(release)));
  details.append(body);
  return details;
}

function draw() {
  const query = Q.value.trim().toLowerCase();
  const rows = A.filter(
    (release) =>
      (P === "すべて" || release.platform === P) && matches(release, query),
  );
  const groups = grouped(rows);
  L.replaceChildren(...groups.map(groupCard));
  if (!groups.length) {
    L.innerHTML = '<div class="empty-state">該当するリリースがありません。</div>';
  }
  T.textContent =
    P === "すべて"
      ? `${groups.length}リリース・${rows.length}項目`
      : `${rows.length}件`;
}

function buttons() {
  F.replaceChildren();
  PS.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${name === P ? " active" : ""}`;
    button.textContent = name;
    button.onclick = () => {
      P = name;
      F.querySelectorAll("button").forEach((item) =>
        item.classList.toggle("active", item === button),
      );
      draw();
    };
    F.append(button);
  });
}

Q.oninput = draw;
fetch("./data/releases.json")
  .then((response) => {
    if (!response.ok) throw Error(response.status);
    return response.json();
  })
  .then((data) => {
    const releases = (data.releases || []).filter(
      (release) =>
        release.platform !== "AirPods" && /^2[67](?:\.|$)/.test(release.version),
    );
    A = removeRepeatedFeatures(releases);
    H = latestLinkTargets(A);
    buttons();
    draw();
  })
  .catch((error) => {
    console.error(error);
    T.textContent = "読み込みエラー";
    L.innerHTML =
      '<div class="empty-state">配信情報を読み込めませんでした。</div>';
  });
