"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readConnectedAccountState } from "@/features/steam-dashboard/utils/connected-account";

type ConnectedAccountBootstrapProps = {
  requestedUser: string;
};

export function ConnectedAccountBootstrap({
  requestedUser,
}: ConnectedAccountBootstrapProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { connectedAccount } = readConnectedAccountState();
    const normalizedRequestedUser = requestedUser.trim().toLocaleLowerCase();

    if (!connectedAccount) {
      return;
    }

    if (!requestedUser.trim()) {
      router.replace(
        `${pathname}?${new URLSearchParams({
          user: connectedAccount.identifier,
        }).toString()}`,
      );
      return;
    }

    if (normalizedRequestedUser === "me") {
      router.replace(
        `${pathname}?${new URLSearchParams({
          user: connectedAccount.identifier,
        }).toString()}`,
      );
    }
  }, [pathname, requestedUser, router]);

  return null;
}
