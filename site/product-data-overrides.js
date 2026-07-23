(() => {
  const revisionDates = new Map([
    ["iPad Air 13インチ（M4）", ["26/6/25"]],
    ["iPad Air 11インチ（M4）", ["26/6/25"]],
    ["iPad Pro 13インチ（M5）", ["26/6/25"]],
    ["iPad Pro 11インチ（M5）", ["26/6/25"]],
    ["iPad（A16）", ["26/6/25"]],
    ["iPad mini（A17 Pro）", ["26/6/25"]],
    ["MacBook Air（M2、2022）", ["24/3/5"]],
    ["iPad Air（第5世代）", ["22/7/1", "22/10/19"]],
    ["iPhone SE（第3世代）", ["22/7/1"]],
    ["AirPods 3", ["22/7/1"]],
    ["MacBook Pro（16インチ、M1 Max、2021）", ["22/6/7"]],
    ["MacBook Pro（16インチ、M1 Pro、2021）", ["22/6/7"]],
    ["MacBook Pro（14インチ、M1 Max、2021）", ["22/6/7"]],
    ["MacBook Pro（14インチ、M1 Pro、2021）", ["22/6/7"]],
    ["Apple Watch Series 7", ["22/7/1"]],
    ["iPhone 13 Pro Max", ["22/7/1"]],
    ["iPhone 13 Pro", ["22/7/1"]],
    ["iPad（第9世代）", ["22/7/1"]],
    ["iPhone 13", ["22/7/1"]],
    ["iPad mini（第6世代）", ["22/7/1", "22/10/19"]],
    ["iPhone 13 mini", ["22/7/1"]],
    ["iPad Pro 12.9インチ（第5世代）", ["22/7/1"]],
    ["iPad Pro 11インチ（第3世代）", ["22/7/1"]],
    ["AirPods Max 1", ["22/7/1"]],
    ["MacBook Air（M1、2020）", ["22/6/7"]],
    ["AirPods Pro 1", ["22/7/1"]],
    ["iPad（第4世代）", ["13/5/31"]],
    ["iPad mini", ["13/5/31"]],
  ]);

  const priceOverrides = new Map([
    ["AirTag", [
      "1個 3,800円 / 4個 12,800円～",
      "1個 4,780円 / 4個 15,980円～(22/7/1)",
      "1個 4,980円 / 4個 16,980円～(23/9/13)",
    ]],
    ["AirPods 2", [
      "17,800円（税別）～",
      "16,800円～(21/10/19)",
      "19,800円～(22/7/1)",
    ]],
  ]);

  function normalizePrice(value) {
    return String(value || "")
      .replace(/（税込）/g, "")
      .replace(/〜/g, "～")
      .replace(/\(20(\d{2})\/(\d{1,2})\/(\d{1,2})\)/g, "($1/$2/$3)");
  }

  function completeProduct(product) {
    const override = priceOverrides.get(product.name);
    if (override) product.prices = [...override];
    else {
      const dates = revisionDates.get(product.name) || [];
      product.prices = (product.prices || []).map((price, index) => {
        const normalized = normalizePrice(price);
        if (index === 0 || /\(\d{2}\/\d{1,2}\/\d{1,2}\)$/.test(normalized)) return normalized;
        return dates[index - 1] ? `${normalized}(${dates[index - 1]})` : normalized;
      });
    }
    if ((product.prices || []).length > 1 || /^(?:AirPods|AirTag)\b/.test(product.name || "")) {
      product.priceHistory = true;
    }
    return product;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const input = args[0];
    const url = typeof input === "string" ? input : input?.url || "";
    if (!/(?:^|\/)data\/products\.json(?:$|[?#])/.test(url)) return response;

    try {
      const data = await response.clone().json();
      data.products = (data.products || []).map(completeProduct);
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch {
      return response;
    }
  };

  function organizeProductCard(card) {
    const summary = card.querySelector(".product-details summary");
    if (summary) summary.textContent = "製品詳細";

    const detailsList = card.querySelector(".product-details dl");
    if (!detailsList) return;

    const initialOSRow = [...card.querySelectorAll(".product-facts > div")]
      .find((row) => row.querySelector("dt")?.textContent.trim() === "初期OS");
    if (!initialOSRow) return;

    const existing = [...detailsList.children]
      .some((row) => row.querySelector("dt")?.textContent.trim() === "初期OS");
    if (existing) initialOSRow.remove();
    else detailsList.prepend(initialOSRow);
  }

  function activateProductDetailsLayout() {
    const grid = document.querySelector("#product-grid");
    if (!grid) return;

    const sync = () => grid.querySelectorAll(".product-card").forEach(organizeProductCard);
    sync();
    new MutationObserver(sync).observe(grid, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activateProductDetailsLayout, { once: true });
  } else {
    activateProductDetailsLayout();
  }
})();