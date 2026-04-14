"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BACKGROUND_APPEARANCE_EVENT,
  BACKGROUND_APPEARANCE_STORAGE_KEY,
  DEFAULT_BACKGROUND_APPEARANCE,
  applyGradientColorsToRoot,
  applyWidgetBaseColorToRoot,
  applyWidgetGradientColorsToRoot,
  getMediaTypeFromUrl,
  parseStoredBackgroundAppearance,
  type BackgroundAppearance,
  type BackgroundMediaType,
} from "@/features/steam-dashboard/utils/background-appearance";

const LOAD_TIMEOUT_MS = 12000;

function dispatchAppearanceChange(appearance: BackgroundAppearance) {
  window.localStorage.setItem(
    BACKGROUND_APPEARANCE_STORAGE_KEY,
    JSON.stringify(appearance),
  );
  window.dispatchEvent(
    new CustomEvent(BACKGROUND_APPEARANCE_EVENT, { detail: appearance }),
  );
}

function validateDirectMediaUrl(url: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return "Enter a valid direct media URL.";
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return "Only http and https background URLs are supported.";
  }

  const mediaType = getMediaTypeFromUrl(url);

  if (!mediaType) {
    return "Supported formats are .webp/.png/.gif for images and .mp4/.webm for video.";
  }

  return null;
}

function loadImageWithCors(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.src = "";
      reject(new Error("Image validation timed out."));
    }, LOAD_TIMEOUT_MS);

    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(
        new Error(
          "This image could not be loaded with export-safe CORS enabled.",
        ),
      );
    };
    image.src = url;
  });
}

function loadVideoWithCors(url: string) {
  return new Promise<void>((resolve, reject) => {
    const video = document.createElement("video");
    const timeout = window.setTimeout(() => {
      video.src = "";
      reject(new Error("Video validation timed out."));
    }, LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(
        new Error(
          "This video could not be loaded with export-safe CORS enabled.",
        ),
      );
    };
    video.src = url;
    video.load();
  });
}

async function validateHostedMedia(
  url: string,
  mediaType: BackgroundMediaType,
) {
  if (mediaType === "image") {
    await loadImageWithCors(url);
    return;
  }

  await loadVideoWithCors(url);
}

