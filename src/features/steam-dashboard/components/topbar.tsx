import { type SteamUserSummary } from "@/features/steam-dashboard/api/steam";
import { ConnectedAccountControls } from "@/features/steam-dashboard/components/connected-account-controls";
import { SteamSearchForm } from "@/features/steam-dashboard/components/steam-search-form";

type TopbarProps = {
  initialValue: string;
  summary?: SteamUserSummary | null;
};

export function Topbar({ initialValue, summary }: TopbarProps) {
  return (
    <header className="glass-chrome-strong sticky top-0 z-20 border-b lg:hidden">
      <div className="mx-auto flex h-[68px] w-full max-w-[1280px] items-center gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">
            <span className="text-[#9bdcff]">Steam</span>{" "}
            <span>Dashboard</span>
          </h1>
        </div>

        <div className="flex-1" />

        <ConnectedAccountControls currentSteamId={summary?.player.steamid} />
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <SteamSearchForm initialValue={initialValue} compact />
      </div>
    </header>
  );
}
