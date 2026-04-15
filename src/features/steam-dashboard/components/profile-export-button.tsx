"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatPlaytime,
  formatUnixDate,
  getPersonaStatus,
  getSteamCapsuleImageUrl,
  type SteamOwnedGame,
  type SteamRecentGame,
  type SteamTagBreakdown,
  type SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";
import {
  BACKGROUND_APPEARANCE_EVENT,
  BACKGROUND_APPEARANCE_STORAGE_KEY,
  DEFAULT_BACKGROUND_APPEARANCE,
  type BackgroundAppearance,
  parseStoredBackgroundAppearance,
} from "@/features/steam-dashboard/utils/background-appearance";
import {
  CONNECTED_ACCOUNT_EVENT,
  getFavoritesForSteamId,
  readConnectedAccountState,
} from "@/features/steam-dashboard/utils/connected-account";
import {
  formatHours,
  formatPercent,
  getDashboardMetrics,
  getPlaytimeBuckets,
} from "@/features/steam-dashboard/utils/dashboard";
import { buildSteamTagDisplayBreakdown } from "@/features/steam-dashboard/utils/tag-breakdown";

type ProfileExportButtonProps = {
  summary: SteamUserSummary;
  tagBreakdown: SteamTagBreakdown | null;
};

type ExportStatus =
  | { tone: "idle"; message: string }
  | { tone: "progress" | "success" | "warning" | "error"; message: string };

type ResolvedExportBackground =
  | { mode: "gradient"; warning: string | null; imageUrl: null }
  | { mode: "image"; warning: string | null; imageUrl: string };

type ExportImageAssets = {
  avatar: HTMLImageElement | null;
  portraitsByAppId: Record<number, HTMLImageElement>;
  capsulesByAppId: Record<number, HTMLImageElement>;
  backgroundImage: HTMLImageElement | null;
};

const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1280;
const EXPORT_FILE_BASENAME = "steam-dashboard-profile";
const MAX_FAVORITES = 5;

