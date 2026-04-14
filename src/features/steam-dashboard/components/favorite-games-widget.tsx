"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  formatPlaytime,
  type SteamOwnedGame,
  type SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";
import {
  CONNECTED_ACCOUNT_EVENT,
  getFavoritesForSteamId,
  readConnectedAccountState,
  setFavoritesForSteamId,
  writeConnectedAccountState,
} from "@/features/steam-dashboard/utils/connected-account";

type FavoriteGamesWidgetProps = {
  summary: SteamUserSummary;
};

const MAX_FAVORITES = 5;
const MAX_RECOMMENDATIONS = 6;

function getPortraitImageUrl(appid: number) {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900_2x.jpg`;
}

function moveItem(items: number[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function getRankBadgeClasses(rank: number) {
  switch (rank) {
    case 1:
      return "bg-[#c8911f] text-[#fff8dd] ring-[#f5d46b]/70";
    case 2:
      return "bg-[#8f9db3] text-white ring-[#d4deec]/55";
    case 3:
      return "bg-[#9a5d35] text-[#fff1e4] ring-[#d79b72]/60";
    default:
      return "bg-[#1f2b3d] text-white ring-white/18";
  }
}

export function FavoriteGamesWidget({ summary }: FavoriteGamesWidgetProps) {
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [favoriteAppIds, setFavoriteAppIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);

  useEffect(() => {
    function syncState() {
      const nextState = readConnectedAccountState();
      const connectedSteamId = nextState.connectedAccount?.steamId;
      const matchesOwnProfile = connectedSteamId === summary.player.steamid;

      setIsOwnProfile(matchesOwnProfile);

      if (!matchesOwnProfile || !connectedSteamId) {
        setFavoriteAppIds([]);
        return;
      }

      const validAppIds = new Set(summary.ownedGames.map((game) => game.appid));
      const storedFavorites = getFavoritesForSteamId(nextState, connectedSteamId).filter(
        (appId) => validAppIds.has(appId),
      );

      setFavoriteAppIds(storedFavorites);
    }

    syncState();
    window.addEventListener(CONNECTED_ACCOUNT_EVENT, syncState);
    window.addEventListener("storage", syncState);

    return () => {
      window.removeEventListener(CONNECTED_ACCOUNT_EVENT, syncState);
      window.removeEventListener("storage", syncState);
    };
  }, [summary.ownedGames, summary.player.steamid]);

  function persistFavorites(nextFavorites: number[]) {
    const nextState = readConnectedAccountState();
    const connectedSteamId = nextState.connectedAccount?.steamId;

    if (!connectedSteamId || connectedSteamId !== summary.player.steamid) {
      return;
    }

    const updatedState = setFavoritesForSteamId(
      nextState,
      connectedSteamId,
      nextFavorites,
    );
    setFavoriteAppIds(nextFavorites);
    writeConnectedAccountState(updatedState);
  }

  const selectedAppIds = useMemo(() => new Set(favoriteAppIds), [favoriteAppIds]);
  const selectedGames = favoriteAppIds
    .map((appId) => summary.ownedGames.find((game) => game.appid === appId))
    .filter((game): game is SteamOwnedGame => Boolean(game));

  const recommendations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery || favoriteAppIds.length >= MAX_FAVORITES) {
      return [];
    }

    return summary.ownedGames
      .filter((game) => !selectedAppIds.has(game.appid))
      .map((game) => ({
        game,
        index: game.name.toLocaleLowerCase().indexOf(normalizedQuery),
      }))
      .filter((match) => match.index >= 0)
      .sort((left, right) => {
        if (left.index !== right.index) {
          return left.index - right.index;
        }

        return left.game.name.localeCompare(right.game.name);
      })
      .slice(0, MAX_RECOMMENDATIONS);
  }, [favoriteAppIds.length, query, selectedAppIds, summary.ownedGames]);

  function handleAddGame(game: SteamOwnedGame) {
    if (favoriteAppIds.length >= MAX_FAVORITES || selectedAppIds.has(game.appid)) {
      return;
    }

    persistFavorites([...favoriteAppIds, game.appid]);
    setQuery("");
  }

  function handleRemoveGame(appId: number) {
    persistFavorites(favoriteAppIds.filter((candidate) => candidate !== appId));
  }

  function handleDrop(targetAppId: number) {
    if (draggedAppId === null || draggedAppId === targetAppId) {
      return;
    }

    const fromIndex = favoriteAppIds.indexOf(draggedAppId);
    const toIndex = favoriteAppIds.indexOf(targetAppId);

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    persistFavorites(moveItem(favoriteAppIds, fromIndex, toIndex));
    setDraggedAppId(null);
  }

  if (!isOwnProfile) {
    return null;
  }

  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Top 5 Games</h3>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Pick your favorites from your own library, then drag to rank them.
          </p>
        </div>

        <div className="relative w-full max-w-sm">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              favoriteAppIds.length >= MAX_FAVORITES
                ? "Your top 5 is full"
                : "Add a game from your library"
            }
            disabled={favoriteAppIds.length >= MAX_FAVORITES}
            className="glass-input w-full rounded-2xl px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#9bdcff]/60"
          />
          {query.trim() && favoriteAppIds.length < MAX_FAVORITES ? (
            <div className="glass-popover absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl p-1">
              {recommendations.length > 0 ? (
                recommendations.map(({ game }) => (
                  <button
                    key={game.appid}
                    type="button"
                    onClick={() => handleAddGame(game)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span className="truncate">{game.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Add
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  No matching owned games found.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: MAX_FAVORITES }, (_, index) => {
          const game = selectedGames[index];
          const rank = index + 1;

          if (!game) {
            return (
              <div
                key={`empty-slot-${rank}`}
                className="glass-card-soft flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 px-4 text-center"
              >
                <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  #{rank}
                </span>
                <p className="mt-3 text-sm font-medium text-white">Empty slot</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Search above to add a favorite.
                </p>
              </div>
            );
          }

          const isTopPick = index === 0;

          return (
            <article
              key={game.appid}
              draggable
              onDragStart={() => setDraggedAppId(game.appid)}
              onDragEnd={() => setDraggedAppId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(game.appid)}
              className={`glass-card-soft group relative overflow-hidden rounded-2xl transition ${
                isTopPick
                  ? "ring-2 ring-amber-300/75 shadow-[0_0_0_1px_rgba(252,211,77,0.4),0_0_32px_rgba(252,211,77,0.42),0_0_64px_rgba(252,211,77,0.18)]"
                  : ""
              } ${draggedAppId === game.appid ? "scale-[0.98] opacity-70" : ""}`}
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[rgba(6,12,22,0.35)]">
                <Image
                  src={getPortraitImageUrl(game.appid)}
                  alt={`${game.name} cover art`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1280px) 28vw, 16vw"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#09111d] via-[#09111d]/56 to-transparent" />
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span
                    className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1.5 text-sm font-bold tracking-[0.08em] ring-1 ring-inset shadow-[0_6px_16px_rgba(5,10,18,0.28)] ${getRankBadgeClasses(rank)}`}
                  >
                    #{rank}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveGame(game.appid)}
                  className="glass-input absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-200 transition hover:border-white/18 hover:text-white"
                  aria-label={`Remove ${game.name} from favorites`}
                >
                  x
                </button>
              </div>
              <div className="space-y-1 px-3 py-3">
                <p className="text-sm font-medium leading-5 text-white">{game.name}</p>
                <p className="text-sm font-semibold text-[#9bdcff]">
                  {formatPlaytime(game.playtime_forever)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
