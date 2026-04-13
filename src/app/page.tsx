import Image from "next/image";
import { SteamSearchForm } from "@/components/steam-search-form";
import {
  formatPlaytime,
  formatUnixDate,
  getSteamCapsuleImageUrl,
  getSteamErrorDetails,
  getSteamUserSummaryByIdentifier,
} from "@/lib/steam";

type HomePageProps = {
  searchParams: Promise<{
    user?: string | string[];
  }>;
};

type LoadedSteamData = Awaited<ReturnType<typeof loadSteamData>>;
type SteamSummary = NonNullable<LoadedSteamData["summary"]>;

async function loadSteamData(identifier?: string | string[]) {
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
      error: null,
    };
  }

  try {
    return {
      requestedUser: trimmedUser,
      summary: await getSteamUserSummaryByIdentifier(trimmedUser),
      error: null,
    };
  } catch (error) {
    return {
      requestedUser: trimmedUser,
      summary: null,
      error: getSteamErrorDetails(error),
    };
  }
}

function formatHours(minutes: number) {
  return `${Math.round(minutes / 60).toLocaleString()}`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getPersonaStatus(personaState: number) {
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

function getDashboardMetrics(summary: SteamSummary) {
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

function getPlaytimeBuckets(summary: SteamSummary) {
  const buckets = [
    { label: "Epic", color: "#66C0F4", count: 0 },
    { label: "Core", color: "#3b82f6", count: 0 },
    { label: "Regular", color: "#0ea5e9", count: 0 },
    { label: "Sampled", color: "#0284c7", count: 0 },
    { label: "Unplayed", color: "#0f3b63", count: 0 },
  ];

  for (const game of summary.ownedGames) {
    const hours = game.playtime_forever / 60;

    if (hours === 0) {
      buckets[4].count += 1;
    } else if (hours < 5) {
      buckets[3].count += 1;
    } else if (hours < 25) {
      buckets[2].count += 1;
    } else if (hours < 100) {
      buckets[1].count += 1;
    } else {
      buckets[0].count += 1;
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
    };
  });

  return {
    buckets: segments,
    background: `conic-gradient(${segments.map((bucket) => bucket.segment).join(", ")})`,
  };
}

function Sidebar({ summary }: { summary?: SteamSummary | null }) {
  return (
    <aside className="hidden border-r border-[#1f2937] bg-[#0b1220]/90 lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[240px]">
      <div className="flex h-full flex-col">
        <div className="flex h-[68px] items-center border-b border-[#1f2937]/60 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#66c0f4] to-[#3b82f6] shadow-[0_0_20px_rgba(102,192,244,0.25)]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-black"
              >
                <path
                  d="M12 2a10 10 0 1 0 5.3 18.6l-2.1-2.1A7 7 0 1 1 19 12h2A10 10 0 0 0 12 2Zm-1.1 6.3 2.3 2.3-1.4 1.4-2.3-2.3A3.5 3.5 0 1 0 10.9 8.3Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-[0.18em] text-white">
              STEAMLAB
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 p-3">
          {[
            { label: "Dashboard", active: true },
            { label: "Library" },
            { label: "Activity" },
            { label: "Insights" },
            { label: "Backlog" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                item.active
                  ? "border border-[#66c0f4]/20 bg-[#66c0f4]/10 font-medium text-[#66c0f4]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current/80" />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#1f2937]/70 p-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#1f2937] bg-[#121a2b]/60 p-2.5">
            {summary ? (
              <Image
                src={summary.player.avatarfull}
                alt={`${summary.player.personaname} avatar`}
                width={36}
                height={36}
                className="rounded-full ring-1 ring-[#1f2937]"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-[#1a2440]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">
                {summary?.player.personaname ?? "No profile loaded"}
              </p>
              <p className="text-[11px] text-slate-500">
                {summary ? getPersonaStatus(summary.player.personastate) : "Search to begin"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  initialValue,
  summary,
}: {
  initialValue: string;
  summary?: SteamSummary | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#1f2937]/70 bg-[#0b1220]/75 backdrop-blur">
      <div className="mx-auto flex h-[68px] w-full max-w-[1280px] items-center gap-4 px-4 lg:px-6">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#66c0f4] lg:hidden">
            STEAMLAB
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">
            Dashboard
          </h1>
        </div>

        <div className="flex-1" />

        <div className="hidden md:block">
          <SteamSearchForm initialValue={initialValue} compact />
        </div>

        <button className="relative rounded-xl border border-[#1f2937] bg-[#121a2b]/70 p-2.5 text-slate-400 transition hover:bg-[#121a2b] hover:text-white">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#66c0f4]" />
        </button>

        <div className="hidden h-7 w-px bg-[#1f2937] sm:block" />

        <div className="flex items-center gap-2.5">
          {summary ? (
            <>
              <div className="relative">
                <Image
                  src={summary.player.avatarfull}
                  alt={`${summary.player.personaname} avatar`}
                  width={32}
                  height={32}
                  className="rounded-full ring-1 ring-[#1f2937]"
                />
                <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0b1220]" />
              </div>
              <span className="hidden text-[14px] font-medium text-white sm:block">
                {summary.player.personaname}
              </span>
            </>
          ) : (
            <span className="hidden text-sm text-slate-400 sm:block">
              Search a profile
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-[#1f2937]/60 px-4 py-3 md:hidden">
        <SteamSearchForm initialValue={initialValue} compact />
      </div>
    </header>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl border border-[#1f2937] bg-[#121a2b]/85 p-8 shadow-xl shadow-black/30">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#66c0f4]">
        Ready to search
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Pull a Steam profile into the dashboard
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
        Use the search bar above with either a Steam ID64 or a custom profile
        name from a URL like <code>steamcommunity.com/id/gaben</code>.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Live Steam data",
            body: "Profile details, library size, recent activity, and top-played games come from Steam Web API responses.",
          },
          {
            title: "Shareable URLs",
            body: "Every search updates the page URL, so the loaded profile is easy to refresh or bookmark.",
          },
          {
            title: "Realistic dashboard styling",
            body: "This layout follows the mock’s darker Steam-inspired product feel while staying backed by your own data model.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/8 bg-[#0b1220]/80 p-5"
          >
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ErrorState({
  message,
  requestedUser,
}: {
  message: string;
  requestedUser: string;
}) {
  return (
    <section className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-rose-50 shadow-xl shadow-black/20">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-200">
        Lookup failed
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">
        We couldn&apos;t load that Steam profile
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-rose-100/85">
        {message}
      </p>
      <p className="mt-4 text-sm leading-7 text-rose-100/70">
        Search attempted for <code>{requestedUser}</code>. Use a numeric Steam
        ID64 or the exact custom profile name from
        <code> steamcommunity.com/id/&lt;name&gt;</code>.
      </p>
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30 transition hover:-translate-y-0.5 hover:border-[#2a3648]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#66c0f4]/[0.07] to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="rounded-xl bg-[#66c0f4]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#66c0f4] ring-1 ring-inset ring-[#66c0f4]/20">
            {label}
          </div>
          <span
            className={`rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${accent}`}
          >
            {hint}
          </span>
        </div>
        <p className="mt-5 text-[34px] font-semibold leading-none tracking-tight text-white">
          {value}
        </p>
      </div>
    </article>
  );
}

function TopHoursChart({ summary }: { summary: SteamSummary }) {
  const topGames = summary.ownedGames.slice(0, 5);
  const highestMinutes = topGames[0]?.playtime_forever ?? 1;

  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Top 5 by Hours</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">Lifetime playtime</p>
        </div>
      </div>
      <div className="space-y-4">
        {topGames.map((game) => (
          <div key={game.appid} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-300">{game.name}</span>
                <span className="font-medium text-white">
                  {formatPlaytime(game.playtime_forever)}
                </span>
              </div>
              <div className="h-6 rounded-full bg-[#0b1220] ring-1 ring-inset ring-[#1f2937]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#66c0f4] to-[#3b82f6]"
                  style={{
                    width: `${Math.max(
                      14,
                      (game.playtime_forever / highestMinutes) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlaytimeBreakdown({ summary }: { summary: SteamSummary }) {
  const breakdown = getPlaytimeBuckets(summary);

  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Playtime DNA</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Library pacing breakdown
          </p>
        </div>
        <span className="rounded-full border border-[#1f2937] bg-[#0b1220] px-2 py-1 text-[11px] text-slate-400">
          {summary.ownedGames.length} games
        </span>
      </div>
      <div className="grid items-center gap-6 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="flex items-center justify-center">
          <div
            className="relative h-56 w-56 rounded-full"
            style={{ background: breakdown.background }}
          >
            <div className="absolute inset-[30px] rounded-full bg-[#121a2b] ring-1 ring-inset ring-[#1f2937]" />
          </div>
        </div>
        <div className="space-y-3">
          {breakdown.buckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: bucket.color }}
              />
              <span className="flex-1 text-sm text-slate-300">{bucket.label}</span>
              <span className="text-sm font-medium text-white">
                {formatPercent(bucket.percentage)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentActivity({ summary }: { summary: SteamSummary }) {
  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Recent Activity</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">Last 2 weeks</p>
        </div>
        <span className="text-xs text-[#66c0f4]">Steam sync</span>
      </div>

      {summary.recentGames.length > 0 ? (
        <div className="space-y-3">
          {summary.recentGames.slice(0, 5).map((game) => (
            <div
              key={game.appid}
              className="flex items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-white/[0.03]"
            >
              <Image
                src={getSteamCapsuleImageUrl(game.appid)}
                alt={`${game.name} capsule art`}
                width={72}
                height={27}
                className="h-[34px] w-[72px] rounded-md object-cover ring-1 ring-[#1f2937]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{game.name}</p>
                <p className="text-xs text-slate-500">
                  {formatPlaytime(game.playtime_2weeks)} in the last 2 weeks
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">
                  {formatPlaytime(game.playtime_forever)}
                </p>
                <p className="text-[11px] text-emerald-400">active</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-7 text-slate-400">
          Steam did not return any recent activity for this profile. That can
          happen if the user has not played recently or if activity details are
          private.
        </p>
      )}
    </section>
  );
}

function BacklogTable({ summary }: { summary: SteamSummary }) {
  const backlogGames = summary.ownedGames.filter((game) => game.playtime_forever === 0);

  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Backlog Killer</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Unplayed games waiting
          </p>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300 ring-1 ring-inset ring-amber-500/20">
          {backlogGames.length} unplayed
        </span>
      </div>

      {backlogGames.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f2937] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-3 font-medium">Game</th>
                <th className="pb-3 font-medium text-right">App ID</th>
                <th className="pb-3 font-medium text-right">Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937]/60">
              {backlogGames.slice(0, 5).map((game, index) => (
                <tr key={game.appid} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={getSteamCapsuleImageUrl(game.appid)}
                        alt={`${game.name} capsule art`}
                        width={56}
                        height={21}
                        className="h-[26px] w-14 rounded object-cover ring-1 ring-[#1f2937]"
                      />
                      <span className="font-medium text-white">{game.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-slate-400">{game.appid}</td>
                  <td className="py-3 text-right">
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300 ring-1 ring-inset ring-[#334155]">
                      Unplayed
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button className="rounded-lg bg-[#66c0f4]/10 px-3 py-1.5 text-[12px] font-medium text-[#66c0f4] transition hover:bg-[#66c0f4]/20">
                      {index === 0 ? "Play next" : "Queue"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm leading-7 text-slate-400">
          No backlog candidates here. Every visible game in this library already
          has at least some recorded playtime.
        </p>
      )}
    </section>
  );
}

function ProfileDashboard({ summary }: { summary: SteamSummary }) {
  const metrics = getDashboardMetrics(summary);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <Image
              src={summary.player.avatarfull}
              alt={`${summary.player.personaname} avatar`}
              width={80}
              height={80}
              className="h-20 w-20 rounded-2xl ring-1 ring-[#1f2937]"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#66c0f4]">
                Connected profile
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">
                {summary.player.personaname}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {getPersonaStatus(summary.player.personastate)} • Joined{" "}
                {formatUnixDate(summary.player.timecreated)} •{" "}
                {summary.player.loccountrycode ?? "Unknown region"}
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap gap-3 lg:justify-end">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
              Steam ID:{" "}
              <span className="font-mono text-xs">{summary.player.steamid}</span>
            </span>
            <a
              href={summary.player.profileurl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#66c0f4] px-4 py-2 text-sm font-semibold text-[#08111f] transition hover:bg-[#8bd3ff]"
            >
              Open Steam profile
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Games"
          value={metrics.totalGames.toLocaleString()}
          hint={`+${summary.recentGames.length} active`}
          accent="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
        />
        <StatCard
          label="Hours Played"
          value={formatHours(metrics.totalMinutes)}
          hint={`+${formatHours(metrics.recentlyPlayedMinutes)} hrs`}
          accent="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
        />
        <StatCard
          label="Avg Hrs/Game"
          value={metrics.averageHoursPerPlayedGame.toFixed(1)}
          hint={`${metrics.playedGames} played`}
          accent="bg-sky-500/10 text-sky-300 ring-sky-500/20"
        />
        <StatCard
          label="Completion"
          value={formatPercent(metrics.completionRate)}
          hint={`${metrics.unplayedGames} backlog`}
          accent="bg-amber-500/10 text-amber-300 ring-amber-500/20"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <TopHoursChart summary={summary} />
        <PlaytimeBreakdown summary={summary} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <RecentActivity summary={summary} />
        <BacklogTable summary={summary} />
      </section>
    </div>
  );
}

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const { requestedUser, summary, error } = await loadSteamData(
    resolvedSearchParams.user,
  );

  return (
    <main className="min-h-screen bg-[#0b1220] text-zinc-200 selection:bg-[#66c0f4]/30 selection:text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(102,192,244,0.15),transparent_60%),radial-gradient(40%_30%_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
      </div>

      <Sidebar summary={summary} />

      <div className="min-h-screen w-full lg:pl-[240px]">
        <Topbar initialValue={requestedUser} summary={summary} />

        <div className="mx-auto w-full max-w-[1280px] p-4 lg:p-6">
          {!requestedUser ? <EmptyState /> : null}
          {requestedUser && error ? (
            <ErrorState message={error.message} requestedUser={requestedUser} />
          ) : null}
          {summary ? <ProfileDashboard summary={summary} /> : null}

          <footer className="mt-8 pb-6 text-center">
            <p className="text-[12px] text-slate-500">
              Data via Steam Web API • Search by Steam ID64 or vanity name •{" "}
              <span className="text-[#66c0f4]">Server-rendered</span>
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