function getPortraitImageUrl(appid: number) {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900_2x.jpg`;
}

function getProxiedImageUrl(url: string, width: number, quality = 85) {
  const encodedUrl = encodeURIComponent(url);
  return `/_next/image?url=${encodedUrl}&w=${width}&q=${quality}`;
}

function getExportPortraitImageUrl(appid: number) {
  return getProxiedImageUrl(getPortraitImageUrl(appid), 1200);
}

function getExportCapsuleImageUrl(appid: number) {
  return getProxiedImageUrl(getSteamCapsuleImageUrl(appid), 384);
}

function getExportAvatarUrl(url: string) {
  return getProxiedImageUrl(url, 256);
}

async function fetchFirstAvailableImageDataUrl(urls: string[]) {
  for (const url of urls) {
    const result = await fetchImageAsDataUrl(url);
    if (result) {
      return result;
    }
  }

  return null;
}

function readCurrentAppearance() {
  if (typeof window === "undefined") {
    return DEFAULT_BACKGROUND_APPEARANCE;
  }

  return parseStoredBackgroundAppearance(
    window.localStorage.getItem(BACKGROUND_APPEARANCE_STORAGE_KEY),
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toRgba(hex: string, alpha: number) {
  const { red, green, blue } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function toOpacity(transparency: number, minOpacity: number, maxOpacity: number) {
  const clamped = Math.max(0, Math.min(100, transparency));
  return minOpacity - (clamped / 100) * (minOpacity - maxOpacity);
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function fetchImageAsDataUrl(url: string) {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadImage(url: string | null) {
  if (!url) {
    return null;
  }

  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function resolveExportBackground(
  appearance: BackgroundAppearance,
): Promise<ResolvedExportBackground> {
  if (appearance.mode !== "customMedia" || !appearance.customMediaUrl) {
    return { mode: "gradient", imageUrl: null, warning: null };
  }

  if (appearance.customMediaType !== "image") {
    return {
      mode: "gradient",
      imageUrl: null,
      warning:
        "Hosted video backgrounds cannot be embedded in the export yet, so a matching gradient was used instead.",
    };
  }

  const imageUrl = await fetchImageAsDataUrl(appearance.customMediaUrl);
  if (!imageUrl) {
    return {
      mode: "gradient",
      imageUrl: null,
      warning:
        "Your hosted background could not be embedded safely in the export, so a matching gradient was used instead.",
    };
  }

  return { mode: "image", imageUrl, warning: null };
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient,
) {
  context.save();
  context.fillStyle = fillStyle;
  roundedRectPath(context, x, y, width, height, radius);
  context.fill();
  context.restore();
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth = 1,
) {
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  roundedRectPath(context, x, y, width, height, radius);
  context.stroke();
  context.restore();
}

function clipRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.clip();
}

function drawGlassCard(
  context: CanvasRenderingContext2D,
  appearance: BackgroundAppearance,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 30,
) {
  const baseOpacity = toOpacity(appearance.widgetTransparency, 0.84, 0.42);
  const overlayOpacity = appearance.mode === "customMedia" ? 0.2 : 0.13;
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, toRgba(appearance.widgetGradientColors.color1, overlayOpacity));
  gradient.addColorStop(
    0.5,
    toRgba(appearance.widgetGradientColors.color2, overlayOpacity * 0.7),
  );
  gradient.addColorStop(
    1,
    toRgba(appearance.widgetGradientColors.color3, overlayOpacity * 0.85),
  );

  fillRoundedRect(
    context,
    x,
    y,
    width,
    height,
    radius,
    toRgba(appearance.widgetBaseColor, baseOpacity),
  );
  fillRoundedRect(context, x, y, width, height, radius, gradient);
  strokeRoundedRect(context, x, y, width, height, radius, "rgba(255,255,255,0.12)");
}

function drawBackground(
  context: CanvasRenderingContext2D,
  appearance: BackgroundAppearance,
  resolvedBackground: ResolvedExportBackground,
  backgroundImage: HTMLImageElement | null,
) {
  context.fillStyle = "#09111d";
  context.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  if (resolvedBackground.mode === "image" && backgroundImage) {
    context.save();
    context.globalAlpha = 0.88;
    context.drawImage(backgroundImage, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    context.restore();
    context.fillStyle = "rgba(8,12,20,0.34)";
    context.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  }

  const layers = [
    { color: appearance.gradientColors.color1, x: 0.18, y: 0.18, radius: 0.24, alpha: 0.34 },
    { color: appearance.gradientColors.color2, x: 0.82, y: 0.16, radius: 0.21, alpha: 0.26 },
    { color: appearance.gradientColors.color3, x: 0.55, y: 0.82, radius: 0.28, alpha: 0.2 },
  ];

  for (const layer of layers) {
    const radial = context.createRadialGradient(
      EXPORT_WIDTH * layer.x,
      EXPORT_HEIGHT * layer.y,
      0,
      EXPORT_WIDTH * layer.x,
      EXPORT_HEIGHT * layer.y,
      EXPORT_WIDTH * layer.radius,
    );
    radial.addColorStop(0, toRgba(layer.color, layer.alpha));
    radial.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = radial;
    context.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  }

  context.fillStyle = "rgba(255,255,255,0.05)";
  context.fillRect(0, 0, EXPORT_WIDTH, 120);
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    font: string;
    color: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  },
) {
  context.save();
  context.font = options.font;
  context.fillStyle = options.color;
  context.textAlign = options.align ?? "left";
  context.textBaseline = options.baseline ?? "alphabetic";
  context.fillText(text, x, y);
  context.restore();
}

function drawMultilineText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  font: string,
  color: string,
) {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "top";

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    let truncated = visibleLines[maxLines - 1];
    while (
      truncated.length > 0 &&
      context.measureText(`${truncated}...`).width > maxWidth
    ) {
      truncated = truncated.slice(0, -1);
    }
    visibleLines[maxLines - 1] = `${truncated}...`;
  }

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  context.restore();
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  fillRoundedRect(context, x, y, width, height, radius, "rgba(255,255,255,0.04)");
  if (!image) {
    return;
  }

  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  clipRoundedRect(context, x, y, width, height, radius);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

function drawBadge(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  background: string,
  color: string,
) {
  context.save();
  context.font = "600 18px 'Segoe UI'";
  const width = context.measureText(text).width + 28;
  fillRoundedRect(context, x, y, width, 34, 17, background);
  drawText(context, text, x + width / 2, y + 18, {
    font: "600 18px 'Segoe UI'",
    color,
    align: "center",
    baseline: "middle",
  });
  context.restore();
}

function drawHeaderSection(
  context: CanvasRenderingContext2D,
  summary: SteamUserSummary,
  appearance: BackgroundAppearance,
  avatar: HTMLImageElement | null,
) {
  const metrics = getDashboardMetrics(summary);
  const x = 48;
  const y = 48;
  const width = EXPORT_WIDTH - 96;
  const height = 196;
  drawGlassCard(context, appearance, x, y, width, height, 32);

  drawImageCover(context, avatar, x + 28, y + 28, 112, 112, 28);
  drawText(context, "STEAM DASHBOARD SNAPSHOT", x + 164, y + 54, {
    font: "600 17px 'Segoe UI'",
    color: "#9bdcff",
  });
  drawText(context, summary.player.personaname, x + 164, y + 106, {
    font: "700 52px 'Segoe UI'",
    color: "#ffffff",
  });
  drawText(
    context,
    `${getPersonaStatus(summary.player.personastate)} / Joined ${formatUnixDate(summary.player.timecreated)} / ${summary.player.loccountrycode ?? "Unknown region"}`,
    x + 164,
    y + 144,
    {
      font: "400 22px 'Segoe UI'",
      color: "rgba(226,237,251,0.8)",
    },
  );
  drawBadge(
    context,
    `Steam ID: ${summary.player.steamid}`,
    x + 164,
    y + 164,
    "rgba(255,255,255,0.08)",
    "#dce9f8",
  );

  const stats = [
    ["Total Games", metrics.totalGames.toLocaleString(), `+${summary.recentGames.length} active`, "#65e6a5"],
    ["Hours Played", formatHours(metrics.totalMinutes), `+${formatHours(metrics.recentlyPlayedMinutes)} hrs`, "#90d7ff"],
    ["Avg Hrs/Game", metrics.averageHoursPerPlayedGame.toFixed(1), `${metrics.playedGames} played`, "#c8bcff"],
    ["Completion", formatPercent(metrics.completionRate), `${metrics.unplayedGames} backlog`, "#ffd287"],
  ] as const;

  const statWidth = 240;
  const statHeight = 64;
  const statStartX = x + width - 2 * statWidth - 40;
  const statStartY = y + 32;

  stats.forEach(([label, value, hint, accent], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const statX = statStartX + column * (statWidth + 16);
    const statY = statStartY + row * (statHeight + 16);
    drawGlassCard(context, appearance, statX, statY, statWidth, statHeight, 22);
    drawText(context, label, statX + 18, statY + 24, {
      font: "600 15px 'Segoe UI'",
      color: "#9bdcff",
    });
    drawText(context, value, statX + 18, statY + 48, {
      font: "700 26px 'Segoe UI'",
      color: "#ffffff",
    });
    drawText(context, hint, statX + statWidth - 18, statY + 24, {
      font: "600 13px 'Segoe UI'",
      color: accent,
      align: "right",
    });
  });
}

function drawPortraitRowSection(
  context: CanvasRenderingContext2D,
  appearance: BackgroundAppearance,
  title: string,
  subtitle: string,
  x: number,
  y: number,
  width: number,
  height: number,
  games: Array<SteamOwnedGame | null>,
  portraitsByAppId: Record<number, HTMLImageElement>,
  showRanks: boolean,
) {
  drawGlassCard(context, appearance, x, y, width, height, 30);
  drawText(context, title, x + 24, y + 38, {
    font: "700 27px 'Segoe UI'",
    color: "#ffffff",
  });
  drawText(context, subtitle, x + 24, y + 66, {
    font: "400 16px 'Segoe UI'",
    color: "rgba(226,237,251,0.72)",
  });

  const gap = 14;
  const cardWidth = (width - 48 - gap * 4) / 5;
  const cardHeight = height - 90;

  games.forEach((game, index) => {
    const cardX = x + 24 + index * (cardWidth + gap);
    const cardY = y + 84;
    const isTopPick = showRanks && index === 0 && game;
    drawGlassCard(context, appearance, cardX, cardY, cardWidth, cardHeight, 24);

    if (isTopPick) {
      strokeRoundedRect(
        context,
        cardX,
        cardY,
        cardWidth,
        cardHeight,
        24,
        "rgba(252,211,77,0.84)",
        3,
      );
    }

    const imageHeight = cardHeight - 74;
    drawImageCover(
      context,
      game ? portraitsByAppId[game.appid] ?? null : null,
      cardX + 12,
      cardY + 12,
      cardWidth - 24,
      imageHeight,
      20,
    );

    if (showRanks) {
      drawBadge(
        context,
        `#${index + 1}`,
        cardX + 14,
        cardY + 14,
        "rgba(13,23,40,0.92)",
        "#ffffff",
      );
    }

    if (!game) {
      drawText(context, "Empty slot", cardX + cardWidth / 2, cardY + imageHeight + 40, {
        font: "600 20px 'Segoe UI'",
        color: "#ffffff",
        align: "center",
      });
      return;
    }

    drawMultilineText(
      context,
      game.name,
      cardX + 14,
      cardY + imageHeight + 14,
      cardWidth - 28,
      20,
      2,
      "600 17px 'Segoe UI'",
      "#ffffff",
    );
    drawText(context, formatPlaytime(game.playtime_forever), cardX + 14, cardY + cardHeight - 16, {
      font: "700 16px 'Segoe UI'",
      color: "#9bdcff",
      baseline: "bottom",
    });
  });
}

