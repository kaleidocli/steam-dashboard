const STEAM_API_BASE_URL = "https://api.steampowered.com";
const STEAM_ID64_PATTERN = /^\d{17}$/;
const DEFAULT_STEAM_API_CACHE_TTL_SECONDS = 300;
const MAX_STEAM_API_CACHE_TTL_SECONDS = 86400;
const MAX_STEAM_API_CACHE_ENTRIES = 500;
const steamApiResponseCache = new Map<
  string,
  { expiresAtMs: number; payload: unknown }
>();

function getSteamApiCacheTtlSeconds() {
  const configuredTtl = Number(process.env.STEAM_API_CACHE_TTL_SECONDS);

  if (!Number.isFinite(configuredTtl) || configuredTtl <= 0) {
    return DEFAULT_STEAM_API_CACHE_TTL_SECONDS;
  }

  return Math.min(Math.floor(configuredTtl), MAX_STEAM_API_CACHE_TTL_SECONDS);
}

function shouldLogSteamApiCacheDebug() {
  return process.env.STEAM_API_CACHE_DEBUG === "1";
}

function getSteamApiCacheKey(path: string, params: Record<string, string>) {
  const sortedParams = Object.entries(params).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `${path}?${JSON.stringify(sortedParams)}`;
}

function pruneOldestSteamApiCacheEntry() {
  const oldestKey = steamApiResponseCache.keys().next().value;
  if (oldestKey) {
    steamApiResponseCache.delete(oldestKey);
  }
}

export class SteamLookupError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "SteamLookupError";
    this.statusCode = statusCode;
  }
}

export type SteamPlayer = {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatarfull: string;
  personastate: number;
  realname?: string;
  loccountrycode?: string;
  timecreated?: number;
};

export type SteamOwnedGame = {
  appid: number;
  name: string;
  img_icon_url?: string;
  playtime_forever: number;
};

export type SteamRecentGame = {
  appid: number;
  name: string;
  playtime_2weeks: number;
  playtime_forever: number;
};

export type SteamUserSummary = {
  player: SteamPlayer;
  ownedGames: SteamOwnedGame[];
  recentGames: SteamRecentGame[];
};

type SteamPlayerSummariesResponse = {
  response: {
    players: SteamPlayer[];
  };
};

type SteamOwnedGamesResponse = {
  response?: {
    game_count: number;
    games?: SteamOwnedGame[];
  };
};

type SteamResolveVanityUrlResponse = {
  response: {
    success: number;
    steamid?: string;
    message?: string;
  };
};

type SteamRecentlyPlayedGamesResponse = {
  response?: {
    total_count: number;
    games?: SteamRecentGame[];
  };
};

function getSteamApiKey() {
  const apiKey = process.env.STEAM_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing STEAM_API_KEY. Add it to your .env.local file before loading Steam data.",
    );
  }

  return apiKey;
}

export function normalizeSteamIdentifier(identifier: string) {
  const normalized = identifier.trim();

  if (!normalized) {
    throw new SteamLookupError(
      "Enter a Steam ID64 or a custom profile name to search.",
      400,
    );
  }

  return normalized;
}

function isSteamId64(identifier: string) {
  return STEAM_ID64_PATTERN.test(identifier);
}

async function fetchSteamJson<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const apiKey = getSteamApiKey();
  const cacheTtlSeconds = getSteamApiCacheTtlSeconds();
  const cacheKey = getSteamApiCacheKey(path, params);
  const now = Date.now();
  const cachedEntry = steamApiResponseCache.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAtMs > now) {
    if (shouldLogSteamApiCacheDebug()) {
      console.info(
        `[steam-cache] path=${path} ttl=${cacheTtlSeconds}s cache=hit layer=memory duration=0ms`,
      );
    }
    return cachedEntry.payload as T;
  }

  if (cachedEntry) {
    steamApiResponseCache.delete(cacheKey);
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    ...params,
  });
  const startedAt = Date.now();

  const response = await fetch(`${STEAM_API_BASE_URL}${path}?${searchParams}`, {
    next: {
      revalidate: cacheTtlSeconds,
      tags: ["steam-api", `steam-api:${path}`],
    },
  });

  if (!response.ok) {
    throw new Error(
      `Steam request failed with status ${response.status} ${response.statusText}.`,
    );
  }

  const payload = (await response.json()) as T;

  steamApiResponseCache.set(cacheKey, {
    expiresAtMs: startedAt + cacheTtlSeconds * 1000,
    payload,
  });

  if (steamApiResponseCache.size > MAX_STEAM_API_CACHE_ENTRIES) {
    pruneOldestSteamApiCacheEntry();
  }

  if (shouldLogSteamApiCacheDebug()) {
    const durationMs = Date.now() - startedAt;
    const ageHeader = response.headers.get("age") ?? "n/a";
    const nextCacheHeader =
      response.headers.get("x-nextjs-cache") ??
      response.headers.get("x-vercel-cache") ??
      "n/a";

    console.info(
      `[steam-cache] path=${path} ttl=${cacheTtlSeconds}s cache=miss layer=network duration=${durationMs}ms age=${ageHeader} cacheHeader=${nextCacheHeader}`,
    );
  }

  return payload;
}

