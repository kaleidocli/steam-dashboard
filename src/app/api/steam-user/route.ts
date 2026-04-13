import { getSteamUserSummary } from "@/lib/steam";

const DEFAULT_STEAM_USER_ID = process.env.STEAM_USER_ID;

export async function GET() {
  if (!DEFAULT_STEAM_USER_ID) {
    return Response.json(
      {
        error:
          "Missing STEAM_USER_ID. Add a hard-coded Steam user id to .env.local.",
      },
      { status: 500 },
    );
  }

  try {
    const summary = await getSteamUserSummary(DEFAULT_STEAM_USER_ID);
    return Response.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Steam API error.";

    return Response.json({ error: message }, { status: 500 });
  }
}