function drawPlaytimeBreakdownSection(
  context: CanvasRenderingContext2D,
  summary: SteamUserSummary,
  appearance: BackgroundAppearance,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const breakdown = getPlaytimeBuckets(summary);
  drawGlassCard(context, appearance, x, y, width, height, 30);
  drawText(context, "Playtime Breakdown", x + 24, y + 38, {
    font: "700 27px 'Segoe UI'",
    color: "#ffffff",
  });
  drawText(context, `${summary.ownedGames.length} games across the library`, x + 24, y + 66, {
    font: "400 16px 'Segoe UI'",
    color: "rgba(226,237,251,0.72)",
  });

  const centerX = x + 132;
  const centerY = y + 188;
  const radius = 72;
  let startAngle = -Math.PI / 2;

  breakdown.buckets.forEach((bucket) => {
    const slice = (bucket.percentage / 100) * Math.PI * 2;
    context.beginPath();
    context.lineWidth = 18;
    context.strokeStyle = bucket.color;
    context.arc(centerX, centerY, radius, startAngle, startAngle + slice);
    context.stroke();
    startAngle += slice;
  });

  context.fillStyle = "rgba(9,17,29,0.86)";
  context.beginPath();
  context.arc(centerX, centerY, 46, 0, Math.PI * 2);
  context.fill();
  drawText(context, "Total", centerX, centerY - 8, {
    font: "600 16px 'Segoe UI'",
    color: "rgba(226,237,251,0.62)",
    align: "center",
  });
  drawText(context, `${summary.ownedGames.length}`, centerX, centerY + 26, {
    font: "700 30px 'Segoe UI'",
    color: "#ffffff",
    align: "center",
    baseline: "middle",
  });

  breakdown.buckets.forEach((bucket, index) => {
    const rowY = y + 98 + index * 44;
    const rowX = x + 236;
    context.fillStyle = bucket.color;
    context.beginPath();
    context.arc(rowX, rowY + 4, 6, 0, Math.PI * 2);
    context.fill();
    drawText(context, bucket.label, rowX + 18, rowY + 6, {
      font: "600 15px 'Segoe UI'",
      color: "#ffffff",
      baseline: "middle",
    });
    drawText(context, `${bucket.legend} / ${bucket.count} games`, rowX + 18, rowY + 24, {
      font: "400 11px 'Segoe UI'",
      color: "rgba(226,237,251,0.62)",
      baseline: "middle",
    });
    fillRoundedRect(context, rowX + 164, rowY - 2, 126, 8, 4, "rgba(255,255,255,0.08)");
    fillRoundedRect(
      context,
      rowX + 164,
      rowY - 2,
      Math.max(16, 126 * (bucket.percentage / 100)),
      8,
      4,
      bucket.color,
    );
    drawText(context, formatPercent(bucket.percentage), rowX + 304, rowY + 6, {
      font: "600 13px 'Segoe UI'",
      color: "#ffffff",
      align: "right",
      baseline: "middle",
    });
  });
}

