const STEAM_API_BASE_URL = "https://api.steampowered.com";

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

export type SteamUserSummary = {
  player: SteamPlayer;
  ownedGames: SteamOwnedGame[];
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

function getSteamApiKey() {
  const apiKey = process.env.STEAM_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing STEAM_API_KEY. Add it to your .env.local file before loading Steam data.",
    );
  }

  return apiKey;
}

async function fetchSteamJson<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const apiKey = getSteamApiKey();
  const searchParams = new URLSearchParams({
    key: apiKey,
    ...params,
  });

  const response = await fetch(`${STEAM_API_BASE_URL}${path}?${searchParams}`);

  if (!response.ok) {
    throw new Error(
      `Steam request failed with status ${response.status} ${response.statusText}.`,
    );
  }

  return (await response.json()) as T;
}

export async function getSteamUserSummary(
  steamUserId: string,
): Promise<SteamUserSummary> {
  const [playerSummary, ownedGamesSummary] = await Promise.all([
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

  return {
    player,
    ownedGames,
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
