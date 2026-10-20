import localFont from "next/font/local";

/**
 * Self-hosted fonts (brief §C4). Preloaded total: 36,620 + 48,256 + 14,888 bytes
 * = 99,764 B = 97.4 KiB (budget ≤ 100 KiB). A unit test re-checks the sizes.
 * Licence: SIL OFL-1.1, see ./OFL.txt.
 */
export const fraunces = localFont({
  src: "./fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-fraunces",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const inter = localFont({
  src: "./inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const plexMono = localFont({
  src: "./ibm-plex-mono-latin-500-normal.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-plex-mono",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
});

export const fontVariables = `${fraunces.variable} ${inter.variable} ${plexMono.variable}`;