function drawTagsSection(
  context: CanvasRenderingContext2D,
  tagBreakdown: SteamTagBreakdown | null,
  appearance: BackgroundAppearance,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  drawGlassCard(context, appearance, x, y, width, height, 30);
  drawText(context, "All Tags", x + 24, y + 38, {
    font: "700 27px 'Segoe UI'",
    color: "#ffffff",
  });
  drawText(context, "Top tag distribution with generic tags hidden by default", x + 24, y + 66, {
    font: "400 16px 'Segoe UI'",
    color: "rgba(226,237,251,0.72)",
  });

  if (!tagBreakdown) {
    drawText(context, "SteamSpy tags were not available for this profile export.", x + 24, y + 116, {
      font: "400 18px 'Segoe UI'",
      color: "rgba(226,237,251,0.72)",
    });
    return;
  }

  const tagDisplay = buildSteamTagDisplayBreakdown(
    tagBreakdown,
    "titleCount",
    true,
    false,
  );

  tagDisplay.buckets.slice(0, 8).forEach((bucket, index) => {
    const rowY = y + 102 + index * 36;
    context.fillStyle = bucket.color;
    context.beginPath();
    context.arc(x + 28, rowY + 4, 5, 0, Math.PI * 2);
    context.fill();
    drawText(context, bucket.label, x + 42, rowY + 6, {
      font: "600 15px 'Segoe UI'",
      color: "#ffffff",
      baseline: "middle",
    });
    fillRoundedRect(context, x + 176, rowY - 2, width - 236, 8, 4, "rgba(255,255,255,0.08)");
    fillRoundedRect(
      context,
      x + 176,
      rowY - 2,
      Math.max(16, ((width - 236) * Math.max(bucket.chartPercentage, 8)) / 100),
      8,
      4,
      bucket.color,
    );
    drawText(context, `${bucket.titleCount}`, x + width - 24, rowY + 6, {
      font: "600 13px 'Segoe UI'",
      color: "#ffffff",
      align: "right",
      baseline: "middle",
    });
  });
}

