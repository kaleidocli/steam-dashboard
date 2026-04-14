import { type SteamUserSummary } from "@/features/steam-dashboard/api/steam";

type SidebarProps = {
  summary?: SteamUserSummary | null;
};

export function Sidebar({ summary: _summary }: SidebarProps) {
  return (
    <aside className="glass-chrome-strong hidden border-r lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[240px]">
      <div className="flex h-full flex-col">
        <nav className="flex-1 space-y-1.5 p-3 pt-5">
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
                  ? "glass-card-soft font-medium text-[#b8e8ff]"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current/80" />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
