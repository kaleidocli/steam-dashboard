import type {
  SteamTagAggregate,
  SteamTagBreakdown,
  SteamTagMetric,
} from "@/features/steam-dashboard/api/steam";

const MIN_VISIBLE_TAGS = 7;
const MAX_VISIBLE_TAGS = 14;
const MAX_OTHER_PERCENTAGE = 20;
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
  totalMinutes: number;
  value: number;
  percentage: number;
  color: string;
  segment: string;
};

export type SteamTagDisplayBreakdown = {
  background: string;
  buckets: SteamTagDisplayBucket[];
  totalMetricValue: number;
  totalPlayedGames: number;
  totalPlayedMinutes: number;
};

function getMetricValue(tag: SteamTagAggregate, metric: SteamTagMetric) {
  return metric === "hoursPlayed" ? tag.totalMinutes : tag.titleCount;
}

function sortTags(
  tags: SteamTagAggregate[],
  metric: SteamTagMetric,
): SteamTagAggregate[] {
  return [...tags].sort((left, right) => {
    const metricDelta = getMetricValue(right, metric) - getMetricValue(left, metric);

    if (metricDelta !== 0) {
      return metricDelta;
    }

    if (right.titleCount !== left.titleCount) {
      return right.titleCount - left.titleCount;
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
): SteamTagDisplayBreakdown {
  const sortedTags = sortTags(tagBreakdown.tags, metric);
  const totalMetricValue =
    metric === "hoursPlayed"
      ? tagBreakdown.totalTaggedMinutes
      : tagBreakdown.totalTitleCount;
  const safeTotalMetricValue = totalMetricValue || 1;

  let visibleTagCount = Math.min(MIN_VISIBLE_TAGS, sortedTags.length);
  let remainingTags = sortedTags.slice(visibleTagCount);
  let otherMetricValue = remainingTags.reduce(
    (total, tag) => total + getMetricValue(tag, metric),
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
      (total, tag) => total + getMetricValue(tag, metric),
      0,
    );
  }

  const visibleTags: SteamTagAggregate[] = sortedTags.slice(0, visibleTagCount);

  if (remainingTags.length > 0 && otherMetricValue > 0) {
    visibleTags.push({
      label: "Other",
      titleCount: remainingTags.reduce((total, tag) => total + tag.titleCount, 0),
      totalMinutes: remainingTags.reduce((total, tag) => total + tag.totalMinutes, 0),
    });
  }

  const chartTags = visibleTags.filter((tag) => tag.label !== "Other");
  const chartTotalMetricValue =
    chartTags.reduce((total, tag) => total + getMetricValue(tag, metric), 0) || 1;
  let currentAngle = 0;
  const buckets = visibleTags.map((tag, index) => {
    const value = getMetricValue(tag, metric);
    const percentage =
      tag.label === "Other" ? 0 : (value / chartTotalMetricValue) * 100;
    const start = currentAngle;
    if (tag.label !== "Other") {
      currentAngle += (value / chartTotalMetricValue) * 360;
    }
    const color = TAG_COLORS[index % TAG_COLORS.length];

    return {
      label: tag.label,
      titleCount: tag.titleCount,
      totalMinutes: tag.totalMinutes,
      value,
      percentage,
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
    totalPlayedGames: tagBreakdown.totalPlayedGames,
    totalPlayedMinutes: tagBreakdown.totalPlayedMinutes,
  };
}
