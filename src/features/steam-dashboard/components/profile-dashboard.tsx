import Image from "next/image";
import {
  formatPlaytime,
  formatUnixDate,
  getPersonaStatus,
  getSteamCapsuleImageUrl,
  type SteamTagBreakdown,
  type SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";
import {
  formatHours,
  formatPercent,
  getDashboardMetrics,
  getPlaytimeBuckets,
} from "@/features/steam-dashboard/utils/dashboard";

type ProfileDashboardProps = {
  summary: SteamUserSummary;
  tagBreakdown: SteamTagBreakdown | null;
};
type SummaryProps = {
  summary: SteamUserSummary;
};

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  accent: string;
};

function StatCard({ label, value, hint, accent }: StatCardProps) {
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

function TopHoursChart({ summary }: SummaryProps) {
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

function PlaytimeBreakdown({ summary }: SummaryProps) {
  const breakdown = getPlaytimeBuckets(summary);

  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">
            Playtime Breakdown
          </h3>
        </div>
        <span className="rounded-full border border-[#1f2937] bg-[#0b1220] px-2 py-1 text-[11px] text-slate-400">
          {summary.ownedGames.length} games
        </span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <div className="flex items-center justify-center xl:sticky xl:top-5">
          <div
            className="relative h-56 w-56 rounded-full"
            style={{ background: breakdown.background }}
          >
            <div className="absolute inset-[30px] flex items-center justify-center rounded-full bg-[#121a2b] ring-1 ring-inset ring-[#1f2937]">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  Total Games
                </p>
                <p className="mt-1 text-3xl font-semibold leading-none text-white">
                  {summary.ownedGames.length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {breakdown.buckets.map((bucket) => (
            <div
              key={bucket.label}
              className="group relative rounded-xl border border-[#1f2937]/80 bg-[#0b1220]/55 px-3 py-2.5"
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-2 w-2 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium text-slate-200">
                      {bucket.label}
                    </span>
                    <span className="text-[13px] font-medium text-white">
                      {formatPercent(bucket.percentage)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {bucket.legend} · {bucket.count} games
                    </p>
                    {bucket.label !== "Unplayed" && bucket.topGames.length > 0 ? (
                      <span className="text-[13px] font-medium leading-none text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-[#66c0f4]">
                        &gt;
                      </span>
                    ) : null}
                  </div>
                  {bucket.label !== "Unplayed" && bucket.topGames.length > 0 ? (
                    <div className="pointer-events-none absolute left-3 right-3 top-full z-10 mt-2 rounded-xl border border-[#2a3648] bg-[#0b1220]/95 p-3 opacity-0 shadow-xl shadow-black/40 transition duration-150 group-hover:translate-y-1 group-hover:opacity-100">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Top 5 in {bucket.label}
                      </p>
                      <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                        {bucket.topGames.map((game) => (
                          <li key={game.appid} className="flex items-start justify-between gap-3">
                            <span className="min-w-0 flex-1 truncate">{game.name}</span>
                            <span className="shrink-0 text-slate-400">
                              {formatPlaytime(game.playtime_forever)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GameTagBreakdown({ tagBreakdown }: { tagBreakdown: SteamTagBreakdown | null }) {
  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#121a2b]/85 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-white">Top Tags</h3>
        <span className="rounded-full border border-[#1f2937] bg-[#0b1220] px-2 py-1 text-[11px] text-slate-400">
          {tagBreakdown?.totalTaggedGames ?? 0} played games
        </span>
      </div>

      {tagBreakdown && tagBreakdown.buckets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tagBreakdown.buckets.map((bucket) => (
            <button
              key={bucket.label}
              type="button"
              className="rounded-full border border-[#1f2937] bg-[#0b1220]/75 px-3 py-1.5 text-left transition hover:border-[#2a3648] hover:bg-[#111a2c]"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
                <span className="text-[12px] font-medium text-slate-200">
                  {bucket.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatPercent(bucket.percentage)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          No tag data available yet. SteamSpy tags are fetched from played games
          using the API’s <span className="font-medium text-slate-300">tags</span>{" "}
          field (not genre).
        </p>
      )}

      {tagBreakdown && tagBreakdown.buckets.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Source: SteamSpy tags field
          </p>
          <div className="space-y-2">
            {tagBreakdown.buckets.map((bucket) => (
              <div
                key={`${bucket.label}-summary`}
                className="rounded-xl border border-[#1f2937]/80 bg-[#0b1220]/55 px-3 py-2.5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium text-slate-200">
                        {bucket.label}
                      </span>
                      <span className="text-[13px] font-medium text-white">
                        {formatPercent(bucket.percentage)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {bucket.count} games · {formatHours(bucket.totalMinutes)} hrs
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RecentActivity({ summary }: SummaryProps) {
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

function BacklogTable({ summary }: SummaryProps) {
  const backlogGames = summary.ownedGames.filter(
    (game) => game.playtime_forever === 0,
  );

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

export function ProfileDashboard({ summary, tagBreakdown }: ProfileDashboardProps) {
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

      <GameTagBreakdown tagBreakdown={tagBreakdown} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <RecentActivity summary={summary} />
        <BacklogTable summary={summary} />
      </section>
    </div>
  );
}
