"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { type SteamUserSummary } from "@/features/steam-dashboard/api/steam";
import { ConnectedAccountControls } from "@/features/steam-dashboard/components/connected-account-controls";
import {
  CONNECTED_ACCOUNT_EVENT,
  readConnectedAccountState,
  type ConnectedAccount,
} from "@/features/steam-dashboard/utils/connected-account";

type SidebarNavProps = {
  summary?: SteamUserSummary | null;
};

function NavButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
        active
          ? "glass-card-soft font-medium text-[#b8e8ff]"
          : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-current/80" />
      <span>{label}</span>
    </button>
  );
}

export function SidebarNav({ summary }: SidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(
    null,
  );

  useEffect(() => {
    function syncState() {
      setConnectedAccount(readConnectedAccountState().connectedAccount);
    }

    syncState();
    window.addEventListener(CONNECTED_ACCOUNT_EVENT, syncState);
    window.addEventListener("storage", syncState);

    return () => {
      window.removeEventListener(CONNECTED_ACCOUNT_EVENT, syncState);
      window.removeEventListener("storage", syncState);
    };
  }, []);

  const isOwnProfile =
    Boolean(connectedAccount?.steamId) &&
    connectedAccount?.steamId === summary?.player.steamid;

  if (!connectedAccount) {
    return (
      <ConnectedAccountControls
        currentSteamId={summary?.player.steamid}
        placement="rail"
        connectLabel="Connect to Steam"
        hideWhenConnected
        railPopoverDirection="down"
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <NavButton
        label="Profile"
        active={isOwnProfile}
        onClick={() =>
          router.push(
            `${pathname}?${new URLSearchParams({
              user: "me",
            }).toString()}`,
          )
        }
      />
      <NavButton label="My Library" />
    </div>
  );
}
