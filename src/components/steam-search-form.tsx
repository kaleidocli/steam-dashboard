"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SteamSearchFormProps = {
  initialValue: string;
  compact?: boolean;
};

export function SteamSearchForm({
  initialValue,
  compact = false,
}: SteamSearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      setError("Enter a Steam ID64 or a custom profile name.");
      return;
    }

    setError("");

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("user", trimmedValue);

    router.push(`${pathname}?${nextSearchParams.toString()}`);
  }

  return (
    <form
      className={compact ? "w-full max-w-[22rem]" : "w-full max-w-2xl"}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="relative">
        <label className="sr-only" htmlFor="steam-user-search">
          Search by Steam ID64 or custom profile name
        </label>
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="steam-user-search"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) {
              setError("");
            }
          }}
          placeholder={
            compact
              ? "Search Steam ID or vanity..."
              : "Enter a Steam ID64 or custom profile name"
          }
          className={`w-full rounded-xl border border-[#1f2937] bg-[#121a2b]/85 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#66c0f4]/50 focus:ring-2 focus:ring-[#66c0f4]/20 ${
            compact ? "h-11 pl-11 pr-24" : "h-12 pl-11 pr-28"
          }`}
        />
        <button
          type="submit"
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#66c0f4] font-semibold text-[#08111f] transition hover:bg-[#8bd3ff] ${
            compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
          }`}
        >
          Search
        </button>
      </div>
      {!compact ? (
        <p className="mt-3 min-h-6 text-sm text-slate-400" aria-live="polite">
          {error || "Search with a Steam ID64 or a custom profile name like gaben."}
        </p>
      ) : error ? (
        <p className="mt-2 text-xs text-rose-300" aria-live="polite">
          {error}
        </p>
      ) : null}
    </form>
  );
}
