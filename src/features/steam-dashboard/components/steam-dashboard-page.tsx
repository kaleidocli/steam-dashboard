import type {
  SteamTagBreakdown,
  SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";
import { EmptyState } from "@/features/steam-dashboard/components/empty-state";
import { ErrorState } from "@/features/steam-dashboard/components/error-state";
import { ProfileDashboard } from "@/features/steam-dashboard/components/profile-dashboard";
import { Sidebar } from "@/features/steam-dashboard/components/sidebar";
import { Topbar } from "@/features/steam-dashboard/components/topbar";

type SteamDashboardPageProps = {
  requestedUser: string;
  summary: SteamUserSummary | null;
  tagBreakdown: SteamTagBreakdown | null;
  error: {
    message: string;
    statusCode: number;
  } | null;
};

export function SteamDashboardPage({
  requestedUser,
  summary,
  tagBreakdown,
  error,
}: SteamDashboardPageProps) {
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
          {summary ? (
            <ProfileDashboard summary={summary} tagBreakdown={tagBreakdown} />
          ) : null}

          <footer className="mt-8 pb-6 text-center">
            <p className="text-[12px] text-slate-500">
              Data via Steam Web API + SteamSpy • Search by Steam ID64 or vanity
              name •{" "}
              <span className="text-[#66c0f4]">Server-rendered</span>
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
