const L = document.querySelector("#release-list");
const T = document.querySelector("#release-status");
const Q = document.querySelector("#release-search");
const F = document.querySelector("#release-filter");

let A = [];
let P = "すべて";
const PS = ["すべて", "iOS", "iPadOS", "macOS", "watchOS", "tvOS", "HomePod", "visionOS", "AirPods"];

const fmt = (date) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00+09:00`));

const title = (version) =>
  String(version)
    .replace(/\bbeta\b/i, "Beta")
    .replace(/\brc\b/i, "RC");

function matches(release, query) {
  return (
    !query ||
    [
      release.platform,
      release.version,
      release.build,
      release.channel,
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
    '<div class="release-platform-head"><div><p class="release-platform"></p><h3></h3></div><div class="release-platform-meta"><span class="release-build"></span><time></time></div></div><ul class="release-features"></ul><div class="release-links"><a target="_blank" rel="noopener">Apple公式 ↗</a><a href="https://betaprofiles.dev/" target="_blank" rel="noopener">Beta Profiles ↗</a></div>';
  element.querySelector(".release-platform").textContent = release.platform;
  element.querySelector("h3").textContent = title(release.version);
  element.querySelector(".release-build").textContent = release.build;
  element.querySelector("time").textContent = fmt(release.releasedAt);
  const list = element.querySelector("ul");
  (release.features || []).forEach((feature) => {
    const item = document.createElement("li");
    item.textContent = feature;
    list.append(item);
  });
  element.querySelector(".release-links a").href = release.sourceUrl;
  return element;
}

function grouped(rows) {
  const groups = new Map();
  for (const release of rows) {
    const key = release.version.toLowerCase().replace(/\s+/g, " ").trim();
    if (!groups.has(key)) {
      groups.set(key, {
        version: release.version,
        channel: release.channel,
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
      title(b.version).localeCompare(title(a.version), undefined, { numeric: true }),
  );
}

function groupCard(group) {
  const details = document.createElement("details");
  details.className = "release-group";
  const summary = document.createElement("summary");
  summary.className = "release-group-summary";
  summary.innerHTML =
    '<div><p class="release-platform">Apple OS</p><h2></h2><div class="release-badges"><span class="release-badge"></span></div></div><div class="release-group-side"><time></time><span class="release-count"></span><span class="release-chevron" aria-hidden="true"></span></div>';
  summary.querySelector("h2").textContent = title(group.version);
  const badge = summary.querySelector(".release-badge");
  badge.textContent =
    group.channel === "stable" ? "正式版" : group.channel === "rc" ? "RC" : "Beta";
  if (group.channel === "beta") badge.classList.add("beta");
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
fetch("./data/releases.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw Error(response.status);
    return response.json();
  })
  .then((data) => {
    A = (data.releases || []).filter((release) =>
      /^2[67](?:\.|$)/.test(release.version),
    );
    buttons();
    draw();
  })
  .catch(() => {
    T.textContent = "読み込みエラー";
    L.innerHTML =
      '<div class="empty-state">配信情報を読み込めませんでした。</div>';
  });
