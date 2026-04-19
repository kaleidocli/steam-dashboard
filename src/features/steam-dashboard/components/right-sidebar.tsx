import type {
  SteamTagBreakdown,
  SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";
import { GradientThemeControl } from "@/features/steam-dashboard/components/gradient-theme-control";
import { ProfileExportButton } from "@/features/steam-dashboard/components/profile-export-button";
import { SteamSearchForm } from "@/features/steam-dashboard/components/steam-search-form";

type RightSidebarProps = {
  initialValue: string;
  summary: SteamUserSummary | null;
  tagBreakdown: SteamTagBreakdown | null;
};

function RailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/90">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function RightSidebar({
  initialValue,
  summary,
  tagBreakdown,
}: RightSidebarProps) {
  return (
    <aside className="glass-rail hidden border-l lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:block lg:w-[320px]">
      <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-5">
        <RailSection title="Search">
          <SteamSearchForm initialValue={initialValue} compact />
        </RailSection>

        <div className="border-t border-white/10" />

        <RailSection title="Settings">
          <GradientThemeControl />
        </RailSection>

        <div className="border-t border-white/10" />

        <RailSection title="Export">
          {summary ? (
            <ProfileExportButton summary={summary} tagBreakdown={tagBreakdown} />
          ) : (
            <p className="text-sm leading-6 text-slate-300">
              Load a profile first, then export its dashboard image from here.
            </p>
          )}
        </RailSection>
      </div>
    </aside>
  );
}