function drawListSection(
  context: CanvasRenderingContext2D,
  appearance: BackgroundAppearance,
  title: string,
  subtitle: string,
  x: number,
  y: number,
  width: number,
  height: number,
  games: Array<SteamOwnedGame | SteamRecentGame>,
  capsulesByAppId: Record<number, HTMLImageElement>,
  rightLabel: (game: SteamOwnedGame | SteamRecentGame, index: number) => string,
  secondaryLabel: (game: SteamOwnedGame | SteamRecentGame) => string,
) {
  drawGlassCard(context, appearance, x, y, width, height, 30);
  drawText(context, title, x + 24, y + 38, {
    font: "700 27px 'Segoe UI'",
    color: "#ffffff",
  });
  drawText(context, subtitle, x + 24, y + 66, {
    font: "400 16px 'Segoe UI'",
    color: "rgba(226,237,251,0.72)",
  });

  if (games.length === 0) {
    drawText(context, "No data available for this section.", x + 24, y + 116, {
      font: "400 18px 'Segoe UI'",
      color: "rgba(226,237,251,0.72)",
    });
    return;
  }

  games.forEach((game, index) => {
    const rowX = x + 24;
    const rowY = y + 94 + index * 62;
    drawGlassCard(context, appearance, rowX, rowY, width - 48, 52, 22);
    drawImageCover(
      context,
      capsulesByAppId[game.appid] ?? null,
      rowX + 10,
      rowY + 6,
      110,
      40,
      12,
    );
    drawText(context, game.name, rowX + 132, rowY + 22, {
      font: "600 16px 'Segoe UI'",
      color: "#ffffff",
      baseline: "middle",
    });
    drawText(context, secondaryLabel(game), rowX + 132, rowY + 38, {
      font: "400 12px 'Segoe UI'",
      color: "rgba(226,237,251,0.64)",
      baseline: "middle",
    });
    drawText(context, rightLabel(game, index), rowX + width - 62, rowY + 26, {
      font: "600 14px 'Segoe UI'",
      color: "#9bdcff",
      align: "right",
      baseline: "middle",
    });
  });
}

