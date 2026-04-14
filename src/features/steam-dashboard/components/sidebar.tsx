import { type SteamUserSummary } from "@/features/steam-dashboard/api/steam";
import { ConnectedAccountControls } from "@/features/steam-dashboard/components/connected-account-controls";
import { SidebarNav } from "@/features/steam-dashboard/components/sidebar-nav";

type SidebarProps = {
  summary?: SteamUserSummary | null;
};

export function Sidebar({ summary }: SidebarProps) {
  return (
    <aside className="glass-rail hidden border-r lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:w-[248px]">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="px-2">
          <h1 className="text-[24px] font-semibold tracking-tight text-white">
            <span className="text-[#9bdcff]">Steam</span>{" "}
            <span>Dashboard</span>
          </h1>
        </div>

        <nav className="mt-8 flex-1">
          <SidebarNav summary={summary} />
        </nav>

        <div className="border-t border-white/10 pt-4">
          <ConnectedAccountControls
            currentSteamId={summary?.player.steamid}
            placement="rail"
            hideWhenDisconnected
          />
        </div>
      </div>
    </aside>
  );
}
