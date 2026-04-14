import { loadSteamDashboard } from "@/features/steam-dashboard/api/load-steam-dashboard";
import { SteamDashboardPage } from "@/features/steam-dashboard/components/steam-dashboard-page";

type HomePageProps = {
  searchParams: Promise<{
    user?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const { requestedUser, summary, tagBreakdown, error } = await loadSteamDashboard(
    resolvedSearchParams.user,
  );

  return (
    <SteamDashboardPage
      requestedUser={requestedUser}
      summary={summary}
      tagBreakdown={tagBreakdown}
      error={error}
    />
  );
}
