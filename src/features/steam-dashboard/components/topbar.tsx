import Image from "next/image";
import {
  getPersonaStatus,
  type SteamUserSummary,
} from "@/features/steam-dashboard/api/steam";
import { GradientThemeControl } from "@/features/steam-dashboard/components/gradient-theme-control";
import { SteamSearchForm } from "@/features/steam-dashboard/components/steam-search-form";

type TopbarProps = {
  initialValue: string;
  summary?: SteamUserSummary | null;
};

export function Topbar({ initialValue, summary }: TopbarProps) {
  return (
    <header className="glass-chrome-strong sticky top-0 z-20 border-b">
      <div className="mx-auto flex h-[68px] w-full max-w-[1280px] items-center gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">
            <span className="text-[#9bdcff]">Steam</span>{" "}
            <span>Dashboard</span>
          </h1>
        </div>

        <div className="flex-1" />

        <div className="hidden md:block">
          <SteamSearchForm initialValue={initialValue} compact />
        </div>

        <GradientThemeControl />

        <div className="hidden h-7 w-px bg-white/12 sm:block" />

        <div className="flex items-center gap-2.5">
          {summary ? (
            <>
              <div className="relative">
                <Image
                  src={summary.player.avatarfull}
                  alt={`${summary.player.personaname} avatar`}
                  width={32}
                  height={32}
                  className="rounded-full ring-1 ring-white/15"
                />
                <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#10203b]" />
              </div>
              <div className="hidden sm:block">
                <span className="text-[14px] font-medium text-white">
                  {summary.player.personaname}
                </span>
                <p className="text-[11px] text-slate-400">
                  {getPersonaStatus(summary.player.personastate)}
                </p>
              </div>
            </>
          ) : (
            <span className="hidden text-sm text-slate-300 sm:block">
              Search a profile
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-3 md:hidden">
        <SteamSearchForm initialValue={initialValue} compact />
      </div>
    </header>
  );
}
