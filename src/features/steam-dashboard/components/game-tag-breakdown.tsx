"use client";

import { useState } from "react";
import type {
  SteamTagBreakdown,
  SteamTagMetric,
} from "@/features/steam-dashboard/api/steam";
import {
  formatHours,
  formatPercent,
} from "@/features/steam-dashboard/utils/dashboard";
import { buildSteamTagDisplayBreakdown } from "@/features/steam-dashboard/utils/tag-breakdown";

type GameTagBreakdownProps = {
  tagBreakdown: SteamTagBreakdown | null;
};

const TAG_METRIC_OPTIONS: Array<{
  label: string;
  value: SteamTagMetric;
}> = [
  { label: "Title Count", value: "titleCount" },
  { label: "Hours Played", value: "hoursPlayed" },
];

const GENERIC_TAGS = [
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
];

export function GameTagBreakdown({ tagBreakdown }: GameTagBreakdownProps) {
  const [metric, setMetric] = useState<SteamTagMetric>("titleCount");
  const [includeUnplayed, setIncludeUnplayed] = useState(true);
  const [includeGenericTags, setIncludeGenericTags] = useState(false);

  if (!tagBreakdown || tagBreakdown.tags.length === 0) {
    return (
      <section className="glass-card rounded-2xl p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[15px] font-semibold text-white">All Tags</h3>
          <div className="glass-input inline-flex rounded-2xl p-1">
            {TAG_METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMetric(option.value)}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition ${
                  metric === option.value
                    ? "bg-[linear-gradient(135deg,#d9f3ff,#91d7ff)] text-[#08111f]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-300">
          No tag data available yet. SteamSpy tags are fetched from the
          API&apos;s <span className="font-medium text-slate-100">tags</span>{" "}
          field, not genre.
        </p>
      </section>
    );
  }

  const displayBreakdown = buildSteamTagDisplayBreakdown(
    tagBreakdown,
    metric,
    includeUnplayed,
    includeGenericTags,
  );
  const metricBadge =
    metric === "hoursPlayed"
      ? `${formatHours(displayBreakdown.totalMetricValue)} tagged hrs`
      : `${displayBreakdown.totalGameCount.toLocaleString()} ${
          includeUnplayed ? "total games" : "played games"
        }`;

  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">All Tags</h3>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Source: SteamSpy tags field, with hours weighted by tag score
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="glass-input rounded-full px-2 py-1 text-[11px] text-slate-300">
            {metricBadge}
          </span>
          <button
            type="button"
            aria-pressed={includeUnplayed}
            onClick={() => setIncludeUnplayed((current) => !current)}
            className={`rounded-2xl border px-3.5 py-2 text-[12px] font-semibold tracking-[0.02em] transition ${
              includeUnplayed
                ? "border-[#b9e9ff]/35 bg-[#b9e9ff]/16 text-white shadow-[0_0_0_1px_rgba(185,233,255,0.1)]"
                : "glass-input text-slate-300 hover:border-white/18 hover:text-white"
            }`}
          >
            Include Unplayed {includeUnplayed ? "ON" : "OFF"}
          </button>
          <div className="group relative">
            <button
              type="button"
              aria-pressed={includeGenericTags}
              onClick={() => setIncludeGenericTags((current) => !current)}
              className={`rounded-2xl border px-3.5 py-2 text-[12px] font-semibold tracking-[0.02em] transition ${
                includeGenericTags
                  ? "border-emerald-300/35 bg-emerald-300/16 text-white shadow-[0_0_0_1px_rgba(110,231,183,0.08)]"
                  : "glass-input text-slate-300 hover:border-white/18 hover:text-white"
              }`}
            >
              Include Generic Tags {includeGenericTags ? "ON" : "OFF"}
            </button>
            <div className="glass-popover pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl p-4 opacity-0 transition duration-150 group-hover:translate-y-1 group-hover:opacity-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Generic Tag Filter
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Toggle this to include or remove broad, less-specific tags from
                the widget calculations, row list, and the{" "}
                <span className="font-medium text-white">Other</span> bucket.
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Generic tags
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {GENERIC_TAGS.join(", ")}
              </p>
            </div>
          </div>
          <div className="glass-input inline-flex rounded-2xl p-1">
            {TAG_METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMetric(option.value)}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition ${
                  metric === option.value
                    ? "bg-[linear-gradient(135deg,#d9f3ff,#91d7ff)] text-[#08111f]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {displayBreakdown.buckets.length > 0 ? (
        <div className="space-y-2.5">
          {displayBreakdown.buckets.map((bucket) => (
            <div
              key={`${metric}-${includeUnplayed ? "all" : "played"}-${
                includeGenericTags ? "generic" : "specific"
              }-${bucket.label}`}
              className="glass-card-soft rounded-2xl px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 items-center gap-2 sm:w-[220px] sm:min-w-[220px]">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="truncate text-[13px] font-medium text-slate-100">
                    {bucket.label}
                  </span>
                </div>

                <div className="hidden min-w-[140px] flex-1 sm:block">
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/8 ring-1 ring-inset ring-white/8">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(bucket.percentage, 100)}%`,
                        backgroundColor: bucket.color,
                      }}
                    />
                  </div>
                </div>

                <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  {Math.round(bucket.titleCount).toLocaleString()} games /{" "}
                  {formatHours(bucket.totalMinutes)} hrs
                </span>

                {bucket.label !== "Other" ? (
                  <span className="shrink-0 text-[13px] font-medium text-white">
                    {formatPercent(bucket.percentage)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          No tags match the current filters.
        </p>
      )}
    </section>
  );
}
