import type {
  SteamTagBreakdown,
  SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";
import { BackgroundAppearanceLayer } from "@/features/steam-dashboard/components/background-appearance-layer";
import { ConnectedAccountBootstrap } from "@/features/steam-dashboard/components/connected-account-bootstrap";
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
    <main className="app-shell app-backdrop min-h-screen text-zinc-100 selection:bg-[#8ed8ff]/30 selection:text-white">
      <BackgroundAppearanceLayer />
      <ConnectedAccountBootstrap requestedUser={requestedUser} />
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.05),transparent_24%)]" />
      </div>

      <Sidebar summary={summary} />

      <div className="min-h-screen w-full lg:pl-[240px]">
        <Topbar
          initialValue={requestedUser === "me" ? "" : requestedUser}
          summary={summary}
        />

        <div className="mx-auto w-full max-w-[1280px] p-4 lg:p-6">
          {!summary && !error && (!requestedUser || requestedUser === "me") ? (
            <EmptyState />
          ) : null}
          {requestedUser && error ? (
            <ErrorState message={error.message} requestedUser={requestedUser} />
          ) : null}
          {summary ? (
            <ProfileDashboard summary={summary} tagBreakdown={tagBreakdown} />
          ) : null}

          <footer className="mt-8 pb-6 text-center">
            <p className="text-[12px] text-slate-400">
              Data via Steam Web API + SteamSpy / Search by Steam ID64 or vanity
              name / <span className="text-[#9bdcff]">Server-rendered</span>
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
