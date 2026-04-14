import {
  getSteamErrorDetails,
  getSteamTagBreakdown,
  getSteamUserSummaryByIdentifier,
} from "@/features/steam-dashboard/api/steam";

export async function loadSteamDashboard(identifier?: string | string[]) {
  const user =
    typeof identifier === "string"
      ? identifier
      : Array.isArray(identifier)
        ? identifier[0]
        : "";

  const trimmedUser = user.trim();

  if (!trimmedUser) {
    return {
      requestedUser: "",
      summary: null,
      tagBreakdown: null,
      error: null,
    };
  }

  try {
    const summary = await getSteamUserSummaryByIdentifier(trimmedUser);

    return {
      requestedUser: trimmedUser,
      summary,
      tagBreakdown: await getSteamTagBreakdown(summary.ownedGames),
      error: null,
    };
  } catch (error) {
    return {
      requestedUser: trimmedUser,
      summary: null,
      tagBreakdown: null,
      error: getSteamErrorDetails(error),
    };
  }
}
