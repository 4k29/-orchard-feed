import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const roots = new Map([
  ["iOS", "iOS"],
  ["iPadOS", "iPadOS"],
  ["macOS", "macOS"],
  ["watchOS", "watchOS"],
  ["tvOS", "tvOS"],
  ["audioOS", "HomePod"],
  ["HomePod Software", "HomePod"],
  ["visionOS", "visionOS"],
]);

const publicBetaWaves = [
  {
    major: "27",
    number: 1,
    releasedAt: "2026-07-13",
    developerBeta: 3,
    platforms: ["iOS", "iPadOS", "macOS", "watchOS", "tvOS", "HomePod"],
  },
];

const releaseNotes = {
  iOS: {
    "26.0": [
      "Liquid Glassによる新しいデザイン",
      "電話・メッセージ・CarPlayの機能拡張",
      "Apple GamesとApple Intelligenceの強化",
    ],
    "26.1": [
      "Liquid Glassの色合いを選べる設定",
      "ライブ翻訳の対応拡大",
      "Apple Music・カメラ・FaceTimeの改善",
    ],
    "26.2": [
      "Apple Musicのオフライン歌詞",
      "Podcastの自動チャプター",
      "ロック画面・リマインダー・AirDropの改善",
    ],
    "26.3": ["不具合修正とセキュリティアップデート"],
    "26.4": [
      "プレイリスト作成機能とコンサート情報の強化",
      "新しい絵文字とアクセシビリティ機能",
      "AirPods Max 2への対応",
    ],
    "26.5": [
      "RCSのエンドツーエンド暗号化（ベータ）",
      "Pride Luminance壁紙",
      "マップの候補の場所",
    ],
  },
  iPadOS: {
    "26.0": [
      "新しいウインドウシステムとメニューバー",
      "Liquid Glassによる新しいデザイン",
      "プレビュー、ジャーナル、バックグラウンドタスク",
    ],
    "26.1": [
      "Slide Overの復活",
      "Liquid Glassの色合い設定",
      "ローカル収録の機能拡張",
    ],
    "26.2": [
      "マルチタスクのジェスチャとSlide Overの改善",
      "Apple Musicのオフライン歌詞",
      "Podcast・ゲーム・リマインダーの改善",
    ],
    "26.3": ["外部ディスプレイ対応の改善", "不具合修正とセキュリティ更新"],
    "26.4": [
      "新しい絵文字とアクセシビリティ機能",
      "Safariのコンパクトタブバー",
      "フリーボードの機能拡張",
    ],
    "26.5": ["Pride Luminance壁紙", "マップの候補の場所", "不具合修正"],
  },
  macOS: {
    "26.0": [
      "Liquid Glassによる新しいデザイン",
      "Spotlightの大幅な機能強化",
      "電話アプリとライブアクティビティ",
    ],
    "26.1": ["Liquid Glassの色合い設定", "Apple Music AutoMixのAirPlay対応", "不具合修正"],
    "26.2": ["Apple Musicのオフライン歌詞", "Podcastとリマインダーの改善", "不具合修正"],
    "26.3": ["不具合修正とセキュリティアップデート"],
    "26.4": [
      "AirPods Max 2への対応",
      "新しい絵文字とSafariのコンパクトタブバー",
      "フリーボードとリマインダーの機能拡張",
    ],
    "26.5": ["安定性・互換性・セキュリティの改善"],
  },
  watchOS: {
    "26.0": [
      "Liquid Glassによる新しいデザイン",
      "Workout Buddyとワークアウト機能の強化",
      "睡眠スコアと高血圧通知",
    ],
    "26.1": ["通知と操作性の改善", "不具合修正とセキュリティ更新"],
    "26.2": ["睡眠・ワークアウト・メッセージの改善", "不具合修正"],
    "26.3": ["不具合修正とセキュリティアップデート"],
    "26.4": ["新しい絵文字", "アクセシビリティとシステムの改善"],
    "26.5": ["安定性とセキュリティの改善"],
  },
  tvOS: {
    "26.0": [
      "Liquid Glassによる新しいデザイン",
      "プロフィール選択とApple Music Singの改善",
      "FaceTimeとスクリーンセーバーの機能拡張",
    ],
  },
  HomePod: {
    "26.0": ["再生、ホーム連携、安定性の改善"],
  },
  visionOS: {
    "26.0": [
      "空間ウィジェットと空間シーン",
      "PersonaとSafariの機能強化",
      "新しい共有・入力体験",
    ],
    "26.1": ["iPadのApple Vision Proアプリ", "Spatial Galleryの機能拡張"],
    "26.2": [
      "自動車・バスでのトラベルモード",
      "手描きの空間アクセサリ",
      "フリーボードの表",
    ],
    "26.3": ["MultiViewなどの不具合修正", "セキュリティアップデート"],
    "26.4": ["新しい絵文字", "AirPods Max 2への対応", "空間オーディオの部屋記憶"],
    "26.5": ["不具合修正とセキュリティアップデート"],
  },
};

const sourceUrls = {
  iOS: "https://support.apple.com/ja-jp/123075",
  iPadOS: "https://support.apple.com/ja-jp/123074",
  macOS: "https://support.apple.com/ja-jp/122868",
  watchOS: "https://support.apple.com/ja-jp/123002",
  visionOS: "https://support.apple.com/ja-jp/123024",
};

