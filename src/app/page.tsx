import Image from "next/image";
import { formatPlaytime, formatUnixDate, getSteamUserSummary } from "@/lib/steam";

const STEAM_USER_ID = process.env.STEAM_USER_ID;

async function loadSteamData(steamUserId: string) {
  try {
    return {
      summary: await getSteamUserSummary(steamUserId),
      error: null,
    };
  } catch (error) {
    return {
      summary: null,
      error:
        error instanceof Error ? error.message : "Unknown Steam loading error.",
    };
  }
}

export default async function Home() {
  if (!STEAM_USER_ID) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-10">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">
            Setup needed
          </p>
          <h1 className="mt-4 text-3xl font-semibold">
            Add your Steam credentials first
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-amber-900/80">
            Create or update <code>.env.local</code> with a Steam API key and a
            hard-coded Steam user id. The page will start working after the dev
            server reloads.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl bg-[#20150a] p-4 text-sm text-amber-100">
            <code>{`STEAM_API_KEY=your_steam_web_api_key
STEAM_USER_ID=7656119...`}</code>
          </pre>
        </section>
      </main>
    );
  }

  const { summary, error } = await loadSteamData(STEAM_USER_ID);

  if (error || !summary) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-10">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-950 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">
            Steam request failed
          </p>
          <h1 className="mt-4 text-3xl font-semibold">
            The page could not load Steam data yet
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-rose-900/80">
            {error ?? "Unknown Steam loading error."}
          </p>
          <p className="mt-4 text-sm leading-7 text-rose-900/80">
            Double-check your API key, confirm the Steam user id is valid, and
            make sure the profile and game details are visible to the Steam Web
            API.
          </p>
        </section>
      </main>
    );
  }

  const topGames = summary.ownedGames.slice(0, 5);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1b2838,_#0f1724_42%,_#07111d_100%)] text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-10">
        <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[auto_1fr] md:items-center">
          <Image
            src={summary.player.avatarfull}
            alt={`${summary.player.personaname} avatar`}
            width={112}
            height={112}
            className="h-28 w-28 rounded-3xl border border-white/10 object-cover"
          />
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200/80">
              Steam profile
            </p>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                {summary.player.personaname}
              </h1>
              <p className="mt-2 text-base text-slate-300">
                Steam ID:{" "}
                <span className="font-mono text-sm">{summary.player.steamid}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                Country: {summary.player.loccountrycode ?? "Unknown"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                Joined Steam: {formatUnixDate(summary.player.timecreated)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                Games found: {summary.ownedGames.length}
              </span>
            </div>
            <a
              href={summary.player.profileurl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Open Steam profile
            </a>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-8 shadow-xl shadow-black/20">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
              Top owned games
            </p>
            <ul className="mt-6 space-y-4">
              {topGames.map((game) => (
                <li
                  key={game.appid}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                >
                  <div>
                    <p className="text-lg font-medium text-white">{game.name}</p>
                    <p className="text-sm text-slate-400">App ID: {game.appid}</p>
                  </div>
                  <p className="text-sm font-semibold text-cyan-200">
                    {formatPlaytime(game.playtime_forever)}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-8 shadow-xl shadow-black/20">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
              How this page works
            </p>
            <ol className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
              <li>
                <span className="font-semibold text-white">1.</span> This
                <code className="mx-1">page.tsx</code> file is a server component, so
                it can call Steam safely on the server.
              </li>
              <li>
                <span className="font-semibold text-white">2.</span> The reusable
                logic lives in <code className="mx-1">src/lib/steam.ts</code>.
              </li>
              <li>
                <span className="font-semibold text-white">3.</span> The Steam API key
                stays in <code className="mx-1">.env.local</code>, not inside the
                browser code.
              </li>
              <li>
                <span className="font-semibold text-white">4.</span> The optional JSON
                endpoint is available at
                <code className="mx-1">/api/steam-user</code> for future client
                components.
              </li>
            </ol>
          </article>
        </section>
      </div>
    </main>
  );
}
