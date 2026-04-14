import type { SteamUserSummary } from "@/features/steam-dashboard/api/steam";

export function formatHours(minutes: number) {
  return `${Math.round(minutes / 60).toLocaleString()}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function getDashboardMetrics(summary: SteamUserSummary) {
  const totalGames = summary.ownedGames.length;
  const totalMinutes = summary.ownedGames.reduce(
    (total, game) => total + game.playtime_forever,
    0,
  );
  const recentlyPlayedMinutes = summary.recentGames.reduce(
    (total, game) => total + game.playtime_2weeks,
    0,
  );
  const playedGames = summary.ownedGames.filter(
    (game) => game.playtime_forever > 0,
  ).length;
  const unplayedGames = summary.ownedGames.filter(
    (game) => game.playtime_forever === 0,
  ).length;
  const averageHoursPerPlayedGame =
    playedGames === 0 ? 0 : totalMinutes / 60 / playedGames;
  const completionRate = totalGames === 0 ? 0 : (playedGames / totalGames) * 100;

  return {
    totalGames,
    totalMinutes,
    recentlyPlayedMinutes,
    playedGames,
    unplayedGames,
    averageHoursPerPlayedGame,
    completionRate,
  };
}

export function getPlaytimeBuckets(summary: SteamUserSummary) {
  const buckets = [
    {
      label: "Addicted",
      legend: "300+ hrs",
      color: "#f97316",
      count: 0,
      games: [] as SteamUserSummary["ownedGames"],
    },
    {
      label: "Enthusiast",
      legend: "80-300 hrs",
      color: "#f43f5e",
      count: 0,
      games: [] as SteamUserSummary["ownedGames"],
    },
    {
      label: "Normal",
      legend: "15-80 hrs",
      color: "#a855f7",
      count: 0,
      games: [] as SteamUserSummary["ownedGames"],
    },
    {
      label: "Short",
      legend: "0-15 hrs",
      color: "#22d3ee",
      count: 0,
      games: [] as SteamUserSummary["ownedGames"],
    },
    {
      label: "Unplayed",
      legend: "0 hrs",
      color: "#84cc16",
      count: 0,
      games: [] as SteamUserSummary["ownedGames"],
    },
  ];

  for (const game of summary.ownedGames) {
    const hours = game.playtime_forever / 60;

    if (hours === 0) {
      buckets[4].count += 1;
      buckets[4].games.push(game);
    } else if (hours < 15) {
      buckets[3].count += 1;
      buckets[3].games.push(game);
    } else if (hours < 80) {
      buckets[2].count += 1;
      buckets[2].games.push(game);
    } else if (hours < 300) {
      buckets[1].count += 1;
      buckets[1].games.push(game);
    } else {
      buckets[0].count += 1;
      buckets[0].games.push(game);
    }
  }

  const total = summary.ownedGames.length || 1;
  let currentAngle = 0;
  const segments = buckets.map((bucket) => {
    const portion = (bucket.count / total) * 360;
    const start = currentAngle;
    currentAngle += portion;

    return {
      ...bucket,
      percentage: (bucket.count / total) * 100,
      segment: `${bucket.color} ${start.toFixed(1)}deg ${currentAngle.toFixed(1)}deg`,
      topGames: bucket.games.slice(0, 5),
    };
  });

  return {
    buckets: segments,
    background: `conic-gradient(${segments.map((bucket) => bucket.segment).join(", ")})`,
  };
}