function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(root, entry.name))
      : entry.isFile() && entry.name.endsWith(".json")
        ? [path.join(root, entry.name)]
        : [],
  );
}

function baseVersion(version) {
  return String(version).match(/^\d+(?:\.\d+){1,2}/)?.[0] || String(version);
}

function features(platform, version) {
  const base = baseVersion(version);
  if (base.startsWith("27.")) {
    return [
      "Apple公式のBetaリリースノートに基づく新機能とAPI変更",
      "安定性、互換性、不具合の改善",
    ];
  }
  const notes = releaseNotes[platform] || {};
  return (
    notes[base] ||
    notes[base.split(".").slice(0, 2).join(".")] || [
      "安定性とセキュリティの改善",
      "前バージョンからの不具合修正",
    ]
  );
}

function source(platform, major) {
  if (major === "26" && sourceUrls[platform]) return sourceUrls[platform];
  return "https://developer.apple.com/news/releases/";
}

function releaseChannel(product) {
  const version = String(product.version || "");
  if (product.rc || /\b(?:rc|release candidate)\b/i.test(version)) return "rc";
  if (product.beta || /\bbeta\b/i.test(version)) {
    return /\b(?:public|pub)\s+beta\b/i.test(version)
      ? "public-beta"
      : "developer-beta";
  }
  return "stable";
}

function betaNumber(product) {
  const match = String(product.version || "").match(/\bbeta(?:\s+(\d+))?/i);
  if (match?.[1]) return Number(match[1]);
  const value = Number(product.beta);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function displayVersion(product, channel) {
  const raw = String(product.version || "").replace(/\s+/g, " ").trim();
  const base = baseVersion(raw);

  if (channel === "public-beta") return `${base} Pub Beta ${betaNumber(product)}`;
  if (channel === "developer-beta") return `${base} Dev Beta ${betaNumber(product)}`;

  if (channel === "rc") {
    const number = raw.match(/\b(?:rc|release candidate)\s*(\d+)?/i)?.[1];
    return `${base} RC${number ? ` ${number}` : ""}`;
  }

  return raw;
}

function addPublicBetaWaves(output) {
  const releases = [...output.values()];
  for (const wave of publicBetaWaves) {
    for (const platform of wave.platforms) {
      const sourceRelease = releases
        .filter(
          (release) =>
            release.platform === platform &&
            release.channel === "developer-beta" &&
            release.version.startsWith(`${wave.major}.0 Dev Beta ${wave.developerBeta}`) &&
            release.releasedAt <= wave.releasedAt,
        )
        .sort(
          (a, b) =>
            b.releasedAt.localeCompare(a.releasedAt) ||
            b.build.localeCompare(a.build, undefined, { numeric: true }),
        )[0];

      if (!sourceRelease) continue;
      const version = `${wave.major}.0 Pub Beta ${wave.number}`;
      const key = [platform, version.toLowerCase(), sourceRelease.build, wave.releasedAt].join("|");
      if (output.has(key)) continue;

      output.set(key, {
        ...sourceRelease,
        version,
        releasedAt: wave.releasedAt,
        channel: "public-beta",
      });
    }
  }
}

export function buildReleases(root) {
  const output = new Map();
  for (const file of files(root)) {
    if (
      file.includes(`${path.sep}Simulators${path.sep}`) ||
      file.includes(`${path.sep}Software${path.sep}`) ||
      file.includes(`${path.sep}Background Security Improvements${path.sep}`)
    ) {
      continue;
    }

    let product;
    try {
      product = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }

    const platform = roots.get(product.osStr);
    if (
      !platform ||
      !product.version ||
      !product.build ||
      !product.released ||
      product.released < "2025-06-09"
    ) {
      continue;
    }

    const major = String(product.version).match(/^(26|27)(?:\.|\b)/)?.[1];
    if (!major) continue;

    const channel = releaseChannel(product);
    const version = displayVersion(product, channel);
    const key = [platform, version.toLowerCase(), product.build, product.released].join("|");
    if (output.has(key)) continue;

    output.set(key, {
      platform,
      version,
      build: String(product.build),
      releasedAt: product.released,
      channel,
      features: features(platform, version),
      sourceUrl: source(platform, major),
    });
  }

  addPublicBetaWaves(output);

  return [...output.values()].sort(
    (a, b) =>
      b.releasedAt.localeCompare(a.releasedAt) ||
      b.version.localeCompare(a.version, undefined, { numeric: true }) ||
      a.platform.localeCompare(b.platform),
  );
}

function main() {
  const [, , root, output = "data/releases.json"] = process.argv;
  if (!root) process.exit(1);
  const releases = buildReleases(path.resolve(root));
  fs.writeFileSync(
    output,
    `${JSON.stringify({
      updatedAt: new Date().toISOString(),
      sources: [
        { name: "Beta Profiles", url: "https://betaprofiles.dev/" },
        { name: "AppleDB", url: "https://appledb.dev/" },
        { name: "Apple Support release notes", url: "https://support.apple.com/ja-jp/docs" },
        { name: "Apple Developer Releases", url: "https://developer.apple.com/news/releases/" },
      ],
      count: releases.length,
      releases,
    })}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
