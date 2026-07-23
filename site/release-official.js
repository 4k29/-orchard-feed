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

function releaseSeries(version) {
  return numericVersion(version);
}

function removeRepeatedFeatures(rows) {
  const previousByVersion = new Map();
  const changedByRelease = new Map();
  const chronological = [...rows].sort((a, b) => {
    const date = a.releasedAt.localeCompare(b.releasedAt);
    if (date) return date;
    const platform = a.platform.localeCompare(b.platform);
    if (platform) return platform;
    const version = numericVersion(a.version).localeCompare(numericVersion(b.version), undefined, {
      numeric: true,
    });
    if (version) return version;
    const channel = CHANNEL_ORDER[channelOf(a)] - CHANNEL_ORDER[channelOf(b)];
    if (channel) return channel;
    return releaseTitle(a).localeCompare(releaseTitle(b), undefined, { numeric: true });
  });

  for (const release of chronological) {
    const channel = channelOf(release);
    const complete = completeFeatures(release);

    if (channel === "rc" || channel === "stable") {
      changedByRelease.set(identity(release), complete);
      continue;
    }

    const key = [release.platform, numericVersion(release.version), channel].join("|");
    const previous = previousByVersion.get(key) || new Set();
    changedByRelease.set(
      identity(release),
      complete.filter((feature) => !previous.has(feature)),
    );
    previousByVersion.set(key, new Set(complete));
  }

  return rows.map((release) => ({
    ...release,
    channel: channelOf(release),
    features: changedByRelease.get(identity(release)) || [],
  }));
}
