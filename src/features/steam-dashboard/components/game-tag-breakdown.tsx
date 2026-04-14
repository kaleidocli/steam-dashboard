"use client";

import { useState } from "react";
import type {
  SteamTagBreakdown,
  SteamTagMetric,
} from "@/features/steam-dashboard/api/steam";
import { formatHours, formatPercent } from "@/features/steam-dashboard/utils/dashboard";
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

export function GameTagBreakdown({ tagBreakdown }: GameTagBreakdownProps) {
  const [metric, setMetric] = useState<SteamTagMetric>("titleCount");

  if (!tagBreakdown || tagBreakdown.tags.length === 0) {
    return (
      <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[15px] font-semibold text-white">All Tags</h3>
          <div className="inline-flex rounded-xl border border-[#1f2937] bg-[#0b1220]/80 p-1">
            {TAG_METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMetric(option.value)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                  metric === option.value
                    ? "bg-[#66c0f4] text-[#08111f]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-400">
          No tag data available yet. SteamSpy tags are fetched from played games
          using the API&apos;s <span className="font-medium text-slate-300">tags</span>{" "}
          field, not genre.
        </p>
      </section>
    );
  }

  const displayBreakdown = buildSteamTagDisplayBreakdown(tagBreakdown, metric);
  const metricBadge =
    metric === "hoursPlayed"
      ? `${formatHours(displayBreakdown.totalMetricValue)} tagged hrs`
      : `${Math.round(displayBreakdown.totalMetricValue).toLocaleString()} tagged games`;

  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">All Tags</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Source: SteamSpy tags field, with hours weighted by tag score
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#1f2937] bg-[#0b1220] px-2 py-1 text-[11px] text-slate-400">
            {metricBadge}
          </span>
          <div className="inline-flex rounded-xl border border-[#1f2937] bg-[#0b1220]/80 p-1">
            {TAG_METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMetric(option.value)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                  metric === option.value
                    ? "bg-[#66c0f4] text-[#08111f]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
        <div className="flex justify-center">
          <div
            className="relative h-44 w-44 rounded-full"
            style={{ background: displayBreakdown.background }}
          >
            <div className="absolute inset-[24px] flex items-center justify-center rounded-full bg-[#121a2b] ring-1 ring-inset ring-[#1f2937]">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  {metric === "hoursPlayed" ? "Tagged Hours" : "Tagged Games"}
                </p>
                <p className="mt-1 text-2xl font-semibold leading-none text-white">
                  {metric === "hoursPlayed"
                    ? formatHours(displayBreakdown.totalMetricValue)
                    : Math.round(displayBreakdown.totalMetricValue).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {displayBreakdown.buckets.map((bucket) => (
              <span
                key={bucket.label}
                className="rounded-full border border-[#1f2937] bg-[#0b1220]/75 px-3 py-1.5"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="text-[12px] font-medium text-slate-200">
                    {bucket.label}
                  </span>
                  {bucket.label !== "Other" ? (
                    <span className="text-[11px] text-slate-400">
                      {formatPercent(bucket.percentage)}
                    </span>
                  ) : null}
                </span>
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {displayBreakdown.buckets.map((bucket) => (
              <div
                key={`${metric}-${bucket.label}`}
                className="rounded-xl border border-[#1f2937]/80 bg-[#0b1220]/55 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-200">
                    {bucket.label}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {Math.round(bucket.titleCount).toLocaleString()} games ·{" "}
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
        </div>
      </div>
    </section>
  );
}