export function GradientThemeControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [appearance, setAppearance] = useState<BackgroundAppearance>(
    DEFAULT_BACKGROUND_APPEARANCE,
  );
  const [draftUrl, setDraftUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedAppearance = parseStoredBackgroundAppearance(
      window.localStorage.getItem(BACKGROUND_APPEARANCE_STORAGE_KEY),
    );
    setAppearance(storedAppearance);
    setDraftUrl(storedAppearance.customMediaUrl);
    applyGradientColorsToRoot(storedAppearance.gradientColors);
    applyWidgetGradientColorsToRoot(storedAppearance.widgetGradientColors);
    applyWidgetBaseColorToRoot(storedAppearance.widgetBaseColor);
  }, []);

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
      background: `linear-gradient(135deg, ${appearance.gradientColors.color1}, ${appearance.gradientColors.color2} 58%, ${appearance.gradientColors.color3})`,
    }),
    [appearance.gradientColors],
  );
  const widgetPreviewStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${appearance.widgetGradientColors.color1}, ${appearance.widgetGradientColors.color2} 58%, ${appearance.widgetGradientColors.color3}), ${appearance.widgetBaseColor}`,
    }),
    [appearance.widgetBaseColor, appearance.widgetGradientColors],
  );

  const colorFields: Array<{
    key: keyof BackgroundAppearance["gradientColors"];
    label: string;
  }> = [
    { key: "color1", label: "Glow 1" },
    { key: "color2", label: "Glow 2" },
    { key: "color3", label: "Glow 3" },
  ];

  const detectedMediaType = getMediaTypeFromUrl(draftUrl.trim());

  function updateGradientColor(
    key: keyof BackgroundAppearance["gradientColors"],
    value: string,
  ) {
    const nextAppearance = {
      ...appearance,
      gradientColors: {
        ...appearance.gradientColors,
        [key]: value,
      },
    };

    setAppearance(nextAppearance);
    applyGradientColorsToRoot(nextAppearance.gradientColors);
    dispatchAppearanceChange(nextAppearance);
  }

  function updateWidgetGradientColor(
    key: keyof BackgroundAppearance["widgetGradientColors"],
    value: string,
  ) {
    const nextAppearance = {
      ...appearance,
      widgetGradientColors: {
        ...appearance.widgetGradientColors,
        [key]: value,
      },
    };

    setAppearance(nextAppearance);
    applyWidgetGradientColorsToRoot(nextAppearance.widgetGradientColors);
    dispatchAppearanceChange(nextAppearance);
  }

  function updateWidgetBaseColor(value: string) {
    const nextAppearance = {
      ...appearance,
      widgetBaseColor: value,
    };

    setAppearance(nextAppearance);
    applyWidgetBaseColorToRoot(nextAppearance.widgetBaseColor);
    dispatchAppearanceChange(nextAppearance);
  }

  function updateWidgetTransparency(value: number) {
    const nextAppearance = {
      ...appearance,
      widgetTransparency: value,
    };

    setAppearance(nextAppearance);
    dispatchAppearanceChange(nextAppearance);
  }

  async function handleApplyCustomBackground() {
    const trimmedUrl = draftUrl.trim();
    const validationError = validateDirectMediaUrl(trimmedUrl);

    if (validationError) {
      setStatusMessage(validationError);
      return;
    }

    const mediaType = getMediaTypeFromUrl(trimmedUrl);

    if (!mediaType) {
      setStatusMessage(
        "Supported formats are .webp/.png/.gif for images and .mp4/.webm for video.",
      );
      return;
    }

    setIsApplying(true);
    setStatusMessage("Validating hosted media...");

    try {
      await validateHostedMedia(trimmedUrl, mediaType);

      const nextAppearance: BackgroundAppearance = {
        ...appearance,
        mode: "customMedia",
        customMediaUrl: trimmedUrl,
        customMediaType: mediaType,
      };

      setAppearance(nextAppearance);
      dispatchAppearanceChange(nextAppearance);
      setStatusMessage(
        "Background applied. Export-safe CORS validation succeeded.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to validate that hosted background.",
      );
    } finally {
      setIsApplying(false);
    }
  }

  function handleResetToGradient() {
    const nextAppearance: BackgroundAppearance = {
      ...appearance,
      mode: "gradient",
      customMediaUrl: "",
      customMediaType: null,
    };

    setAppearance(nextAppearance);
    setDraftUrl("");
    setStatusMessage("Gradient background restored.");
    dispatchAppearanceChange(nextAppearance);
  }

  return (
    <div ref={containerRef} className="relative block">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="glass-input flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white"
      >
        <span
          className="inline-flex h-2.5 w-2.5 rounded-full shadow-[0_0_14px_rgba(125,211,252,0.45)]"
          style={previewStyle}
        />
        UI Settings
      </button>

      {isOpen ? (
        <div className="glass-popover absolute right-0 top-full z-30 mt-3 w-[20rem] rounded-2xl p-3">
          <div className="glass-input mb-3 inline-flex rounded-2xl p-1">
            {[
              { id: "gradient", label: "Gradient" },
              { id: "customMedia", label: "Hosted media" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  const nextAppearance = {
                    ...appearance,
                    mode: option.id as BackgroundAppearance["mode"],
                  };
                  setAppearance(nextAppearance);
                  dispatchAppearanceChange(nextAppearance);
                  setStatusMessage("");
                }}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition ${
                  appearance.mode === option.id
                    ? "bg-[linear-gradient(135deg,#d9f3ff,#91d7ff)] text-[#08111f]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {appearance.mode === "gradient" ? (
            <>
              <div
                className="mb-3 h-16 rounded-2xl border border-white/10"
                style={previewStyle}
              />
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                Background glow
              </p>
              <div className="space-y-3">
                {colorFields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center justify-between gap-3 text-sm text-slate-200"
                  >
                    <span>{field.label}</span>
                    <input
                      type="color"
                      value={appearance.gradientColors[field.key]}
                      onChange={(event) =>
                        updateGradientColor(field.key, event.target.value)
                      }
                      className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
                    />
                  </label>
                ))}
              </div>
              <div
                className="mb-3 mt-5 h-16 rounded-2xl border border-white/10"
                style={widgetPreviewStyle}
              />
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                Widget tint
              </p>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span>Widget base</span>
                  <input
                    type="color"
                    value={appearance.widgetBaseColor}
                    onChange={(event) => updateWidgetBaseColor(event.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
                  />
                </label>
                {colorFields.map((field) => (
                  <label
                    key={`widget-${field.key}`}
                    className="flex items-center justify-between gap-3 text-sm text-slate-200"
                  >
                    <span>{field.label}</span>
                    <input
                      type="color"
                      value={appearance.widgetGradientColors[field.key]}
                      onChange={(event) =>
                        updateWidgetGradientColor(field.key, event.target.value)
                      }
                      className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
                    />
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2 text-xs leading-5 text-slate-300">
                <p>
                  Use a direct file link, not a gallery or page link.
                  Supported: `.webp`, `.png`, `.gif`, `.mp4`, `.webm`.
                </p>
                <p>
                  Good hosts: Imgur direct image links, Cloudinary, GitHub raw,
                  or any CDN/static file host with CORS enabled.
                </p>
                <p>
                  Link format:
                  ` https://i.imgur.com/abc123.png`
                  or `https://cdn.example.com/bg.webm`
                </p>
              </div>
              <input
                type="url"
                value={draftUrl}
                onChange={(event) => {
                  setDraftUrl(event.target.value);
                  setStatusMessage("");
                }}
                placeholder="https://i.imgur.com/abc123.png"
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[#9bdcff]/50"
              />
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>
                  Detected:{" "}
                  {detectedMediaType === "image"
                    ? "Image background"
                    : detectedMediaType === "video"
                      ? "Animated video"
                      : "Unsupported"}
                </span>
                <span className="text-right">
                  Widgets auto-shift to higher transparency
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                  <span>Widget transparency</span>
                  <span>{appearance.widgetTransparency}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={appearance.widgetTransparency}
                  onChange={(event) =>
                    updateWidgetTransparency(Number(event.target.value))
                  }
                  className="w-full accent-[#9bdcff]"
                />
              </div>
              <div
                className="h-14 rounded-2xl border border-white/10"
                style={widgetPreviewStyle}
              />
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Widget tint
              </p>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
                  <span>Widget base</span>
                  <input
                    type="color"
                    value={appearance.widgetBaseColor}
                    onChange={(event) => updateWidgetBaseColor(event.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
                  />
                </label>
                {colorFields.map((field) => (
                  <label
                    key={`media-widget-${field.key}`}
                    className="flex items-center justify-between gap-3 text-sm text-slate-200"
                  >
                    <span>{field.label}</span>
                    <input
                      type="color"
                      value={appearance.widgetGradientColors[field.key]}
                      onChange={(event) =>
                        updateWidgetGradientColor(field.key, event.target.value)
                      }
                      className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
                    />
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleApplyCustomBackground()}
                  disabled={isApplying}
                  className="rounded-xl bg-[linear-gradient(135deg,#d9f3ff,#91d7ff)] px-3 py-2 text-xs font-semibold text-[#08111f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApplying ? "Applying..." : "Apply"}
                </button>
                <button
                  type="button"
                  onClick={handleResetToGradient}
                  className="glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/18 hover:text-white"
                >
                  Reset
                </button>
              </div>
              {statusMessage ? (
                <p className="text-xs leading-5 text-slate-300">
                  {statusMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
