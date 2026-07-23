function appleReleaseName(value) {
  return String(value || "")
    .replace(/\bDev Beta\b/g, "Developer Beta")
    .replace(/\bPub Beta\b/g, "Public Beta")
    .replace(/\bRC\b/g, "Release Candidate")
    .replace(/\s+/g, " ")
    .trim();
}

function updateReleaseNames(root = document) {
  root.querySelectorAll(".release-group-summary").forEach((summary) => {
    const platform = summary.querySelector(".release-platform")?.textContent?.trim();
    const title = summary.querySelector("h2");
    if (!title) return;

    let value = appleReleaseName(title.textContent);
    if (platform && platform !== "OS" && !value.startsWith(`${platform} `)) {
      value = `${platform} ${value}`;
    }
    title.textContent = value;
  });

  root.querySelectorAll(".release-platform-item").forEach((item) => {
    const platform = item.querySelector(".release-platform")?.textContent?.trim();
    const title = item.querySelector("h3");
    if (!platform || !title) return;

    let value = appleReleaseName(title.textContent);
    if (!value.startsWith(`${platform} `)) value = `${platform} ${value}`;
    title.textContent = value;
  });
}

const releaseObserver = new MutationObserver(() => updateReleaseNames());
releaseObserver.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("DOMContentLoaded", () => updateReleaseNames());