export async function getSteamUserSummary(
  steamUserId: string,
): Promise<SteamUserSummary> {
  const [playerSummary, ownedGamesSummary, recentGamesSummary] = await Promise.all([
    fetchSteamJson<SteamPlayerSummariesResponse>(
      "/ISteamUser/GetPlayerSummaries/v2/",
      {
        steamids: steamUserId,
      },
    ),
    fetchSteamJson<SteamOwnedGamesResponse>("/IPlayerService/GetOwnedGames/v1/", {
      steamid: steamUserId,
      include_appinfo: "true",
      include_played_free_games: "true",
    }),
    fetchSteamJson<SteamRecentlyPlayedGamesResponse>(
      "/IPlayerService/GetRecentlyPlayedGames/v1/",
      {
        steamid: steamUserId,
      },
    ),
  ]);

  const player = playerSummary.response.players[0];

  if (!player) {
    throw new Error(
      `No Steam profile was found for the Steam user id "${steamUserId}".`,
    );
  }

  const ownedGames = [...(ownedGamesSummary.response?.games ?? [])].sort(
    (left, right) => right.playtime_forever - left.playtime_forever,
  );
  const recentGames = [...(recentGamesSummary.response?.games ?? [])].sort(
    (left, right) => right.playtime_2weeks - left.playtime_2weeks,
  );

  return {
    player,
    ownedGames,
    recentGames,
  };
}

export async function resolveSteamUserId(identifier: string) {
  const normalizedIdentifier = normalizeSteamIdentifier(identifier);

  if (isSteamId64(normalizedIdentifier)) {
    return normalizedIdentifier;
  }

  const vanityResponse = await fetchSteamJson<SteamResolveVanityUrlResponse>(
    "/ISteamUser/ResolveVanityURL/v1/",
    {
      vanityurl: normalizedIdentifier,
    },
  );

  if (vanityResponse.response.success !== 1 || !vanityResponse.response.steamid) {
    throw new SteamLookupError(
      `No Steam profile matched "${normalizedIdentifier}". Try a Steam ID64 or a valid custom profile name.`,
      404,
    );
  }

  return vanityResponse.response.steamid;
}

export async function getSteamUserSummaryByIdentifier(identifier: string) {
  const steamUserId = await resolveSteamUserId(identifier);
  return getSteamUserSummary(steamUserId);
}

export function getSteamErrorDetails(error: unknown) {
  if (error instanceof SteamLookupError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    message: "Unknown Steam API error.",
    statusCode: 500,
  };
}

export function formatPlaytime(minutes: number) {
  const hours = minutes / 60;

  if (hours < 1) {
    return `${minutes} min`;
  }

  return `${hours.toFixed(1)} hrs`;
}

export function formatUnixDate(unixSeconds?: number) {
  if (!unixSeconds) {
    return "Unknown";
  }

  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getPersonaStatus(personaState: number) {
  switch (personaState) {
    case 1:
      return "Online";
    case 2:
      return "Busy";
    case 3:
      return "Away";
    case 4:
      return "Snooze";
    case 5:
      return "Looking to trade";
    case 6:
      return "Looking to play";
    default:
      return "Offline";
  }
}

export function getSteamCapsuleImageUrl(appid: number) {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_184x69.jpg`;
}
