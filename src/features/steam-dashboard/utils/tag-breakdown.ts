import type {
  SteamTagAggregate,
  SteamTagBreakdown,
  SteamTagMetric,
} from "@/features/steam-dashboard/api/steam";

const MIN_VISIBLE_TAGS = 7;
const MAX_VISIBLE_TAGS = 14;
const MAX_OTHER_PERCENTAGE = 20;
const GENERIC_TAGS = new Set([
  "Indie",
  "Action",
  "Adventure",
  "Singleplayer",
  "Multiplayer",
  "2D",
  "3D",
  "Atmospheric",
  "Great Soundtrack",
  "Funny",
  "Violent",
  "Gore",
  "Early Access",
  "Casual",
  "Co-op",
  "Online Co-Op",
]);
const TAG_COLORS = [
  "#f97316",
  "#f43f5e",
  "#a855f7",
  "#6366f1",
  "#22d3ee",
  "#14b8a6",
  "#84cc16",
  "#eab308",
];

export type SteamTagDisplayBucket = {
  label: string;
  titleCount: number;
  playedTitleCount: number;
  totalMinutes: number;
  value: number;
  percentage: number;
  chartPercentage: number;
  color: string;
  segment: string;
};

export type SteamTagDisplayBreakdown = {
  background: string;
  buckets: SteamTagDisplayBucket[];
  totalMetricValue: number;
  totalGameCount: number;
  totalGames: number;
  totalPlayedGames: number;
  totalPlayedMinutes: number;
};

function getDisplayTitleCount(
  tag: SteamTagAggregate,
  includeUnplayed: boolean,
) {
  return includeUnplayed ? tag.titleCount : tag.playedTitleCount;
}

function isGenericTag(label: string) {
  return GENERIC_TAGS.has(label);
}

function getMetricValue(
  tag: SteamTagAggregate,
  metric: SteamTagMetric,
  includeUnplayed: boolean,
) {
  return metric === "hoursPlayed"
    ? tag.totalMinutes
    : getDisplayTitleCount(tag, includeUnplayed);
}

function sortTags(
  tags: SteamTagAggregate[],
  metric: SteamTagMetric,
  includeUnplayed: boolean,
): SteamTagAggregate[] {
  return [...tags].sort((left, right) => {
    const metricDelta =
      getMetricValue(right, metric, includeUnplayed) -
      getMetricValue(left, metric, includeUnplayed);

    if (metricDelta !== 0) {
      return metricDelta;
    }

    const rightTitleCount = getDisplayTitleCount(right, includeUnplayed);
    const leftTitleCount = getDisplayTitleCount(left, includeUnplayed);

    if (rightTitleCount !== leftTitleCount) {
      return rightTitleCount - leftTitleCount;
    }

    if (right.totalMinutes !== left.totalMinutes) {
      return right.totalMinutes - left.totalMinutes;
    }

    return left.label.localeCompare(right.label);
  });
}

export function buildSteamTagDisplayBreakdown(
  tagBreakdown: SteamTagBreakdown,
  metric: SteamTagMetric,
  includeUnplayed: boolean,
  includeGenericTags: boolean,
): SteamTagDisplayBreakdown {
  const filteredTags = tagBreakdown.tags.filter((tag) => {
    if (getDisplayTitleCount(tag, includeUnplayed) <= 0) {
      return false;
    }

    if (!includeGenericTags && isGenericTag(tag.label)) {
      return false;
    }

    return true;
  });
  const sortedTags = sortTags(filteredTags, metric, includeUnplayed);
  const totalMetricValue = filteredTags.reduce(
    (total, tag) => total + getMetricValue(tag, metric, includeUnplayed),
    0,
  );
  const totalGameCount = includeUnplayed
    ? tagBreakdown.totalGames
    : tagBreakdown.totalPlayedGames;
  const safeTotalMetricValue = totalMetricValue || 1;

  let visibleTagCount = Math.min(MIN_VISIBLE_TAGS, sortedTags.length);
  let remainingTags = sortedTags.slice(visibleTagCount);
  let otherMetricValue = remainingTags.reduce(
    (total, tag) => total + getMetricValue(tag, metric, includeUnplayed),
    0,
  );

  while (
    remainingTags.length > 0 &&
    visibleTagCount < Math.min(MAX_VISIBLE_TAGS, sortedTags.length) &&
    (otherMetricValue / safeTotalMetricValue) * 100 > MAX_OTHER_PERCENTAGE
  ) {
    visibleTagCount += 1;
    remainingTags = sortedTags.slice(visibleTagCount);
    otherMetricValue = remainingTags.reduce(
      (total, tag) => total + getMetricValue(tag, metric, includeUnplayed),
      0,
    );
  }

  const visibleTags: SteamTagAggregate[] = sortedTags.slice(0, visibleTagCount);

  if (remainingTags.length > 0 && otherMetricValue > 0) {
    visibleTags.push({
      label: "Other",
      titleCount: remainingTags.reduce((total, tag) => total + tag.titleCount, 0),
      playedTitleCount: remainingTags.reduce(
        (total, tag) => total + tag.playedTitleCount,
        0,
      ),
      totalMinutes: remainingTags.reduce((total, tag) => total + tag.totalMinutes, 0),
    });
  }

  const chartTags = visibleTags.filter((tag) => tag.label !== "Other");
  const chartTotalMetricValue =
    chartTags.reduce(
      (total, tag) => total + getMetricValue(tag, metric, includeUnplayed),
      0,
    ) || 1;
  const percentageDenominator = tagBreakdown.totalGames || 1;
  let currentAngle = 0;
  const buckets = visibleTags.map((tag, index) => {
    const value = getMetricValue(tag, metric, includeUnplayed);
    const titleCount = getDisplayTitleCount(tag, includeUnplayed);
    const percentage =
      tag.label === "Other" ? 0 : (titleCount / percentageDenominator) * 100;
    const chartPercentage =
      tag.label === "Other" ? 0 : (value / chartTotalMetricValue) * 100;
    const start = currentAngle;
    if (tag.label !== "Other") {
      currentAngle += (value / chartTotalMetricValue) * 360;
    }
    const color = TAG_COLORS[index % TAG_COLORS.length];

    return {
      label: tag.label,
      titleCount,
      playedTitleCount: tag.playedTitleCount,
      totalMinutes: tag.totalMinutes,
      value,
      percentage,
      chartPercentage,
      color,
      segment: `${color} ${start.toFixed(1)}deg ${currentAngle.toFixed(1)}deg`,
    };
  });

  return {
    background:
      buckets.some((bucket) => bucket.label !== "Other")
        ? `conic-gradient(${buckets
            .filter((bucket) => bucket.label !== "Other")
            .map((bucket) => bucket.segment)
            .join(", ")})`
        : "conic-gradient(#1f2937 0deg 360deg)",
    buckets,
    totalMetricValue,
    totalGameCount,
    totalGames: tagBreakdown.totalGames,
    totalPlayedGames: tagBreakdown.totalPlayedGames,
    totalPlayedMinutes: tagBreakdown.totalPlayedMinutes,
  };
}