async function resolveExportImages(
  summary: SteamUserSummary,
  favoriteGames: SteamOwnedGame[],
  background: ResolvedExportBackground,
) {
  const topHourGames = summary.ownedGames.slice(0, 5);
  const recentGames = summary.recentGames.slice(0, 4);
  const backlogGames = summary.ownedGames
    .filter((game) => game.playtime_forever === 0)
    .slice(0, 4);
  const portraitAppIds = [
    ...new Set([...favoriteGames, ...topHourGames].map((game) => game.appid)),
  ];
  const capsuleAppIds = [
    ...new Set([...recentGames, ...backlogGames].map((game) => game.appid)),
  ];

  const [avatarDataUrl, portraitEntries, capsuleEntries, backgroundImage] =
    await Promise.all([
      fetchFirstAvailableImageDataUrl([
        summary.player.avatarfull,
        getExportAvatarUrl(summary.player.avatarfull),
      ]),
      Promise.all(
        portraitAppIds.map(async (appid) => [
          appid,
          await fetchFirstAvailableImageDataUrl([
            getPortraitImageUrl(appid),
            getExportPortraitImageUrl(appid),
          ]),
        ] as const),
      ),
      Promise.all(
        capsuleAppIds.map(async (appid) => [
          appid,
          await fetchFirstAvailableImageDataUrl([
            getSteamCapsuleImageUrl(appid),
            getExportCapsuleImageUrl(appid),
          ]),
        ] as const),
      ),
      loadImage(background.imageUrl),
    ]);

  return {
    avatar: await loadImage(avatarDataUrl),
    portraitsByAppId: Object.fromEntries(
      (
        await Promise.all(
          portraitEntries.map(async ([appid, dataUrl]) => [
            appid,
            dataUrl ? await loadImage(dataUrl) : null,
          ] as const),
        )
      ).flatMap(([appid, image]) => (image ? [[appid, image]] : [])),
    ),
    capsulesByAppId: Object.fromEntries(
      (
        await Promise.all(
          capsuleEntries.map(async ([appid, dataUrl]) => [
            appid,
            dataUrl ? await loadImage(dataUrl) : null,
          ] as const),
        )
      ).flatMap(([appid, image]) => (image ? [[appid, image]] : [])),
    ),
    backgroundImage,
  } satisfies ExportImageAssets;
}

async function renderProfileExportImage(
  summary: SteamUserSummary,
  tagBreakdown: SteamTagBreakdown | null,
  appearance: BackgroundAppearance,
  favoriteGames: SteamOwnedGame[],
  isOwnProfile: boolean,
) {
  const resolvedBackground = await resolveExportBackground(appearance);
  const exportImages = await resolveExportImages(summary, favoriteGames, resolvedBackground);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas export is not available in this browser.");
  }

  await document.fonts.ready;
  drawBackground(context, appearance, resolvedBackground, exportImages.backgroundImage);
  drawHeaderSection(context, summary, appearance, exportImages.avatar);

  let currentY = 272;
  if (isOwnProfile) {
    drawPortraitRowSection(
      context,
      appearance,
      "Top 5 Games",
      "Your favorites ranked from 1 to 5",
      48,
      currentY,
      EXPORT_WIDTH - 96,
      238,
      Array.from({ length: MAX_FAVORITES }, (_, index) => favoriteGames[index] ?? null),
      exportImages.portraitsByAppId,
      true,
    );
    currentY += 258;
  }

  const leftX = 48;
  const leftWidth = 1030;
  const rightX = leftX + leftWidth + 24;
  const rightWidth = EXPORT_WIDTH - rightX - 48;

  drawPortraitRowSection(
    context,
    appearance,
    "Top 5 by Hours",
    "Highest lifetime playtime across the visible library",
    leftX,
    currentY,
    leftWidth,
    236,
    summary.ownedGames.slice(0, 5),
    exportImages.portraitsByAppId,
    false,
  );
  drawPlaytimeBreakdownSection(
    context,
    summary,
    appearance,
    rightX,
    currentY,
    rightWidth,
    236,
  );

  currentY += 256;
  drawTagsSection(context, tagBreakdown, appearance, leftX, currentY, leftWidth, 292);
  drawListSection(
    context,
    appearance,
    "Recent Activity",
    "Most played during the last two weeks",
    rightX,
    currentY,
    rightWidth,
    140,
    summary.recentGames.slice(0, 4),
    exportImages.capsulesByAppId,
    (game) => formatPlaytime(game.playtime_forever),
    (game) =>
      "playtime_2weeks" in game
        ? `${formatPlaytime((game as SteamRecentGame).playtime_2weeks)} in the last 2 weeks`
        : formatPlaytime(game.playtime_forever),
  );

  return {
    dataUrl: canvas.toDataURL("image/png"),
    warning: resolvedBackground.warning,
  };
}

