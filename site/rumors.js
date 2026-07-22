const productGrid = document.querySelector("#product-grid");
const productTemplate = document.querySelector("#product-template");
const weeklyTitle = document.querySelector("#weekly-title");
const weeklyIntro = document.querySelector("#weekly-intro");
const weeklyPeriod = document.querySelector("#weekly-period");

function formatDay(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";
  const jst = new Date(timestamp + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}.${jst.getUTCMonth() + 1}.${jst.getUTCDate()}`;
}

function createProduct(product) {
  const fragment = productTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".product-card");
  const status = fragment.querySelector(".product-status");
  fragment.querySelector("h3").textContent = product.name;
  fragment.querySelector(".product-summary").textContent = product.summary;

  const hasUpdates = product.status === "updated";
  card.classList.toggle("quiet", !hasUpdates);
  status.textContent = hasUpdates ? "更新あり" : "新情報なし";
  status.classList.toggle("updated", hasUpdates);

  const list = fragment.querySelector(".highlight-list");
  for (const highlight of product.highlights || []) {
    const item = document.createElement("li");
    const text = document.createElement("p");
    const source = document.createElement("a");
    text.textContent = highlight.text;
    source.href = highlight.sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = `${highlight.source} · ${formatDay(highlight.publishedAt)} ↗`;
    item.append(text, source);
    list.append(item);
  }
  return fragment;
}

async function loadDigest() {
  try {
    const response = await fetch(`./data/weekly-rumors.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const digest = await response.json();
    weeklyTitle.textContent = digest.headline;
    weeklyIntro.textContent = digest.intro;
    weeklyPeriod.textContent = digest.generatedAt
      ? `${formatDay(digest.periodStart)} — ${formatDay(digest.periodEnd)} · 毎週日曜更新`
      : "初回のまとめを準備中";

    productGrid.replaceChildren();
    if (!Array.isArray(digest.products) || !digest.products.length) {
      productGrid.innerHTML = '<div class="empty-state"><p>初回のまとめを作成しています。少し待ってから再読み込みしてください。</p></div>';
    } else {
      const fragment = document.createDocumentFragment();
      digest.products.forEach((product) => fragment.append(createProduct(product)));
      productGrid.append(fragment);
    }
    productGrid.setAttribute("aria-busy", "false");
  } catch (error) {
    weeklyTitle.textContent = "まとめを読み込めませんでした";
    weeklyIntro.textContent = "少し待ってから再読み込みしてください。";
    productGrid.setAttribute("aria-busy", "false");
    console.error(error);
  }
}

loadDigest();
