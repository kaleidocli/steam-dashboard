"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  formatPlaytime,
  getSteamCapsuleImageUrl,
  type SteamTagBreakdown,
  type SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";

type TopHoursChartProps = {
  summary: SteamUserSummary;
  tagBreakdown: SteamTagBreakdown | null;
};

const MAX_RECOMMENDATIONS = 6;

function getTagKey(tag: string) {
  return tag.trim().toLocaleLowerCase();
}

export function TopHoursChart({ summary, tagBreakdown }: TopHoursChartProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const availableTags = tagBreakdown?.availableTags ?? [];
  const searchDisabled = availableTags.length === 0;

  const recommendations = useMemo(() => {
    const query = inputValue.trim().toLocaleLowerCase();

    if (!query || selectedTag) {
      return [];
    }

    return [...availableTags]
      .map((tag) => ({
        tag,
        index: tag.toLocaleLowerCase().indexOf(query),
      }))
      .filter((match) => match.index >= 0)
      .sort((left, right) => {
        if (left.index !== right.index) {
          return left.index - right.index;
        }

        return left.tag.localeCompare(right.tag);
      })
      .slice(0, MAX_RECOMMENDATIONS);
  }, [availableTags, inputValue, selectedTag]);

  const filteredGames = useMemo(() => {
    if (!selectedTag || !tagBreakdown) {
      return summary.ownedGames.slice(0, 5);
    }

    const taggedAppIds = new Set(tagBreakdown.gamesByTag[getTagKey(selectedTag)] ?? []);

    return summary.ownedGames
      .filter(
        (game) => taggedAppIds.has(game.appid) && game.playtime_forever > 0,
      )
      .slice(0, 5);
  }, [selectedTag, summary.ownedGames, tagBreakdown]);

  const handleSelectTag = (tag: string) => {
    setSelectedTag(tag);
    setInputValue(tag);
  };

  const handleClearTag = () => {
    setSelectedTag(null);
    setInputValue("");
  };

  const helperText = selectedTag
    ? `Filtered to ${selectedTag}`
    : "Lifetime playtime across all owned games";

  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Top 5 by Hours</h3>
          <p className="mt-0.5 text-[12px] text-slate-400">{helperText}</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={
                searchDisabled ? "No tags available for this library" : "Filter by a SteamSpy tag"
              }
              disabled={searchDisabled || Boolean(selectedTag)}
              className="glass-input w-full rounded-2xl px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#9bdcff]/60"
            />
            {selectedTag ? (
              <button
                type="button"
                onClick={handleClearTag}
                className="glass-input rounded-2xl px-3 py-2 text-[12px] font-semibold text-slate-200 transition hover:border-white/18 hover:text-white"
              >
                Clear
              </button>
            ) : null}
          </div>

          {inputValue.trim() && !selectedTag ? (
            <div className="glass-popover mt-2 rounded-2xl p-1">
              {recommendations.length > 0 ? (
                recommendations.map((recommendation) => (
                  <button
                    key={recommendation.tag}
                    type="button"
                    onClick={() => handleSelectTag(recommendation.tag)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>{recommendation.tag}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Use
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  No matching tags. Choose one from the recommended list to
                  apply a filter.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {filteredGames.map((game) => (
            <article
              key={game.appid}
              className="glass-card-soft group overflow-hidden rounded-2xl transition hover:border-white/16"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[rgba(6,12,22,0.35)]">
                <Image
                  src={getSteamCapsuleImageUrl(game.appid).replace(
                    "capsule_184x69.jpg",
                    "library_600x900_2x.jpg",
                  )}
                  alt={`${game.name} cover art`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1280px) 28vw, 16vw"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#09111d] via-[#09111d]/58 to-transparent" />
              </div>
              <div className="space-y-1 px-3 py-3">
                <p className="text-sm font-medium leading-5 text-white">
                  {game.name}
                </p>
                <p className="font-medium text-[#9bdcff]">
                  {formatPlaytime(game.playtime_forever)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass-card-soft rounded-2xl border-dashed px-4 py-6 text-sm text-slate-300">
          No played games matched the selected tag.
        </div>
      )}
    </section>
  );
}
