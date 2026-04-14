"use client";

import { useEffect, useState } from "react";
import {
  BACKGROUND_APPEARANCE_EVENT,
  BACKGROUND_APPEARANCE_STORAGE_KEY,
  DEFAULT_BACKGROUND_APPEARANCE,
  applyGradientColorsToRoot,
  applyWidgetBaseColorToRoot,
  applyWidgetGradientColorsToRoot,
  parseStoredBackgroundAppearance,
  type BackgroundAppearance,
} from "@/features/steam-dashboard/utils/background-appearance";

type BackgroundAppearanceEvent = CustomEvent<BackgroundAppearance>;

function applyGlassSettings(appearance: BackgroundAppearance) {
  const root = document.documentElement;
  const transparencyRatio = appearance.widgetTransparency / 100;

  if (appearance.mode === "customMedia") {
    const baseSurfaceOpacity = 0.9 - transparencyRatio * 0.34;
    const strongSurfaceOpacity = 0.95 - transparencyRatio * 0.28;
    const softSurfaceOpacity = 0.24 - transparencyRatio * 0.12;

    root.style.setProperty(
      "--glass-surface-opacity",
      Math.max(0.56, baseSurfaceOpacity).toFixed(3),
    );
    root.style.setProperty(
      "--glass-surface-strong-opacity",
      Math.max(0.67, strongSurfaceOpacity).toFixed(3),
    );
    root.style.setProperty(
      "--glass-surface-soft-opacity",
      Math.max(0.12, softSurfaceOpacity).toFixed(3),
    );
    root.style.setProperty("--glass-blur-multiplier", "1.8");
    root.style.setProperty("--widget-tint-alpha-1", "0.16");
    root.style.setProperty("--widget-tint-alpha-2", "0.11");
    root.style.setProperty("--widget-tint-alpha-3", "0.13");
    return;
  }

  root.style.setProperty("--glass-surface-opacity", "0.62");
  root.style.setProperty("--glass-surface-strong-opacity", "0.78");
  root.style.setProperty("--glass-surface-soft-opacity", "0.08");
  root.style.setProperty("--glass-blur-multiplier", "1");
  root.style.setProperty("--widget-tint-alpha-1", "0.1");
  root.style.setProperty("--widget-tint-alpha-2", "0.06");
  root.style.setProperty("--widget-tint-alpha-3", "0.08");
}

export function BackgroundAppearanceLayer() {
  const [appearance, setAppearance] = useState<BackgroundAppearance>(
    DEFAULT_BACKGROUND_APPEARANCE,
  );

  useEffect(() => {
    const storedAppearance = parseStoredBackgroundAppearance(
      window.localStorage.getItem(BACKGROUND_APPEARANCE_STORAGE_KEY),
    );
    applyGradientColorsToRoot(storedAppearance.gradientColors);
    applyWidgetGradientColorsToRoot(storedAppearance.widgetGradientColors);
    applyWidgetBaseColorToRoot(storedAppearance.widgetBaseColor);
    applyGlassSettings(storedAppearance);
    setAppearance(storedAppearance);

    function handleAppearanceChange(event: Event) {
      const nextAppearance = (event as BackgroundAppearanceEvent).detail;
      applyGradientColorsToRoot(nextAppearance.gradientColors);
      applyWidgetGradientColorsToRoot(nextAppearance.widgetGradientColors);
      applyWidgetBaseColorToRoot(nextAppearance.widgetBaseColor);
      applyGlassSettings(nextAppearance);
      setAppearance(nextAppearance);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== BACKGROUND_APPEARANCE_STORAGE_KEY) {
        return;
      }

      const nextAppearance = parseStoredBackgroundAppearance(event.newValue);
      applyGradientColorsToRoot(nextAppearance.gradientColors);
      applyWidgetGradientColorsToRoot(nextAppearance.widgetGradientColors);
      applyWidgetBaseColorToRoot(nextAppearance.widgetBaseColor);
      applyGlassSettings(nextAppearance);
      setAppearance(nextAppearance);
    }

    window.addEventListener(
      BACKGROUND_APPEARANCE_EVENT,
      handleAppearanceChange as EventListener,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        BACKGROUND_APPEARANCE_EVENT,
        handleAppearanceChange as EventListener,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (
    appearance.mode !== "customMedia" ||
    !appearance.customMediaUrl ||
    !appearance.customMediaType
  ) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      {appearance.customMediaType === "image" ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.78]"
          style={{ backgroundImage: `url("${appearance.customMediaUrl}")` }}
        />
      ) : (
        <video
          key={appearance.customMediaUrl}
          className="absolute inset-0 h-full w-full object-cover opacity-[0.74]"
          src={appearance.customMediaUrl}
          autoPlay
          muted
          loop
          playsInline
          crossOrigin="anonymous"
          preload="auto"
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(9,17,29,0.12)_24%,rgba(7,13,23,0.46)_100%)]" />
    </div>
  );
}
