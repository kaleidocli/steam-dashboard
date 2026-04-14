"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getPersonaStatus } from "@/features/steam-dashboard/api/steam";
import {
  CONNECTED_ACCOUNT_EVENT,
  clearConnectedAccount,
  readConnectedAccountState,
  writeConnectedAccountState,
  type ConnectedAccountState,
} from "@/features/steam-dashboard/utils/connected-account";

type ConnectSteamResponse = {
  player: {
    steamid: string;
    personaname: string;
    avatarfull: string;
    personastate: number;
  };
};

type ConnectedAccountControlsProps = {
  currentSteamId?: string;
  placement?: "topbar" | "rail";
  connectLabel?: string;
  hideWhenDisconnected?: boolean;
  hideWhenConnected?: boolean;
  railPopoverDirection?: "up" | "down";
};

export function ConnectedAccountControls({
  currentSteamId,
  placement = "topbar",
  connectLabel = "Connect Steam",
  hideWhenDisconnected = false,
  hideWhenConnected = false,
  railPopoverDirection = "up",
}: ConnectedAccountControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<ConnectedAccountState>(() => ({
    connectedAccount: null,
    favoritesBySteamId: {},
  }));
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextState = readConnectedAccountState();
    setState(nextState);
    setInputValue(nextState.connectedAccount?.identifier ?? "");

    function handleStateChange() {
      const changedState = readConnectedAccountState();
      setState(changedState);
      setInputValue(changedState.connectedAccount?.identifier ?? "");
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener(CONNECTED_ACCOUNT_EVENT, handleStateChange);
    window.addEventListener("storage", handleStateChange);
    window.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener(CONNECTED_ACCOUNT_EVENT, handleStateChange);
      window.removeEventListener("storage", handleStateChange);
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      setStatusMessage("Enter a Steam ID64 or custom profile name.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Checking that Steam account...");

    try {
      const response = await fetch(
        `/api/steam-user?${new URLSearchParams({ user: trimmedValue }).toString()}`,
      );
      const payload = (await response.json()) as
        | ConnectSteamResponse
        | { error?: string };

      if (!response.ok || !("player" in payload)) {
        setStatusMessage(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to connect that Steam account.",
        );
        return;
      }

      const nextState = {
        ...state,
        connectedAccount: {
          identifier: trimmedValue,
          steamId: payload.player.steamid,
          personaName: payload.player.personaname,
          avatar: payload.player.avatarfull,
          personaState: payload.player.personastate,
        },
      };

      setState(nextState);
      writeConnectedAccountState(nextState);
      setStatusMessage(`Connected to ${payload.player.personaname}.`);
      setIsOpen(false);
      router.push(
        `${pathname}?${new URLSearchParams({
          user: trimmedValue,
        }).toString()}`,
      );
    } catch {
      setStatusMessage("Unable to connect that Steam account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDisconnect() {
    const nextState = clearConnectedAccount(state);
    const disconnectedSteamId = state.connectedAccount?.steamId;

    setState(nextState);
    writeConnectedAccountState(nextState);
    setInputValue("");
    setStatusMessage("Disconnected from Steam account.");
    setIsOpen(false);

    if (disconnectedSteamId && currentSteamId === disconnectedSteamId) {
      router.replace(pathname);
    }
  }

  function handleMyProfile() {
    if (!state.connectedAccount) {
      return;
    }

    router.push(
      `${pathname}?${new URLSearchParams({
        user: "me",
      }).toString()}`,
    );
  }

  const isOwnProfile =
    Boolean(state.connectedAccount?.steamId) &&
    Boolean(currentSteamId) &&
    state.connectedAccount?.steamId === currentSteamId;
  const isRail = placement === "rail";

  if ((!state.connectedAccount && hideWhenDisconnected) || (state.connectedAccount && hideWhenConnected)) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex ${isRail ? "w-full" : "items-center gap-2"}`}
    >
      {state.connectedAccount ? (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`flex items-center gap-2.5 text-left transition hover:bg-white/[0.04] ${
            isRail
              ? "w-full rounded-2xl px-3 py-3"
              : "rounded-2xl px-1 py-1"
          }`}
        >
          <div className="relative">
            <Image
              src={state.connectedAccount.avatar}
              alt={`${state.connectedAccount.personaName} avatar`}
              width={32}
              height={32}
              className="rounded-full ring-1 ring-white/15"
            />
            <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#10203b]" />
          </div>
          <div className={isRail ? "min-w-0 flex-1" : "hidden sm:block"}>
            <span
              className={`text-[14px] font-medium ${
                isOwnProfile ? "text-[#9bdcff]" : "text-white"
              }`}
            >
              {state.connectedAccount.personaName}
            </span>
            <p className="text-[11px] text-slate-400">
              {getPersonaStatus(state.connectedAccount.personaState)}
            </p>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`glass-input text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-white/18 hover:text-white ${
            isRail
              ? "w-full rounded-2xl px-4 py-3 text-left"
              : "rounded-full px-3 py-2"
          }`}
        >
          {connectLabel}
        </button>
      )}

      {isOpen ? (
        <div
          className={`glass-popover absolute z-30 w-[21rem] rounded-2xl p-3 ${
            isRail
              ? railPopoverDirection === "down"
                ? "left-0 top-full mt-3"
                : "bottom-full left-0 mb-3"
              : "right-0 top-full mt-3"
          }`}
        >
          {state.connectedAccount ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {state.connectedAccount.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.connectedAccount.avatar}
                    alt={`${state.connectedAccount.personaName} avatar`}
                    className="h-10 w-10 rounded-full ring-1 ring-white/15"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {state.connectedAccount.personaName}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {state.connectedAccount.identifier}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMyProfile}
                  className="rounded-xl bg-[linear-gradient(135deg,#d9f3ff,#91d7ff)] px-3 py-2 text-xs font-semibold text-[#08111f] transition hover:brightness-105"
                >
                  My profile
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/18 hover:text-white"
                >
                  Disconnect
                </button>
              </div>
              <p className="text-xs leading-5 text-slate-400">
                Your connected account and favorites stay on this browser only.
              </p>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleConnect} noValidate>
              <div>
                <p className="text-sm font-medium text-white">
                  Connect to a Steam account
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Enter your Steam ID64 or vanity name. We only save it in this
                  browser.
                </p>
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  if (statusMessage) {
                    setStatusMessage("");
                  }
                }}
                placeholder="7656119... or gaben"
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[#9bdcff]/50"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[linear-gradient(135deg,#d9f3ff,#91d7ff)] px-3 py-2 text-xs font-semibold text-[#08111f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Connecting..." : "Connect"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setStatusMessage("");
                  }}
                  className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/18 hover:text-white"
                >
                  Close
                </button>
              </div>
              {statusMessage ? (
                <p className="text-xs leading-5 text-slate-300">{statusMessage}</p>
              ) : null}
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
