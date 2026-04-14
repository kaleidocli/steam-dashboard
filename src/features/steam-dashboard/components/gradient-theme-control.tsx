"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "steam-dashboard-gradient-colors";
const DEFAULT_COLORS = {
  color1: "#66c0f4",
  color2: "#8ec5fc",
  color3: "#ffbed3",
} as const;

type GradientColors = typeof DEFAULT_COLORS;

function isGradientColors(value: unknown): value is GradientColors {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return ["color1", "color2", "color3"].every(
    (key) =>
      typeof candidate[key] === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(candidate[key] as string),
  );
}

function hexToRgbString(hex: string) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
}

export function GradientThemeControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [colors, setColors] = useState<GradientColors>(DEFAULT_COLORS);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as unknown;

      if (isGradientColors(parsed)) {
        setColors(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--gradient-rgb-1", hexToRgbString(colors.color1));
    root.style.setProperty("--gradient-rgb-2", hexToRgbString(colors.color2));
    root.style.setProperty("--gradient-rgb-3", hexToRgbString(colors.color3));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const previewStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${colors.color1}, ${colors.color2} 58%, ${colors.color3})`,
    }),
    [colors],
  );

  const colorFields: Array<{
    key: keyof GradientColors;
    label: string;
  }> = [
    { key: "color1", label: "Glow 1" },
    { key: "color2", label: "Glow 2" },
    { key: "color3", label: "Glow 3" },
  ];

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="glass-input flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white"
      >
        <span
          className="inline-flex h-2.5 w-2.5 rounded-full shadow-[0_0_14px_rgba(125,211,252,0.45)]"
          style={previewStyle}
        />
        Gradient
      </button>

      {isOpen ? (
        <div className="glass-popover absolute right-0 top-full z-30 mt-3 w-64 rounded-2xl p-3">
          <div
            className="mb-3 h-16 rounded-2xl border border-white/10"
            style={previewStyle}
          />
          <div className="space-y-3">
            {colorFields.map((field) => (
              <label
                key={field.key}
                className="flex items-center justify-between gap-3 text-sm text-slate-200"
              >
                <span>{field.label}</span>
                <input
                  type="color"
                  value={colors[field.key]}
                  onChange={(event) =>
                    setColors((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
