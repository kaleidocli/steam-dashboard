export const BACKGROUND_APPEARANCE_STORAGE_KEY =
  "steam-dashboard-background-appearance";
export const BACKGROUND_APPEARANCE_EVENT =
  "steam-dashboard-background-appearance-change";

export type GradientColors = {
  color1: string;
  color2: string;
  color3: string;
};

export type BackgroundMode = "gradient" | "customMedia";
export type BackgroundMediaType = "image" | "video";

export type BackgroundAppearance = {
  mode: BackgroundMode;
  gradientColors: GradientColors;
  widgetGradientColors: GradientColors;
  widgetBaseColor: string;
  widgetTransparency: number;
  customMediaUrl: string;
  customMediaType: BackgroundMediaType | null;
};

export const DEFAULT_GRADIENT_COLORS: GradientColors = {
  color1: "#66c0f4",
  color2: "#8ec5fc",
  color3: "#ffbed3",
};

export const DEFAULT_BACKGROUND_APPEARANCE: BackgroundAppearance = {
  mode: "gradient",
  gradientColors: DEFAULT_GRADIENT_COLORS,
  widgetGradientColors: {
    color1: "#9bdcff",
    color2: "#c5b8ff",
    color3: "#ffd0e2",
  },
  widgetBaseColor: "#14253c",
  widgetTransparency: 66,
  customMediaUrl: "",
  customMediaType: null,
};

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

function isBackgroundMediaType(value: unknown): value is BackgroundMediaType {
  return value === "image" || value === "video";
}

function isWidgetTransparency(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

export function parseStoredBackgroundAppearance(
  value: string | null,
): BackgroundAppearance {
  if (!value) {
    return DEFAULT_BACKGROUND_APPEARANCE;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;

    if (
      !isGradientColors(parsed.gradientColors) ||
      !isGradientColors(parsed.widgetGradientColors) ||
      !isWidgetTransparency(parsed.widgetTransparency) ||
      typeof parsed.widgetBaseColor !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(parsed.widgetBaseColor)
    ) {
      return DEFAULT_BACKGROUND_APPEARANCE;
    }

    const mode =
      parsed.mode === "customMedia" || parsed.mode === "gradient"
        ? parsed.mode
        : "gradient";
    const customMediaUrl =
      typeof parsed.customMediaUrl === "string" ? parsed.customMediaUrl : "";
    const customMediaType = isBackgroundMediaType(parsed.customMediaType)
      ? parsed.customMediaType
      : null;

    return {
      mode,
      gradientColors: parsed.gradientColors,
      widgetGradientColors: parsed.widgetGradientColors,
      widgetBaseColor: parsed.widgetBaseColor,
      widgetTransparency: parsed.widgetTransparency,
      customMediaUrl,
      customMediaType,
    };
  } catch {
    return DEFAULT_BACKGROUND_APPEARANCE;
  }
}

export function hexToRgbString(hex: string) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
}

export function applyGradientColorsToRoot(colors: GradientColors) {
  const root = document.documentElement;

  root.style.setProperty("--gradient-rgb-1", hexToRgbString(colors.color1));
  root.style.setProperty("--gradient-rgb-2", hexToRgbString(colors.color2));
  root.style.setProperty("--gradient-rgb-3", hexToRgbString(colors.color3));
}

export function applyWidgetGradientColorsToRoot(colors: GradientColors) {
  const root = document.documentElement;

  root.style.setProperty("--widget-gradient-rgb-1", hexToRgbString(colors.color1));
  root.style.setProperty("--widget-gradient-rgb-2", hexToRgbString(colors.color2));
  root.style.setProperty("--widget-gradient-rgb-3", hexToRgbString(colors.color3));
}

export function applyWidgetBaseColorToRoot(color: string) {
  document.documentElement.style.setProperty("--widget-base-rgb", hexToRgbString(color));
}

export function getMediaTypeFromUrl(url: string): BackgroundMediaType | null {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLocaleLowerCase();

    if (
      pathname.endsWith(".webp") ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".gif")
    ) {
      return "image";
    }

    if (pathname.endsWith(".mp4") || pathname.endsWith(".webm")) {
      return "video";
    }

    return null;
  } catch {
    return null;
  }
}
