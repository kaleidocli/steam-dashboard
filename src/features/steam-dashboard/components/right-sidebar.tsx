import { GradientThemeControl } from "@/features/steam-dashboard/components/gradient-theme-control";
import { SteamSearchForm } from "@/features/steam-dashboard/components/steam-search-form";

type RightSidebarProps = {
  initialValue: string;
};

export function RightSidebar({ initialValue }: RightSidebarProps) {
  return (
    <aside className="glass-rail hidden border-l lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:block lg:w-[320px]">
      <div className="flex h-full flex-col gap-4 px-4 py-5">
        <div className="space-y-3">
          <SteamSearchForm initialValue={initialValue} compact />
          <div className="flex justify-start">
            <GradientThemeControl />
          </div>
        </div>
      </div>
    </aside>
  );
}