function getStatusClasses(tone: ExportStatus["tone"]) {
  switch (tone) {
    case "progress":
      return "border-sky-200/18 bg-sky-300/10 text-sky-100";
    case "success":
      return "border-emerald-200/18 bg-emerald-300/10 text-emerald-100";
    case "warning":
      return "border-amber-200/18 bg-amber-300/12 text-amber-100";
    case "error":
      return "border-rose-200/18 bg-rose-300/12 text-rose-100";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-300";
  }
}

export function ProfileExportButton({
  summary,
  tagBreakdown,
}: ProfileExportButtonProps) {
  const [appearance, setAppearance] = useState(DEFAULT_BACKGROUND_APPEARANCE);
  const [status, setStatus] = useState<ExportStatus>({
    tone: "idle",
    message: "Download a single-image snapshot of this profile dashboard.",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [favoriteAppIds, setFavoriteAppIds] = useState<number[]>([]);

  useEffect(() => {
    setAppearance(readCurrentAppearance());

    function handleAppearanceChange() {
      setAppearance(readCurrentAppearance());
    }

    window.addEventListener(BACKGROUND_APPEARANCE_EVENT, handleAppearanceChange);
    window.addEventListener("storage", handleAppearanceChange);

    return () => {
      window.removeEventListener(
        BACKGROUND_APPEARANCE_EVENT,
        handleAppearanceChange,
      );
      window.removeEventListener("storage", handleAppearanceChange);
    };
  }, []);

  useEffect(() => {
    function syncFavorites() {
      const nextState = readConnectedAccountState();
      const connectedSteamId = nextState.connectedAccount?.steamId;
      const matchesOwnProfile = connectedSteamId === summary.player.steamid;

      setIsOwnProfile(matchesOwnProfile);

      if (!matchesOwnProfile || !connectedSteamId) {
        setFavoriteAppIds([]);
        return;
      }

      const validAppIds = new Set(summary.ownedGames.map((game) => game.appid));
      setFavoriteAppIds(
        getFavoritesForSteamId(nextState, connectedSteamId).filter((appId) =>
          validAppIds.has(appId),
        ),
      );
    }

    syncFavorites();
    window.addEventListener(CONNECTED_ACCOUNT_EVENT, syncFavorites);
    window.addEventListener("storage", syncFavorites);

    return () => {
      window.removeEventListener(CONNECTED_ACCOUNT_EVENT, syncFavorites);
      window.removeEventListener("storage", syncFavorites);
    };
  }, [summary.ownedGames, summary.player.steamid]);

  const favoriteGames = useMemo(
    () =>
      favoriteAppIds
        .map((appId) => summary.ownedGames.find((game) => game.appid === appId))
        .filter((game): game is SteamOwnedGame => Boolean(game)),
    [favoriteAppIds, summary.ownedGames],
  );

  async function handleExport() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setStatus({
      tone: "progress",
      message: "Preparing your profile image...",
    });

    try {
      const { dataUrl, warning } = await renderProfileExportImage(
        summary,
        tagBreakdown,
        appearance,
        favoriteGames,
        isOwnProfile,
      );
      const safeName =
        sanitizeFileName(summary.player.personaname) || EXPORT_FILE_BASENAME;
      downloadDataUrl(dataUrl, `${safeName}-steam-dashboard.png`);
      setStatus({
        tone: warning ? "warning" : "success",
        message: warning ?? "Your profile image is ready and has been downloaded.",
      });
    } catch (error) {
      console.error("Profile export failed", error);
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? `Export failed: ${error.message}`
            : "Export failed. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="glass-input inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-[#9bdcff] transition hover:border-white/18 hover:text-white disabled:cursor-wait disabled:opacity-70"
      >
        {isExporting ? "Exporting..." : "Export Image"}
      </button>
      <p
        className={`rounded-full border px-3 py-1.5 text-xs ${getStatusClasses(status.tone)}`}
      >
        {status.message}
      </p>
    </div>
  );
}
