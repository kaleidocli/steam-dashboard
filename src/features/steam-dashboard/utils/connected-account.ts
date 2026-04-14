"use client";

export const CONNECTED_ACCOUNT_STORAGE_KEY =
  "steam-dashboard.connected-account";
export const CONNECTED_ACCOUNT_EVENT =
  "steam-dashboard:connected-account-change";

export type ConnectedAccount = {
  identifier: string;
  steamId: string;
  personaName: string;
  avatar: string;
  personaState: number;
};

export type ConnectedAccountState = {
  connectedAccount: ConnectedAccount | null;
  favoritesBySteamId: Record<string, number[]>;
};

export const DEFAULT_CONNECTED_ACCOUNT_STATE: ConnectedAccountState = {
  connectedAccount: null,
  favoritesBySteamId: {},
};

function isValidConnectedAccount(value: unknown): value is ConnectedAccount {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.identifier === "string" &&
    typeof candidate.steamId === "string" &&
    typeof candidate.personaName === "string" &&
    typeof candidate.avatar === "string" &&
    typeof candidate.personaState === "number"
  );
}

export function parseStoredConnectedAccountState(
  rawValue: string | null,
): ConnectedAccountState {
  if (!rawValue) {
    return DEFAULT_CONNECTED_ACCOUNT_STATE;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ConnectedAccountState>;
    const connectedAccount = isValidConnectedAccount(parsed.connectedAccount)
      ? parsed.connectedAccount
      : null;

    const favoritesBySteamId = Object.fromEntries(
      Object.entries(parsed.favoritesBySteamId ?? {}).flatMap(([steamId, appIds]) =>
        Array.isArray(appIds) &&
        appIds.every((appId) => Number.isInteger(appId) && appId > 0)
          ? [[steamId, [...new Set(appIds)].slice(0, 5)]]
          : [],
      ),
    );

    return {
      connectedAccount,
      favoritesBySteamId,
    };
  } catch {
    return DEFAULT_CONNECTED_ACCOUNT_STATE;
  }
}

export function readConnectedAccountState() {
  return parseStoredConnectedAccountState(
    window.localStorage.getItem(CONNECTED_ACCOUNT_STORAGE_KEY),
  );
}

export function writeConnectedAccountState(state: ConnectedAccountState) {
  window.localStorage.setItem(
    CONNECTED_ACCOUNT_STORAGE_KEY,
    JSON.stringify(state),
  );
  window.dispatchEvent(
    new CustomEvent(CONNECTED_ACCOUNT_EVENT, {
      detail: state,
    }),
  );
}

export function getFavoritesForSteamId(
  state: ConnectedAccountState,
  steamId: string,
) {
  return state.favoritesBySteamId[steamId] ?? [];
}

export function setFavoritesForSteamId(
  state: ConnectedAccountState,
  steamId: string,
  favorites: number[],
): ConnectedAccountState {
  return {
    ...state,
    favoritesBySteamId: {
      ...state.favoritesBySteamId,
      [steamId]: [...new Set(favorites)].slice(0, 5),
    },
  };
}

export function clearConnectedAccount(
  state: ConnectedAccountState,
): ConnectedAccountState {
  const steamId = state.connectedAccount?.steamId;

  if (!steamId) {
    return {
      ...state,
      connectedAccount: null,
    };
  }

  const nextFavorites = { ...state.favoritesBySteamId };
  delete nextFavorites[steamId];

  return {
    connectedAccount: null,
    favoritesBySteamId: nextFavorites,
  };
}
